import { readFile } from 'node:fs/promises'

import { validKey } from './build.mjs'
import { origin } from './html.mjs'

export function eligible(event, repository = 'joyehuang/blog') {
  const d = event.deployment,
    s = event.deployment_status
  return (
    event.repository?.full_name === repository &&
    !event.repository?.fork &&
    d?.environment === 'Production' &&
    s?.environment === 'Production' &&
    s?.state === 'success' &&
    d?.creator?.login === 'vercel[bot]' &&
    s?.creator?.login === 'vercel[bot]' &&
    /^[a-f0-9]{40}$/.test(d?.sha || '')
  )
}
export function validateManifest(m) {
  if (
    m?.version !== 1 ||
    m.origin !== origin ||
    !/^[a-f0-9]{40}$/.test(m.commit || '') ||
    !m.urls ||
    Array.isArray(m.urls)
  )
    throw new Error('Invalid manifest')
  for (const [url, fingerprint] of Object.entries(m.urls)) {
    const u = new URL(url)
    if (
      u.origin !== origin ||
      u.search ||
      u.hash ||
      u.username ||
      u.password ||
      !/^[a-f0-9]{64}$/.test(fingerprint)
    )
      throw new Error('Invalid manifest URL or fingerprint')
  }
  if (!Object.keys(m.urls).length || Object.keys(m.urls).length > 10000)
    throw new Error('Unexpected manifest size')
  return m
}
export function changedUrls(previous, current) {
  return [...new Set([...Object.keys(previous?.urls || {}), ...Object.keys(current.urls)])]
    .filter((u) => previous?.urls[u] !== current.urls[u])
    .sort()
}
export async function submit(
  urls,
  key,
  { fetcher = fetch, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) } = {}
) {
  if (!validKey(key)) throw new Error('Missing or invalid INDEXNOW_KEY')
  if (!urls.length) return { status: 'unchanged', attempts: 0 }
  if (urls.length > 10000 || urls.some((u) => new URL(u).origin !== origin))
    throw new Error('Invalid URL batch')
  for (let attempt = 1; attempt <= 3; attempt++) {
    let response
    try {
      response = await fetcher('https://api.indexnow.org/indexnow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
          host: new URL(origin).host,
          key,
          keyLocation: `${origin}/indexnow-key.txt`,
          urlList: urls
        }),
        signal: AbortSignal.timeout(15000),
        redirect: 'error'
      })
    } catch {
      if (attempt === 3) return { status: 'network_error', attempts: attempt }
      await sleep(1000 * attempt)
      continue
    }
    const code = response.status
    if (code === 200 || code === 202)
      return { status: code === 200 ? 'received' : 'validation_pending', code, attempts: attempt }
    if (code !== 429 && code < 500) return { status: 'rejected', code, attempts: attempt }
    if (attempt === 3) return { status: 'retry_exhausted', code, attempts: attempt }
    const retry = response.headers.get('retry-after')
    const delay = retry
      ? /^\d+$/.test(retry)
        ? Number(retry) * 1000
        : Math.max(0, Date.parse(retry) - Date.now())
      : 1000 * attempt
    // Respect long server backoff by ending this bounded run instead of retrying early.
    if (!Number.isFinite(delay) || delay > 30000)
      return { status: 'deferred', code, attempts: attempt }
    await sleep(delay)
  }
}
export async function onlineManifest(commit, fetcher = fetch) {
  const response = await fetcher(`${origin}/.well-known/indexnow-manifest.json`, {
    cache: 'no-store',
    redirect: 'error',
    signal: AbortSignal.timeout(15000)
  })
  if (response.status !== 200) throw new Error('Production manifest unavailable')
  const manifest = validateManifest(await response.json())
  if (manifest.commit !== commit) throw new Error('Production commit does not match deployment')
  return manifest
}
export async function run(env = process.env, fetcher = fetch) {
  const event = JSON.parse(await readFile(env.GITHUB_EVENT_PATH, 'utf8'))
  if (!eligible(event)) return { status: 'ignored_event' }
  if (!validKey(env.INDEXNOW_KEY)) throw new Error('Missing or invalid INDEXNOW_KEY')
  if (!env.GITHUB_TOKEN) throw new Error('Missing GitHub authentication')
  const api = async (path, options = {}, allow404 = false) => {
    let r
    try {
      r = await fetcher(`https://api.github.com/repos/joyehuang/blog/${path}`, {
        ...options,
        headers: {
          Authorization: `Bearer ${env.GITHUB_TOKEN}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
          ...options.headers
        },
        signal: AbortSignal.timeout(15000)
      })
    } catch {
      throw new Error('GitHub API network error')
    }
    if (allow404 && r.status === 404) return null
    if (!r.ok) throw new Error(`GitHub API failed (${r.status})`)
    return r.json()
  }
  const main = await api('git/ref/heads/main')
  if (main.object.sha !== event.deployment.sha) return { status: 'superseded_deployment' }
  const current = await onlineManifest(event.deployment.sha, fetcher)
  const proof = await fetcher(`${origin}/indexnow-key.txt`, {
    redirect: 'error',
    signal: AbortSignal.timeout(15000)
  })
  if (proof.status !== 200 || (await proof.text()).trim() !== env.INDEXNOW_KEY)
    throw new Error('Production key verification failed')
  // A dedicated Git branch survives artifact/cache expiry and retains deleted URLs.
  const branch = 'indexnow-state'
  let ref = await api(`git/ref/heads/${branch}`, {}, true)
  if (!ref) {
    if (env.INDEXNOW_ALLOW_INITIAL !== 'true')
      throw new Error('Initial submission requires INDEXNOW_ALLOW_INITIAL=true')
    ref = await api('git/refs', {
      method: 'POST',
      body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: main.object.sha })
    })
  }
  const file = await api(`contents/indexnow-state.json?ref=${branch}`, {}, true)
  const stored = file ? JSON.parse(Buffer.from(file.content, 'base64').toString()) : null
  if (!stored && env.INDEXNOW_ALLOW_INITIAL !== 'true')
    throw new Error('Missing submission history; initial submission disabled')
  if (stored) validateManifest(stored.manifest)
  const urls = changedUrls(stored?.manifest, current)
  // Before sending, confirm promotion has not changed while loading history.
  await onlineManifest(current.commit, fetcher)
  const result = await submit(urls, env.INDEXNOW_KEY, { fetcher })
  if (!['received', 'validation_pending', 'unchanged'].includes(result.status))
    return { ...result, count: urls.length }
  await api('contents/indexnow-state.json', {
    method: 'PUT',
    body: JSON.stringify({
      branch,
      message: 'chore(indexnow): record production notification',
      ...(file ? { sha: file.sha } : {}),
      content: Buffer.from(
        JSON.stringify({ manifest: current, result, count: urls.length })
      ).toString('base64')
    })
  })
  return { ...result, count: urls.length, commit: current.commit }
}
if (import.meta.main) {
  try {
    const result = await run()
    console.log(JSON.stringify(result))
    if (['rejected', 'retry_exhausted', 'deferred', 'network_error'].includes(result.status))
      process.exitCode = 1
  } catch {
    console.error(
      'IndexNow notification failed; inspect configuration, production gate and state. Deployment is unaffected.'
    )
    process.exitCode = 1
  }
}

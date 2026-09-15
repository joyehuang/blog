import { spawn } from 'node:child_process'

import { digest, escapeHtml, renderFiles, safeGet, urlKey, validateReachability } from './data.mjs'

const REPO = 'joyehuang/blog'
const PATHS = ['public/links.json', 'src/site.config.ts']
const WALINE = 'https://waline.joyehuang.me/api/comment'
const SITE = 'https://joyehuang.me'
export function command(args, input) {
  return new Promise((resolve, reject) => {
    const child = spawn(args[0], args.slice(1), { stdio: ['pipe', 'pipe', 'pipe'] })
    let output = ''
    const timer = setTimeout(() => child.kill('SIGKILL'), 60000)
    child.stdout.on('data', (chunk) => {
      output += chunk
      if (output.length > 8_000_000) child.kill('SIGKILL')
    })
    // Do not surface CLI stderr: API errors can contain credentials or comment data.
    child.stderr.resume()
    child.on('error', () => {
      clearTimeout(timer)
      reject(Error('CLI unavailable'))
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      code === 0 ? resolve(output) : reject(Error('CLI request failed'))
    })
    child.stdin.end(input)
  })
}
export async function gh(path, method = 'GET', data) {
  const args = ['gh', 'api', `repos/${REPO}/${path}`, '--method', method]
  if (data !== undefined) args.push('--input', '-')
  return JSON.parse(await command(args, data === undefined ? undefined : JSON.stringify(data)))
}
async function fixedFetch(url, init = {}) {
  const r = await fetch(url, { ...init, redirect: 'error', signal: AbortSignal.timeout(15000) })
  if (!r.ok) throw Error(`fixed endpoint HTTP ${r.status}`)
  const chunks = []
  let size = 0
  for await (const part of r.body) {
    size += part.length
    if (size > 4_000_000) throw Error('fixed response too large')
    chunks.push(part)
  }
  return JSON.parse(Buffer.concat(chunks).toString())
}
export class Waline {
  constructor(token, request = fixedFetch) {
    this.token = token
    this.request = request
  }
  async scan() {
    const comments = new Map()
    let expectedPages
    for (let page = 1; page <= 20; page++) {
      const payload = await this.request(
        `${WALINE}?path=%2Flinks&page=${page}&pageSize=50&sortBy=insertedAt_desc`,
        { headers: { Referer: `${SITE}/links` } }
      )
      if (payload.errno !== 0 || !Array.isArray(payload.data?.data))
        throw Error('Waline schema/error')
      const result = payload.data
      if (!Number.isInteger(result.totalPages) || result.totalPages > 20)
        throw Error('Waline scan exceeds 1000 roots; no watermark advanced')
      if (expectedPages !== undefined && result.totalPages !== expectedPages)
        throw Error('Waline pagination changed; retry scan')
      expectedPages = result.totalPages
      for (const c of result.data) {
        if (!c.objectId || !Number.isFinite(Date.parse(c.insertedAt)))
          throw Error('invalid Waline identity/time')
        comments.set(String(c.objectId), { ...c, url: '/links' })
      }
      if (page >= result.totalPages) return [...comments.values()]
    }
    throw Error('incomplete scan')
  }
  async comment(id) {
    return (await this.scan()).find((c) => String(c.objectId) === String(id))
  }
  async findReply(job) {
    const c = await this.comment(job.id)
    const stack = [...(c?.children || [])]
    while (stack.length) {
      const r = stack.shift()
      stack.push(...(r.children || []))
      if (
        r.type === 'administrator' &&
        String(r.pid) === job.id &&
        String(r.rid) === job.id &&
        (r.comment || '').includes(`friend-link:${digest(job.id).slice(0, 24)}`)
      )
        return { id: String(r.objectId), parent: job.id }
    }
    return null
  }
  async reply(job) {
    if (!this.token) throw Error('Waline admin token not configured')
    const c = await this.comment(job.id)
    const result = await this.request(WALINE, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        Referer: `${SITE}/links`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: '/links',
        comment: `已添加你的友链，欢迎常来～ 🙌\n\n[查看友链](${SITE}/links) · friend-link:${digest(job.id).slice(0, 24)}`,
        nick: 'joye',
        pid: job.id,
        rid: job.id,
        at: c.nick,
        link: SITE + '/'
      })
    })
    if (result.errno !== 0) throw Error('Waline reply not acknowledged')
  }
}
export class GitHub {
  constructor({
    actionsAppId = 15368,
    vercelBotId = 35613825,
    previewHostSuffix,
    api = gh,
    run = command,
    publish = verifyPublished
  } = {}) {
    this.api = api
    this.run = run
    this.publish = publish
    this.actionsAppId = actionsAppId
    this.vercelBotId = vercelBotId
    this.previewHostSuffix = previewHostSuffix
  }
  async files(ref) {
    const result = {}
    for (const path of PATHS) {
      const f = await this.api(`contents/${path}?ref=${encodeURIComponent(ref)}`)
      if (f.type !== 'file' || f.encoding !== 'base64' || f.size > 500000)
        throw Error('unexpected file')
      result[path] = Buffer.from(f.content, 'base64').toString('utf8')
    }
    return result
  }
  async prepare(job) {
    const main = await this.api('git/ref/heads/main')
    const base = main.object.sha
    const files = renderFiles(await this.files(base), job.app, job.date)
    if (!files) return { existing: true }
    const branch = `auto/friend-link-${digest(job.id).slice(0, 24)}-${base.slice(0, 12)}`
    // List refs rather than swallowing authorization/network errors as "missing".
    const refs = await this.api(`git/matching-refs/heads/${branch}`)
    const existing = refs.find((r) => r.ref === `refs/heads/${branch}`)
    if (existing) {
      if (JSON.stringify(await this.files(existing.object.sha)) !== JSON.stringify(files))
        throw Error('existing branch differs from expected')
      return { base, head: existing.object.sha, branch, files }
    }
    const commit = await this.api(`git/commits/${base}`)
    const tree = await this.api('git/trees', 'POST', {
      base_tree: commit.tree.sha,
      tree: PATHS.map((path) => ({ path, mode: '100644', type: 'blob', content: files[path] }))
    })
    const next = await this.api('git/commits', 'POST', {
      message: 'chore(links): add approved friend link',
      tree: tree.sha,
      parents: [base]
    })
    await this.api('git/refs', 'POST', { ref: `refs/heads/${branch}`, sha: next.sha })
    return { base, head: next.sha, branch, files }
  }
  async findPR(job) {
    const list = await this.api(
      `pulls?state=all&head=joyehuang:${encodeURIComponent(job.plan.branch)}&base=main&per_page=100`
    )
    if (list.length > 1) throw Error('ambiguous PR')
    if (!list.length) return null
    const p = list[0]
    if (
      p.head.sha !== job.plan.head ||
      p.head.repo.full_name !== REPO ||
      p.base.repo.full_name !== REPO
    )
      throw Error('PR head drift')
    return { number: p.number, url: p.html_url, head: p.head.sha }
  }
  async createPR(job) {
    const old = await this.findPR(job)
    if (old) return old
    await this.api('pulls', 'POST', {
      title: 'chore(links): add approved friend link',
      head: job.plan.branch,
      base: 'main',
      body: `Automated application from a verified top-level /links comment.\n\nSource: ${SITE}/links#waline\nApplication ID digest: ${digest(job.id)}\n\nOnly friend data and escaped logbook content change. Merge requires exact content, base/head, CI and Vercel Preview verification. Reply follows production readback.`
    })
  }
  async check(job) {
    const protection = await this.api('branches/main/protection')
    if (
      protection.required_status_checks?.strict !== true ||
      protection.enforce_admins?.enabled !== true ||
      !protection.required_status_checks?.checks?.some(
        (c) => c.context === 'friend-link-check' && c.app_id === this.actionsAppId
      )
    )
      throw Error('strict main protection and pinned required CI must be configured')
    const p = await this.api(`pulls/${job.pr.number}`)
    const main = await this.api('git/ref/heads/main')
    if (main.object.sha !== job.plan.base) {
      const e = Error('base drift: rebuild required')
      e.code = 'BASE_DRIFT'
      throw e
    }
    if (
      p.state !== 'open' ||
      p.head.sha !== job.plan.head ||
      p.base.ref !== 'main' ||
      p.head.repo.full_name !== REPO ||
      p.mergeable !== true
    )
      throw Error('PR state/head/mergeability changed')
    const comparison = await this.api(`compare/${job.plan.base}...${job.plan.head}`)
    if (
      comparison.behind_by !== 0 ||
      comparison.total_commits !== 1 ||
      comparison.files.length !== 2 ||
      comparison.files.some((f) => !PATHS.includes(f.filename) || f.status !== 'modified')
    )
      throw Error('unexpected diff')
    if (JSON.stringify(await this.files(job.plan.head)) !== JSON.stringify(job.plan.files))
      throw Error('content differs from approved plan')
    const runs = await this.api(`commits/${job.plan.head}/check-runs?per_page=100`)
    if (runs.total_count > 100) throw Error('too many checks')
    const relevant = runs.check_runs.filter(
      (r) =>
        r.name === 'friend-link-check' &&
        r.app.id === this.actionsAppId &&
        r.head_sha === job.plan.head
    )
    relevant.sort((a, b) => b.id - a.id)
    if (relevant[0]?.conclusion !== 'success' || relevant[0]?.status !== 'completed')
      throw Error('trusted CI missing/pending/failed')
    // Require a GitHub deployment created by the verified Vercel bot identity, tied to this exact SHA.
    if (!this.vercelBotId || !this.previewHostSuffix)
      throw Error('Vercel provenance/preview hostname not configured')
    const deployments = await this.api(
      `deployments?sha=${job.plan.head}&environment=Preview&per_page=100`
    )
    const deployment = deployments.find(
      (d) =>
        d.creator?.id === this.vercelBotId &&
        d.creator?.login === 'vercel[bot]' &&
        d.sha === job.plan.head
    )
    if (!deployment) throw Error('trusted preview deployment missing')
    const statuses = await this.api(`deployments/${deployment.id}/statuses?per_page=100`)
    const status = statuses[0]
    if (
      status?.state !== 'success' ||
      status.creator?.id !== this.vercelBotId ||
      status.creator?.login !== 'vercel[bot]'
    )
      throw Error('preview pending/failed or unknown provenance')
    const preview = new URL(status.environment_url)
    if (
      preview.protocol !== 'https:' ||
      !preview.hostname.endsWith(this.previewHostSuffix) ||
      preview.username ||
      preview.password ||
      preview.port
    )
      throw Error('unexpected preview URL')
    await this.publish(preview.origin, job)
    return {
      head: job.plan.head,
      base: job.plan.base,
      checkRun: relevant[0].id,
      preview: preview.origin,
      deployment: deployment.id
    }
  }
  async merge(job) {
    // CLI's match-head guard uses the reviewed commit, never a moving branch name.
    await this.run([
      'gh',
      'pr',
      'merge',
      String(job.pr.number),
      '--repo',
      REPO,
      '--squash',
      '--match-head-commit',
      job.plan.head
    ])
  }
  async merged(job) {
    const p = await this.api(`pulls/${job.pr.number}`)
    if (p.head.sha !== job.plan.head) throw Error('merged PR head differs')
    return p.merged && p.merge_commit_sha ? { sha: p.merge_commit_sha, url: p.html_url } : null
  }
  async supersede(job) {
    const p = await this.api(`pulls/${job.pr.number}`)
    if (p.merged) throw Error('PR already merged: reconcile before rebuild')
    if (p.head.sha !== job.plan.head) throw Error('cannot rebuild changed head')
    if (p.state === 'open') await this.api(`pulls/${job.pr.number}`, 'PATCH', { state: 'closed' })
  }
}
export async function verifyPublished(origin, job, get = safeGet) {
  const response = await get(`${origin}/links.json?fl=${Date.now()}`)
  const json = JSON.parse(response.body.toString())
  const entries = json.friends
    .flatMap((g) => g.link_list)
    .filter((f) => urlKey(f.link) === urlKey(job.app.link))
  if (
    entries.length !== 1 ||
    ['name', 'intro', 'avatar'].some((key) => entries[0][key] !== job.app[key])
  )
    throw Error('published entry absent or mismatched')
  const page = await get(`${origin}/links?fl=${Date.now()}`)
  if (
    !page.body.toString().includes(escapeHtml(job.app.name)) ||
    !page.body.toString().includes(escapeHtml(job.app.link))
  )
    throw Error('published display missing')
  return { url: `${origin}/links`, at: new Date().toISOString(), bodySha256: digest(response.body) }
}
export function adapters(config) {
  const waline = new Waline(config.walineAdminToken)
  const github = new GitHub(config)
  return {
    comment: waline.comment.bind(waline),
    validate: validateReachability,
    prepare: github.prepare.bind(github),
    createPR: github.createPR.bind(github),
    findPR: github.findPR.bind(github),
    check: github.check.bind(github),
    merge: github.merge.bind(github),
    merged: github.merged.bind(github),
    supersede: github.supersede.bind(github),
    production: (job) => verifyPublished(SITE, job),
    findReply: waline.findReply.bind(waline),
    reply: waline.reply.bind(waline),
    notify: () =>
      command(['/Users/joye/bin/notify-telegram.py', `✅ 友链已上线且回复已核实：${SITE}/links`]),
    scan: waline.scan.bind(waline)
  }
}

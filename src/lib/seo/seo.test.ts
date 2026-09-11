import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, test } from 'bun:test'

import { buildSeo, writeVerification } from '../../../scripts/seo/build.mjs'
import { hash, indexable, origin, parseHtml } from '../../../scripts/seo/html.mjs'
import {
  changedUrls,
  eligible,
  onlineManifest,
  run,
  submit,
  validateManifest
} from '../../../scripts/seo/indexnow.mjs'
import { listingMetadata, sectionMetadata } from './metadata'

const key = 'TEST-FIXTURE-NOT-A-REAL-KEY'
const sha = 'a'.repeat(40)
const manifest = (urls: Record<string, string>, commit = sha) => ({
  version: 1,
  origin,
  commit,
  urls
})
const event = () => ({
  repository: { full_name: 'joyehuang/blog', fork: false },
  deployment: { environment: 'Production', sha, creator: { login: 'vercel[bot]' } },
  deployment_status: {
    environment: 'Production',
    state: 'success',
    creator: { login: 'vercel[bot]' }
  }
})
async function temporary(fn: (dir: string) => Promise<void>) {
  const dir = await mkdtemp(join(tmpdir(), 'seo-fixture-'))
  try {
    await fn(dir)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

describe('metadata and sitemap', () => {
  test('localized sections and meaningful pagination', () => {
    expect(sectionMetadata('/about')?.title).toBe('关于我')
    expect(sectionMetadata('/en/about')?.title).toBe('About')
    expect(sectionMetadata('/blog/existing/post')).toBeUndefined()
    expect(listingMetadata('notes', false, 2, ['实际笔记标题'], 'ai').title).toContain('第 2 页')
    expect(listingMetadata('blog', true, 1, ['Real article'], 'AI').description).toContain(
      'Real article'
    )
  })
  test('HTML quoted attributes, canonical and noindex', () => {
    const p = parseHtml(
      `<title>One &amp; two</title><meta name="description" content="It's A -> B"><link rel="canonical" href="${origin}/x"><meta name="robots" content="noindex, follow">`,
      '/x'
    )
    expect(p.description).toBe("It's A -> B")
    expect(p.title).toBe('One & two')
    expect(indexable(p)).toBe(false)
  })
  test('proof generation is optional and never leaks invalid values', async () =>
    temporary(async (dir) => {
      expect(await writeVerification(dir, undefined)).toBe(false)
      await writeVerification(dir, key)
      expect(await readFile(join(dir, 'indexnow-key.txt'), 'utf8')).toBe(key)
      await expect(writeVerification(dir, 'SECRET/INVALID')).rejects.toThrow(
        'Invalid INDEXNOW_KEY configuration'
      )
    }))
  test('only indexable canonical HTML; explicit content dates; no fabricated tag pairs', async () =>
    temporary(async (dir) => {
      await writeFile(
        join(dir, 'index.html'),
        `<title>Home</title><link rel="canonical" href="${origin}/"><meta name="description" content="Home">`
      )
      await writeFile(
        join(dir, 'v3.html'),
        `<title>Hidden</title><link rel="canonical" href="${origin}/v3"><meta name="robots" content="noindex">`
      )
      await writeFile(
        join(dir, 'article.html'),
        `<title>Article</title><link rel="canonical" href="${origin}/article.html"><script type="application/ld+json">{"dateModified":"2026-07-25T00:00:00.000Z"}</script>`
      )
      await buildSeo(dir, { VERCEL_GIT_COMMIT_SHA: sha })
      const sitemap = await readFile(join(dir, 'sitemap.xml'), 'utf8')
      expect(sitemap).not.toContain('/v3')
      expect(sitemap).toContain('<lastmod>2026-07-25')
      expect(sitemap).not.toContain('hreflang=')
      const first = await readFile(join(dir, '.well-known/indexnow-manifest.json'), 'utf8')
      await buildSeo(dir, { VERCEL_GIT_COMMIT_SHA: sha })
      expect(await readFile(join(dir, '.well-known/indexnow-manifest.json'), 'utf8')).toBe(first)
    }))
})
describe('IndexNow offline protocol', () => {
  test('created, modified, deleted and unchanged URLs', () => {
    const old = manifest({
      [`${origin}/old`]: hash('old'),
      [`${origin}/change`]: hash('a'),
      [`${origin}/same`]: hash('same')
    })
    const next = manifest({
      [`${origin}/new`]: hash('new'),
      [`${origin}/change`]: hash('b'),
      [`${origin}/same`]: hash('same')
    })
    expect(changedUrls(old, next)).toEqual([`${origin}/change`, `${origin}/new`, `${origin}/old`])
    expect(changedUrls(next, next)).toEqual([])
  })
  test('production success only; reject preview, failed, fork, foreign repo and spoofed producer', () => {
    expect(eligible(event())).toBe(true)
    for (const mutate of [
      (e: any) => (e.deployment.environment = 'Preview'),
      (e: any) => (e.deployment_status.state = 'failure'),
      (e: any) => (e.repository.fork = true),
      (e: any) => (e.repository.full_name = 'other/blog'),
      (e: any) => (e.deployment.creator.login = 'other')
    ]) {
      const e = event()
      mutate(e)
      expect(eligible(e)).toBe(false)
    }
  })
  test('reject foreign manifests and mismatched live commit', async () => {
    expect(() => validateManifest(manifest({ 'https://example.com/x': hash('x') }))).toThrow()
    await expect(
      onlineManifest('b'.repeat(40), async () =>
        Response.json(manifest({ [origin + '/']: hash('x') }))
      )
    ).rejects.toThrow('commit')
    await expect(
      onlineManifest(sha, async () => new Response('', { status: 503 }))
    ).rejects.toThrow('unavailable')
  })
  test('200 received, 202 pending, 403/422 rejected without retry', async () => {
    for (const code of [200, 202, 403, 422]) {
      let calls = 0
      const result = await submit([origin + '/'], key, {
        fetcher: async () => {
          calls++
          return new Response('', { status: code })
        }
      })
      expect(calls).toBe(1)
      expect(result.status).toBe(
        code === 200 ? 'received' : code === 202 ? 'validation_pending' : 'rejected'
      )
    }
  })
  test('bounded retries, Retry-After and timeout never report success', async () => {
    let calls = 0
    expect(
      (
        await submit([origin + '/'], key, {
          fetcher: async () => new Response('', { status: ++calls < 3 ? 503 : 200 }),
          sleep: async () => {}
        })
      ).attempts
    ).toBe(3)
    calls = 0
    expect(
      (
        await submit([origin + '/'], key, {
          fetcher: async () => {
            calls++
            throw new Error(key)
          },
          sleep: async () => {}
        })
      ).status
    ).toBe('network_error')
    expect(calls).toBe(3)
    expect(
      (
        await submit([origin + '/'], key, {
          fetcher: async () => new Response('', { status: 429, headers: { 'retry-after': '120' } }),
          sleep: async () => {
            throw new Error('must not retry early')
          }
        })
      ).status
    ).toBe('deferred')
    await expect(submit([origin + '/'], undefined)).rejects.toThrow(
      'Missing or invalid INDEXNOW_KEY'
    )
  })
  test('durable checkpoint makes replay idempotent and retains deletions', async () =>
    temporary(async (dir) => {
      const path = join(dir, 'event.json')
      await writeFile(path, JSON.stringify(event()))
      let stored: any = { manifest: manifest({ [origin + '/deleted']: hash('old') }) }
      let calls = 0
      const current = manifest({ [origin + '/']: hash('home') })
      const fetcher = async (url: string, options: any = {}) => {
        if (url.endsWith('/indexnow')) {
          calls++
          expect(JSON.parse(options.body).urlList).toContain(origin + '/deleted')
          return new Response('', { status: 200 })
        }
        if (url.endsWith('indexnow-key.txt')) return new Response(key)
        if (url.includes('indexnow-manifest.json')) return Response.json(current)
        if (url.includes('git/ref/heads/')) return Response.json({ object: { sha } })
        if (options.method === 'PUT') {
          stored = JSON.parse(Buffer.from(JSON.parse(options.body).content, 'base64').toString())
          return Response.json({})
        }
        return Response.json({
          sha,
          content: Buffer.from(JSON.stringify(stored)).toString('base64')
        })
      }
      const env = { GITHUB_EVENT_PATH: path, GITHUB_TOKEN: 'TEST-TOKEN', INDEXNOW_KEY: key }
      expect((await run(env, fetcher)).status).toBe('received')
      expect((await run(env, fetcher)).status).toBe('unchanged')
      expect(calls).toBe(1)
    }))
})

test('failure does not advance checkpoint; initial history requires explicit opt-in', async () =>
  temporary(async (dir) => {
    const path = join(dir, 'event.json')
    await writeFile(path, JSON.stringify(event()))
    let writes = 0
    const fetcher = async (url: string, options: any = {}) => {
      if (options.method === 'PUT' || (options.method === 'POST' && !url.endsWith('/indexnow')))
        writes++
      if (url.endsWith('/indexnow')) return new Response('', { status: 403 })
      if (url.endsWith('indexnow-key.txt')) return new Response(key)
      if (url.includes('indexnow-manifest.json'))
        return Response.json(manifest({ [origin + '/']: hash('home') }))
      if (url.includes('git/ref/heads/main')) return Response.json({ object: { sha } })
      if (url.includes('git/ref/heads/indexnow-state')) return Response.json({ object: { sha } })
      return new Response('', { status: 404 })
    }
    const env = { GITHUB_EVENT_PATH: path, GITHUB_TOKEN: 'TEST-TOKEN', INDEXNOW_KEY: key }
    await expect(run(env, fetcher)).rejects.toThrow('Missing submission history')
    expect((await run({ ...env, INDEXNOW_ALLOW_INITIAL: 'true' }, fetcher)).status).toBe('rejected')
    expect(writes).toBe(0)
  }))
test('missing secret and preview never make a network request', async () =>
  temporary(async (dir) => {
    const path = join(dir, 'event.json')
    await writeFile(path, JSON.stringify(event()))
    const fetcher = async () => {
      throw new Error('network must not run')
    }
    await expect(run({ GITHUB_EVENT_PATH: path }, fetcher)).rejects.toThrow(
      'Missing or invalid INDEXNOW_KEY'
    )
    const preview = event()
    preview.deployment.environment = 'Preview'
    await writeFile(path, JSON.stringify(preview))
    expect((await run({ GITHUB_EVENT_PATH: path }, fetcher)).status).toBe('ignored_event')
  }))

test('lastmod uses source history, omits uncommitted dates, and rejects shallow boundary', async () =>
  temporary(async (dir) => {
    const { execFileSync } = await import('node:child_process')
    const { contentLastModified } = await import('./lastmod')
    const git = (args: string[]) =>
      execFileSync('git', args, {
        cwd: dir,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
        env: {
          ...process.env,
          GIT_AUTHOR_NAME: 'SEO fixture',
          GIT_AUTHOR_EMAIL: 'fixture@example.invalid',
          GIT_COMMITTER_NAME: 'SEO fixture',
          GIT_COMMITTER_EMAIL: 'fixture@example.invalid',
          GIT_AUTHOR_DATE: '2026-01-01T00:00:00Z',
          GIT_COMMITTER_DATE: '2026-01-01T00:00:00Z'
        }
      }).trim()
    git(['init'])
    const path = join(dir, 'post.md')
    await writeFile(path, 'fixture')
    git(['add', 'post.md'])
    git(['commit', '-m', 'test: create fixture'])
    expect(contentLastModified(path)).toBe('2026-01-01T00:00:00.000Z')
    expect(contentLastModified(path, new Date('2026-02-01'))).toBe('2026-02-01T00:00:00.000Z')
    await writeFile(path, 'changed')
    expect(contentLastModified(path)).toBeUndefined()
    await writeFile(path, 'fixture')
    await writeFile(join(dir, '.git/shallow'), git(['rev-parse', 'HEAD']) + '\n')
    expect(contentLastModified(path)).toBeUndefined()
    expect(contentLastModified(undefined)).toBeUndefined()
  }))

test('explicit SSR sections join the sitemap and source changes update their fingerprint', async () =>
  temporary(async (dir) => {
    const source = join(dir, 'about.astro')
    await writeFile(source, 'About fixture')
    const page = {
      path: '/about',
      title: 'About',
      description: 'About fixture',
      noindex: false,
      alternates: [],
      sources: [source]
    }
    await buildSeo(dir, { VERCEL_GIT_COMMIT_SHA: sha }, [page])
    const first = JSON.parse(
      await readFile(join(dir, '.well-known/indexnow-manifest.json'), 'utf8')
    )
    expect(await readFile(join(dir, 'sitemap.xml'), 'utf8')).toContain(origin + '/about')
    await writeFile(source, 'Updated About fixture')
    await buildSeo(dir, { VERCEL_GIT_COMMIT_SHA: sha }, [page])
    const next = JSON.parse(await readFile(join(dir, '.well-known/indexnow-manifest.json'), 'utf8'))
    expect(changedUrls(first, next)).toEqual([origin + '/about'])
  }))

import { expect, test } from 'bun:test'

import { GitHub, verifyPublished, Waline } from './adapters.mjs'
import { digest, parseApplication } from './data.mjs'

const app = parseApplication(
  'Name: Alice\nDesc: AI\nLink: https://example.com/\nAvatar: https://example.com/a.jpg'
)
const job: any = {
  id: '123',
  app,
  plan: {
    base: 'base',
    head: 'head',
    branch: 'auto/test',
    files: { 'public/links.json': '{}', 'src/site.config.ts': 'source' }
  },
  pr: { number: 1 }
}
function fixture(changes: any = {}) {
  const responses: any = {
    'branches/main/protection': {
      required_status_checks: {
        strict: true,
        checks: [{ context: 'friend-link-check', app_id: 15368 }]
      },
      enforce_admins: { enabled: true }
    },
    'pulls/1': {
      state: 'open',
      head: { sha: 'head', repo: { full_name: 'joyehuang/blog' } },
      base: { ref: 'main' },
      mergeable: true
    },
    'git/ref/heads/main': { object: { sha: 'base' } },
    'compare/base...head': {
      behind_by: 0,
      total_commits: 1,
      files: [
        { filename: 'public/links.json', status: 'modified' },
        { filename: 'src/site.config.ts', status: 'modified' }
      ]
    },
    'commits/head/check-runs?per_page=100': {
      total_count: 1,
      check_runs: [
        {
          name: 'friend-link-check',
          id: 1,
          head_sha: 'head',
          app: { id: 15368 },
          conclusion: 'success',
          status: 'completed'
        }
      ]
    },
    'deployments?sha=head&environment=Preview&per_page=100': [
      { id: 2, sha: 'head', creator: { id: 35613825, login: 'vercel[bot]' } }
    ],
    'deployments/2/statuses?per_page=100': [
      {
        state: 'success',
        creator: { id: 35613825, login: 'vercel[bot]' },
        environment_url: 'https://blog-abc-joyehuangs-projects.vercel.app'
      }
    ]
  }
  for (const [p, v] of Object.entries(job.plan.files))
    responses[`contents/${p}?ref=head`] = {
      type: 'file',
      encoding: 'base64',
      size: 20,
      content: Buffer.from(v as string).toString('base64')
    }
  Object.assign(responses, changes)
  return new GitHub({
    previewHostSuffix: '-joyehuangs-projects.vercel.app',
    api: async (p: string) => {
      if (!(p in responses)) throw Error('unexpected API')
      return responses[p]
    },
    publish: async () => ({ verified: true })
  })
}
test('actual GitHub check adapter validates strict base/head, full diff, pinned CI and preview provenance', async () => {
  expect((await fixture().check(job)).head).toBe('head')
  const failures = [
    { 'git/ref/heads/main': { object: { sha: 'drift' } } },
    { 'branches/main/protection': {} },
    {
      'compare/base...head': {
        behind_by: 0,
        total_commits: 1,
        files: [{ filename: 'package.json', status: 'modified' }]
      }
    },
    {
      'commits/head/check-runs?per_page=100': {
        total_count: 1,
        check_runs: [
          {
            name: 'friend-link-check',
            id: 1,
            head_sha: 'head',
            app: { id: 99 },
            conclusion: 'success'
          }
        ]
      }
    },
    {
      'deployments/2/statuses?per_page=100': [
        {
          state: 'success',
          creator: { id: 99, login: 'vercel[bot]' },
          environment_url: 'https://evil.com'
        }
      ]
    }
  ]
  for (const change of failures) await expect(fixture(change).check(job)).rejects.toThrow()
})
test('merge adapter always passes the reviewed SHA and controlled repository', async () => {
  let args: any
  const github = new GitHub({
    run: async (a: any) => {
      args = a
      return ''
    }
  })
  await github.merge(job)
  expect(args).toEqual([
    'gh',
    'pr',
    'merge',
    '1',
    '--repo',
    'joyehuang/blog',
    '--squash',
    '--match-head-commit',
    'head'
  ])
})
test('Waline reader uses canonical API, bounded complete pagination, real IDs and admin reply marker', async () => {
  const marker = `friend-link:${digest('123').slice(0, 24)}`
  const c = {
    objectId: '123',
    insertedAt: '2026-09-15T00:00:00Z',
    comment: 'x',
    children: [{ objectId: '456', pid: '123', rid: '123', type: 'administrator', comment: marker }]
  }
  const urls: string[] = []
  const w = new Waline(undefined, async (url: string) => {
    urls.push(url)
    return { errno: 0, data: { totalPages: 1, data: [c] } }
  })
  expect((await w.comment('123')).url).toBe('/links')
  expect(await w.findReply(job)).toEqual({ id: '456', parent: '123' })
  expect(
    urls.every((u) => u.startsWith('https://waline.joyehuang.me/api/comment?path=%2Flinks'))
  ).toBe(true)
  const bad = new Waline(undefined, async () => ({ errno: 0, data: { totalPages: 21, data: [] } }))
  await expect(bad.scan()).rejects.toThrow('exceeds')
  const err = new Waline(undefined, async () => ({ errno: 500 }))
  await expect(err.scan()).rejects.toThrow()
})
test('production requires matching content and rendered page, not just an HTTP success', async () => {
  const payload = { friends: [{ link_list: [app] }] }
  const get = async (url: string) => ({
    body: Buffer.from(
      url.includes('links.json') ? JSON.stringify(payload) : `<a href="${app.link}">${app.name}</a>`
    )
  })
  expect((await verifyPublished('https://joyehuang.me', job, get)).url).toBe(
    'https://joyehuang.me/links'
  )
  await expect(
    verifyPublished('https://joyehuang.me', job, async () => ({
      body: Buffer.from('{"friends":[]}')
    }))
  ).rejects.toThrow()
})

import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from 'bun:test'

import { GitHub } from './adapters.mjs'

// A real offline Git remote enforces fast-forward ancestry. GitHub PR indexing is a
// separately controlled fact, never inferred from a successful push in these tests.
function setup() {
  const dir = mkdtempSync(join(tmpdir(), 'friend-merge-'))
  const git = (...args: string[]) => {
    const r = spawnSync('git', ['-C', dir, ...args], {
      encoding: 'utf8',
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: 'Fixture',
        GIT_AUTHOR_EMAIL: 'fixture@example.invalid',
        GIT_COMMITTER_NAME: 'Fixture',
        GIT_COMMITTER_EMAIL: 'fixture@example.invalid'
      }
    })
    if (r.status) throw Error('offline Git rejected operation')
    return r.stdout.trim()
  }
  git('init', '-q', '-b', 'main')
  mkdirSync(join(dir, 'public'))
  mkdirSync(join(dir, 'src'))
  const files: any = { 'public/links.json': 'new links', 'src/site.config.ts': 'new config' }
  for (const path of Object.keys(files)) writeFileSync(join(dir, path), 'base')
  writeFileSync(join(dir, 'untouched'), 'preserve')
  git('add', '.')
  git('commit', '-qm', 'base')
  const base = git('rev-parse', 'HEAD')
  git('checkout', '-qb', 'auto/test')
  for (const [path, content] of Object.entries(files))
    writeFileSync(join(dir, path), content as string)
  git('add', '.')
  git('commit', '-qm', 'head')
  const head = git('rev-parse', 'HEAD')
  git('clone', '-q', '--bare', dir, join(dir, 'remote.git'))
  let main = base,
    merged = false,
    prHead = head,
    writes = 0,
    race = false,
    ackLost = false,
    protectedBranch = false
  const commits = (sha: string) => ({
    sha,
    tree: { sha: git('show', '-s', '--format=%T', sha) },
    parents: git('show', '-s', '--format=%P', sha)
      .split(' ')
      .filter(Boolean)
      .map((sha) => ({ sha }))
  })
  const compare = (a: string, b: string) => {
    const [behind, ahead] = git('rev-list', '--left-right', '--count', `${a}...${b}`)
      .split(/\s+/)
      .map(Number)
    return {
      behind_by: behind,
      ahead_by: ahead,
      status:
        behind === 0 ? (ahead === 0 ? 'identical' : 'ahead') : ahead === 0 ? 'behind' : 'diverged'
    }
  }
  const advance = () => {
    const next = git('commit-tree', commits(base).tree.sha, '-p', base, '-m', 'concurrent main')
    git('push', '-q', join(dir, 'remote.git'), `${next}:refs/heads/main`)
    main = next
  }
  const job: any = {
    id: 'fixture',
    plan: { base, head, branch: 'auto/test', files },
    pr: { number: 1 }
  }
  const github = new GitHub({
    api: async (path: string, method = 'GET', data?: any) => {
      if (path === 'branches/main') return { protected: protectedBranch }
      if (path === 'rules/branches/main') return []
      if (path === 'git/ref/heads/main') return { object: { sha: main } }
      if (path === 'pulls/1')
        return {
          state: merged ? 'closed' : 'open',
          merged,
          merged_at: merged ? '2026-09-15T00:00:00Z' : null,
          merge_commit_sha: merged ? job.mergeCandidate.sha : null,
          head: { sha: prHead, ref: 'auto/test', repo: { full_name: 'joyehuang/blog' } },
          base: { ref: 'main', repo: { full_name: 'joyehuang/blog' } },
          html_url: 'https://github.com/joyehuang/blog/pull/1'
        }
      if (path.startsWith('git/commits/')) return commits(path.slice(12))
      if (path.startsWith('git/trees/'))
        return {
          truncated: false,
          tree: git('ls-tree', '-r', '-t', path.slice(10).split('?')[0])
            .split('\n')
            .map((line) => {
              const [meta, path] = line.split('\t')
              const [mode, type, sha] = meta.split(' ')
              return { path, mode, type, sha }
            })
        }
      if (path.startsWith('compare/')) {
        const [a, b] = path.slice(8).split('...')
        return compare(a, b)
      }
      if (path === 'git/commits' && method === 'POST')
        return {
          sha: git(
            'commit-tree',
            data.tree,
            '-p',
            data.parents[0],
            '-p',
            data.parents[1],
            '-m',
            data.message
          )
        }
      if (path === 'git/refs/heads/main' && method === 'PATCH') {
        writes++
        expect(data.force).toBe(false)
        if (race) advance()
        git('push', '-q', join(dir, 'remote.git'), `${data.sha}:refs/heads/main`)
        main = data.sha
        if (ackLost) throw Error('lost response')
        return { object: { sha: main } }
      }
      throw Error(`unexpected offline API ${path}`)
    }
  })
  // Full check gates are exercised independently in adapters.test.ts; here exact
  // Git graph/tree and the actual seal/merge/reconcile adapters execute unchanged.
  github.check = async () => {
    await github.policy()
    return { tree: await github.exactTree(job) }
  }
  return {
    git,
    github,
    job,
    advance,
    setRace: () => (race = true),
    setLost: () => (ackLost = true),
    setMerged: () => (merged = true),
    setHead: () => (prHead = base),
    setProtected: () => (protectedBranch = true),
    setUnknown: () => (merged = false),
    writes: () => writes,
    done: () => rmSync(dir, { recursive: true, force: true })
  }
}
test('exact dual-parent tree, GitHub merged fact required, lost ACK reconciles once', async () => {
  const f = setup()
  try {
    f.job.mergeCandidate = await f.github.seal(f.job)
    f.setLost()
    await expect(f.github.merge(f.job, async () => {})).rejects.toThrow('lost response')
    expect(await f.github.merged(f.job)).toBeNull()
    f.setMerged()
    const proof = await f.github.merged(f.job)
    expect(proof.parents).toEqual([f.job.plan.base, f.job.plan.head])
    expect(f.writes()).toBe(1)
    expect(f.git('show', '-s', '--format=%T', proof.sha)).toBe(
      f.git('show', '-s', '--format=%T', f.job.plan.head)
    )
  } finally {
    f.done()
  }
})
test('concurrent main advance at publication rejects non-force push then requires rebuild', async () => {
  const f = setup()
  try {
    f.job.mergeCandidate = await f.github.seal(f.job)
    f.setRace()
    await expect(f.github.merge(f.job, async () => {})).rejects.toThrow('Git rejected')
    await expect(f.github.merged(f.job)).rejects.toMatchObject({ code: 'BASE_DRIFT' })
    expect(f.writes()).toBe(1)
  } finally {
    f.done()
  }
})
for (const kind of ['head', 'source', 'protection', 'tree', 'candidate', 'base'])
  test(`${kind} drift prevents publication`, async () => {
    const f = setup()
    try {
      f.job.mergeCandidate = await f.github.seal(f.job)
      if (kind === 'head') f.setHead()
      if (kind === 'protection') f.setProtected()
      if (kind === 'tree') f.job.plan.files['public/links.json'] = 'injected'
      if (kind === 'candidate') f.job.mergeCandidate.sha = f.job.plan.head
      if (kind === 'base') f.advance()
      await expect(
        f.github.merge(f.job, async () => {
          if (kind === 'source') throw Error('withdrawn')
        })
      ).rejects.toThrow()
      expect(f.writes()).toBe(0)
    } finally {
      f.done()
    }
  })

test('source changes on final guard and late head drift never invent merged proof', async () => {
  const f = setup()
  try {
    f.job.mergeCandidate = await f.github.seal(f.job)
    let guards = 0
    await expect(
      f.github.merge(f.job, async () => {
        if (++guards === 2) throw Error('source edited after last reference read')
      })
    ).rejects.toThrow('source edited')
    expect(f.writes()).toBe(0)
    await f.github.merge(f.job, async () => {})
    f.setHead()
    f.setMerged()
    await expect(f.github.merged(f.job)).rejects.toThrow('identity differs')
    expect(f.writes()).toBe(1)
  } finally {
    f.done()
  }
})
test('lost response before publication remains unknown without retry', async () => {
  const f = setup()
  try {
    f.job.mergeCandidate = await f.github.seal(f.job)
    await expect(f.github.merged(f.job)).rejects.toThrow('unknown')
    expect(f.writes()).toBe(0)
  } finally {
    f.done()
  }
})

import { execFileSync } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, setSystemTime, test } from 'bun:test'

import { contentLastModified, resolveLastModified } from './lastmod'

const published = new Date('2026-01-01T00:00:00Z')

function git(cwd: string, args: string[], date?: string) {
  return execFileSync('git', ['-c', 'commit.gpgsign=false', ...args], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 'fixture',
      GIT_AUTHOR_EMAIL: 'fixture@example.invalid',
      GIT_COMMITTER_NAME: 'fixture',
      GIT_COMMITTER_EMAIL: 'fixture@example.invalid',
      ...(date ? { GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date } : {})
    }
  }).trim()
}

async function commit(dir: string, file: string, body: string, date: string) {
  await writeFile(join(dir, file), body)
  git(dir, ['add', file])
  git(dir, ['commit', '-m', `edit ${file}`], date)
}

async function withRepo(fn: (dir: string) => Promise<void>) {
  const dir = await mkdtemp(join(tmpdir(), 'lastmod-fixture-'))
  try {
    git(dir, ['init'])
    await fn(dir)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

test('frontmatter updatedDate wins over git history', async () =>
  withRepo(async (dir) => {
    await commit(dir, 'post.md', 'v1', '2026-01-02T00:00:00Z')
    await commit(dir, 'post.md', 'v2', '2026-03-01T00:00:00Z')
    const path = join(dir, 'post.md')
    expect(contentLastModified(path, published, new Date('2026-02-01T00:00:00Z'))).toBe(
      '2026-02-01T00:00:00.000Z'
    )
  }))

test('without updatedDate the last git edit is used', async () =>
  withRepo(async (dir) => {
    await commit(dir, 'post.md', 'v1', '2026-01-02T00:00:00Z')
    await commit(dir, 'other.md', 'x', '2026-02-01T00:00:00Z')
    await commit(dir, 'post.md', 'v2', '2026-03-01T12:30:00+08:00')
    expect(contentLastModified(join(dir, 'post.md'), published)).toBe('2026-03-01T04:30:00.000Z')
  }))

test('an article never edited after its creation commit equals datePublished', async () =>
  withRepo(async (dir) => {
    await commit(dir, 'post.md', 'v1', '2026-01-05T09:00:00Z')
    await commit(dir, 'other.md', 'x', '2026-02-01T00:00:00Z')
    expect(contentLastModified(join(dir, 'post.md'), published)).toBe('2026-01-01T00:00:00.000Z')
  }))

test('no git history falls back to datePublished', async () =>
  withRepo(async (dir) => {
    await writeFile(join(dir, 'untracked.md'), 'x')
    expect(contentLastModified(join(dir, 'untracked.md'), published)).toBe(
      '2026-01-01T00:00:00.000Z'
    )
    expect(contentLastModified(undefined, published)).toBe('2026-01-01T00:00:00.000Z')
    expect(contentLastModified('/nonexistent/dir/post.md', published)).toBe(
      '2026-01-01T00:00:00.000Z'
    )
  }))

test('dateModified is never earlier than datePublished', () => {
  expect(resolveLastModified(published, new Date('2025-06-01T00:00:00Z'))).toBe(
    '2026-01-01T00:00:00.000Z'
  )
  expect(resolveLastModified(published, undefined, [new Date('2025-06-01T00:00:00Z')])).toBe(
    '2026-01-01T00:00:00.000Z'
  )
  expect(resolveLastModified(published, new Date('invalid'))).toBe('2026-01-01T00:00:00.000Z')
})

test('shallow clones never turn the boundary commit into a modification', async () =>
  withRepo(async (dir) => {
    await commit(dir, 'old.md', 'v1', '2026-01-02T00:00:00Z')
    await commit(dir, 'edited.md', 'v1', '2026-01-03T00:00:00Z')
    await commit(dir, 'edited.md', 'v2', '2026-02-01T00:00:00Z')
    await commit(dir, 'unrelated.md', 'x', '2026-03-01T00:00:00Z')

    const shallow = await mkdtemp(join(tmpdir(), 'lastmod-shallow-'))
    try {
      git(tmpdir(), ['clone', '--depth', '1', '--quiet', `file://${dir}`, shallow])
      // Boundary is the newest commit: every file looks "added" there.
      expect(contentLastModified(join(shallow, 'old.md'), published)).toBe(
        '2026-01-01T00:00:00.000Z'
      )
      expect(contentLastModified(join(shallow, 'edited.md'), published)).toBe(
        '2026-01-01T00:00:00.000Z'
      )
    } finally {
      await rm(shallow, { recursive: true, force: true })
    }

    const deeper = await mkdtemp(join(tmpdir(), 'lastmod-shallow-'))
    try {
      git(tmpdir(), ['clone', '--depth', '3', '--quiet', `file://${dir}`, deeper])
      // Visible: unrelated, edited v2 (real edit), edited v1 (boundary).
      expect(contentLastModified(join(deeper, 'edited.md'), published)).toBe(
        '2026-02-01T00:00:00.000Z'
      )
      expect(contentLastModified(join(deeper, 'old.md'), published)).toBe(
        '2026-01-01T00:00:00.000Z'
      )
    } finally {
      await rm(deeper, { recursive: true, force: true })
    }
  }))

test('rebuilds and fresh deploys do not change the value', async () =>
  withRepo(async (dir) => {
    await commit(dir, 'post.md', 'v1', '2026-01-02T00:00:00Z')
    await commit(dir, 'post.md', 'v2', '2026-03-01T00:00:00Z')
    await commit(dir, 'fixed.md', 'v1', '2026-01-02T00:00:00Z')
    const expected = {
      edited: '2026-03-01T00:00:00.000Z',
      untouched: '2026-01-01T00:00:00.000Z'
    }
    const read = (root: string) => ({
      edited: contentLastModified(join(root, 'post.md'), published),
      untouched: contentLastModified(join(root, 'fixed.md'), published)
    })
    expect(read(dir)).toEqual(expected)

    try {
      setSystemTime(new Date('2030-06-15T12:00:00Z'))
      expect(read(dir)).toEqual(expected)

      // A fresh deploy checks files out again: new mtimes, same history.
      const fresh = await mkdtemp(join(tmpdir(), 'lastmod-fresh-'))
      try {
        git(tmpdir(), ['clone', '--quiet', `file://${dir}`, fresh])
        expect(read(fresh)).toEqual(expected)
      } finally {
        await rm(fresh, { recursive: true, force: true })
      }
    } finally {
      setSystemTime()
    }
  }))

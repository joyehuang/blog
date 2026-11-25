import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import {
  createFileStore,
  formatCommentsAsMarkdown,
  normalizePath,
  validateCreateInput,
  validateUpdateInput
} from './store'

describe('dev-comments store', () => {
  let dir = ''
  let filePath = ''

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'dev-comments-test-'))
    filePath = join(dir, '.dev-comments.json')
  })

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true })
  })

  test('normalizePath strips query, hash, and trailing slashes', () => {
    expect(normalizePath('/notes/1126-foo/')).toBe('/notes/1126-foo')
    expect(normalizePath('notes/foo?a=1#sec')).toBe('/notes/foo')
    expect(normalizePath('/')).toBe('/')
    expect(normalizePath('')).toBe('/')
  })

  test('supports full CRUD lifecycle and persists across store instances', () => {
    const store = createFileStore(filePath)
    expect(store.list()).toEqual([])

    const c1 = store.create({
      path: '/notes/demo/',
      quote: '这是一句测试原文',
      prefix: '前面是',
      suffix: '后面是',
      heading: '核心内容',
      body: '这句话改短一点',
      kind: 'rewrite'
    })

    expect(c1.id).toHaveLength(8)
    expect(c1.path).toBe('/notes/demo')
    expect(c1.status).toBe('open')

    // Reload from disk via a fresh store instance
    const reloaded = createFileStore(filePath)
    expect(reloaded.list({ path: '/notes/demo' })).toHaveLength(1)

    const updated = reloaded.update(c1.id, {
      body: '改成更口语化的表达',
      kind: 'cut',
      status: 'resolved'
    })
    expect(updated?.body).toBe('改成更口语化的表达')
    expect(updated?.kind).toBe('cut')
    expect(updated?.status).toBe('resolved')

    expect(reloaded.list({ status: 'open' })).toHaveLength(0)
    expect(reloaded.list({ status: 'resolved' })).toHaveLength(1)

    expect(reloaded.remove(c1.id)).toBe(true)
    expect(reloaded.remove(c1.id)).toBe(false)
    expect(reloaded.list()).toEqual([])
  })

  test('clear filters cleanly by path and status', () => {
    const store = createFileStore(filePath)
    const a = store.create({ path: '/notes/a', body: 'note a open' })
    const b = store.create({ path: '/notes/a', body: 'note a resolved' })
    const c = store.create({ path: '/notes/b', body: 'note b resolved' })
    store.update(b.id, { status: 'resolved' })
    store.update(c.id, { status: 'resolved' })

    expect(store.clear({ path: '/notes/a', status: 'resolved' })).toBe(1)
    expect(store.list().map((item) => item.id)).toEqual([a.id, c.id])

    expect(store.clear({ path: '/notes/a' })).toBe(1)
    expect(store.list().map((item) => item.id)).toEqual([c.id])
  })

  test('replaceAll restores exact snapshots for undo and redo', () => {
    const store = createFileStore(filePath)
    const first = store.create({ path: '/notes/a', quote: '删掉这句', body: '', kind: 'cut' })
    const snapshot = store.list()

    store.remove(first.id)
    expect(store.list()).toEqual([])

    const restored = store.replaceAll(snapshot)
    expect(restored).toHaveLength(1)
    expect(restored[0]!.id).toBe(first.id)
    expect(restored[0]!.createdAt).toBe(first.createdAt)
    expect(createFileStore(filePath).list()).toEqual(snapshot)
  })

  test('validates invalid create and update inputs', () => {
    expect(() => validateCreateInput({ path: '/notes/a', body: '   ' })).toThrow()
    // Quoted annotations (e.g. one-click cut) may omit body
    expect(
      validateCreateInput({ path: '/notes/a', quote: '多余的话', kind: 'cut', body: '' })
    ).toEqual({
      path: '/notes/a',
      quote: '多余的话',
      prefix: '',
      suffix: '',
      heading: '',
      body: '',
      kind: 'cut'
    })
    expect(() => validateUpdateInput({})).toThrow()
    expect(() => validateUpdateInput({ status: 'unknown' })).toThrow()
  })

  test('formats open comments as agent-ready markdown grouped by page', () => {
    const store = createFileStore(filePath)
    const openItem = store.create({
      path: '/notes/demo',
      quote: '过于抽象的一句话',
      heading: '要点整理',
      body: '换成具体例子',
      kind: 'rewrite'
    })
    store.create({
      path: '/notes/demo',
      quote: '这句可以删掉',
      heading: '要点整理',
      body: '',
      kind: 'cut'
    })
    const resolvedItem = store.create({
      path: '/notes/demo',
      body: '已经改完了',
      kind: 'fix'
    })
    store.update(resolvedItem.id, { status: 'resolved' })

    const md = formatCommentsAsMarkdown(store.list(), { onlyOpen: true })
    expect(md).toContain('## 页面：`/notes/demo`')
    expect(md).toContain('**[改文案]** · 位于「要点整理」')
    expect(md).toContain('> 原文：过于抽象的一句话')
    expect(md).toContain('- 批注：换成具体例子')
    expect(md).toContain('**[删减]** · 位于「要点整理」')
    expect(md).toContain('- 批注：删除这段内容')
    expect(md).not.toContain('已经改完了')
    expect(openItem.status).toBe('open')
  })
})

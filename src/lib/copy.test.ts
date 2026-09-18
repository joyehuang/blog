import { afterEach, describe, expect, test } from 'bun:test'

import { copyText } from './copy'

const original = {
  navigator: globalThis.navigator,
  document: globalThis.document
}

/** 最小 DOM 替身，只够 legacyCopy 走完：建 textarea、插进去、select、execCommand、移除 */
function stubDocument(execResult: boolean | (() => boolean)) {
  const removed: string[] = []
  const doc = {
    createElement: () => {
      const node = {
        value: '',
        style: { cssText: '' },
        setAttribute: () => {},
        select: () => {},
        remove: () => removed.push('removed')
      }
      return node
    },
    body: { appendChild: () => {} },
    execCommand: () => (typeof execResult === 'function' ? execResult() : execResult)
  }
  Object.defineProperty(globalThis, 'document', { value: doc, configurable: true, writable: true })
  return { removed }
}

function stubClipboard(impl: ((text: string) => Promise<void>) | null) {
  const value = impl ? { clipboard: { writeText: impl } } : {}
  Object.defineProperty(globalThis, 'navigator', { value, configurable: true, writable: true })
}

afterEach(() => {
  Object.defineProperty(globalThis, 'navigator', { value: original.navigator, configurable: true, writable: true })
  Object.defineProperty(globalThis, 'document', { value: original.document, configurable: true, writable: true })
})

describe('copyText', () => {
  test('剪贴板真的收下之后才算成功，并且拿到的是原文', async () => {
    let written = ''
    stubClipboard(async (text) => {
      written = text
    })
    expect(await copyText('hello world')).toBe('copied')
    expect(written).toBe('hello world')
  })

  test('等的是 Promise 本身：resolve 之前不会提前报成功', async () => {
    let release!: () => void
    const gate = new Promise<void>((r) => (release = r))
    stubClipboard(() => gate)
    const pending = copyText('x')
    let settled = false
    void pending.then(() => (settled = true))
    await new Promise((r) => setTimeout(r, 15))
    expect(settled).toBe(false)
    release()
    expect(await pending).toBe('copied')
  })

  test('权限被拒时不谎报成功——兜底也失败就是 failed', async () => {
    stubClipboard(async () => {
      throw new DOMException('Write permission denied.', 'NotAllowedError')
    })
    stubDocument(false)
    expect(await copyText('x')).toBe('failed')
  })

  test('权限被拒但兜底成功时算成功', async () => {
    stubClipboard(async () => {
      throw new Error('not allowed')
    })
    stubDocument(true)
    expect(await copyText('x')).toBe('copied')
  })

  test('非安全上下文（没有 clipboard API）走兜底', async () => {
    stubClipboard(null)
    stubDocument(true)
    expect(await copyText('x')).toBe('copied')
  })

  test('兜底抛异常也不能崩，按失败处理', async () => {
    stubClipboard(null)
    stubDocument(() => {
      throw new Error('execCommand blew up')
    })
    expect(await copyText('x')).toBe('failed')
  })

  test('空内容直接算失败，不发起复制', async () => {
    let called = false
    stubClipboard(async () => {
      called = true
    })
    expect(await copyText('')).toBe('failed')
    expect(called).toBe(false)
  })
})

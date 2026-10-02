import { expect, test } from 'bun:test'

import { copyWithFallback } from './copy'

test('does not confirm before the clipboard promise resolves', async () => {
  let resolve!: () => void
  let settled = false
  const pending = copyWithFallback(
    () =>
      new Promise<void>((done) => {
        resolve = done
      }),
    () => {
      throw new Error('must not fall back')
    }
  )
  void pending.then(() => {
    settled = true
  })
  await Promise.resolve()
  expect(settled).toBe(false)
  resolve()
  expect(await pending).toBe('clipboard')
})
test('a rejected write checks fallback and reports both failure forms', async () => {
  const reject = async () => {
    throw new Error('denied')
  }
  expect(await copyWithFallback(reject, () => true)).toBe('fallback')
  expect(await copyWithFallback(reject, () => false)).toBe('failed')
  expect(
    await copyWithFallback(reject, () => {
      throw new Error('denied again')
    })
  ).toBe('failed')
})

import { expect, test } from 'bun:test'

import { guardedEntry } from './entry'

test('refuses every entry before requesting the module', async () => {
  let loads = 0
  for (let attempt = 0; attempt < 3; attempt++) {
    expect(
      await guardedEntry(
        () => true,
        async () => {
          loads++
          return 1
        },
        () => {
          throw new Error('must not start')
        }
      )
    ).toBe(false)
  }
  expect(loads).toBe(0)
})
test('checks preference again across module loading', async () => {
  let blocked = false
  let started = false
  expect(
    await guardedEntry(
      () => blocked,
      async () => {
        blocked = true
        return 1
      },
      () => {
        started = true
      }
    )
  ).toBe(false)
  expect(started).toBe(false)
})
test('starts with the loaded module when allowed', async () => {
  let value = 0
  expect(
    await guardedEntry(
      () => false,
      async () => 42,
      (module) => {
        value = module
      }
    )
  ).toBe(true)
  expect(value).toBe(42)
})

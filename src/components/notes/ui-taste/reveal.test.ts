import { describe, expect, test } from 'bun:test'

import { shouldSkipCollapse } from './reveal'

const viewport = 800

describe('shouldSkipCollapse', () => {
  test('已经完整落在视口里的图不收起', () => {
    expect(shouldSkipCollapse({ top: 100, bottom: 400, width: 600, height: 300 }, viewport)).toBe(
      true
    )
  })

  test('只露出一条边也不收起，避免先消失再展开', () => {
    expect(shouldSkipCollapse({ top: 790, bottom: 1100, width: 600, height: 310 }, viewport)).toBe(
      true
    )
    expect(shouldSkipCollapse({ top: -20, bottom: 10, width: 600, height: 30 }, viewport)).toBe(
      true
    )
  })

  test('完全在视口外才允许收起', () => {
    expect(shouldSkipCollapse({ top: 900, bottom: 1400, width: 600, height: 500 }, viewport)).toBe(
      false
    )
    expect(shouldSkipCollapse({ top: -500, bottom: -10, width: 600, height: 490 }, viewport)).toBe(
      false
    )
  })

  test('还没布局出来时不收起', () => {
    expect(shouldSkipCollapse({ top: 0, bottom: 0, width: 0, height: 0 }, viewport)).toBe(true)
  })
})

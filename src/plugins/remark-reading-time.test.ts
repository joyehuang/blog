import { describe, expect, test } from 'bun:test'

import { calculateReadingTime } from './remark-reading-time'

describe('calculateReadingTime', () => {
  test('uses 350 characters per minute for Chinese text', () => {
    const result = calculateReadingTime('中'.repeat(700))

    expect(result.cjkCharacters).toBe(700)
    expect(result.words).toBe(0)
    expect(result.displayedMinutes).toBe(2)
  })

  test('uses 200 words per minute for English text', () => {
    const result = calculateReadingTime(Array(400).fill('agent').join(' '))

    expect(result.cjkCharacters).toBe(0)
    expect(result.words).toBe(400)
    expect(result.displayedMinutes).toBe(2)
  })

  test('adds CJK and English reading time for mixed content', () => {
    const result = calculateReadingTime(`${'中'.repeat(350)} ${Array(200).fill('agent').join(' ')}`)

    expect(result.minutes).toBe(2)
    expect(result.displayedMinutes).toBe(2)
  })
})

import { describe, expect, it } from 'bun:test'

import { guideStops, STOP_ORDER } from './guide'

describe('guide stops', () => {
  it('keeps page order, skips unknown and repeated ids', () => {
    const s = guideStops(['blog', 'nope', 'experience', 'blog', 'skills'], 'zh')
    expect(s.map((x) => x.id)).toEqual(['blog', 'experience', 'skills'])
  })

  it('has a title and a line for every stop in both languages', () => {
    for (const lang of ['zh', 'en'] as const) {
      const all = guideStops(STOP_ORDER, lang)
      expect(all).toHaveLength(STOP_ORDER.length)
      for (const s of all) {
        expect(s.title.length).toBeGreaterThan(0)
        expect(s.line.length).toBeGreaterThan(8)
      }
    }
  })

  it('names the products as the page does', () => {
    const line = guideStops(['experience'], 'zh')[0].line
    expect(line).toContain('AIXCut')
    expect(line).not.toContain('Goshu')
  })
})

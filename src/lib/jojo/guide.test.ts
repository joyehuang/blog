import { describe, expect, it } from 'bun:test'

import { GUIDE_END, guideStops, STOP_ORDER } from './guide'

describe('guide stops', () => {
  it('keeps page order, skips unknown and repeated ids', () => {
    const s = guideStops(['blog', 'notes', 'experience', 'blog', 'skills'], 'zh')
    expect(s.map((x) => x.id)).toEqual(['blog', 'experience', 'skills'])
  })

  it('has a title and short lines for every stop in both languages', () => {
    for (const lang of ['zh', 'en'] as const) {
      const all = guideStops(STOP_ORDER, lang)
      expect(all).toHaveLength(STOP_ORDER.length)
      for (const s of all) {
        expect(s.title.length).toBeGreaterThan(0)
        expect(s.lines.length).toBeGreaterThan(0)
        for (const l of s.lines)
          expect(Array.from(l).length).toBeLessThanOrEqual(lang === 'zh' ? 70 : 140)
      }
    }
  })

  it('names the products as the page does and points the live stop at Bilibili', () => {
    const [exp, live] = guideStops(['experience', 'talks'], 'zh')
    expect(exp.lines.join('')).toContain('AIXCut')
    expect(exp.lines.join('')).not.toContain('Goshu')
    expect(live.link?.href).toContain('bilibili.com')
  })

  it('ends with a way to swap friend links', () => {
    expect(GUIDE_END.zh.links.href).toBe('/links#apply-links')
    expect(GUIDE_END.en.links.href).toBe('/en/links#apply-links')
  })
})

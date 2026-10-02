import { describe, expect, it } from 'bun:test'

import { GUIDE_END, guideStops, STOP_ORDER } from './guide'

describe('guide stops', () => {
  it('keeps page order, skips unknown, repeated and silent stops', () => {
    const s = guideStops(['blog', 'notes', 'experience', 'blog', 'education', 'skills'], 'zh')
    expect(s.map((x) => x.id)).toEqual(['blog', 'experience'])
    // the English home has no Product or Talks, and nothing is said about them
    expect(guideStops(STOP_ORDER, 'en').map((x) => x.id)).toEqual([
      'blog',
      'experience',
      'opensource'
    ])
  })

  it('talks each stop through in more than a one-liner', () => {
    for (const lang of ['zh', 'en'] as const) {
      for (const s of guideStops(STOP_ORDER, lang)) {
        expect(s.bubbles.length).toBeGreaterThan(1)
        for (const b of s.bubbles) {
          const n = Array.from(b.text).length
          expect(n).toBeGreaterThan(lang === 'zh' ? 20 : 50)
          expect(n).toBeLessThanOrEqual(lang === 'zh' ? 100 : 240)
        }
      }
    }
  })

  it('names the products as the page does', () => {
    const exp = guideStops(['experience'], 'zh')[0]
      .bubbles.map((b) => b.text)
      .join('')
    for (const name of ['Playyy.ai', 'atypica', 'AIXCut', 'fAIshion.ai'])
      expect(exp).toContain(name)
    expect(exp).not.toContain('Goshu')
  })

  it('links to real routes and opens outside sites in a new tab', () => {
    for (const lang of ['zh', 'en'] as const) {
      for (const s of guideStops(STOP_ORDER, lang)) {
        for (const b of s.bubbles) {
          if (!b.link) continue
          if (b.link.href.startsWith('/')) {
            expect(b.link.href).toMatch(
              lang === 'en' ? /^\/en\/blog\/.+\/post$/ : /^\/blog\/.+\/post$/
            )
            expect(b.link.external).toBeFalsy()
          } else {
            expect(b.link.href).toMatch(/^https:\/\//)
            expect(b.link.external).toBe(true)
          }
        }
      }
    }
    const live = guideStops(['talks'], 'zh')[0]
    expect(live.bubbles.some((b) => b.link?.href.includes('bilibili.com'))).toBe(true)
  })

  it('ends with a way to swap friend links', () => {
    expect(GUIDE_END.zh.links.href).toBe('/links#apply-links')
    expect(GUIDE_END.en.links.href).toBe('/en/links#apply-links')
  })
})

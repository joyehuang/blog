import { describe, expect, it } from 'bun:test'

import { GUIDE_END, guideStops, STOP_ORDER } from './guide'

describe('guide stops', () => {
  it('keeps page order, skips unknown, repeated and silent stops', () => {
    const s = guideStops(
      ['blog', 'notes', 'talks', 'experience', 'blog', 'opensource', 'education', 'skills'],
      'zh'
    )
    expect(s.map((x) => x.id)).toEqual(['blog', 'notes', 'talks', 'experience'])
    // the English home has no Product or Talks, and nothing is said about them
    expect(guideStops(STOP_ORDER, 'en').map((x) => x.id)).toEqual(['blog', 'notes', 'experience'])
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

  it('introduces every product by name, each with a link to it', () => {
    for (const lang of ['zh', 'en'] as const) {
      const exp = guideStops(['experience'], lang)[0].bubbles
      const names = ['Playyy.ai', 'atypica', 'AIXCut', 'fAIshion.ai']
      names.forEach((name, i) => {
        expect(exp[i].text).toContain(name)
        expect(exp[i].link?.external).toBe(true)
      })
      expect(exp.map((b) => b.text).join('')).not.toContain('Goshu')
    }
  })

  it('leaves out OpenHarness and the early Transformer series', () => {
    const blog = guideStops(['blog'], 'zh')[0].bubbles.map((b) => b.text + (b.link?.href ?? ''))
    for (const t of blog) {
      expect(t).not.toContain('OpenHarness')
      expect(t).not.toMatch(/openharness|normalization|RoPE/i)
    }
  })

  it('mentions Lab inside Notes, with a link to it', () => {
    for (const lang of ['zh', 'en'] as const) {
      const notes = guideStops(['notes'], lang)[0].bubbles
      expect(notes.some((b) => b.link?.href === '/lab')).toBe(true)
    }
  })

  it('links to real routes and opens outside sites in a new tab', () => {
    for (const lang of ['zh', 'en'] as const) {
      for (const s of guideStops(STOP_ORDER, lang)) {
        for (const b of s.bubbles) {
          if (!b.link) continue
          if (b.link.href.startsWith('/')) {
            expect(b.link.href).toMatch(/^(\/en)?\/(blog\/.+\/post|notes|lab)$/)
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

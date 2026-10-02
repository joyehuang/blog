import { describe, expect, it } from 'bun:test'

import { jojoHeadGate } from './head-gate.js'

const KEYS = { intro: 'joye:jojo:intro:v1', reviewMode: 'joye:jojo:review-mode' }

function fakeWindow(o: {
  href?: string
  stored?: Record<string, string>
  session?: Record<string, string>
  storageThrows?: boolean
  reduce?: boolean
  saveData?: boolean
  hidden?: boolean
  w?: number
  h?: number
}) {
  const attrs: Record<string, string> = {}
  const mk = (data: Record<string, string>, throws = false) => ({
    getItem: (k: string) => {
      if (throws) throw new Error('SecurityError')
      return data[k] ?? null
    },
    setItem: (k: string, v: string) => {
      if (throws) throw new Error('SecurityError')
      data[k] = v
    }
  })
  const session = { ...(o.session ?? {}) }
  const w = {
    URL,
    location: { href: o.href ?? 'https://www.joyehuang.me/' },
    localStorage: mk({ ...(o.stored ?? {}) }, o.storageThrows),
    sessionStorage: mk(session),
    matchMedia: (q: string) => ({ matches: !!o.reduce && q.includes('reduce') }),
    navigator: { connection: o.saveData ? { saveData: true } : undefined },
    innerWidth: o.w ?? 1440,
    innerHeight: o.h ?? 900,
    document: {
      visibilityState: o.hidden ? 'hidden' : 'visible',
      documentElement: { setAttribute: (k: string, v: string) => (attrs[k] = v) }
    }
  }
  return { w: w as unknown as Window, attrs, session }
}

const cfg = (review = false) => ({ review, homePaths: ['/', '/en'], keys: KEYS })

describe('head gate', () => {
  it('arms the intro on a first visit to / and /en', () => {
    for (const href of ['https://x.test/', 'https://x.test/en', 'https://x.test/en/']) {
      const { w, attrs } = fakeWindow({ href })
      expect(jojoHeadGate(w, cfg()).intro).toBe('first_visit')
      expect(attrs['data-jojo-intro']).toBe('armed')
    }
  })

  it('stays quiet for returning visitors, other pages, hash links', () => {
    expect(jojoHeadGate(fakeWindow({ stored: { [KEYS.intro]: '1' } }).w, cfg()).reason).toBe('seen')
    expect(jojoHeadGate(fakeWindow({ href: 'https://x.test/blog' }).w, cfg()).reason).toBe('path')
    expect(jojoHeadGate(fakeWindow({ href: 'https://x.test/#blog' }).w, cfg()).reason).toBe('hash')
  })

  it('never plays with reduced motion, Save-Data, hidden tab or no storage', () => {
    expect(jojoHeadGate(fakeWindow({ reduce: true }).w, cfg()).reason).toBe('reduced-motion')
    expect(jojoHeadGate(fakeWindow({ saveData: true }).w, cfg()).reason).toBe('save-data')
    expect(jojoHeadGate(fakeWindow({ hidden: true }).w, cfg()).reason).toBe('hidden')
    const s = fakeWindow({ storageThrows: true })
    expect(jojoHeadGate(s.w, cfg()).reason).toBe('storage')
    expect(s.attrs['data-jojo-intro']).toBeUndefined()
  })

  it('?jojo-intro=play forces a replay for returning visitors, but not past reduced motion', () => {
    const seen = { [KEYS.intro]: '1' }
    expect(
      jojoHeadGate(fakeWindow({ href: 'https://x.test/?jojo-intro=play', stored: seen }).w, cfg())
        .intro
    ).toBe('url')
    expect(
      jojoHeadGate(
        fakeWindow({ href: 'https://x.test/?jojo-intro=play', stored: seen, reduce: true }).w,
        cfg()
      ).intro
    ).toBeNull()
  })

  it('review builds read ?jojo= and keep it for the session; production ignores it', () => {
    const r = fakeWindow({ href: 'https://x.test/?jojo=b' })
    expect(jojoHeadGate(r.w, cfg(true)).mode).toBe('b')
    expect(r.session[KEYS.reviewMode]).toBe('b')
    expect(r.attrs['data-jojo-mode']).toBe('b')
    const next = fakeWindow({ href: 'https://x.test/blog', session: r.session })
    expect(jojoHeadGate(next.w, cfg(true)).mode).toBe('b')
    expect(jojoHeadGate(fakeWindow({ href: 'https://x.test/?jojo=off' }).w, cfg(false)).mode).toBe(
      'abc'
    )
    // modes without the intro never arm it
    expect(
      jojoHeadGate(fakeWindow({ href: 'https://x.test/?jojo=a' }).w, cfg(true)).intro
    ).toBeNull()
  })

  it('skips tiny or very short viewports', () => {
    expect(jojoHeadGate(fakeWindow({ w: 800, h: 420 }).w, cfg()).reason).toBe('viewport')
  })
})

import { describe, expect, it } from 'bun:test'

import type { IntroEventDetail, IntroTrigger } from '../keys'
import { createIntroEntry, LATEST_START_MS } from './entry'

function harness(
  opts: {
    armed?: 'first_visit' | 'url'
    still?: string | null
    stillAfterLoad?: string | null
    loadFails?: boolean
    started?: boolean
    now?: number
    scrollY?: number
    hasIntro?: boolean
  } = {}
) {
  const attrs = new Map<string, string>()
  if (opts.armed) {
    attrs.set('data-jojo-intro', 'armed')
    attrs.set('data-jojo-intro-trigger', opts.armed)
  }
  let still = opts.still ?? null
  const events: IntroEventDetail[] = []
  const runs: IntroTrigger[] = []
  let loads = 0
  let scrolledToTop = 0
  const rafs: Array<() => void> = []
  const entry = createIntroEntry({
    root: {
      getAttribute: (k) => attrs.get(k) ?? null,
      setAttribute: (k, v) => void attrs.set(k, v),
      removeAttribute: (k) => void attrs.delete(k)
    },
    still: () => still,
    hasIntro: () => opts.hasIntro ?? true,
    load: async () => {
      loads++
      if (opts.loadFails) throw new Error('chunk failed')
      if (opts.stillAfterLoad !== undefined) still = opts.stillAfterLoad
      return {
        runIntro: (t) => {
          // mirrors run.ts: it re-checks at the actual start
          if (still) return { started: false, reason: still }
          runs.push(t)
          return { started: opts.started ?? true }
        }
      }
    },
    emit: (d) => events.push(d),
    ready: async () => {},
    now: () => opts.now ?? 500,
    scrollY: () => opts.scrollY ?? 0,
    scrollToTop: () => void scrolledToTop++,
    raf: (cb) => void rafs.push(cb)
  })
  const flushRaf = async () => {
    for (const cb of rafs.splice(0)) cb()
    await new Promise((r) => setTimeout(r, 0))
  }
  return {
    entry,
    attrs,
    events,
    runs,
    flushRaf,
    get loads() {
      return loads
    },
    get scrolledToTop() {
      return scrolledToTop
    }
  }
}

describe('intro entry', () => {
  for (const reason of ['reduced-motion', 'save-data']) {
    for (const armed of ['first_visit', 'url'] as const) {
      it(`${armed} under ${reason}: refused before the chunk loads, page released`, async () => {
        const h = harness({ armed, still: reason })
        await h.entry.boot()
        expect(h.loads).toBe(0)
        expect(h.runs).toEqual([])
        expect(h.attrs.get('data-jojo-intro')).toBe('done')
        expect(h.attrs.has('data-jojo-intro-trigger')).toBe(false)
        expect(h.events).toEqual([{ phase: 'refused', trigger: armed, reason }])
      })
    }

    it(`replay under ${reason}: no scroll, no chunk, no attribute change`, async () => {
      const h = harness({ still: reason })
      h.attrs.set('data-jojo-intro', 'done')
      h.entry.replay()
      await h.flushRaf()
      expect(h.scrolledToTop).toBe(0)
      expect(h.loads).toBe(0)
      expect(h.runs).toEqual([])
      expect(h.attrs.get('data-jojo-intro')).toBe('done')
      expect(h.events).toEqual([{ phase: 'refused', trigger: 'replay', reason }])
    })

    it(`direct play('replay') under ${reason} (review path) also refuses first`, async () => {
      const h = harness({ still: reason })
      await h.entry.play('replay')
      expect(h.loads).toBe(0)
      expect(h.events.map((e) => e.phase)).toEqual(['refused'])
    })
  }

  it('normal replay scrolls to the top, then loads and runs', async () => {
    const h = harness({ scrollY: 300 })
    h.entry.replay()
    expect(h.scrolledToTop).toBe(1)
    expect(h.loads).toBe(0)
    await h.flushRaf()
    expect(h.loads).toBe(1)
    expect(h.runs).toEqual(['replay'])
    expect(h.events).toEqual([])
  })

  it('first visit plays when allowed', async () => {
    const h = harness({ armed: 'first_visit' })
    await h.entry.boot()
    expect(h.runs).toEqual(['first_visit'])
    // run.ts owns the attribute from here
    expect(h.attrs.get('data-jojo-intro')).toBe('armed')
  })

  it('reduced motion turning on while the chunk loads: refused at the real start', async () => {
    const h = harness({ armed: 'first_visit', stillAfterLoad: 'reduced-motion' })
    await h.entry.boot()
    expect(h.loads).toBe(1)
    expect(h.runs).toEqual([])
    expect(h.attrs.get('data-jojo-intro')).toBe('done')
    expect(h.events).toEqual([
      { phase: 'refused', trigger: 'first_visit', reason: 'reduced-motion' }
    ])
  })

  it('late first visit stands down without loading', async () => {
    const h = harness({ armed: 'first_visit', now: LATEST_START_MS + 1 })
    await h.entry.boot()
    expect(h.loads).toBe(0)
    expect(h.attrs.get('data-jojo-intro')).toBe('done')
    expect(h.events).toEqual([{ phase: 'end', outcome: 'abort', trigger: 'first_visit' }])
  })

  it('a failed chunk releases an armed page (with its real trigger) but not a replay', async () => {
    const a = harness({ armed: 'url', loadFails: true })
    await a.entry.boot()
    expect(a.attrs.get('data-jojo-intro')).toBe('done')
    expect(a.events).toEqual([{ phase: 'end', outcome: 'abort', trigger: 'url' }])
    const b = harness({ loadFails: true })
    b.attrs.set('data-jojo-intro', 'done')
    b.entry.replay()
    await b.flushRaf()
    expect(b.events).toEqual([])
    expect(b.attrs.get('data-jojo-intro')).toBe('done')
  })

  it('a run that could not start (layout) releases an armed page', async () => {
    const h = harness({ armed: 'first_visit', started: false })
    await h.entry.boot()
    expect(h.attrs.get('data-jojo-intro')).toBe('done')
    expect(h.events.map((e) => e.phase)).toEqual(['end'])
  })

  it('replay does nothing when the scheme has no intro', async () => {
    const h = harness({ hasIntro: false })
    h.entry.replay()
    await h.flushRaf()
    expect(h.loads).toBe(0)
    expect(h.events).toEqual([])
  })
})

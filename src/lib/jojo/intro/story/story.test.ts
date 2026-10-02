import { describe, expect, it } from 'bun:test'

import type { IntroLayout } from '../motion'
import { bodyOf, type StoryPlan } from './kit'
import { planTour } from './tour'

const geometry = {
  viewBox: { x: 230, y: 228, w: 795, h: 760 },
  pivot: { x: 627.5, y: 958 },
  dot: { cx: 501, cy: 297, r: 53 }
}

/** measured on the Preview home, 1440×900 */
function desktop(): IntroLayout {
  return {
    vw: 1440,
    vh: 900,
    actor: 100,
    geometry,
    seat: { x: 745, y: 180, w: 48, h: 48 },
    keepOut: [{ x: 680, y: 840, w: 80, h: 34 }],
    pieces: {
      header: { x: 197, y: 16, w: 1040, h: 44 },
      avatar: { x: 661, y: 100, w: 112, h: 112 },
      name: { x: 684, y: 240, w: 66, h: 36 },
      chip0: { x: 579, y: 292, w: 171, h: 24 },
      chip1: { x: 778, y: 292, w: 78, h: 24 },
      connect: { x: 649, y: 344, w: 136, h: 38 },
      card: { x: 284, y: 423, w: 867, h: 73 },
      about: { x: 284, y: 536, w: 867, h: 174 },
      product: { x: 284, y: 750, w: 867, h: 147 }
    }
  }
}

/** measured on the Preview home, 390×844 and 375×667 */
function phone(vh: 844 | 667): IntroLayout {
  const dy = vh === 844 ? 0 : 20
  const vw = vh === 844 ? 390 : 375
  return {
    vw,
    vh,
    actor: 80,
    geometry,
    seat: { x: 223, y: 178 + dy, w: 44, h: 44 },
    keepOut: [{ x: vw - 90, y: vh - 60, w: 74, h: 44 }],
    pieces: {
      header: { x: 16, y: 16, w: 358, h: 44 + dy },
      avatar: { x: 139, y: 98 + dy, w: 112, h: 112 },
      name: { x: 162, y: 238 + dy, w: 66, h: 36 },
      chip0: { x: 57, y: 290 + dy, w: 171, h: 24 },
      chip1: { x: 256, y: 290 + dy, w: 78, h: 24 },
      connect: { x: 127, y: 342 + dy, w: 136, h: 38 },
      card: { x: 16, y: 419 + dy, w: 358, h: 120 },
      about: { x: 16, y: 580 + dy, w: 358, h: 294 + dy },
      product: { x: 16, y: 914 + dy, w: 358, h: 203 }
    }
  }
}

const LAYOUTS = () => [desktop(), phone(844), phone(667)]
const PLANNERS = { tour: planTour }

function each(fn: (plan: StoryPlan<unknown>, layout: IntroLayout, zh: boolean) => void) {
  for (const [, plan] of Object.entries(PLANNERS))
    for (const layout of LAYOUTS())
      for (const zh of [true, false]) fn(plan(layout, zh) as StoryPlan<unknown>, layout, zh)
}

describe('story intros', () => {
  it('end with the page restored and Jojo in its seat', () => {
    each((plan, layout) => {
      const f = plan.sample(plan.duration)
      expect(f.veil).toBeCloseTo(0, 3)
      expect(f.night).toBeCloseTo(0, 3)
      for (const id of plan.cast) {
        const p = f.pieces[id]!
        expect(p.opacity).toBeCloseTo(1, 3)
        expect(Math.abs(p.tx) + Math.abs(p.ty) + Math.abs(p.rot)).toBeLessThan(0.01)
        expect(p.scale).toBeCloseTo(1, 3)
      }
      const body = bodyOf(layout)
      expect(f.actor.x).toBeCloseTo(body.seatGround.x, 3)
      expect(f.actor.y).toBeCloseTo(body.seatGround.y, 3)
      expect(f.actor.size).toBe(layout.seat.w)
      expect(f.bubble).toBeNull()
      expect(plan.land).toBeLessThan(plan.duration)
    })
  })

  it('every frame is finite and Jojo stays on screen', () => {
    each((plan, layout) => {
      for (let t = 0; t <= plan.duration; t += 16) {
        const f = plan.sample(t)
        const a = f.actor
        for (const v of [a.x, a.y, a.lift, a.size, a.sx, a.sy, a.rot, f.veil])
          expect(Number.isFinite(v)).toBe(true)
        if (a.grow > 0.5) {
          expect(a.x).toBeGreaterThan(0)
          expect(a.x).toBeLessThan(layout.vw)
          expect(a.y - a.lift).toBeGreaterThan(0)
          expect(a.y).toBeLessThan(layout.vh)
        }
        if (f.bubble) {
          expect(f.bubble.shown).toBeGreaterThanOrEqual(0)
          expect(f.bubble.shown).toBeLessThanOrEqual(Array.from(f.bubble.text).length)
        }
      }
    })
  })

  it('each line is fully typed before it goes', () => {
    each((plan) => {
      let last: { id: number; shown: number; n: number } | null = null
      for (let t = 0; t <= plan.duration; t += 10) {
        const b = plan.sample(t).bubble
        if (last && (!b || b.id !== last.id)) expect(last.shown).toBe(last.n)
        last = b ? { id: b.id, shown: b.shown, n: Array.from(b.text).length } : null
      }
    })
  })

  it('takes as long as the story needs, but not forever', () => {
    each((plan) => {
      expect(plan.duration).toBeGreaterThan(5000)
      expect(plan.duration).toBeLessThan(20000)
    })
  })

  it('tour opens in the dark and tells the whole story before the lights come up', () => {
    for (const layout of LAYOUTS()) {
      const plan = planTour(layout, true)
      expect(plan.sample(0).night).toBe(1)
      const texts = new Set<string>()
      for (let t = 0; t <= plan.duration; t += 50) {
        const b = plan.sample(t).bubble
        if (b) texts.add(b.text)
      }
      expect(texts.size).toBe(7)
      expect([...texts].some((x) => x.includes('墨尔本'))).toBe(true)
      expect([...texts].some((x) => x.includes('AI Agent'))).toBe(true)
      const tags = plan.sample(plan.duration / 2).props.tags.map((g) => g.text)
      expect(tags).toEqual(['Playyy.ai', 'atypica', 'fAIshion.ai', 'AIXCut'])
    }
  })

  it('needs the avatar on screen', () => {
    const l = desktop()
    delete l.pieces.avatar
    expect(() => planTour(l, true)).toThrow()
  })
})

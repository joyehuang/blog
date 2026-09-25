import { describe, expect, it } from 'bun:test'

import {
  actorAt,
  actorPoint,
  DIM,
  GHOST,
  overlapArea,
  pieceAt,
  planIntro,
  sampleIntro,
  visibleFraction,
  type IntroLayout,
  type IntroPlan,
  type PieceId,
  type Rect
} from './timeline'

const geometry = {
  viewBox: { x: 230, y: 228, w: 795, h: 760 },
  pivot: { x: 627.5, y: 958 },
  dot: { cx: 501, cy: 297, r: 53 }
}

function desktop(): IntroLayout {
  return {
    vw: 1440,
    vh: 900,
    actor: 100,
    geometry,
    seat: { x: 764, y: 196, w: 48, h: 48 },
    pieces: {
      header: { x: 160, y: 16, w: 1120, h: 56 },
      avatar: { x: 664, y: 120, w: 112, h: 112 },
      name: { x: 670, y: 260, w: 100, h: 36 },
      chip0: { x: 600, y: 312, w: 171, h: 24 },
      chip1: { x: 800, y: 312, w: 78, h: 24 },
      connect: { x: 650, y: 368, w: 140, h: 40 },
      card: { x: 250, y: 470, w: 940, h: 360 }
    }
  }
}

/** measured on the Preview home, 1440×900 */
function desktopFull(): IntroLayout {
  return {
    vw: 1440,
    vh: 900,
    actor: 100,
    geometry,
    seat: { x: 745, y: 180, w: 48, h: 48 },
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
function phoneReal(vh: 844 | 667): IntroLayout {
  const dy = vh === 844 ? 0 : 20
  return {
    vw: vh === 844 ? 390 : 375,
    vh,
    actor: 80,
    geometry,
    seat: { x: 223, y: 178 + dy, w: 44, h: 44 },
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

function phone(): IntroLayout {
  return {
    vw: 390,
    vh: 844,
    actor: 80,
    geometry,
    seat: { x: 216, y: 186, w: 44, h: 44 },
    pieces: {
      header: { x: 16, y: 16, w: 358, h: 44 },
      avatar: { x: 139, y: 110, w: 112, h: 112 },
      name: { x: 150, y: 250, w: 90, h: 36 },
      chip0: { x: 90, y: 300, w: 120, h: 28 },
      chip1: { x: 220, y: 300, w: 80, h: 28 },
      connect: { x: 125, y: 350, w: 140, h: 40 },
      // mostly below the fold → not cast
      card: { x: 16, y: 700, w: 358, h: 520 }
    }
  }
}

const ALL = () => [desktop(), phone(), desktopFull(), phoneReal(844), phoneReal(667)]
const every = (plan: IntroPlan, step = 5) => {
  const out: number[] = []
  for (let t = 0; t <= plan.duration; t += step) out.push(t)
  return out
}

describe('planIntro', () => {
  it('fits a 2.5–4.5 s budget: time comes from actions, fewer pieces → shorter', () => {
    const d = planIntro(desktopFull())
    const p = planIntro(phoneReal(844))
    const s = planIntro(phoneReal(667))
    for (const plan of [d, p, s, planIntro(desktop()), planIntro(phone())]) {
      expect(plan.duration).toBeGreaterThanOrEqual(2500)
      expect(plan.duration).toBeLessThanOrEqual(4500)
    }
    expect(d.duration).toBeGreaterThan(p.duration)
    expect(p.duration).toBeGreaterThan(s.duration)
  })

  it('requires the avatar to be on screen', () => {
    const l = desktop()
    l.pieces.avatar = { x: 664, y: -400, w: 112, h: 112 }
    expect(() => planIntro(l)).toThrow()
  })

  it('casts only pieces that are mostly visible', () => {
    expect(visibleFraction({ x: 0, y: 800, w: 100, h: 200 }, 390, 844)).toBeCloseTo(0.22, 2)
    expect(visibleFraction({ x: -50, y: 0, w: 100, h: 100 }, 390, 844)).toBe(0.5)
    expect(planIntro(desktopFull()).cast).toEqual([
      'header',
      'avatar',
      'name',
      'chip0',
      'chip1',
      'connect',
      'card',
      'about',
      'product'
    ])
    // 390×844: About is ~90 % visible, Product is below the fold
    const p844 = planIntro(phoneReal(844)).cast
    expect(p844).toContain('about')
    expect(p844).not.toContain('product')
    // 375×667: About is ~20 % visible → left alone
    const p667 = planIntro(phoneReal(667)).cast
    expect(p667).not.toContain('about')
    expect(p667).toContain('connect')
    expect(planIntro(phone()).cast).not.toContain('card')
  })
})

describe('hand-over: starts and ends exactly on the real page', () => {
  it('frame 0 is the real page, untouched; Jojo not yet grown', () => {
    for (const layout of ALL()) {
      const plan = planIntro(layout)
      const f = sampleIntro(plan, 0)
      for (const p of Object.values(f.pieces)) {
        expect(p.tx).toBe(0)
        expect(p.ty).toBe(0)
        expect(p.opacity).toBe(1)
        expect(p.clip).toBeNull()
        expect(p.ghost).toBe(0)
      }
      expect(f.actor.grow).toBe(0)
      expect(f.spawnDot).not.toBeNull()
    }
  })

  it('ends with every piece home, whole, unclipped, no blueprint; Jojo seated, happy', () => {
    for (const layout of ALL()) {
      const plan = planIntro(layout)
      const f = sampleIntro(plan, plan.duration)
      for (const p of Object.values(f.pieces)) {
        expect(Math.abs(p.tx)).toBeLessThan(0.5)
        expect(Math.abs(p.ty)).toBeLessThan(0.5)
        expect(Math.abs(p.rot)).toBeLessThan(0.5)
        expect(p.scale).toBeCloseTo(1, 3)
        expect(p.opacity).toBe(1)
        expect(p.clip).toBeNull()
        expect(p.ghost).toBe(0)
      }
      expect(f.actor.size).toBe(layout.seat.w)
      expect(f.actor.lift).toBe(0)
      expect(f.actor.emotion).toBe('happy')
      expect(f.tether).toBeNull()
      // the actor's SVG box lands on the seat's SVG box
      const g = layout.geometry
      const k = layout.seat.w / g.viewBox.w
      expect(f.actor.x - (g.pivot.x - g.viewBox.x) * k).toBeCloseTo(layout.seat.x, 5)
      expect(f.actor.y - (g.pivot.y - g.viewBox.y) * k).toBeCloseTo(layout.seat.y, 5)
    }
  })
})

describe('user feedback r3: readable, never broken apart, one focus', () => {
  it('nothing is squashed, stretched or spun: only uniform scale ≥ 0.9 and small tilts', () => {
    for (const layout of ALL()) {
      const plan = planIntro(layout)
      for (const t of every(plan)) {
        for (const p of Object.values(sampleIntro(plan, t).pieces)) {
          expect(p).not.toHaveProperty('sy')
          expect(p.scale).toBeGreaterThanOrEqual(0.9)
          expect(p.scale).toBeLessThanOrEqual(1.08)
          expect(Math.abs(p.rot)).toBeLessThanOrEqual(16)
        }
      }
    }
  })

  it('the page dims to a blueprint in place instead of flying apart', () => {
    const plan = planIntro(desktopFull())
    const f = sampleIntro(plan, DIM[1] + 1)
    for (const id of plan.cast) {
      const p = f.pieces[id]!
      expect(p.opacity).toBe(0)
      expect(p.ghost).toBe(GHOST)
      expect(p.tx).toBe(0)
      expect(p.ty).toBe(0)
    }
    // halfway through the dim both copies are in place, nothing moved
    const mid = sampleIntro(plan, DIM[1] / 2).pieces.about!
    expect(mid.opacity).toBeGreaterThan(0)
    expect(mid.ghost).toBeGreaterThan(0)
  })

  it('every piece always shows at home (solid or blueprint) unless it is travelling in', () => {
    for (const layout of ALL()) {
      const plan = planIntro(layout)
      for (const t of every(plan, 10)) {
        const f = sampleIntro(plan, t)
        for (const id of plan.cast) {
          const p = f.pieces[id]!
          const travelling = Math.abs(p.ty) > 0.5 || !!p.clip
          if (!travelling) expect(p.opacity + p.ghost).toBeGreaterThan(0.14)
        }
      }
    }
  })

  it('Jojo is the one big thing to watch: drawn near the avatar size until it heads home', () => {
    for (const layout of ALL()) {
      const plan = planIntro(layout)
      for (const t of every(plan, 20)) {
        if (t < 330 || t >= plan.beats.leap) continue
        expect(actorAt(plan, t).size).toBe(layout.actor)
      }
      expect(layout.actor).toBeGreaterThanOrEqual(layout.pieces.avatar!.w * 0.7)
    }
  })

  it('the only tether is a short pull on the header, never a line across the screen', () => {
    for (const layout of ALL()) {
      const plan = planIntro(layout)
      for (const t of every(plan, 4)) {
        const tt = sampleIntro(plan, t).tether
        if (!tt) continue
        expect(t).toBeGreaterThanOrEqual(plan.beats.header!.out)
        expect(t).toBeLessThan(plan.beats.header!.home)
        expect(Math.hypot(tt.to.x - tt.from.x, tt.to.y - tt.from.y)).toBeLessThan(layout.vh * 0.4)
        // straight up
        expect(Math.abs(tt.to.x - tt.from.x)).toBeLessThan(1)
      }
    }
  })

  it("never produces NaN and keeps Jojo's squash in a gentle range", () => {
    for (const layout of ALL()) {
      const plan = planIntro(layout)
      for (const t of every(plan, 4)) {
        const a = sampleIntro(plan, t).actor
        for (const n of [a.x, a.y, a.lift, a.sx, a.sy, a.rot, a.size])
          expect(Number.isFinite(n)).toBe(true)
        expect(a.sx).toBeGreaterThanOrEqual(0.8)
        expect(a.sy).toBeGreaterThanOrEqual(0.8)
        expect(a.sx).toBeLessThanOrEqual(1.24)
        expect(a.sy).toBeLessThanOrEqual(1.24)
      }
    }
  })

  it('Jojo never leaves the viewport', () => {
    for (const layout of ALL()) {
      const plan = planIntro(layout)
      for (const t of every(plan, 10)) {
        const a = actorAt(plan, t)
        expect(a.x).toBeGreaterThanOrEqual(0)
        expect(a.x).toBeLessThanOrEqual(layout.vw)
        expect(a.y).toBeLessThanOrEqual(layout.vh)
        expect(a.y - a.lift - a.size).toBeGreaterThan(-a.size * 0.5)
      }
    }
  })
})

describe('every piece arrives by something Jojo does', () => {
  const plan = planIntro(desktopFull())
  const b = plan.beats
  const L = plan.layout

  it('header: waits as a blueprint, is pulled down while the tether holds it, lands', () => {
    const h = b.header!
    expect(pieceAt(plan, 'header', h.pull - 1)).toMatchObject({ opacity: 0, ghost: GHOST })
    const f = sampleIntro(plan, (h.pull + h.land) / 2)
    expect(f.tether).not.toBeNull()
    expect(f.actor.dotOut).toBe(true)
    const p = f.pieces.header!
    expect(p.ty).toBeLessThan(-5)
    expect(p.opacity).toBe(1)
    // the dot holds the header's bottom edge
    expect(f.tether!.to.y).toBeCloseTo(L.pieces.header!.y + L.pieces.header!.h + p.ty - 3, 5)
    // starts at the signal dot
    const home = actorPoint(plan, f.actor, geometry.dot.cx, geometry.dot.cy)
    expect(f.tether!.from.x).toBeCloseTo(home.x, 6)
    expect(pieceAt(plan, 'header', h.land + 200).ty).toBeCloseTo(0, 6)
  })

  it("avatar: knocked loose by the header landing, drops onto Jojo's head, tossed, settles", () => {
    const a = b.avatar
    expect(a.fall).toBeGreaterThanOrEqual(b.header!.land)
    // hidden behind the header as it starts to fall
    const start = pieceAt(plan, 'avatar', a.fall + 1)
    expect(start.clip!.t).toBeGreaterThan(L.pieces.avatar!.h * 0.9)
    // on contact its bottom touches the top of Jojo's head
    const at = pieceAt(plan, 'avatar', a.contact + 50)
    const actor = actorAt(plan, a.contact + 50)
    const head = actor.y - plan.headH * actor.sy
    const bottom = L.pieces.avatar!.y + L.pieces.avatar!.h + at.ty
    expect(Math.abs(head - bottom)).toBeLessThan(1)
    expect(actor.sy).toBeLessThan(0.95)
    // tossed up, then home
    expect(pieceAt(plan, 'avatar', (a.toss + a.settle) / 2).ty).toBeLessThan(-10)
    expect(pieceAt(plan, 'avatar', a.settle + 400).ty).toBeCloseTo(0, 6)
  })

  it('name, chips, Connect: pop up after the stomp, nearest first', () => {
    const order = (['name', 'chip0', 'chip1', 'connect'] as PieceId[]).map((id) => plan.pop[id]!)
    for (const t0 of order) expect(t0).toBeGreaterThan(b.stomp!)
    expect(plan.pop.connect!).toBeLessThan(plan.pop.name!)
    for (const id of ['name', 'connect'] as PieceId[]) {
      expect(pieceAt(plan, id, plan.pop[id]! - 1).opacity).toBe(0)
      expect(pieceAt(plan, id, plan.pop[id]! + 200).opacity).toBe(1)
    }
    // Jojo stands clear of them when it stomps
    const a = actorAt(plan, b.stomp! + 1)
    for (const id of ['name', 'chip0', 'chip1', 'connect'] as PieceId[])
      expect(a.x + plan.S * 0.45).toBeLessThanOrEqual(L.pieces[id]!.x + 1)
  })

  it("card: laid out to the right from under Jojo's feet after the shove", () => {
    const c = b.card!
    const K = L.pieces.card!
    const a = actorAt(plan, c.shove)
    expect(Math.abs(a.y - K.y)).toBeLessThan(1)
    expect(a.x).toBeLessThan(K.x + plan.S)
    expect(pieceAt(plan, 'card', c.shove - 1).opacity).toBe(0)
    const early = pieceAt(plan, 'card', c.shove + 30).clip!
    const late = pieceAt(plan, 'card', c.shove + 200).clip!
    expect(late.r).toBeLessThan(early.r)
    expect(early.l).toBeLessThan(0)
    // the blueprint shows only where the card is not laid yet
    expect(pieceAt(plan, 'card', c.shove + 200).ghostClip!.l).toBeCloseTo(K.w - late.r, 6)
    expect(pieceAt(plan, 'card', c.done).clip).toBeNull()
  })

  it("About: revealed down to Jojo's feet as it slides down the left edge", () => {
    const ab = b.about!
    const B = L.pieces.about!
    for (const t of [ab.slide0 + 50, (ab.slide0 + ab.slide1) / 2, ab.slide1 - 30]) {
      const feet = actorAt(plan, t).y
      const clip = pieceAt(plan, 'about', t).clip!
      expect(B.h - clip.b).toBeCloseTo(Math.min(B.h, Math.max(0, feet - B.y)), 5)
    }
  })

  it("Product: rises from below the fold after the stomp and stops under Jojo's feet", () => {
    const p = b.product!
    const P = L.pieces.product!
    expect(p.stomp).toBeGreaterThanOrEqual(b.about!.slide1)
    const start = pieceAt(plan, 'product', p.rise0 + 1)
    expect(P.y + start.ty).toBeGreaterThan(L.vh)
    expect(Math.abs(actorAt(plan, p.stomp).y - P.y)).toBeLessThan(1)
    expect(pieceAt(plan, 'product', p.rise1).ty).toBeCloseTo(0, 6)
  })
})

/* ------------------------------------------------ r3: phone keep-out */

/**
 * The Skip button where JojoIntro.astro puts it, measured on the Preview:
 * bottom-right corner on phones, bottom centre on desktop.
 */
const SKIP = {
  390: { x: 301.5, y: 784, w: 72.5, h: 44 },
  375: { x: 286.5, y: 607, w: 72.5, h: 44 },
  1440: { x: 682.8, y: 845.2, w: 68.5, h: 34.8 }
}
const withSkip = (l: IntroLayout, r: Rect): IntroLayout => ({ ...l, keepOut: [r] })
const PHONES = () => [withSkip(phoneReal(844), SKIP[390]), withSkip(phoneReal(667), SKIP[375])]
const SKIPPED = () => [...PHONES(), withSkip(desktopFull(), SKIP[1440])]

/** the actor's drawn SVG box at t, with every pose (scale, squash, tilt, size) applied */
function drawnBox(plan: IntroPlan, t: number): Rect {
  const a = actorAt(plan, t)
  const vb = plan.layout.geometry.viewBox
  const ps = [
    [vb.x, vb.y],
    [vb.x + vb.w, vb.y],
    [vb.x, vb.y + vb.h],
    [vb.x + vb.w, vb.y + vb.h]
  ].map(([x, y]) => actorPoint(plan, a, x, y))
  const xs = ps.map((p) => p.x)
  const ys = ps.map((p) => p.y)
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y }
}

/** when a piece is finished (built and meant to be read) */
function builtAt(plan: IntroPlan, id: PieceId): number | undefined {
  const b = plan.beats
  if (id === 'header') return b.header?.land
  if (id === 'avatar') return b.avatar.settle
  if (id === 'card') return b.card?.done
  if (id === 'about') return b.about?.done
  if (id === 'product') return b.product?.rise1
  const p = plan.pop[id]
  return p === undefined ? undefined : p + 320
}

/** is Jojo in the air (a hop or the leap), rather than standing or sliding? */
const flying = (plan: IntroPlan, t: number) =>
  plan.moves.some((m) => m.h > 0 && t >= m.t0 && t < m.t1 + 140)

/** longest unbroken stretch (ms) in which `hit(t)` holds, sampled every `step` ms */
function longestRun(
  plan: IntroPlan,
  from: number,
  to: number,
  hit: (t: number) => boolean,
  step = 5
) {
  let run = 0
  let best = 0
  for (let t = from; t <= to; t += step) {
    run = hit(t) ? run + step : 0
    best = Math.max(best, run)
  }
  return best
}

describe('r3 review: phones — Skip keep-out and readable finished labels', () => {
  it('Jojo never enters the Skip button, at any moment of the run', () => {
    for (const layout of SKIPPED()) {
      const plan = planIntro(layout)
      const skip = layout.keepOut![0]
      for (let t = 0; t <= plan.duration; t += 2)
        expect(overlapArea(drawnBox(plan, t), skip, 4)).toBe(0)
    }
  })

  it("the keep-out is real: a Skip on Jojo's own lane is routed round, not just missed", () => {
    // bottom-left on 390×844: exactly where the About slide would end
    const inLane = { x: 16, y: 788, w: 76, h: 44 }
    const free = planIntro(phoneReal(844))
    expect(every(free, 2).some((t) => overlapArea(drawnBox(free, t), inLane, 4) > 0)).toBe(true)
    const kept = planIntro(withSkip(phoneReal(844), inLane))
    for (let t = 0; t <= kept.duration; t += 2)
      expect(overlapArea(drawnBox(kept, t), inLane, 4)).toBe(0)
  })

  it('a finished label is never under Jojo while it stands, stomps or slides; flights pass by fast', () => {
    for (const layout of PHONES()) {
      const plan = planIntro(layout)
      for (const id of ['name', 'chip0', 'chip1', 'connect'] as const) {
        const done = builtAt(plan, id)
        if (done === undefined) continue
        const r = layout.pieces[id]!
        const covered = (t: number) => overlapArea(drawnBox(plan, t), r) > 0
        for (let t = done; t < plan.beats.land; t += 2)
          if (!flying(plan, t)) expect(covered(t)).toBe(false)
        // passing over in a hop / the leap home: brief contact only
        expect(longestRun(plan, done, plan.beats.land, covered)).toBeLessThanOrEqual(150)
      }
    }
  })

  it('labels stomp: phones stand below the chips, left of Connect — not on "Melbourne"', () => {
    for (const layout of PHONES()) {
      const plan = planIntro(layout)
      const at = actorAt(plan, plan.beats.stomp!)
      const box = drawnBox(plan, plan.beats.stomp!)
      const { chip0, connect, card } = layout.pieces
      expect(overlapArea(box, chip0!)).toBe(0)
      expect(overlapArea(box, connect!)).toBe(0)
      expect(box.y).toBeGreaterThanOrEqual(chip0!.y + chip0!.h)
      expect(box.x + box.w).toBeLessThanOrEqual(connect!.x)
      // on the page, in the gap above the terminal card, still full size
      expect(at.y).toBeLessThanOrEqual(card!.y)
      expect(at.size).toBe(80)
    }
  })

  it('About on a phone: Jojo hangs under the reveal edge — revealed text is above it, not under it', () => {
    const layout = PHONES()[0]
    const plan = planIntro(layout)
    const ab = plan.beats.about!
    expect(ab.hang).toBe(true)
    const B = layout.pieces.about!
    for (let t = ab.slide0; t < ab.done; t += 2) {
      const clip = pieceAt(plan, 'about', t).clip!
      const revealed = { x: B.x, y: B.y, w: B.w, h: B.h - clip.b }
      const box = drawnBox(plan, t)
      // head touching the edge it pulls down (contact), never the text above it
      const into = Math.max(0, revealed.y + revealed.h - box.y)
      if (overlapArea(box, revealed) > 0) expect(into).toBeLessThanOrEqual(10)
    }
    // the rest of the blind drops as Jojo lets go and leaps off
    expect(ab.done).toBe(plan.beats.leap)
    const covered = (t: number) => overlapArea(drawnBox(plan, t), { ...B, h: layout.vh - B.y }) > 0
    expect(longestRun(plan, ab.done, plan.beats.land, covered)).toBeLessThanOrEqual(250)
  })

  it('no finished piece is covered for long: any contact is a pass, not a press', () => {
    for (const layout of PHONES()) {
      const plan = planIntro(layout)
      for (const id of plan.cast) {
        const done = builtAt(plan, id)
        if (done === undefined || id === 'avatar' || id === 'header') continue
        const r = layout.pieces[id]!
        const vis = { ...r, h: Math.min(r.h, layout.vh - r.y) }
        const covered = (t: number) => overlapArea(drawnBox(plan, t), vis) > 0
        expect(longestRun(plan, done, plan.beats.land, covered)).toBeLessThanOrEqual(250)
      }
    }
  })

  it('desktop keeps its approved route: a Skip that is out of the way changes nothing', () => {
    const a = planIntro(desktopFull())
    const b = planIntro(withSkip(desktopFull(), SKIP[1440]))
    expect(b.duration).toBe(a.duration)
    expect(b.moves.map((m) => [m.t0, m.t1, m.to])).toEqual(a.moves.map((m) => [m.t0, m.t1, m.to]))
    expect(b.beats.about!.hang).toBe(false)
  })
})

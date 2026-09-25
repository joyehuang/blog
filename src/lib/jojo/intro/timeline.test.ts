import { describe, expect, it } from 'bun:test'

import {
  actorAt,
  actorPoint,
  jobTarget,
  pieceAt,
  planIntro,
  sampleIntro,
  visibleFraction,
  type IntroLayout
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
    actor: 76,
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
    actor: 76,
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
    actor: 60,
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
    actor: 60,
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

describe('planIntro', () => {
  it('fits the 2–4 s budget with and without the card beat', () => {
    const d = planIntro(desktop())
    const p = planIntro(phone())
    expect(d.cast).toContain('card')
    expect(p.cast).not.toContain('card')
    for (const plan of [d, p]) {
      expect(plan.duration).toBeGreaterThanOrEqual(2000)
      expect(plan.duration).toBeLessThanOrEqual(4000)
    }
    expect(d.duration).toBeGreaterThan(p.duration)
  })

  it('requires the avatar to be on screen', () => {
    const l = desktop()
    l.pieces.avatar = { x: 664, y: -400, w: 112, h: 112 }
    expect(() => planIntro(l)).toThrow()
  })

  it('casts only pieces that are mostly visible', () => {
    expect(visibleFraction({ x: 0, y: 800, w: 100, h: 200 }, 390, 844)).toBeCloseTo(0.22, 2)
    expect(visibleFraction({ x: -50, y: 0, w: 100, h: 100 }, 390, 844)).toBe(0.5)
  })
})

describe('sampleIntro', () => {
  it('starts on the real page: every piece at rest and Jojo not yet grown', () => {
    const plan = planIntro(desktop())
    const f = sampleIntro(plan, 0)
    for (const p of Object.values(f.pieces))
      expect(p).toEqual({ tx: 0, ty: 0, rot: 0, scale: 1, sy: 1, opacity: 1 })
    expect(f.actor.grow).toBe(0)
    expect(f.spawnDot).not.toBeNull()
  })

  it('ends exactly on the real page, with Jojo seated at seat size, happy', () => {
    for (const layout of [desktop(), phone(), desktopFull(), phoneReal(844), phoneReal(667)]) {
      const plan = planIntro(layout)
      const f = sampleIntro(plan, plan.duration)
      for (const p of Object.values(f.pieces)) {
        expect(Math.abs(p.tx)).toBeLessThan(0.5)
        expect(Math.abs(p.ty)).toBeLessThan(0.5)
        expect(Math.abs(p.rot % 360)).toBeLessThan(1)
        expect(p.opacity).toBeCloseTo(1, 3)
        expect(p.scale).toBeCloseTo(1, 2)
        expect(p.sy).toBeCloseTo(1, 2)
      }
      expect(f.actor.size).toBe(layout.seat.w)
      expect(f.actor.lift).toBe(0)
      expect(f.actor.emotion).toBe('happy')
      expect(f.tether).toBeNull()
      // the actor's SVG box lands on the seat's SVG box
      const g = layout.geometry
      const k = layout.seat.w / g.viewBox.w
      const left = f.actor.x - (g.pivot.x - g.viewBox.x) * k
      const top = f.actor.y - (g.pivot.y - g.viewBox.y) * k
      expect(left).toBeCloseTo(layout.seat.x, 5)
      expect(top).toBeCloseTo(layout.seat.y, 5)
    }
  })

  it('actually scatters and rebuilds (not a fade): pieces leave and come back', () => {
    const plan = planIntro(desktop())
    const mid = sampleIntro(plan, 500)
    expect(mid.pieces.header!.ty).toBeLessThan(-50)
    expect(mid.pieces.avatar!.tx).toBeLessThan(-200)
    expect(mid.pieces.card!.tx).toBeGreaterThan(100)
    // knocked flat, not faded
    expect(mid.pieces.name!.sy).toBeLessThan(0.2)
    expect(mid.pieces.name!.opacity).toBe(1)
    // the header comes back while the tether holds it
    const b = plan.beats
    const pulling = sampleIntro(plan, b.header! + 250)
    expect(pulling.tether).not.toBeNull()
    expect(pulling.actor.dotOut).toBe(true)
    expect(pulling.pieces.header!.ty).toBeGreaterThan(mid.pieces.header!.ty)
    // the avatar rolls: rotation follows distance
    const rolling = pieceAt(plan, 'avatar', b.avatarIn + 200)
    expect(rolling.rot).toBeCloseTo((rolling.tx / plan.radius) * (180 / Math.PI), 6)
    // Jojo is behind the avatar while pushing it
    const a = actorAt(plan, b.avatarIn + 200)
    expect(a.x).toBeLessThan(plan.spawn.x + rolling.tx)
    // the card is yanked back on the tether
    expect(sampleIntro(plan, b.card! + 200).tether).not.toBeNull()
  })

  it('never produces NaN and keeps squash in range across the whole run', () => {
    for (const layout of [desktop(), phone(), desktopFull(), phoneReal(844), phoneReal(667)]) {
      const plan = planIntro(layout)
      for (let t = 0; t <= plan.duration; t += 8) {
        const f = sampleIntro(plan, t)
        const nums = [
          f.actor.x,
          f.actor.y,
          f.actor.lift,
          f.actor.sx,
          f.actor.sy,
          f.actor.rot,
          f.actor.size
        ]
        for (const n of nums) expect(Number.isFinite(n)).toBe(true)
        expect(f.actor.sx).toBeGreaterThanOrEqual(0.7)
        expect(f.actor.sy).toBeLessThanOrEqual(1.3)
      }
    }
  })

  it('the tether starts at the signal dot', () => {
    const plan = planIntro(desktop())
    const t = plan.beats.header! + 60
    const f = sampleIntro(plan, t)
    const home = actorPoint(plan, f.actor, geometry.dot.cx, geometry.dot.cy)
    expect(f.tether!.from.x).toBeCloseTo(home.x, 6)
    expect(f.tether!.from.y).toBeCloseTo(home.y, 6)
  })
})

describe('the whole first screen is built, by cause (user feedback r2)', () => {
  it('casts what is really on screen: more on desktop, only visible blocks on phones', () => {
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
    expect(p667).not.toContain('product')
    expect(p667).toContain('connect')
  })

  it('stays in the 2–4 s budget with the full cast (more actions, not more waiting)', () => {
    for (const layout of [desktopFull(), phoneReal(844), phoneReal(667)]) {
      const plan = planIntro(layout)
      expect(plan.duration).toBeGreaterThanOrEqual(2000)
      expect(plan.duration).toBeLessThanOrEqual(4000)
    }
  })

  it('the pop knocks the screen apart as a wave: nearer pieces go first', () => {
    const plan = planIntro(desktopFull())
    expect(plan.knock.product!).toBeGreaterThan(plan.knock.card!)
    expect(plan.knock.card!).toBeGreaterThan(plan.knock.name!)
  })

  it('the stomp ring springs the name and each chip up as it reaches them', () => {
    const plan = planIntro(desktopFull())
    for (const id of ['name', 'chip0', 'chip1'] as const) {
      const at = plan.spring[id]!
      expect(at).toBeGreaterThanOrEqual(plan.beats.stomp)
      // flat until the ring gets there, standing (overshooting) right after
      expect(pieceAt(plan, id, at - 1).sy).toBeLessThan(0.15)
      expect(pieceAt(plan, id, at + 200).sy).toBeGreaterThan(0.9)
      // the ring is at the piece when it springs
      const r = sampleIntro(plan, at).ripple!
      const box = plan.layout.pieces[id]!
      const d = Math.hypot(box.x + box.w / 2 - plan.pushX, box.y + box.h / 2 - plan.ground)
      expect(Math.abs(r.r - d)).toBeLessThan(12)
    }
    // flattened pieces stay on their baseline (pinned at the bottom edge)
    const flat = pieceAt(plan, 'name', plan.spring.name! - 1)
    const h = plan.layout.pieces.name!.h
    expect(flat.ty).toBeCloseTo(((1 - flat.sy) * h) / 2, 6)
  })

  it('one tether run brings Connect, card, About and Product back, each while held', () => {
    const plan = planIntro(desktopFull())
    expect(plan.jobs.map((j) => j.id)).toEqual(['connect', 'card', 'about', 'product'])
    for (const j of plan.jobs) {
      const before = pieceAt(plan, j.id, j.act[0] - 1)
      const after = pieceAt(plan, j.id, plan.duration)
      // really away before the dot gets there, home at the end
      const away =
        before.opacity < 0.1 ||
        before.sy < 0.2 ||
        Math.abs(before.tx) > 100 ||
        Math.abs(before.ty) > 10
      expect(away).toBe(true)
      expect(after.tx).toBeCloseTo(0, 1)
      // while it comes back the dot is out and attached to it
      const mid = (j.act[0] + j.act[1]) / 2
      const f = sampleIntro(plan, mid)
      expect(f.actor.dotOut).toBe(true)
      const tg = jobTarget(plan, j, mid)
      expect(f.tether!.to.x).toBeCloseTo(tg.x, 6)
      expect(f.tether!.to.y).toBeCloseTo(tg.y, 6)
    }
    // About opens by its bottom edge: the top edge never moves
    const about = plan.jobs.find((j) => j.id === 'about')!
    for (const t of [about.act[0], about.act[0] + 100, about.act[1]]) {
      const p = pieceAt(plan, 'about', t)
      expect(p.ty - ((1 - p.sy) * -1 * plan.layout.pieces.about!.h) / 2).toBeCloseTo(0, 6)
    }
  })

  it('the tether run never teleports between pieces and stays in the viewport', () => {
    for (const layout of [desktopFull(), phoneReal(844), phoneReal(667)]) {
      const plan = planIntro(layout)
      // (the header throw before it reaches above the top edge on purpose)
      for (let t = plan.jobs[0].fly[0]; t < plan.retract![1]; t += 2) {
        const to = sampleIntro(plan, t).tether!.to
        expect(to.x).toBeGreaterThanOrEqual(0)
        expect(to.x).toBeLessThanOrEqual(layout.vw)
        expect(to.y).toBeGreaterThanOrEqual(0)
        expect(to.y).toBeLessThanOrEqual(layout.vh)
      }
      // continuous across every hand-off: fly → hold → next fly → … → home
      const cuts = [...plan.jobs.flatMap((j) => [j.act[0], j.act[1]]), plan.retract![0]]
      for (const c of cuts) {
        const a = sampleIntro(plan, c - 0.01).tether!.to
        const b = sampleIntro(plan, c + 0.01).tether!.to
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThan(2)
      }
    }
  })
})

import { describe, expect, it } from 'bun:test'

import {
  actorAt,
  actorPoint,
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
      labels: { x: 600, y: 312, w: 240, h: 28 },
      connect: { x: 650, y: 368, w: 140, h: 40 },
      card: { x: 250, y: 470, w: 940, h: 360 }
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
      labels: { x: 90, y: 300, w: 210, h: 28 },
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
      expect(p).toEqual({ tx: 0, ty: 0, rot: 0, scale: 1, opacity: 1 })
    expect(f.actor.grow).toBe(0)
    expect(f.spawnDot).not.toBeNull()
  })

  it('ends exactly on the real page, with Jojo seated at seat size, happy', () => {
    for (const layout of [desktop(), phone()]) {
      const plan = planIntro(layout)
      const f = sampleIntro(plan, plan.duration)
      for (const p of Object.values(f.pieces)) {
        expect(Math.abs(p.tx)).toBeLessThan(0.5)
        expect(Math.abs(p.ty)).toBeLessThan(0.5)
        expect(Math.abs(p.rot % 360)).toBeLessThan(1)
        expect(p.opacity).toBeCloseTo(1, 3)
        expect(p.scale).toBeCloseTo(1, 2)
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
    expect(mid.pieces.name!.opacity).toBeLessThan(0.2)
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
    for (const layout of [desktop(), phone()]) {
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

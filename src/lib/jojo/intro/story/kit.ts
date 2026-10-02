import type { EmotionId } from '@jojo-web/runtime'

import {
  E,
  hopLift,
  lerp,
  pulse,
  seg,
  visibleFraction,
  type ActorState,
  type IntroLayout,
  type Move,
  type PieceId,
  type Rect
} from '../motion'

/**
 * Shared, frame-pure pieces of the intro. A
 * story is a plan whose `sample(t)` returns everything on screen at `t` ms:
 * Jojo, the veil over the page, the copies of the pieces it "lights", the
 * speech bubble and the story's own props. Like the build intro, the real page
 * never moves: the runner (./run.ts) draws copies and hides the originals.
 */

export interface Point {
  x: number
  y: number
}

/** a piece's copy: rigid moves only (no stretching) */
export interface PieceLook {
  opacity: number
  tx: number
  ty: number
  rot: number
  scale: number
}
export const AT_REST: Readonly<PieceLook> = { opacity: 1, tx: 0, ty: 0, rot: 0, scale: 1 }
export const UNLIT: Readonly<PieceLook> = { opacity: 0, tx: 0, ty: 0, rot: 0, scale: 1 }

/**
 * A speech bubble. The runner puts it on the side of Jojo (above, right, left
 * or below) that covers least of `avoid`, clamped into the viewport.
 */
export interface BubbleState {
  /** which line (changes → the runner re-lays out and re-places it) */
  id: number
  text: string
  /** characters typed so far */
  shown: number
  /** Jojo's drawn box right now */
  actor: Rect
  /** pieces that are (or will be, during this line) lit: keep them readable */
  avoid: PieceId[]
  opacity: number
}

export interface StoryFrame<P> {
  t: number
  actor: ActorState
  /** the dot that pops first, before the body unfolds */
  spawnDot: { x: number; y: number; r: number } | null
  /** 0 = page fully visible, 1 = covered by the page's own colour */
  veil: number
  /** the night over everything but Jojo and its props (0 = none) */
  night: number
  pieces: Partial<Record<PieceId, PieceLook>>
  bubble: BubbleState | null
  props: P
}

export interface StoryPlan<P> {
  duration: number
  /** pieces drawn as copies (their originals are hidden while the story runs) */
  cast: PieceId[]
  /** Jojo sits down in the seat */
  land: number
  sample(t: number): StoryFrame<P>
}

/* ---------------------------------------------------------------- layout */

/** a piece takes part when at least this much of it is on screen */
const CAST_MIN = 0.35

export function castOf(layout: IntroLayout, ids: readonly PieceId[]): PieceId[] {
  return ids.filter((id) => {
    const r = layout.pieces[id]
    return !!r && visibleFraction(r, layout.vw, layout.vh) >= CAST_MIN
  })
}

export interface Body {
  S: number
  /** feet → top of the shell, px at size S */
  headH: number
  half: number
  seatGround: Point
  seatSize: number
  clampX(x: number): number
}

export function bodyOf(layout: IntroLayout): Body {
  const { actor: S, seat, geometry: g, vw } = layout
  const k = S / g.viewBox.w
  const seatK = seat.w / g.viewBox.w
  const half = S * 0.5
  return {
    S,
    headH: (g.pivot.y - g.viewBox.y) * k,
    half,
    seatGround: {
      x: seat.x + (g.pivot.x - g.viewBox.x) * seatK,
      y: seat.y + (g.pivot.y - g.viewBox.y) * seatK
    },
    seatSize: seat.w,
    clampX: (x) => Math.max(half + 8, Math.min(vw - half - 8, x))
  }
}

export const centerOf = (r: Rect): Point => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 })

/* ---------------------------------------------------------------- tracks */

/** piecewise-linear (eased) value over keyframes [t, v] */
export function keyed(t: number, keys: ReadonlyArray<readonly [number, number]>): number {
  if (!keys.length) return 0
  if (t <= keys[0][0]) return keys[0][1]
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1] = keys[i]
    if (t < t1) {
      const [t0, v0] = keys[i - 1]
      return lerp(v0, v1, seg(t, t0, t1, E.inOutSine))
    }
  }
  return keys[keys.length - 1][1]
}

/** the last value whose time has come */
export function stepped<T>(t: number, keys: ReadonlyArray<readonly [number, T]>): T {
  let v = keys[0][1]
  for (const [at, value] of keys) {
    if (t >= at) v = value
    else break
  }
  return v
}

/** a piece lit at t0: fades in while it settles from `from` with a little overshoot */
export function litAt(
  t: number,
  t0: number,
  from: Partial<PieceLook> = { ty: 12, scale: 0.94 },
  len = 420
): PieceLook {
  if (t < t0) return { ...UNLIT }
  const u = seg(t, t0, t0 + len, E.outBack(1.6))
  return {
    opacity: seg(t, t0, t0 + len * 0.55),
    tx: lerp(from.tx ?? 0, 0, u),
    ty: lerp(from.ty ?? 0, 0, u),
    rot: lerp(from.rot ?? 0, 0, u),
    scale: lerp(from.scale ?? 1, 1, u)
  }
}

export interface Line {
  t0: number
  t1: number
  text: string
}

/** ms per typed character */
export const typeSpeed = (zh: boolean) => (zh ? 42 : 22)

export function bubbleAt(
  lines: readonly Line[],
  t: number,
  zh: boolean,
  actor: Rect,
  avoid: (line: Line) => PieceId[]
): BubbleState | null {
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]
    if (t < l.t0 || t >= l.t1 + 160) continue
    const n = Array.from(l.text).length
    return {
      id: i,
      text: l.text,
      shown: Math.max(0, Math.min(n, Math.floor((t - l.t0) / typeSpeed(zh)) + 1)),
      actor,
      avoid: avoid(l),
      opacity: seg(t, l.t0, l.t0 + 140) * (1 - seg(t, l.t1, l.t1 + 160))
    }
  }
  return null
}

/** how long a line needs on screen: typing plus time to read it */
export const lineMs = (text: string, zh: boolean, hold = 900) =>
  90 + Array.from(text).length * typeSpeed(zh) + hold

/* ---------------------------------------------------------------- actor */

export interface ActorTrack {
  body: Body
  spawn: Point
  /** the dot pops at spawnAt; the body has unfolded by spawnAt + 330 */
  spawnAt: number
  /** hops and slides, the leap home last */
  moves: Move[]
  leap: number
  land: number
  emotions: ReadonlyArray<readonly [number, EmotionId]>
  /** [t0, t1, gaze] */
  gazes: ReadonlyArray<readonly [number, number, { x: number; y: number }]>
  /** story-specific body language on top of the moves */
  pose?(t: number): { sx?: number; sy?: number; rot?: number; lift?: number }
}

/** builds a route move by move, each starting where the last one ended */
export function route(start: Point) {
  let at = start
  const moves: Move[] = []
  return {
    moves,
    get at() {
      return at
    },
    move(t0: number, t1: number, to: Point, h: number, ease = E.inOutSine) {
      moves.push({ t0, t1, from: at, to, h, ease })
      at = to
    }
  }
}

export function actorAt(track: ActorTrack, t: number): ActorState {
  const { body, moves } = track
  let p = track.spawn
  let lift = 0
  let facing: 1 | -1 = 1
  for (const m of moves) {
    if (t < m.t0) break
    const dx = m.to.x - m.from.x
    if (Math.abs(dx) > 8) facing = dx < 0 ? -1 : 1
    if (t >= m.t1) {
      p = m.to
      continue
    }
    const u = seg(t, m.t0, m.t1, m.ease)
    p = { x: lerp(m.from.x, m.to.x, u), y: lerp(m.from.y, m.to.y, u) }
    lift = hopLift(t, m.t0, m.t1, m.h)
    break
  }
  let { x, y } = p
  let size = body.S
  let sx = 1
  let sy = 1
  let rot = 0

  // spawn: the dot pops, then the body unfolds with a stretch and a squash
  const s0 = track.spawnAt
  const grow = t < s0 + 90 ? 0 : seg(t, s0 + 90, s0 + 330, E.outBack(2.2))
  sy += 0.26 * pulse(t, s0 + 90, 150) - 0.18 * pulse(t, s0 + 300, 140)
  sx += -0.14 * pulse(t, s0 + 90, 150) + 0.16 * pulse(t, s0 + 300, 140)

  // every hop: crouch, stretch in the air, squash on landing
  let prevEnd = -Infinity
  for (const m of moves) {
    if (m.h === 0) {
      prevEnd = m.t1
      continue
    }
    if (m.t0 - prevEnd >= 160) {
      sy += -0.1 * pulse(t, m.t0 - 70, 90)
      sx += 0.08 * pulse(t, m.t0 - 70, 90)
    }
    sy += 0.1 * pulse(t, m.t0, (m.t1 - m.t0) * 0.6)
    sx -= 0.06 * pulse(t, m.t0, (m.t1 - m.t0) * 0.6)
    sy += -0.16 * pulse(t, m.t1, 140)
    sx += 0.12 * pulse(t, m.t1, 140)
    prevEnd = m.t1
  }

  const extra = track.pose?.(t)
  if (extra) {
    sx += extra.sx ?? 0
    sy += extra.sy ?? 0
    rot += extra.rot ?? 0
    lift += extra.lift ?? 0
  }

  // home: shrink to the seat's size on the way, then sit
  if (t >= track.leap) {
    size = lerp(body.S, body.seatSize, seg(t, track.leap, track.land, E.inOut))
    rot += 10 * Math.sin(Math.PI * seg(t, track.leap, track.land))
    facing = 1
  }
  if (t >= track.land) {
    x = body.seatGround.x
    y = body.seatGround.y
    lift = 0
    size = body.seatSize
    rot = 0
  }
  sx = Math.max(0.8, Math.min(1.24, sx))
  sy = Math.max(0.8, Math.min(1.24, sy))
  let gaze: { x: number; y: number } | null = null
  for (const [g0, g1, g] of track.gazes) {
    if (t >= g0 && t < g1) {
      gaze = g
      break
    }
  }
  return {
    x,
    y,
    lift,
    size,
    sx,
    sy,
    rot,
    facing,
    grow,
    emotion: stepped(t, track.emotions),
    gaze,
    dotOut: false
  }
}

/** Jojo's drawn box (feet at the bottom edge) */
export function actorBox(track: ActorTrack, a: ActorState): Rect {
  const k = (a.size / track.body.S) * a.grow
  const w = track.body.S * k * a.sx
  const h = track.body.headH * k * a.sy
  const feet = a.y - a.lift
  return { x: a.x - w / 2, y: feet - h, w, h }
}

/** just above Jojo's head */
export function headTop(track: ActorTrack, a: ActorState): Point {
  const b = actorBox(track, a)
  return { x: a.x, y: b.y - 8 }
}

/** the dot that pops first (in the film's spot: top-left of the shell) */
export function spawnDotAt(
  track: ActorTrack,
  layout: IntroLayout,
  t: number
): StoryFrame<unknown>['spawnDot'] {
  const s0 = track.spawnAt
  if (t < s0 || t >= s0 + 110) return null
  const g = layout.geometry
  const k = track.body.S / g.viewBox.w
  return {
    x: track.spawn.x + (g.dot.cx - g.pivot.x) * k,
    y: track.spawn.y + (g.dot.cy - g.pivot.y) * k,
    r: g.dot.r * k * seg(t, s0, s0 + 110, E.outBack(2))
  }
}

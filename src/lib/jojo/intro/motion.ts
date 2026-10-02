import type { EmotionId } from '@jojo-web/runtime'

/**
 * Types and easing shared by the intro: the pieces of the first screen, the
 * measured layout, Jojo's state, and small frame-pure math helpers.
 */

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}
export type PieceId =
  | 'header'
  | 'avatar'
  | 'name'
  | 'chip0'
  | 'chip1'
  | 'connect'
  | 'card'
  | 'about'
  | 'product'
export const PIECE_IDS: readonly PieceId[] = [
  'header',
  'avatar',
  'name',
  'chip0',
  'chip1',
  'connect',
  'card',
  'about',
  'product'
]
export interface ActorGeometry {
  /** SVG viewBox the actor is drawn with (tight framing) */
  viewBox: { x: number; y: number; w: number; h: number }
  /** bottom-centre of the shell, SVG units */
  pivot: { x: number; y: number }
  /** signal dot, SVG units */
  dot: { cx: number; cy: number; r: number }
}

export interface IntroLayout {
  vw: number
  vh: number
  /** viewport rects of the real elements the intro rebuilds (missing = not on screen) */
  pieces: Partial<Record<PieceId, Rect>>
  /** viewport rect of the identity-slot Jojo's SVG (where the actor lands) */
  seat: Rect
  /** actor render size in px */
  actor: number
  geometry: ActorGeometry
  /** viewport rects Jojo must never enter (the Skip button) */
  keepOut?: Rect[]
}

export interface ActorState {
  /** ground point: bottom-centre of the shell, viewport px */
  x: number
  y: number
  lift: number
  /** drawn size in px (the actor is rendered at layout.actor and scaled) */
  size: number
  sx: number
  sy: number
  rot: number
  facing: 1 | -1
  grow: number
  emotion: EmotionId
  gaze: { x: number; y: number } | null
  dotOut: boolean
}

/* ---------------------------------------------------------------- math */

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
type Ease = (t: number) => number
export const E = {
  linear: (t: number) => t,
  out: (t: number) => 1 - (1 - t) ** 3,
  in2: (t: number) => t * t,
  inOut: (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2),
  inOutSine: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
  outBack:
    (k = 1.7): Ease =>
    (t: number) =>
      1 + (k + 1) * (t - 1) ** 3 + k * (t - 1) ** 2
}
/** 0→1 over [a, b] */
export const seg = (t: number, a: number, b: number, ease: Ease = E.linear) =>
  t <= a ? 0 : t >= b ? 1 : ease((t - a) / (b - a))
/** a single bump 0→1→0 over [t0, t0+len] */
export const pulse = (t: number, t0: number, len: number) =>
  t <= t0 || t >= t0 + len ? 0 : Math.sin((Math.PI * (t - t0)) / len)
/** hop height at t for a hop over [t0, t1] */
export const hopLift = (t: number, t0: number, t1: number, h: number) => {
  if (t <= t0 || t >= t1) return 0
  const u = (t - t0) / (t1 - t0)
  return 4 * h * u * (1 - u)
}
/** fraction of a rect inside the viewport */
export function visibleFraction(r: Rect, vw: number, vh: number) {
  const w = Math.max(0, Math.min(r.x + r.w, vw) - Math.max(r.x, 0))
  const h = Math.max(0, Math.min(r.y + r.h, vh) - Math.max(r.y, 0))
  return r.w > 0 && r.h > 0 ? (w * h) / (r.w * r.h) : 0
}

export interface Point {
  x: number
  y: number
}

/** one move of the actor between two ground points */
export interface Move {
  t0: number
  t1: number
  from: Point
  to: Point
  /** arc height (0 = slide) */
  h: number
  ease: Ease
}

import type { EmotionId } from '@jojo-web/runtime'

/**
 * "Jojo builds the site" — the 29 s film (jojo-builds-home, 2026-09-24)
 * compressed into a ~3 s web intro that plays over the real, already rendered
 * page. Frame-pure like the film: every state is a function of `t` (ms), so
 * skipping, timeouts and tests all reason about the same data.
 *
 * Story (film beat → here):
 *  02 pops out           → Jojo pops out of the page where the avatar sits; the
 *                           pop knocks the hero apart (header up, avatar rolls
 *                           off, name drops, terminal slides aside).
 *     looks around       → a puzzled look left/right.
 *  01 pulls the header   → throws its signal dot on a tether and pulls the
 *                           header back down.
 *  03 pushes the avatar  → hops out left, rolls the avatar back into place,
 *                           happy hop; the name and links pop back.
 *  04 deals the cards    → yanks the terminal card back on the tether.
 *  06 finds its corner   → hops over the avatar into its seat beside it (the
 *                           identity slot), shrinking to seat size, and sits.
 * The theme-toggle beat (05) is left out on purpose: the intro must never
 * change a visitor's settings.
 */

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}
export type PieceId = 'header' | 'avatar' | 'name' | 'labels' | 'connect' | 'card'
export const PIECE_IDS: readonly PieceId[] = [
  'header',
  'avatar',
  'name',
  'labels',
  'connect',
  'card'
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
}

export interface PieceState {
  tx: number
  ty: number
  rot: number
  scale: number
  opacity: number
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

export interface TetherState {
  from: { x: number; y: number }
  to: { x: number; y: number }
  slack: number
  /** dot radius in px */
  r: number
}

export interface IntroFrame {
  t: number
  actor: ActorState
  pieces: Partial<Record<PieceId, PieceState>>
  tether: TetherState | null
  ripple: { x: number; y: number; r: number; opacity: number } | null
  /** the tiny dot that pops out first, before the body unfolds */
  spawnDot: { x: number; y: number; r: number } | null
}

/* ---------------------------------------------------------------- math */

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
type Ease = (t: number) => number
export const E = {
  linear: (t: number) => t,
  out: (t: number) => 1 - (1 - t) ** 3,
  in: (t: number) => t ** 3,
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
/** decaying oscillation starting at t0 */
export const wobble = (t: number, t0: number, amp: number, period: number, decay: number) =>
  t < t0 ? 0 : amp * Math.sin(((t - t0) / period) * Math.PI * 2) * Math.exp(-(t - t0) / decay)

const REST: PieceState = { tx: 0, ty: 0, rot: 0, scale: 1, opacity: 1 }
const center = (r: Rect) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 })

/** fraction of a rect inside the viewport */
export function visibleFraction(r: Rect, vw: number, vh: number) {
  const w = Math.max(0, Math.min(r.x + r.w, vw) - Math.max(r.x, 0))
  const h = Math.max(0, Math.min(r.y + r.h, vh) - Math.max(r.y, 0))
  return r.w > 0 && r.h > 0 ? (w * h) / (r.w * r.h) : 0
}

/* ---------------------------------------------------------------- plan */

interface Hop {
  t0: number
  t1: number
  x: number
  y: number
  h: number
  ease?: Ease
}

export interface IntroPlan {
  layout: IntroLayout
  duration: number
  /** pieces that take part (on screen enough to be worth animating) */
  cast: PieceId[]
  beats: {
    look: number
    header: number | null
    avatarOut: number
    avatarIn: number
    card: number | null
    land: number
    end: number
  }
  spawn: { x: number; y: number }
  ground: number
  radius: number
  pushX: number
  hops: Hop[]
  scatter: Partial<Record<PieceId, PieceState>>
}

/** a piece is cast when at least this much of it is on screen */
const CAST_MIN = 0.35

export function planIntro(layout: IntroLayout): IntroPlan {
  const { vw, vh, pieces, actor: S } = layout
  const cast = PIECE_IDS.filter((id) => {
    const r = pieces[id]
    return !!r && visibleFraction(r, vw, vh) >= CAST_MIN
  })
  const A = pieces.avatar
  if (!A || !cast.includes('avatar')) throw new Error('intro needs the avatar on screen')
  const radius = Math.min(A.w, A.h) / 2
  const ac = center(A)
  // Jojo works on the avatar's baseline, so the rolled avatar ends exactly home
  const ground = A.y + A.h
  const spawn = { x: ac.x, y: ground }
  const pushX = ac.x - radius - S * 0.46

  let t = 0
  const look = 380
  const header = cast.includes('header') ? 700 : null
  t = header !== null ? 1260 : 720
  const avatarOut = t
  const avatarIn = avatarOut + 180
  t = avatarIn + 640 // push + settle + happy hop
  const card = cast.includes('card') ? t : null
  if (card !== null) t = card + 620
  const land = t
  const end = land + 700

  const hops: Hop[] = [
    { t0: avatarOut, t1: avatarOut + 170, x: -S * 0.9, y: ground, h: 34 },
    // (pushing: x is tied to the avatar, see actorAt)
    { t0: avatarIn + 560, t1: avatarIn + 690, x: pushX, y: ground, h: 22 }
  ]

  const H = pieces.header
  const scatter: Partial<Record<PieceId, PieceState>> = {
    header: H ? { ...REST, ty: -(H.y + H.h + 18) } : REST,
    avatar: {
      ...REST,
      tx: -(ac.x + radius + 24),
      rot: (-(ac.x + radius + 24) / radius) * (180 / Math.PI)
    },
    name: { ...REST, ty: 14, scale: 0.94, opacity: 0 },
    labels: { ...REST, ty: 12, scale: 0.94, opacity: 0 },
    connect: { ...REST, ty: 10, scale: 0.94, opacity: 0 },
    card: pieces.card ? { ...REST, tx: Math.min(vw * 0.42, 380), ty: 22, rot: 6 } : REST
  }

  return {
    layout,
    duration: end,
    cast,
    beats: { look, header, avatarOut, avatarIn, card, land, end },
    spawn,
    ground,
    radius,
    pushX,
    hops,
    scatter
  }
}

/* ---------------------------------------------------------------- pieces */

function mixPiece(a: PieceState, b: PieceState, u: number): PieceState {
  return {
    tx: lerp(a.tx, b.tx, u),
    ty: lerp(a.ty, b.ty, u),
    rot: lerp(a.rot, b.rot, u),
    scale: lerp(a.scale, b.scale, u),
    opacity: lerp(a.opacity, b.opacity, u)
  }
}

const SCATTER = { t0: 40, t1: 420 }

/** avatar centre x offset (tx) while being pushed back in */
function avatarTx(plan: IntroPlan, t: number) {
  const s = plan.scatter.avatar!
  const { avatarIn } = plan.beats
  return lerp(s.tx, 0, seg(t, avatarIn, avatarIn + 400, E.inOut))
}

export function pieceAt(plan: IntroPlan, id: PieceId, t: number): PieceState {
  const s = plan.scatter[id] ?? REST
  const out = seg(t, SCATTER.t0, SCATTER.t1, E.out)
  const b = plan.beats
  switch (id) {
    case 'header': {
      if (b.header === null) return REST
      const back = seg(t, b.header + 130, b.header + 410, E.outBack(1.35))
      if (t < b.header + 130) return mixPiece(REST, s, out)
      return mixPiece(s, REST, back)
    }
    case 'avatar': {
      if (t < b.avatarIn) return mixPiece(REST, s, out)
      const tx = avatarTx(plan, t)
      const settle = b.avatarIn + 400
      return {
        tx,
        ty: 0,
        // rolling: arc length / radius
        rot: (tx / plan.radius) * (180 / Math.PI),
        scale: 1 + wobble(t, settle, 0.06, 150, 160),
        opacity: 1
      }
    }
    case 'name':
    case 'labels':
    case 'connect': {
      const i = id === 'name' ? 0 : id === 'labels' ? 1 : 2
      const t0 = b.avatarIn + 420 + i * 70
      if (t < t0) return mixPiece(REST, s, out)
      return mixPiece(s, REST, seg(t, t0, t0 + 260, E.outBack(1.6)))
    }
    case 'card': {
      if (b.card === null) return REST
      if (t < b.card + 120) return mixPiece(REST, s, out)
      const u = seg(t, b.card + 120, b.card + 380, E.outBack(1.25))
      const p = mixPiece(s, REST, u)
      p.rot +=
        -4 * Math.sin(Math.PI * clamp01((t - b.card - 120) / 260)) +
        wobble(t, b.card + 380, 1.4, 120, 140)
      return p
    }
  }
}

/* ---------------------------------------------------------------- actor */

function emotionAt(plan: IntroPlan, t: number): EmotionId {
  const b = plan.beats
  if (t < b.look + 140) return 'surprised'
  if (t < (b.header ?? b.avatarOut)) return 'puzzled'
  if (b.header !== null && t < b.avatarOut) return 'focus'
  if (t < b.avatarIn + 420) return 'focus'
  if (t < b.avatarIn + 700) return 'happy'
  if (b.card !== null && t < b.land) return t < b.card + 380 ? 'focus' : 'laugh'
  return 'happy'
}

function gazeAt(plan: IntroPlan, t: number): { x: number; y: number } | null {
  const b = plan.beats
  if (t >= b.look && t < b.look + 110) return { x: -1, y: 0 }
  if (t >= b.look + 110 && t < b.look + 230) return { x: 1, y: 0 }
  if (b.header !== null && t >= b.header && t < b.header + 420) return { x: 0, y: -1 }
  return null
}

/** where the actor stands; hops are arcs between ground points */
function basePos(plan: IntroPlan, t: number) {
  const b = plan.beats
  const S = plan.layout.actor
  let x = plan.spawn.x
  const y = plan.ground
  let lift = 0
  let facing: 1 | -1 = 1
  // out to the left
  const out = plan.hops[0]
  if (t >= out.t0) {
    facing = -1
    x = lerp(plan.spawn.x, out.x, seg(t, out.t0, out.t1, E.linear))
    lift = hopLift(t, out.t0, out.t1, out.h)
  }
  // pushing the avatar back in: stays glued behind it
  if (t >= b.avatarIn) {
    facing = 1
    const ax = plan.spawn.x + avatarTx(plan, t)
    x = ax - plan.radius - S * 0.46
    lift =
      3 *
      Math.abs(Math.sin(((t - b.avatarIn) / 70) * Math.PI * 0.5)) *
      (1 - seg(t, b.avatarIn + 360, b.avatarIn + 400))
  }
  const happy = plan.hops[1]
  if (t >= happy.t0) {
    x = plan.pushX
    lift = hopLift(t, happy.t0, happy.t1, happy.h)
  }
  return { x, y, lift, facing }
}

export function actorAt(plan: IntroPlan, t: number): ActorState {
  const { layout, beats: b } = plan
  const S = layout.actor
  const { seat, geometry: g } = layout
  const base = basePos(plan, t)
  let { x, y, lift } = base
  const facing = base.facing
  let size = S
  let sx = 1
  let sy = 1
  let rot = 0

  // spawn: grow with stretch, then a landing squash
  const grow = t < 90 ? 0 : seg(t, 90, 330, E.outBack(2.2))
  sy += 0.26 * pulse(t, 90, 150) - 0.18 * pulse(t, 300, 140)
  sx += -0.14 * pulse(t, 90, 150) + 0.16 * pulse(t, 300, 140)

  // header pull: lean back, squash on the tug
  if (b.header !== null) {
    rot +=
      -10 * seg(t, b.header + 40, b.header + 130) * (1 - seg(t, b.header + 380, b.header + 460))
    sy += -0.1 * pulse(t, b.header + 130, 120)
    sx += 0.08 * pulse(t, b.header + 130, 120)
  }
  // turning around squashes
  sx -= 0.3 * pulse(t, b.avatarOut - 30, 80) + 0.3 * pulse(t, b.avatarIn - 30, 80)
  // pushing: lean in
  if (t >= b.avatarIn && t < b.avatarIn + 420) {
    rot +=
      8 * seg(t, b.avatarIn, b.avatarIn + 60) * (1 - seg(t, b.avatarIn + 360, b.avatarIn + 420))
  }
  // bump when the avatar lands
  sy += -0.16 * pulse(t, b.avatarIn + 400, 120)
  sx += 0.12 * pulse(t, b.avatarIn + 400, 120)
  // yanking the card: big lean back, then a proud stretch
  if (b.card !== null) {
    rot +=
      -14 * seg(t, b.card + 100, b.card + 140, E.out) * (1 - seg(t, b.card + 300, b.card + 420))
    sy += -0.1 * pulse(t, b.card + 110, 140)
    const proud =
      seg(t, b.card + 420, b.card + 480, E.out) * (1 - seg(t, b.card + 560, b.card + 620))
    sy += 0.1 * proud
    sx -= 0.05 * proud
  }
  // the last hop: over the avatar into the seat, shrinking to seat size
  const seatK = seat.w / g.viewBox.w // px per SVG unit at seat size
  const seatGround = {
    x: seat.x + (g.pivot.x - g.viewBox.x) * seatK,
    y: seat.y + (g.pivot.y - g.viewBox.y) * seatK
  }
  const hop0 = b.land
  const hop1 = b.land + 420
  let landFacing = facing
  if (t >= hop0) {
    const u = seg(t, hop0, hop1, E.inOutSine)
    x = lerp(plan.pushX, seatGround.x, u)
    y = lerp(plan.ground, seatGround.y, u)
    // arc high enough that Jojo's feet clear the top of the avatar
    const clear = Math.max(40, plan.ground - layout.pieces.avatar!.y + 10)
    lift = hopLift(t, hop0, hop1, clear)
    size = lerp(S, seat.w, seg(t, hop0, hop1, E.inOut))
    rot += 8 * Math.sin(Math.PI * clamp01((t - hop0) / (hop1 - hop0)))
    landFacing = 1
    // sit
    sy += -0.16 * pulse(t, hop1, 150)
    sx += 0.12 * pulse(t, hop1, 150)
  }
  if (t >= hop1) {
    x = seatGround.x
    y = seatGround.y
    lift = 0
    size = seat.w
  }
  sx = Math.max(0.7, Math.min(1.3, sx))
  sy = Math.max(0.74, Math.min(1.3, sy))
  return {
    x,
    y,
    lift,
    size,
    sx,
    sy,
    rot,
    facing: landFacing,
    grow,
    emotion: emotionAt(plan, t),
    gaze: gazeAt(plan, t),
    dotOut: false
  }
}

/** screen position of an SVG point on the actor (like the film's jojoPoint) */
export function actorPoint(plan: IntroPlan, a: ActorState, px: number, py: number) {
  const g = plan.layout.geometry
  const k = a.size / g.viewBox.w
  let dx = (px - g.pivot.x) * k * a.sx * a.facing * a.grow
  let dy = (py - g.pivot.y) * k * a.sy * a.grow
  const r = (a.rot * Math.PI) / 180
  const rx = dx * Math.cos(r) - dy * Math.sin(r)
  const ry = dx * Math.sin(r) + dy * Math.cos(r)
  dx = rx
  dy = ry
  return { x: a.x + dx, y: a.y - a.lift + dy }
}

/* ---------------------------------------------------------------- tether */

interface Throw {
  out: [number, number]
  back: [number, number]
  target: (t: number) => { x: number; y: number }
}

function throwsFor(plan: IntroPlan): Throw[] {
  const { pieces } = plan.layout
  const b = plan.beats
  const list: Throw[] = []
  const H = pieces.header
  if (b.header !== null && H) {
    list.push({
      out: [b.header, b.header + 130],
      back: [b.header + 410, b.header + 530],
      target: (t) => {
        const p = pieceAt(plan, 'header', t)
        return { x: plan.spawn.x, y: H.y + H.h + p.ty - 4 }
      }
    })
  }
  const C = pieces.card
  if (b.card !== null && C) {
    list.push({
      out: [b.card, b.card + 120],
      back: [b.card + 380, b.card + 480],
      target: (t) => {
        const p = pieceAt(plan, 'card', t)
        return { x: C.x + 28 + p.tx, y: C.y + Math.min(C.h / 2, 60) + p.ty }
      }
    })
  }
  return list
}

/* ---------------------------------------------------------------- frame */

export function sampleIntro(plan: IntroPlan, t: number): IntroFrame {
  const actor = actorAt(plan, t)
  const pieces: Partial<Record<PieceId, PieceState>> = {}
  for (const id of plan.cast) pieces[id] = pieceAt(plan, id, t)

  const g = plan.layout.geometry
  const home = actorPoint(plan, actor, g.dot.cx, g.dot.cy)
  const dotR = g.dot.r * (actor.size / g.viewBox.w) * actor.grow
  let tether: TetherState | null = null
  for (const th of throwsFor(plan)) {
    if (t < th.out[0] || t >= th.back[1]) continue
    actor.dotOut = true
    if (t < th.out[1]) {
      const u = seg(t, th.out[0], th.out[1], E.out)
      const tg = th.target(t)
      tether = {
        from: home,
        to: { x: lerp(home.x, tg.x, u), y: lerp(home.y, tg.y, u) - Math.sin(Math.PI * u) * 36 },
        slack: 0.5 * (1 - u),
        r: dotR
      }
    } else if (t < th.back[0]) {
      tether = { from: home, to: th.target(t), slack: 0, r: dotR }
    } else {
      const u = seg(t, th.back[0], th.back[1], E.in)
      const tg = th.target(th.back[0])
      tether = {
        from: home,
        to: { x: lerp(tg.x, home.x, u), y: lerp(tg.y, home.y, u) },
        slack: 0.35 * (1 - u),
        r: dotR
      }
    }
  }

  // the dot pops first, then the body unfolds under it
  let spawnDot: IntroFrame['spawnDot'] = null
  if (t < 110) {
    const full = { ...actor, grow: 1 }
    const p = actorPoint(plan, full, g.dot.cx, g.dot.cy)
    spawnDot = {
      x: p.x,
      y: p.y,
      r: g.dot.r * (plan.layout.actor / g.viewBox.w) * seg(t, 0, 110, E.outBack(2))
    }
  }

  const ripple =
    t >= 60 && t < 480
      ? {
          x: plan.spawn.x,
          y: plan.ground - plan.layout.actor * 0.45,
          r: lerp(8, Math.max(plan.layout.vw, plan.layout.vh) * 0.35, seg(t, 60, 480, E.out)),
          opacity: 0.35 * (1 - seg(t, 60, 480, E.linear))
        }
      : null

  return { t, actor, pieces, tether, ripple, spawnDot }
}

import type { EmotionId } from '@jojo-web/runtime'

/**
 * "Jojo builds the site" — the 29 s film (jojo-builds-home, 2026-09-24)
 * compressed into a ~3–4 s web intro that plays over the real, already
 * rendered page. Frame-pure like the film: every state is a function of `t`
 * (ms), so skipping, timeouts and tests all reason about the same data.
 *
 * Redesign (2026-09-26, after the user watched the r2 recording). Nothing is
 * blown apart, flattened or dragged across the screen any more. As Jojo pops
 * out, the first screen dims in place to a faint blueprint; then Jojo walks
 * one route down the page and builds it back, group by group. Every act has a
 * contact, a force, a completion and a short pause, and pieces stay whole and
 * readable the whole time (they move rigidly or are revealed by a clip, never
 * scaled out of shape):
 *
 *  roof      → looks up; the signal dot throws a short tether to the top edge
 *              and pulls the header down; it lands with a thump.
 *  identity  → the thump knocks the avatar loose: it drops from under the
 *              header onto Jojo's head, Jojo squashes and tosses it up, and it
 *              settles on its spot.
 *  labels    → Jojo hops aside and stomps: Connect, the label chips and the
 *              name pop up, nearest first.
 *  body      → lands on the terminal card's left end and shoves: the card is
 *              laid out to the right from Jojo's feet. Steps down onto About
 *              and slides down its left edge: About is revealed with Jojo's
 *              weight, like pulling a blind.
 *  ground    → stomps at the bottom: the Product card rises from below the
 *              fold and stops right under Jojo's feet.
 *  home      → looks up at the avatar, leaps back into its seat beside it
 *              (shrinking to seat size) and sits.
 *
 * Only pieces that are really on screen take part; a missing group is simply
 * skipped, so phones get a shorter run of the same story. The theme toggle
 * beat of the film is left out on purpose: the intro never changes settings.
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
/** pieces the stomp pops up */
const POPPED: readonly PieceId[] = ['name', 'chip0', 'chip1', 'connect']

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

/** a clip inside a piece's own box, px from each edge (negative = let shadows out) */
export interface Inset {
  t: number
  r: number
  b: number
  l: number
}

export interface PieceState {
  /** the solid copy: rigid moves only (uniform scale, small rotation) */
  tx: number
  ty: number
  rot: number
  scale: number
  opacity: number
  clip: Inset | null
  /** the faint blueprint copy that marks the piece's home while it is built */
  ghost: number
  ghostClip: Inset | null
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
/** decaying oscillation starting at t0 */
export const wobble = (t: number, t0: number, amp: number, period: number, decay: number) =>
  t < t0 ? 0 : amp * Math.sin(((t - t0) / period) * Math.PI * 2) * Math.exp(-(t - t0) / decay)

export const REST: Readonly<PieceState> = {
  tx: 0,
  ty: 0,
  rot: 0,
  scale: 1,
  opacity: 1,
  clip: null,
  ghost: 0,
  ghostClip: null
}
/** blueprint opacity while a piece waits to be built */
export const GHOST = 0.16
/** the first screen dims to the blueprint over this window */
export const DIM: [number, number] = [0, 260]
/** how far a clip may spill past a revealed edge (card shadows) */
const SPILL = 32

const center = (r: Rect) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 })

/** fraction of a rect inside the viewport */
export function visibleFraction(r: Rect, vw: number, vh: number) {
  const w = Math.max(0, Math.min(r.x + r.w, vw) - Math.max(r.x, 0))
  const h = Math.max(0, Math.min(r.y + r.h, vh) - Math.max(r.y, 0))
  return r.w > 0 && r.h > 0 ? (w * h) / (r.w * r.h) : 0
}

/* ---------------------------------------------------------------- plan */

interface Point {
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

export interface IntroPlan {
  layout: IntroLayout
  duration: number
  /** pieces that take part (on screen enough to be worth animating) */
  cast: PieceId[]
  beats: {
    /** looks up after popping out */
    look: number
    /** tether: out, hooked (pull starts), header landed, dot home */
    header: { out: number; pull: number; land: number; home: number } | null
    /** avatar: starts falling, hits Jojo's head, tossed, settled */
    avatar: { fall: number; contact: number; toss: number; settle: number }
    /** the stomp that pops the name, chips and Connect (null: none on screen) */
    stomp: number | null
    /** terminal card: Jojo lands, shoves (reveal starts), revealed */
    card: { land: number; shove: number; done: number } | null
    /** About: Jojo slides down its left edge over [slide0, slide1] */
    about: { land: number; slide0: number; slide1: number } | null
    /** Product: Jojo stomps, the card rises over [rise0, rise1] */
    product: { stomp: number; rise0: number; rise1: number } | null
    /** the leap home: takes off, lands in the seat */
    leap: number
    land: number
    end: number
  }
  /** when each popped piece pops up (the stomp's wave, nearest first) */
  pop: Partial<Record<PieceId, number>>
  moves: Move[]
  spawn: Point
  /** actor size and head height (feet → top of shell) in px */
  S: number
  headH: number
  seatGround: Point
}

/** a piece is cast when at least this much of it is on screen */
const CAST_MIN = 0.35
/** px per ms the stomp's wave travels */
const POP_SPEED = 1.4

export function planIntro(layout: IntroLayout): IntroPlan {
  const { vw, vh, pieces, actor: S, seat, geometry: g } = layout
  const cast = PIECE_IDS.filter((id) => {
    const r = pieces[id]
    return !!r && visibleFraction(r, vw, vh) >= CAST_MIN
  })
  const has = (id: PieceId) => cast.includes(id)
  const A = pieces.avatar
  if (!A || !has('avatar')) throw new Error('intro needs the avatar on screen')
  const k = S / g.viewBox.w
  const headH = (g.pivot.y - g.viewBox.y) * k
  const half = S * 0.5
  const clampX = (x: number) => Math.max(half + 6, Math.min(vw - half - 6, x))
  const ac = center(A)

  // pops out right under the avatar's spot, head touching its bottom edge
  const spawn = { x: ac.x, y: A.y + A.h + headH }
  const moves: Move[] = []
  let at = spawn
  const move = (t0: number, t1: number, to: Point, h: number, ease: Ease = E.inOutSine) => {
    moves.push({ t0, t1, from: at, to, h, ease })
    at = to
  }

  const look = 330
  let t = look + 40

  // roof: a short tether pulls the header down
  let header: IntroPlan['beats']['header'] = null
  if (has('header')) {
    const out = t
    const pull = out + 130
    const land = pull + 300
    header = { out, pull, land, home: land + 110 }
    t = land
  }

  // identity: the thump knocks the avatar loose onto Jojo's head
  const fall = header ? header.land + 30 : t
  const contact = fall + (header ? 230 : 280)
  const toss = contact + 100
  const settle = toss + 300
  t = settle + 70

  // labels: hop aside, stomp, they pop up nearest first
  const popped = POPPED.filter(has)
  let stomp: number | null = null
  const pop: Partial<Record<PieceId, number>> = {}
  if (popped.length) {
    // stand just left of all of them, on the lowest baseline (Connect's)
    const rects = popped.map((id) => pieces[id]!)
    const left = Math.min(...rects.map((r) => r.x))
    const floor = Math.max(...rects.map((r) => r.y + r.h))
    const spot = { x: clampX(left - S * 0.6), y: floor }
    move(t, t + 200, spot, 34)
    stomp = t + 200
    for (const id of popped) {
      const c = center(pieces[id]!)
      pop[id] = stomp + 30 + Math.min(220, Math.hypot(c.x - spot.x, c.y - spot.y) / POP_SPEED)
    }
    t = stomp + 200
  }

  // body: shove the terminal card out to the right from its left end
  let card: IntroPlan['beats']['card'] = null
  const K = pieces.card
  if (K && has('card')) {
    const spot = { x: clampX(K.x + S * 0.5), y: K.y }
    const land = t + 230
    move(t, land, spot, 40)
    const shove = land + 90
    card = { land, shove, done: shove + 380 }
    t = shove + 200
  }

  // body: step down onto About and slide down its left edge
  let about: IntroPlan['beats']['about'] = null
  const B = pieces.about
  const P = has('product') ? pieces.product : undefined
  if (B && has('about')) {
    const x = clampX(B.x + S * 0.5)
    const land = t + 200
    move(t, land, { x, y: B.y }, 18)
    const slide0 = land + 60
    // down to Product's top edge when it is coming, else to About's bottom
    // (never below the fold)
    const bottom = Math.min(P ? P.y : B.y + B.h, vh - 10)
    const slide1 = slide0 + Math.max(240, Math.min(420, (bottom - B.y) * 1.5))
    move(slide0, slide1, { x, y: bottom }, 0, E.inOut)
    about = { land, slide0, slide1 }
    t = slide1
  }

  // ground: stomp, Product rises from below the fold to Jojo's feet
  let product: IntroPlan['beats']['product'] = null
  if (P) {
    if (!about) {
      // no About on screen: hop straight to Product's top edge
      const land = t + 220
      move(t, land, { x: clampX(P.x + S * 0.5), y: P.y }, 30)
      t = land
    }
    product = { stomp: t, rise0: t + 40, rise1: t + 420 }
    t = t + 420
  }

  // home: look up, leap into the seat beside the avatar
  const seatK = seat.w / g.viewBox.w
  const seatGround = {
    x: seat.x + (g.pivot.x - g.viewBox.x) * seatK,
    y: seat.y + (g.pivot.y - g.viewBox.y) * seatK
  }
  const leap = t + 110
  const dist = Math.hypot(seatGround.x - at.x, seatGround.y - at.y)
  const land = leap + Math.max(380, Math.min(560, 300 + dist * 0.45))
  move(leap, land, seatGround, 80)
  const end = land + 240

  return {
    layout,
    duration: end,
    cast,
    beats: {
      look,
      header,
      avatar: { fall, contact, toss, settle },
      stomp,
      card,
      about,
      product,
      leap,
      land,
      end
    },
    pop,
    moves,
    spawn,
    S,
    headH,
    seatGround
  }
}

/* ---------------------------------------------------------------- pieces */

/** 0 → 1 while the first screen dims to the blueprint */
const dimAt = (t: number) => seg(t, DIM[0], DIM[1], E.out)

/** the solid copy fades to nothing while the blueprint fades in */
function dimming(t: number): PieceState {
  const d = dimAt(t)
  return { ...REST, opacity: 1 - d, ghost: GHOST * d }
}

/** waiting to be built: only the blueprint shows */
const waiting = (): PieceState => ({ ...REST, opacity: 0, ghost: GHOST })

function headerTy(plan: IntroPlan, t: number) {
  const b = plan.beats.header!
  const H = plan.layout.pieces.header!
  const off = -(H.y + H.h + 12)
  // pulled in by the rope (speeds up, then brakes on landing), then a thump
  return lerp(off, 0, seg(t, b.pull, b.land, E.inOut)) + 5 * pulse(t, b.land, 150)
}

/** avatar drop: falls from under the header, lands on Jojo's head, tossed, settles */
function avatarTy(plan: IntroPlan, t: number) {
  const { fall, contact, toss, settle } = plan.beats.avatar
  const A = plan.layout.pieces.avatar!
  const H = plan.beats.header ? plan.layout.pieces.header : undefined
  // start with its bottom hidden behind the header (or just above the viewport)
  const start = H ? H.y + H.h - (A.y + A.h) : -(A.y + A.h + 8)
  if (t < contact) return lerp(start, 0, seg(t, fall, contact, E.in2))
  // pressed down with Jojo's head, then tossed back up in an arc
  const press = plan.headH * (1 - headSquash(plan, t))
  if (t < toss) return press
  const pressMax = plan.headH * (1 - headSquash(plan, toss))
  return lerp(pressMax, 0, seg(t, toss, settle, E.inOutSine)) - hopLift(t, toss, settle, 30)
}

/** Jojo's vertical squash from the avatar landing on its head: deepest at the toss */
function headSquash(plan: IntroPlan, t: number) {
  const { contact, toss } = plan.beats.avatar
  return 1 - 0.16 * pulse(t, contact, (toss - contact) * 2)
}

/** a clip that shows the left `w` px of a box of width `bw` */
const showLeft = (w: number, bw: number): Inset => ({ t: -SPILL, r: bw - w, b: -SPILL, l: -SPILL })
/** a clip that shows the top `h` px of a box of height `bh` */
const showTop = (h: number, bh: number): Inset => ({ t: -SPILL, r: -SPILL, b: bh - h, l: -SPILL })

export function pieceAt(plan: IntroPlan, id: PieceId, t: number): PieceState {
  if (t < DIM[1]) return dimming(t)
  const b = plan.beats
  const r = plan.layout.pieces[id]!
  switch (id) {
    case 'header': {
      const h = b.header
      if (!h || t < h.pull) return waiting()
      const landed = t >= h.land
      return { ...REST, ty: headerTy(plan, t), ghost: landed ? 0 : GHOST }
    }
    case 'avatar': {
      const a = b.avatar
      if (t < a.fall) return waiting()
      const ty = avatarTy(plan, t)
      // while it falls, hide what is still behind the header
      const H = b.header ? plan.layout.pieces.header! : null
      const hidden = H ? Math.max(0, H.y + H.h + headerTy(plan, t) - (r.y + ty)) : 0
      const spin = t < a.contact ? -16 * (1 - seg(t, a.fall, a.contact)) : 0
      return {
        ...REST,
        ty,
        rot: spin + wobble(t, a.settle, 3, 150, 130),
        clip: hidden > 0 ? { t: hidden, r: -SPILL, b: -SPILL, l: -SPILL } : null,
        ghost: t < a.settle ? GHOST : 0
      }
    }
    case 'name':
    case 'chip0':
    case 'chip1':
    case 'connect': {
      const t0 = plan.pop[id]
      if (t0 === undefined || t < t0) return waiting()
      const u = seg(t, t0, t0 + 320, E.outBack(2.4))
      const opacity = seg(t, t0, t0 + 90)
      return {
        ...REST,
        ty: 12 * (1 - u),
        scale: lerp(0.9, 1, u),
        opacity,
        ghost: GHOST * (1 - opacity)
      }
    }
    case 'card': {
      const c = b.card
      if (!c || t < c.shove) return waiting()
      if (t >= c.done) return { ...REST }
      // laid out to the right, starting under Jojo's feet
      const x0 = plan.S
      const w = lerp(Math.min(x0, r.w), r.w, seg(t, c.shove, c.done, E.out))
      return {
        ...REST,
        clip: showLeft(w, r.w),
        ghost: GHOST,
        ghostClip: { t: -SPILL, r: -SPILL, b: -SPILL, l: w }
      }
    }
    case 'about': {
      const a = b.about
      if (!a || t < a.slide0) return waiting()
      if (t >= a.slide1) return { ...REST }
      // the revealed edge follows Jojo's feet
      const feet = actorBase(plan, t).y
      const h = Math.max(0, Math.min(r.h, feet - r.y))
      return {
        ...REST,
        clip: showTop(h, r.h),
        ghost: GHOST,
        ghostClip: { t: h, r: -SPILL, b: -SPILL, l: -SPILL }
      }
    }
    case 'product': {
      const p = b.product
      if (!p || t < p.rise0) return waiting()
      const off = plan.layout.vh - r.y + 16
      const u = seg(t, p.rise0, p.rise1, E.outBack(1.5))
      return { ...REST, ty: lerp(off, 0, u), ghost: t < p.rise1 ? GHOST : 0 }
    }
  }
}

/* ---------------------------------------------------------------- actor */

/** where the actor's feet are (before pose): walks the planned moves */
function actorBase(plan: IntroPlan, t: number): Point & { lift: number; facing: 1 | -1 } {
  let p: Point = plan.spawn
  let lift = 0
  let facing: 1 | -1 = 1
  for (const m of plan.moves) {
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
  return { ...p, lift, facing }
}

/** the move under way at t, if any */
const moveAt = (plan: IntroPlan, t: number) => plan.moves.find((m) => t >= m.t0 && t < m.t1) ?? null

function emotionAt(plan: IntroPlan, t: number): EmotionId {
  const b = plan.beats
  if (t < b.look) return 'surprised'
  if (b.header && t < b.header.land) return t < b.header.out ? 'curious' : 'focus'
  const a = b.avatar
  if (t < a.contact + 60) return t < a.fall ? 'curious' : 'surprised'
  if (t < a.settle + 160) return 'happy'
  if (t >= b.leap) return 'happy'
  if (b.product && t >= b.product.rise1 - 120) return 'laugh'
  return 'focus'
}

function gazeAt(plan: IntroPlan, t: number, x: number, y: number): { x: number; y: number } | null {
  const b = plan.beats
  const q = (v: number) => Math.round(Math.max(-1, Math.min(1, v)) * 5) / 5
  const eyes = (px: number, py: number) => ({
    x: q((px - x) / 200),
    y: q((py - (y - plan.headH * 0.55)) / 200)
  })
  if (t >= b.look && t < b.avatar.contact) return { x: 0, y: -1 }
  if (b.stomp !== null && t >= b.stomp - 60 && t < b.stomp + 260) {
    const c = plan.layout.pieces.connect ?? plan.layout.pieces.name
    if (c) return eyes(c.x + c.w / 2, c.y + c.h / 2)
  }
  const K = plan.layout.pieces.card
  if (b.card && K && t >= b.card.land && t < b.card.done) return eyes(K.x + K.w * 0.7, K.y + 20)
  if (b.about && t >= b.about.slide0 && t < b.about.slide1) return { x: 1, y: 0.4 }
  if (b.product && t >= b.product.stomp && t < b.product.rise1) return { x: 0.4, y: 1 }
  if (t >= b.leap - 110 && t < b.land) {
    const A = plan.layout.pieces.avatar!
    return eyes(A.x + A.w / 2, A.y + A.h / 2)
  }
  return null
}

export function actorAt(plan: IntroPlan, t: number): ActorState {
  const { layout, beats: b, S } = plan
  const base = actorBase(plan, t)
  let { x, y, lift } = base
  let facing = base.facing
  let size = S
  let sx = 1
  let sy = 1
  let rot = 0

  // spawn: grow with stretch, then a landing squash
  const grow = t < 90 ? 0 : seg(t, 90, 330, E.outBack(2.2))
  sy += 0.26 * pulse(t, 90, 150) - 0.18 * pulse(t, 300, 140)
  sx += -0.14 * pulse(t, 90, 150) + 0.16 * pulse(t, 300, 140)

  // header pull: lean back on the rope, squash on the tug, relax on landing
  if (b.header) {
    const h = b.header
    rot += -11 * seg(t, h.pull - 20, h.pull + 60, E.out) * (1 - seg(t, h.land - 40, h.land + 80))
    sy += -0.1 * pulse(t, h.pull, 120)
    sx += 0.07 * pulse(t, h.pull, 120)
  }
  // the avatar lands on its head: squash, then a push up
  const a = b.avatar
  const hs = headSquash(plan, t)
  sy *= hs
  sx *= 1 + (1 - hs) * 0.7
  sy += 0.12 * pulse(t, a.toss, 180)
  sx -= 0.06 * pulse(t, a.toss, 180)

  // every move: crouch before take-off (unless still landing from the last
  // one), stretch in the air, squash on landing
  let prevEnd = -Infinity
  for (const m of plan.moves) {
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
  // card: wind up (lean back), then shove (lean in), hold, recover
  if (b.card) {
    const c = b.card
    rot += -7 * pulse(t, c.land + 10, 110)
    rot +=
      13 * seg(t, c.shove - 20, c.shove + 50, E.out) * (1 - seg(t, c.shove + 150, c.shove + 260))
    sx += 0.1 * pulse(t, c.shove - 20, 120)
  }
  // About: hangs on the blind as it slides down
  if (b.about) {
    const s =
      seg(t, b.about.slide0, b.about.slide0 + 80) *
      (1 - seg(t, b.about.slide1 - 60, b.about.slide1))
    sy += 0.08 * s
    sx -= 0.05 * s
    rot += 4 * s
  }
  // Product: stomp, then bumped up a little when the card arrives under its feet
  if (b.product) {
    const p = b.product
    sy += -0.14 * pulse(t, p.stomp, 150)
    sx += 0.1 * pulse(t, p.stomp, 150)
    const bump = p.rise0 + (p.rise1 - p.rise0) * 0.45
    lift += 10 * pulse(t, bump, 180)
  }
  // home: crouch, leap (turning towards the seat), shrink to seat size, sit
  sy += -0.14 * pulse(t, b.leap - 110, 130)
  sx += 0.1 * pulse(t, b.leap - 110, 130)
  const m = moveAt(plan, t)
  if (t >= b.leap) {
    size = lerp(S, layout.seat.w, seg(t, b.leap, b.land, E.inOut))
    if (m) rot += 10 * Math.sin(Math.PI * clamp01((t - m.t0) / (m.t1 - m.t0)))
    sy += -0.16 * pulse(t, b.land, 160)
    sx += 0.12 * pulse(t, b.land, 160)
    facing = 1
  }
  if (t >= b.land) {
    x = plan.seatGround.x
    y = plan.seatGround.y
    lift = 0
    size = layout.seat.w
  }
  sx = Math.max(0.8, Math.min(1.24, sx))
  sy = Math.max(0.8, Math.min(1.24, sy))
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
    emotion: emotionAt(plan, t),
    gaze: gazeAt(plan, t, x, y),
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

/** the one tether: a short throw to the top edge that pulls the header down */
function headerTether(plan: IntroPlan, t: number, home: Point, r: number): TetherState | null {
  const h = plan.beats.header
  const H = plan.layout.pieces.header
  if (!h || !H || t < h.out || t >= h.home) return null
  // the dot holds the header's bottom edge, straight above the dot's home
  const hook = (tt: number) => ({
    x: home.x,
    y: Math.max(4, H.y + H.h + headerTy(plan, tt) - 3)
  })
  if (t < h.pull) {
    const u = seg(t, h.out, h.pull, E.out)
    const tg = hook(h.pull)
    return {
      from: home,
      to: { x: lerp(home.x, tg.x, u), y: lerp(home.y, tg.y, u) },
      slack: 0.4 * (1 - u),
      r
    }
  }
  if (t < h.land) return { from: home, to: hook(t), slack: 0, r }
  const u = seg(t, h.land, h.home, E.in2)
  const tg = hook(h.land)
  return {
    from: home,
    to: { x: lerp(tg.x, home.x, u), y: lerp(tg.y, home.y, u) },
    slack: 0.35 * (1 - u),
    r
  }
}

/* ---------------------------------------------------------------- frame */

export function sampleIntro(plan: IntroPlan, t: number): IntroFrame {
  const actor = actorAt(plan, t)
  const pieces: Partial<Record<PieceId, PieceState>> = {}
  for (const id of plan.cast) pieces[id] = pieceAt(plan, id, t)

  const g = plan.layout.geometry
  const home = actorPoint(plan, actor, g.dot.cx, g.dot.cy)
  const dotR = g.dot.r * (actor.size / g.viewBox.w) * actor.grow
  const tether = headerTether(plan, t, home, dotR)
  if (tether) actor.dotOut = true

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

  return { t, actor, pieces, tether, spawnDot }
}

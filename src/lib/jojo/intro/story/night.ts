import { E, lerp, pulse, seg, type IntroLayout, type PieceId, type Rect } from '../timeline'
import {
  actorAt,
  actorBox,
  bodyOf,
  bubbleAt,
  castOf,
  headTop,
  keyed,
  lineMs,
  route,
  spawnDotAt,
  type ActorTrack,
  type Line,
  type PieceLook,
  type Point,
  type StoryPlan
} from './kit'

/**
 * "Night shift": the lights go out and Jojo is asleep in a small pool of
 * light. A visitor (you) startles it awake; it looks around, flicks the lights
 * on — and the first screen is a mess. Jojo hurries from piece to piece and
 * knocks each back into place, catches its breath, shyly says hello, and hops
 * into its seat.
 */

export interface NightProps {
  zs: Array<{ x: number; y: number; size: number; opacity: number }>
  /** the pool of light Jojo sleeps in */
  glow: { x: number; y: number; r: number; opacity: number }
  /** the "!" when the visitor arrives */
  ping: { x: number; y: number; opacity: number; scale: number }
}

const COPY = {
  zh: ['啊，欢迎！这里是 Joye 的博客。', 'Joye 在墨尔本做 AI Agent，常来玩呀～'],
  en: [
    "Oh! Welcome — this is Joye's blog.",
    'Joye builds AI agents in Melbourne. Come back anytime!'
  ]
}

const PIECES: readonly PieceId[] = [
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
/** how each piece lies around when the lights come on */
const MESS: Partial<Record<PieceId, Partial<PieceLook>>> = {
  avatar: { tx: -14, ty: 22, rot: -16 },
  name: { tx: 26, ty: 30, rot: 9 },
  chip0: { tx: -20, ty: 26, rot: -11 },
  chip1: { tx: 18, ty: 36, rot: 13 },
  connect: { tx: -10, ty: 40, rot: -7 },
  card: { tx: -16, ty: 30, rot: 2.2 }
}
const DARK = 0.97

const right = (...rs: Array<Rect | undefined>) =>
  Math.max(...rs.filter((r): r is Rect => !!r).map((r) => r.x + r.w))
const bottom = (...rs: Array<Rect | undefined>) =>
  Math.max(...rs.filter((r): r is Rect => !!r).map((r) => r.y + r.h))

export function planNight(layout: IntroLayout, zh: boolean): StoryPlan<NightProps> {
  const cast = castOf(layout, PIECES)
  const A = layout.pieces.avatar
  if (!A || !cast.includes('avatar')) throw new Error('night story needs the avatar')
  const body = bodyOf(layout)
  const { S } = body
  const p = (id: PieceId) => (cast.includes(id) ? layout.pieces[id] : undefined)
  const text = COPY[zh ? 'zh' : 'en']

  // asleep in the free space left of the avatar, so the lights come on
  // with the mess in plain view
  const Z = { x: body.clampX(A.x - S * 0.9), y: Math.min(layout.vh - 40, A.y + A.h + S * 0.4) }

  // the tidy-up: hop beside each group, knock it back into place
  const groups: Array<{ ids: PieceId[]; at: Point }> = []
  groups.push({ ids: ['avatar'], at: { x: body.clampX(A.x + A.w + S * 0.6), y: A.y + A.h } })
  const labels = (['name', 'chip0', 'chip1'] as PieceId[]).filter((id) => p(id))
  if (labels.length)
    groups.push({
      ids: labels,
      at: {
        x: body.clampX(right(...labels.map(p)) + S * 0.6),
        y: bottom(...labels.map(p))
      }
    })
  const C = p('connect')
  if (C)
    groups.push({ ids: ['connect'], at: { x: body.clampX(C.x + C.w + S * 0.6), y: C.y + C.h } })
  const K = p('card')
  if (K) groups.push({ ids: ['card'], at: { x: body.clampX(K.x + S * 0.55), y: K.y } })

  const r = route(Z)
  const startle = 2350
  r.move(startle, startle + 340, Z, 40)
  const lights = 3500
  const on = 3900
  const fixAt: Partial<Record<PieceId, number>> = {}
  const shoves: number[] = []
  let t = on + 150
  for (const g of groups) {
    r.move(t, t + 300, g.at, 46)
    const hit = t + 320
    shoves.push(hit)
    g.ids.forEach((id, i) => (fixAt[id] = hit + i * 80))
    t = hit + g.ids.length * 80 + 60
  }
  const done = t + 120
  const lines: Line[] = []
  let lt = done + 300
  for (const s of text) {
    const len = lineMs(s, zh)
    lines.push({ t0: lt, t1: lt + len, text: s })
    lt += len + 120
  }
  const leap = lines[lines.length - 1].t1 - 100
  const land = leap + 560
  r.move(leap, land, body.seatGround, 80)
  const duration = land + 260

  const track: ActorTrack = {
    body,
    spawn: Z,
    spawnAt: 260,
    moves: r.moves,
    leap,
    land,
    emotions: [
      [0, 'sleepy'],
      [startle - 20, 'surprised'],
      [startle + 450, 'puzzled'],
      [lights - 60, 'curious'],
      [lights + 60, 'surprised'],
      [on + 40, 'aggrieved'],
      [on + 150, 'focus'],
      [done, 'happy'],
      [done + 260, 'shy'],
      [lines[1]?.t0 ?? leap, 'happy'],
      [leap, 'celebrate'],
      [land, 'happy']
    ],
    gazes: [
      [startle + 450, startle + 750, { x: -1, y: 0 }],
      [startle + 750, startle + 1050, { x: 1, y: 0 }],
      [lights - 80, on, { x: 0, y: -1 }],
      [done + 260, lines[0]?.t1 ?? leap, { x: 0, y: 0.4 }]
    ],
    pose: (tt) => {
      // breathing while asleep, a reach for the switch, a shove at each piece
      const asleep = tt < startle ? 1 : 0
      let rot = -12 * pulse(tt, lights - 120, 260)
      let sx = asleep * 0.04 * Math.sin(tt / 420)
      let sy = -asleep * 0.06 * Math.sin(tt / 420) - asleep * 0.06
      for (const s of shoves) {
        rot += 12 * pulse(tt, s - 20, 160)
        sx += 0.08 * pulse(tt, s - 20, 160)
      }
      // catching its breath
      sy +=
        0.05 *
        Math.sin((tt - done) / 120) *
        seg(tt, done, done + 100) *
        (1 - seg(tt, done + 500, done + 700))
      return { rot, sx, sy }
    }
  }

  // lights off at once; back on with a fluorescent flicker
  const VEIL: Array<[number, number]> = [
    [0, 0],
    [220, DARK],
    [lights, DARK],
    [lights + 60, 0.3],
    [lights + 120, 0.85],
    [lights + 200, 0.15],
    [lights + 260, 0.6],
    [on, 0]
  ]
  const lightsOn = (tt: number) => 1 - keyed(tt, VEIL) / DARK

  return {
    id: 'night',
    duration,
    cast,
    tone: 'night',
    land,
    sample(tt) {
      const actor = actorAt(track, tt)
      const lit = Math.max(0, Math.min(1, lightsOn(tt)))
      const pieces: Partial<Record<PieceId, PieceLook>> = {}
      for (const id of cast) {
        const m = MESS[id]
        const f = fixAt[id]
        const u = m && f !== undefined ? seg(tt, f, f + 300, E.outBack(1.8)) : 1
        pieces[id] = {
          opacity: tt < lights ? 0 : lit,
          tx: lerp(m?.tx ?? 0, 0, u),
          ty: lerp(m?.ty ?? 0, 0, u),
          rot: lerp(m?.rot ?? 0, 0, u),
          scale: 1
        }
      }
      const head = headTop(track, actor)
      const asleep = 1 - seg(tt, startle - 40, startle + 60)
      return {
        t: tt,
        actor,
        spawnDot: spawnDotAt(track, layout, tt),
        veil: keyed(tt, VEIL),
        pieces,
        bubble: bubbleAt(lines, tt, zh, actorBox(track, actor), () => cast),
        props: {
          zs: [0, 1, 2].map((i) => {
            const c = (tt - 700 - i * 420) / 1260
            const u = c - Math.floor(c)
            const live = tt >= 700 + i * 420 ? asleep : 0
            return {
              x: head.x + S * 0.22 + u * S * 0.35 + i * 4,
              y: head.y - u * S * 0.6,
              size: 12 + i * 3 + u * 6,
              opacity: live * Math.sin(Math.PI * u)
            }
          }),
          glow: {
            x: Z.x,
            y: Z.y - S * 0.35,
            r: S * 1.25,
            opacity: seg(tt, 200, 700) * (1 - seg(tt, lights, on))
          },
          ping: {
            x: head.x + S * 0.3,
            y: head.y - S * 0.15,
            opacity: seg(tt, startle - 80, startle) * (1 - seg(tt, startle + 520, startle + 700)),
            scale: 0.5 + 0.5 * seg(tt, startle - 80, startle + 120, E.outBack(2.4))
          }
        }
      }
    }
  }
}

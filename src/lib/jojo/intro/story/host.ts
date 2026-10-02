import { E, pulse, seg, type IntroLayout, type PieceId } from '../timeline'
import {
  actorAt,
  actorBox,
  AT_REST,
  bodyOf,
  bubbleAt,
  castOf,
  centerOf,
  keyed,
  lineMs,
  litAt,
  route,
  spawnDotAt,
  UNLIT,
  type ActorTrack,
  type Line,
  type PieceLook,
  type StoryPlan
} from './kit'

/**
 * "Jojo hosts": the page dims to a blank stage, Jojo pops out beside the
 * avatar and introduces Joye in a few bubbles; each line lights the part of
 * the page it talks about (who → avatar and name; where and what → Melbourne,
 * the terminal card, About; hobbies → three little badges). Then the lights
 * come up on the rest and Jojo hops into its seat.
 */

export type HobbyKind = 'piano' | 'cello' | 'camera'
export interface HostProps {
  hobbies: Array<{
    kind: HobbyKind
    x: number
    y: number
    opacity: number
    scale: number
    rot: number
  }>
}

const COPY = {
  zh: [
    '嗨，我是 Jojo！',
    '这里是 Joye 的小站。',
    'Joye 在墨尔本读书，做 AI Agent 产品。',
    '平时弹琴、拉大提琴、拍照。',
    '随便逛逛，有事点我～'
  ],
  en: [
    "Hi, I'm Jojo!",
    "This is Joye's little corner of the web.",
    'Joye studies in Melbourne and builds AI agent products.',
    'Off the keyboard: piano, cello, photography.',
    'Look around, and tap me if you need anything.'
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

export function planHost(layout: IntroLayout, zh: boolean): StoryPlan<HostProps> {
  const cast = castOf(layout, PIECES)
  const A = layout.pieces.avatar
  if (!A || !cast.includes('avatar')) throw new Error('host story needs the avatar')
  const body = bodyOf(layout)
  const { S } = body
  const text = COPY[zh ? 'zh' : 'en']
  const K = cast.includes('card') ? layout.pieces.card : undefined
  const B = cast.includes('about') ? layout.pieces.about : undefined

  // beside the avatar, feet level with its bottom edge
  const P1 = { x: body.clampX(A.x + A.w + S * 0.62), y: A.y + A.h }
  // standing on the terminal card's top edge, near its left end (else About's)
  const work = K ?? B
  const P2 = work ? { x: body.clampX(work.x + S * 0.55), y: work.y } : P1

  const lines: Line[] = []
  let t = 760
  const say = (i: number, hold?: number) => {
    const len = lineMs(text[i], zh, hold)
    lines.push({ t0: t, t1: t + len, text: text[i] })
    const at = t
    t += len + 120
    return at
  }

  const r = route(P1)
  const hi = say(0, 700)
  const who = say(1)
  const lit: Partial<Record<PieceId, { t0: number; from?: Partial<PieceLook> }>> = {
    avatar: { t0: who + 80, from: { scale: 0.9 } },
    name: { t0: who + 260, from: { ty: 10 } }
  }
  // hop down to the work
  const hop0 = t
  if (P2 !== P1) {
    r.move(hop0, hop0 + 480, P2, 70)
    t = hop0 + 560
  }
  const what = say(2, 1000)
  lit.chip0 = { t0: what + 120, from: { ty: 10 } }
  lit.card = { t0: what + 500, from: { ty: 10, scale: 0.98 } }
  lit.about = { t0: what + 820, from: { ty: 16 } }
  const play = say(3, 1000)
  const bye = say(4, 700)
  // the lights come up on everything else while Jojo says goodbye
  const up = bye + 200
  const rest: PieceId[] = ['header', 'chip1', 'connect', 'product']
  rest.forEach((id, i) => {
    if (!lit[id]) lit[id] = { t0: up + 90 + i * 90, from: { ty: 10 } }
  })
  const leap = lines[lines.length - 1].t1 - 100
  const land = leap + 560
  r.move(leap, land, body.seatGround, 80)
  const duration = land + 260

  const A0 = centerOf(A)
  const track: ActorTrack = {
    body,
    spawn: P1,
    spawnAt: 300,
    moves: r.moves,
    leap,
    land,
    emotions: [
      [0, 'surprised'],
      [520, 'happy'],
      [who, 'smug'],
      [hop0, 'curious'],
      [what, 'focus'],
      [play, 'laugh'],
      [bye, 'happy'],
      [leap, 'celebrate'],
      [land, 'happy']
    ],
    gazes: [
      [who - 100, who + 900, { x: -1, y: -0.2 }],
      [what, what + 700, { x: 0.6, y: 0.6 }],
      [leap - 120, land, { x: A0.x < P2.x ? -0.6 : 0.6, y: -1 }]
    ],
    // a little wave on "hi", a bounce on each new line
    pose: (tt) => ({
      rot: -8 * pulse(tt, hi + 60, 360) + 6 * pulse(tt, hi + 420, 320),
      sy: lines.reduce((acc, l) => acc + 0.06 * pulse(tt, l.t0, 180), 0)
    })
  }

  // three hobby badges pop up beside Jojo, in a row on the card's top edge
  const kinds: HobbyKind[] = ['piano', 'cello', 'camera']
  const side = P2.x + S * 2.4 < layout.vw ? 1 : -1
  const badges = kinds.map((kind, i) => ({
    kind,
    x: P2.x + side * S * (0.85 + i * 0.55),
    y: P2.y - S * 0.42,
    t0: play + 160 + i * 220
  }))

  return {
    id: 'host',
    duration,
    cast,
    tone: 'page',
    land,
    sample(tt) {
      const actor = actorAt(track, tt)
      const pieces: Partial<Record<PieceId, PieceLook>> = {}
      for (const id of cast) {
        const l = lit[id]
        pieces[id] = l ? litAt(tt, l.t0, l.from) : tt >= up ? { ...AT_REST } : { ...UNLIT }
      }
      const out = seg(tt, up - 200, up + 200)
      return {
        t: tt,
        actor,
        spawnDot: spawnDotAt(track, layout, tt),
        veil: keyed(tt, [
          [0, 0],
          [380, 0.94],
          [up, 0.94],
          [up + 650, 0]
        ]),
        pieces,
        bubble: bubbleAt(lines, tt, zh, actorBox(track, actor), (l) =>
          cast.filter((id) => (lit[id] ? lit[id]!.t0 : up) < l.t1)
        ),
        props: {
          hobbies: badges.map((b) => {
            const u = seg(tt, b.t0, b.t0 + 380, E.outBack(2))
            return {
              kind: b.kind,
              x: b.x,
              y: b.y - 10 * u - 4 * Math.sin((tt - b.t0) / 260),
              opacity: seg(tt, b.t0, b.t0 + 160) * (1 - out),
              scale: 0.4 + 0.6 * u,
              rot: (b.kind === 'cello' ? 8 : -6) * (1 - u)
            }
          })
        }
      }
    }
  }
}

import { E, lerp, pulse, seg, type IntroLayout, type PieceId, type Rect } from '../timeline'
import {
  actorAt,
  AT_REST,
  bodyOf,
  castOf,
  keyed,
  litAt,
  route,
  spawnDotAt,
  UNLIT,
  type ActorTrack,
  type PieceLook,
  type StoryPlan
} from './kit'

/**
 * "whoami": the page dims and only a terminal is left, opened right where the
 * home page's terminal card lives. Jojo pops out on its top edge and types;
 * each answer lights the part of the page it describes (whoami → avatar and
 * name, where → the location chips). `open home` folds the terminal back into
 * the real card, the lights come up, and Jojo hops into its seat.
 */

export interface TermLine {
  kind: 'cmd' | 'out'
  text: string
  /** characters shown so far */
  shown: number
  opacity: number
}
export interface WhoamiProps {
  term: Rect & { opacity: number; scale: number }
  lines: TermLine[]
  /** the line the caret blinks on, or null */
  caret: number | null
  /** px per line, for the runner's layout */
  lineH: number
}

const SCRIPT = {
  zh: [
    ['whoami', 'Joye · AI Agent & Full-Stack Developer'],
    ['cat where.txt', '墨尔本 · 墨尔本大学在读'],
    ['ls projects/', 'playyy.ai  atypica  faishion.ai  goshu'],
    ['ls hobbies/', '钢琴/  大提琴/  摄影/'],
    ['open ~/home', null]
  ],
  en: [
    ['whoami', 'Joye · AI Agent & Full-Stack Developer'],
    ['cat where.txt', 'Melbourne · University of Melbourne'],
    ['ls projects/', 'playyy.ai  atypica  faishion.ai  goshu'],
    ['ls hobbies/', 'piano/  cello/  photography/'],
    ['open ~/home', null]
  ]
} as const

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
/** ms per typed command character */
const KEY_MS = 52

export function planWhoami(layout: IntroLayout, zh: boolean): StoryPlan<WhoamiProps> {
  const cast = castOf(layout, PIECES)
  if (!cast.includes('avatar')) throw new Error('whoami story needs the avatar')
  const body = bodyOf(layout)
  const { S } = body
  const { vw, vh } = layout
  const phone = vw <= 640
  const lineH = phone ? 20 : 22
  const script = SCRIPT[zh ? 'zh' : 'en']

  // the terminal opens where the card is (else mid-screen), never under Skip
  const K = cast.includes('card') ? layout.pieces.card : undefined
  const rows = script.reduce((n, [, out]) => n + (out ? 2 : 1), 0)
  const h = 34 + rows * lineH + 18
  const w = K ? K.w : Math.min(600, vw - 32)
  const x = K ? K.x : (vw - w) / 2
  const floor = Math.min(vh - 16, ...(layout.keepOut ?? []).map((k) => k.y - 12))
  let y = K ? K.y : vh * 0.42
  if (y + h > floor) y = Math.max(16, floor - h)
  const home = K ? { y: K.y, h: K.h } : { y, h }

  // Jojo stands on the terminal's top edge, near its right end
  const P = { x: body.clampX(x + w - S * 0.75), y }
  const r = route(P)

  // the session: each command typed, Enter, its answer
  interface Cmd {
    text: string
    out: string | null
    type0: number
    enter: number
  }
  const cmds: Cmd[] = []
  let t = 1250
  for (const [text, out] of script) {
    const enter = t + text.length * KEY_MS + 140
    cmds.push({ text, out, type0: t, enter })
    t = enter + (out ? 80 + Math.max(750, Array.from(out).length * 26) : 0)
  }
  const last = cmds[cmds.length - 1]
  const fold0 = last.enter + 120
  const fold1 = fold0 + 460
  if (y !== home.y) r.move(fold0, fold1, { x: P.x, y: home.y }, 0, E.inOut)
  const leap = fold1 + 520
  const land = leap + 560
  r.move(leap, land, body.seatGround, 80)
  const duration = land + 260

  const lit: Partial<Record<PieceId, { t0: number; from?: Partial<PieceLook> }>> = {
    avatar: { t0: cmds[0].enter + 160, from: { scale: 0.9 } },
    name: { t0: cmds[0].enter + 320, from: { ty: 10 } },
    chip0: { t0: cmds[1].enter + 160, from: { ty: 10 } },
    chip1: { t0: cmds[1].enter + 300, from: { ty: 10 } },
    card: { t0: fold1 - 160, from: {} }
  }
  const up = fold0 + 120
  const rest: PieceId[] = ['header', 'connect', 'about', 'product']
  rest.forEach((id, i) => (lit[id] = { t0: up + 120 + i * 90, from: { ty: 10 } }))

  const track: ActorTrack = {
    body,
    spawn: P,
    spawnAt: 620,
    moves: r.moves,
    leap,
    land,
    emotions: [
      [0, 'surprised'],
      [900, 'curious'],
      [cmds[0].type0, 'focus'],
      [cmds[0].enter + 80, 'happy'],
      [cmds[1].type0, 'focus'],
      [cmds[1].enter + 80, 'happy'],
      [cmds[2].type0, 'focus'],
      [cmds[2].enter + 80, 'smug'],
      [cmds[3].type0, 'focus'],
      [cmds[3].enter + 80, 'laugh'],
      [last.type0, 'focus'],
      [last.enter, 'celebrate'],
      [land, 'happy']
    ],
    gazes: [
      [900, fold0, { x: -0.8, y: 0.8 }],
      [leap - 120, land, { x: -0.4, y: -1 }]
    ],
    // a bob per key, a stomp on every Enter
    pose: (tt) => {
      let sy = 0
      let sx = 0
      for (const c of cmds) {
        if (tt < c.type0 - 60 || tt > c.enter + 200) continue
        for (let i = 0; i < c.text.length; i++) sy -= 0.035 * pulse(tt, c.type0 + i * KEY_MS, 70)
        sy -= 0.14 * pulse(tt, c.enter, 150)
        sx += 0.1 * pulse(tt, c.enter, 150)
      }
      return { sy, sx }
    }
  }

  return {
    id: 'whoami',
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
      const lines: TermLine[] = []
      let caret: number | null = null
      cmds.forEach((c, i) => {
        // the next prompt shows as soon as the last answer is out
        const appear = i === 0 ? 640 : cmds[i - 1].enter + 280
        if (tt < appear) return
        const typed = Math.floor((tt - c.type0) / KEY_MS) + 1
        lines.push({
          kind: 'cmd',
          text: c.text,
          shown: Math.max(0, Math.min(c.text.length, typed)),
          opacity: 1
        })
        caret = tt < c.enter ? lines.length - 1 : null
        if (c.out && tt >= c.enter + 80) {
          lines.push({
            kind: 'out',
            text: c.out,
            shown: Array.from(c.out).length,
            opacity: seg(tt, c.enter + 80, c.enter + 200)
          })
        }
      })
      // fold: back into the card's own rect, then the real card shows through
      const u = seg(tt, fold0, fold1, E.inOut)
      return {
        t: tt,
        actor,
        spawnDot: spawnDotAt(track, layout, tt),
        veil: keyed(tt, [
          [0, 0],
          [380, 0.95],
          [up, 0.95],
          [up + 600, 0]
        ]),
        pieces,
        bubble: null,
        props: {
          term: {
            x,
            y: lerp(y, home.y, u),
            w,
            h: lerp(h, home.h, u),
            opacity: seg(tt, 320, 560) * (1 - seg(tt, fold1 - 140, fold1 + 80)),
            scale: 0.96 + 0.04 * seg(tt, 320, 640, E.outBack(1.8))
          },
          lines: lines.map((l) => ({
            ...l,
            opacity: l.opacity * (1 - seg(tt, fold0, fold0 + 200))
          })),
          caret: tt < fold0 ? caret : null,
          lineH
        }
      }
    }
  }
}

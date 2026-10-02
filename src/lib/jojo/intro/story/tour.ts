import { E, lerp, pulse, seg, type IntroLayout, type PieceId } from '../motion'
import {
  actorAt,
  actorBox,
  AT_REST,
  bodyOf,
  bubbleAt,
  castOf,
  centerOf,
  headTop,
  keyed,
  litAt,
  route,
  spawnDotAt,
  typeSpeed,
  UNLIT,
  type ActorTrack,
  type Line,
  type PieceLook,
  type Point,
  type StoryPlan
} from './kit'

/**
 * "Night tour": the page opens dark (the head gate paints the dark before the
 * first frame, so the blog never shows first). Jojo dozes in a small pool of
 * light, wakes up because someone is here, switches the light on, and walks
 * the visitor through who Joye is — each line lights what it talks about:
 * avatar and name, Melbourne, the projects (tags that pop out and then file
 * into About), what Joye cares about, the hobbies. Then it hands the page
 * over: the lights come up and Jojo hops into its seat.
 */

export type HobbyKind = 'piano' | 'cello' | 'camera'
export interface TourProps {
  /** the pool of light Jojo sleeps in */
  glow: { x: number; y: number; r: number; opacity: number }
  zs: Array<{ x: number; y: number; size: number; opacity: number }>
  /** the "!" when the visitor arrives */
  ping: { x: number; y: number; opacity: number; scale: number }
  /** the light switching on: a burst from Jojo's signal dot */
  flash: { x: number; y: number; r: number; opacity: number }
  tags: Array<{ text: string; x: number; y: number; opacity: number; scale: number }>
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
  zh: {
    who: '咦，有人来了？',
    hello: '欢迎！我是 Jojo，帮 Joye 看着这个小站。',
    where: 'Joye 在墨尔本大学读书，',
    work: '这几年一直在做 AI Agent 产品：',
    care: '在意 LLM 底层怎么运转，也在意产品能不能真的跑起来。',
    play: '不写代码的时候，弹琴、拉大提琴、拍照。',
    bye: '这些都写在博客里了，慢慢逛，有事戳我～'
  },
  en: {
    who: "Huh — someone's here?",
    hello: "Welcome! I'm Jojo. I look after Joye's little site.",
    where: 'Joye studies at the University of Melbourne,',
    work: 'and has spent the last few years building AI agent products:',
    care: 'curious how LLMs work underneath, and whether products truly hold up.',
    play: 'Away from the keyboard: piano, cello, photography.',
    bye: "It's all in the blog. Look around, and poke me if you need me!"
  }
}
const PROJECTS = ['Playyy.ai', 'atypica', 'fAIshion.ai', 'AIXCut']

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
/** how bright the stage stays while Jojo talks (the page's own colour) */
const STAGE = 0.95

/** a tag's width, estimated (the runner sizes them with the same font) */
const tagW = (text: string, phone: boolean) => text.length * (phone ? 7 : 7.6) + 26

export function planTour(layout: IntroLayout, zh: boolean): StoryPlan<TourProps> {
  const cast = castOf(layout, PIECES)
  const A = layout.pieces.avatar
  if (!A || !cast.includes('avatar')) throw new Error('tour story needs the avatar')
  const body = bodyOf(layout)
  const { S } = body
  const { vw } = layout
  const phone = vw <= 640
  const text = COPY[zh ? 'zh' : 'en']
  const piece = (id: PieceId) => (cast.includes(id) ? layout.pieces[id] : undefined)

  // asleep in the free space left of the avatar
  const Z = { x: body.clampX(A.x - S * 0.9), y: Math.min(layout.vh - 40, A.y + A.h + S * 0.4) }
  // on the terminal card's top edge, near its left end (else About's)
  const work = piece('card') ?? piece('about')
  const P2 = work ? { x: body.clampX(work.x + S * 0.55), y: work.y } : Z

  const r = route(Z)
  const lines: Line[] = []
  let t = 0
  const say = (s: string, hold = 700) => {
    const len = 60 + Array.from(s).length * typeSpeed(zh) + hold
    const line = { t0: t, t1: t + len, text: s }
    lines.push(line)
    t += len + 110
    return line
  }

  // night: dozing, then the visitor arrives
  const spawnAt = 150
  const wake = 1400
  r.move(wake, wake + 320, Z, 36)
  t = wake + 480
  const who = say(text.who, 500)
  // the light: a hop and a burst from the dot, the night lifts
  const lamp = who.t1 + 60
  r.move(lamp, lamp + 300, Z, 30)
  const dawn = lamp + 160
  // the welcome is said on the empty stage; Joye appears as it ends
  t = dawn + 500
  const hello = say(text.hello)
  const lit: Partial<Record<PieceId, { t0: number; from?: Partial<PieceLook> }>> = {
    avatar: { t0: hello.t1 - 60, from: { scale: 0.9 } },
    name: { t0: hello.t1 + 120, from: { ty: 10 } }
  }
  t = hello.t1 + 420
  // down to the work
  if (P2 !== Z) {
    r.move(t, t + 480, P2, 70)
    t += 560
  }
  const where = say(text.where, 350)
  lit.chip0 = { t0: where.t0 + 200, from: { ty: 10 } }
  const work0 = say(text.work, 1300)
  // the projects pop out of Jojo once the line is typed
  const typed = work0.t0 + 60 + Array.from(text.work).length * typeSpeed(zh)
  const care = say(text.care, 850)
  lit.card = { t0: care.t0 + 200, from: { ty: 10, scale: 0.98 } }
  lit.about = { t0: care.t0 + 650, from: { ty: 16 } }
  const play = say(text.play, 850)
  const bye = say(text.bye, 600)
  const up = bye.t0 + 200
  ;(['header', 'chip1', 'connect', 'product'] as PieceId[]).forEach((id, i) => {
    if (!lit[id]) lit[id] = { t0: up + 90 + i * 90, from: { ty: 10 } }
  })
  const leap = bye.t1 + 60
  const land = leap + 560
  r.move(leap, land, body.seatGround, 80)
  const duration = land + 260

  const A0 = centerOf(A)
  const track: ActorTrack = {
    body,
    spawn: Z,
    spawnAt,
    moves: r.moves,
    leap,
    land,
    emotions: [
      [0, 'sleepy'],
      [wake - 20, 'surprised'],
      [who.t0, 'curious'],
      [lamp, 'happy'],
      [hello.t0, 'happy'],
      [where.t0, 'focus'],
      [typed, 'smug'],
      [care.t0, 'think'],
      [play.t0, 'laugh'],
      [bye.t0, 'happy'],
      [leap, 'celebrate'],
      [land, 'happy']
    ],
    gazes: [
      [who.t0, who.t0 + 500, { x: -1, y: 0 }],
      [who.t0 + 500, who.t1, { x: 1, y: 0 }],
      [lamp - 80, lamp + 300, { x: 0, y: -1 }],
      [hello.t1 - 200, hello.t1 + 400, { x: A0.x < Z.x ? -1 : 1, y: -0.3 }],
      [typed, care.t0 + 900, { x: 0.8, y: -0.4 }],
      [leap - 120, land, { x: -0.6, y: -1 }]
    ],
    pose: (tt) => {
      const asleep = tt < wake ? 1 : 0
      // breathing while asleep, a wave on hello, a bounce on each new line
      let sy = -asleep * (0.06 + 0.06 * Math.sin(tt / 420))
      const sx = asleep * 0.04 * Math.sin(tt / 420)
      for (const l of lines) sy += 0.06 * pulse(tt, l.t0, 180)
      const rot = -8 * pulse(tt, hello.t0 + 60, 360) + 6 * pulse(tt, hello.t0 + 420, 320)
      return { sy, sx, rot }
    }
  }

  // project tags pop out at Jojo's feet, in a row (or two on phones) going
  // right, so the side beside Jojo stays free for its bubble
  const x0 = Math.max(12, P2.x - S * 0.45)
  const maxX = vw - 12
  const tagRows: Array<{ text: string; x: number; y: number; w: number }> = []
  let cx = x0
  let row = 0
  for (const name of PROJECTS) {
    const w = tagW(name, phone)
    if (cx + w > maxX && cx > x0) {
      cx = x0
      row++
    }
    tagRows.push({ text: name, x: cx + w / 2, y: P2.y + 22 + row * 32, w })
    cx += w + 8
  }
  const B = piece('about') ?? piece('card')
  const into = B ? { x: B.x + Math.min(B.w * 0.5, 260), y: B.y + 20 } : null
  const file0 = care.t0 + 350

  // hobby badges: at Jojo's feet too, after the tags have gone
  const kinds: HobbyKind[] = ['piano', 'cello', 'camera']
  const badges = kinds.map((kind, i) => ({
    kind,
    x: Math.max(32, P2.x - S * 0.3) + i * 50,
    y: P2.y + 28,
    t0: play.t0 + 260 + i * 220
  }))

  const glowAt: Point = { x: Z.x, y: Z.y - S * 0.35 }
  return {
    duration,
    cast,
    land,
    sample(tt) {
      const actor = actorAt(track, tt)
      const pieces: Partial<Record<PieceId, PieceLook>> = {}
      for (const id of cast) {
        const l = lit[id]
        pieces[id] = l ? litAt(tt, l.t0, l.from) : tt >= up ? { ...AT_REST } : { ...UNLIT }
      }
      const head = headTop(track, actor)
      const asleep = 1 - seg(tt, wake - 40, wake + 60)
      const gone = seg(tt, up - 200, up + 200)
      const dot = { x: head.x - S * 0.12, y: head.y + S * 0.05 }
      return {
        t: tt,
        actor,
        spawnDot: spawnDotAt(track, layout, tt),
        night: 1 - seg(tt, dawn, dawn + 650, E.inOut),
        veil: keyed(tt, [
          [0, STAGE],
          [up, STAGE],
          [up + 650, 0]
        ]),
        pieces,
        bubble: bubbleAt(lines, tt, zh, actorBox(track, actor), (l) =>
          cast.filter((id) => (lit[id] ? lit[id]!.t0 : up) < l.t1)
        ),
        props: {
          glow: {
            ...glowAt,
            r: S * 1.25,
            opacity: seg(tt, 100, 600) * (1 - seg(tt, dawn, dawn + 400))
          },
          zs: [0, 1, 2].map((i) => {
            const c = (tt - 500 - i * 420) / 1260
            const u = c - Math.floor(c)
            const live = tt >= 500 + i * 420 ? asleep : 0
            return {
              x: head.x + S * 0.22 + u * S * 0.35 + i * 4,
              y: head.y - u * S * 0.6,
              size: 12 + i * 3 + u * 6,
              opacity: live * Math.sin(Math.PI * u)
            }
          }),
          ping: {
            x: head.x + S * 0.3,
            y: head.y - S * 0.15,
            opacity: seg(tt, wake - 80, wake) * (1 - seg(tt, wake + 520, wake + 700)),
            scale: 0.5 + 0.5 * seg(tt, wake - 80, wake + 120, E.outBack(2.4))
          },
          flash: {
            ...dot,
            r: lerp(S * 0.1, Math.max(vw, layout.vh) * 0.9, seg(tt, lamp + 120, lamp + 760, E.out)),
            opacity: seg(tt, lamp + 100, lamp + 180) * (1 - seg(tt, lamp + 300, lamp + 760))
          },
          tags: tagRows.map((g, i) => {
            const t0 = typed + 120 + i * 200
            const pop = seg(tt, t0, t0 + 360, E.outBack(2))
            const fly = into ? seg(tt, file0 + i * 70, file0 + 520 + i * 70, E.inOut) : 0
            return {
              text: g.text,
              x: into ? lerp(g.x, into.x, fly) : g.x,
              y: (into ? lerp(g.y, into.y, fly) : g.y) - 6 * pop * (1 - fly),
              opacity:
                seg(tt, t0, t0 + 140) * (1 - seg(tt, file0 + 300 + i * 70, file0 + 560 + i * 70)),
              scale: (0.5 + 0.5 * pop) * (1 - 0.35 * fly)
            }
          }),
          hobbies: badges.map((b) => {
            const u = seg(tt, b.t0, b.t0 + 380, E.outBack(2))
            return {
              kind: b.kind,
              x: b.x,
              y: b.y - 10 * u - 4 * Math.sin((tt - b.t0) / 260),
              opacity: seg(tt, b.t0, b.t0 + 160) * (1 - gone),
              scale: 0.4 + 0.6 * u,
              rot: (b.kind === 'cello' ? 8 : -6) * (1 - u)
            }
          })
        }
      }
    }
  }
}

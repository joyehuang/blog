import { Jojo, type EmotionId } from '@jojo-web/runtime'
import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'

import type { IntroTrigger } from '../../keys'
import { createIntroController, type IntroController } from '../controller'
import { cloneForStage, emitIntro, layoutNow, sharedDeps, STAND_IN } from '../stage'
import type { ActorState, PieceId, Rect } from '../timeline'
import { planHost, type HobbyKind, type HostProps } from './host'
import type { StoryFrame, StoryId, StoryPlan } from './kit'
import { planNight, type NightProps } from './night'
import { planWhoami, type WhoamiProps } from './whoami'

/**
 * Browser side of the story intros. Same contract as the build intro: copies
 * of the pieces on an inert, aria-hidden stage, originals hidden by
 * `visibility` (CSS failsafe in JojoHead.astro), one controller for skip /
 * still / pagehide / watchdog. On top: a veil over the page, a speech bubble
 * and each story's props.
 */

type Measured = NonNullable<ReturnType<typeof layoutNow>>
type AnyProps = HostProps | WhoamiProps | NightProps

const SVG_NS = 'http://www.w3.org/2000/svg'
const HOBBY_PATHS: Record<HobbyKind, string[]> = {
  piano: [
    'M18.5 8c-1.4 0-2.6-.8-3.2-2A6.87 6.87 0 0 0 2 9v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-8.5C22 9.6 20.4 8 18.5 8',
    'M2 14h20',
    'M6 14v4',
    'M10 14v4',
    'M14 14v4',
    'M18 14v4'
  ],
  cello: [
    'M12 2v16',
    'M10 2.5h4',
    'M9.5 9C7.6 9.8 7.5 12 8.6 13.3 7 14.3 6.6 16.6 8 18.3 9.6 20.2 14.4 20.2 16 18.3c1.4-1.7 1-4-.6-5 1.1-1.3 1-3.5-.9-4.3-1.5-.6-3.5-.6-5 0z',
    'M12 20v2.5'
  ],
  camera: [
    'M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z',
    'M12 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'
  ]
}

function icon(paths: string[]) {
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  for (const d of paths) {
    const p = document.createElementNS(SVG_NS, 'path')
    p.setAttribute('d', d)
    svg.appendChild(p)
  }
  return svg
}

function plan(id: StoryId, measured: Measured, zh: boolean): StoryPlan<AnyProps> {
  if (id === 'host') return planHost(measured.layout, zh)
  if (id === 'whoami') return planWhoami(measured.layout, zh)
  return planNight(measured.layout, zh)
}

/** a story's own props layer: built once, updated every frame */
function propsLayer(id: StoryId, layer: HTMLElement): (p: AnyProps) => void {
  if (id === 'host') {
    const badges = new Map<HobbyKind, HTMLDivElement>()
    return (raw) => {
      for (const h of (raw as HostProps).hobbies) {
        let el = badges.get(h.kind)
        if (!el) {
          el = document.createElement('div')
          el.className = 'jojo-story-badge'
          el.appendChild(icon(HOBBY_PATHS[h.kind]))
          layer.appendChild(el)
          badges.set(h.kind, el)
        }
        el.style.transform = `translate3d(${h.x.toFixed(1)}px,${h.y.toFixed(1)}px,0) translate(-50%,-50%) rotate(${h.rot.toFixed(1)}deg) scale(${h.scale.toFixed(3)})`
        el.style.opacity = h.opacity.toFixed(3)
      }
    }
  }
  if (id === 'whoami') {
    const term = document.createElement('div')
    term.className = 'jojo-story-term'
    const bar = document.createElement('div')
    bar.className = 'jojo-story-term-bar'
    for (let i = 0; i < 3; i++) bar.appendChild(document.createElement('i'))
    const body = document.createElement('div')
    body.className = 'jojo-story-term-body'
    term.append(bar, body)
    layer.appendChild(term)
    const rows: Array<{ el: HTMLDivElement; text: HTMLSpanElement; shown: number }> = []
    let caretAt: number | null = -1
    return (raw) => {
      const p = raw as WhoamiProps
      const b = p.term
      term.style.cssText = `left:${b.x}px;top:${b.y.toFixed(1)}px;width:${b.w}px;height:${b.h.toFixed(1)}px;opacity:${b.opacity.toFixed(3)};transform:scale(${b.scale.toFixed(4)})`
      body.style.lineHeight = `${p.lineH}px`
      p.lines.forEach((l, i) => {
        let row = rows[i]
        if (!row) {
          const el = document.createElement('div')
          el.className = `jojo-story-term-line is-${l.kind}`
          const text = document.createElement('span')
          el.appendChild(text)
          body.appendChild(el)
          row = { el, text, shown: -1 }
          rows[i] = row
        }
        if (row.shown !== l.shown) {
          row.shown = l.shown
          row.text.textContent = Array.from(l.text).slice(0, l.shown).join('')
        }
        row.el.style.opacity = l.opacity.toFixed(3)
      })
      if (caretAt !== p.caret) {
        rows.forEach((r, i) => r.el.classList.toggle('has-caret', i === p.caret))
        caretAt = p.caret
      }
    }
  }
  const glow = document.createElement('div')
  glow.className = 'jojo-story-glow'
  const ping = document.createElement('div')
  ping.className = 'jojo-story-ping'
  ping.textContent = '!'
  const zs = [0, 1, 2].map(() => {
    const z = document.createElement('span')
    z.className = 'jojo-story-z'
    z.textContent = 'z'
    return z
  })
  // the glow sits on the veil, under everything else
  layer.prepend(glow)
  layer.append(ping, ...zs)
  return (raw) => {
    const p = raw as NightProps
    const g = p.glow
    glow.style.cssText = `left:${(g.x - g.r).toFixed(1)}px;top:${(g.y - g.r).toFixed(1)}px;width:${(2 * g.r).toFixed(1)}px;height:${(2 * g.r).toFixed(1)}px;opacity:${g.opacity.toFixed(3)}`
    ping.style.transform = `translate3d(${p.ping.x.toFixed(1)}px,${p.ping.y.toFixed(1)}px,0) translate(-50%,-100%) scale(${p.ping.scale.toFixed(3)})`
    ping.style.opacity = p.ping.opacity.toFixed(3)
    p.zs.forEach((z, i) => {
      zs[i].style.transform = `translate3d(${z.x.toFixed(1)}px,${z.y.toFixed(1)}px,0)`
      zs[i].style.fontSize = `${z.size.toFixed(1)}px`
      zs[i].style.opacity = z.opacity.toFixed(3)
    })
  }
}

type Side = 'above' | 'right' | 'left' | 'below'
const SIDES: readonly Side[] = ['above', 'right', 'left', 'below']
const GAP = 12

/** the bubble's box on one side of Jojo, kept inside the viewport */
function placeBubble(side: Side, a: Rect, size: { w: number; h: number }): Rect {
  const vw = window.innerWidth
  const vh = window.innerHeight
  let x: number
  let y: number
  if (side === 'above' || side === 'below') {
    x = a.x + a.w / 2 - size.w / 2
    y = side === 'above' ? a.y - size.h - GAP : a.y + a.h + GAP
  } else {
    x = side === 'right' ? a.x + a.w + GAP : a.x - size.w - GAP
    y = a.y + a.h * 0.45 - size.h / 2
  }
  x = Math.max(12, Math.min(vw - 12 - size.w, x))
  y = Math.max(8, Math.min(vh - 8 - size.h, y))
  return { x, y, w: size.w, h: size.h }
}

const overlap = (a: Rect, b: Rect) => {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
  return w > 0 && h > 0 ? w * h : 0
}

/**
 * The side whose box covers least of the lit pieces (and of Jojo, which
 * clamping can push a side box onto); ties go to the earlier side, so a free
 * "above" always wins.
 */
function pickSide(a: Rect, size: { w: number; h: number }, avoid: PieceId[]): Side {
  const rects = avoid
    .map((id) => document.querySelector<HTMLElement>(`.jojo-intro-piece--${id}`))
    .filter((el): el is HTMLElement => !!el)
    .map((el) => {
      const r = el.style
      return {
        x: parseFloat(r.left),
        y: parseFloat(r.top),
        w: parseFloat(r.width),
        h: parseFloat(r.height)
      }
    })
  let best: Side = 'above'
  let cost = Infinity
  for (const side of SIDES) {
    const box = placeBubble(side, a, size)
    const c = rects.reduce((n, r) => n + overlap(box, r), 0) + overlap(box, a) * 4
    if (c < cost - 1) {
      best = side
      cost = c
    }
  }
  return best
}

export function runStory(
  id: StoryId,
  trigger: IntroTrigger,
  ctx: { zh: boolean; measured: Measured; skipEl: HTMLButtonElement }
): { started: boolean; reason?: string; controller?: IntroController } {
  const { zh, measured, skipEl } = ctx
  const html = document.documentElement
  let story: StoryPlan<AnyProps>
  try {
    story = plan(id, measured, zh)
  } catch {
    return { started: false, reason: 'plan' }
  }
  const { els, seatEl, layout } = measured
  const S = layout.actor
  const g = layout.geometry
  const k = S / g.viewBox.w
  const pivotPx = { x: (g.pivot.x - g.viewBox.x) * k, y: (g.pivot.y - g.viewBox.y) * k }

  let stage: HTMLDivElement | null = null
  let veil: HTMLDivElement | null = null
  let actorBox: HTMLDivElement | null = null
  let actorRoot: Root | null = null
  let spawnDot: HTMLDivElement | null = null
  let bubble: HTMLDivElement | null = null
  let bubbleOn: HTMLSpanElement | null = null
  let bubbleOff: HTMLSpanElement | null = null
  let bubbleId = -1
  let bubbleSize = { w: 0, h: 0 }
  let bubbleShown = -1
  let bubbleSide: Side = 'above'
  let renderProps: ((p: AnyProps) => void) | null = null
  const boxes: Partial<Record<PieceId, HTMLDivElement>> = {}
  const hidden: HTMLElement[] = []
  let shown = ''
  let landed = false
  let touched = false

  const renderActor = (a: ActorState) => {
    const key = `${a.emotion}|${a.gaze ? `${a.gaze.x},${a.gaze.y}` : 'auto'}`
    if (key === shown) return
    shown = key
    actorRoot?.render(
      createElement(Jojo, {
        emotion: a.emotion as EmotionId,
        gaze: a.gaze ?? 'auto',
        size: S,
        framing: 'tight',
        brows: false,
        shadow: false,
        motion: 'full',
        decorative: true,
        idPrefix: 'intro-'
      })
    )
  }

  const mount = () => {
    touched = true
    html.removeAttribute('data-jojo-intro-landed')
    stage = document.createElement('div')
    stage.className = `jojo-intro-stage jojo-story jojo-story--${id}`
    stage.setAttribute('aria-hidden', 'true')
    stage.inert = true
    veil = document.createElement('div')
    veil.className = 'jojo-story-veil'
    veil.dataset.tone = story.tone
    const under = document.createElement('div')
    under.className = 'jojo-story-layer'
    stage.append(veil, under)
    for (const pid of story.cast) {
      const el = els[pid]
      const r = layout.pieces[pid]
      if (!el || !r) continue
      const copy = cloneForStage(el)
      copy.style.margin = '0'
      copy.style.position = 'static'
      copy.style.width = '100%'
      copy.style.height = '100%'
      copy.style.boxSizing = 'border-box'
      const box = document.createElement('div')
      box.className = `jojo-intro-piece jojo-intro-piece--${pid}`
      box.style.cssText = `left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px;opacity:0`
      box.appendChild(copy)
      stage.appendChild(box)
      boxes[pid] = box
    }
    const over = document.createElement('div')
    over.className = 'jojo-story-layer'
    stage.appendChild(over)
    renderProps = propsLayer(id, id === 'night' ? under : over)
    spawnDot = document.createElement('div')
    spawnDot.className = 'jojo-intro-spawn'
    stage.appendChild(spawnDot)
    actorBox = document.createElement('div')
    actorBox.className = 'jojo-intro-actor'
    actorBox.style.cssText = `width:${S}px;height:${S}px;transform-origin:${pivotPx.x}px ${pivotPx.y}px`
    stage.appendChild(actorBox)
    // night: the z's and the "!" float above Jojo
    if (id === 'night') {
      for (const n of Array.from(under.querySelectorAll('.jojo-story-ping, .jojo-story-z')))
        over.appendChild(n)
      stage.appendChild(over)
    }
    bubble = document.createElement('div')
    bubble.className = 'jojo-story-bubble'
    bubbleOn = document.createElement('span')
    bubbleOff = document.createElement('span')
    bubbleOff.className = 'is-off'
    bubble.append(bubbleOn, bubbleOff)
    stage.appendChild(bubble)

    skipEl.addEventListener('click', () => controller.skip())
    document.body.append(stage, skipEl)
    actorRoot = createRoot(actorBox)
    for (const pid of story.cast) {
      const el = els[pid]
      if (el) {
        el.classList.add(STAND_IN)
        hidden.push(el)
      }
    }
    seatEl.classList.add(STAND_IN)
    hidden.push(seatEl)
    html.setAttribute('data-jojo-intro', 'running')
  }

  const unmount = () => {
    for (const el of hidden.splice(0)) el.classList.remove(STAND_IN)
    try {
      actorRoot?.unmount()
    } catch {
      /* already gone */
    }
    actorRoot = null
    stage?.remove()
    skipEl.remove()
    stage = null
    html.setAttribute('data-jojo-intro', 'done')
    html.removeAttribute('data-jojo-intro-trigger')
  }

  const render = (f: StoryFrame<AnyProps>) => {
    if (veil) veil.style.opacity = f.veil.toFixed(3)
    for (const pid of story.cast) {
      const p = f.pieces[pid]
      const box = boxes[pid]
      if (!p || !box) continue
      box.style.transform = `translate3d(${p.tx.toFixed(2)}px,${p.ty.toFixed(2)}px,0) rotate(${p.rot.toFixed(2)}deg) scale(${p.scale.toFixed(4)})`
      box.style.opacity = p.opacity.toFixed(3)
    }
    const a = f.actor
    if (actorBox) {
      const scale = (a.size / S) * a.grow
      actorBox.style.left = `${(a.x - pivotPx.x).toFixed(2)}px`
      actorBox.style.top = `${(a.y - a.lift - pivotPx.y).toFixed(2)}px`
      actorBox.style.transform = `rotate(${a.rot.toFixed(2)}deg) scale(${(a.facing * a.sx * scale).toFixed(4)},${(a.sy * scale).toFixed(4)})`
      actorBox.style.opacity = a.grow > 0.01 ? '1' : '0'
      actorBox.classList.toggle('is-dot-out', !!f.spawnDot)
      renderActor(a)
    }
    if (spawnDot) {
      if (f.spawnDot) {
        const { x, y, r } = f.spawnDot
        spawnDot.style.cssText = `left:${x - r}px;top:${y - r}px;width:${2 * r}px;height:${2 * r}px;opacity:1`
      } else spawnDot.style.opacity = '0'
    }
    if (bubble && bubbleOn && bubbleOff) {
      const b = f.bubble
      if (!b) bubble.style.opacity = '0'
      else {
        const chars = Array.from(b.text)
        if (b.id !== bubbleId) {
          bubbleId = b.id
          bubbleShown = -1
          bubbleOn.textContent = ''
          bubbleOff.textContent = b.text
          // laid out at full length once, so typing never reflows it
          bubbleSize = { w: bubble.offsetWidth, h: bubble.offsetHeight }
          bubbleSide = pickSide(b.actor, bubbleSize, b.avoid)
          bubble.dataset.side = bubbleSide
        }
        if (b.shown !== bubbleShown) {
          bubbleShown = b.shown
          bubbleOn.textContent = chars.slice(0, b.shown).join('')
          bubbleOff.textContent = chars.slice(b.shown).join('')
        }
        const box = placeBubble(bubbleSide, b.actor, bubbleSize)
        bubble.style.left = `${box.x.toFixed(1)}px`
        bubble.style.top = `${box.y.toFixed(1)}px`
        // the tail points at Jojo's head (above/below) or its face (sides)
        const tail =
          bubbleSide === 'above' || bubbleSide === 'below'
            ? Math.max(16, Math.min(box.w - 16, b.actor.x + b.actor.w / 2 - box.x))
            : Math.max(14, Math.min(box.h - 14, b.actor.y + b.actor.h * 0.45 - box.y))
        bubble.style.setProperty('--tail', `${tail.toFixed(1)}px`)
        bubble.style.opacity = b.opacity.toFixed(3)
      }
    }
    renderProps?.(f.props)
    if (!landed && f.t >= story.land) {
      landed = true
      html.setAttribute('data-jojo-intro-landed', '')
      emitIntro({ phase: 'land', trigger })
    }
  }

  const controller: IntroController = createIntroController(
    { duration: story.duration, sample: story.sample, variant: `jojo_${id}` },
    { ...sharedDeps(zh), mount, unmount, render },
    trigger
  )
  controller.start()
  // review builds and dev: hold any frame for inspection
  if (__JOJO_REVIEW__ || import.meta.env.DEV) {
    ;(window as Window & { __jojoIntro?: unknown }).__jojoIntro = {
      story: id,
      duration: story.duration,
      land: story.land,
      cast: story.cast,
      seek: (t: number) => controller.seek(t),
      skip: () => controller.skip()
    }
  }
  return touched ? { started: true, controller } : { started: false, reason: 'hidden', controller }
}

import { Jojo, type EmotionId } from '@jojo-web/runtime'
import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'

import type { IntroTrigger } from '../../keys'
import { createIntroController, type IntroController } from '../controller'
import { cloneForStage, emitIntro, layoutNow, sharedDeps, STAND_IN } from '../stage'
import type { ActorState, PieceId, Rect } from '../timeline'
import type { StoryFrame, StoryId, StoryPlan } from './kit'
import { planTour, type HobbyKind, type TourProps } from './tour'
import { planWhoami, type WhoamiProps } from './whoami'

/**
 * Browser side of the story intros. Same contract as the build intro: copies
 * of the pieces on an inert, aria-hidden stage, originals hidden by
 * `visibility` (CSS failsafe in JojoHead.astro), one controller for skip /
 * still / pagehide / watchdog. On top: a veil over the page (its own colour),
 * a night over everything but Jojo, a speech bubble and each story's props.
 */

type Measured = NonNullable<ReturnType<typeof layoutNow>>
type AnyProps = TourProps | WhoamiProps

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
  if (id === 'whoami') return planWhoami(measured.layout, zh)
  return planTour(measured.layout, zh)
}

const el = (cls: string, text?: string) => {
  const e = document.createElement('div')
  e.className = cls
  if (text) e.textContent = text
  return e
}

/**
 * A story's own props, built once and updated every frame: `under` sits below
 * Jojo, `over` above it.
 */
function propsLayer(id: StoryId, under: HTMLElement, over: HTMLElement): (p: AnyProps) => void {
  if (id === 'whoami') {
    const term = el('jojo-story-term')
    const bar = el('jojo-story-term-bar')
    for (let i = 0; i < 3; i++) bar.appendChild(document.createElement('i'))
    const body = el('jojo-story-term-body')
    term.append(bar, body)
    under.appendChild(term)
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
          const line = el(`jojo-story-term-line is-${l.kind}`)
          const text = document.createElement('span')
          line.appendChild(text)
          body.appendChild(line)
          row = { el: line, text, shown: -1 }
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
  const glow = el('jojo-story-glow')
  const flash = el('jojo-story-flash')
  const ping = el('jojo-story-ping', '!')
  const zs = [0, 1, 2].map(() => el('jojo-story-z', 'z'))
  const tags = new Map<string, HTMLDivElement>()
  const badges = new Map<HobbyKind, HTMLDivElement>()
  under.append(glow, flash)
  over.append(ping, ...zs)
  const circle = (e: HTMLElement, c: { x: number; y: number; r: number; opacity: number }) => {
    e.style.cssText = `left:${(c.x - c.r).toFixed(1)}px;top:${(c.y - c.r).toFixed(1)}px;width:${(2 * c.r).toFixed(1)}px;height:${(2 * c.r).toFixed(1)}px;opacity:${c.opacity.toFixed(3)}`
  }
  const place = (e: HTMLElement, x: number, y: number, extra = '') => {
    e.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) translate(-50%,-50%)${extra}`
  }
  return (raw) => {
    const p = raw as TourProps
    circle(glow, p.glow)
    circle(flash, p.flash)
    ping.style.transform = `translate3d(${p.ping.x.toFixed(1)}px,${p.ping.y.toFixed(1)}px,0) translate(-50%,-100%) scale(${p.ping.scale.toFixed(3)})`
    ping.style.opacity = p.ping.opacity.toFixed(3)
    p.zs.forEach((z, i) => {
      zs[i].style.transform = `translate3d(${z.x.toFixed(1)}px,${z.y.toFixed(1)}px,0)`
      zs[i].style.fontSize = `${z.size.toFixed(1)}px`
      zs[i].style.opacity = z.opacity.toFixed(3)
    })
    for (const g of p.tags) {
      let e = tags.get(g.text)
      if (!e) {
        e = el('jojo-story-tag', g.text)
        under.appendChild(e)
        tags.set(g.text, e)
      }
      place(e, g.x, g.y, ` scale(${g.scale.toFixed(3)})`)
      e.style.opacity = g.opacity.toFixed(3)
    }
    for (const h of p.hobbies) {
      let e = badges.get(h.kind)
      if (!e) {
        e = el('jojo-story-badge')
        e.appendChild(icon(HOBBY_PATHS[h.kind]))
        under.appendChild(e)
        badges.set(h.kind, e)
      }
      place(e, h.x, h.y, ` rotate(${h.rot.toFixed(1)}deg) scale(${h.scale.toFixed(3)})`)
      e.style.opacity = h.opacity.toFixed(3)
    }
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
  let night: HTMLDivElement | null = null
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
    stage.appendChild(veil)
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
    // the night covers the page and its copies, never Jojo or its props
    night = document.createElement('div')
    night.className = 'jojo-story-night'
    const under = document.createElement('div')
    under.className = 'jojo-story-layer'
    const over = document.createElement('div')
    over.className = 'jojo-story-layer'
    renderProps = propsLayer(id, under, over)
    stage.append(night, under)
    spawnDot = document.createElement('div')
    spawnDot.className = 'jojo-intro-spawn'
    stage.appendChild(spawnDot)
    actorBox = document.createElement('div')
    actorBox.className = 'jojo-intro-actor'
    actorBox.style.cssText = `width:${S}px;height:${S}px;transform-origin:${pivotPx.x}px ${pivotPx.y}px`
    stage.append(actorBox, over)
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
    if (night) night.style.opacity = f.night.toFixed(3)
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

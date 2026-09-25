import { trackSiteEvent } from '@/lib/analytics'
import { Jojo, JOJO_GEOMETRY, type EmotionId } from '@jojo-web/runtime'
import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'

import {
  JOJO_EVENTS,
  JOJO_KEYS,
  stillReason,
  watchStill,
  writeStored,
  type IntroEventDetail,
  type IntroTrigger
} from '../keys'
import { createIntroController, type IntroController } from './controller'
import {
  PIECE_IDS,
  planIntro,
  type IntroFrame,
  type IntroLayout,
  type PieceId,
  type Rect
} from './timeline'

/**
 * Browser side of the intro. The real page is never moved: each piece Jojo
 * "rebuilds" is cloned into an inert, aria-hidden layer at its exact on-screen
 * rect, the original is hidden with `visibility` (no layout change, so no
 * CLS), and at the end the clones sit exactly on the originals, which simply
 * reappear. The hidden state has a pure-CSS failsafe (see JojoIntro.astro), so
 * even a dead script cannot leave the page hidden.
 */

const STAND_IN = 'jojo-intro-stand-in'
let active: IntroController | null = null

const rectOf = (el: Element): Rect => {
  const r = el.getBoundingClientRect()
  return { x: r.left, y: r.top, w: r.width, h: r.height }
}

function piece(id: PieceId): HTMLElement | null {
  if (id === 'header') return document.querySelector('header-component')
  // the two label chips (location, GitHub) move on their own
  if (id === 'chip0' || id === 'chip1')
    return document.querySelector(
      `[data-jojo-piece="labels"] > :nth-child(${id === 'chip0' ? 1 : 2})`
    )
  return document.querySelector(`[data-jojo-piece="${id}"]`)
}

/**
 * Styles that only reach an element through its id (`#toggleDarkMode
 * .theme-icon`, `#headerExpandContent`) or its custom-element tag
 * (`header-component`) would be lost on the copy, which drops ids and swaps
 * custom elements for divs. The r2 recording showed exactly that: the theme
 * toggle's three stacked icons fell out of their absolute layering and stood
 * in a column. So those elements (and everything inside an id'd element) get
 * their computed style inlined first, while the copy still mirrors the
 * original node for node.
 */
function freezeScopedStyles(orig: Element, copy: Element) {
  const pairs: Array<[Element, Element, boolean]> = [[orig, copy, false]]
  while (pairs.length) {
    const [o, c, inScope] = pairs.pop()!
    const scoped = inScope || o.hasAttribute('id')
    if ((scoped || o.tagName.includes('-')) && 'style' in c) {
      const cs = getComputedStyle(o)
      const style = (c as HTMLElement | SVGElement).style
      for (let i = 0; i < cs.length; i++) {
        const p = cs[i]
        if (p.startsWith('transition')) continue
        style.setProperty(p, cs.getPropertyValue(p))
      }
      style.setProperty('transition', 'none')
    }
    const oc = o.children
    const cc = c.children
    for (let i = 0; i < oc.length && i < cc.length; i++) pairs.push([oc[i], cc[i], scoped])
  }
}

/** a visual copy that cannot run, hydrate, submit, be focused or be read */
function cloneForStage(el: HTMLElement): HTMLElement {
  const copy = el.cloneNode(true) as HTMLElement
  freezeScopedStyles(el, copy)
  const swap = (node: Element) => {
    // custom elements (header-component, astro-island, …) would upgrade and
    // run their own code; plain divs with the same classes look the same
    if (!node.tagName.includes('-')) return node
    const div = document.createElement('div')
    for (const a of Array.from(node.attributes)) div.setAttribute(a.name, a.value)
    while (node.firstChild) div.appendChild(node.firstChild)
    node.replaceWith(div)
    return div
  }
  let root: Element = copy
  if (copy.tagName.includes('-')) {
    const holder = document.createElement('div')
    holder.appendChild(copy)
    root = swap(copy)
  }
  root.querySelectorAll('*').forEach((n) => {
    if (n.tagName === 'SCRIPT' || n.tagName === 'TEMPLATE') n.remove()
    else swap(n)
  })
  for (const n of [root, ...Array.from(root.querySelectorAll('*'))]) {
    n.removeAttribute('id')
    n.removeAttribute('for')
    n.removeAttribute('data-jojo-piece')
    n.removeAttribute('data-jojo-seat')
    // page scripts find the real card by this; the copy must not be found
    n.removeAttribute('data-hd-frame')
    if (n.hasAttribute('tabindex')) n.setAttribute('tabindex', '-1')
  }
  return root as HTMLElement
}

/**
 * Measure only a settled page: an entrance animation still moving a piece's
 * ancestor (the `.animate` fade-in-up on #content-header / #content) would put
 * every stand-in off its original. The entry waits for them (bounded); any
 * still running here are finished so the rects are final.
 */
function settleEntrance(els: Array<HTMLElement | undefined>) {
  const seen = new Set<Element>()
  for (const el of els) {
    for (let n: Element | null = el?.parentElement ?? null; n; n = n.parentElement) {
      if (seen.has(n)) break
      seen.add(n)
      if (!n.classList.contains('animate')) continue
      for (const a of n.getAnimations()) {
        try {
          a.finish()
        } catch {
          /* infinite or already gone */
        }
      }
    }
  }
}

function layoutNow(): {
  layout: IntroLayout
  els: Partial<Record<PieceId, HTMLElement>>
  seatEl: HTMLElement
} | null {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const els: Partial<Record<PieceId, HTMLElement>> = {}
  const pieces: Partial<Record<PieceId, Rect>> = {}
  settleEntrance(PIECE_IDS.map((id) => piece(id) ?? undefined))
  for (const id of PIECE_IDS) {
    const el = piece(id)
    if (!el) continue
    const r = rectOf(el)
    if (r.w < 1 || r.h < 1) continue
    els[id] = el
    pieces[id] = r
  }
  const seatEl = document.querySelector<HTMLElement>('[data-jojo-seat]')
  const seatSvg = seatEl?.querySelector('svg')
  if (!seatEl || !seatSvg || !els.avatar) return null
  const seat = rectOf(seatSvg)
  if (seat.w < 8) return null
  return {
    layout: {
      vw,
      vh,
      pieces,
      seat,
      actor: vw <= 640 ? 60 : 76,
      geometry: {
        viewBox: JOJO_GEOMETRY.viewBox.tight,
        pivot: JOJO_GEOMETRY.pivot,
        dot: JOJO_GEOMETRY.dot
      }
    },
    els,
    seatEl
  }
}

function emit(detail: IntroEventDetail) {
  document.dispatchEvent(new CustomEvent(JOJO_EVENTS.intro, { detail }))
}

export type RunResult = { started: boolean; reason?: string; controller?: IntroController }

export function runIntro(trigger: IntroTrigger): RunResult {
  const html = document.documentElement
  // the entry (JojoIntro.astro) already refused before loading this chunk;
  // checked again here so no caller can start a run while Jojo must stay still
  const still = stillReason()
  if (still) return { started: false, reason: still }
  if (active?.state === 'running') return { started: false, reason: 'running' }
  const zh = html.lang !== 'en'
  if (window.scrollY > 40) return { started: false, reason: 'scrolled' }
  const measured = layoutNow()
  if (!measured) return { started: false, reason: 'layout' }
  let plan
  try {
    plan = planIntro(measured.layout)
  } catch {
    return { started: false, reason: 'plan' }
  }
  const { els, seatEl, layout } = measured
  const S = layout.actor
  const g = layout.geometry
  const k = S / g.viewBox.w
  const pivotPx = { x: (g.pivot.x - g.viewBox.x) * k, y: (g.pivot.y - g.viewBox.y) * k }

  let stage: HTMLDivElement | null = null
  let skipBtn: HTMLButtonElement | null = null
  let actorBox: HTMLDivElement | null = null
  let actorRoot: Root | null = null
  let tetherPath: SVGPathElement | null = null
  let tetherDot: SVGCircleElement | null = null
  let tetherSvg: SVGSVGElement | null = null
  let ripple: HTMLDivElement | null = null
  let spawnDot: HTMLDivElement | null = null
  const boxes: Partial<Record<PieceId, HTMLDivElement>> = {}
  const hidden: HTMLElement[] = []
  let shownEmotion: EmotionId | null = null
  let shownGaze = ''
  let landed = false
  let touched = false

  const renderActor = (emotion: EmotionId, gaze: { x: number; y: number } | null) => {
    const key = gaze ? `${gaze.x},${gaze.y}` : 'auto'
    if (emotion === shownEmotion && key === shownGaze) return
    shownEmotion = emotion
    shownGaze = key
    actorRoot?.render(
      createElement(Jojo, {
        emotion,
        gaze: gaze ?? 'auto',
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
    stage.className = 'jojo-intro-stage'
    stage.setAttribute('aria-hidden', 'true')
    stage.inert = true
    for (const id of plan.cast) {
      const el = els[id]
      const r = layout.pieces[id]
      if (!el || !r) continue
      const box = document.createElement('div')
      box.className = `jojo-intro-piece jojo-intro-piece--${id}`
      box.style.cssText = `left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px`
      const copy = cloneForStage(el)
      copy.style.margin = '0'
      copy.style.position = 'static'
      copy.style.width = '100%'
      copy.style.height = '100%'
      copy.style.boxSizing = 'border-box'
      box.appendChild(copy)
      stage.appendChild(box)
      boxes[id] = box
    }
    ripple = document.createElement('div')
    ripple.className = 'jojo-intro-ripple'
    stage.appendChild(ripple)
    const svgNS = 'http://www.w3.org/2000/svg'
    tetherSvg = document.createElementNS(svgNS, 'svg')
    tetherSvg.setAttribute('class', 'jojo-intro-tether')
    tetherSvg.setAttribute('width', String(layout.vw))
    tetherSvg.setAttribute('height', String(layout.vh))
    tetherPath = document.createElementNS(svgNS, 'path')
    tetherDot = document.createElementNS(svgNS, 'circle')
    tetherSvg.append(tetherPath, tetherDot)
    stage.appendChild(tetherSvg)
    spawnDot = document.createElement('div')
    spawnDot.className = 'jojo-intro-spawn'
    stage.appendChild(spawnDot)
    actorBox = document.createElement('div')
    actorBox.className = 'jojo-intro-actor'
    actorBox.style.cssText = `width:${S}px;height:${S}px;transform-origin:${pivotPx.x}px ${pivotPx.y}px`
    stage.appendChild(actorBox)

    skipBtn = document.createElement('button')
    skipBtn.type = 'button'
    skipBtn.className = 'jojo-intro-skip'
    skipBtn.textContent = zh ? '跳过' : 'Skip'
    skipBtn.setAttribute('aria-label', zh ? '跳过开场动画' : 'Skip the intro animation')
    skipBtn.addEventListener('click', () => controller.skip())

    document.body.append(stage, skipBtn)
    actorRoot = createRoot(actorBox)
    renderActor('surprised', null)
    // hide the originals only now that their stand-ins are in place
    for (const id of plan.cast) {
      const el = els[id]
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
    skipBtn?.remove()
    stage = null
    skipBtn = null
    html.setAttribute('data-jojo-intro', 'done')
    html.removeAttribute('data-jojo-intro-trigger')
  }

  const render = (f: IntroFrame) => {
    for (const id of plan.cast) {
      const p = f.pieces[id]
      const box = boxes[id]
      if (!p || !box) continue
      box.style.transform = `translate3d(${p.tx.toFixed(2)}px,${p.ty.toFixed(2)}px,0) rotate(${p.rot.toFixed(2)}deg) scale(${p.scale.toFixed(4)},${(p.scale * p.sy).toFixed(4)})`
      box.style.opacity = p.opacity.toFixed(3)
    }
    const a = f.actor
    if (actorBox) {
      const scale = (a.size / S) * a.grow
      actorBox.style.left = `${(a.x - pivotPx.x).toFixed(2)}px`
      actorBox.style.top = `${(a.y - a.lift - pivotPx.y).toFixed(2)}px`
      actorBox.style.transform = `rotate(${a.rot.toFixed(2)}deg) scale(${(a.facing * a.sx * scale).toFixed(4)},${(a.sy * scale).toFixed(4)})`
      actorBox.style.opacity = a.grow > 0.01 ? '1' : '0'
      actorBox.classList.toggle('is-dot-out', a.dotOut || !!f.spawnDot)
      renderActor(a.emotion, a.gaze)
    }
    if (tetherPath && tetherDot && tetherSvg) {
      if (f.tether) {
        const { from, to, slack, r } = f.tether
        const mx = (from.x + to.x) / 2
        const my =
          (from.y + to.y) / 2 +
          slack * Math.min(120, Math.hypot(to.x - from.x, to.y - from.y) * 0.25)
        tetherPath.setAttribute(
          'd',
          `M${from.x.toFixed(1)},${from.y.toFixed(1)} Q${mx.toFixed(1)},${my.toFixed(1)} ${to.x.toFixed(1)},${to.y.toFixed(1)}`
        )
        tetherDot.setAttribute('cx', to.x.toFixed(1))
        tetherDot.setAttribute('cy', to.y.toFixed(1))
        tetherDot.setAttribute('r', Math.max(2, r).toFixed(2))
        tetherSvg.style.opacity = '1'
      } else tetherSvg.style.opacity = '0'
    }
    if (spawnDot) {
      if (f.spawnDot) {
        const { x, y, r } = f.spawnDot
        spawnDot.style.cssText = `left:${x - r}px;top:${y - r}px;width:${2 * r}px;height:${2 * r}px;opacity:1`
      } else spawnDot.style.opacity = '0'
    }
    if (ripple) {
      if (f.ripple) {
        const { x, y, r, opacity } = f.ripple
        ripple.style.cssText = `left:${x - r}px;top:${y - r}px;width:${2 * r}px;height:${2 * r}px;opacity:${opacity.toFixed(3)}`
      } else ripple.style.opacity = '0'
    }
    // tell the seat Jojo to be happy before it is revealed, so the handoff matches
    if (!landed && f.t >= plan.beats.land + 420) {
      landed = true
      html.setAttribute('data-jojo-intro-landed', '')
      emit({ phase: 'land', trigger })
    }
  }

  const page = location.pathname
  const locale = zh ? 'zh' : 'en'
  const controller: IntroController = createIntroController(
    plan,
    {
      now: () => performance.now(),
      raf: (cb) => requestAnimationFrame(cb),
      caf: (id) => cancelAnimationFrame(id),
      setTimeout: (cb, ms) => window.setTimeout(cb, ms),
      clearTimeout: (id) => window.clearTimeout(id),
      mount,
      unmount,
      render,
      emit,
      track: (event, props) => trackSiteEvent(event, { locale, page, ...props }),
      markSeen: () => {
        writeStored(JOJO_KEYS.intro, String(Date.now()))
      },
      isHidden: () => document.visibilityState === 'hidden',
      still: () => stillReason(),
      onStillChange: (cb) => watchStill(cb),
      scrollY: () => window.scrollY,
      on: (target, type, handler, options) => {
        const t = target === 'window' ? window : document
        t.addEventListener(type, handler, options)
        return () => t.removeEventListener(type, handler, options)
      }
    },
    trigger
  )
  active = controller
  controller.start()
  if (__JOJO_REVIEW__) {
    ;(window as Window & { __jojoIntro?: unknown }).__jojoIntro = {
      duration: plan.duration,
      beats: plan.beats,
      cast: plan.cast,
      knock: plan.knock,
      spring: plan.spring,
      jobs: plan.jobs,
      seek: (t: number) => controller.seek(t),
      skip: () => controller.skip()
    }
  }
  // refused (still) or hidden before mounting: the page was never touched and
  // the caller must settle it; once mounted, unmount() settles it
  return touched
    ? { started: true, controller }
    : { started: false, reason: stillReason() ?? 'hidden', controller }
}

/** the running intro, if any (review tools / tests) */
export function activeIntro() {
  return active
}

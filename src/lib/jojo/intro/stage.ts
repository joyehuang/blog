import { trackSiteEvent } from '@/lib/analytics'
import { JOJO_GEOMETRY } from '@jojo-web/runtime'

import {
  JOJO_EVENTS,
  JOJO_KEYS,
  stillReason,
  watchStill,
  writeStored,
  type IntroEventDetail
} from '../keys'
import type { IntroDeps } from './controller'
import { PIECE_IDS, type IntroLayout, type PieceId, type Rect } from './motion'

/**
 * What every intro shares about the real page: finding the pieces, measuring
 * a settled first screen and making inert visual copies of pieces. The real
 * page is never moved: a piece an intro animates is cloned into an inert,
 * aria-hidden layer at its exact on-screen rect and the original is hidden
 * with `visibility` (no layout change, so no CLS); at the end the clones sit
 * exactly on the originals, which simply reappear. The hidden state has a
 * pure-CSS failsafe (see JojoHead.astro), so even a dead script cannot leave
 * the page hidden.
 */

export const STAND_IN = 'jojo-intro-stand-in'

export const rectOf = (el: Element): Rect => {
  const r = el.getBoundingClientRect()
  return { x: r.left, y: r.top, w: r.width, h: r.height }
}

export function piece(id: PieceId): HTMLElement | null {
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
export function cloneForStage(el: HTMLElement): HTMLElement {
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

export function layoutNow(): {
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
      // big enough to be the one thing to watch (the avatar is 112 px)
      actor: vw <= 640 ? 80 : 100,
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

/**
 * The Skip button, measured before the run: CSS places it (a corner on
 * phones), and its rect is a keep-out Jojo never enters.
 */
export function makeSkip(zh: boolean): { el: HTMLButtonElement; rect: Rect | null } {
  const el = document.createElement('button')
  el.type = 'button'
  el.className = 'jojo-intro-skip'
  el.textContent = zh ? '跳过' : 'Skip'
  el.setAttribute('aria-label', zh ? '跳过开场动画' : 'Skip the intro animation')
  el.style.visibility = 'hidden'
  document.body.appendChild(el)
  const rect = rectOf(el)
  el.remove()
  el.style.removeProperty('visibility')
  return { el, rect: rect.w > 0 ? rect : null }
}

export function emitIntro(detail: IntroEventDetail) {
  document.dispatchEvent(new CustomEvent(JOJO_EVENTS.intro, { detail }))
}

/** controller deps every intro shares (timing, input, storage, analytics) */
export function sharedDeps(zh: boolean) {
  const page = location.pathname
  const locale = zh ? 'zh' : 'en'
  return {
    now: () => performance.now(),
    raf: (cb: () => void) => requestAnimationFrame(cb),
    caf: (id: number) => cancelAnimationFrame(id),
    setTimeout: (cb: () => void, ms: number) => window.setTimeout(cb, ms),
    clearTimeout: (id: number) => window.clearTimeout(id),
    emit: emitIntro,
    track: (event: string, props: Record<string, string | number | null>) =>
      trackSiteEvent(event, { locale, page, ...props }),
    markSeen: () => {
      writeStored(JOJO_KEYS.intro, String(Date.now()))
    },
    isHidden: () => document.visibilityState === 'hidden',
    still: () => stillReason(),
    onStillChange: (cb: () => void) => watchStill(cb),
    scrollY: () => window.scrollY,
    on: (
      target: 'window' | 'document',
      type: string,
      handler: (e: Event) => void,
      options?: AddEventListenerOptions
    ) => {
      const t = target === 'window' ? window : document
      t.addEventListener(type, handler, options)
      return () => t.removeEventListener(type, handler, options)
    }
  } satisfies Partial<IntroDeps<unknown>>
}

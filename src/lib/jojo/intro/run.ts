import { Jojo, type EmotionId } from '@jojo-web/runtime'
import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'

import { stillReason, type IntroTrigger } from '../keys'
import { buildScript, createIntroController, type IntroController } from './controller'
import {
  cloneForStage,
  emitIntro as emit,
  layoutNow,
  makeSkip,
  sharedDeps,
  STAND_IN
} from './stage'
import { pickStory } from './story/pick'
import { runStory } from './story/run'
import { planIntro, type Inset, type IntroFrame, type PieceId } from './timeline'

/**
 * Browser side of the build-the-site intro (stage helpers: ./stage.ts).
 */

let active: IntroController | null = null

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
  const { el: skipEl, rect: skipRect } = makeSkip(zh)
  if (skipRect) measured.layout.keepOut = [skipRect]
  const story = pickStory()
  if (story !== 'build') {
    const r = runStory(story, trigger, { zh, measured, skipEl })
    if (r.controller) active = r.controller
    return r
  }
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
  let spawnDot: HTMLDivElement | null = null
  const boxes: Partial<Record<PieceId, HTMLDivElement>> = {}
  const ghosts: Partial<Record<PieceId, HTMLDivElement>> = {}
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
    // blueprints under everything, then the solids; later pieces sit on top
    // (the avatar drops out from under the header)
    const solidOrder: PieceId[] = [...plan.cast].reverse()
    const made: Partial<Record<PieceId, HTMLElement>> = {}
    const frame = (id: PieceId, copy: HTMLElement, kind: 'ghost' | 'solid') => {
      const r = layout.pieces[id]!
      const box = document.createElement('div')
      box.className = `jojo-intro-piece jojo-intro-${kind} jojo-intro-piece--${id}`
      box.style.cssText = `left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px`
      copy.style.margin = '0'
      copy.style.position = 'static'
      copy.style.width = '100%'
      copy.style.height = '100%'
      copy.style.boxSizing = 'border-box'
      box.appendChild(copy)
      return box
    }
    for (const id of plan.cast) {
      const el = els[id]
      if (!el || !layout.pieces[id]) continue
      made[id] = cloneForStage(el)
      const ghost = frame(id, made[id]!.cloneNode(true) as HTMLElement, 'ghost')
      stage.appendChild(ghost)
      ghosts[id] = ghost
    }
    for (const id of solidOrder) {
      const copy = made[id]
      if (!copy) continue
      const box = frame(id, copy, 'solid')
      stage.appendChild(box)
      boxes[id] = box
    }
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

    skipBtn = skipEl
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
    const inset = (c: Inset | null) =>
      c
        ? `inset(${c.t.toFixed(1)}px ${c.r.toFixed(1)}px ${c.b.toFixed(1)}px ${c.l.toFixed(1)}px)`
        : 'none'
    for (const id of plan.cast) {
      const p = f.pieces[id]
      const box = boxes[id]
      const ghost = ghosts[id]
      if (!p || !box || !ghost) continue
      box.style.transform = `translate3d(${p.tx.toFixed(2)}px,${p.ty.toFixed(2)}px,0) rotate(${p.rot.toFixed(2)}deg) scale(${p.scale.toFixed(4)})`
      box.style.opacity = p.opacity.toFixed(3)
      box.style.clipPath = inset(p.clip)
      ghost.style.opacity = p.ghost.toFixed(3)
      ghost.style.clipPath = inset(p.ghostClip)
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
    // tell the seat Jojo to be happy before it is revealed, so the handoff matches
    if (!landed && f.t >= plan.beats.land) {
      landed = true
      html.setAttribute('data-jojo-intro-landed', '')
      emit({ phase: 'land', trigger })
    }
  }

  const controller: IntroController = createIntroController(
    buildScript(plan),
    { ...sharedDeps(zh), mount, unmount, render },
    trigger
  )
  active = controller
  controller.start()
  if (__JOJO_REVIEW__) {
    ;(window as Window & { __jojoIntro?: unknown }).__jojoIntro = {
      duration: plan.duration,
      beats: plan.beats,
      cast: plan.cast,
      pop: plan.pop,
      keepOut: layout.keepOut ?? [],
      moves: plan.moves.map(({ t0, t1, from, to, h }) => ({ t0, t1, from, to, h })),
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

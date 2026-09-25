import type { IntroEventDetail, IntroOutcome, IntroTrigger } from '../keys'
import { sampleIntro, type IntroFrame, type IntroPlan } from './timeline'

/**
 * Lifecycle of one intro run. Everything with side effects is injected, so the
 * rules below are unit-tested without a browser:
 *
 *  - start() remembers the intro as seen *first* (an abandoned intro still
 *    counts, so a returning visitor is never shown it again), then mounts the
 *    visual layer; a failed mount ends the run and restores the page.
 *  - Any sign that the visitor wants the page — a key, a pointer press, a
 *    wheel, touch or any other scroll — skips. Nothing is prevented: the key, click or
 *    scroll still happens, on the restored page.
 *  - Hidden tab or pagehide ends the run at once (bfcache returns show the
 *    finished page); a watchdog ends it if frames stop arriving.
 *  - end() is idempotent and never throws; unmount() always runs.
 */
export interface IntroDeps {
  now(): number
  raf(cb: () => void): number
  caf(id: number): void
  setTimeout(cb: () => void, ms: number): number
  clearTimeout(id: number): void
  /** build the visual layer and stand the clones in for the real pieces */
  mount(): void
  /** remove the layer and restore every real piece; must be idempotent */
  unmount(): void
  render(frame: IntroFrame): void
  emit(detail: IntroEventDetail): void
  track(
    event: 'intro_start' | 'intro_complete' | 'intro_skip' | 'intro_abandon',
    props: Record<string, string | number | null>
  ): void
  markSeen(): void
  isHidden(): boolean
  /** current vertical scroll offset */
  scrollY(): number
  /** subscribe; returns an unsubscribe */
  on(
    target: 'window' | 'document',
    type: string,
    handler: (e: Event) => void,
    options?: AddEventListenerOptions
  ): () => void
}

export type IntroState = 'idle' | 'running' | 'done'

export interface IntroController {
  readonly state: IntroState
  readonly outcome: IntroOutcome | null
  start(): void
  skip(): void
  /** stop without analytics (e.g. replaced by a replay) */
  destroy(): void
  /** review/QA only: hold the run at `t` ms (no frames, no watchdog) until skip/destroy */
  seek(t: number): void
}

export const WATCHDOG_EXTRA_MS = 2500

export function createIntroController(
  plan: IntroPlan,
  deps: IntroDeps,
  trigger: IntroTrigger
): IntroController {
  let state: IntroState = 'idle'
  let outcome: IntroOutcome | null = null
  let t0 = 0
  let frame = 0
  let watchdog = 0
  const offs: Array<() => void> = []
  const source = trigger === 'replay' ? 'replay' : 'first_visit'
  const base = { surface: 'intro_overlay', source, variant: 'jojo_build', trigger }

  const elapsed = () => Math.max(0, Math.round(deps.now() - t0))

  function end(result: IntroOutcome, analytics: 'complete' | 'skip' | 'abandon' | null) {
    if (state !== 'running') return
    state = 'done'
    outcome = result
    const duration = elapsed()
    if (frame) deps.caf(frame)
    frame = 0
    if (watchdog) deps.clearTimeout(watchdog)
    watchdog = 0
    for (const off of offs.splice(0)) {
      try {
        off()
      } catch {
        /* keep cleaning */
      }
    }
    try {
      deps.unmount()
    } catch {
      /* unmount is best-effort by contract; the CSS failsafe covers the rest */
    }
    deps.emit({ phase: 'end', outcome: result, trigger })
    try {
      if (analytics === 'complete')
        deps.track('intro_complete', { ...base, target: 'content', duration_ms: duration })
      if (analytics === 'skip')
        deps.track('intro_skip', { ...base, target: 'skip', duration_ms: duration })
      if (analytics === 'abandon')
        deps.track('intro_abandon', { ...base, target: 'pagehide', duration_ms: duration })
    } catch {
      /* analytics never breaks the page */
    }
  }

  function tick() {
    frame = 0
    if (state !== 'running') return
    const t = deps.now() - t0
    if (t >= plan.duration) {
      try {
        deps.render(sampleIntro(plan, plan.duration))
      } catch {
        /* final frame is cosmetic */
      }
      end('complete', 'complete')
      return
    }
    try {
      deps.render(sampleIntro(plan, t))
    } catch {
      end('error', null)
      return
    }
    frame = deps.raf(tick)
  }

  const skip = () => end('skip', 'skip')

  return {
    get state() {
      return state
    },
    get outcome() {
      return outcome
    },
    start() {
      if (state !== 'idle') return
      deps.markSeen()
      if (deps.isHidden()) {
        state = 'done'
        outcome = 'abort'
        return
      }
      state = 'running'
      t0 = deps.now()
      try {
        deps.mount()
        deps.render(sampleIntro(plan, 0))
      } catch {
        end('error', null)
        return
      }
      deps.emit({ phase: 'start', trigger })
      try {
        deps.track('intro_start', { ...base, target: 'animation' })
      } catch {
        /* ignore */
      }
      const opts = { capture: true, passive: true }
      const y0 = deps.scrollY()
      offs.push(
        deps.on('document', 'keydown', skip, opts),
        deps.on('document', 'pointerdown', skip, opts),
        deps.on('window', 'wheel', skip, opts),
        deps.on('window', 'touchmove', skip, opts),
        // any scroll (anchor jump, restoration, keyboard) moves the real page
        // under the fixed stage: hand the page back rather than misalign
        deps.on(
          'window',
          'scroll',
          () => {
            if (Math.abs(deps.scrollY() - y0) > 8) skip()
          },
          opts
        ),
        deps.on('document', 'visibilitychange', () => {
          if (deps.isHidden()) end('abort', null)
        }),
        deps.on('window', 'pagehide', () => end('abort', 'abandon'))
      )
      watchdog = deps.setTimeout(() => end('error', null), plan.duration + WATCHDOG_EXTRA_MS)
      frame = deps.raf(tick)
    },
    skip,
    destroy() {
      end('abort', null)
    },
    seek(t: number) {
      if (state !== 'running') return
      if (frame) deps.caf(frame)
      frame = 0
      if (watchdog) deps.clearTimeout(watchdog)
      watchdog = 0
      try {
        deps.render(sampleIntro(plan, Math.max(0, Math.min(plan.duration, t))))
      } catch {
        end('error', null)
      }
    }
  }
}

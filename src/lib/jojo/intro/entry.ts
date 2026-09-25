import type { IntroEventDetail, IntroTrigger } from '../keys'

/**
 * Every way into the intro — the head gate's first-visit / `?jojo-intro=play`
 * arm, the dock's replay, the review pill — goes through here, and here is
 * where "Jojo must stay still" (reduced motion / Save-Data) is decided *before*
 * the heavy chunk (React actor + timeline) is fetched. A refusal never touches
 * the page, never marks the intro seen, and always leaves `data-jojo-intro` on
 * `done` (never `armed`), so the dock and the promo popout do not wait forever.
 * `runIntro` checks again at the actual start, and the controller ends a run if
 * reduced motion / Save-Data switches on mid-way.
 */
export interface IntroEntryDeps {
  root: Pick<Element, 'getAttribute' | 'setAttribute' | 'removeAttribute'>
  still(): string | null
  /** the current mode includes the intro (scheme C) */
  hasIntro(): boolean
  load(): Promise<{
    runIntro(trigger: IntroTrigger): { started: boolean; reason?: string }
  }>
  emit(detail: IntroEventDetail): void
  /** fonts + avatar ready (bounded) */
  ready(): Promise<void>
  now(): number
  scrollY(): number
  scrollToTop(): void
  raf(cb: () => void): void
}

export const LATEST_START_MS = 3200

export function createIntroEntry(deps: IntroEntryDeps) {
  const { root } = deps

  const release = () => {
    root.setAttribute('data-jojo-intro', 'done')
    root.removeAttribute('data-jojo-intro-trigger')
  }
  /** not played for an ordinary reason (late, scrolled, chunk or layout failure) */
  const settle = (trigger: IntroTrigger) => {
    release()
    deps.emit({ phase: 'end', outcome: 'abort', trigger })
  }
  /** not allowed to play: nothing ran, nothing to react to */
  const refuse = (trigger: IntroTrigger, reason: string) => {
    if (trigger !== 'replay') release()
    deps.emit({ phase: 'refused', trigger, reason })
  }

  async function play(trigger: IntroTrigger) {
    const before = deps.still()
    if (before) return refuse(trigger, before)
    try {
      const { runIntro } = await deps.load()
      const r = runIntro(trigger)
      if (r.started) return
      const still = deps.still()
      if (still) refuse(trigger, still)
      else if (trigger !== 'replay') settle(trigger)
    } catch {
      // chunk failed to load: the page was never touched
      if (trigger !== 'replay') settle(trigger)
    }
  }

  return {
    play,
    /** head gate armed this visit: wait for the page, then play or stand down */
    async boot() {
      if (root.getAttribute('data-jojo-intro') !== 'armed') return
      const trigger = (root.getAttribute('data-jojo-intro-trigger') ?? 'first_visit') as
        | 'first_visit'
        | 'url'
      await deps.ready()
      // too late to be an intro: the visitor is already reading
      const late = trigger === 'first_visit' && deps.now() > LATEST_START_MS
      if (late || deps.scrollY() > 40) settle(trigger)
      else await play(trigger)
    },
    /** dock / review "replay" */
    replay() {
      if (!deps.hasIntro()) return
      const still = deps.still()
      // refuse before scrolling or loading anything
      if (still) return refuse('replay', still)
      if (deps.scrollY() > 0) deps.scrollToTop()
      deps.raf(() => void play('replay'))
    }
  }
}

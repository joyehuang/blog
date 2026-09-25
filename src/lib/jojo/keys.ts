// Storage keys and DOM event names shared by every Jojo surface. Keys are
// versioned so a future redesign can re-show something once.
export const JOJO_KEYS = {
  /** the build-the-site intro has been shown (or started) in this browser */
  intro: 'joye:jojo:intro:v1',
  /** the identity-slot greeting has played (used when the intro did not) */
  hello: 'joye:jojo:hello:v1',
  /** dock: 'tucked' when the visitor sent Jojo to the edge */
  dock: 'joye:jojo:dock:v1',
  /** Preview review mode (sessionStorage, review builds only) */
  reviewMode: 'joye:jojo:review-mode'
} as const

export const JOJO_EVENTS = {
  /** detail: IntroEventDetail — the intro changed phase */
  intro: 'jojo:intro',
  /** ask the intro to play again (dock / review panel) */
  introReplay: 'jojo:intro-replay',
  /** detail: { status: StatusId | null } — review-only chat state preview */
  reviewStatus: 'jojo:review-status'
} as const

export type IntroOutcome = 'complete' | 'skip' | 'abort' | 'error'
export interface IntroEventDetail {
  /** `refused`: asked to play but not allowed (reduced motion / Save-Data); nothing ran */
  phase: 'start' | 'land' | 'end' | 'refused'
  outcome?: IntroOutcome
  trigger: IntroTrigger
  reason?: string
}
export type IntroTrigger = 'first_visit' | 'url' | 'replay'

/** Jojo surfaces a build can show: a = identity slots, b = dock, c = intro. */
export type JojoMode = 'abc' | 'a' | 'b' | 'c' | 'off'
export const JOJO_MODES: readonly JojoMode[] = ['abc', 'a', 'b', 'c', 'off']

export function modeHas(mode: string | undefined | null, part: 'a' | 'b' | 'c'): boolean {
  const m = (mode ?? 'abc') as JojoMode
  return m !== 'off' && m.includes(part)
}

export function currentMode(): JojoMode {
  const m = globalThis.document?.documentElement.getAttribute('data-jojo-mode')
  return (JOJO_MODES as readonly string[]).includes(m ?? '') ? (m as JojoMode) : 'abc'
}

/** localStorage read that reports "unavailable" as `undefined` instead of throwing. */
export function readStored(key: string, storage?: Storage): string | null | undefined {
  try {
    return (storage ?? globalThis.localStorage).getItem(key)
  } catch {
    return undefined
  }
}

export function writeStored(key: string, value: string | null, storage?: Storage): boolean {
  try {
    const s = storage ?? globalThis.localStorage
    if (value === null) s.removeItem(key)
    else s.setItem(key, value)
    return true
  } catch {
    return false
  }
}

export function prefersReducedMotion(
  w: Pick<Window, 'matchMedia'> | undefined = globalThis.window
) {
  try {
    return !!w?.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

export function saveData(nav: Navigator | undefined = globalThis.navigator): boolean {
  const c = (nav as (Navigator & { connection?: { saveData?: boolean } }) | undefined)?.connection
  return !!c?.saveData
}

/**
 * Why Jojo must stay still right now, or null. Reduced motion and Save-Data
 * both mean: no intro (first visit, URL, replay, review — every entry), no
 * greeting, no pointer-follow; a tap may still swap to a static face.
 */
export type StillReason = 'reduced-motion' | 'save-data'
export function stillReason(
  w: Pick<Window, 'matchMedia'> | undefined = globalThis.window,
  nav: Navigator | undefined = globalThis.navigator
): StillReason | null {
  if (prefersReducedMotion(w)) return 'reduced-motion'
  if (saveData(nav)) return 'save-data'
  return null
}

type Changeable = { addEventListener?: EventTarget['addEventListener'] } & EventTarget

/** calls `cb` whenever the still reason may have changed; returns an unsubscribe */
export function watchStill(
  cb: () => void,
  w: Pick<Window, 'matchMedia'> | undefined = globalThis.window,
  nav: Navigator | undefined = globalThis.navigator
): () => void {
  const offs: Array<() => void> = []
  try {
    const mq = w?.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (mq?.addEventListener) {
      mq.addEventListener('change', cb)
      offs.push(() => mq.removeEventListener('change', cb))
    }
  } catch {
    // no matchMedia: nothing to watch
  }
  const conn = (nav as (Navigator & { connection?: Changeable }) | undefined)?.connection
  if (conn?.addEventListener) {
    conn.addEventListener('change', cb)
    offs.push(() => conn.removeEventListener('change', cb))
  }
  return () => {
    for (const off of offs.splice(0)) off()
  }
}

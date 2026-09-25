import type { EmotionId, GazeInput } from '@jojo-web/runtime'

/**
 * Plays a short run of faces on a Jojo whose engine may still be downloading.
 * The download is async and the component can unmount, or the visitor can do
 * something newer, before it lands; so every play() is a request, and only the
 * latest request of a live player may touch state or create timers:
 *
 *  - a newer play() / set() / cancel() supersedes an older one still loading;
 *  - dispose() (unmount) drops every pending request and timer for good;
 *  - a failed download plays nothing (the static frame stays — no pretend
 *    reaction on a Jojo that cannot show it).
 *
 * The final step always settles back to `calm`.
 */
export type Step = { emotion: EmotionId; ms: number; gaze?: GazeInput }

export interface StepPlayerDeps {
  /** resolves when the engine is ready; rejects if it cannot load */
  load(): Promise<unknown>
  apply(step: { emotion: EmotionId; gaze?: GazeInput }): void
  setTimeout(cb: () => void, ms: number): number
  clearTimeout(id: number): void
}

export type PlayResult = 'played' | 'superseded' | 'disposed' | 'failed'

export function createStepPlayer(deps: StepPlayerDeps) {
  let seq = 0
  let disposed = false
  let timers: number[] = []

  const clear = () => {
    for (const t of timers) deps.clearTimeout(t)
    timers = []
  }
  /** invalidate anything pending and stop the current run */
  const cancel = () => {
    seq++
    clear()
  }

  return {
    async play(steps: Step[]): Promise<PlayResult> {
      if (disposed) return 'disposed'
      const mine = ++seq
      clear()
      try {
        await deps.load()
      } catch {
        return disposed ? 'disposed' : mine === seq ? 'failed' : 'superseded'
      }
      if (disposed) return 'disposed'
      if (mine !== seq) return 'superseded'
      let at = 0
      for (const s of steps) {
        timers.push(deps.setTimeout(() => deps.apply(s), at))
        at += s.ms
      }
      timers.push(deps.setTimeout(() => deps.apply({ emotion: 'calm' }), at))
      return 'played'
    },
    /** show one face now (and stop whatever was playing or loading) */
    set(emotion: EmotionId) {
      if (disposed) return
      cancel()
      deps.apply({ emotion })
    },
    cancel,
    dispose() {
      disposed = true
      cancel()
    },
    get pending() {
      return timers.length
    }
  }
}

/**
 * A once-per-page loader that forgets a failed attempt, so the next intent can
 * retry instead of inheriting a cached rejection forever.
 */
export function createLoader<T>(importer: () => Promise<T>) {
  let loading: Promise<T> | null = null
  return () => {
    loading ??= importer().catch((e: unknown) => {
      loading = null
      throw e
    })
    return loading
  }
}

import type { EmotionId } from '@jojo-web/runtime'

/**
 * Poke reactions for an identity-slot or dock Jojo. Pure: the caller owns the
 * clock and the randomness. Pokes 1–4 in a streak pick a random reaction; the
 * 5th turns aggrieved, then sleepy, and Jojo ignores pokes for a cooldown. A
 * streak resets after a quiet gap. No speech bubble, no live-region
 * announcement — it is a visual easter egg only.
 */
export const POKE_REACTIONS: readonly EmotionId[] = ['surprised', 'laugh', 'shy', 'curious']
export const POKE = {
  /** ms a reaction holds before settling back */
  hold: 650,
  /** the 5th poke's aggrieved face, then sleepy */
  aggrievedHold: 900,
  sleepyHold: 1500,
  /** no reaction while cooling down after the 5th */
  cooldown: 3000,
  /** a streak ends after this much quiet */
  streakGap: 2500,
  limit: 5
} as const

export interface PokeState {
  count: number
  lastAt: number
  coolUntil: number
  lastReaction: EmotionId | null
}

export type PokeStep = { emotion: EmotionId; ms: number }
export interface PokeResult {
  state: PokeState
  /** faces to show in order; empty when the poke was ignored (cooldown) */
  steps: PokeStep[]
  ignored: boolean
}

export const initialPoke = (): PokeState => ({
  count: 0,
  lastAt: -Infinity,
  coolUntil: -Infinity,
  lastReaction: null
})

export function poke(
  state: PokeState,
  now: number,
  random: () => number = Math.random
): PokeResult {
  if (now < state.coolUntil) return { state, steps: [], ignored: true }
  const count = now - state.lastAt > POKE.streakGap ? 1 : state.count + 1
  if (count >= POKE.limit) {
    return {
      state: {
        count: 0,
        lastAt: now,
        coolUntil: now + POKE.aggrievedHold + POKE.sleepyHold + POKE.cooldown,
        lastReaction: 'aggrieved'
      },
      steps: [
        { emotion: 'aggrieved', ms: POKE.aggrievedHold },
        { emotion: 'sleepy', ms: POKE.sleepyHold }
      ],
      ignored: false
    }
  }
  // random, but never the same face twice in a row
  const pool = POKE_REACTIONS.filter((e) => e !== state.lastReaction)
  const emotion = pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))]
  return {
    state: { count, lastAt: now, coolUntil: state.coolUntil, lastReaction: emotion },
    steps: [{ emotion, ms: POKE.hold }],
    ignored: false
  }
}

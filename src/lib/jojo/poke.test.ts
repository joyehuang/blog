import { describe, expect, it } from 'bun:test'

import { initialPoke, poke, POKE, POKE_REACTIONS } from './poke'

describe('poke', () => {
  it('pokes 1–4 react with one of four faces, never the same twice in a row', () => {
    let s = initialPoke()
    let prev: string | null = null
    for (let i = 0; i < 4; i++) {
      const r = poke(s, 1000 + i * 300, () => 0)
      expect(r.ignored).toBe(false)
      expect(r.steps).toHaveLength(1)
      expect(POKE_REACTIONS).toContain(r.steps[0].emotion)
      expect(r.steps[0].emotion).not.toBe(prev)
      prev = r.steps[0].emotion
      s = r.state
    }
  })

  it('the 5th poke turns aggrieved then sleepy, then ignores pokes for the cooldown', () => {
    let s = initialPoke()
    for (let i = 0; i < 4; i++) s = poke(s, i * 200).state
    const fifth = poke(s, 800)
    expect(fifth.steps.map((x) => x.emotion)).toEqual(['aggrieved', 'sleepy'])
    s = fifth.state
    const quiet = 800 + POKE.aggrievedHold + POKE.sleepyHold + POKE.cooldown
    expect(poke(s, quiet - 1).ignored).toBe(true)
    const after = poke(s, quiet + 1)
    expect(after.ignored).toBe(false)
    expect(after.state.count).toBe(1)
  })

  it('a quiet gap starts a new streak', () => {
    let s = initialPoke()
    for (let i = 0; i < 4; i++) s = poke(s, i * 200).state
    const later = poke(s, 600 + POKE.streakGap + 1)
    expect(later.state.count).toBe(1)
    expect(later.steps[0].emotion).not.toBe('aggrieved')
  })
})

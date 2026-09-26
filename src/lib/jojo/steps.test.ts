import { describe, expect, it } from 'bun:test'

import { createLoader, createStepPlayer, type Step } from './steps'

function harness() {
  let resolve!: () => void
  let reject!: (e: Error) => void
  let pending = new Promise<void>((res, rej) => {
    resolve = res
    reject = rej
  })
  const applied: string[] = []
  const timers = new Map<number, () => void>()
  let nextId = 1
  const player = createStepPlayer({
    load: () => pending,
    apply: (s) => applied.push(s.emotion),
    setTimeout: (cb) => {
      const id = nextId++
      timers.set(id, cb)
      return id
    },
    clearTimeout: (id) => void timers.delete(id)
  })
  return {
    player,
    applied,
    timers,
    resolve: () => resolve(),
    reject: () => reject(new Error('offline')),
    reset() {
      pending = new Promise<void>((res, rej) => {
        resolve = res
        reject = rej
      })
    },
    runTimers() {
      for (const [id, cb] of [...timers]) {
        timers.delete(id)
        cb()
      }
    }
  }
}

const hop: Step[] = [{ emotion: 'surprised', ms: 650 }]

describe('step player', () => {
  it('plays once the engine is ready, then settles to calm', async () => {
    const h = harness()
    const p = h.player.play(hop)
    expect(h.timers.size).toBe(0)
    h.resolve()
    expect(await p).toBe('played')
    h.runTimers()
    expect(h.applied).toEqual(['surprised', 'calm'])
  })

  it('unmount before the download lands: no timer, no state change, ever', async () => {
    const h = harness()
    const p = h.player.play(hop)
    h.player.dispose()
    h.resolve()
    expect(await p).toBe('disposed')
    expect(h.timers.size).toBe(0)
    expect(h.applied).toEqual([])
    expect(await h.player.play(hop)).toBe('disposed')
    expect(h.timers.size).toBe(0)
  })

  it('unmount mid-run clears the timers it created', async () => {
    const h = harness()
    h.resolve()
    await h.player.play(hop)
    expect(h.timers.size).toBe(2)
    h.player.dispose()
    expect(h.timers.size).toBe(0)
  })

  it('a newer request supersedes an older one still loading', async () => {
    const h = harness()
    const older = h.player.play([{ emotion: 'laugh', ms: 650 }])
    const newer = h.player.play([{ emotion: 'shy', ms: 650 }])
    h.resolve()
    expect(await older).toBe('superseded')
    expect(await newer).toBe('played')
    h.runTimers()
    expect(h.applied).toEqual(['shy', 'calm'])
  })

  it('set() (e.g. the intro landing) beats a reaction still loading', async () => {
    const h = harness()
    const late = h.player.play(hop)
    h.player.set('happy')
    h.resolve()
    expect(await late).toBe('superseded')
    expect(h.timers.size).toBe(0)
    expect(h.applied).toEqual(['happy'])
  })

  it('a failed download plays nothing (no pretend reaction)', async () => {
    const h = harness()
    const p = h.player.play(hop)
    h.reject()
    expect(await p).toBe('failed')
    expect(h.timers.size).toBe(0)
    expect(h.applied).toEqual([])
  })
})

describe('engine loader', () => {
  it('shares one fetch and retries after a failure', async () => {
    let calls = 0
    let fail = true
    const load = createLoader(async () => {
      calls++
      if (fail) throw new Error('offline')
      return 'engine'
    })
    const a = load()
    expect(load()).toBe(a)
    await expect(a).rejects.toThrow('offline')
    fail = false
    expect(await load()).toBe('engine')
    expect(await load()).toBe('engine')
    expect(calls).toBe(2)
  })
})

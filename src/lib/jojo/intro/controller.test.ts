import { describe, expect, it } from 'bun:test'

import { createIntroController, WATCHDOG_EXTRA_MS, type IntroDeps } from './controller'
import { planIntro, type IntroLayout } from './timeline'

const layout: IntroLayout = {
  vw: 1440,
  vh: 900,
  actor: 76,
  geometry: {
    viewBox: { x: 230, y: 228, w: 795, h: 760 },
    pivot: { x: 627.5, y: 958 },
    dot: { cx: 501, cy: 297, r: 53 }
  },
  seat: { x: 764, y: 196, w: 48, h: 48 },
  pieces: {
    header: { x: 160, y: 16, w: 1120, h: 56 },
    avatar: { x: 664, y: 120, w: 112, h: 112 },
    name: { x: 670, y: 260, w: 100, h: 36 }
  }
}

function harness(
  opts: { mountThrows?: boolean; renderThrowsAt?: number; hidden?: boolean; still?: string } = {}
) {
  let clock = 0
  let nextId = 1
  const rafs = new Map<number, () => void>()
  const timers = new Map<number, { at: number; cb: () => void }>()
  const listeners = new Map<string, Set<(e: Event) => void>>()
  const log: string[] = []
  const tracked: Array<[string, Record<string, unknown>]> = []
  let mounted = 0
  let unmounted = 0
  let hidden = !!opts.hidden
  let scroll = 0
  let still: string | null = opts.still ?? null
  const stillWatchers = new Set<() => void>()
  const deps: IntroDeps = {
    now: () => clock,
    raf: (cb) => {
      const id = nextId++
      rafs.set(id, cb)
      return id
    },
    caf: (id) => void rafs.delete(id),
    setTimeout: (cb, ms) => {
      const id = nextId++
      timers.set(id, { at: clock + ms, cb })
      return id
    },
    clearTimeout: (id) => void timers.delete(id),
    mount: () => {
      if (opts.mountThrows) throw new Error('mount failed')
      mounted++
    },
    unmount: () => {
      unmounted++
    },
    render: (f) => {
      if (opts.renderThrowsAt !== undefined && f.t >= opts.renderThrowsAt) throw new Error('boom')
    },
    emit: (d) => log.push(`${d.phase}:${d.outcome ?? ''}`),
    track: (e, p) => tracked.push([e, p]),
    markSeen: () => log.push('seen'),
    isHidden: () => hidden,
    still: () => still,
    onStillChange: (cb) => {
      stillWatchers.add(cb)
      return () => stillWatchers.delete(cb)
    },
    scrollY: () => scroll,
    on: (target, type, handler) => {
      const k = `${target}:${type}`
      if (!listeners.has(k)) listeners.set(k, new Set())
      listeners.get(k)!.add(handler)
      return () => listeners.get(k)!.delete(handler)
    }
  }
  const runDue = () => {
    for (const [id, t] of [...timers]) {
      if (t.at > clock) continue
      timers.delete(id)
      t.cb()
    }
  }
  const frame = (ms = 16) => {
    clock += ms
    const cbs = [...rafs.values()]
    rafs.clear()
    for (const cb of cbs) cb()
    runDue()
  }
  const advanceNoFrames = (ms: number) => {
    clock += ms
    runDue()
  }
  const fire = (target: 'window' | 'document', type: string) => {
    for (const h of [...(listeners.get(`${target}:${type}`) ?? [])]) h(new Event(type))
  }
  const listenerCount = () =>
    [...listeners.values()].reduce((n, s) => n + s.size, 0) + stillWatchers.size
  return {
    deps,
    log,
    tracked,
    frame,
    advanceNoFrames,
    fire,
    listenerCount,
    rafs,
    timers,
    get mounted() {
      return mounted
    },
    get unmounted() {
      return unmounted
    },
    setHidden(v: boolean) {
      hidden = v
    },
    setScroll(v: number) {
      scroll = v
    },
    setStill(v: string | null, notify = true) {
      still = v
      if (notify) for (const cb of [...stillWatchers]) cb()
    }
  }
}

const plan = planIntro(layout)

describe('intro controller', () => {
  it('plays to completion, then cleans up everything once', () => {
    const h = harness()
    const c = createIntroController(plan, h.deps, 'first_visit')
    c.start()
    expect(h.log.slice(0, 2)).toEqual(['seen', 'start:'])
    expect(h.listenerCount()).toBe(8)
    for (let i = 0; i < 400 && c.state === 'running'; i++) h.frame(16)
    expect(c.state).toBe('done')
    expect(c.outcome).toBe('complete')
    expect(h.unmounted).toBe(1)
    expect(h.listenerCount()).toBe(0)
    expect(h.rafs.size).toBe(0)
    expect(h.timers.size).toBe(0)
    expect(h.tracked.map(([e]) => e)).toEqual(['intro_start', 'intro_complete'])
    const done = h.tracked[1][1]
    expect(done.variant).toBe('jojo_build')
    expect(done.source).toBe('first_visit')
    expect(Number(done.duration_ms)).toBeGreaterThanOrEqual(plan.duration)
  })

  it('marks the intro seen before anything can fail', () => {
    const h = harness({ mountThrows: true })
    const c = createIntroController(plan, h.deps, 'first_visit')
    c.start()
    expect(h.log[0]).toBe('seen')
    expect(c.outcome).toBe('error')
    expect(h.unmounted).toBe(1)
    expect(h.listenerCount()).toBe(0)
    expect(h.tracked).toEqual([])
  })

  for (const [target, type] of [
    ['document', 'keydown'],
    ['document', 'pointerdown'],
    ['window', 'wheel'],
    ['window', 'touchmove']
  ] as const) {
    it(`skips on ${type} and restores the page`, () => {
      const h = harness()
      const c = createIntroController(plan, h.deps, 'first_visit')
      c.start()
      h.frame(16)
      h.frame(16)
      h.fire(target, type)
      expect(c.outcome).toBe('skip')
      expect(h.unmounted).toBe(1)
      expect(h.listenerCount()).toBe(0)
      expect(h.tracked.map(([e]) => e)).toEqual(['intro_start', 'intro_skip'])
      // a second skip or a late frame does nothing
      c.skip()
      h.frame(16)
      expect(h.unmounted).toBe(1)
    })
  }

  it('ends at once when the tab is hidden, without abandon analytics', () => {
    const h = harness()
    const c = createIntroController(plan, h.deps, 'first_visit')
    c.start()
    h.frame(16)
    h.setHidden(true)
    h.fire('document', 'visibilitychange')
    expect(c.outcome).toBe('abort')
    expect(h.unmounted).toBe(1)
    expect(h.tracked.map(([e]) => e)).toEqual(['intro_start'])
  })

  it('reports abandon on pagehide, once', () => {
    const h = harness()
    const c = createIntroController(plan, h.deps, 'first_visit')
    c.start()
    h.frame(16)
    h.fire('window', 'pagehide')
    h.fire('window', 'pagehide')
    expect(h.tracked.map(([e]) => e)).toEqual(['intro_start', 'intro_abandon'])
    expect(c.outcome).toBe('abort')
  })

  it('a watchdog ends a run whose frames stopped arriving', () => {
    const h = harness()
    const c = createIntroController(plan, h.deps, 'first_visit')
    c.start()
    h.advanceNoFrames(plan.duration + WATCHDOG_EXTRA_MS + 1)
    expect(c.outcome).toBe('error')
    expect(h.unmounted).toBe(1)
    expect(h.listenerCount()).toBe(0)
  })

  it('a render error mid-run restores the page', () => {
    const h = harness({ renderThrowsAt: 300 })
    const c = createIntroController(plan, h.deps, 'first_visit')
    c.start()
    for (let i = 0; i < 40; i++) h.frame(16)
    expect(c.outcome).toBe('error')
    expect(h.unmounted).toBe(1)
  })

  it('does not start in a hidden tab but still remembers it', () => {
    const h = harness({ hidden: true })
    const c = createIntroController(plan, h.deps, 'first_visit')
    c.start()
    expect(h.log).toEqual(['seen'])
    expect(h.mounted).toBe(0)
    expect(c.state).toBe('done')
  })

  it('replays report source=replay; destroy is silent and idempotent', () => {
    const h = harness()
    const c = createIntroController(plan, h.deps, 'replay')
    c.start()
    expect(h.tracked[0][1].source).toBe('replay')
    c.destroy()
    c.destroy()
    expect(h.unmounted).toBe(1)
    expect(h.tracked.length).toBe(1)
  })
  it('seek holds a frame: no more frames or watchdog until skip', () => {
    const h = harness()
    const c = createIntroController(plan, h.deps, 'first_visit')
    c.start()
    c.seek(1200)
    expect(h.rafs.size).toBe(0)
    expect(h.timers.size).toBe(0)
    h.advanceNoFrames(plan.duration * 3)
    expect(c.state).toBe('running')
    c.skip()
    expect(c.outcome).toBe('skip')
    expect(h.listenerCount()).toBe(0)
  })
  it('a scroll that really moves the page skips; a no-op scroll event does not', () => {
    const h = harness()
    const c = createIntroController(plan, h.deps, 'first_visit')
    c.start()
    h.fire('window', 'scroll')
    expect(c.state).toBe('running')
    h.setScroll(4)
    h.fire('window', 'scroll')
    expect(c.state).toBe('running')
    h.setScroll(60)
    h.fire('window', 'scroll')
    expect(c.outcome).toBe('skip')
  })

  for (const reason of ['reduced-motion', 'save-data']) {
    it(`refuses to start under ${reason}: nothing mounted, not remembered as seen`, () => {
      const h = harness({ still: reason })
      const c = createIntroController(plan, h.deps, 'replay')
      c.start()
      expect(c.state).toBe('done')
      expect(h.mounted).toBe(0)
      expect(h.unmounted).toBe(0)
      expect(h.log).toEqual([])
      expect(h.tracked).toEqual([])
      expect(h.rafs.size).toBe(0)
      expect(h.timers.size).toBe(0)
      expect(h.listenerCount()).toBe(0)
    })
  }

  it('reduced motion switched on mid-run ends it and restores the page', () => {
    const h = harness()
    const c = createIntroController(plan, h.deps, 'replay')
    c.start()
    h.frame(16)
    h.setStill(null) // a change that is not "still" keeps it running
    expect(c.state).toBe('running')
    h.setStill('reduced-motion')
    expect(c.outcome).toBe('abort')
    expect(h.unmounted).toBe(1)
    expect(h.log.at(-1)).toBe('end:abort')
    expect(h.listenerCount()).toBe(0)
    expect(h.rafs.size).toBe(0)
    expect(h.timers.size).toBe(0)
    expect(h.tracked.map(([e]) => e)).toEqual(['intro_start'])
  })

  it('Save-Data switched on without a change event ends the run on the next frame', () => {
    const h = harness()
    const c = createIntroController(plan, h.deps, 'replay')
    c.start()
    h.frame(16)
    h.setStill('save-data', false)
    expect(c.state).toBe('running')
    h.frame(16)
    expect(c.outcome).toBe('abort')
    expect(h.unmounted).toBe(1)
    expect(h.listenerCount()).toBe(0)
    expect(h.rafs.size).toBe(0)
  })
})

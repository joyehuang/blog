import { describe, expect, it } from 'bun:test'

import { stillReason, watchStill } from './keys'

function env(reduce: boolean, save: boolean) {
  const mq = new EventTarget() as EventTarget & { matches: boolean }
  mq.matches = reduce
  const conn = new EventTarget() as EventTarget & { saveData: boolean }
  conn.saveData = save
  const w = { matchMedia: () => mq } as unknown as Pick<Window, 'matchMedia'>
  const nav = { connection: conn } as unknown as Navigator
  return { w, nav, mq, conn }
}

describe('still (reduced motion / Save-Data)', () => {
  it('reports why Jojo must stay still', () => {
    expect(stillReason(env(false, false).w, env(false, false).nav)).toBeNull()
    const r = env(true, true)
    expect(stillReason(r.w, r.nav)).toBe('reduced-motion')
    const s = env(false, true)
    expect(stillReason(s.w, s.nav)).toBe('save-data')
  })

  it('watches both sources and unsubscribes', () => {
    const e = env(false, false)
    let calls = 0
    const off = watchStill(() => calls++, e.w, e.nav)
    e.mq.dispatchEvent(new Event('change'))
    e.conn.dispatchEvent(new Event('change'))
    expect(calls).toBe(2)
    off()
    e.mq.dispatchEvent(new Event('change'))
    expect(calls).toBe(2)
  })

  it('survives a browser without matchMedia or connection', () => {
    expect(stillReason({} as Pick<Window, 'matchMedia'>, {} as Navigator)).toBeNull()
    const off = watchStill(() => {}, {} as Pick<Window, 'matchMedia'>, {} as Navigator)
    off()
  })
})

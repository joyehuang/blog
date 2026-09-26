import { beforeEach, describe, expect, it, mock } from 'bun:test'

mock.module('@/lib/analytics', () => ({ trackSiteEvent: () => {} }))
const { resetTrackOnce, trackOnce } = await import('./analytics')

describe('trackOnce', () => {
  beforeEach(() => resetTrackOnce())

  it('sends a (event, surface, action) at most once per page view', () => {
    const sent: string[] = []
    const send = (e: string) => void sent.push(e)
    expect(trackOnce('jojo_poke', { surface: 'home_hero' }, send)).toBe(true)
    expect(trackOnce('jojo_poke', { surface: 'home_hero' }, send)).toBe(false)
    expect(trackOnce('jojo_poke', { surface: 'jojo_dock' }, send)).toBe(true)
    expect(trackOnce('jojo_dock_action', { surface: 'jojo_dock', action: 'open' }, send)).toBe(true)
    expect(trackOnce('jojo_dock_action', { surface: 'jojo_dock', action: 'tuck' }, send)).toBe(true)
    expect(sent).toEqual(['jojo_poke', 'jojo_poke', 'jojo_dock_action', 'jojo_dock_action'])
  })

  it('never throws when the transport fails', () => {
    expect(() =>
      trackOnce('jojo_poke', { surface: 'x' }, () => {
        throw new Error('blocked')
      })
    ).not.toThrow()
  })
})

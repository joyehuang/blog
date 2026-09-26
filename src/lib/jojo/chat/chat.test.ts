import { describe, expect, it } from 'bun:test'

import { reduceChat, statusForPhase, type ChatState } from './types'
import { createUnavailableChat } from './unavailable'

describe('chat adapter seam', () => {
  it('the unavailable adapter cannot compose, send or change phase', () => {
    const a = createUnavailableChat()
    expect(a.capabilities.compose).toBe(false)
    expect(a.send).toBeUndefined()
    expect(a.getState().phase).toBe('unavailable')
    let calls = 0
    const off = a.subscribe(() => calls++)
    off()
    expect(calls).toBe(0)
    expect(Object.isFrozen(a.getState())).toBe(true)
  })

  it('maps the real lifecycle onto status shapes; unavailable shows plain idle', () => {
    expect(statusForPhase('unavailable')).toBe('idle')
    expect(statusForPhase('idle')).toBe('idle')
    expect(statusForPhase('working')).toBe('working')
    expect(statusForPhase('needs-input')).toBe('needs-input')
    expect(statusForPhase('success')).toBe('success')
    expect(statusForPhase('error')).toBe('error')
    expect(statusForPhase('offline')).toBe('offline')
  })

  it('a buggy backend cannot fake success: answers only count while working', () => {
    const s: ChatState = { phase: 'unavailable', messages: [] }
    expect(reduceChat(s, { type: 'answered' }).phase).toBe('unavailable')
    expect(reduceChat(s, { type: 'sent' }).phase).toBe('unavailable')
    const idle = reduceChat(s, { type: 'connected' })
    expect(idle.phase).toBe('idle')
    const working = reduceChat(idle, { type: 'sent' })
    expect(working.phase).toBe('working')
    expect(reduceChat(working, { type: 'asked' }).phase).toBe('needs-input')
    const done = reduceChat(working, { type: 'answered' })
    expect(done.phase).toBe('success')
    expect(reduceChat(done, { type: 'settled' }).phase).toBe('idle')
    const failed = reduceChat(working, { type: 'failed', notice: 'rate_limited' })
    expect(failed).toMatchObject({ phase: 'error', notice: 'rate_limited' })
    expect(reduceChat(idle, { type: 'lost' }).phase).toBe('offline')
    expect(reduceChat(idle, { type: 'answered' }).phase).toBe('idle')
  })
})

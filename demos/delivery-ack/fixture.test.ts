import { describe, expect, test } from 'bun:test'

// Teaching model only. No network, filesystem, private imports, clocks or model calls.
// Map entries stand for durable records; cloning the map stands for a process restart.
// This does NOT test fsync, real locks, real process crashes or a transport adapter.
type State = 'sending' | 'sent' | 'failed' | 'unknown'
type RecordEntry = { payload: string; state: State; receipt?: string }
type Outcome = 'ack' | 'reject-before-effect' | 'effect-then-timeout' | 'timeout-before-effect'
type Cut = 'none' | 'after-intent' | 'after-effect' | 'after-sender-ack'

class World {
  effects: string[] = []
  calls = 0
  send(key: string, outcome: Outcome): RecordEntry['state'] {
    this.calls++
    if (outcome === 'reject-before-effect') return 'failed'
    if (outcome === 'timeout-before-effect') return 'unknown'
    this.effects.push(key)
    return outcome === 'ack' ? 'sent' : 'unknown'
  }
}

class Delivery {
  constructor(
    readonly world: World,
    readonly sender = new Map<string, string>(),
    readonly caller = new Map<string, string>()
  ) {}

  restart() {
    return new Delivery(this.world, new Map(this.sender), new Map(this.caller))
  }

  attempt(key: string, payload: string, outcome: Outcome, cut: Cut = 'none'): State {
    const raw = this.sender.get(key)
    if (raw !== undefined) {
      let previous: RecordEntry
      try {
        previous = JSON.parse(raw)
      } catch {
        return 'unknown'
      }
      if (
        !previous ||
        previous.payload !== payload ||
        !['sending', 'sent', 'failed', 'unknown'].includes(previous.state) ||
        (previous.state === 'sent' && !previous.receipt)
      )
        return 'unknown'
      if (previous.state === 'sent') {
        this.caller.set(key, raw)
        return 'sent'
      }
      if (previous.state !== 'failed') return 'unknown'
    }
    const intent: RecordEntry = { payload, state: 'sending' }
    this.sender.set(key, JSON.stringify(intent))
    this.caller.set(key, JSON.stringify(intent))
    if (cut === 'after-intent') return 'unknown'
    const state = this.world.send(key, outcome)
    if (cut === 'after-effect') return 'unknown'
    const result: RecordEntry = {
      payload,
      state,
      ...(state === 'sent' ? { receipt: 'fixture-ack' } : {})
    }
    this.sender.set(key, JSON.stringify(result))
    if (cut === 'after-sender-ack') return 'unknown'
    this.caller.set(key, JSON.stringify(result))
    return state
  }
}

const key = 'digest:edition-a:channel-a:revision-1'
const payload = 'Synthetic digest A'

describe('delivery ACK teaching model', () => {
  test('counterexample: retrying every timeout duplicates an accepted effect', () => {
    const world = new World()
    expect(world.send(key, 'effect-then-timeout')).toBe('unknown')
    expect(world.send(key, 'ack')).toBe('sent')
    expect(world.effects).toEqual([key, key])
  })

  test('known rejection can retry; calls and effects are different counters', () => {
    const world = new World()
    let delivery = new Delivery(world)
    expect(delivery.attempt(key, payload, 'reject-before-effect')).toBe('failed')
    delivery = delivery.restart()
    expect(delivery.attempt(key, payload, 'ack')).toBe('sent')
    expect(world.calls).toBe(2)
    expect(world.effects).toEqual([key])
  })

  test('ACK replay returns success without a second transport call', () => {
    const world = new World()
    const delivery = new Delivery(world)
    expect(delivery.attempt(key, payload, 'ack')).toBe('sent')
    expect(delivery.restart().attempt(key, payload, 'ack')).toBe('sent')
    expect(world.calls).toBe(1)
  })

  test('unknown after effect is held after restart', () => {
    const world = new World()
    const delivery = new Delivery(world)
    expect(delivery.attempt(key, payload, 'effect-then-timeout')).toBe('unknown')
    expect(delivery.restart().attempt(key, payload, 'ack')).toBe('unknown')
    expect(world.calls).toBe(1)
    expect(world.effects).toEqual([key])
  })

  test('same unknown observation can mean no effect; holding loses liveness', () => {
    const world = new World()
    const delivery = new Delivery(world)
    expect(delivery.attempt(key, payload, 'timeout-before-effect')).toBe('unknown')
    expect(delivery.restart().attempt(key, payload, 'ack')).toBe('unknown')
    expect(world.calls).toBe(1)
    expect(world.effects).toEqual([])
  })

  test('crash after intent but before transport also holds an unsent item', () => {
    const world = new World()
    const delivery = new Delivery(world)
    expect(delivery.attempt(key, payload, 'ack', 'after-intent')).toBe('unknown')
    expect(delivery.restart().attempt(key, payload, 'ack')).toBe('unknown')
    expect(world.calls).toBe(0)
  })

  test('crash after external effect leaves sending; it is not permission to retry', () => {
    const world = new World()
    const delivery = new Delivery(world)
    expect(delivery.attempt(key, payload, 'ack', 'after-effect')).toBe('unknown')
    expect(delivery.restart().attempt(key, payload, 'ack')).toBe('unknown')
    expect(world.effects).toEqual([key])
  })

  test('sender ACK repairs a missing caller ACK without resending', () => {
    const world = new World()
    const delivery = new Delivery(world)
    expect(delivery.attempt(key, payload, 'ack', 'after-sender-ack')).toBe('unknown')
    expect(JSON.parse(delivery.caller.get(key)!).state).toBe('sending')
    const restarted = delivery.restart()
    expect(restarted.attempt(key, payload, 'ack')).toBe('sent')
    expect(JSON.parse(restarted.caller.get(key)!).state).toBe('sent')
    expect(world.calls).toBe(1)
  })

  test('same identity with changed payload is held', () => {
    const world = new World()
    const delivery = new Delivery(world)
    delivery.attempt(key, payload, 'ack')
    expect(delivery.restart().attempt(key, 'Synthetic digest B', 'ack')).toBe('unknown')
    expect(world.calls).toBe(1)
  })

  test('corrupt existing record is not an absent record', () => {
    const world = new World()
    const delivery = new Delivery(world)
    delivery.sender.set(key, '{broken fixture')
    expect(delivery.attempt(key, payload, 'ack')).toBe('unknown')
    expect(world.calls).toBe(0)
  })

  test('partial success retries only the definitely rejected target', () => {
    const world = new World()
    const delivery = new Delivery(world)
    const other = 'digest:edition-a:channel-b:revision-1'
    delivery.attempt(key, payload, 'ack')
    delivery.attempt(other, payload, 'reject-before-effect')
    const restarted = delivery.restart()
    restarted.attempt(key, payload, 'ack')
    restarted.attempt(other, payload, 'ack')
    expect(world.calls).toBe(3)
    expect(world.effects).toEqual([key, other])
  })

  test('counterexample: new identity evades local deduplication', () => {
    const world = new World()
    const delivery = new Delivery(world)
    delivery.attempt(key, payload, 'effect-then-timeout')
    delivery.restart().attempt('digest:edition-a:channel-a:revision-2', payload, 'ack')
    expect(world.effects).toHaveLength(2)
  })
})

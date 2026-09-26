import type { ChatAdapter, ChatState } from './types'

const STATE: ChatState = Object.freeze({
  phase: 'unavailable',
  messages: Object.freeze([]),
  notice: null
})

/**
 * The adapter the dock uses until a real backend exists. It cannot compose or
 * send, never changes phase, and never reports success — so the dock renders
 * no input box and no reply, only an honest "not connected yet" line.
 */
export function createUnavailableChat(): ChatAdapter {
  return {
    id: 'unavailable',
    capabilities: Object.freeze({ compose: false }),
    getState: () => STATE,
    subscribe: () => () => {},
    dispose: () => {}
  }
}

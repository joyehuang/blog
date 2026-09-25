import type { StatusId } from '@jojo-web/runtime'

/**
 * The seam where a real chat backend plugs into the dock later. Two channels
 * stay separate on purpose:
 *  - `ChatPhase` is the *real* request lifecycle (drives Jojo's status shapes:
 *    working ring, needs-input bubble, success check, error mark, offline);
 *  - emotions (the face) are visual performance driven by interactions.
 * A phase is only ever set by an adapter reporting what actually happened.
 */
export type ChatPhase =
  | 'unavailable' // no backend connected — the only phase today
  | 'idle' // connected, nothing in flight
  | 'working' // a request is in flight
  | 'needs-input' // the agent asked the visitor something
  | 'success' // the last request completed
  | 'error' // the last request failed
  | 'offline' // backend known but unreachable

export interface ChatCapabilities {
  /** the dock may render a composer and call `send` */
  compose: boolean
}

export interface ChatMessage {
  role: 'visitor' | 'jojo'
  text: string
}

export interface ChatState {
  phase: ChatPhase
  messages: readonly ChatMessage[]
  /** safe, user-facing reason for error/offline; never raw server text */
  notice?: 'rate_limited' | 'unreachable' | 'failed' | null
}

export interface ChatAdapter {
  readonly id: string
  readonly capabilities: ChatCapabilities
  getState(): ChatState
  subscribe(listener: (state: ChatState) => void): () => void
  /** present only when `capabilities.compose` is true */
  send?: (text: string) => Promise<void>
  dispose(): void
}

/** Real lifecycle → Jojo status shapes. `unavailable` shows nothing extra. */
export function statusForPhase(phase: ChatPhase): StatusId {
  switch (phase) {
    case 'working':
      return 'working'
    case 'needs-input':
      return 'needs-input'
    case 'success':
      return 'success'
    case 'error':
      return 'error'
    case 'offline':
      return 'offline'
    default:
      return 'idle'
  }
}

export type ChatEvent =
  | { type: 'connected' }
  | { type: 'sent' }
  | { type: 'asked' }
  | { type: 'answered' }
  | { type: 'failed'; notice?: ChatState['notice'] }
  | { type: 'lost' }
  | { type: 'settled' }

/**
 * Lifecycle reducer for a future adapter. Illegal transitions are ignored
 * (e.g. an answer while unavailable), so a buggy backend cannot make Jojo
 * claim a success that never happened.
 */
export function reduceChat(state: ChatState, ev: ChatEvent): ChatState {
  const to = (phase: ChatPhase, notice: ChatState['notice'] = null): ChatState => ({
    ...state,
    phase,
    notice
  })
  switch (ev.type) {
    case 'connected':
      return state.phase === 'unavailable' || state.phase === 'offline' ? to('idle') : state
    case 'sent':
      return state.phase === 'idle' ||
        state.phase === 'needs-input' ||
        state.phase === 'success' ||
        state.phase === 'error'
        ? to('working')
        : state
    case 'asked':
      return state.phase === 'working' ? to('needs-input') : state
    case 'answered':
      return state.phase === 'working' ? to('success') : state
    case 'failed':
      return state.phase === 'working' ? to('error', ev.notice ?? 'failed') : state
    case 'lost':
      return state.phase === 'unavailable' ? state : to('offline', 'unreachable')
    case 'settled':
      return state.phase === 'success' || state.phase === 'error' ? to('idle') : state
  }
}

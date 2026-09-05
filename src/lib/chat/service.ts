import type { Generate } from './model'
import type { Source } from './safety'
import type { Store } from './store'

// Dependencies are request-local. Test generators never enter production wiring.
export function answerStream(
  deps: { store: Store; generate: Generate; sources: Source[] },
  sid: string,
  reserved: { turn: string; conversation: string; history: { question: string; answer: string }[] },
  question: string,
  requestSignal: AbortSignal
) {
  const abort = new AbortController()
  const signal = AbortSignal.any([abort.signal, requestSignal, AbortSignal.timeout(45000)])
  const cards = [...new Map(deps.sources.map(({ title, url }) => [url, { title, url }])).values()]
  let cancelled = false
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let text = ''
      let complete = false
      let marked = false
      let usage: Record<string, number> = {}
      const started = Date.now()
      const send = (data: unknown) => {
        if (!cancelled) controller.enqueue(new TextEncoder().encode(JSON.stringify(data) + '\n'))
      }
      try {
        send({ type: 'start', conversation: reserved.conversation })
        for await (const part of deps.generate(question, reserved.history, deps.sources, signal)) {
          signal.throwIfAborted()
          if (part.usage) usage = part.usage
          if (part.text) {
            text += part.text
            if (!marked && text.trim()) {
              const result = await deps.store('mark', sid, {
                turn: reserved.turn,
                answer: text,
                sources: cards
              })
              if (result.error) throw Error('store_error')
              marked = true
              send({ type: 'sources', sources: cards })
            }
            if (marked) send({ type: 'delta', text: part.text })
          }
          if (part.done) complete = true
        }
        if (!text.trim() || !complete) throw Error('empty_answer')
      } catch {
        complete = false
      }
      try {
        const result = await deps.store('finish', sid, {
          turn: reserved.turn,
          answer: marked ? text : '',
          sources: cards,
          status: complete ? 'complete' : 'interrupted',
          usage: { ...usage, latency_ms: Date.now() - started }
        })
        if (result.error) throw Error('store_error')
        send({
          type: complete ? 'done' : 'error',
          code: signal.aborted ? 'stopped' : 'answer_failed',
          answered: marked
        })
      } catch {
        send({ type: 'error', code: 'save_failed', answered: marked })
      }
      if (!cancelled) controller.close()
    },
    cancel() {
      cancelled = true
      abort.abort()
    }
  })
}

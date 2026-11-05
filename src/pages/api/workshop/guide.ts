import type { APIRoute } from 'astro'
import { runGuide } from '@/lib/workshop/agent.server'
import { getSpaceContent } from '@/lib/workshop/content.server'

export const prerender = false
const headers = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
const configuration = () => {
  const baseUrl = process.env.WORKSHOP_AI_BASE_URL || import.meta.env.WORKSHOP_AI_BASE_URL
  const model = process.env.WORKSHOP_AI_MODEL || import.meta.env.WORKSHOP_AI_MODEL
  const apiKey = process.env.WORKSHOP_AI_API_KEY || import.meta.env.WORKSHOP_AI_API_KEY
  if (!baseUrl || !model || !apiKey) return null
  try {
    const url = new URL(baseUrl)
    if (
      url.protocol !== 'https:' &&
      !(import.meta.env.DEV && ['127.0.0.1', 'localhost'].includes(url.hostname))
    )
      return null
  } catch {
    return null
  }
  return { baseUrl, model, apiKey }
}
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status, headers })
export const GET: APIRoute = () => json({ available: Boolean(configuration()) })

// Per-process protection for this preview endpoint. Configure a platform rate limit before public release.
let activeRuns = 0
export const POST: APIRoute = async ({ request, url }) => {
  const origin = request.headers.get('origin')
  if (origin && origin !== url.origin) return json({ error: '请求来源不匹配。' }, 403)
  const config = configuration()
  if (!config) return json({ error: 'AI 导览尚未连接模型服务。可以先体验下方的策划路线。' }, 503)
  if (activeRuns >= 2) return json({ error: '导览正在忙，请稍后再试。' }, 429)
  let input: { question?: unknown; context?: unknown }
  try {
    const raw = await request.text()
    if (raw.length > 6000) return json({ error: '问题过长。' }, 413)
    input = JSON.parse(raw)
    if (!input || typeof input !== 'object') throw new Error('Invalid body')
  } catch {
    return json({ error: '无法读取这个问题。' }, 400)
  }
  if (typeof input.question !== 'string' || !input.question.trim() || input.question.length > 500)
    return json({ error: '请输入 1–500 字的问题。' }, 400)
  const question = input.question.trim()
  const { documents } = await getSpaceContent()
  const ids = new Set(documents.map((doc) => doc.id))
  const context = Array.isArray(input.context)
    ? input.context.slice(-3).flatMap((value) => {
        if (!value || typeof value.question !== 'string' || !Array.isArray(value.ids)) return []
        return [
          {
            question: value.question.slice(0, 500),
            ids: value.ids
              .filter((id: unknown) => typeof id === 'string' && ids.has(id))
              .slice(0, 5)
          }
        ]
      })
    : []
  if (activeRuns >= 2) return json({ error: '导览正在忙，请稍后再试。' }, 429)
  activeRuns++
  const abort = new AbortController()
  const timeout = setTimeout(() => abort.abort(), 55000)
  const cancel = () => abort.abort()
  request.signal.addEventListener('abort', cancel, { once: true })
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: unknown) => {
        if (!abort.signal.aborted) controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))
      }
      try {
        const plan = await runGuide({
          question,
          context,
          documents,
          config,
          signal: abort.signal,
          emit
        })
        emit({ type: 'plan', plan })
      } catch (error) {
        if (!request.signal.aborted) {
          try {
            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  type: 'error',
                  message: abort.signal.aborted
                    ? '整理路线用时较长，请重试。'
                    : error instanceof Error
                      ? error.message
                      : '导览暂时不可用。'
                }) + '\n'
              )
            )
          } catch {
            /* Reader cancelled. */
          }
        }
      } finally {
        activeRuns--
        clearTimeout(timeout)
        request.signal.removeEventListener('abort', cancel)
        try {
          controller.close()
        } catch {
          /* Reader cancelled. */
        }
      }
    },
    cancel
  })
  return new Response(stream, {
    headers: {
      'content-type': 'application/x-ndjson; charset=utf-8',
      'cache-control': 'no-store',
      'x-accel-buffering': 'no'
    }
  })
}

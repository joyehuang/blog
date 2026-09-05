import { createHmac, timingSafeEqual } from 'node:crypto'

export const COOKIE = 'joye_chat'
export function digest(secret: string, text: string) {
  return createHmac('sha256', secret).update(text).digest('hex')
}
export function signedSession(sid: string, secret: string) {
  return `${sid}.${digest(secret, `session:${sid}`)}`
}
export function readSession(value: string | undefined, secret: string): string | undefined {
  if (!value) return
  const [id, signature, extra] = value.split('.')
  if (extra || !/^[0-9a-f-]{36}$/.test(id) || !/^[0-9a-f]{64}$/.test(signature ?? '')) return
  if (timingSafeEqual(Buffer.from(signature), Buffer.from(digest(secret, `session:${id}`))))
    return id
}
export function requestAllowed(request: Request, origin: string) {
  return (
    request.headers.get('origin') === origin &&
    new URL(request.url).origin === origin &&
    request.headers.get('content-type')?.split(';')[0] === 'application/json' &&
    !['cross-site', 'none'].includes(request.headers.get('sec-fetch-site') ?? '')
  )
}
export async function readBody(request: Request): Promise<Record<string, unknown>> {
  const reader = request.body?.getReader()
  if (!reader) throw Error('invalid_request')
  let body = ''
  let size = 0
  const decoder = new TextDecoder()
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > 10000) throw Error('invalid_request')
      body += decoder.decode(value, { stream: true })
    }
  } finally {
    await reader.cancel().catch(() => {})
  }
  const value = JSON.parse(body + decoder.decode())
  if (!value || Array.isArray(value) || typeof value !== 'object') throw Error('invalid_request')
  return value
}

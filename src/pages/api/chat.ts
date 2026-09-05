import { randomInt, randomUUID } from 'node:crypto'
import type { APIRoute } from 'astro'
import { chatConfig } from '@/lib/chat/config'
import { generator } from '@/lib/chat/model'
import corpus from '@/lib/chat/public-corpus.json'
import { emailAddress, retrieve } from '@/lib/chat/safety'
import {
  COOKIE,
  digest,
  readBody,
  readSession,
  requestAllowed,
  signedSession
} from '@/lib/chat/security'
import { answerStream } from '@/lib/chat/service'
import { store } from '@/lib/chat/store'

export const prerender = false
const headers = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  Vary: 'Cookie, Origin'
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers })
const id = (v: unknown) =>
  typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v)
    ? v
    : undefined
export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
  try {
    const config = chatConfig()
    if (!requestAllowed(request, config.origin)) return json({ error: 'forbidden' }, 403)
    const body = await readBody(request)
    const action = String(body.action)
    const sid = readSession(cookies.get(COOKIE)?.value, config.secret)
    const setSession = (value: string, authenticated = false) =>
      cookies.set(COOKIE, signedSession(value, config.secret), {
        httpOnly: true,
        secure: config.origin.startsWith('https:'),
        sameSite: 'strict',
        path: '/',
        maxAge: authenticated ? 2592000 : 86400
      })
    // Vercel overwrites x-vercel-forwarded-for. Never trust client x-forwarded-for.
    const address = process.env.VERCEL
      ? request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim()
      : clientAddress
    if (!address) return json({ error: 'unavailable' }, 503)
    const ip = digest(config.secret, `ip:${address}`)
    if (action === 'session') {
      const next = sid ?? randomUUID()
      const result = await store('session', next, { ip })
      if (result.error === 'session_expired') return json(result, 401)
      if (!result.error && !sid) setSession(next)
      return json(result, result.error ? 429 : 200)
    }
    if (!sid) return json({ error: 'session_expired' }, 401)
    let result
    if (action === 'ask') {
      if (
        typeof body.question !== 'string' ||
        !body.question.trim() ||
        body.question.length > 2000 ||
        (body.conversation && !id(body.conversation))
      )
        return json({ error: 'invalid_question' }, 400)
      const question = body.question.trim()
      const sources = retrieve(question, corpus.sources)
      result = await store('reserve', sid, { ip, question, conversation: id(body.conversation) })
      if (result.error) return json(result, result.error === 'login_required' ? 401 : 429)
      return new Response(
        answerStream(
          { store, generate: generator(config.key), sources },
          sid,
          { turn: result.turn!, conversation: result.conversation!, history: result.history ?? [] },
          question,
          request.signal
        ),
        {
          headers: { ...headers, 'Content-Type': 'application/x-ndjson', 'X-Accel-Buffering': 'no' }
        }
      )
    } else if (action === 'otp_send') {
      const email = emailAddress(body.email)
      const code = String(randomInt(100000, 1000000))
      result = await store('otp_send', sid, {
        ip,
        email,
        emailHash: digest(config.secret, `email:${email}`),
        digest: digest(config.secret, `otp:${sid}:${email}:${code}`)
      })
      if (!result.error) {
        const sent = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          redirect: 'error',
          signal: AbortSignal.timeout(10000),
          headers: { Authorization: `Bearer ${config.resend}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: config.from,
            to: [email],
            subject: 'Your Joye blog Chat sign-in code',
            text: `Your sign-in code is ${code}. It expires in 10 minutes and can be used once. If you did not request this, ignore this email.`
          })
        })
        if (!sent.ok) return json({ error: 'email_unavailable' }, 503)
      }
    } else if (action === 'otp_verify') {
      const email = emailAddress(body.email)
      if (typeof body.code !== 'string' || !/^\d{6}$/.test(body.code))
        return json({ error: 'invalid_code' }, 400)
      const newSession = randomUUID()
      result = await store('otp_verify', sid, {
        ip,
        email,
        newSession,
        digest: digest(config.secret, `otp:${sid}:${email}:${body.code}`)
      })
      if (!result.error) setSession(newSession, true)
    } else if (['load', 'delete_conversation'].includes(action)) {
      if (!id(body.conversation)) return json({ error: 'invalid_request' }, 400)
      result = await store(action, sid, { conversation: body.conversation })
    } else if (['status', 'logout', 'delete_account'].includes(action)) {
      result = await store(action, sid)
      if (!result.error && action !== 'status') cookies.delete(COOKIE, { path: '/' })
    } else return json({ error: 'invalid_action' }, 400)
    return json(result, result.error ? 400 : 200)
  } catch (error) {
    const code =
      error instanceof Error &&
      ['invalid_email', 'invalid_request', 'invalid_code'].includes(error.message)
        ? error.message
        : 'unavailable'
    return json({ error: code }, code === 'unavailable' ? 503 : 400)
  }
}

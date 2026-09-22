import { track } from '@vercel/analytics'

export type Surface = 'header' | 'home' | 'article' | 'terminal'
const fields = {
  chat_open: {},
  chat_question: { kind: ['example', 'custom'] },
  chat_result: { result: ['complete', 'stopped', 'error', 'login_required'] },
  chat_login: { action: ['required', 'code_sent', 'verified', 'logout', 'error'] },
  chat_source_click: { target: ['blog', 'notes', 'about', 'other'] }
} as const
export type ChatEvent = keyof typeof fields
export function chatPayload(
  event: ChatEvent,
  surface: Surface,
  extra: Record<string, unknown>,
  pathname: string
) {
  const payload: Record<string, string> = {
    surface: ['header', 'home', 'article', 'terminal'].includes(surface) ? surface : 'header',
    locale: pathname.startsWith('/en') ? 'en' : 'zh',
    page: /^\/(en)?$/.test(pathname)
      ? 'home'
      : /^\/(en\/)?blog\//.test(pathname)
        ? 'article'
        : 'other'
  }
  for (const [key, values] of Object.entries(fields[event])) {
    if ((values as readonly unknown[]).includes(extra[key])) payload[key] = String(extra[key])
  }
  return payload
}
export function chatTrack(event: ChatEvent, surface: Surface, extra: Record<string, unknown> = {}) {
  track(event, chatPayload(event, surface, extra, location.pathname))
}

import { safeWebUrl } from './web-url'

export const PUBLIC_ORIGIN = 'https://www.joyehuang.me'
export type Source = { title: string; url: string; text: string; kind?: 'site' | 'web' }

export function safeSourceUrl(value: string): string | undefined {
  try {
    const u = new URL(value, PUBLIC_ORIGIN)
    if (
      u.origin !== PUBLIC_ORIGIN ||
      u.username ||
      u.password ||
      u.search ||
      (u.hash && (!/^\/(talks|curated)$/.test(u.pathname) || !/^#[a-z0-9_-]+$/i.test(u.hash)))
    )
      return
    if (
      !/^\/(?:blog|notes|talks|curated|lab)(?:\/[a-z0-9_./-]+)?$|^\/(?:about|projects|talks)$|^\/en\/(?:blog|notes|talks|curated|lab)(?:\/[a-z0-9_./-]+)?$/i.test(
        u.pathname
      )
    )
      return
    if (value.includes('\\') || value.includes('%')) return
    return u.href
  } catch {
    return
  }
}

// Adapted from Joye's QQ bot corpus-search.ts (2026-09-06): Latin tokens and
// CJK bigrams only. No filesystem walk, user notes, globals, or QQ data reused.
export function tokenize(text: string): string[] {
  const lower = text.toLowerCase()
  const tokens = [...lower.matchAll(/[a-z0-9][a-z0-9_+.]{1,20}/g)].map((m) => m[0])
  for (const segment of lower.match(/[\u4e00-\u9fff]{2,}/g) ?? []) {
    for (let i = 0; i < segment.length - 1; i++) tokens.push(segment.slice(i, i + 2))
  }
  return tokens
}

export function retrieve(query: string, sources: Source[]): Source[] {
  const terms = [...new Set(tokenize(query))].slice(0, 80)
  const counts = new Map<string, number>()
  return sources
    .filter((s) => safeSourceUrl(s.url))
    .flatMap((s) => {
      const parts: { source: Source; score: number }[] = []
      for (let i = 0; i < s.text.length; i += 1000) {
        const text = s.text.slice(i, i + 1200)
        const tokens = tokenize(text)
        const title = tokenize(s.title)
        const score = terms.reduce(
          (n, t) => n + (tokens.includes(t) ? 1 : 0) + (title.includes(t) ? 3 : 0),
          0
        )
        if (score) parts.push({ source: { ...s, text }, score })
      }
      return parts
    })
    .sort((a, b) => b.score - a.score)
    .filter(({ source }) => {
      const count = counts.get(source.url) ?? 0
      counts.set(source.url, count + 1)
      return count < 2
    })
    .slice(0, 6)
    .map((x) => x.source)
}

export function emailAddress(value: unknown): string {
  if (typeof value !== 'string') throw new Error('invalid_email')
  const email = value.trim().toLowerCase()
  if (
    email.length > 254 ||
    !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,63}$/i.test(email)
  )
    throw new Error('invalid_email')
  return email
}

export function safeCitationUrl(source: { url: string; kind?: string }): string | undefined {
  return source.kind === 'web' ? safeWebUrl(source.url) : safeSourceUrl(source.url)
}

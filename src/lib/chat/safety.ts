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

// Navigation/entity intent comes from public URL metadata, not answer templates.
// In particular, English "about" as a preposition must not select the About page.
export function requestedSections(query: string): string[] {
  const sections: string[] = []
  if (/\btalks\b|演讲|分享栏目|有哪些分享/i.test(query)) sections.push('talks')
  if (
    /\bAbout\b(?=\s*(?:页|栏目|是|section|page|[?？。!！]|$))/.test(query) ||
    /^about[?？。!！\s]*$/i.test(query) ||
    /\babout\s+page\b|\bjoye['’]?s?\s+about\b|\bwho\s+is\s+joye\b|Joye\s*是谁|关于\s*Joye/i.test(
      query
    )
  )
    sections.push('about')
  if (
    /\bprojects\b|(?:Joye\s*(?:的)?\s*|有哪些|公开|个人)(?:项目|作品)|(?:项目|作品)(?:页|栏目)/i.test(
      query
    )
  )
    sections.push('projects')
  if (/\bcurated\b|精选|策展/i.test(query)) sections.push('curated')
  if (/\bblog\b|博客|博文/i.test(query)) sections.push('blog')
  if (/\bnotes\b|笔记/i.test(query)) sections.push('notes')
  return sections
}

export function retrieve(query: string, sources: Source[]): Source[] {
  const terms = [...new Set(tokenize(query))].slice(0, 80)
  const counts = new Map<string, number>()
  const sections = requestedSections(query)
  const published = sources.filter((s) => safeSourceUrl(s.url))
  const section = (s: Source) =>
    new URL(s.url, PUBLIC_ORIGIN).pathname.split('/').filter((p) => p && p !== 'en')[0]
  const scoped = published.filter((s) => sections.includes(section(s)))
  // Explicit section intent searches that section when present. This prevents
  // incidental mentions elsewhere from replacing the actual section's records.
  return (scoped.length ? scoped : published)
    .flatMap((s) => {
      const parts: { source: Source; score: number }[] = []
      for (let i = 0; i < s.text.length; i += 1000) {
        const text = s.text.slice(i, i + 1200)
        const tokens = tokenize(text)
        const title = tokenize(s.title)
        const metadata = tokenize(
          new URL(s.url, PUBLIC_ORIGIN).pathname + new URL(s.url, PUBLIC_ORIGIN).hash
        )
        const score = terms.reduce(
          (n, t) =>
            n +
            (tokens.includes(t) ? 1 : 0) +
            (title.includes(t) ? 3 : 0) +
            (metadata.includes(t) ? 2 : 0),
          scoped.length ? 1 : 0
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

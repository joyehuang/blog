import type { CollectionEntry } from 'astro:content'

export type TalkEntry = CollectionEntry<'talks'>

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

/** Newest first — drives the reverse-chronological changelog feed. */
export function sortTalks(entries: TalkEntry[]) {
  return [...entries].sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
}

/** Episode number → version-style label, e.g. 1 → "v01". */
export function talkVersion(episode: number) {
  return 'v' + String(episode).padStart(2, '0')
}

/** 2026-06-13 → "2026.06.13" (mono changelog style). */
export function formatTalkDate(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}.${m}.${d}`
}

export function talkWeekday(date: Date) {
  return WEEKDAYS[date.getUTCDay()]
}

/** Episode number → Chinese label, e.g. 1 → "第 1 期". */
export function talkEpisodeLabel(episode: number) {
  return `第 ${episode} 期`
}

/** 2026-06-13 → "2026年6月13日" (UTC-based to avoid timezone drift). */
export function formatTalkDateCN(date: Date) {
  return `${date.getUTCFullYear()}年${date.getUTCMonth() + 1}月${date.getUTCDate()}日`
}

/** Deterministic 6-char hex "commit" hash from the entry id — no randomness. */
export function talkHash(id: string) {
  let h = 0x811c9dc5
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16).padStart(8, '0').slice(0, 6)
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Minimal inline-Markdown → HTML for talk quotes/takeaways. Content is trusted
 * (authored by hand in frontmatter). Supports **bold**, *italic*, `code`,
 * and [text](url) for http(s) or root-relative links.
 */
export function renderInlineMd(src: string) {
  let s = escapeHtml(src)
  s = s.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)/g,
    '<a href="$2" target="_blank" rel="noopener">$1</a>'
  )
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>')
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
  return s
}

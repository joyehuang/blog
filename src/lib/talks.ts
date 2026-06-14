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

/** Deterministic 6-char hex "commit" hash from the entry id — no randomness. */
export function talkHash(id: string) {
  let h = 0x811c9dc5
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16).padStart(8, '0').slice(0, 6)
}

/** Unique topics across the given talks, preserving first-seen order. */
export function collectTopics(entries: TalkEntry[]) {
  const seen = new Set<string>()
  const out: string[] = []
  for (const e of entries) {
    for (const t of e.data.topics) {
      if (!seen.has(t)) {
        seen.add(t)
        out.push(t)
      }
    }
  }
  return out
}

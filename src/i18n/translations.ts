import { getCollection } from 'astro:content'

import { hasEnAlternate } from './ui'

// Built once per render process, then memoized. Maps the set of Chinese URL
// paths that actually have an English translation, derived from the en mirror
// collections' translationKey — so hreflang is emitted only for real pairs.
let cache: { blog: Set<string>; notes: Set<string> } | null = null

async function translatedKeys() {
  if (!cache) {
    const [blogEn, notesEn] = await Promise.all([getCollection('blogEn'), getCollection('notesEn')])
    const pick = (entries: { data: { translationKey?: string } }[]) =>
      new Set(entries.map((e) => e.data.translationKey).filter((k): k is string => !!k))
    cache = { blog: pick(blogEn), notes: pick(notesEn) }
  }
  return cache
}

/**
 * Whether a bare (zh-form) path has an English version — either a statically
 * mirrored section page ({@link hasEnAlternate}) or a translated blog post / note.
 */
export async function hasEnVersion(barePath: string): Promise<boolean> {
  if (hasEnAlternate(barePath)) return true
  const keys = await translatedKeys()
  const blog = barePath.match(/^\/blog\/(.+\/post)$/)
  if (blog) return keys.blog.has(blog[1])
  const note = barePath.match(/^\/notes\/([^/]+)$/)
  if (note) return keys.notes.has(note[1])
  return false
}

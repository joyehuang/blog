import { getCollection } from 'astro:content'

import { hasEnAlternate } from './ui'

// Built once per render process, then memoized. Maps the set of Chinese URL
// paths that actually have an English translation, derived from the en mirror
// collections' translationKey — so hreflang is emitted only for real pairs.
let cache: { blog: Set<string>; notes: Set<string> } | null = null

async function translatedKeys() {
  if (!cache) {
    const [blogEn, notesEn, blog, notes] = await Promise.all([
      getCollection('blogEn'),
      getCollection('notesEn'),
      getCollection('blog'),
      getCollection('notes')
    ])
    const pick = (entries: { data: { translationKey?: string; draft?: boolean } }[]) =>
      new Set(
        entries
          .filter((e) => !e.data.draft)
          .map((e) => e.data.translationKey)
          .filter((k): k is string => !!k)
      )
    const paired = (keys: Set<string>, originals: { id: string; data: { draft?: boolean } }[]) =>
      new Set(originals.filter((e) => !e.data.draft && keys.has(e.id)).map((e) => e.id))
    cache = { blog: paired(pick(blogEn), blog), notes: paired(pick(notesEn), notes) }
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

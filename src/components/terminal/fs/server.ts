import { createHash } from 'node:crypto'
import { getCollection } from 'astro:content'

import { buildManifest, type FsCollectionEntry } from './manifest'
import type { FsNode } from './types'

/**
 * Server-only entry point for the pseudo-FS. Loads blog + notes
 * collections, normalizes them into `FsCollectionEntry`, and builds the
 * manifest. Called once per page render from BaseLayout / Terminal.astro.
 */
export async function buildSiteFs(): Promise<FsNode> {
  const blogRaw = (await getCollection('blog')) as unknown as RawEntry[]
  const blogEnRaw = (await getCollection('blogEn')) as unknown as RawEntry[]
  const notesRaw = await getCollection('notes').catch(() => [] as unknown as RawEntry[])
  const notesEnRaw = await getCollection('notesEn').catch(() => [] as unknown as RawEntry[])
  const curatedRaw = await getCollection('curated').catch(() => [] as unknown as RawEntry[])
  const talksRaw = await getCollection('talks').catch(() => [] as unknown as RawEntry[])

  const blog = sortByDate(blogRaw).filter(isPublished).map(toEntry('blog'))
  const blogEn = sortByDate(blogEnRaw).filter(isPublished).map(toEntry('blog_en'))
  const notes = sortByDate(notesRaw as RawEntry[])
    .filter(isPublished)
    .map(toEntry('notes'))
  const notesEn = sortByDate(notesEnRaw as RawEntry[])
    .filter(isPublished)
    .map(toEntry('notes_en'))
  const curated = sortByDate(curatedRaw as RawEntry[])
    .filter(isPublished)
    .map(toEntry('curated'))
  const talks = sortByDate(talksRaw as RawEntry[])
    .filter(isPublished)
    .map(toEntry('talks'))

  return buildManifest({ blog, blogEn, notes, notesEn, curated, talks })
}

type RawEntry = {
  id: string
  body?: string
  data: Record<string, unknown>
}

function isPublished(p: RawEntry): boolean {
  return p.data.draft !== true
}

function sortByDate<T extends RawEntry>(entries: T[]): T[] {
  return [...entries].sort((a, b) => {
    const aDate = dateValue(a.data.publishDate ?? a.data.date)
    const bDate = dateValue(b.data.publishDate ?? b.data.date)
    return bDate - aDate
  })
}

function dateValue(value: unknown): number {
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'string') return new Date(value).getTime()
  return 0
}

function toEntry(kind: FsCollectionEntry['kind']) {
  return (p: RawEntry): FsCollectionEntry => {
    const fm = p.data
    const date = (fm.publishDate ?? fm.date) as Date | string | undefined
    const updatedDate = (fm.updatedDate ?? fm.publishDate ?? fm.date) as Date | string | undefined
    const language = ((fm.language as string | undefined) ??
      (kind.endsWith('_en') ? 'en' : 'zh')) as string
    const routeId =
      typeof fm.translationKey === 'string' && kind.endsWith('_en') ? fm.translationKey : p.id

    return {
      id: p.id,
      routeId,
      kind,
      data: {
        title: (fm.title as string) ?? p.id,
        description: fm.description as string | undefined,
        publishDate: date,
        updatedDate,
        tags: (fm.tags as string[]) ?? [],
        language,
        contentHash: hashEntry(p),
        extra: pickExtraMeta(fm)
      }
    }
  }
}

function hashEntry(p: RawEntry): string {
  return createHash('sha256')
    .update(JSON.stringify(p.data))
    .update('\n')
    .update(p.body ?? '')
    .digest('hex')
}

function pickExtraMeta(fm: Record<string, unknown>): Record<string, unknown> {
  const extra: Record<string, unknown> = {}
  for (const key of [
    'type',
    'status',
    'source',
    'sourceTitle',
    'sourceAuthor',
    'difficulty',
    'episode',
    'subtitle',
    'topics',
    'relatedBlog',
    'relatedNote'
  ]) {
    if (fm[key] !== undefined) extra[key] = fm[key]
  }
  return extra
}

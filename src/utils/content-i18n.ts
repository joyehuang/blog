import type { CollectionEntry } from 'astro:content'
import { getBlogCollection, sortMDByDate } from 'astro-pure/server'
import type { Locale } from '@/i18n/locales'

type BlogCollectionKey = 'blog' | 'blogEn'
type PaperCollectionKey = 'papers' | 'papersEn'

export type BlogEntry = CollectionEntry<'blog'> | CollectionEntry<'blogEn'>
export type PaperEntry = CollectionEntry<'papers'> | CollectionEntry<'papersEn'>

const BLOG_COLLECTION_BY_LOCALE: Record<Locale, BlogCollectionKey> = {
  zh: 'blog',
  en: 'blogEn'
}

const PAPER_COLLECTION_BY_LOCALE: Record<Locale, PaperCollectionKey> = {
  zh: 'papers',
  en: 'papersEn'
}

export async function getLocalizedPosts(locale: Locale) {
  return sortMDByDate(await getBlogCollection(BLOG_COLLECTION_BY_LOCALE[locale])) as BlogEntry[]
}

export async function getLocalizedPapers(locale: Locale) {
  return sortMDByDate(await getBlogCollection(PAPER_COLLECTION_BY_LOCALE[locale])) as PaperEntry[]
}

export function toTranslationMap(entries: Array<{ id: string; data: { translationKey: string } }>) {
  return new Map(entries.map((entry) => [entry.data.translationKey, entry.id]))
}

export function findTranslatedPath(
  translationKey: string,
  translationMap: Map<string, string>,
  listFallbackPath: string,
  detailBasePath: string
) {
  const translatedId = translationMap.get(translationKey)
  return translatedId ? `${detailBasePath}/${translatedId}` : listFallbackPath
}

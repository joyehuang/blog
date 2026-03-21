import { getCollection, type CollectionEntry, type CollectionKey } from 'astro:content'
import { getBlogCollection, groupCollectionsByYear, sortMDByDate } from 'astro-pure/server'

import type { Locale } from '@/i18n'

function trimSlashes(value: string) {
  return value.replace(/^\/+|\/+$/g, '')
}

export function getEntryLocale(entry: CollectionEntry<CollectionKey>) {
  return (entry.data.locale ?? 'zh') as Locale
}

export function getEntryRoutePath(entry: CollectionEntry<CollectionKey>) {
  return trimSlashes(entry.data.routeSlug || entry.id)
}

export function getLocalizedContentHref(
  kind: 'blog' | 'archive',
  entry: CollectionEntry<CollectionKey>,
  locale: Locale
) {
  return `/${locale}/${kind}/${getEntryRoutePath(entry)}`
}

export async function getAllBlogEntries(): Promise<CollectionEntry<'blog'>[]> {
  return sortMDByDate((await getBlogCollection()) as CollectionEntry<'blog'>[]) as CollectionEntry<'blog'>[]
}

export async function getLocalizedBlogEntries(locale: Locale): Promise<CollectionEntry<'blog'>[]> {
  const posts = await getAllBlogEntries()
  return posts.filter((post) => getEntryLocale(post) === locale && !post.data.draft)
}

export async function getAllArchiveEntries(): Promise<CollectionEntry<'archive'>[]> {
  return (await getCollection('archive'))
    .filter((entry): entry is CollectionEntry<'archive'> => !entry.data.draft)
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
}

export async function getLocalizedArchiveEntries(
  locale: Locale
): Promise<CollectionEntry<'archive'>[]> {
  const entries = await getAllArchiveEntries()
  return entries.filter((entry) => getEntryLocale(entry) === locale)
}

export function findTranslatedEntry<T extends CollectionKey>(
  entries: CollectionEntry<T>[],
  entry: CollectionEntry<T>,
  targetLocale: Locale
) {
  const translationKey = entry.data.translationKey
  if (!translationKey) return undefined

  return entries.find(
    (candidate) =>
      candidate.id !== entry.id &&
      candidate.data.translationKey === translationKey &&
      getEntryLocale(candidate) === targetLocale
  )
}

export function groupBlogEntriesByYear(entries: Awaited<ReturnType<typeof getLocalizedBlogEntries>>) {
  return groupCollectionsByYear(entries)
}

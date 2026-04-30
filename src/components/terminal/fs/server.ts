import { getCollection } from 'astro:content'
import { sortMDByDate } from 'astro-pure/server'

import { buildManifest, type FsCollectionEntry } from './manifest'
import type { FsNode } from './types'

/**
 * Server-only entry point for the pseudo-FS. Loads blog + archive
 * collections, normalizes them into `FsCollectionEntry`, and builds the
 * manifest. Called once per page render from BaseLayout / Terminal.astro.
 */
export async function buildSiteFs(): Promise<FsNode> {
  const blog = sortMDByDate(await getCollection('blog')).slice(0, 12).map(toEntry)
  const archiveRaw = await getCollection('archive').catch(() => [] as unknown[])
  // sortMDByDate keys on `publishDate`; archive uses `date`, so we normalize first.
  const notes = (archiveRaw as { id: string; data: Record<string, unknown> }[])
    .map(toEntry)
    .sort((a, b) => (b.data.publishDate ?? '').toString().localeCompare((a.data.publishDate ?? '').toString()))
    .slice(0, 12)
  return buildManifest({ blog, notes })
}

function toEntry(p: { id: string; data: Record<string, unknown> }): FsCollectionEntry {
  const fm = p.data
  const date = (fm.publishDate ?? fm.date) as Date | string | undefined
  return {
    id: p.id,
    data: {
      title: (fm.title as string) ?? p.id,
      description: fm.description as string | undefined,
      publishDate: date,
      tags: (fm.tags as string[]) ?? []
    }
  }
}

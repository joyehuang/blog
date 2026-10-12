/** Same visibility rule as `getBlogCollection`: drafts stay in dev and drop in production. */
export function includeInRss(draft: boolean | undefined, prod: boolean) {
  return prod ? !draft : true
}

export type RssPost = {
  id: string
  data: {
    draft?: boolean
    title: string
    description?: string
    publishDate: Date
    updatedDate?: Date
  }
}

export type RssNote = {
  id: string
  data: {
    draft?: boolean
    title: string
    description?: string
    date: Date
    updatedDate?: Date
    /** External reference. Never an RSS item link. */
    source?: string
  }
}

export type RssEntry<P extends RssPost = RssPost, N extends RssNote = RssNote> =
  | { kind: 'post'; entry: P }
  | { kind: 'note'; entry: N }

type Tagged<P extends RssPost, N extends RssNote> = RssEntry<P, N> & { sortDate: number }

/** Feed order follows the frontmatter date shown as `pubDate`, newest first. */
function sortDate(entry: RssPost | RssNote) {
  if ('publishDate' in entry.data) return new Date(entry.data.publishDate).valueOf()
  return new Date(entry.data.date).valueOf()
}

export function mergeRssEntries<P extends RssPost, N extends RssNote>(
  posts: readonly P[],
  notes: readonly N[],
  prod: boolean
): RssEntry<P, N>[] {
  const tagged: Tagged<P, N>[] = [
    ...posts
      .filter((entry) => includeInRss(entry.data.draft, prod))
      .map((entry) => ({ kind: 'post' as const, entry, sortDate: sortDate(entry) })),
    ...notes
      .filter((entry) => includeInRss(entry.data.draft, prod))
      .map((entry) => ({ kind: 'note' as const, entry, sortDate: sortDate(entry) }))
  ]
  tagged.sort((a, b) => b.sortDate - a.sortDate)
  return tagged
}

export type RssItemFields = {
  title: string
  description?: string
  pubDate: Date
  link: string
}

/** Title, description, and date come from frontmatter. Note links are always `/notes/<id>`. */
export function rssItemFields(item: RssEntry): RssItemFields {
  if (item.kind === 'note') {
    const { title, description, date } = item.entry.data
    return {
      title,
      pubDate: date,
      link: `/notes/${item.entry.id}`,
      ...(description ? { description } : {})
    }
  }
  const { title, description, publishDate } = item.entry.data
  return {
    title,
    pubDate: publishDate,
    link: `/blog/${item.entry.id}`,
    ...(description ? { description } : {})
  }
}

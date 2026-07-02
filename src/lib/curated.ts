import type { CollectionEntry } from 'astro:content'

export type CuratedEntry = CollectionEntry<'curated'>
export type CuratedType = CuratedEntry['data']['type']

export const curatedTypeOrder: CuratedType[] = ['paper', 'blog', 'article', 'report', 'repo']

export const curatedTypeLabels = {
  zh: {
    all: '全部',
    paper: '论文',
    blog: '博客',
    article: '文章',
    report: '报告',
    repo: 'Repo'
  },
  en: {
    all: 'All',
    paper: 'Paper',
    blog: 'Blog',
    article: 'Article',
    report: 'Report',
    repo: 'Repo'
  }
} as const

export const curatedStatusLabels = {
  zh: {
    curated: '已收录',
    digested: '已整理'
  },
  en: {
    curated: 'Curated',
    digested: 'Digested'
  }
} as const

export const curatedDifficultyLabels = {
  zh: {
    intro: '入门',
    intermediate: '进阶',
    deep: '深读'
  },
  en: {
    intro: 'Intro',
    intermediate: 'Intermediate',
    deep: 'Deep'
  }
} as const

export function sortCuratedEntries(entries: CuratedEntry[]) {
  return [...entries].sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
}

export function getCuratedSourceHost(source: string) {
  try {
    return new URL(source).hostname.replace(/^www\./, '')
  } catch {
    return source.replace(/https?:\/\//, '').split('/')[0]
  }
}

export function getCuratedDigestHref(item: CuratedEntry) {
  const relatedNote = item.data.relatedNote?.[0]
  return relatedNote ? `/notes/${relatedNote}` : undefined
}

import { getCollection } from 'astro:content'
import { published } from '@/lib/seo/drafts'

import type { DockLinks } from '@/components/jojo/JojoDock'

const POOL = 16
let cache: Partial<Record<'zh' | 'en', DockLinks>> = {}

/** Real destinations for the dock menu, computed once per build/process. */
export async function dockLinks(lang: 'zh' | 'en'): Promise<DockLinks> {
  const hit = cache[lang]
  if (hit) return hit
  const about = lang === 'en' ? '/en/about' : '/about'
  let list: { title: string; href: string; date: number }[]
  if (lang === 'en') {
    list = (await getCollection('blogEn'))
      .filter((p) => published(p) && p.data.translationKey)
      .map((p) => ({
        title: p.data.title,
        href: `/en/blog/${p.data.translationKey}`,
        date: +new Date(p.data.publishDate)
      }))
  } else {
    list = (await getCollection('blog'))
      .filter((p) => published(p))
      .map((p) => ({
        title: p.data.title,
        href: `/blog/${p.id}`,
        date: +new Date(p.data.publishDate)
      }))
  }
  list.sort((a, b) => b.date - a.date)
  const links: DockLinks = {
    latest: list[0] ? { title: list[0].title, href: list[0].href } : null,
    pool: list.slice(0, POOL).map((p) => p.href),
    about
  }
  cache = { ...cache, [lang]: links }
  return links
}

import { getCollection } from 'astro:content'

import type { SiteRoute } from './not-found'

/**
 * Every reachable page, flattened into a `{ url, title }` index for the 404
 * page's "did you mean" suggestions. Built at build time and inlined into the
 * prerendered 404 HTML — a few KB, which beats making a broken URL wait on a
 * manifest fetch before it can be helpful.
 *
 * Deliberately excludes: the alternate homepages (`/v2`, `/v3`), API routes,
 * OG image endpoints, and the 404s themselves — none of them are somewhere a
 * visitor meant to land.
 */

const STATIC_ROUTES: SiteRoute[] = [
  { url: '/', title: '首页' },
  { url: '/blog', title: 'Blog' },
  { url: '/notes', title: 'Notes' },
  { url: '/curated', title: 'Curated' },
  { url: '/lab', title: 'Lab' },
  { url: '/talks', title: 'Talks · 分享会' },
  { url: '/projects', title: 'Projects' },
  { url: '/links', title: 'Links · 友链' },
  { url: '/about', title: 'About' },
  { url: '/contact', title: 'Contact' },
  { url: '/archives', title: 'Archives' },
  { url: '/agent-teams', title: 'Agent 组队' },
  { url: '/search', title: 'Search' },
  { url: '/tags', title: 'Tags' },
  { url: '/en', title: 'Home' },
  { url: '/en/blog', title: 'Blog' },
  { url: '/en/notes', title: 'Notes' },
  { url: '/en/curated', title: 'Curated' },
  { url: '/en/projects', title: 'Projects' },
  { url: '/en/links', title: 'Links' },
  { url: '/en/about', title: 'About' },
  { url: '/en/contact', title: 'Contact' },
  { url: '/en/search', title: 'Search' },
  { url: '/en/tags', title: 'Tags' }
]

export async function buildSiteRoutes(): Promise<SiteRoute[]> {
  const [blog, blogEn, notes, notesEn, lab] = await Promise.all([
    getCollection('blog', ({ data }) => !data.draft),
    getCollection('blogEn', ({ data }) => !data.draft && Boolean(data.translationKey)),
    getCollection('notes', ({ data }) => !data.draft),
    getCollection('notesEn', ({ data }) => !data.draft && Boolean(data.translationKey)),
    getCollection('lab', ({ data }) => !data.draft)
  ])

  return [
    ...STATIC_ROUTES,
    ...blog.map<SiteRoute>((entry) => ({
      url: `/blog/${encodeURI(entry.id)}`,
      title: entry.data.title
    })),
    ...blogEn.map<SiteRoute>((entry) => ({
      url: `/en/blog/${encodeURI(entry.data.translationKey!)}`,
      title: entry.data.title
    })),
    ...notes.map<SiteRoute>((entry) => ({
      url: `/notes/${encodeURI(entry.id)}`,
      title: entry.data.title
    })),
    ...notesEn.map<SiteRoute>((entry) => ({
      url: `/en/notes/${encodeURI(entry.data.translationKey!)}`,
      title: entry.data.title
    })),
    ...lab.map<SiteRoute>((entry) => ({
      url: `/lab/${encodeURI(entry.id)}`,
      title: entry.data.title
    }))
  ]
}

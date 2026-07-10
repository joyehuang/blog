import type { APIRoute } from 'astro'
import { getCollection } from 'astro:content'

export const prerender = false

type SearchDoc = {
  collection: 'blog' | 'notes'
  title: string
  description?: string
  url: string
  date: string
  tags: string[]
  body: string
}

type SearchResult = Omit<SearchDoc, 'body'> & {
  excerpt: string
  score: number
}

export const GET: APIRoute = async ({ url }) => {
  const query = (url.searchParams.get('q') ?? '').trim()
  const limit = clampLimit(Number(url.searchParams.get('limit') ?? 10))
  const lang = url.searchParams.get('lang') === 'en' ? 'en' : 'zh'

  if (query.length < 2) {
    return json({ query, results: [] })
  }

  const docs = await buildSearchDocs(lang)
  const results = docs
    .map((doc) => scoreDoc(doc, query))
    .filter((result): result is SearchResult => Boolean(result))
    .sort((a, b) => b.score - a.score || b.date.localeCompare(a.date))
    .slice(0, limit)

  return json({ query, results })
}

function json(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    headers: {
      'cache-control': 'public, max-age=60, s-maxage=300',
      'content-type': 'application/json; charset=utf-8'
    }
  })
}

function clampLimit(limit: number) {
  if (!Number.isFinite(limit)) return 10
  return Math.max(1, Math.min(20, Math.floor(limit)))
}

async function buildSearchDocs(lang: 'zh' | 'en'): Promise<SearchDoc[]> {
  // en 集合的路由用 translationKey（.en 文件名 slug 化后不是合法路由）
  if (lang === 'en') {
    const [blogPosts, notesEntries] = await Promise.all([
      getCollection('blogEn', ({ data }) => !data.draft && Boolean(data.translationKey)),
      getCollection('notesEn', ({ data }) => !data.draft && Boolean(data.translationKey))
    ])

    const blogDocs = blogPosts.map<SearchDoc>((entry) => ({
      collection: 'blog',
      title: entry.data.title,
      description: entry.data.description,
      url: `/en/blog/${encodeURI(entry.data.translationKey!)}`,
      date: formatDate(entry.data.publishDate),
      tags: entry.data.tags,
      body: normalizeBody((entry as { body?: string }).body ?? '')
    }))

    const noteDocs = notesEntries.map<SearchDoc>((entry) => ({
      collection: 'notes',
      title: entry.data.title,
      description: entry.data.description,
      url: `/en/notes/${encodeURI(entry.data.translationKey!)}`,
      date: formatDate(entry.data.date),
      tags: entry.data.tags,
      body: normalizeBody((entry as { body?: string }).body ?? '')
    }))

    return [...blogDocs, ...noteDocs]
  }

  const [blogPosts, notesEntries] = await Promise.all([
    getCollection('blog', ({ data }) => !data.draft),
    getCollection('notes', ({ data }) => !data.draft)
  ])

  const blogDocs = blogPosts.map<SearchDoc>((entry) => ({
    collection: 'blog',
    title: entry.data.title,
    description: entry.data.description,
    url: `/blog/${encodeURI(entry.id)}`,
    date: formatDate(entry.data.publishDate),
    tags: entry.data.tags,
    body: normalizeBody((entry as { body?: string }).body ?? '')
  }))

  const noteDocs = notesEntries.map<SearchDoc>((entry) => ({
    collection: 'notes',
    title: entry.data.title,
    description: entry.data.description,
    url: `/notes/${encodeURI(entry.id)}`,
    date: formatDate(entry.data.date),
    tags: entry.data.tags,
    body: normalizeBody((entry as { body?: string }).body ?? '')
  }))

  return [...blogDocs, ...noteDocs]
}

function scoreDoc(doc: SearchDoc, query: string): SearchResult | null {
  const terms = tokenize(query)
  if (terms.length === 0) return null

  const title = doc.title.toLowerCase()
  const description = (doc.description ?? '').toLowerCase()
  const tags = doc.tags.join(' ').toLowerCase()
  const body = doc.body.toLowerCase()
  const haystack = `${title} ${description} ${tags} ${body}`

  let score = 0
  for (const term of terms) {
    if (!haystack.includes(term)) return null
    if (title.includes(term)) score += 12
    if (description.includes(term)) score += 7
    if (tags.includes(term)) score += 5
    score += countOccurrences(body, term)
  }

  return {
    collection: doc.collection,
    title: doc.title,
    description: doc.description,
    url: doc.url,
    date: doc.date,
    tags: doc.tags,
    excerpt: makeExcerpt(doc, terms),
    score
  }
}

function tokenize(query: string) {
  const normalized = query.toLowerCase().trim()
  const parts = normalized.split(/\s+/).filter(Boolean)
  return parts.length > 1 ? parts : normalized.length >= 2 ? [normalized] : []
}

function countOccurrences(text: string, term: string) {
  let count = 0
  let idx = text.indexOf(term)
  while (idx !== -1) {
    count += 1
    idx = text.indexOf(term, idx + term.length)
  }
  return count
}

function makeExcerpt(doc: SearchDoc, terms: string[]) {
  const source = doc.body || doc.description || doc.title
  const lower = source.toLowerCase()
  const hit = terms
    .map((term) => lower.indexOf(term))
    .filter((idx) => idx >= 0)
    .sort((a, b) => a - b)[0]

  const start = Math.max(0, (hit ?? 0) - 52)
  const end = Math.min(source.length, start + 168)
  const prefix = start > 0 ? '...' : ''
  const suffix = end < source.length ? '...' : ''
  return `${prefix}${source.slice(start, end).trim()}${suffix}`
}

function normalizeBody(body: string) {
  return body
    .replace(/^[ \t]*import\s+[^\n]*\n/gm, '')
    .replace(/^[ \t]*export\s+[^\n]*\n/gm, '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<([A-Z][A-Za-z0-9]*)\b[^>]*>([\s\S]*?)<\/\1>/g, '$2')
    .replace(/^[ \t]*<[A-Z][\s\S]*?\/>\s*$/gm, '')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~|:-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function formatDate(date: Date | string) {
  return date instanceof Date ? date.toISOString().slice(0, 10) : String(date).slice(0, 10)
}

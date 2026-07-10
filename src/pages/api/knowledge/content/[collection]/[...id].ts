import { createHash } from 'node:crypto'
import type { APIRoute } from 'astro'
import { getEntry } from 'astro:content'
import { createMarkdownProcessor } from '@astrojs/markdown-remark'
import remarkCjkFriendly from 'remark-cjk-friendly'

const COLLECTIONS = {
  blog: 'blog',
  blog_en: 'blogEn',
  notes: 'notes',
  notes_en: 'notesEn',
  curated: 'curated',
  talks: 'talks'
} as const

type PublicCollection = keyof typeof COLLECTIONS
type KnowledgeEntry = {
  id: string
  body?: string
  data: Record<string, unknown> & {
    title?: string
    description?: string
    draft?: boolean
    language?: string
    publishDate?: Date | string
    date?: Date | string
    updatedDate?: Date | string
    tags?: string[]
    translationKey?: string
  }
}

let processorPromise: Promise<Awaited<ReturnType<typeof createMarkdownProcessor>>> | null = null

function getProcessor() {
  if (!processorPromise) {
    processorPromise = createMarkdownProcessor({
      gfm: true,
      smartypants: true,
      remarkPlugins: [remarkCjkFriendly],
      shikiConfig: {
        themes: { light: 'github-light', dark: 'github-dark' }
      }
    })
  }
  return processorPromise
}

export const GET: APIRoute = async ({ params }) => {
  const collection = params.collection as PublicCollection | undefined
  const id = params.id
  if (!collection || !id || !(collection in COLLECTIONS)) {
    return json({ error: 'Not found' }, 404)
  }

  const entry = (await getEntry(COLLECTIONS[collection] as never, id)) as KnowledgeEntry | undefined
  if (!entry || entry.data.draft === true) return json({ error: 'Not found' }, 404)

  const raw = entry.body ?? ''
  const markdown = stripMdxMachinery(raw)
  const processor = await getProcessor()
  const result = await processor.render(markdown)
  const headings = (result.metadata?.headings ?? []) as Array<{
    depth: number
    slug: string
    text: string
  }>

  return json({
    id: entry.id,
    collection,
    title: entry.data.title,
    description: entry.data.description,
    language: entry.data.language ?? inferLanguage(collection),
    canonical_url: canonicalUrl(collection, entry),
    published_at: formatDate(entry.data.publishDate ?? entry.data.date),
    updated_at: formatDate(entry.data.updatedDate ?? entry.data.publishDate ?? entry.data.date),
    tags: entry.data.tags ?? [],
    content_hash: hashEntry(entry.data, raw),
    frontmatter: entry.data,
    markdown,
    html: result.code,
    headings
  })
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=300, s-maxage=86400',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, OPTIONS',
      'x-robots-tag': 'all'
    }
  })
}

export const OPTIONS: APIRoute = () =>
  new Response(null, {
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, OPTIONS',
      'access-control-max-age': '86400'
    }
  })

function inferLanguage(collection: PublicCollection): string {
  return collection.endsWith('_en') ? 'en' : 'zh'
}

function canonicalUrl(collection: PublicCollection, entry: KnowledgeEntry): string {
  const routeId =
    collection.endsWith('_en') && entry.data.translationKey ? entry.data.translationKey : entry.id
  const encoded = encodeURI(routeId)
  if (collection === 'blog') return `https://joyehuang.me/blog/${encoded}`
  if (collection === 'blog_en') return `https://joyehuang.me/en/blog/${encoded}`
  if (collection === 'notes') return `https://joyehuang.me/notes/${encoded}`
  if (collection === 'notes_en') return `https://joyehuang.me/en/notes/${encoded}`
  if (collection === 'curated') return `https://joyehuang.me/curated#${encodeURIComponent(routeId)}`
  return `https://joyehuang.me/talks#${encodeURIComponent(routeId)}`
}

function formatDate(value: Date | string | undefined): string {
  if (!value) return ''
  if (value instanceof Date) return value.toISOString()
  return new Date(value).toISOString()
}

function hashEntry(data: unknown, body: string): string {
  return createHash('sha256').update(JSON.stringify(data)).update('\n').update(body).digest('hex')
}

function stripMdxMachinery(body: string): string {
  return (
    body
      .replace(/^[ \t]*import\s+[^\n]*\n/gm, '')
      .replace(/^[ \t]*export\s+[^\n]*\n/gm, '')
      .replace(/^[ \t]*<[A-Z][\s\S]*?\/>\s*$/gm, '')
      .replace(/<([A-Z][A-Za-z0-9]*)\b[^>]*>([\s\S]*?)<\/\1>/g, '$2')
      .replace(/\n{3,}/g, '\n\n')
      .trim() + '\n'
  )
}

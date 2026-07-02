import {
  ABOUT_TEXT,
  MOTD_TEXT,
  NOW_TEXT,
  PERSONALITY_TEXT,
  README_TEXT,
  SOCIAL_LINKS
} from './content'
import type { DirNode, FsNode } from './types'

/**
 * Minimal shape we need from a content collection entry. BaseLayout passes
 * already-sorted entries; this module stays pure (no `astro:content` import)
 * so types stay portable across server/client.
 */
export type FsCollectionEntry = {
  id: string
  routeId: string
  kind: 'blog' | 'blog_en' | 'notes' | 'notes_en' | 'curated' | 'talks'
  data: {
    title: string
    description?: string
    publishDate?: Date | string
    updatedDate?: Date | string
    tags?: string[]
    language?: string
    contentHash?: string
    extra?: Record<string, unknown>
  }
}

export type BuildArgs = {
  blog: FsCollectionEntry[]
  blogEn: FsCollectionEntry[]
  /** notes collection — surfaced as `/notes` in the FS. */
  notes: FsCollectionEntry[]
  notesEn: FsCollectionEntry[]
  curated: FsCollectionEntry[]
  talks: FsCollectionEntry[]
}

/**
 * Build the pseudo-FS root from collection data. Pure function: same input
 * always yields the same tree. Called once per page render in BaseLayout.
 */
export function buildManifest({ blog, blogEn, notes, notesEn, curated, talks }: BuildArgs): FsNode {
  return {
    type: 'dir',
    name: '',
    description: 'root',
    children: [
      { type: 'file', name: 'README', description: 'how to read this site', content: README_TEXT },
      { type: 'file', name: 'about', description: 'bio', content: ABOUT_TEXT },
      { type: 'file', name: 'now', description: 'currently working on', content: NOW_TEXT },
      buildPostsDir('blog', 'recent blog posts', blog, '/blog'),
      buildPostsDir('notes', 'short-form notes', notes, '/notes'),
      buildPostsDir('blog_en', 'English blog mirrors', blogEn, '/en/blog'),
      buildPostsDir('notes_en', 'English short-form note mirrors', notesEn, '/en/notes'),
      buildPostsDir('curated', 'curated external readings and digests', curated, '/curated'),
      buildPostsDir('talks', 'weekly sharing sessions', talks, '/talks'),
      buildContactDir(),
      buildEtcDir(),
      {
        type: 'link',
        name: 'manifest',
        description: 'agent-facing site map (well-known JSON)',
        href: '/.well-known/joye-manifest.json'
      }
    ]
  }
}

function buildPostsDir(
  name: string,
  description: string,
  posts: FsCollectionEntry[],
  hrefRoot: string
): DirNode {
  return {
    type: 'dir',
    name,
    description,
    children: posts.map((p) => buildPostDir(p, hrefRoot))
  }
}

function buildPostDir(p: FsCollectionEntry, hrefRoot: string): DirNode {
  const slug = slugify(p.id)
  const date = formatDate(p.data.publishDate)
  const updated = formatDate(p.data.updatedDate)
  const summary = p.data.description ?? '(no description)'
  const tags = p.data.tags ?? []
  const lang = p.data.language ?? inferLang(p)
  const href = hrefFor(p, hrefRoot)
  const endpoint = `/api/knowledge/content/${p.kind}/${encodeURI(p.id)}`
  const canonicalUrl = `https://joyehuang.me${href}`
  const metaContent = formatMeta({
    title: p.data.title,
    date,
    updated,
    slug,
    lang,
    tags,
    href,
    endpoint,
    canonical_url: canonicalUrl,
    content_hash: p.data.contentHash
  })
  const extra = p.data.extra ?? {}
  return {
    type: 'dir',
    name: slug,
    description: p.data.title,
    // Dir-level meta lets agents sort/filter without descending into
    // children. `endpoint` is duplicated here from the `post` child for
    // the same reason — avoids the "look up the post node, then read
    // its endpoint" hop. Note: the URL slug differs from `name` (Astro
    // collection ids vs FS-safe names) — agents should follow `endpoint`
    // verbatim, never construct it from `name`.
    meta: {
      date,
      updated_at: updated,
      title: p.data.title,
      lang,
      tags,
      endpoint,
      href,
      canonical_url: canonicalUrl,
      content_hash: p.data.contentHash,
      collection: p.kind,
      id: p.id,
      ...extra
    },
    children: [
      {
        type: 'file',
        name: 'meta',
        description: 'frontmatter',
        content: metaContent,
        meta: {
          slug,
          date,
          updated_at: updated,
          title: p.data.title,
          lang,
          tags,
          endpoint,
          href,
          canonical_url: canonicalUrl,
          content_hash: p.data.contentHash,
          collection: p.kind,
          id: p.id,
          ...extra
        }
      },
      {
        type: 'file',
        name: 'summary',
        description: 'one-line description',
        content: summary
      },
      {
        type: 'file',
        name: 'post',
        description: 'full text and rendered HTML',
        endpoint,
        href,
        meta: {
          slug,
          date,
          updated_at: updated,
          title: p.data.title,
          lang,
          endpoint,
          href,
          canonical_url: canonicalUrl,
          content_hash: p.data.contentHash,
          collection: p.kind,
          id: p.id
        }
      }
    ]
  }
}

function hrefFor(p: FsCollectionEntry, hrefRoot: string): string {
  if (p.kind === 'curated') return `${hrefRoot}#${encodeURIComponent(p.routeId)}`
  if (p.kind === 'talks') return `${hrefRoot}#${encodeURIComponent(p.routeId)}`
  return `${hrefRoot}/${encodeURI(p.routeId)}`
}

/**
 * Best-effort language guess for a post: explicit `data.language` wins,
 * else look for an `/en/` segment in the entry id (i18n convention used
 * by content collection — `<slug>/en/post.mdx`), else default to zh.
 */
function inferLang(p: FsCollectionEntry): string {
  const explicit = (p.data as { language?: string }).language
  if (explicit) return explicit
  if (/(^|\/)en\//.test(p.id)) return 'en'
  return 'zh'
}

function buildContactDir(): DirNode {
  return {
    type: 'dir',
    name: 'contact',
    description: 'where to reach me',
    children: SOCIAL_LINKS.map<FsNode>((s) => ({
      type: 'link',
      name: s.label,
      href: s.href
    }))
  }
}

function buildEtcDir(): DirNode {
  return {
    type: 'dir',
    name: 'etc',
    description: 'configs and motd',
    children: [
      { type: 'file', name: 'personality.conf', content: PERSONALITY_TEXT },
      { type: 'file', name: 'motd', content: MOTD_TEXT }
    ]
  }
}

function slugify(id: string): string {
  return id
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function formatDate(d: Date | string | undefined): string {
  if (!d) return ''
  if (d instanceof Date) return d.toISOString().slice(0, 10)
  return String(d).slice(0, 10)
}

function formatMeta(obj: Record<string, unknown>): string {
  const lines: string[] = []
  for (const [k, v] of Object.entries(obj)) {
    if (Array.isArray(v)) lines.push(`${k}: [${v.join(', ')}]`)
    else lines.push(`${k}: ${v}`)
  }
  return lines.join('\n') + '\n'
}

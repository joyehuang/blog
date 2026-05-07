import type { DirNode, FsNode } from './types'
import {
  ABOUT_TEXT,
  MOTD_TEXT,
  NOW_TEXT,
  PERSONALITY_TEXT,
  README_TEXT,
  SOCIAL_LINKS
} from './content'

/**
 * Minimal shape we need from a content collection entry. BaseLayout passes
 * already-sorted entries; this module stays pure (no `astro:content` import)
 * so types stay portable across server/client.
 */
export type FsCollectionEntry = {
  id: string
  data: {
    title: string
    description?: string
    publishDate?: Date | string
    tags?: string[]
  }
}

export type BuildArgs = {
  blog: FsCollectionEntry[]
  /** archive collection — surfaced as `/notes` in the FS. */
  notes: FsCollectionEntry[]
}

/**
 * Build the pseudo-FS root from collection data. Pure function: same input
 * always yields the same tree. Called once per page render in BaseLayout.
 */
export function buildManifest({ blog, notes }: BuildArgs): FsNode {
  return {
    type: 'dir',
    name: '',
    description: 'root',
    children: [
      { type: 'file', name: 'README', description: 'how to read this site', content: README_TEXT },
      { type: 'file', name: 'about', description: 'bio', content: ABOUT_TEXT },
      { type: 'file', name: 'now', description: 'currently working on', content: NOW_TEXT },
      buildPostsDir('blog', 'recent blog posts', blog, '/blog'),
      buildPostsDir('notes', 'short-form notes', notes, '/archive'),
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
  const summary = p.data.description ?? '(no description)'
  const meta = formatMeta({
    title: p.data.title,
    date,
    slug,
    tags: p.data.tags ?? []
  })
  const href = `${hrefRoot}/${encodeURI(p.id)}`
  // Inline `cat post` viewer fetches plaintext from this endpoint. Only
  // wired up for blog so far; archive entries fall back to a placeholder.
  const endpoint = hrefRoot === '/blog' ? `/api/blog/${encodeURI(p.id)}` : undefined
  return {
    type: 'dir',
    name: slug,
    description: p.data.title,
    children: [
      {
        type: 'file',
        name: 'meta',
        description: 'frontmatter',
        content: meta,
        meta: { slug, date, title: p.data.title, tags: p.data.tags ?? [] }
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
        description: endpoint ? 'full text (inline)' : 'full text (rendered page only)',
        endpoint,
        href,
        meta: { slug, date, title: p.data.title }
      }
    ]
  }
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

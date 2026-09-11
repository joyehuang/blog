import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

export const origin = 'https://www.joyehuang.me'
export const hash = (text) => createHash('sha256').update(text).digest('hex')
export const decode = (s = '') =>
  s
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_, n) =>
      String.fromCodePoint(n[0].toLowerCase() === 'x' ? parseInt(n.slice(1), 16) : +n)
    )
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
export function attrs(tag) {
  return Object.fromEntries(
    [...tag.matchAll(/([\w:-]+)\s*=\s*(["'])([\s\S]*?)\2/g)].map((m) => [m[1], decode(m[3])])
  )
}
export function parseHtml(html, path) {
  const metas = [...html.matchAll(/<meta\b(?:"[^"]*"|'[^']*'|[^'">])*>/g)].map((m) => attrs(m[0]))
  const links = [...html.matchAll(/<link\b(?:"[^"]*"|'[^']*'|[^'">])*>/g)].map((m) => attrs(m[0]))
  const canonical = links.find((l) => l.rel === 'canonical')?.href
  const title = decode(html.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '')
  const description = metas.find((m) => m.name === 'description')?.content || ''
  const noindex = /noindex/i.test(metas.find((m) => m.name === 'robots')?.content || '')
  const body = (html.match(/<body\b[^>]*>([\s\S]*)<\/body>/)?.[1] || '').replace(
    /<(script|style)\b[^>]*>[\s\S]*?<\/\1>/g,
    ''
  )
  const text = decode(body.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
  const dates = [...html.matchAll(/"dateModified"\s*:\s*"([^"]+)"/g)].map((m) => m[1])
  const lastmod = dates.find((d) => /^\d{4}-\d\d-\d\dT/.test(d) && Number.isFinite(Date.parse(d)))
  const alternates = links
    .filter((l) => l.rel === 'alternate' && l.hreflang)
    .map((l) => ({ lang: l.hreflang, url: l.href }))
  // Main/article HTML preserves links and images for change detection; omit volatile scripts/styles and Astro scope hashes.
  const content = (body.match(/<main\b[\s\S]*?<\/main>/)?.[0] || body).replace(
    /data-astro-cid-[\w]+(?:="[^"]*")?/g,
    ''
  )
  return {
    path,
    canonical,
    title,
    description,
    noindex,
    lastmod,
    alternates,
    bodyHash: hash(text),
    fingerprint: hash(JSON.stringify([title, description, content, lastmod, alternates]))
  }
}
export async function readPages(dir, prefix = '') {
  const pages = []
  for (const entry of await readdir(join(dir, prefix), { withFileTypes: true })) {
    const name = join(prefix, entry.name)
    if (entry.isDirectory()) pages.push(...(await readPages(dir, name)))
    else if (entry.name.endsWith('.html')) {
      const path = name === '404.html' ? '/404' : '/' + name.replace(/(?:\/)?index\.html$/, '')
      pages.push(parseHtml(await readFile(join(dir, name), 'utf8'), path))
    }
  }
  return pages.sort((a, b) => a.path.localeCompare(b.path))
}
export function indexable(page) {
  return (
    !!page.canonical &&
    page.canonical === new URL(page.path, origin).href &&
    !page.noindex &&
    !/^\/(?:api|og|\.well-known)(?:\/|$)/.test(page.path)
  )
}

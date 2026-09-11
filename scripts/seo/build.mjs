import { execFileSync } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { indexable, origin, readPages } from './html.mjs'

export const xml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
export function validKey(key) {
  return typeof key === 'string' && /^[a-zA-Z0-9-]{8,128}$/.test(key)
}
export async function writeVerification(dir, key) {
  if (!key) return false
  if (!validKey(key)) throw new Error('Invalid INDEXNOW_KEY configuration')
  // Fixed root location avoids placing the proof value in paths/build logs.
  await writeFile(join(dir, 'indexnow-key.txt'), key, 'utf8')
  return true
}
export async function buildSeo(dir, env = process.env) {
  const pages = (await readPages(dir)).filter(indexable)
  const urls = new Set(pages.map((p) => p.canonical))
  const entries = pages
    .map((p) => {
      // Never infer translations from matching tag names or URL prefixes.
      const alternates = p.alternates.filter((a) => urls.has(a.url))
      return `<url><loc>${xml(p.canonical)}</loc>${p.lastmod ? `<lastmod>${xml(p.lastmod)}</lastmod>` : ''}${alternates.map((a) => `<xhtml:link rel="alternate" hreflang="${xml(a.lang)}" href="${xml(a.url)}"/>`).join('')}</url>`
    })
    .join('')
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${entries}</urlset>`
  await writeFile(join(dir, 'sitemap.xml'), sitemap)
  await writeFile(join(dir, 'sitemap-0.xml'), sitemap)
  let commit = env.VERCEL_GIT_COMMIT_SHA
  if (!commit) {
    try {
      commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
    } catch {
      commit = 'unknown'
    }
  }
  await mkdir(join(dir, '.well-known'), { recursive: true })
  await writeFile(
    join(dir, '.well-known/indexnow-manifest.json'),
    JSON.stringify({
      version: 1,
      origin,
      commit,
      urls: Object.fromEntries(pages.map((p) => [p.canonical, p.fingerprint]))
    })
  )
  await writeVerification(dir, env.INDEXNOW_KEY)
}

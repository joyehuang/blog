import { readFile, writeFile } from 'node:fs/promises'

import { indexable, readPages } from './html.mjs'

export function summarize(pages) {
  const duplicate = (key) =>
    Object.entries(
      Object.groupBy(
        pages.filter((p) => p[key]),
        (p) => p[key]
      )
    )
      .filter(([, v]) => v.length > 1)
      .map(([value, v]) => ({ value, paths: v.map((p) => p.path) }))
  const buckets = Object.groupBy(
    pages,
    (p) =>
      `${p.noindex ? 'noindex' : 'indexable'}/${/^\/en(?:\/|$)/.test(p.path) ? 'en' : 'zh'}/${/\/tags(?:\/|$)/.test(p.path) ? 'tag' : /\/(?:blog\/.+\/post|notes\/(?!tags(?:\/|$))[^/]*[^\d/][^/]*|lab\/[^/]*[^\d/][^/]*)$/.test(p.path) ? 'article' : 'section'}`
  )
  return {
    total: pages.length,
    indexable: pages.filter((p) => !p.noindex).length,
    sitemapEligible: pages.filter(indexable).length,
    buckets: Object.fromEntries(Object.entries(buckets).map(([k, v]) => [k, v.length])),
    missing: pages.filter((p) => !p.title || !p.description || !p.canonical).map((p) => p.path),
    slogan: pages.filter((p) => p.description === 'Stay hungry, stay foolish').map((p) => p.path),
    duplicateTitles: duplicate('title'),
    duplicateDescriptions: duplicate('description')
  }
}
if (import.meta.main) {
  const pages = await readPages(process.argv[2] || 'dist/client')
  if (process.argv[4]) pages.push(...(await readPages(process.argv[4])))
  let sitemap = ''
  try {
    sitemap = await readFile(`${process.argv[2] || 'dist/client'}/sitemap.xml`, 'utf8')
  } catch {}
  const result = {
    summary: summarize(pages),
    sitemap: {
      urls: [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]),
      lastmodCount: [...sitemap.matchAll(/<lastmod>/g)].length
    },
    pages
  }
  await writeFile(process.argv[3] || 'artifacts/seo/after.json', JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result.summary, null, 2))
}

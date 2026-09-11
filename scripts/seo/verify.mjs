import { readFile, writeFile } from 'node:fs/promises'

import { summarize } from './audit.mjs'
import { indexable, origin } from './html.mjs'

const baseline = JSON.parse(await readFile('artifacts/seo/baseline.json', 'utf8'))
const after = JSON.parse(await readFile('artifacts/seo/after.json', 'utf8'))
const { readPages } = await import('./html.mjs')
after.pages.push(...(await readPages('artifacts/seo/after-ssr')))
for (const data of [baseline, after]) {
  data.pages = [...new Map(data.pages.map((p) => [p.path, p])).values()].sort((a, b) =>
    a.path.localeCompare(b.path)
  )
  data.summary = summarize(data.pages)
}
const issues = []
const byUrl = new Map(after.pages.map((p) => [p.canonical, p]))
const sitemap = new Set(after.sitemap.urls)
for (const p of after.pages) {
  if (indexable(p) && !sitemap.has(p.canonical)) issues.push(`Missing sitemap URL: ${p.path}`)
  if (p.noindex && sitemap.has(p.canonical)) issues.push(`Noindex in sitemap: ${p.path}`)
  if (!p.noindex && (!p.title || !p.description || !p.canonical))
    issues.push(`Missing metadata: ${p.path}`)
  for (const a of p.alternates) {
    const other = byUrl.get(a.url)
    if (!other || other.noindex || !other.alternates.some((b) => b.url === p.canonical))
      issues.push(`Nonreciprocal alternate: ${p.path} -> ${a.url}`)
  }
}
for (const url of sitemap)
  if (!byUrl.has(url) || !url.startsWith(origin + '/')) issues.push(`Invalid sitemap URL: ${url}`)
const indexSummary = summarize(after.pages.filter((p) => !p.noindex))
if (indexSummary.duplicateTitles.length || indexSummary.duplicateDescriptions.length)
  issues.push('Indexable duplicate metadata')
const beforeByPath = new Map(baseline.pages.map((p) => [p.path, p]))
const bodyChanges = after.pages
  .filter((p) => beforeByPath.get(p.path)?.bodyHash !== p.bodyHash)
  .map((p) => p.path)
const articleMetadataChanges = after.pages
  .filter(
    (p) =>
      /\/(blog\/.+\/post|notes\/(?!tags)[^/]+)$/.test(p.path) &&
      !/\/\d+$/.test(p.path) &&
      beforeByPath.has(p.path) &&
      ['title', 'description'].some((k) => p[k] !== beforeByPath.get(p.path)[k])
  )
  .map((p) => p.path)
const result = {
  issues,
  bodyChanges,
  articleMetadataChanges,
  before: baseline.summary,
  after: after.summary,
  beforeSitemap: baseline.sitemap,
  afterSitemap: after.sitemap
}
await writeFile('artifacts/seo/baseline.json', JSON.stringify(baseline, null, 2))
await writeFile('artifacts/seo/after.json', JSON.stringify(after, null, 2))
await writeFile('artifacts/seo/comparison.json', JSON.stringify(result, null, 2))
console.log(
  JSON.stringify(
    {
      issues,
      bodyChanges,
      articleMetadataChanges,
      beforeTotal: baseline.summary.total,
      afterTotal: after.summary.total,
      lastmod: after.sitemap.lastmodCount
    },
    null,
    2
  )
)
if (issues.length || articleMetadataChanges.length) process.exitCode = 1

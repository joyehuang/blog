// Only fetch content already exposed by the production site's public APIs.
// Never read another checkout, QQ corpus, interview sources, or local notes.
import { writeFile } from 'node:fs/promises'
import { parse } from 'parse5'

import { safeSourceUrl, type Source } from '../../src/lib/chat/safety'

const origin = 'https://www.joyehuang.me'
async function get(path: string) {
  const u = new URL(path, origin)
  if (u.origin !== origin || !u.pathname.startsWith('/api/knowledge/'))
    throw Error('invalid_public_endpoint')
  const response = await fetch(u, { redirect: 'error', signal: AbortSignal.timeout(15000) })
  if (!response.ok) throw Error(`public_fetch_${response.status}`)
  return response.json()
}
const index = await get('/api/knowledge/index.json')
const sources: Source[] = []
async function walk(node: any) {
  const meta = node.meta
  const url = safeSourceUrl(meta?.href ?? node.href ?? '')
  if (
    url &&
    !sources.some((s) => s.url === url) &&
    meta?.endpoint &&
    ['blog', 'blog_en', 'notes', 'notes_en', 'talks', 'curated'].includes(meta.collection)
  ) {
    const body = await get(meta.endpoint)
    if (typeof body.markdown === 'string')
      sources.push({ title: meta.title ?? node.name, url, text: body.markdown })
  }
  for (const child of node.children ?? []) await walk(child)
}
await walk(index.tree)
// Static biography and project pages are fetched from their published HTML,
// never inferred from repository configuration or private working documents.
for (const path of ['/about', '/projects']) {
  const response = await fetch(origin + path, {
    redirect: 'error',
    signal: AbortSignal.timeout(15000)
  })
  if (!response.ok) throw Error('public_page_unavailable')
  const tree = parse(await response.text())
  const find = (node: any, tag: string): any =>
    node.tagName === tag
      ? node
      : (node.childNodes ?? []).map((n: any) => find(n, tag)).find(Boolean)
  const text = (node: any): string =>
    ['script', 'style', 'nav', 'footer', 'button'].includes(node.tagName)
      ? ''
      : node.nodeName === '#text'
        ? node.value
        : (node.childNodes ?? []).map(text).join(' ')
  const main = find(tree, 'main')
  if (!main) throw Error('public_main_missing')
  sources.push({
    title: text(find(tree, 'title')).trim(),
    url: origin + path,
    text: text(main).replace(/\s+/g, ' ').trim()
  })
}
if (!sources.length) throw Error('empty_public_corpus')
await writeFile(
  new URL('../../src/lib/chat/public-corpus.json', import.meta.url),
  JSON.stringify({ fetchedAt: new Date().toISOString(), sources })
)
console.log(`Saved ${sources.length} public sources`)

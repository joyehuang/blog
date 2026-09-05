// Only fetch content already exposed by the production site's public APIs.
// Never read another checkout, QQ corpus, interview sources, or local notes.
import { writeFile } from 'node:fs/promises'

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
    ['blog', 'blog_en', 'notes', 'notes_en'].includes(meta.collection)
  ) {
    const body = await get(meta.endpoint)
    if (typeof body.markdown === 'string')
      sources.push({ title: meta.title ?? node.name, url, text: body.markdown })
  }
  for (const child of node.children ?? []) await walk(child)
}
await walk(index.tree)
if (!sources.length) throw Error('empty_public_corpus')
await writeFile(
  new URL('../../src/lib/chat/public-corpus.json', import.meta.url),
  JSON.stringify({ fetchedAt: new Date().toISOString(), sources })
)
console.log(`Saved ${sources.length} public sources`)

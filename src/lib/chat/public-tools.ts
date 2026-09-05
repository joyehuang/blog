import { retrieve, safeCitationUrl, type Source } from './safety'
import { safeWebUrl } from './web-url'

// Adapted READ ONLY from QQ src/tools/tinyfish.ts and the public tool definitions
// in src/tools/index.ts. Credentials, stats globals, QQ state and module graph
// are deliberately not imported. Both tools operate on request-owned inputs.
export const PUBLIC_TOOLS = ['corpus_search', 'web_search'] as const
export const toolDefinitions = PUBLIC_TOOLS.map((name) => ({
  type: 'function',
  function: {
    name,
    description:
      name === 'corpus_search'
        ? 'Search Joye’s published About, projects, blog, notes, talks and curated material. Use for questions about Joye and his work.'
        : 'Search the public web for current facts, releases, documentation or missing knowledge. Results are excerpts, not full-page fetches.',
    parameters: {
      type: 'object',
      properties: { query: { type: 'string', maxLength: 240 } },
      required: ['query'],
      additionalProperties: false
    }
  }
}))

export async function boundedJson(response: Response, limit = 160000): Promise<any> {
  if (!response.ok || !response.body) throw Error('search_unavailable')
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.length
      if (size > limit) throw Error('search_too_large')
      chunks.push(value)
    }
  } finally {
    await reader.cancel().catch(() => {})
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.length
  }
  return JSON.parse(new TextDecoder().decode(bytes))
}

export function publicTools(deps: { corpus: Source[]; searchKey: string; fetcher?: typeof fetch }) {
  const fetcher = deps.fetcher ?? fetch
  return async (name: string, args: unknown, signal: AbortSignal): Promise<Source[]> => {
    if (!PUBLIC_TOOLS.includes(name as (typeof PUBLIC_TOOLS)[number]))
      throw Error('tool_not_allowed')
    if (
      !args ||
      typeof args !== 'object' ||
      Array.isArray(args) ||
      Object.keys(args).join() !== 'query'
    )
      throw Error('invalid_tool_arguments')
    const query = (args as { query: unknown }).query
    if (typeof query !== 'string' || !query.trim() || query.length > 240)
      throw Error('invalid_tool_arguments')
    signal.throwIfAborted()
    if (name === 'corpus_search') return retrieve(query, deps.corpus)
    // Never request a model/user/result-selected host. Query is data, not a URL
    // to fetch. Credentials travel only to this literal provider endpoint.
    const url = new URL('https://api.search.tinyfish.ai/')
    url.searchParams.set('query', query)
    const data = await boundedJson(
      await fetcher(url, {
        redirect: 'error',
        headers: { 'X-API-Key': deps.searchKey },
        signal: AbortSignal.any([signal, AbortSignal.timeout(10000)])
      })
    )
    const items = data.results ?? data.organic ?? data.data ?? []
    if (!Array.isArray(items)) throw Error('search_unavailable')
    return items
      .slice(0, 12)
      .flatMap((r: any) => {
        const url = typeof (r.url ?? r.link) === 'string' ? safeWebUrl(r.url ?? r.link) : undefined
        if (!url) return []
        return [
          {
            title: String(r.title ?? r.name ?? url).slice(0, 200),
            url,
            text: String(r.snippet ?? r.description ?? r.content ?? '').slice(0, 1200),
            kind: 'web' as const
          }
        ]
      })
      .filter((s) => safeCitationUrl(s))
      .slice(0, 4)
  }
}

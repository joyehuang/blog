import type { APIRoute } from 'astro'
import { getEntry } from 'astro:content'

/**
 * Plaintext endpoint consumed by the dev-mode `cat post` viewer. We
 * keep the file under `/api/` rather than nested under `/blog/` so it
 * doesn't fight the existing `[...id].astro` catch-all on that prefix.
 *
 * SSR (no prerender) — entry ids contain spaces and a `/post` suffix,
 * which Astro's spread-param prerender match fails to round-trip
 * cleanly. Going through the request lookup avoids that whole class.
 */
export const GET: APIRoute = async ({ params }) => {
  const id = params.id
  if (!id) return new Response('Not found', { status: 404 })
  const entry = await getEntry('blog', id)
  if (!entry) return new Response('Not found', { status: 404 })
  const body = (entry as { body?: string }).body ?? ''
  return new Response(cleanForTerminal(body), {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=300, s-maxage=86400'
    }
  })
}

/**
 * Soft-clean the raw mdx so it reads well in a terminal viewer.
 * Strips mdx machinery; leaves prose markdown alone — `## headings`,
 * fenced code blocks, lists already render fine in monospace.
 */
function cleanForTerminal(body: string): string {
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

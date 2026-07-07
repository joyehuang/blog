import type { APIRoute } from 'astro'

// Vite root == repo root, so this resolves at build time — no runtime
// filesystem read, which keeps it safe on Vercel's serverless functions.
import designMd from '../../../DESIGN.md?raw'

export const GET: APIRoute = () =>
  new Response(designMd, {
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
      'content-disposition': 'attachment; filename="design.md"',
      'cache-control': 'public, max-age=300, s-maxage=86400'
    }
  })

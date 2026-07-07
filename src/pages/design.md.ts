import type { APIRoute } from 'astro'
import designMd from '../../DESIGN.md?raw'

export const prerender = true

export const GET: APIRoute = () =>
  new Response(designMd, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8'
    }
  })

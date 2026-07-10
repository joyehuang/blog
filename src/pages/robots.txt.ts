import type { APIRoute } from 'astro'

export const prerender = true

const site = import.meta.env.SITE
const robotsTxt = [
  'User-agent: *',
  'Allow: /',
  'Disallow: /api/',
  '',
  `Sitemap: ${new URL('/sitemap.xml', site).href}`
].join('\n')

export const GET: APIRoute = () =>
  new Response(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8'
    }
  })

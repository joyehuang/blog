import type { APIRoute } from 'astro'

import { buildSiteFs } from '@/components/terminal/fs/server'

const SITE_URL = 'https://joyehuang.me'

export const GET: APIRoute = async () => {
  const tree = await buildSiteFs()

  return new Response(
    JSON.stringify(
      {
        version: '0.1',
        site: SITE_URL,
        description: 'Agent-facing knowledge index for Joye Huang personal site.',
        generated_at: new Date().toISOString(),
        sync: {
          strategy:
            'Walk tree nodes, fetch each meta.endpoint, and compare content_hash for changes.',
          endpoint_fields: [
            'markdown',
            'html',
            'headings',
            'frontmatter',
            'content_hash',
            'updated_at'
          ]
        },
        tree
      },
      null,
      2
    ),
    {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'public, max-age=300, s-maxage=86400',
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET, OPTIONS',
        'x-robots-tag': 'all'
      }
    }
  )
}

export const OPTIONS: APIRoute = () =>
  new Response(null, {
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, OPTIONS',
      'access-control-max-age': '86400'
    }
  })

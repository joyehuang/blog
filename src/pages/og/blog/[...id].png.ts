import type { APIRoute } from 'astro'
import { getCollection, type CollectionEntry } from 'astro:content'
import { postOgPng } from '@/lib/og'

import { getBlogCollection } from 'astro-pure/server'

export const prerender = true

export async function getStaticPaths() {
  const posts = await getBlogCollection()
  const postsEn = (await getCollection('blogEn')).filter((post) => post.data.translationKey)

  return [
    ...posts.map((post) => ({
      params: { id: post.id },
      props: { post }
    })),
    ...postsEn.map((post) => ({
      params: { id: `en/${post.data.translationKey}` },
      props: { post }
    }))
  ]
}

const formatDate = (d: Date) =>
  d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })

export const GET: APIRoute = async ({ props }) => {
  const post = props.post as CollectionEntry<'blog' | 'blogEn'>
  const png = await postOgPng({
    title: post.data.title,
    description: post.data.description,
    date: formatDate(post.data.publishDate),
    tags: post.data.tags
  })
  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  })
}

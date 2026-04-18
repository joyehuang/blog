import type { APIRoute } from 'astro'
import type { CollectionEntry } from 'astro:content'
import { getBlogCollection } from 'astro-pure/server'
import { postOgPng } from '@/lib/og'

export const prerender = true

export async function getStaticPaths() {
  const posts = await getBlogCollection()
  return posts.map((post) => ({
    params: { id: post.id },
    props: { post }
  }))
}

const formatDate = (d: Date) =>
  d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })

export const GET: APIRoute = async ({ props }) => {
  const post = props.post as CollectionEntry<'blog'>
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

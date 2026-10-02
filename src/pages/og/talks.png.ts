import type { APIRoute } from 'astro'
import { getCollection } from 'astro:content'
import { talksOgPng } from '@/lib/og'
import { formatTalkDate, sortTalks } from '@/lib/talks'

export const prerender = true

export const GET: APIRoute = async () => {
  const talks = sortTalks((await getCollection('talks')).filter((t) => !t.data.draft))
  const png = await talksOgPng({
    description: '群里每周一次的线上交流会，聊技术、求职和 AI 行业。轮流分享，公开沉淀。',
    episodes: talks.map(({ data }) => ({
      episode: data.episode,
      date: formatTalkDate(data.date),
      title: data.title,
      upcoming: data.status === 'upcoming'
    }))
  })
  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  })
}

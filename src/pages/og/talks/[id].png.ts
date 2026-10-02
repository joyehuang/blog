import type { APIRoute } from 'astro'
import { getCollection, type CollectionEntry } from 'astro:content'
import { talkOgPng } from '@/lib/og'
import { formatTalkDate } from '@/lib/talks'

export const prerender = true

export async function getStaticPaths() {
  const talks = (await getCollection('talks')).filter((t) => !t.data.draft)
  return talks.map((talk) => ({
    params: { id: talk.id },
    props: { talk }
  }))
}

export const GET: APIRoute = async ({ props }) => {
  const { data } = props.talk as CollectionEntry<'talks'>
  const png = await talkOgPng({
    episode: data.episode,
    title: data.title,
    subtitle: data.subtitle,
    date: formatTalkDate(data.date),
    durationMinutes: data.durationMinutes,
    attendees: data.attendees,
    topics: data.topics,
    upcoming: data.status === 'upcoming'
  })
  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  })
}

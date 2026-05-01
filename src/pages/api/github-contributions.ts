import type { APIRoute } from 'astro'

// SSR endpoint — must run on every request so the token stays server-side
// and the data reflects the authenticated user's private contributions.
export const prerender = false

type Level = 0 | 1 | 2 | 3 | 4
type Contribution = { date: string; count: number; level: Level }
type ApiShape = {
  total: { lastYear: number } & Record<string, number>
  contributions: Contribution[]
}

const LEVEL_MAP: Record<string, Level> = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4
}

const QUERY = `
  query($login: String!) {
    user(login: $login) {
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              contributionCount
              contributionLevel
            }
          }
        }
      }
    }
  }
`

export const GET: APIRoute = async ({ url }) => {
  const username = url.searchParams.get('username') ?? 'joyehuang'
  const token = import.meta.env.GITHUB_TOKEN ?? process.env.GITHUB_TOKEN

  if (!token) {
    return json({ error: 'GITHUB_TOKEN not configured' }, 500)
  }

  let res: Response
  try {
    res = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'joyehuang.me'
      },
      body: JSON.stringify({ query: QUERY, variables: { login: username } })
    })
  } catch (err) {
    return json({ error: 'fetch failed', detail: String(err) }, 502)
  }

  if (!res.ok) {
    return json({ error: `github api ${res.status}`, detail: await res.text() }, 502)
  }

  const payload = (await res.json()) as {
    data?: {
      user?: {
        contributionsCollection?: {
          contributionCalendar?: {
            totalContributions: number
            weeks: { contributionDays: { date: string; contributionCount: number; contributionLevel: string }[] }[]
          }
        }
      }
    }
    errors?: { message: string }[]
  }

  if (payload.errors?.length) {
    return json({ error: 'graphql', detail: payload.errors }, 502)
  }

  const calendar = payload.data?.user?.contributionsCollection?.contributionCalendar
  if (!calendar) {
    return json({ error: 'no calendar in response' }, 502)
  }

  const contributions: Contribution[] = []
  for (const week of calendar.weeks) {
    for (const day of week.contributionDays) {
      contributions.push({
        date: day.date,
        count: day.contributionCount,
        level: LEVEL_MAP[day.contributionLevel] ?? 0
      })
    }
  }

  const body: ApiShape = {
    total: { lastYear: calendar.totalContributions },
    contributions
  }

  return new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      // Cache at the CDN edge for 5 minutes, serve stale up to an hour while
      // revalidating in the background. The GraphQL call costs ~1 rate-limit
      // unit, so this keeps us well under the 5000/hour budget.
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600'
    }
  })
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  })
}

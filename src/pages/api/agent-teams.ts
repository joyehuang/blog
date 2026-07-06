import type { APIRoute } from 'astro'

import { teams } from '@/data/agent-teams'
import {
  addSignup,
  detailEditable,
  getDetails,
  getRosters,
  isConfigured,
  passcodeRequired,
  updateDetail,
  type DetailErrorCode,
  type PublicMember,
  type SignupErrorCode
} from '@/lib/agent-teams/store'

// SSR endpoint —— 名单要实时，且要读服务端 env / Redis，不能预渲染。
export const prerender = false

const teamIds = teams.map((t) => t.id)
const capacityOf = new Map(teams.map((t) => [t.id, t.capacity ?? null]))

type TeamPayload = {
  id: string
  count: number
  capacity: number | null
  members: PublicMember[]
  detail: string | null
}

function buildTeams(
  rosters: Record<string, PublicMember[]>,
  details: Record<string, string> = {}
): TeamPayload[] {
  return teams.map((t) => {
    const members = rosters[t.id] ?? []
    return {
      id: t.id,
      count: members.length,
      capacity: t.capacity ?? null,
      members,
      detail: details[t.id] ?? null
    }
  })
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      // 名单是动态的、需实时——不缓存。
      'Cache-Control': 'no-store'
    }
  })
}

export const GET: APIRoute = async () => {
  const configured = isConfigured()
  const editable = detailEditable()
  if (!configured) {
    return json({
      configured: false,
      passcodeRequired: false,
      detailEditable: editable,
      teams: buildTeams({})
    })
  }

  try {
    const [rosters, details] = await Promise.all([getRosters(teamIds), getDetails(teamIds)])
    return json({
      configured: true,
      passcodeRequired: passcodeRequired(),
      detailEditable: editable,
      teams: buildTeams(rosters, details)
    })
  } catch {
    // 数据库抖动——仍让页面渲染出队伍卡，只是名单/介绍暂时为空。
    return json({
      configured: true,
      degraded: true,
      passcodeRequired: passcodeRequired(),
      detailEditable: editable,
      teams: buildTeams({})
    })
  }
}

const STATUS_BY_CODE: Record<SignupErrorCode, number> = {
  not_configured: 503,
  invalid: 400,
  duplicate: 409,
  full: 409,
  passcode: 403,
  rate_limited: 429,
  store_error: 500
}

function clientIp(request: Request, clientAddress: string | undefined): string | null {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() || null
  const real = request.headers.get('x-real-ip')
  if (real) return real.trim() || null
  return clientAddress ?? null
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return json({ ok: false, code: 'invalid', message: '请求格式不正确' }, 400)
  }

  const teamId = typeof body.teamId === 'string' ? body.teamId : ''
  const capacity = capacityOf.get(teamId)
  if (capacity === undefined) {
    return json({ ok: false, code: 'invalid', message: '未知的队伍' }, 400)
  }

  const str = (v: unknown) => (typeof v === 'string' ? v : undefined)

  // clientAddress 在个别适配器下会抛错，包一层防御。
  let ip: string | null = null
  try {
    ip = clientIp(request, clientAddress)
  } catch {
    ip = clientIp(request, undefined)
  }

  const result = await addSignup(
    {
      teamId,
      name: str(body.name) ?? '',
      contact: str(body.contact),
      note: str(body.note),
      passcode: str(body.passcode),
      hp: str(body.hp),
      ip
    },
    { capacity }
  )

  if (result.ok) {
    return json({ ok: true, roster: result.roster })
  }
  return json({ ok: false, code: result.code, message: result.message }, STATUS_BY_CODE[result.code])
}

const DETAIL_STATUS_BY_CODE: Record<DetailErrorCode, number> = {
  not_configured: 503,
  passcode: 403,
  store_error: 500
}

// 队长编辑详细介绍。
export const PUT: APIRoute = async ({ request }) => {
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return json({ ok: false, code: 'passcode', message: '请求格式不正确' }, 400)
  }

  const teamId = typeof body.teamId === 'string' ? body.teamId : ''
  if (!capacityOf.has(teamId)) {
    return json({ ok: false, code: 'passcode', message: '未知的队伍' }, 400)
  }

  const str = (v: unknown) => (typeof v === 'string' ? v : undefined)
  const result = await updateDetail({
    teamId,
    detail: str(body.detail) ?? '',
    passcode: str(body.passcode)
  })

  if (result.ok) {
    return json({ ok: true, teamId: result.teamId, detail: result.detail })
  }
  return json(
    { ok: false, code: result.code, message: result.message },
    DETAIL_STATUS_BY_CODE[result.code]
  )
}

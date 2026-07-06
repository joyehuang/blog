import type { APIRoute } from 'astro'

import { teams } from '@/data/agent-teams'
import {
  addSignup,
  createTeam,
  detailEditable,
  getBuiltinTracks,
  getCustomTeams,
  getDetails,
  getRosters,
  isConfigured,
  passcodeRequired,
  updateDetail,
  type CreateErrorCode,
  type DetailErrorCode,
  type PublicMember,
  type SignupErrorCode,
  type TeamMeta
} from '@/lib/agent-teams/store'

// SSR endpoint —— 名单要实时，且要读服务端 env / DB，不能预渲染。
export const prerender = false

// 赛道以 DB 为准（getBuiltinTracks）；这份代码里的元信息只在「未配置 / DB 降级」时兜底。
const fallbackMetas: TeamMeta[] = teams.map((t) => ({
  id: t.id,
  title: t.title,
  summary: t.summary,
  tags: t.tags ?? [],
  capacity: t.capacity ?? null
}))

type TeamPayload = TeamMeta & {
  count: number
  members: PublicMember[]
  detail: string | null
}

function buildTeams(
  metas: TeamMeta[],
  rosters: Record<string, PublicMember[]> = {},
  details: Record<string, string> = {}
): TeamPayload[] {
  return metas.map((m) => {
    const members = rosters[m.id] ?? []
    return { ...m, count: members.length, members, detail: details[m.id] ?? null }
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
      teams: buildTeams(fallbackMetas)
    })
  }

  try {
    const [builtins, customs] = await Promise.all([getBuiltinTracks(), getCustomTeams()])
    const metas = [...builtins, ...customs]
    const ids = metas.map((m) => m.id)
    const [rosters, details] = await Promise.all([getRosters(ids), getDetails(ids)])
    return json({
      configured: true,
      passcodeRequired: passcodeRequired(),
      detailEditable: editable,
      teams: buildTeams(metas, rosters, details)
    })
  } catch {
    // 数据库抖动——仍让页面渲染出赛道卡（用代码兜底），只是名单/介绍/自定义赛道暂时为空。
    return json({
      configured: true,
      degraded: true,
      passcodeRequired: passcodeRequired(),
      detailEditable: editable,
      teams: buildTeams(fallbackMetas)
    })
  }
}

const str = (v: unknown) => (typeof v === 'string' ? v : undefined)

function clientIp(request: Request, clientAddress: string | undefined): string | null {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() || null
  const real = request.headers.get('x-real-ip')
  if (real) return real.trim() || null
  return clientAddress ?? null
}

function resolveIp(request: Request, clientAddress: string | undefined): string | null {
  // clientAddress 在个别适配器下会抛错，包一层防御。
  try {
    return clientIp(request, clientAddress)
  } catch {
    return clientIp(request, undefined)
  }
}

/** 某队的名额：从 DB 的内置 + 自定义赛道里查；查不到则 undefined = 未知队伍 */
async function resolveCapacity(teamId: string): Promise<number | null | undefined> {
  const [builtins, customs] = await Promise.all([
    getBuiltinTracks().catch(() => [] as TeamMeta[]),
    getCustomTeams().catch(() => [] as TeamMeta[])
  ])
  const found = [...builtins, ...customs].find((t) => t.id === teamId)
  return found ? found.capacity : undefined
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

const CREATE_STATUS_BY_CODE: Record<CreateErrorCode, number> = {
  not_configured: 503,
  invalid: 400,
  passcode: 403,
  rate_limited: 429,
  store_error: 500
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return json({ ok: false, code: 'invalid', message: '请求格式不正确' }, 400)
  }

  const ip = resolveIp(request, clientAddress)

  // action=create：自助创建自定义赛道。
  if (body.action === 'create') {
    const result = await createTeam({
      title: str(body.title) ?? '',
      summary: str(body.summary) ?? '',
      passcode: str(body.passcode),
      hp: str(body.hp),
      ip
    })
    if (result.ok) return json({ ok: true, team: result.team })
    return json(
      { ok: false, code: result.code, message: result.message },
      CREATE_STATUS_BY_CODE[result.code]
    )
  }

  // 默认：报名加入某队。
  const teamId = str(body.teamId) ?? ''
  const capacity = await resolveCapacity(teamId)
  if (capacity === undefined) {
    return json({ ok: false, code: 'invalid', message: '未知的队伍' }, 400)
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

  const teamId = str(body.teamId) ?? ''
  const known = (await resolveCapacity(teamId)) !== undefined
  if (!known) {
    return json({ ok: false, code: 'passcode', message: '未知的队伍' }, 400)
  }

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

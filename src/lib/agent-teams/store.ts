// Agent 比赛组队报名 —— 数据层。
//
// 直接调 Upstash Redis 的 REST API（不引 SDK，零依赖，风格与 github-contributions 一致）。
// 每支队伍一个 Redis list：`agentteam:v1:{teamId}`，元素是一条报名记录的 JSON。
//
// 隐私：`contact`（联系方式）会存库，但**不**在公开读接口返回，只有组织者能在
// Redis 后台看到。公开出去的只有昵称、可选留言和时间戳。

/** 对外暴露的成员（不含联系方式） */
export type PublicMember = { name: string; note: string | null; ts: number }

/** 单支队伍的公开名单 */
export type TeamRoster = {
  id: string
  count: number
  capacity: number | null
  members: PublicMember[]
}

/** 报名提交入参 */
export type SignupInput = {
  teamId: string
  name: string
  contact?: string
  note?: string
  passcode?: string
  /** 蜜罐字段：正常用户永远为空 */
  hp?: string
  /** 调用方（API 路由）解析出的客户端 IP，用于限流 */
  ip?: string | null
}

export type SignupErrorCode =
  | 'not_configured'
  | 'invalid'
  | 'duplicate'
  | 'full'
  | 'passcode'
  | 'rate_limited'
  | 'store_error'

export type SignupResult =
  | { ok: true; roster: TeamRoster }
  | { ok: false; code: SignupErrorCode; message: string }

/** 落库的完整记录（含联系方式） */
type StoredMember = { name: string; contact?: string; note?: string; ts: number }

const KEY_PREFIX = 'agentteam:v1:'
const teamKey = (id: string) => `${KEY_PREFIX}${id}`
const rateKey = (ip: string) => `agentteam:rl:${ip}`

const NAME_MAX = 24
const NOTE_MAX = 60
const CONTACT_MAX = 60
// 轻量限流：同一 IP 在窗口内最多提交这么多次。
const RATE_LIMIT = 5
const RATE_WINDOW_SEC = 600

// --- 环境 / 配置 ---------------------------------------------------------

// 兼容 Vercel KV 集成注入的 `KV_REST_API_*` 与 Upstash 原生的 `UPSTASH_REDIS_REST_*`。
function getRedisEnv(): { url: string; token: string } | null {
  const url =
    import.meta.env.KV_REST_API_URL ??
    process.env.KV_REST_API_URL ??
    import.meta.env.UPSTASH_REDIS_REST_URL ??
    process.env.UPSTASH_REDIS_REST_URL
  const token =
    import.meta.env.KV_REST_API_TOKEN ??
    process.env.KV_REST_API_TOKEN ??
    import.meta.env.UPSTASH_REDIS_REST_TOKEN ??
    process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return { url: String(url).replace(/\/+$/, ''), token: String(token) }
}

function getPasscode(): string | null {
  const p = import.meta.env.AGENT_TEAMS_PASSCODE ?? process.env.AGENT_TEAMS_PASSCODE
  return p && String(p).length > 0 ? String(p) : null
}

/** Redis 环境是否已配置——未配置时页面走"配置中"降级路径 */
export function isConfigured(): boolean {
  return getRedisEnv() !== null
}

/** 是否设置了报名口令 */
export function passcodeRequired(): boolean {
  return getPasscode() !== null
}

// --- Redis REST 封装 -----------------------------------------------------

class NotConfiguredError extends Error {}

type RedisReply = { result?: unknown; error?: string }

async function redisPipeline(commands: (string | number)[][]): Promise<unknown[]> {
  const env = getRedisEnv()
  if (!env) throw new NotConfiguredError()

  const res = await fetch(`${env.url}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(commands)
  })
  if (!res.ok) throw new Error(`upstash ${res.status}: ${await res.text()}`)

  const replies = (await res.json()) as RedisReply[]
  return replies.map((reply) => {
    if (reply.error) throw new Error(`upstash: ${reply.error}`)
    return reply.result
  })
}

async function redis(command: (string | number)[]): Promise<unknown> {
  const [result] = await redisPipeline([command])
  return result
}

// --- 解析 / 校验帮助函数 -------------------------------------------------

// 去掉控制字符（含换行）并折叠空白。名字在客户端用 textContent 渲染，无 XSS 风险。
// 用 new RegExp + 纯 ASCII 转义构造，避免源码里出现裸控制字节。
const CONTROL_CHARS = new RegExp('[\\u0000-\\u001F\\u007F]', 'g')

function cleanText(input: string): string {
  return input.replace(CONTROL_CHARS, ' ').replace(/\s+/g, ' ').trim()
}

function parseStored(raw: unknown): StoredMember | null {
  if (typeof raw !== 'string') return null
  try {
    const obj = JSON.parse(raw) as Partial<StoredMember>
    if (!obj || typeof obj.name !== 'string') return null
    return {
      name: obj.name,
      contact: typeof obj.contact === 'string' ? obj.contact : undefined,
      note: typeof obj.note === 'string' ? obj.note : undefined,
      ts: typeof obj.ts === 'number' ? obj.ts : 0
    }
  } catch {
    return null
  }
}

function toPublic(member: StoredMember): PublicMember {
  return { name: member.name, note: member.note ?? null, ts: member.ts }
}

// --- 读取名单 -----------------------------------------------------------

/** 批量读取多支队伍的公开名单，返回 { teamId: PublicMember[] } */
export async function getRosters(teamIds: string[]): Promise<Record<string, PublicMember[]>> {
  const out: Record<string, PublicMember[]> = {}
  if (teamIds.length === 0) return out

  const replies = await redisPipeline(teamIds.map((id) => ['LRANGE', teamKey(id), '0', '-1']))
  teamIds.forEach((id, i) => {
    const raw = Array.isArray(replies[i]) ? (replies[i] as unknown[]) : []
    out[id] = raw
      .map(parseStored)
      .filter((m): m is StoredMember => m !== null)
      .map(toPublic)
  })
  return out
}

// --- 报名写入 -----------------------------------------------------------

/**
 * 追加一条报名。teamId 的合法性由调用方（API 路由）用配置校验后传入 capacity。
 * 返回结构化结果，供 API 映射成 HTTP 状态码。
 */
export async function addSignup(
  input: SignupInput,
  opts: { capacity: number | null }
): Promise<SignupResult> {
  if (!isConfigured()) {
    return { ok: false, code: 'not_configured', message: '报名系统尚未配置' }
  }

  // 蜜罐：正常用户永远不会填这个隐藏字段。
  if (input.hp && input.hp.trim().length > 0) {
    return { ok: false, code: 'invalid', message: '提交无效' }
  }

  // 口令门槛（设了环境变量才启用）。
  const passcode = getPasscode()
  if (passcode && input.passcode !== passcode) {
    return { ok: false, code: 'passcode', message: '口令不正确' }
  }

  const name = cleanText(input.name ?? '')
  if (name.length === 0 || name.length > NAME_MAX) {
    return { ok: false, code: 'invalid', message: `昵称需为 1–${NAME_MAX} 个字符` }
  }
  const note = input.note ? cleanText(input.note).slice(0, NOTE_MAX) : undefined
  const contact = input.contact ? cleanText(input.contact).slice(0, CONTACT_MAX) : undefined

  try {
    // 限流：先自增计数，第一次落窗口时设过期（NX 保证固定窗口，不被后续请求滑动重置）。
    if (input.ip) {
      const key = rateKey(input.ip)
      const [count] = await redisPipeline([
        ['INCR', key],
        ['EXPIRE', key, RATE_WINDOW_SEC, 'NX']
      ])
      if (typeof count === 'number' && count > RATE_LIMIT) {
        return { ok: false, code: 'rate_limited', message: '操作过于频繁，请稍后再试' }
      }
    }

    // 读当前名单，做去重与名额校验。并发下这是软限制——粉丝活动足够了。
    const existingRaw = (await redis(['LRANGE', teamKey(input.teamId), '0', '-1'])) as unknown
    const existing = (Array.isArray(existingRaw) ? existingRaw : [])
      .map(parseStored)
      .filter((m): m is StoredMember => m !== null)

    const normalized = name.toLowerCase()
    if (existing.some((m) => cleanText(m.name).toLowerCase() === normalized)) {
      return { ok: false, code: 'duplicate', message: '这个昵称已经在这支队伍里了' }
    }
    if (opts.capacity != null && existing.length >= opts.capacity) {
      return { ok: false, code: 'full', message: '这支队伍名额已满' }
    }

    const record: StoredMember = { name, ts: Date.now() }
    if (contact) record.contact = contact
    if (note) record.note = note
    await redis(['RPUSH', teamKey(input.teamId), JSON.stringify(record)])

    const members = [...existing, record].map(toPublic)
    return {
      ok: true,
      roster: { id: input.teamId, count: members.length, capacity: opts.capacity, members }
    }
  } catch (err) {
    if (err instanceof NotConfiguredError) {
      return { ok: false, code: 'not_configured', message: '报名系统尚未配置' }
    }
    return { ok: false, code: 'store_error', message: '写入失败，请稍后再试' }
  }
}

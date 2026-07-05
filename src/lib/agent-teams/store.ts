// Agent 比赛组队报名 —— 数据层（Neon / Postgres）。
//
// 用 @neondatabase/serverless 的 HTTP 驱动，天然适配 serverless（每次查询一次 HTTP，
// 不需要连接池）。表结构在首次访问时幂等自建，你只要在 Vercel 开一个 Postgres(Neon)
// 并让它注入 DATABASE_URL 即可，无需手动建表。
//
// 表结构（等价 DDL，仅供参考，代码会自动建）：
//   CREATE TABLE agent_team_signups (
//     id          BIGSERIAL PRIMARY KEY,
//     team_id     TEXT NOT NULL,
//     name        TEXT NOT NULL,
//     name_key    TEXT NOT NULL,           -- lower(clean(name))，用于去重
//     contact     TEXT,                    -- 仅组织者可见，不对外返回
//     note        TEXT,
//     ip          TEXT,                    -- 仅用于限流，不对外返回
//     created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
//   );
//   CREATE UNIQUE INDEX ... ON agent_team_signups (team_id, name_key);  -- 硬去重
//   CREATE INDEX ...        ON agent_team_signups (team_id, created_at);
//
// 隐私：contact 与 ip 只落库、永不出现在公开读接口里。公开出去的只有昵称、可选留言、时间戳。

import { neon } from '@neondatabase/serverless'

/** 对外暴露的成员（不含联系方式 / IP） */
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

const NAME_MAX = 24
const NOTE_MAX = 60
const CONTACT_MAX = 60
// 轻量限流：同一 IP 在窗口内最多成功报名这么多次。
const RATE_LIMIT = 5
const RATE_WINDOW_SEC = 600

// --- 环境 / 配置 ---------------------------------------------------------

// Vercel 的 Postgres(Neon) 集成会注入 DATABASE_URL / POSTGRES_URL 等，任选其一。
function getConn(): string | null {
  const c =
    import.meta.env.DATABASE_URL ??
    process.env.DATABASE_URL ??
    import.meta.env.POSTGRES_URL ??
    process.env.POSTGRES_URL ??
    import.meta.env.POSTGRES_URL_NON_POOLING ??
    process.env.POSTGRES_URL_NON_POOLING
  return c ? String(c) : null
}

function getPasscode(): string | null {
  const p = import.meta.env.AGENT_TEAMS_PASSCODE ?? process.env.AGENT_TEAMS_PASSCODE
  return p && String(p).length > 0 ? String(p) : null
}

/** 数据库是否已配置——未配置时页面走"配置中"降级路径 */
export function isConfigured(): boolean {
  return getConn() !== null
}

/** 是否设置了报名口令 */
export function passcodeRequired(): boolean {
  return getPasscode() !== null
}

// --- 连接 / 表结构 -------------------------------------------------------

type Sql = ReturnType<typeof neon>
let cachedSql: Sql | null = null
let schemaReady = false

function getSql(): Sql | null {
  if (cachedSql) return cachedSql
  const conn = getConn()
  if (!conn) return null
  cachedSql = neon(conn)
  return cachedSql
}

async function ensureSchema(sql: Sql): Promise<void> {
  if (schemaReady) return
  await sql`
    CREATE TABLE IF NOT EXISTS agent_team_signups (
      id BIGSERIAL PRIMARY KEY,
      team_id TEXT NOT NULL,
      name TEXT NOT NULL,
      name_key TEXT NOT NULL,
      contact TEXT,
      note TEXT,
      ip TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS agent_team_signups_team_name
      ON agent_team_signups (team_id, name_key)
  `
  await sql`
    CREATE INDEX IF NOT EXISTS agent_team_signups_team_created
      ON agent_team_signups (team_id, created_at)
  `
  schemaReady = true
}

// --- 校验帮助函数 -------------------------------------------------------

// 去掉控制字符（含换行）并折叠空白。名字在客户端用 textContent 渲染，无 XSS 风险。
// 用 new RegExp + 纯 ASCII 转义构造，避免源码里出现裸控制字节。
const CONTROL_CHARS = new RegExp('[\\u0000-\\u001F\\u007F]', 'g')

function cleanText(input: string): string {
  return input.replace(CONTROL_CHARS, ' ').replace(/\s+/g, ' ').trim()
}

type RosterRow = { name: string; note: string | null; ts_sec: number }

function rowToMember(row: RosterRow): PublicMember {
  return { name: row.name, note: row.note ?? null, ts: Math.round(row.ts_sec * 1000) }
}

// --- 读取名单 -----------------------------------------------------------

/** 批量读取多支队伍的公开名单，返回 { teamId: PublicMember[] } */
export async function getRosters(teamIds: string[]): Promise<Record<string, PublicMember[]>> {
  const out: Record<string, PublicMember[]> = {}
  for (const id of teamIds) out[id] = []
  if (teamIds.length === 0) return out

  const sql = getSql()
  if (!sql) return out
  await ensureSchema(sql)

  const rows = (await sql`
    SELECT team_id, name, note, EXTRACT(EPOCH FROM created_at)::float8 AS ts_sec
    FROM agent_team_signups
    WHERE team_id = ANY(${teamIds})
    ORDER BY created_at ASC
  `) as (RosterRow & { team_id: string })[]

  for (const row of rows) {
    if (!out[row.team_id]) out[row.team_id] = []
    out[row.team_id].push(rowToMember(row))
  }
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
  const sql = getSql()
  if (!sql) {
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
  const nameKey = name.toLowerCase()
  const note = input.note ? cleanText(input.note).slice(0, NOTE_MAX) : null
  const contact = input.contact ? cleanText(input.contact).slice(0, CONTACT_MAX) : null
  const ip = input.ip ?? null

  try {
    await ensureSchema(sql)

    // 限流：数同一 IP 最近窗口内的成功报名数。IP 仅落库用于此，不对外返回。
    if (ip) {
      const limitRows = (await sql`
        SELECT count(*)::int AS n
        FROM agent_team_signups
        WHERE ip = ${ip} AND created_at > now() - (${RATE_WINDOW_SEC} * interval '1 second')
      `) as { n: number }[]
      if ((limitRows[0]?.n ?? 0) >= RATE_LIMIT) {
        return { ok: false, code: 'rate_limited', message: '操作过于频繁，请稍后再试' }
      }
    }

    // 读当前名单（去重 + 名额校验 + 用于返回）。
    const existing = (await sql`
      SELECT name, note, EXTRACT(EPOCH FROM created_at)::float8 AS ts_sec
      FROM agent_team_signups
      WHERE team_id = ${input.teamId}
      ORDER BY created_at ASC
    `) as RosterRow[]

    if (existing.some((row) => cleanText(row.name).toLowerCase() === nameKey)) {
      return { ok: false, code: 'duplicate', message: '这个昵称已经在这支队伍里了' }
    }
    if (opts.capacity != null && existing.length >= opts.capacity) {
      return { ok: false, code: 'full', message: '这支队伍名额已满' }
    }

    // UNIQUE(team_id, name_key) 是硬去重：并发抢注时冲突方不落库、RETURNING 为空。
    const inserted = (await sql`
      INSERT INTO agent_team_signups (team_id, name, name_key, contact, note, ip)
      VALUES (${input.teamId}, ${name}, ${nameKey}, ${contact}, ${note}, ${ip})
      ON CONFLICT (team_id, name_key) DO NOTHING
      RETURNING EXTRACT(EPOCH FROM created_at)::float8 AS ts_sec
    `) as { ts_sec: number }[]

    if (inserted.length === 0) {
      return { ok: false, code: 'duplicate', message: '这个昵称已经在这支队伍里了' }
    }

    const members = [
      ...existing.map(rowToMember),
      { name, note, ts: Math.round(inserted[0].ts_sec * 1000) }
    ]
    return {
      ok: true,
      roster: { id: input.teamId, count: members.length, capacity: opts.capacity, members }
    }
  } catch {
    return { ok: false, code: 'store_error', message: '写入失败，请稍后再试' }
  }
}

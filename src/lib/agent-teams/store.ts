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

import { teams as seedTracks } from '@/data/agent-teams'

/** 对外暴露的成员（不含联系方式 / IP） */
export type PublicMember = { name: string; note: string | null; ts: number }

/** 单支队伍的公开名单 */
export type TeamRoster = {
  id: string
  count: number
  capacity: number | null
  members: PublicMember[]
}

/** 队伍元信息（标题/简介/标签/名额）——静态赛道与自定义赛道统一成这个形状 */
export type TeamMeta = {
  id: string
  title: string
  summary: string
  tags: string[]
  capacity: number | null
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
const DETAIL_MAX = 600
const GITHUB_URL_MAX = 200
const TITLE_MAX = 30
const SUMMARY_MAX = 80
// 组队赛道的名额上限范围；不在这个区间就当没填，按不限处理。
const TEAM_CAPACITY_MIN = 2
const TEAM_CAPACITY_MAX = 999
// 轻量限流：同一 IP 在窗口内最多成功报名这么多次。
const RATE_LIMIT = 5
const RATE_WINDOW_SEC = 600
// 同一 IP 在窗口内最多创建这么多个自定义赛道。
const CREATE_RATE_LIMIT = 3

export const SIGNUP_DELETION_REASONS = {
  selfLeave: 'self_leave',
  captainKick: 'captain_kick'
} as const

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

// 统一的默认口令：粉丝群的名字（群成员都知道）。页面挂在首页后会有路人点进来，
// 所以报名 / 组队 / 建赛道都要口令——只有群里的人才填得对。这只是「挡住路人」的
// 轻门槛，不是强安全。想让口令不出现在公开仓库里，可在 Vercel 配对应环境变量覆盖。
const DEFAULT_GROUP_PASSCODE = '一群开心快乐的小奶龙'

// 报名 / 退出口令：默认就用群名，所有人（含组员）都要填。可用 AGENT_TEAMS_PASSCODE 覆盖。
function getPasscode(): string | null {
  const p = import.meta.env.AGENT_TEAMS_PASSCODE ?? process.env.AGENT_TEAMS_PASSCODE
  return p && String(p).length > 0 ? String(p) : DEFAULT_GROUP_PASSCODE
}

/** 数据库是否已配置——未配置时页面走"配置中"降级路径 */
export function isConfigured(): boolean {
  return getConn() !== null
}

/** 是否需要报名口令——默认恒为 true（有群名兜底），所有人都要填 */
export function passcodeRequired(): boolean {
  return getPasscode() !== null
}

// 编辑 / 建赛道口令：默认同样是粉丝群的名字。可用 AGENT_TEAMS_EDIT_PASSCODE 覆盖。
function getEditPasscode(): string {
  const p = import.meta.env.AGENT_TEAMS_EDIT_PASSCODE ?? process.env.AGENT_TEAMS_EDIT_PASSCODE
  return p && String(p).length > 0 ? String(p) : DEFAULT_GROUP_PASSCODE
}

/** 编辑简介 / 建赛道是否开放——总有默认口令，故恒为 true（保留给未来做锁定开关） */
export function detailEditable(): boolean {
  return true
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
      deleted_at TIMESTAMPTZ,
      deleted_reason TEXT,
      deleted_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `
  await sql`ALTER TABLE agent_team_signups ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`
  await sql`ALTER TABLE agent_team_signups ADD COLUMN IF NOT EXISTS deleted_reason TEXT`
  await sql`ALTER TABLE agent_team_signups ADD COLUMN IF NOT EXISTS deleted_by TEXT`
  // 旧索引不允许已退出成员重新报名；迁移成只约束有效报名的部分唯一索引。
  await sql`DROP INDEX IF EXISTS agent_team_signups_team_name`
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS agent_team_signups_active_team_name
      ON agent_team_signups (team_id, name_key)
      WHERE deleted_at IS NULL
  `
  await sql`
    CREATE INDEX IF NOT EXISTS agent_team_signups_team_created
      ON agent_team_signups (team_id, created_at)
  `
  // 队长维护的「详细介绍」，一队一行，队长编辑时 upsert。
  await sql`
    CREATE TABLE IF NOT EXISTS agent_team_details (
      team_id TEXT PRIMARY KEY,
      detail TEXT NOT NULL,
      github_url TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `
  await sql`ALTER TABLE agent_team_details ADD COLUMN IF NOT EXISTS github_url TEXT`
  // 用户自助创建的「自命题赛道」，一队一行。id 用 custom-<uuid8>，名单/介绍与静态赛道共表。
  await sql`
    CREATE TABLE IF NOT EXISTS agent_team_customs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      ip TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `
  // 赛道类型：team=可多人组队，solo=个人（名额 1，别人不能加入）。旧行默认 team。
  await sql`ALTER TABLE agent_team_customs ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'team'`
  // 名额上限：组队赛道创建时可选填（默认 10，参照内置赛道的惯例），留空则不限；
  // 个人赛道恒为 1，不走这一列。旧行（建功能前创建的）没有名额，NULL 就是「不限」。
  await sql`ALTER TABLE agent_team_customs ADD COLUMN IF NOT EXISTS capacity INTEGER`
  // 队长：一队一行，记录队长的 name_key。没有行时默认「第一个报名的人」当队长。
  await sql`
    CREATE TABLE IF NOT EXISTS agent_team_captains (
      team_id TEXT PRIMARY KEY,
      captain_key TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `
  // 内置赛道：标题/简介/标签/名额入库，以 DB 为准（可后台改而不必改代码 + 重新部署）。
  // 代码里的 teams 只作「种子」：首次启动补齐缺失的赛道，已存在的行不动。
  await sql`
    CREATE TABLE IF NOT EXISTS agent_team_tracks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      tags JSONB NOT NULL DEFAULT '[]'::jsonb,
      capacity INTEGER,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `
  await seedBuiltinTracks(sql)
  schemaReady = true
}

/**
 * 把代码里的内置赛道种进 agent_team_tracks：只补「表里还没有」的 id，已存在的行原样保留
 * （标题/简介以 DB 为准）。稳态下就一次 SELECT、零 INSERT。
 */
async function seedBuiltinTracks(sql: Sql): Promise<void> {
  const rows = (await sql`SELECT id FROM agent_team_tracks`) as { id: string }[]
  const have = new Set(rows.map((r) => r.id))
  for (let i = 0; i < seedTracks.length; i++) {
    const t = seedTracks[i]
    if (have.has(t.id)) continue
    await sql`
      INSERT INTO agent_team_tracks (id, title, summary, tags, capacity, sort_order)
      VALUES (
        ${t.id}, ${t.title}, ${t.summary},
        ${JSON.stringify(t.tags ?? [])}::jsonb, ${t.capacity ?? null}, ${i}
      )
      ON CONFLICT (id) DO NOTHING
    `
  }
}

// --- 校验帮助函数 -------------------------------------------------------

// 去掉控制字符（含换行）并折叠空白。名字在客户端用 textContent 渲染，无 XSS 风险。
// 用 new RegExp + 纯 ASCII 转义构造，避免源码里出现裸控制字节。
const CONTROL_CHARS = new RegExp('[\\u0000-\\u001F\\u007F]', 'g')

function cleanText(input: string): string {
  return input.replace(CONTROL_CHARS, ' ').replace(/\s+/g, ' ').trim()
}

// 详细介绍要保留换行（队长要分段阐述），所以只去掉除换行外的控制字符，
// 并折叠横向空白与多余空行。渲染端用 textContent + white-space: pre-wrap，无 XSS。
const CONTROL_EXCEPT_NL = new RegExp('[\\u0000-\\u0009\\u000B-\\u001F\\u007F]', 'g')

function cleanMultiline(input: string): string {
  return input
    .replace(CONTROL_EXCEPT_NL, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/[ \t]*\n[ \t]*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export type GithubRepoUrlResult =
  | { ok: true; value: string | null }
  | { ok: false; message: string }

/** 只接受 GitHub 仓库首页链接，并归一化掉 .git、query、hash 与尾部斜杠。 */
export function normalizeGithubRepoUrl(input: string): GithubRepoUrlResult {
  const raw = input.trim()
  if (raw.length === 0) return { ok: true, value: null }
  if (raw.length > GITHUB_URL_MAX) return { ok: false, message: 'GitHub 链接太长' }
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:' || !['github.com', 'www.github.com'].includes(url.hostname)) {
      return { ok: false, message: '请填写 https://github.com/用户名/仓库名' }
    }
    const parts = url.pathname.split('/').filter(Boolean)
    if (parts.length !== 2) return { ok: false, message: '请填写 GitHub 仓库首页链接' }
    const owner = parts[0]
    const repo = parts[1].replace(/\.git$/i, '')
    if (!owner || !repo) return { ok: false, message: 'GitHub 仓库链接不完整' }
    return { ok: true, value: `https://github.com/${owner}/${repo}` }
  } catch {
    return { ok: false, message: 'GitHub 链接格式不正确' }
  }
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
    WHERE team_id = ANY(${teamIds}) AND deleted_at IS NULL
    ORDER BY created_at ASC
  `) as (RosterRow & { team_id: string })[]

  for (const row of rows) {
    if (!out[row.team_id]) out[row.team_id] = []
    out[row.team_id].push(rowToMember(row))
  }
  return out
}

/** 批量读取多支队伍的「详细介绍」，返回 { teamId: detail }（无则不含该键） */
export async function getDetails(teamIds: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  if (teamIds.length === 0) return out

  const sql = getSql()
  if (!sql) return out
  await ensureSchema(sql)

  const rows = (await sql`
    SELECT team_id, detail
    FROM agent_team_details
    WHERE team_id = ANY(${teamIds})
  `) as { team_id: string; detail: string }[]

  for (const row of rows) out[row.team_id] = row.detail
  return out
}

export function resolveActiveCaptainKey(activeMemberKeys: string[], savedCaptain?: string): string | null {
  if (savedCaptain && activeMemberKeys.includes(savedCaptain)) return savedCaptain
  return activeMemberKeys[0] ?? null
}

export function validateKickTarget(
  activeMemberKeys: string[],
  savedCaptain: string | undefined,
  targetKey: string
): { ok: true; captainKey: string } | { ok: false; message: string } {
  if (!activeMemberKeys.includes(targetKey)) return { ok: false, message: '这个昵称不在当前名单里' }
  const captainKey = resolveActiveCaptainKey(activeMemberKeys, savedCaptain)
  if (!captainKey) return { ok: false, message: '队伍当前没有有效成员' }
  if (targetKey === captainKey) return { ok: false, message: '不能移除当前队长，请先转让队长' }
  return { ok: true, captainKey }
}

/** 批量读取队伍 GitHub 仓库链接。 */
export async function getGithubUrls(teamIds: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  if (teamIds.length === 0) return out

  const sql = getSql()
  if (!sql) return out
  await ensureSchema(sql)

  const rows = (await sql`
    SELECT team_id, github_url
    FROM agent_team_details
    WHERE team_id = ANY(${teamIds}) AND github_url IS NOT NULL
  `) as { team_id: string; github_url: string }[]

  for (const row of rows) out[row.team_id] = row.github_url
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
      WHERE team_id = ${input.teamId} AND deleted_at IS NULL
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
      ON CONFLICT (team_id, name_key) WHERE deleted_at IS NULL DO NOTHING
      RETURNING EXTRACT(EPOCH FROM created_at)::float8 AS ts_sec
    `) as { ts_sec: number }[]

    if (inserted.length === 0) {
      return { ok: false, code: 'duplicate', message: '这个昵称已经在这支队伍里了' }
    }

    // 这支队伍的第一个人：自动记为队长（个人赛道创建时已在 createTeam 里处理过，
    // 这里补的是「组队」赛道第一个报名者的情形）。ON CONFLICT DO NOTHING 避免覆盖已有队长。
    if (existing.length === 0) {
      await sql`
        INSERT INTO agent_team_captains (team_id, captain_key)
        VALUES (${input.teamId}, ${nameKey})
        ON CONFLICT (team_id) DO NOTHING
      `
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

// --- 退出 / 退赛（软删除报名，保留审计记录）-----------------------------

export type LeaveInput = {
  teamId: string
  name: string
  passcode?: string
}

export type LeaveErrorCode = 'not_configured' | 'invalid' | 'not_found' | 'passcode' | 'store_error'

export type LeaveResult =
  | { ok: true; roster: TeamRoster }
  | { ok: false; code: LeaveErrorCode; message: string }

/**
 * 按昵称把某人的有效报名标记为退出。退出与报名共用 QQ 群口令。
 */
export async function removeSignup(
  input: LeaveInput,
  opts: { capacity: number | null }
): Promise<LeaveResult> {
  const sql = getSql()
  if (!sql) return { ok: false, code: 'not_configured', message: '报名系统尚未配置' }

  const passcode = getPasscode()
  if (passcode && input.passcode !== passcode) {
    return { ok: false, code: 'passcode', message: '口令不正确' }
  }

  const name = cleanText(input.name ?? '')
  if (name.length === 0 || name.length > NAME_MAX) {
    return { ok: false, code: 'invalid', message: `昵称需为 1–${NAME_MAX} 个字符` }
  }
  const nameKey = name.toLowerCase()

  try {
    await ensureSchema(sql)

    const deleted = (await sql`
      UPDATE agent_team_signups
      SET deleted_at = now(), deleted_reason = ${SIGNUP_DELETION_REASONS.selfLeave}, deleted_by = ${nameKey}
      WHERE team_id = ${input.teamId} AND name_key = ${nameKey} AND deleted_at IS NULL
      RETURNING id
    `) as { id: number }[]
    if (deleted.length === 0) {
      return { ok: false, code: 'not_found', message: '名单里没有这个昵称' }
    }

    const existing = (await sql`
      SELECT name, note, EXTRACT(EPOCH FROM created_at)::float8 AS ts_sec
      FROM agent_team_signups
      WHERE team_id = ${input.teamId} AND deleted_at IS NULL
      ORDER BY created_at ASC
    `) as RosterRow[]
    // 队长退出后清掉显式队长记录，前端与后续管理会回退到第一位有效成员。
    await sql`
      DELETE FROM agent_team_captains
      WHERE team_id = ${input.teamId} AND captain_key = ${nameKey}
    `
    const members = existing.map(rowToMember)
    return {
      ok: true,
      roster: { id: input.teamId, count: members.length, capacity: opts.capacity, members }
    }
  } catch {
    return { ok: false, code: 'store_error', message: '操作失败，请稍后再试' }
  }
}

// --- 队长编辑详细介绍 ---------------------------------------------------

export type DetailUpdateInput = {
  teamId: string
  detail: string
  githubUrl?: string
  passcode?: string
}

export type DetailErrorCode = 'not_configured' | 'invalid' | 'passcode' | 'store_error'

export type DetailResult =
  | { ok: true; teamId: string; detail: string; githubUrl: string | null }
  | { ok: false; code: DetailErrorCode; message: string }

/**
 * 队长更新某队的详细介绍。口令匹配该队的队长口令、或匹配管理员口令才放行。
 * detail / githubUrl 都可传空清除。teamId 合法性由调用方校验。
 */
export async function updateDetail(input: DetailUpdateInput): Promise<DetailResult> {
  const sql = getSql()
  if (!sql) return { ok: false, code: 'not_configured', message: '系统尚未配置' }

  if ((input.passcode ?? '') !== getEditPasscode()) {
    return { ok: false, code: 'passcode', message: '口令不正确' }
  }

  const detail = cleanMultiline(input.detail ?? '').slice(0, DETAIL_MAX)
  const github = normalizeGithubRepoUrl(input.githubUrl ?? '')
  if (!github.ok) return { ok: false, code: 'invalid', message: github.message }

  try {
    await ensureSchema(sql)
    if (detail.length === 0 && github.value === null) {
      await sql`DELETE FROM agent_team_details WHERE team_id = ${input.teamId}`
      return { ok: true, teamId: input.teamId, detail: '', githubUrl: null }
    }
    await sql`
      INSERT INTO agent_team_details (team_id, detail, github_url, updated_at)
      VALUES (${input.teamId}, ${detail}, ${github.value}, now())
      ON CONFLICT (team_id) DO UPDATE SET
        detail = EXCLUDED.detail,
        github_url = EXCLUDED.github_url,
        updated_at = now()
    `
    return { ok: true, teamId: input.teamId, detail, githubUrl: github.value }
  } catch {
    return { ok: false, code: 'store_error', message: '保存失败，请稍后再试' }
  }
}

// --- 自命题：用户自助创建赛道 -------------------------------------------

export type CreateTeamInput = {
  title: string
  summary: string
  /** team=可多人组队；solo=个人（名额 1，别人不能加入） */
  kind?: 'team' | 'solo'
  /** 必填：创建者昵称，创建时自动占一个名额并成为队长（不论组队还是个人） */
  name?: string
  /** 仅「组队」有效：名额上限；省略/非法值则不限。个人赛道恒为 1，忽略这个字段。 */
  capacity?: number
  passcode?: string
  /** 蜜罐字段：正常用户永远为空 */
  hp?: string
  ip?: string | null
}

export type CreateErrorCode =
  | 'not_configured'
  | 'invalid'
  | 'passcode'
  | 'rate_limited'
  | 'store_error'

export type CreateResult =
  | { ok: true; team: TeamMeta }
  | { ok: false; code: CreateErrorCode; message: string }

/** 读取所有内置赛道（以 DB 为准，按 sort_order 升序），统一成 TeamMeta 形状 */
export async function getBuiltinTracks(): Promise<TeamMeta[]> {
  const sql = getSql()
  if (!sql) return []
  await ensureSchema(sql)

  const rows = (await sql`
    SELECT id, title, summary, tags, capacity
    FROM agent_team_tracks
    WHERE id <> 'solo-participant'
    ORDER BY sort_order ASC, created_at ASC
  `) as { id: string; title: string; summary: string; tags: unknown; capacity: number | null }[]

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    summary: r.summary,
    // JSONB 经 neon 驱动已解析成 JS 值；兜底成字符串数组。
    tags: Array.isArray(r.tags) ? r.tags.map((x) => String(x)) : [],
    capacity: r.capacity
  }))
}

/** 读取所有用户自定义赛道（按创建时间升序），统一成 TeamMeta 形状 */
export async function getCustomTeams(): Promise<TeamMeta[]> {
  const sql = getSql()
  if (!sql) return []
  await ensureSchema(sql)

  const rows = (await sql`
    SELECT id, title, summary, kind, capacity
    FROM agent_team_customs
    ORDER BY created_at ASC
  `) as { id: string; title: string; summary: string; kind: string; capacity: number | null }[]

  // 自定义赛道无标签；个人赛道名额恒为 1（别人加不进来，capacity 列对它不作数），
  // 组队赛道按创建时填的名额来，没填 / 建功能前创建的老行就是不限。
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    summary: r.summary,
    tags: [],
    capacity: r.kind === 'solo' ? 1 : r.capacity
  }))
}

/** 创建一个自定义赛道。口令匹配编辑口令才放行。 */
export async function createTeam(input: CreateTeamInput): Promise<CreateResult> {
  const sql = getSql()
  if (!sql) return { ok: false, code: 'not_configured', message: '系统尚未配置' }

  // 蜜罐。
  if (input.hp && input.hp.trim().length > 0) {
    return { ok: false, code: 'invalid', message: '提交无效' }
  }
  if ((input.passcode ?? '') !== getEditPasscode()) {
    return { ok: false, code: 'passcode', message: '口令不正确' }
  }

  const title = cleanText(input.title ?? '')
  if (title.length === 0 || title.length > TITLE_MAX) {
    return { ok: false, code: 'invalid', message: `赛道名称需为 1–${TITLE_MAX} 个字符` }
  }
  const summary = cleanText(input.summary ?? '').slice(0, SUMMARY_MAX)
  if (summary.length === 0) {
    return { ok: false, code: 'invalid', message: '简介不能为空' }
  }

  const kind = input.kind === 'solo' ? 'solo' : 'team'
  // 不管组队还是个人，创建时都要带昵称——创建者会自动占一个名额并当队长。
  const creatorName = cleanText(input.name ?? '')
  if (creatorName.length === 0 || creatorName.length > NAME_MAX) {
    return { ok: false, code: 'invalid', message: `请填你的昵称（1–${NAME_MAX} 个字符），创建后会自动加入并当队长` }
  }

  let capacity: number | null = kind === 'solo' ? 1 : null
  if (kind === 'team' && input.capacity != null) {
    const n = Math.trunc(input.capacity)
    if (Number.isFinite(n) && n >= TEAM_CAPACITY_MIN && n <= TEAM_CAPACITY_MAX) {
      capacity = n
    }
  }
  const ip = input.ip ?? null
  const id = `custom-${crypto.randomUUID().slice(0, 8)}`

  try {
    await ensureSchema(sql)

    // 限流：同一 IP 短时间内创建太多赛道就挡一下。
    if (ip) {
      const limitRows = (await sql`
        SELECT count(*)::int AS n
        FROM agent_team_customs
        WHERE ip = ${ip} AND created_at > now() - (${RATE_WINDOW_SEC} * interval '1 second')
      `) as { n: number }[]
      if ((limitRows[0]?.n ?? 0) >= CREATE_RATE_LIMIT) {
        return { ok: false, code: 'rate_limited', message: '创建太频繁了，歇一会儿再来' }
      }
    }

    await sql`
      INSERT INTO agent_team_customs (id, title, summary, ip, kind, capacity)
      VALUES (${id}, ${title}, ${summary}, ${ip}, ${kind}, ${capacity})
    `

    // 创建者自动报名占位 + 当队长——个人赛道卡片一建好就是「1/1，他本人」，
    // 组队赛道也一样，不用创建完还得再手动报名一次才当上队长。
    {
      const nameKey = creatorName.toLowerCase()
      await sql`
        INSERT INTO agent_team_signups (team_id, name, name_key, ip)
        VALUES (${id}, ${creatorName}, ${nameKey}, ${ip})
        ON CONFLICT (team_id, name_key) WHERE deleted_at IS NULL DO NOTHING
      `
      await sql`
        INSERT INTO agent_team_captains (team_id, captain_key)
        VALUES (${id}, ${nameKey})
        ON CONFLICT (team_id) DO UPDATE SET captain_key = EXCLUDED.captain_key, updated_at = now()
      `
    }

    return { ok: true, team: { id, title, summary, tags: [], capacity } }
  } catch {
    return { ok: false, code: 'store_error', message: '创建失败，请稍后再试' }
  }
}

// --- 队长（谁是队长 / 转让队长）------------------------------------------

/** 批量读取多支队伍的队长 name_key，返回 { teamId: captainKey }（无则不含该键） */
export async function getCaptains(teamIds: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  if (teamIds.length === 0) return out

  const sql = getSql()
  if (!sql) return out
  await ensureSchema(sql)

  const rows = (await sql`
    SELECT team_id, captain_key
    FROM agent_team_captains
    WHERE team_id = ANY(${teamIds})
  `) as { team_id: string; captain_key: string }[]

  for (const row of rows) out[row.team_id] = row.captain_key
  return out
}

export type CaptainErrorCode = 'not_configured' | 'invalid' | 'not_found' | 'passcode' | 'store_error'

export type CaptainResult =
  | { ok: true; teamId: string; captainKey: string }
  | { ok: false; code: CaptainErrorCode; message: string }

/**
 * 转让队长：把队长设成名单里的某个昵称。口令匹配编辑口令才放行，且目标必须已在名单里。
 */
export async function setCaptain(input: {
  teamId: string
  name: string
  passcode?: string
}): Promise<CaptainResult> {
  const sql = getSql()
  if (!sql) return { ok: false, code: 'not_configured', message: '系统尚未配置' }

  if ((input.passcode ?? '') !== getEditPasscode()) {
    return { ok: false, code: 'passcode', message: '口令不正确' }
  }

  const name = cleanText(input.name ?? '')
  const nameKey = name.toLowerCase()
  if (nameKey.length === 0) {
    return { ok: false, code: 'invalid', message: '请填要转让给谁（昵称）' }
  }

  try {
    await ensureSchema(sql)
    const member = (await sql`
      SELECT 1 FROM agent_team_signups
      WHERE team_id = ${input.teamId} AND name_key = ${nameKey} AND deleted_at IS NULL
      LIMIT 1
    `) as { '?column?': number }[]
    if (member.length === 0) {
      return { ok: false, code: 'not_found', message: '这个昵称不在名单里，没法转给他' }
    }
    await sql`
      INSERT INTO agent_team_captains (team_id, captain_key)
      VALUES (${input.teamId}, ${nameKey})
      ON CONFLICT (team_id) DO UPDATE SET captain_key = EXCLUDED.captain_key, updated_at = now()
    `
    return { ok: true, teamId: input.teamId, captainKey: nameKey }
  } catch {
    return { ok: false, code: 'store_error', message: '转让失败，请稍后再试' }
  }
}

export type KickMemberResult =
  | { ok: true; roster: TeamRoster }
  | { ok: false; code: CaptainErrorCode; message: string }

/** 队长移除一名有效队员；队长本人必须先转让队长，不能直接踢掉。 */
export async function kickMember(
  input: { teamId: string; name: string; passcode?: string },
  opts: { capacity: number | null }
): Promise<KickMemberResult> {
  const sql = getSql()
  if (!sql) return { ok: false, code: 'not_configured', message: '系统尚未配置' }
  if ((input.passcode ?? '') !== getEditPasscode()) {
    return { ok: false, code: 'passcode', message: '口令不正确' }
  }

  const name = cleanText(input.name ?? '')
  const nameKey = name.toLowerCase()
  if (nameKey.length === 0) return { ok: false, code: 'invalid', message: '请填写要移除的队员昵称' }

  try {
    await ensureSchema(sql)
    const active = (await sql`
      SELECT name, name_key, note, EXTRACT(EPOCH FROM created_at)::float8 AS ts_sec
      FROM agent_team_signups
      WHERE team_id = ${input.teamId} AND deleted_at IS NULL
      ORDER BY created_at ASC
    `) as (RosterRow & { name_key: string })[]
    const captainRows = (await sql`
      SELECT captain_key FROM agent_team_captains WHERE team_id = ${input.teamId}
    `) as { captain_key: string }[]
    const savedCaptain = captainRows[0]?.captain_key
    const validation = validateKickTarget(
      active.map((member) => member.name_key),
      savedCaptain,
      nameKey
    )
    if (!validation.ok) {
      const code = active.some((member) => member.name_key === nameKey) ? 'invalid' : 'not_found'
      return { ok: false, code, message: validation.message }
    }

    await sql`
      UPDATE agent_team_signups
      SET deleted_at = now(), deleted_reason = ${SIGNUP_DELETION_REASONS.captainKick}, deleted_by = ${validation.captainKey}
      WHERE team_id = ${input.teamId} AND name_key = ${nameKey} AND deleted_at IS NULL
    `
    const members = active.filter((member) => member.name_key !== nameKey).map(rowToMember)
    return {
      ok: true,
      roster: { id: input.teamId, count: members.length, capacity: opts.capacity, members }
    }
  } catch {
    return { ok: false, code: 'store_error', message: '移除失败，请稍后再试' }
  }
}

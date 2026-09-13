// GSC SEO 审计拉数脚本：一次把审计需要的全部维度拉下来，输出 markdown 摘要 + JSON 原始数据。
//
//   node scripts/gsc/gsc-audit.mjs <startDate> <endDate> [--site sc-domain:joyehuang.me] [--out <dir>]
//
// 例：node scripts/gsc/gsc-audit.mjs 2026-03-05 2026-09-05 --out /tmp/gsc-out
//
// 依赖 ~/.config/gsc/client_secret.json + token.json（由 flow.mjs / auth.mjs 生成，不入库）。
// 输出（stdout 为 markdown，可直接贴进报告）：
//   1. 月度 clicks / impressions / CTR / position（web 搜索）+ discover / image 类型对照
//   2. 按 page：zh vs en 汇总、TOP 页面、/archive 等已 404 的旧 URL 仍在拿曝光的清单
//   3. 按 query：排名分桶、"曝光大但排名 8–20"、"曝光大但 CTR 偏低"
//   4. 按 page+query：每个 TOP 页面的主 query，以及没有内容承接的 query（落在首页/列表页/404）
//   5. device / country 分布
import { google } from 'googleapis'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const TOKEN_FILE = path.join(os.homedir(), '.config', 'gsc', 'token.json')
const CLIENT_FILE = path.join(os.homedir(), '.config', 'gsc', 'client_secret.json')

const args = process.argv.slice(2)
const startDate = args[0]
const endDate = args[1]
const opt = (name, def) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : def
}
if (!startDate || !endDate) {
  console.error('usage: node gsc-audit.mjs <startDate> <endDate> [--site <siteUrl>] [--out <dir>]')
  process.exit(1)
}
const outDir = opt('--out', path.join(os.tmpdir(), 'gsc-audit'))
fs.mkdirSync(outDir, { recursive: true })

const tokens = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'))
const creds = JSON.parse(fs.readFileSync(CLIENT_FILE, 'utf8'))
const { client_id, client_secret } = creds.installed ?? creds.web
const auth = new google.auth.OAuth2(client_id, client_secret, 'http://localhost:3456/oauth2callback')
auth.setCredentials(tokens)
const sc = google.searchconsole({ version: 'v1', auth })

const { data: sitesData } = await sc.sites.list()
const owned = (sitesData.siteEntry || []).filter(
  (s) => s.permissionLevel === 'siteOwner' || s.permissionLevel === 'siteFullUser'
)
const site =
  opt('--site') ||
  owned.find((s) => s.siteUrl.includes('joyehuang.me'))?.siteUrl ||
  owned.find((s) => s.siteUrl.includes('joeyhuang.me'))?.siteUrl ||
  owned[0]?.siteUrl
if (!site) {
  console.error('no verified site; available:', (sitesData.siteEntry || []).map((s) => s.siteUrl))
  process.exit(1)
}

// ---------- helpers ----------
async function query(dimensions, extra = {}) {
  const rows = []
  const rowLimit = 25000
  let startRow = 0
  for (;;) {
    const { data } = await sc.searchanalytics.query({
      siteUrl: site,
      requestBody: {
        startDate,
        endDate,
        dimensions,
        rowLimit,
        startRow,
        dataState: 'all',
        type: 'web',
        ...extra
      }
    })
    const batch = data.rows || []
    rows.push(...batch)
    if (batch.length < rowLimit) break
    startRow += rowLimit
  }
  return rows.map((r) => ({
    keys: r.keys,
    clicks: r.clicks,
    impressions: r.impressions,
    ctr: r.ctr,
    position: r.position
  }))
}
const pct = (x) => `${(x * 100).toFixed(1)}%`
const pos = (x) => x.toFixed(1)
const pathOf = (url) => url.replace(/^https?:\/\/(www\.)?joyehuang\.me/, '') || '/'
const isEn = (url) => /^https?:\/\/(www\.)?joyehuang\.me\/en(\/|$)/.test(url)
const sum = (rows) => {
  const t = rows.reduce(
    (a, r) => {
      a.clicks += r.clicks
      a.impressions += r.impressions
      a.posW += r.position * r.impressions
      return a
    },
    { clicks: 0, impressions: 0, posW: 0 }
  )
  return {
    clicks: t.clicks,
    impressions: t.impressions,
    ctr: t.impressions ? t.clicks / t.impressions : 0,
    position: t.impressions ? t.posW / t.impressions : 0
  }
}
const table = (header, rows) => {
  const out = [`| ${header.join(' | ')} |`, `| ${header.map(() => '---').join(' | ')} |`]
  for (const r of rows) out.push(`| ${r.map((c) => String(c).replace(/\|/g, '\\|')).join(' | ')} |`)
  return out.join('\n')
}
const save = (name, data) => fs.writeFileSync(path.join(outDir, `${name}.json`), JSON.stringify(data, null, 1))

// ---------- pulls ----------
const [byDate, byPage, byQuery, byPageQuery, byDevice, byCountry] = await Promise.all([
  query(['date']),
  query(['page']),
  query(['query']),
  query(['page', 'query']),
  query(['device']),
  query(['country'])
])
let byDateDiscover = []
let byDateImage = []
try {
  byDateDiscover = await query(['date'], { type: 'discover' })
} catch {}
try {
  byDateImage = await query(['date'], { type: 'image' })
} catch {}
save('byDate', byDate)
save('byPage', byPage)
save('byQuery', byQuery)
save('byPageQuery', byPageQuery)
save('byDevice', byDevice)
save('byCountry', byCountry)
save('byDateDiscover', byDateDiscover)
save('byDateImage', byDateImage)

const md = []
md.push(`# GSC audit — ${site}\n\nrange: ${startDate} ~ ${endDate}  (dataState=all, type=web unless noted)\n`)

// 1. monthly
const monthly = {}
for (const r of byDate) {
  const m = r.keys[0].slice(0, 7)
  ;(monthly[m] = monthly[m] || []).push(r)
}
const total = sum(byDate)
md.push(`## 1. 总量与月度趋势\n\n**总计**：clicks ${total.clicks} · impressions ${total.impressions} · CTR ${pct(total.ctr)} · avg position ${pos(total.position)}\n`)
md.push(
  table(
    ['month', 'clicks', 'impressions', 'CTR', 'avg pos', 'discover clicks/impr', 'image clicks/impr'],
    Object.keys(monthly)
      .sort()
      .map((m) => {
        const s = sum(monthly[m])
        const d = sum(byDateDiscover.filter((r) => r.keys[0].startsWith(m)))
        const i = sum(byDateImage.filter((r) => r.keys[0].startsWith(m)))
        return [m, s.clicks, s.impressions, pct(s.ctr), pos(s.position), `${d.clicks}/${d.impressions}`, `${i.clicks}/${i.impressions}`]
      })
  )
)
// weekly (for spike attribution)
const weekly = {}
for (const r of byDate) {
  const d = new Date(r.keys[0] + 'T00:00:00Z')
  const day = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - day)
  const w = d.toISOString().slice(0, 10)
  ;(weekly[w] = weekly[w] || []).push(r)
}
md.push(`\n<details><summary>周粒度</summary>\n\n${table(['week (Mon)', 'clicks', 'impressions', 'CTR', 'avg pos'], Object.keys(weekly).sort().map((w) => { const s = sum(weekly[w]); return [w, s.clicks, s.impressions, pct(s.ctr), pos(s.position)] }))}\n\n</details>\n`)

// 2. pages
const zh = byPage.filter((r) => !isEn(r.keys[0]))
const en = byPage.filter((r) => isEn(r.keys[0]))
const sz = sum(zh)
const se = sum(en)
md.push(`## 2. 按页面（zh vs en）\n`)
md.push(
  table(
    ['lang', 'pages with impressions', 'clicks', 'impressions', 'CTR', 'avg pos'],
    [
      ['zh (no /en prefix)', zh.length, sz.clicks, sz.impressions, pct(sz.ctr), pos(sz.position)],
      ['en (/en/...)', en.length, se.clicks, se.impressions, pct(se.ctr), pos(se.position)]
    ]
  )
)
const topPages = [...byPage].sort((a, b) => b.impressions - a.impressions).slice(0, 40)
md.push(`\n### TOP 40 页面（按曝光）\n\n${table(['page', 'clicks', 'impressions', 'CTR', 'avg pos'], topPages.map((r) => [pathOf(r.keys[0]), r.clicks, r.impressions, pct(r.ctr), pos(r.position)]))}`)
const dead = byPage.filter((r) => /\/archive\/|\/en\/archive\//.test(r.keys[0]))
const sd = sum(dead)
md.push(`\n### 已 404 的旧 URL（/archive/...）仍有搜索曝光：${dead.length} 个 URL，clicks ${sd.clicks} · impressions ${sd.impressions}\n\n${table(['page', 'clicks', 'impressions', 'avg pos'], dead.sort((a, b) => b.impressions - a.impressions).map((r) => [pathOf(r.keys[0]), r.clicks, r.impressions, pos(r.position)]))}`)
const other404 = byPage.filter((r) => /\/404$|\?/.test(r.keys[0]))
if (other404.length) md.push(`\n其它可疑 URL（含 /404 或 query string）：\n\n${table(['page', 'clicks', 'impressions'], other404.map((r) => [pathOf(r.keys[0]), r.clicks, r.impressions]))}`)

// 3. queries
const buckets = { '1-3': [], '4-7': [], '8-20': [], '21-50': [], '50+': [] }
for (const r of byQuery) {
  const p = r.position
  const k = p <= 3 ? '1-3' : p <= 7 ? '4-7' : p <= 20 ? '8-20' : p <= 50 ? '21-50' : '50+'
  buckets[k].push(r)
}
md.push(`\n## 3. 按 query\n\n共 ${byQuery.length} 个 query 有曝光。\n`)
md.push(table(['position bucket', 'queries', 'clicks', 'impressions', 'CTR'], Object.entries(buckets).map(([k, v]) => { const s = sum(v); return [k, v.length, s.clicks, s.impressions, pct(s.ctr)] })))
const topQ = [...byQuery].sort((a, b) => b.impressions - a.impressions).slice(0, 40)
md.push(`\n### TOP 40 query（按曝光）\n\n${table(['query', 'clicks', 'impressions', 'CTR', 'avg pos'], topQ.map((r) => [r.keys[0], r.clicks, r.impressions, pct(r.ctr), pos(r.position)]))}`)
const striking = byQuery.filter((r) => r.impressions >= 30 && r.position >= 8 && r.position <= 20).sort((a, b) => b.impressions - a.impressions)
md.push(`\n### 机会 A：曝光 ≥30 且排名 8–20（第二页上沿）— ${striking.length} 个\n\n${table(['query', 'clicks', 'impressions', 'CTR', 'avg pos'], striking.slice(0, 40).map((r) => [r.keys[0], r.clicks, r.impressions, pct(r.ctr), pos(r.position)]))}`)
// expected CTR by position (rough industry curve) to flag under-performers
const expectedCtr = (p) => (p <= 1 ? 0.28 : p <= 2 ? 0.15 : p <= 3 ? 0.11 : p <= 5 ? 0.07 : p <= 10 ? 0.03 : 0.01)
const lowCtr = byQuery.filter((r) => r.impressions >= 50 && r.position <= 10 && r.ctr < expectedCtr(r.position) / 2).sort((a, b) => b.impressions - a.impressions)
md.push(`\n### 机会 B：曝光 ≥50、排名 ≤10 但 CTR 低于同排位经验值一半 — ${lowCtr.length} 个\n\n${table(['query', 'clicks', 'impressions', 'CTR', 'expected CTR', 'avg pos'], lowCtr.slice(0, 40).map((r) => [r.keys[0], r.clicks, r.impressions, pct(r.ctr), pct(expectedCtr(r.position)), pos(r.position)]))}`)

// 4. page+query
const byPageMap = {}
for (const r of byPageQuery) (byPageMap[r.keys[0]] = byPageMap[r.keys[0]] || []).push(r)
md.push(`\n## 4. 页面 × query\n`)
for (const p of topPages.slice(0, 15)) {
  const qs = (byPageMap[p.keys[0]] || []).sort((a, b) => b.impressions - a.impressions).slice(0, 8)
  md.push(`\n**${pathOf(p.keys[0])}**  (clicks ${p.clicks} · impr ${p.impressions} · pos ${pos(p.position)})\n\n${table(['query', 'clicks', 'impressions', 'CTR', 'avg pos'], qs.map((r) => [r.keys[1], r.clicks, r.impressions, pct(r.ctr), pos(r.position)]))}`)
}
// low-CTR pages (page level)
const lowCtrPages = byPage.filter((r) => r.impressions >= 100 && r.position <= 12 && r.ctr < expectedCtr(r.position) / 2).sort((a, b) => b.impressions - a.impressions)
md.push(`\n### 机会 C：页面级 — 曝光 ≥100、排名 ≤12、CTR 低于经验值一半 — ${lowCtrPages.length} 个\n\n${table(['page', 'clicks', 'impressions', 'CTR', 'expected', 'avg pos'], lowCtrPages.map((r) => [pathOf(r.keys[0]), r.clicks, r.impressions, pct(r.ctr), pct(expectedCtr(r.position)), pos(r.position)]))}`)
// queries landing on non-content pages = content gap candidates
const nonContent = byPageQuery.filter((r) => /joyehuang\.me\/?(en\/?)?$|\/tags|\/blog\/?$|\/notes\/?$|\/blog\/\d+$|\/404|\/archive\//.test(r.keys[0]) && r.impressions >= 10).sort((a, b) => b.impressions - a.impressions)
md.push(`\n### 机会 D：落在首页/列表/标签/404 页的 query（没有专门内容承接）— ${nonContent.length} 条\n\n${table(['query', 'landing page', 'clicks', 'impressions', 'avg pos'], nonContent.slice(0, 40).map((r) => [r.keys[1], pathOf(r.keys[0]), r.clicks, r.impressions, pos(r.position)]))}`)

// 5. device / country
md.push(`\n## 5. 设备 / 国家\n\n${table(['device', 'clicks', 'impressions', 'CTR', 'avg pos'], byDevice.map((r) => [r.keys[0], r.clicks, r.impressions, pct(r.ctr), pos(r.position)]))}\n\n${table(['country', 'clicks', 'impressions', 'CTR', 'avg pos'], [...byCountry].sort((a, b) => b.impressions - a.impressions).slice(0, 15).map((r) => [r.keys[0], r.clicks, r.impressions, pct(r.ctr), pos(r.position)]))}`)

const report = md.join('\n')
fs.writeFileSync(path.join(outDir, 'report.md'), report)
console.log(report)
console.error(`\nJSON + report.md written to ${outDir}`)

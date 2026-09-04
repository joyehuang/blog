// GSC 全量审计脚本：node gsc-audit.mjs <startDate> <endDate> [--out <dir>]
// stdout 输出 markdown（月度/周度趋势、zh/en 汇总、TOP 40 页面、/archive 残余曝光、
// query 排位分桶、机会 A/B/C/D 四表、设备/国家分布）；--out 目录写各维度原始 JSON。
// 另外单独拉一遍 discover / image 搜索类型，用于核对 2026-07 Google 流量尖峰的来源。
import { google } from 'googleapis';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const TOKEN_FILE = path.join(os.homedir(), '.config/gsc/token.json');
const CLIENT_FILE = path.join(os.homedir(), '.config/gsc/client_secret.json');

const tokens = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
const creds = JSON.parse(fs.readFileSync(CLIENT_FILE, 'utf8'));
const { client_id, client_secret } = creds.installed ?? creds.web;
const auth = new google.auth.OAuth2(client_id, client_secret, 'http://localhost:3456/oauth2callback');
auth.setCredentials(tokens);
const sc = google.searchconsole({ version: 'v1', auth });

// ---- args ----
const rawArgs = process.argv.slice(2);
let outDir = null;
const outIdx = rawArgs.indexOf('--out');
if (outIdx !== -1) {
  outDir = rawArgs[outIdx + 1];
  rawArgs.splice(outIdx, 2);
}
const [startDate, endDate] = rawArgs;
if (!startDate || !endDate) {
  console.error('usage: node gsc-audit.mjs <startDate> <endDate> [--out <dir>]');
  process.exit(1);
}
if (outDir) fs.mkdirSync(outDir, { recursive: true });

// ---- 选站点：兼容 joyehuang.me 与历史脚本里误写的 joeyhuang.me ----
const { data: sitesData } = await sc.sites.list();
const owned = (sitesData.siteEntry || []).filter(
  (s) => s.permissionLevel === 'siteOwner' || s.permissionLevel === 'siteFullUser'
);
const site =
  owned.find((s) => s.siteUrl.includes('joyehuang.me')) ||
  owned.find((s) => s.siteUrl.includes('joeyhuang.me')) ||
  owned[0];
if (!site) {
  console.error('no owned/full-user site found in this GSC account');
  process.exit(1);
}
const siteUrl = site.siteUrl;

// ---- 基础查询封装 ----
async function query(requestBody, label) {
  try {
    const { data } = await sc.searchanalytics.query({ siteUrl, requestBody });
    const rows = data.rows || [];
    if (rows.length >= (requestBody.rowLimit || 1000)) {
      console.error(`[warn] ${label}: 命中 rowLimit=${requestBody.rowLimit}，结果可能被截断`);
    }
    return rows;
  } catch (e) {
    console.error(`[warn] ${label} 查询失败：${e.message}`);
    return [];
  }
}

function save(name, data) {
  if (!outDir) return;
  fs.writeFileSync(path.join(outDir, `${name}.json`), JSON.stringify(data, null, 2));
}

function pathOf(fullUrl) {
  try {
    return new URL(fullUrl).pathname;
  } catch {
    return fullUrl;
  }
}

function hostOf(fullUrl) {
  try {
    return new URL(fullUrl).hostname;
  } catch {
    return '';
  }
}

// sc-domain: 属性会把裸域和 www 当成两个 host 分别出行，同一路径需要按 pathname 合并
// 再统计，否则 TOP 页面 / archive 残余曝光会把同一篇文章拆成两行。
function groupByPath(rows) {
  const m = new Map();
  for (const r of rows) {
    const p = pathOf(r.keys[0]);
    if (!m.has(p)) m.set(p, []);
    m.get(p).push(r);
  }
  return [...m.entries()].map(([pagePath, rs]) => ({ page: pagePath, ...aggregate(rs) }));
}

function isEn(p) {
  return p === '/en' || p.startsWith('/en/');
}

function isArchive(p) {
  // /archive, /archive/, /archive/xxx, /en/archive/... —— 不匹配 /archives（复数，按年归档）
  return /^\/(en\/)?archive(\/|$)/.test(p);
}

const LIST_PATHS = new Set(['/blog', '/en/blog', '/notes', '/en/notes', '/lab', '/en/lab']);
function isList(p) {
  return LIST_PATHS.has(p);
}
function isHome(p) {
  return p === '/' || p === '/en';
}
function isTag(p) {
  return p.includes('/tags/');
}
function is404(p) {
  return p === '/404' || p === '/en/404';
}
function landingCategory(p) {
  if (isHome(p)) return 'home';
  if (is404(p)) return '404';
  if (isTag(p)) return 'tag';
  if (isList(p)) return 'list';
  return null;
}

// 行业经验 CTR 曲线（非 GSC 数据，仅作机会 B/C 的筛选阈值，来自公开 SEO CTR 研究的粗略均值）
const CTR_BENCHMARK = { 1: 0.32, 2: 0.25, 3: 0.19, 4: 0.15, 5: 0.11, 6: 0.08, 7: 0.06, 8: 0.05, 9: 0.04, 10: 0.03 };
function expectedCtr(position) {
  const p = Math.max(1, Math.round(position));
  if (p <= 10) return CTR_BENCHMARK[p];
  if (p <= 20) return 0.015;
  return 0.01;
}

function pct(x) {
  return `${(x * 100).toFixed(2)}%`;
}
function num(x) {
  return x.toLocaleString('en-US');
}
function posFmt(x) {
  return x.toFixed(1);
}

function aggregate(rows) {
  const clicks = rows.reduce((s, r) => s + r.clicks, 0);
  const impressions = rows.reduce((s, r) => s + r.impressions, 0);
  const posWeighted = rows.reduce((s, r) => s + r.position * r.impressions, 0);
  const position = impressions ? posWeighted / impressions : 0;
  const ctr = impressions ? clicks / impressions : 0;
  return { clicks, impressions, ctr, position };
}

function weekStart(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const day = d.getUTCDay(); // 0=Sun..6=Sat
  const diff = (day === 0 ? 6 : day - 1); // days since Monday
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

// ================= 拉数据 =================
const commonBody = { startDate, endDate, dataState: 'all' };

console.error(`site: ${siteUrl}  range: ${startDate} ~ ${endDate}`);

const dateRows = await query({ ...commonBody, dimensions: ['date'], rowLimit: 25000 }, 'date');
save('date', dateRows);

const pageRows = await query({ ...commonBody, dimensions: ['page'], rowLimit: 25000 }, 'page');
save('page', pageRows);

const queryRows = await query({ ...commonBody, dimensions: ['query'], rowLimit: 25000 }, 'query');
save('query', queryRows);

const queryPageRows = await query(
  { ...commonBody, dimensions: ['query', 'page'], rowLimit: 25000 },
  'query+page'
);
save('query_page', queryPageRows);

const deviceRows = await query({ ...commonBody, dimensions: ['device'], rowLimit: 10 }, 'device');
save('device', deviceRows);

const countryRows = await query({ ...commonBody, dimensions: ['country'], rowLimit: 250 }, 'country');
save('country', countryRows);

const discoverDateRows = await query(
  { ...commonBody, dimensions: ['date'], type: 'discover', rowLimit: 25000 },
  'discover(date)'
);
save('discover_date', discoverDateRows);

const discoverPageRows = await query(
  { ...commonBody, dimensions: ['page'], type: 'discover', rowLimit: 1000 },
  'discover(page)'
);
save('discover_page', discoverPageRows);

const imageDateRows = await query(
  { ...commonBody, dimensions: ['date'], type: 'image', rowLimit: 25000 },
  'image(date)'
);
save('image_date', imageDateRows);

const imagePageRows = await query(
  { ...commonBody, dimensions: ['page'], type: 'image', rowLimit: 1000 },
  'image(page)'
);
save('image_page', imagePageRows);

// ================= 派生数据 =================

// 月度 / 周度趋势
const byMonth = new Map();
const byWeek = new Map();
for (const r of dateRows) {
  const month = r.keys[0].slice(0, 7);
  const week = weekStart(r.keys[0]);
  if (!byMonth.has(month)) byMonth.set(month, []);
  byMonth.get(month).push(r);
  if (!byWeek.has(week)) byWeek.set(week, []);
  byWeek.get(week).push(r);
}
const monthly = [...byMonth.entries()].sort().map(([month, rows]) => ({ month, ...aggregate(rows) }));
const weekly = [...byWeek.entries()].sort().map(([week, rows]) => ({ week, ...aggregate(rows) }));
const overallTotal = aggregate(dateRows);

// 按路径合并裸域 / www 两个 host 的行，下面 zh/en、TOP40、archive、机会 C 都基于这份数据
const pageByPath = groupByPath(pageRows);

// 裸域 vs www 曝光分布（呼应 T5：裸域是 307 而非 308，GSC 把两者当独立 host）
const hostAgg = new Map();
for (const r of pageRows) {
  const h = hostOf(r.keys[0]);
  if (!hostAgg.has(h)) hostAgg.set(h, []);
  hostAgg.get(h).push(r);
}
const hostStats = [...hostAgg.entries()].map(([host, rs]) => ({ host, ...aggregate(rs) })).sort((a, b) => b.impressions - a.impressions);

// zh / en 汇总（按 page 维度分类求和）
const zhRows = pageByPath.filter((r) => !isEn(r.page));
const enRows = pageByPath.filter((r) => isEn(r.page));
const zhSummary = aggregate(zhRows);
const enSummary = aggregate(enRows);

// TOP 40 页面（按点击排序，点击相同按曝光排）
const top40Pages = [...pageByPath]
  .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions)
  .slice(0, 40);

// /archive 仍有曝光的 URL
const archiveResidual = pageByPath
  .filter((r) => isArchive(r.page))
  .sort((a, b) => b.impressions - a.impressions);

// query 排位分桶
const posBuckets = [
  { label: '1-3', test: (p) => p <= 3 },
  { label: '4-10', test: (p) => p > 3 && p <= 10 },
  { label: '11-20', test: (p) => p > 10 && p <= 20 },
  { label: '21-50', test: (p) => p > 20 && p <= 50 },
  { label: '50+', test: (p) => p > 50 },
];
const bucketStats = posBuckets.map(({ label, test }) => {
  const rows = queryRows.filter((r) => test(r.position));
  return { bucket: label, queries: rows.length, impressions: rows.reduce((s, r) => s + r.impressions, 0), clicks: rows.reduce((s, r) => s + r.clicks, 0) };
});

// 机会 A：曝光 >= 30，排位 8-20
const oppA = queryRows
  .filter((r) => r.impressions >= 30 && r.position >= 8 && r.position <= 20)
  .sort((a, b) => b.impressions - a.impressions)
  .map((r) => ({ query: r.keys[0], impressions: r.impressions, clicks: r.clicks, ctr: r.ctr, position: r.position }));

// 机会 B：曝光 >= 50，排位 <= 10，CTR < 经验值一半（query 级）
const oppB = queryRows
  .filter((r) => r.impressions >= 50 && r.position <= 10 && r.ctr < expectedCtr(r.position) / 2)
  .sort((a, b) => b.impressions - a.impressions)
  .map((r) => ({ query: r.keys[0], impressions: r.impressions, clicks: r.clicks, ctr: r.ctr, position: r.position, expectedCtr: expectedCtr(r.position) }));

// 机会 C：同口径，页面级
const oppC = pageByPath
  .filter((r) => r.impressions >= 50 && r.position <= 10 && r.ctr < expectedCtr(r.position) / 2)
  .sort((a, b) => b.impressions - a.impressions)
  .map((r) => ({ ...r, expectedCtr: expectedCtr(r.position) }));

// 机会 D：落在首页/列表/标签/404 的 query（内容缺口）—— 按 query+path 合并裸域/www
const queryPathAgg = new Map();
for (const r of queryPageRows) {
  const q = r.keys[0];
  const pagePath = pathOf(r.keys[1]);
  const k = `${q} ${pagePath}`;
  if (!queryPathAgg.has(k)) queryPathAgg.set(k, { query: q, page: pagePath, rows: [] });
  queryPathAgg.get(k).rows.push(r);
}
const oppD = [...queryPathAgg.values()]
  .map(({ query, page, rows }) => ({ query, page, category: landingCategory(page), ...aggregate(rows) }))
  .filter((r) => r.category && r.impressions >= 5)
  .sort((a, b) => b.impressions - a.impressions)
  .slice(0, 60);

// 设备 / 国家
const deviceStats = deviceRows.map((r) => ({ device: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position })).sort((a, b) => b.impressions - a.impressions);
const countryStats = countryRows.map((r) => ({ country: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position })).sort((a, b) => b.impressions - a.impressions).slice(0, 15);

// discover / image 月度，核对 7 月尖峰
function monthlyOf(rows) {
  const m = new Map();
  for (const r of rows) {
    const month = r.keys[0].slice(0, 7);
    if (!m.has(month)) m.set(month, []);
    m.get(month).push(r);
  }
  return [...m.entries()].sort().map(([month, rs]) => ({ month, ...aggregate(rs) }));
}
const discoverMonthly = monthlyOf(discoverDateRows);
const imageMonthly = monthlyOf(imageDateRows);
const discoverTotal = aggregate(discoverDateRows);
const imageTotal = aggregate(imageDateRows);

save('summary', {
  site: siteUrl,
  range: { startDate, endDate },
  overallTotal,
  monthly,
  weekly,
  zhSummary,
  enSummary,
  top40Pages,
  archiveResidual,
  hostStats,
  bucketStats,
  oppA,
  oppB,
  oppC,
  oppD,
  deviceStats,
  countryStats,
  discoverTotal,
  discoverMonthly,
  imageTotal,
  imageMonthly,
});

// ================= markdown 输出 =================
const lines = [];
const p = (s = '') => lines.push(s);

p(`# GSC 审计数据 · ${siteUrl} · ${startDate} ~ ${endDate}`);
p();
p(`全期合计：点击 ${num(overallTotal.clicks)} · 曝光 ${num(overallTotal.impressions)} · CTR ${pct(overallTotal.ctr)} · 平均排位 ${posFmt(overallTotal.position)}`);
p();

p('## 月度趋势');
p();
p('| 月 | 点击 | 曝光 | CTR | 平均排位 |');
p('| --- | --- | --- | --- | --- |');
for (const m of monthly) p(`| ${m.month} | ${num(m.clicks)} | ${num(m.impressions)} | ${pct(m.ctr)} | ${posFmt(m.position)} |`);
p();

p('## 周度趋势（周一为周起始）');
p();
p('| 周 | 点击 | 曝光 | CTR | 平均排位 |');
p('| --- | --- | --- | --- | --- |');
for (const w of weekly) p(`| ${w.week} | ${num(w.clicks)} | ${num(w.impressions)} | ${pct(w.ctr)} | ${posFmt(w.position)} |`);
p();

p('## zh / en 汇总');
p();
p('| 语言 | 点击 | 曝光 | CTR | 平均排位 |');
p('| --- | --- | --- | --- | --- |');
p(`| zh | ${num(zhSummary.clicks)} | ${num(zhSummary.impressions)} | ${pct(zhSummary.ctr)} | ${posFmt(zhSummary.position)} |`);
p(`| en | ${num(enSummary.clicks)} | ${num(enSummary.impressions)} | ${pct(enSummary.ctr)} | ${posFmt(enSummary.position)} |`);
p();

p('## 裸域 vs www（呼应 T5：sc-domain 属性把两个 host 当独立行，下方各表已按路径合并）');
p();
p('| host | 点击 | 曝光 | CTR | 平均排位 |');
p('| --- | --- | --- | --- | --- |');
for (const h of hostStats) p(`| ${h.host} | ${num(h.clicks)} | ${num(h.impressions)} | ${pct(h.ctr)} | ${posFmt(h.position)} |`);
p();

p('## TOP 40 页面（按点击排序）');
p();
p('| # | 页面 | 点击 | 曝光 | CTR | 平均排位 |');
p('| --- | --- | --- | --- | --- | --- |');
top40Pages.forEach((r, i) => p(`| ${i + 1} | ${r.page} | ${num(r.clicks)} | ${num(r.impressions)} | ${pct(r.ctr)} | ${posFmt(r.position)} |`));
p();

p('## 仍有曝光的 /archive URL（T1 修复后应归零）');
p();
if (archiveResidual.length === 0) {
  p('无：/archive/* 在 GSC 里已没有曝光记录。');
} else {
  p('| 页面 | 点击 | 曝光 | CTR | 平均排位 |');
  p('| --- | --- | --- | --- | --- |');
  for (const r of archiveResidual) p(`| ${r.page} | ${num(r.clicks)} | ${num(r.impressions)} | ${pct(r.ctr)} | ${posFmt(r.position)} |`);
}
p();

p('## query 排位分桶');
p();
p('| 排位区间 | query 数 | 曝光 | 点击 |');
p('| --- | --- | --- | --- |');
for (const b of bucketStats) p(`| ${b.bucket} | ${num(b.queries)} | ${num(b.impressions)} | ${num(b.clicks)} |`);
p();

p('## 机会 A · 曝光 ≥ 30、排位 8–20（第二页上沿）');
p();
if (oppA.length === 0) { p('无符合条件的 query。'); } else {
  p('| query | 曝光 | 点击 | CTR | 排位 |');
  p('| --- | --- | --- | --- | --- |');
  for (const r of oppA) p(`| ${r.query} | ${num(r.impressions)} | ${num(r.clicks)} | ${pct(r.ctr)} | ${posFmt(r.position)} |`);
}
p();

p('## 机会 B · 曝光 ≥ 50、排位 ≤ 10、CTR 低于同排位经验值一半（query 级）');
p();
if (oppB.length === 0) { p('无符合条件的 query。'); } else {
  p('| query | 曝光 | 点击 | CTR | 排位 | 经验 CTR |');
  p('| --- | --- | --- | --- | --- | --- |');
  for (const r of oppB) p(`| ${r.query} | ${num(r.impressions)} | ${num(r.clicks)} | ${pct(r.ctr)} | ${posFmt(r.position)} | ${pct(r.expectedCtr)} |`);
}
p();

p('## 机会 C · 同口径，页面级');
p();
if (oppC.length === 0) { p('无符合条件的页面。'); } else {
  p('| 页面 | 曝光 | 点击 | CTR | 排位 | 经验 CTR |');
  p('| --- | --- | --- | --- | --- | --- |');
  for (const r of oppC) p(`| ${r.page} | ${num(r.impressions)} | ${num(r.clicks)} | ${pct(r.ctr)} | ${posFmt(r.position)} | ${pct(r.expectedCtr)} |`);
}
p();

p('## 机会 D · 落在首页 / 列表 / 标签 / 404 页的 query（内容缺口）');
p();
if (oppD.length === 0) { p('无符合条件的 query（阈值：曝光 ≥ 5）。'); } else {
  p('| query | 落地页 | 类型 | 曝光 | 点击 | CTR | 排位 |');
  p('| --- | --- | --- | --- | --- | --- | --- |');
  for (const r of oppD) p(`| ${r.query} | ${r.page} | ${r.category} | ${num(r.impressions)} | ${num(r.clicks)} | ${pct(r.ctr)} | ${posFmt(r.position)} |`);
}
p();

p('## 设备分布');
p();
p('| 设备 | 点击 | 曝光 | CTR | 平均排位 |');
p('| --- | --- | --- | --- | --- |');
for (const r of deviceStats) p(`| ${r.device} | ${num(r.clicks)} | ${num(r.impressions)} | ${pct(r.ctr)} | ${posFmt(r.position)} |`);
p();

p('## 国家分布（TOP 15）');
p();
p('| 国家 | 点击 | 曝光 | CTR | 平均排位 |');
p('| --- | --- | --- | --- | --- |');
for (const r of countryStats) p(`| ${r.country} | ${num(r.clicks)} | ${num(r.impressions)} | ${pct(r.ctr)} | ${posFmt(r.position)} |`);
p();

p('## Discover / Image 搜索类型（核对 2026-07 Google 流量尖峰来源）');
p();
p(`Discover 全期合计：点击 ${num(discoverTotal.clicks)} · 曝光 ${num(discoverTotal.impressions)}`);
p(`Image 全期合计：点击 ${num(imageTotal.clicks)} · 曝光 ${num(imageTotal.impressions)}`);
p();
p('### Discover 月度');
p();
if (discoverMonthly.length === 0) { p('无 Discover 数据。'); } else {
  p('| 月 | 点击 | 曝光 | CTR | 平均排位 |');
  p('| --- | --- | --- | --- | --- |');
  for (const m of discoverMonthly) p(`| ${m.month} | ${num(m.clicks)} | ${num(m.impressions)} | ${pct(m.ctr)} | ${posFmt(m.position)} |`);
}
p();
p('### Image 月度');
p();
if (imageMonthly.length === 0) { p('无 Image 搜索数据。'); } else {
  p('| 月 | 点击 | 曝光 | CTR | 平均排位 |');
  p('| --- | --- | --- | --- | --- |');
  for (const m of imageMonthly) p(`| ${m.month} | ${num(m.clicks)} | ${num(m.impressions)} | ${pct(m.ctr)} | ${posFmt(m.position)} |`);
}
p();
if (discoverPageRows.length) {
  p('### Discover TOP 页面');
  p();
  p('| 页面 | 点击 | 曝光 |');
  p('| --- | --- | --- |');
  for (const r of [...discoverPageRows].sort((a, b) => b.impressions - a.impressions).slice(0, 15)) {
    p(`| ${pathOf(r.keys[0])} | ${num(r.clicks)} | ${num(r.impressions)} |`);
  }
  p();
}

console.log(lines.join('\n'));
if (outDir) console.error(`JSON 已写入 ${outDir}`);

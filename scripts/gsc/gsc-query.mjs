// GSC 查询脚本：node gsc-query.mjs '<startDate>' '<endDate>' [site]
// 不带参数 = 列出已验证站点 + 默认拉 joeyhuang.me 近 28 天
import { google } from 'googleapis';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const TOKEN_FILE = path.join(os.homedir(), '.config', 'gsc/token.json');
const CLIENT_FILE = path.join(os.homedir(), '.config/gsc/client_secret.json');

const tokens = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
const creds = JSON.parse(fs.readFileSync(CLIENT_FILE, 'utf8'));
const { client_id, client_secret } = creds.installed ?? creds.web;
const auth = new google.auth.OAuth2(client_id, client_secret, 'http://localhost:3456/oauth2callback');
auth.setCredentials(tokens);

const sc = google.searchconsole({ version: 'v1', auth });

const [startDate, endDate, siteArg, dimensionArg, rowLimitArg] = process.argv.slice(2);

if (!startDate) {
  const { data } = await sc.sites.list();
  const sites = (data.siteEntry || []).map(s => `${s.permissionLevel}  ${s.siteUrl}`);
  console.log(sites.join('\n'));
  process.exit(0);
}

// 选 site：默认 sc-domain:joeyhuang.me
const { data: sitesData } = await sc.sites.list();
const owned = (sitesData.siteEntry || []).filter(s => s.permissionLevel === 'siteOwner' || s.permissionLevel === 'siteFullUser');
const site = siteArg || owned.find(s => s.siteUrl.includes('joeyhuang.me'))?.siteUrl || owned[0]?.siteUrl;
if (!site) { console.error('no site'); process.exit(1); }

const dimension = dimensionArg ? dimensionArg.split(',') : ['page'];
const { data } = await sc.searchanalytics.query({
  siteUrl: site,
  requestBody: {
    startDate,
    endDate,
    dimensions: dimension,
    rowLimit: Number(rowLimitArg) || 50,
  },
});

console.log(`site: ${site}`);
console.log(`range: ${startDate} ~ ${endDate}  dims: ${dimension.join(',')}  rows: ${(data.rows||[]).length}`);
for (const r of data.rows || []) {
  const keys = r.keys.join(' | ');
  console.log(`${r.clicks}\t${r.impressions}\t${(r.ctr*100).toFixed(1)}%\t${r.position.toFixed(1)}\t${keys}`);
}

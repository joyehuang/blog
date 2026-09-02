// GSC OAuth2 一次性授权脚本：生成 URL → 用户浏览器登录 → 粘贴 code → 保存 refresh token
import { google } from 'googleapis';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const CRED_DIR = path.join(process.env.HOME, '.config', 'gsc');
const CLIENT_FILE = path.join(CRED_DIR, 'client_secret.json');
const TOKEN_FILE = path.join(CRED_DIR, 'token.json');

const creds = JSON.parse(fs.readFileSync(CLIENT_FILE, 'utf8'));
const { client_id, client_secret } = creds.installed ?? creds.web;
const oauth2 = new google.auth.OAuth2(client_id, client_secret, 'http://localhost:3456/oauth2callback');

const url = oauth2.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: ['https://www.googleapis.com/auth/webmasters.readonly'],
});

console.log('打开以下 URL 完成授权：\n');
console.log(url);
console.log('\n授权后浏览器��跳转到 localhost:3456（页面会打不开，没关系），把地址栏里的 code= 后面的值粘贴到这里：');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question('code: ', async (code) => {
  rl.close();
  try {
    const { tokens } = await oauth2.getToken(decodeURIComponent(code.trim()));
    fs.mkdirSync(CRED_DIR, { recursive: true, mode: 0o700 });
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2), { mode: 0o600 });
    console.log('✅ token 已保存到', TOKEN_FILE);
  } catch (e) {
    console.error('❌ 换取 token 失败：', e.message);
    process.exit(1);
  }
});

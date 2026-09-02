// OAuth flow with local callback server (non-interactive, for ego-browser flow)
import { google } from 'googleapis';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
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

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost:3456');
  if (u.pathname !== '/oauth2callback') { res.writeHead(404); res.end(); return; }
  const code = u.searchParams.get('code');
  const err = u.searchParams.get('error');
  if (err || !code) {
    console.log('OAUTH_ERROR: ' + (err || 'no code'));
    res.writeHead(200); res.end('授权失败: ' + (err || 'no code')); return;
  }
  try {
    const { tokens } = await oauth2.getToken(code);
    fs.mkdirSync(CRED_DIR, { recursive: true, mode: 0o700 });
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2), { mode: 0o600 });
    console.log('OAUTH_OK refresh=' + (tokens.refresh_token ? 'yes' : 'MISSING'));
    res.writeHead(200); res.end('<h1>授权成功，可以关闭此页面</h1>');
  } catch (e) {
    console.log('OAUTH_EXCHANGE_FAIL: ' + e.message);
    res.writeHead(500); res.end('换 token 失败: ' + e.message);
  }
  server.close();
  setTimeout(() => process.exit(0), 500);
});

server.listen(3456, () => {
  console.log('AUTH_URL: ' + url);
});

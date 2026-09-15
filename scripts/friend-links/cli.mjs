#!/usr/bin/env bun
import { spawnSync } from 'node:child_process'
import { fstatSync, readFileSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { adapters, command } from './adapters.mjs'
import { parseApplication, validateReachability } from './data.mjs'
import { compensate, receive, step, Store } from './state.mjs'

process.umask(0o077)
const dir = join(homedir(), '.config', 'friend-link-automation')
const [action, value] = process.argv.slice(2)
if (!['dry-run', 'status', 'baseline', 'manual-enqueue', 'tick', 'serve'].includes(action))
  throw Error(
    'usage: dry-run <file> | status | baseline | manual-enqueue <real-comment-id> | tick | serve'
  )
if (action === 'dry-run') {
  const app = parseApplication(readFileSync(value, 'utf8'))
  await validateReachability(app)
  console.log(JSON.stringify({ valid: true, application: app, mutated: false }))
  process.exit(0)
}
const store = new Store(join(dir, 'state.sqlite'))
if (action === 'status') {
  console.log(
    JSON.stringify(
      {
        cutoff: store.meta('cutoff'),
        lastScan: store.meta('lastScan'),
        scanError: store.meta('scanError'),
        jobs: store.all()
      },
      null,
      2
    )
  )
  store.close()
  process.exit(0)
}
const configPath = join(dir, 'config.json')
if ((statSync(configPath).mode & 0o077) !== 0) throw Error('config.json requires mode 0600')
const config = JSON.parse(readFileSync(configPath, 'utf8'))
// Explicit deployment gate: committed code cannot activate itself.
if (config.enabled !== true) throw Error('worker disabled; independent review and setup required')
const secretPath = join(dir, 'webhook-secret')
if ((statSync(secretPath).mode & 0o077) !== 0) throw Error('webhook-secret requires mode 0600')
const secret = readFileSync(secretPath, 'utf8').trim()
const io = adapters(config)
// Use a kernel lock inherited across exec, so hard crashes and restarts cannot leave a stale PID lock.
if (!process.env.FRIEND_LINK_LOCK_FD) {
  store.close()
  const result = spawnSync(
    'python3',
    [
      fileURLToPath(new URL('./lock.py', import.meta.url)),
      process.execPath,
      fileURLToPath(import.meta.url),
      ...process.argv.slice(2)
    ],
    { stdio: 'inherit' }
  )
  process.exit(result.status ?? 1)
}
fstatSync(Number(process.env.FRIEND_LINK_LOCK_FD))
function cleanup() {
  store.close()
}
process.on('SIGINT', () => process.exit(0))
process.on('SIGTERM', () => process.exit(0))
async function tick() {
  try {
    const comments = await compensate(store, io)
    for (const row of store.db.query('SELECT id FROM inbox LIMIT 100').all()) {
      const c = comments.find((c) => String(c.objectId) === row.id)
      if (c) {
        try {
          store.ingest(c)
        } catch {}
        store.db.query('DELETE FROM inbox WHERE id=?').run(row.id)
      }
      // Missing / moderated / non-links IDs expire without widening the authorized source scope.
    }
    store.db.query('DELETE FROM inbox WHERE at < ?').run(Date.now() - 86400000)
  } catch {
    store.meta(
      'scanError',
      'Waline scan failed; watermark unchanged; inspect endpoint and capacity'
    )
  }
  for (const job of store
    .all()
    .filter((j) => j.stage !== 'notified' && !j.hold)
    .sort((a, b) => (a.lastAttemptAt || '').localeCompare(b.lastAttemptAt || ''))
    .slice(0, 20)) {
    job.lastAttemptAt = new Date().toISOString()
    store.save(job)
    await step(store, job, io)
    if (job.error && job.alertedError !== job.error) {
      job.alertedError = job.error // Persist intent before notification; timeout does not produce repeated alerts.
      store.save(job)
      try {
        await command([
          '/Users/joye/bin/notify-telegram.py',
          '⚠️ 友链自动化暂停，需要核对状态。https://joyehuang.me/links'
        ])
      } catch {}
    }
  }
  const scanError = store.meta('scanError')
  if (scanError && store.meta('scanAlert') !== scanError) {
    store.meta('scanAlert', scanError)
    try {
      await command([
        '/Users/joye/bin/notify-telegram.py',
        '⚠️ 友链评论回源失败，未确认新的处理结果。https://joyehuang.me/links'
      ])
    } catch {}
  }
  if (!scanError) store.meta('scanAlert', null)
}
try {
  if (action === 'baseline') {
    const cutoff = Date.now()
    store.baseline(await io.scan(), cutoff)
    console.log('baseline persisted; no historical applications enqueued')
  } else if (action === 'manual-enqueue') {
    if (!/^[A-Za-z0-9_-]{1,100}$/.test(value || '')) throw Error('real comment ID required')
    // Operator's explicit invocation authorizes this particular fetched application, never raw text.
    const c = await io.comment(value)
    if (!c) throw Error('real comment not found')
    console.log(store.ingest(c, { manual: true }))
  } else if (action === 'tick') await tick()
  else {
    if (!store.meta('cutoff')) throw Error('initialize quiet baseline before serving')
    if (!Number.isInteger(config.port) || config.port < 1024 || config.port > 65535)
      throw Error('invalid port')
    Bun.serve({
      hostname: '127.0.0.1',
      port: config.port,
      maxRequestBodySize: 4096,
      idleTimeout: 10,
      fetch: (req) => receive(req, store, secret)
    })
    console.log('receiver listening on loopback; durable worker active')
    // Await each pass: no overlapping business mutations. Webhook requests only write inbox transactions.
    while (true) {
      await tick()
      await Bun.sleep(60000)
    }
  }
} finally {
  cleanup()
}

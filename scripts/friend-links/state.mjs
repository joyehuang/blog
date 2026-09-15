import { createHmac, timingSafeEqual } from 'node:crypto'
import { chmodSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { Database } from 'bun:sqlite'

import { digest, eligible, parseApplication, urlKey } from './data.mjs'

export class Store {
  constructor(path) {
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 })
    this.db = new Database(path, { create: true, strict: true })
    chmodSync(path, 0o600)
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS deliveries (nonce TEXT PRIMARY KEY, at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS inbox (id TEXT PRIMARY KEY, at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, url TEXT UNIQUE NOT NULL, body TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS seen (id TEXT PRIMARY KEY, hash TEXT NOT NULL);`)
  }
  meta(key, value) {
    if (value !== undefined)
      this.db.query('INSERT OR REPLACE INTO meta VALUES (?,?)').run(key, JSON.stringify(value))
    const row = this.db.query('SELECT value FROM meta WHERE key=?').get(key)
    return row ? JSON.parse(row.value) : undefined
  }
  get(id) {
    const row = this.db.query('SELECT body FROM jobs WHERE id=?').get(String(id))
    return row && JSON.parse(row.body)
  }
  all() {
    return this.db
      .query('SELECT body FROM jobs ORDER BY rowid')
      .all()
      .map((r) => JSON.parse(r.body))
  }
  save(job) {
    this.db.query('UPDATE jobs SET body=? WHERE id=?').run(JSON.stringify(job), job.id)
  }
  transition(job, stage, evidence = {}) {
    Object.assign(job, evidence, { stage, error: null })
    job.history.push({ stage, at: new Date().toISOString(), ...evidence })
    this.save(job)
  }
  baseline(comments, cutoff) {
    if (this.meta('cutoff')) throw Error('already initialized')
    this.db.transaction(() => {
      for (const c of comments) {
        if (Date.parse(c.insertedAt) <= cutoff)
          this.db
            .query('INSERT OR IGNORE INTO seen VALUES (?,?)')
            .run(String(c.objectId), digest(c.comment || ''))
      }
      this.meta('cutoff', cutoff)
      this.meta('lastScan', new Date().toISOString())
    })()
  }
  ingest(c, { manual = false } = {}) {
    if (!this.meta('cutoff')) throw Error('baseline required')
    if (!eligible(c)) return 'ignored'
    const id = String(c.objectId)
    const hash = digest(c.comment)
    const previous = this.get(id)
    if (previous) {
      if (previous.hash !== hash) {
        previous.error = 'comment changed: review required'
        previous.hold = true
        this.save(previous)
      }
      return 'duplicate-id'
    }
    if (
      !manual &&
      (this.db.query('SELECT id FROM seen WHERE id=?').get(id) ||
        !(Date.parse(c.insertedAt) > this.meta('cutoff')))
    )
      return 'baseline'
    const app = parseApplication(c.comment)
    const job = {
      id,
      hash,
      app,
      date: new Date().toISOString().slice(0, 10),
      stage: 'accepted',
      history: [{ stage: 'accepted', at: new Date().toISOString() }]
    }
    const result = this.db
      .query('INSERT OR IGNORE INTO jobs VALUES (?,?,?)')
      .run(id, urlKey(app.link), JSON.stringify(job))
    this.db.query('INSERT OR IGNORE INTO seen VALUES (?,?)').run(id, hash)
    return result.changes ? 'accepted' : 'duplicate-url'
  }
  accept(nonce, timestamp, id) {
    this.db.transaction(() => {
      this.db.query('DELETE FROM deliveries WHERE at < ?').run(Date.now() - 600000)
      if (this.db.query('SELECT count(*) AS n FROM inbox').get().n >= 10000)
        throw Error('inbox full')
      this.db.query('INSERT INTO deliveries VALUES (?,?)').run(nonce, timestamp)
      this.db.query('INSERT OR IGNORE INTO inbox VALUES (?,?)').run(id, Date.now())
    })()
  }
  close() {
    this.db.close()
  }
}
export function sign(secret, timestamp, nonce, body) {
  return createHmac('sha256', secret).update(`${timestamp}.${nonce}.${body}`).digest('hex')
}
export async function receive(request, store, secret) {
  if (request.method !== 'POST' || new URL(request.url).pathname !== '/hooks/friend-links/v1')
    return new Response(null, { status: 404 })
  if (!secret || secret.length < 32) return new Response(null, { status: 503 })
  const timestamp = request.headers.get('x-fl-time') || ''
  const nonce = request.headers.get('x-fl-nonce') || ''
  const signature = request.headers.get('x-fl-signature') || ''
  if (
    !/^\d{13}$/.test(timestamp) ||
    Math.abs(Date.now() - Number(timestamp)) > 300000 ||
    !/^[a-f0-9]{32}$/.test(nonce) ||
    !/^[a-f0-9]{64}$/.test(signature)
  )
    return new Response(null, { status: 401 })
  if (Number(request.headers.get('content-length')) > 4096)
    return new Response(null, { status: 413 })
  let body = ''
  const reader = request.body?.getReader()
  if (!reader) return new Response(null, { status: 400 })
  const chunks = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.length
      if (size > 4096) {
        await reader.cancel()
        return new Response(null, { status: 413 })
      }
      chunks.push(Buffer.from(value))
    }
    body = Buffer.concat(chunks).toString('utf8')
    if (
      !timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(sign(secret, timestamp, nonce, body), 'hex')
      )
    )
      return new Response(null, { status: 401 })
    const data = JSON.parse(body)
    if (Object.keys(data).join(',') !== 'id' || !/^[A-Za-z0-9_-]{1,100}$/.test(data.id))
      return new Response(null, { status: 400 })
    store.accept(nonce, Number(timestamp), data.id)
    return Response.json({ accepted: true }, { status: 202 })
  } catch {
    return new Response(null, { status: 409 })
  }
}

// Transport adapters return facts. Unknown writes stay in intent stages and are reconciled read-only.
export async function step(store, job, io) {
  if (job.hold || job.stage === 'notified') return
  try {
    const c = await io.comment(job.id)
    if (!eligible(c) || digest(c.comment) !== job.hash)
      throw Error('comment changed or no longer eligible')
    switch (job.stage) {
      case 'accepted':
        await io.validate(job.app)
        store.transition(job, 'validated')
        break
      case 'validated': {
        const plan = await io.prepare(job)
        if (plan.existing) store.transition(job, 'merged', { existing: true })
        else store.transition(job, 'prepared', { plan })
        break
      }
      case 'prepared':
        store.transition(job, 'pr-intent')
        await io.createPR(job) // Result is deliberately not enough: next step queries authoritative facts.
        break
      case 'pr-intent': {
        const pr = await io.findPR(job)
        if (!pr) throw Error('PR outcome unknown; no repeated create')
        store.transition(job, 'pr', { pr })
        break
      }
      case 'rebuild-intent':
        await io.supersede(job)
        store.transition(job, 'validated', { plan: null, pr: null, proof: null })
        break
      case 'pr': {
        const proof = await io.check(job)
        store.transition(job, 'checked', { proof })
        break
      }
      case 'checked':
        await io.check(job) // Repeat exact base/head/content/check checks immediately before merge.
        store.transition(job, 'merge-intent')
        await io.merge(job)
        break
      case 'merge-intent': {
        const merged = await io.merged(job)
        if (!merged) throw Error('merge outcome unknown; no repeated merge')
        store.transition(job, 'merged', { merge: merged })
        break
      }
      case 'merged':
        store.transition(job, 'deployed', { deployment: await io.production(job) })
        break
      case 'deployed': {
        await io.production(job)
        const reply = await io.findReply(job)
        if (reply) store.transition(job, 'replied', { reply })
        else {
          store.transition(job, 'reply-intent')
          await io.reply(job)
        }
        break
      }
      case 'reply-intent': {
        const reply = await io.findReply(job)
        if (!reply) throw Error('reply ACK unknown; no repeated reply')
        store.transition(job, 'replied', { reply })
        break
      }
      case 'replied':
        store.transition(job, 'notify-intent')
        await io.notify(job)
        store.transition(job, 'notified')
        break
      case 'notify-intent':
        throw Error('notification ACK unknown; do not resend')
      default:
        throw Error('unknown stage')
    }
  } catch (e) {
    if (e.code === 'BASE_DRIFT') {
      store.transition(job, 'rebuild-intent')
      return
    }
    job.error = String(e.message).slice(0, 300)
    job.lastFailureAt = new Date().toISOString()
    store.save(job)
  }
}

export async function compensate(store, source) {
  // A bounded complete scan prevents sticky comments, pagination offsets and late moderation from hiding records.
  // If source cannot finish within its cap, no scan watermark advances and an operator-visible error remains.
  const comments = await source.scan()
  for (const c of comments) {
    try {
      store.ingest(c)
    } catch {
      /* invalid application is data, not a worker failure */
    }
  }
  store.meta('lastScan', new Date().toISOString())
  store.meta('scanError', null)
  return comments
}

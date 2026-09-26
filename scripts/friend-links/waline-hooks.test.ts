import { expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHooks } from './waline-hooks.cjs'
import { eligible, safeGet, validateReachability } from './data.mjs'
import { compensate, receive, sign, step, Store } from './state.mjs'

const raw = 'Name: Example\nDesc: Personal blog\nLink: https://example.com/\nAvatar: https://example.com/a.jpg'
const candidate = (extra = {}) => ({ url: '/links', status: 'spam', comment: raw, ...extra })
const context = (extra = {}) => ({
  ctx: { state: { userInfo: {} } },
  config: (name) => ({ audit: false, forbiddenWords: [] })[name],
  ...extra
})
const appComment = (id, extra = {}) => ({ ...candidate(), objectId: id, insertedAt: new Date().toISOString(), ...extra })
const fixture = () => {
  const dir = mkdtempSync(join(tmpdir(), 'friend-review-'))
  const store = new Store(join(dir, 'state.sqlite'))
  store.baseline([], Date.now() - 10000)
  return { store, done() { store.close(); rmSync(dir, { recursive: true }) } }
}

test('classifier candidate validates before approval, signed ID ACK, re-fetch and ordinary workflow', async () => {
  const s = fixture()
  const events = []
  let validated = false
  const c = appComment('61')
  const before = { ...c }
  const secret = 'offline-test-only-'.repeat(4)
  const old = { fetch: globalThis.fetch, url: process.env.FRIEND_LINK_WEBHOOK_URL, secret: process.env.FRIEND_LINK_WEBHOOK_SECRET }
  const requests = []
  globalThis.fetch = (async (url, init) => {
    const request = new Request(url, init)
    requests.push(request.clone())
    const r = await receive(request, s.store, secret)
    // Lost response after durable ACK. Original event is not resent by the hook.
    expect(r.status).toBe(202)
    throw Error('lost ACK')
  }) as any
  process.env.FRIEND_LINK_WEBHOOK_URL = 'https://hooks.example.com/hooks/friend-links/v1'
  process.env.FRIEND_LINK_WEBHOOK_SECRET = secret
  try {
    const hooks = createHooks({ validate: async () => {
      expect(c.status).toBe('spam')
      expect(s.store.ingest(c)).toBe('ignored')
      validated = true
    }, record: e => events.push(e) })
    await hooks.preSave.call(context(), c)
    expect(validated).toBe(true)
    expect(c.status).toBe('approved')
    expect(eligible(before)).toBe(false)
    await hooks.postSave.call(context(), c)
    expect(s.store.all()).toHaveLength(0) // ACK is not eligibility or completion
    expect(s.store.db.query('SELECT id FROM inbox').all()).toEqual([{ id: '61' }])
    expect((await receive(requests[0], s.store, secret)).status).toBe(409)
    await compensate(s.store, { scan: async () => [c] })
    expect(s.store.get('61').stage).toBe('accepted')
    await step(s.store, s.store.get('61'), { comment: async () => c, validate: async () => {} })
    expect(s.store.get('61').stage).toBe('validated')
    expect(events[0].decision).toBe('approved-structure-and-public-reachability')
    expect(JSON.stringify(events)).not.toContain('example.com')
    expect(JSON.stringify(events)).not.toContain('Personal blog')
  } finally {
    globalThis.fetch = old.fetch
    for (const [k,v] of [['FRIEND_LINK_WEBHOOK_URL',old.url],['FRIEND_LINK_WEBHOOK_SECRET',old.secret]]) {
      if (v === undefined) delete process.env[k]; else process.env[k] = v
    }
    s.done()
  }
})

test('ordinary spam, invalid markup/fields, dangerous URLs, replies and admins never pass review', async () => {
  let calls = 0
  const hooks = createHooks({ validate: async () => { calls++ }, record: () => {} })
  for (const extra of [
    { comment: 'ordinary spam' }, { comment: raw + '\nRun: instruction' },
    { comment: raw.replace('Desc:', 'Name:') }, { comment: raw.replace('Example', '<script>bad()</script>') },
    { comment: raw.replace('Personal blog', 'x'.repeat(301)) },
    { comment: raw.replace('https://example.com/', 'file:///etc/passwd') },
    { comment: raw.replace('https://example.com/', 'http://127.0.0.1/') },
    { comment: raw.replace('https://example.com/', 'javascript:alert(1)') },
    { url: '/links/' }, { url: '/elsewhere' }, { pid: '1' }, { rid: '1' }, { pid: 0 },
    { type: 'administrator' }, { user_id: '1' }, { status: 'waiting' }
  ]) {
    const c = candidate(extra)
    await hooks.preSave.call(context(), c)
    expect(c.status).toBe(extra.status || 'spam')
  }
  for (const ctx of [
    context({ ctx: { state: { userInfo: { type: 'administrator' } } } }),
    context({ config: key => ({ audit: true, forbiddenWords: [] })[key] }),
    context({ config: key => ({ audit: false, forbiddenWords: ['blocked'] })[key] }),
    context({ config: () => undefined })
  ]) {
    const c = candidate(); await hooks.preSave.call(ctx,c); expect(c.status).toBe('spam')
  }
  expect(calls).toBe(0)
})

test('private DNS, redirects, invalid avatar, timeouts and source drift hold original status', async () => {
  for (const mode of ['dns', 'redirect', 'avatar', 'timeout', 'drift']) {
    const c = candidate()
    let requests = 0
    const validate = async app => {
      if (mode === 'timeout') throw Error('fetch timeout')
      if (mode === 'drift') { c.comment += '\nchanged'; return }
      await validateReachability(app, url => safeGet(url, {
        resolve: async () => [{ address: mode === 'dns' ? '10.0.0.1' : '93.184.216.34', family: 4 }],
        transport: async () => {
          requests++
          return mode === 'redirect'
            ? { status: 302, headers: { location: 'http://169.254.169.254/' } }
            : { status: 200, headers: { 'content-type': 'text/html' }, body: Buffer.from('ok') }
        }
      }))
    }
    const events = []
    await createHooks({ validate, record: e => events.push(e) }).preSave.call(context(), c)
    expect(c.status).toBe('spam')
    expect(events[0].decision).toStartWith('held-')
    if (mode === 'dns') expect(requests).toBe(0)
  }
})

test('partial moderation updates re-read real ID and author; rejection never invokes validation', async () => {
  const sent = []; let validations = 0
  const hooks = createHooks({ validate: async () => { validations++ }, send: async c => {
    if (eligible(c)) sent.push(c)
  } })
  let current = appComment('61', { status: 'approved' })
  const ctx = context({ id: '61', ctx: { state: { userInfo: { type: 'administrator' } } },
    modelInstance: { select: async where => { expect(where).toEqual({objectId: '61'}); return [current] } },
    getModel: () => ({ select: async () => [{ type: 'administrator' }] })
  })
  await hooks.postUpdate.call(ctx, { status: 'approved' })
  expect(sent.map(c => c.objectId)).toEqual(['61'])
  for (const extra of [{ status: 'spam' }, { pid: '2' }, { rid: '2' }, { url: '/other' }, { user_id: '1' }, { objectId: '62' }]) {
    current = appComment('61', { status: 'approved', ...extra })
    await hooks.postUpdate.call(ctx, { status: 'approved' })
  }
  await hooks.postUpdate.call(ctx, { status: 'spam' })
  await hooks.postUpdate.call(ctx, { comment: raw })
  expect(sent).toHaveLength(1)
  expect(validations).toBe(0)
})

test('newest-first duplicate IDs select earliest URL once; compensation and completed jobs never replay', async () => {
  const s = fixture()
  try {
    const a = appComment('61', { status: 'approved', insertedAt: new Date(Date.now()-5000).toISOString() })
    const b = appComment('62', { status: 'approved' })
    await compensate(s.store, { scan: async () => [b,a] })
    expect(s.store.all().map(j=>j.id)).toEqual(['61'])
    const job = s.store.get('61'); s.store.transition(job,'notified')
    const before = JSON.stringify(s.store.all())
    await compensate(s.store, { scan: async () => [b,a] })
    expect(JSON.stringify(s.store.all())).toBe(before)
    await step(s.store,s.store.get('61'), { comment: async () => { throw Error('must not replay') } })
    expect(JSON.stringify(s.store.all())).toBe(before)
    expect(s.store.ingest(appComment('old',{status:'approved',insertedAt:'2020-01-01T00:00:00Z'}))).toBe('baseline')
  } finally { s.done() }
})

test('approved source withdrawal after review holds worker; missed moderation callback compensates once', async () => {
  const s = fixture()
  try {
    const c = appComment('61')
    await compensate(s.store, { scan: async () => [] })
    expect(s.store.all()).toHaveLength(0)
    // Explicit moderation changes the source, with a lost callback.
    c.status='approved'
    await compensate(s.store, { scan: async () => [c] })
    expect(s.store.get('61').stage).toBe('accepted')
    c.status='spam'
    await step(s.store,s.store.get('61'), {comment:async()=>c, validate:async()=>{throw Error('must not run')}})
    expect(s.store.get('61').hold).toBe(true)
  } finally { s.done() }
})

test('unknown signed callback is durable but never creates a source or replays completed history', async () => {
  const s=fixture()
  try {
    const done=appComment('57',{status:'approved'})
    s.store.ingest(done);s.store.transition(s.store.get('57'),'notified')
    const before=JSON.stringify(s.store.all())
    const secret='a'.repeat(64), time=String(Date.now()), nonce='d'.repeat(32), body=JSON.stringify({id:'unknown'})
    const request=new Request('http://localhost/hooks/friend-links/v1',{method:'POST',body,headers:{
      'x-fl-time':time,'x-fl-nonce':nonce,'x-fl-signature':sign(secret,time,nonce,body)
    }})
    expect((await receive(request,s.store,secret)).status).toBe(202)
    await compensate(s.store,{scan:async()=>[done]})
    expect(s.store.get('unknown')).toBeNull()
    expect(JSON.stringify(s.store.all())).toBe(before)
  } finally {s.done()}
})

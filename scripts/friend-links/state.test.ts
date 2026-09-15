import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from 'bun:test'

import { compensate, receive, sign, step, Store } from './state.mjs'

const raw = 'Name: Alice\nDesc: AI\nLink: https://example.com/\nAvatar: https://example.com/a.jpg'
const comment = (id = '123', changes = {}) => ({
  objectId: id,
  url: '/links',
  status: 'approved',
  comment: raw,
  insertedAt: new Date().toISOString(),
  ...changes
})
function setup() {
  const dir = mkdtempSync(join(tmpdir(), 'fl-test-'))
  const path = join(dir, 'state.sqlite')
  const store = new Store(path)
  store.baseline([], Date.now() - 10000)
  return {
    dir,
    path,
    store,
    done: () => {
      store.close()
      rmSync(dir, { recursive: true, force: true })
    }
  }
}
function fake(c = comment()) {
  const calls: string[] = []
  const facts: any = { pr: null, merged: null, reply: null, published: true }
  const io: any = {
    comment: async () => c,
    validate: async () => calls.push('validate'),
    prepare: async () => ({ base: 'base', head: 'head', branch: 'branch' }),
    createPR: async () => {
      calls.push('create')
      facts.pr = { number: 1 }
    },
    findPR: async () => facts.pr,
    check: async () => {
      calls.push('check')
      return { head: 'head' }
    },
    seal: async () => ({ sha: 'merge', base: 'base', head: 'head', tree: 'tree' }),
    merge: async (_job: any, guard: any) => {
      await guard()
      calls.push('merge')
      facts.merged = { sha: 'merge' }
    },
    merged: async () => facts.merged,
    production: async () => {
      if (!facts.published) throw Error('deployment failed')
      return { url: 'https://joyehuang.me/links' }
    },
    reply: async () => {
      calls.push('reply')
      facts.reply = { id: 'reply', parent: '123' }
    },
    findReply: async () => facts.reply,
    notify: async () => calls.push('notify'),
    supersede: async () => calls.push('close')
  }
  return { calls, facts, io }
}
async function advance(store: any, io: any, n = 20) {
  for (let i = 0; i < n; i++) await step(store, store.get('123'), io)
}
test('durable signatures, replay, size, route, ID validation and inbox idempotency', async () => {
  const s = setup()
  const secret = 'a'.repeat(64)
  const timestamp = String(Date.now())
  const nonce = 'b'.repeat(32)
  const body = JSON.stringify({ id: '123' })
  const req = (b = body, n = nonce, sig = sign(secret, timestamp, n, b)) =>
    new Request('http://localhost/hooks/friend-links/v1', {
      method: 'POST',
      headers: { 'x-fl-time': timestamp, 'x-fl-nonce': n, 'x-fl-signature': sig },
      body: b
    })
  expect((await receive(req(), s.store, secret)).status).toBe(202)
  expect((await receive(req(), s.store, secret)).status).toBe(409)
  expect((await receive(req(body, 'c'.repeat(32)), s.store, secret)).status).toBe(202)
  expect(s.store.db.query('SELECT count(*) AS n FROM inbox').get()).toEqual({ n: 1 })
  expect((await receive(req(body, nonce, '0'.repeat(64)), s.store, secret)).status).toBe(401)
  expect((await receive(req('x'.repeat(4097)), s.store, secret)).status).toBe(413)
  expect((await receive(req('{"id":"123","command":"go"}'), s.store, secret)).status).toBe(400)
  const expired = new Request('http://localhost/hooks/friend-links/v1', {
    method: 'POST',
    headers: {
      'x-fl-time': String(Date.now() - 600000),
      'x-fl-nonce': nonce,
      'x-fl-signature': 'a'.repeat(64)
    },
    body
  })
  expect((await receive(expired, s.store, secret)).status).toBe(401)
  s.store.close()
  const reopened = new Store(s.path)
  expect(reopened.db.query('SELECT id FROM inbox').get()).toEqual({ id: '123' })
  reopened.close()
  rmSync(s.dir, { recursive: true })
})
test('baseline, duplicate ID/URL, edited comments, admin/replies/spam/nonlinks', () => {
  const s = setup()
  const c = comment()
  expect(s.store.ingest(c)).toBe('accepted')
  expect(s.store.ingest(c)).toBe('duplicate-id')
  expect(s.store.ingest(comment('456'))).toBe('duplicate-url')
  for (const change of [
    { type: 'administrator' },
    { pid: '1' },
    { rid: '1' },
    { status: 'spam' },
    { status: 'waiting' },
    { url: '/other' }
  ])
    expect(s.store.ingest(comment('789', change))).toBe('ignored')
  expect(s.store.ingest(comment('old', { insertedAt: '2020-01-01T00:00:00Z' }))).toBe('baseline')
  s.store.ingest(comment('123', { comment: raw.replace('Alice', 'Bob') }))
  expect(s.store.get('123').hold).toBe(true)
  s.done()
})
test('complete workflow records evidence and replies only after production', async () => {
  const s = setup()
  s.store.ingest(comment())
  const f = fake()
  await advance(s.store, f.io)
  expect(s.store.get('123').stage).toBe('notified')
  expect(f.calls.filter((x) => x === 'create')).toHaveLength(1)
  expect(f.calls.filter((x) => x === 'reply')).toHaveLength(1)
  expect(s.store.get('123').history.map((h: any) => h.stage)).toContain('deployed')
  s.done()
})
test('CI failure, head drift, deployment failure stop mutations', async () => {
  for (const failure of ['CI failure', 'head drift', 'deployment']) {
    const s = setup()
    s.store.ingest(comment())
    const f = fake()
    if (failure === 'deployment') f.facts.published = false
    else
      f.io.check = async () => {
        throw Error(failure)
      }
    await advance(s.store, f.io)
    expect(f.calls).not.toContain('reply')
    expect(f.calls).not.toContain('notify')
    if (failure !== 'deployment') expect(f.calls).not.toContain('merge')
    s.done()
  }
})
test('PR, merge and reply ACK loss reconcile by facts across restart without repeated writes', async () => {
  for (const effect of ['createPR', 'merge', 'reply']) {
    const s = setup()
    s.store.ingest(comment())
    const f = fake()
    const original = f.io[effect]
    f.io[effect] = async (...args: any[]) => {
      await original(...args)
      throw Error('connection lost')
    }
    await advance(s.store, f.io, 7)
    s.store.close()
    const reopened = new Store(s.path)
    await advance(reopened, f.io)
    expect(reopened.get('123').stage).toBe('notified')
    expect(
      f.calls.filter((x) => x === { createPR: 'create', merge: 'merge', reply: 'reply' }[effect])
    ).toHaveLength(1)
    reopened.close()
    rmSync(s.dir, { recursive: true })
  }
})
test('missing ACK and no fact remains pending; never blindly resends', async () => {
  const s = setup()
  s.store.ingest(comment())
  const f = fake()
  f.io.reply = async () => {
    f.calls.push('reply')
    throw Error('unknown')
  }
  await advance(s.store, f.io, 30)
  expect(s.store.get('123').stage).toBe('reply-intent')
  expect(f.calls.filter((x) => x === 'reply')).toHaveLength(1)
  s.done()
})
test('compensation shares real-time deduplication and never advances on partial scan', async () => {
  const s = setup()
  await compensate(s.store, { scan: async () => [comment()] })
  await compensate(s.store, { scan: async () => [comment()] })
  expect(s.store.all()).toHaveLength(1)
  const before = s.store.meta('lastScan')
  await expect(
    compensate(s.store, {
      scan: async () => {
        throw Error('page cap')
      }
    })
  ).rejects.toThrow()
  expect(s.store.meta('lastScan')).toBe(before)
  s.done()
})
test('existing link still requires production proof; comments edited after acceptance stop processing', async () => {
  const s = setup()
  s.store.ingest(comment())
  const f = fake()
  f.io.prepare = async () => ({ existing: true })
  f.facts.published = false
  await advance(s.store, f.io)
  expect(f.calls).not.toContain('create')
  expect(f.calls).not.toContain('reply')
  f.facts.published = true
  await advance(s.store, f.io)
  expect(s.store.get('123').stage).toBe('notified')
  s.done()
  const s2 = setup()
  s2.store.ingest(comment())
  const f2 = fake(comment('123', { comment: 'Name: changed' }))
  await advance(s2.store, f2.io)
  expect(f2.calls).toHaveLength(0)
  s2.done()
})
test('base drift closes reviewed old PR then prepares again', async () => {
  const s = setup()
  s.store.ingest(comment())
  const f = fake()
  let once = true
  f.io.check = async () => {
    if (once) {
      once = false
      const e: any = Error('base drift')
      e.code = 'BASE_DRIFT'
      throw e
    }
    return { head: 'head' }
  }
  await advance(s.store, f.io, 25)
  expect(f.calls).toContain('close')
  expect(s.store.get('123').stage).toBe('notified')
  s.done()
})

for (const stage of ['checked', 'deployed']) {
  test(`source withdrawn or edited during slow ${stage} checks blocks publication`, async () => {
    for (const changed of [
      undefined,
      comment('123', { comment: 'changed' }),
      comment('123', { status: 'waiting' })
    ]) {
      const s = setup()
      s.store.ingest(comment())
      const f = fake()
      const j = s.store.get('123')
      j.stage = stage
      s.store.save(j)
      const effect = stage === 'checked' ? 'seal' : 'production'
      const original = f.io[effect]
      f.io[effect] = async (...args: any[]) => {
        const result = await original(...args)
        f.io.comment = async () => changed
        return result
      }
      await advance(s.store, f.io, 3)
      expect(f.calls).not.toContain('merge')
      expect(f.calls).not.toContain('reply')
      expect(s.store.get('123').hold).toBe(true)
      s.done()
    }
  })
}

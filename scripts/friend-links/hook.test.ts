import { expect, test } from 'bun:test'

import hook from './friend-link-hook.cjs'
import { sign } from './state.mjs'

test('Waline hook sends only application IDs, signs handoff, excludes replies and tolerates receiver failure', async () => {
  const oldFetch = globalThis.fetch
  const oldUrl = process.env.FRIEND_LINK_WEBHOOK_URL
  const oldSecret = process.env.FRIEND_LINK_WEBHOOK_SECRET
  const secret = 'test-only-secret-'.repeat(4)
  process.env.FRIEND_LINK_WEBHOOK_URL = 'https://hooks.example.com/hooks/friend-links/v1'
  process.env.FRIEND_LINK_WEBHOOK_SECRET = secret
  const sent: any[] = []
  globalThis.fetch = (async (_url: any, init: any) => {
    sent.push(init)
    return new Response(null, { status: 202 })
  }) as any
  const c = {
    objectId: '123',
    url: '/links',
    status: 'approved',
    comment:
      'Name: Alice<br>Desc: AI<br>Link: https://example.com<br>Avatar: https://example.com/a.jpg'
  }
  try {
    await hook(c)
    expect(sent).toHaveLength(1)
    expect(sent[0].body).toBe('{"id":"123"}')
    const h = sent[0].headers
    expect(h['x-fl-signature']).toBe(sign(secret, h['x-fl-time'], h['x-fl-nonce'], sent[0].body))
    for (const extra of [
      { pid: '1' },
      { rid: '1' },
      { type: 'administrator' },
      { url: '/blog' },
      { status: 'spam' },
      { comment: 'ordinary comment' }
    ])
      await hook({ ...c, ...extra })
    expect(sent).toHaveLength(1)
    globalThis.fetch = (async () => {
      throw Error('offline')
    }) as any
    await expect(hook(c)).resolves.toBeUndefined()
  } finally {
    globalThis.fetch = oldFetch
    if (oldUrl === undefined) delete process.env.FRIEND_LINK_WEBHOOK_URL
    else process.env.FRIEND_LINK_WEBHOOK_URL = oldUrl
    if (oldSecret === undefined) delete process.env.FRIEND_LINK_WEBHOOK_SECRET
    else process.env.FRIEND_LINK_WEBHOOK_SECRET = oldSecret
  }
})

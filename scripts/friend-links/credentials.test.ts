import { chmodSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from 'bun:test'

import { Waline } from './adapters.mjs'
import { readAdminToken } from './credentials.mjs'
import { digest } from './data.mjs'

test('private bearer file is reloaded; insecure modes, symlinks and exp object payloads fail', () => {
  const dir = mkdtempSync(join(tmpdir(), 'fl-token-'))
  const path = join(dir, 'token')
  const token = (payload: string) => `e30.${Buffer.from(payload).toString('base64url')}.c2ln`
  try {
    writeFileSync(path, token('1'), { mode: 0o600 })
    expect(readAdminToken(path)).toBe(token('1'))
    writeFileSync(path, token('2'))
    expect(readAdminToken(path)).toBe(token('2'))
    chmodSync(path, 0o644)
    expect(() => readAdminToken(path)).toThrow()
    chmodSync(path, 0o600)
    symlinkSync(path, join(dir, 'link'))
    expect(() => readAdminToken(join(dir, 'link'))).toThrow()
    writeFileSync(path, token('{"id":"1","exp":4102444800}'))
    expect(() => readAdminToken(path)).toThrow()
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
test('reply authenticates existing admin then checks current source; revoked credentials or changed source never POST', async () => {
  for (const scenario of ['valid', 'revoked', 'edited', 'withdrawn']) {
    const body =
      'Name: Alice\nDesc: AI\nLink: https://example.com/\nAvatar: https://example.com/a.jpg'
    const job: any = { id: '123', hash: digest(body) }
    const calls: any[] = []
    const w = new Waline(
      () => 'synthetic-bearer',
      async (url: string, init: any = {}) => {
        calls.push([url, init.method || 'GET'])
        if (url.endsWith('/token'))
          return {
            errno: 0,
            data: { objectId: '1', type: scenario === 'revoked' ? 'guest' : 'administrator' }
          }
        if (init.method === 'POST') return { errno: 0 }
        return {
          errno: 0,
          data: {
            totalPages: 1,
            data:
              scenario === 'withdrawn'
                ? []
                : [
                    {
                      objectId: '123',
                      url: '/links',
                      time: 1,
                      status: 'approved',
                      comment: scenario === 'edited' ? 'changed' : body
                    }
                  ]
          }
        }
      }
    )
    if (scenario === 'valid') await w.reply(job)
    else await expect(w.reply(job)).rejects.toThrow()
    expect(calls.filter((c) => c[1] === 'POST')).toHaveLength(scenario === 'valid' ? 1 : 0)
  }
})

import { test, expect } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { Store } from './state.mjs'

test('idle real CLI makes no remote request; a new webhook inbox wakes it', () => {
  const home = mkdtempSync(join(tmpdir(), 'friend-idle-'))
  const dir = join(home, '.config/friend-link-automation')
  mkdirSync(dir, { recursive: true })
  const marker = join(home, 'network-attempt')
  const preload = join(home, 'deny-network.mjs')
  writeFileSync(preload, `import fs from 'node:fs';import cp from 'node:child_process';import {syncBuiltinESMExports} from 'node:module';globalThis.fetch=async()=>{fs.writeFileSync(${JSON.stringify(marker)},'attempt');throw Error('offline')};cp.spawn=()=>{throw Error('no notification process')};syncBuiltinESMExports();`)
  writeFileSync(join(dir, 'config.json'), JSON.stringify({ enabled: true, port: 8796 }), { mode: 0o600 })
  writeFileSync(join(dir, 'webhook-secret'), 'a'.repeat(64), { mode: 0o600 })
  const store = new Store(join(dir, 'state.sqlite'))
  try {
    store.baseline([], Date.now() - 1000)
    store.meta('lastInboxScanStart', Date.now() - 1000)
    const run = () => spawnSync(process.execPath, ['--preload', preload, resolve('scripts/friend-links/cli.mjs'), 'tick'], { env: { ...process.env, HOME: home, FRIEND_LINK_LOCK_FD: '0' }, encoding: 'utf8' })
    expect(run().status).toBe(0)
    expect(existsSync(marker)).toBe(false)
    store.accept('b'.repeat(32), Date.now(), '123')
    expect(run().status).toBe(0)
    expect(existsSync(marker)).toBe(true)
  } finally { store.close(); rmSync(home, { recursive: true, force: true }) }
})

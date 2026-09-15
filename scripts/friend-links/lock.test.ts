import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from 'bun:test'

test('kernel lock remains held after exec into Bun and releases after a hard crash', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'fl-lock-'))
  const script = join(dir, 'lock.py')
  writeFileSync(
    script,
    readFileSync(new URL('./lock.py', import.meta.url), 'utf8').replace(
      "os.path.expanduser('~/.config/friend-link-automation')",
      JSON.stringify(dir)
    )
  )
  const code =
    'import {fstatSync} from "node:fs"; fstatSync(Number(process.env.FRIEND_LINK_LOCK_FD)); console.log("locked"); await Bun.sleep(10000)'
  const first = Bun.spawn(['python3', script, process.execPath, '-e', code], {
    stdout: 'pipe',
    stderr: 'pipe'
  })
  try {
    const reader = first.stdout.getReader()
    const result = await reader.read()
    expect(new TextDecoder().decode(result.value)).toContain('locked')
    await reader.cancel()
    const second = Bun.spawn(
      ['python3', script, process.execPath, '-e', 'console.log("unexpected")'],
      { stdout: 'pipe', stderr: 'pipe' }
    )
    expect(await second.exited).not.toBe(0)
    first.kill('SIGKILL')
    await first.exited
    const third = Bun.spawn(
      ['python3', script, process.execPath, '-e', 'console.log("recovered")'],
      { stdout: 'pipe', stderr: 'pipe' }
    )
    expect(await third.exited).toBe(0)
    expect(await new Response(third.stdout).text()).toContain('recovered')
  } finally {
    first.kill('SIGKILL')
    await first.exited
    rmSync(dir, { recursive: true, force: true })
  }
})

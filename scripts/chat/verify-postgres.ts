// An explicit integration check against a dedicated LOCAL database only.
import assert from 'node:assert/strict'
import { readFile, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { resolve } from 'node:path'
import postgres from 'postgres'

const file = resolve(process.argv[2] ?? '')
if (
  !file.startsWith(resolve(homedir(), '.config') + '/') ||
  ((await stat(file)).mode & 0o777) !== 0o600
)
  throw Error('Private local config required')
const config = JSON.parse(await readFile(file, 'utf8'))
const url = new URL(config.CHAT_DATABASE_URL)
if (url.hostname !== '127.0.0.1') throw Error('Dedicated local database required')
const sql = postgres(url.href, { max: 10, prepare: false })
const call = async (a: string, s: string, p: Record<string, unknown> = {}) =>
  (
    await sql`SELECT blog_chat_action(${a},${s}::uuid,${sql.json(p as postgres.JSONValue)}::jsonb) result`
  )[0].result
try {
  const sid = crypto.randomUUID(),
    ip = crypto.randomUUID()
  await call('session', sid, { ip })
  const races = await Promise.all(
    Array.from({ length: 8 }, () =>
      call('reserve', sid, { ip, question: 'Integration race check' })
    )
  )
  assert.equal(races.filter((r) => r.turn).length, 1)
  const winner = races.find((r) => r.turn)
  await call('finish', sid, { turn: winner.turn, answer: '', status: 'interrupted' })
  const next = await call('reserve', sid, { ip, question: 'Retry after failed answer' })
  assert.ok(next.turn)
  await call('finish', sid, {
    turn: next.turn,
    answer: 'Local integration test answer',
    status: 'complete'
  })
  assert.equal(
    (await call('reserve', sid, { ip, question: 'second question' })).error,
    'login_required'
  )
  await call('delete_account', sid)
  console.log(
    JSON.stringify({
      database: 'PostgreSQL',
      concurrentConnections: 8,
      winners: 1,
      failedAnswerRetry: 'pass',
      secondQuestionGate: 'pass'
    })
  )
} finally {
  await sql.end()
}

import postgres from 'postgres'

import { chatConfig } from './config'

export type StoreResult = {
  error?: string
  ok?: boolean
  authenticated?: boolean
  used?: boolean
  conversation?: string
  turn?: string
  history?: { question: string; answer: string }[]
  conversations?: { id: string; title: string }[]
  turns?: {
    id: string
    question: string
    answer: string
    sources: { title: string; url: string }[]
    status: string
  }[]
}
export type Store = (
  action: string,
  sid: string,
  payload?: Record<string, unknown>
) => Promise<StoreResult>
let connection: ReturnType<typeof postgres> | undefined
export const store: Store = async (action, sid, payload = {}) => {
  const sql = (connection ??= postgres(chatConfig().database, {
    max: 2,
    idle_timeout: 20,
    connect_timeout: 8,
    prepare: false,
    connection: { statement_timeout: 8000 }
  }))
  const rows =
    await sql`SELECT blog_chat_action(${action}, ${sid}::uuid, ${sql.json(payload as postgres.JSONValue)}::jsonb) AS result`
  return rows[0].result as StoreResult
}

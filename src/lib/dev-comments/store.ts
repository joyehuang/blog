import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

import { formatCommentsAsMarkdown, normalizePath } from './format'
import {
  type CommentKind,
  type CommentStatus,
  type CreateDevCommentInput,
  type DevComment,
  type UpdateDevCommentInput
} from './types'

export { formatCommentsAsMarkdown, normalizePath }

const VALID_KINDS = new Set<CommentKind>(['rewrite', 'fix', 'add', 'cut', 'idea'])
const VALID_STATUSES = new Set<CommentStatus>(['open', 'resolved'])

function clampString(value: unknown, maxLen: number): string {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, maxLen)
}

export function validateCreateInput(input: unknown): CreateDevCommentInput {
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid comment payload')
  }
  const obj = input as Record<string, unknown>
  const body = clampString(obj.body, 8000)
  const quote = clampString(obj.quote, 2000)
  if (!body && !quote) {
    throw new Error('Either comment body or quoted text is required')
  }
  const rawPath = typeof obj.path === 'string' ? obj.path : '/'
  const kindRaw = typeof obj.kind === 'string' ? (obj.kind as CommentKind) : 'rewrite'
  const kind: CommentKind = VALID_KINDS.has(kindRaw) ? kindRaw : 'rewrite'

  return {
    path: normalizePath(rawPath),
    quote,
    prefix: clampString(obj.prefix, 120),
    suffix: clampString(obj.suffix, 120),
    heading: clampString(obj.heading, 240),
    body,
    kind
  }
}

export function validateUpdateInput(input: unknown): UpdateDevCommentInput {
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid update payload')
  }
  const obj = input as Record<string, unknown>
  const patch: UpdateDevCommentInput = {}

  if ('body' in obj) {
    patch.body = clampString(obj.body, 8000)
  }
  if ('kind' in obj) {
    if (typeof obj.kind !== 'string' || !VALID_KINDS.has(obj.kind as CommentKind)) {
      throw new Error('Invalid comment kind')
    }
    patch.kind = obj.kind as CommentKind
  }
  if ('status' in obj) {
    if (typeof obj.status !== 'string' || !VALID_STATUSES.has(obj.status as CommentStatus)) {
      throw new Error('Invalid comment status')
    }
    patch.status = obj.status as CommentStatus
  }

  if (Object.keys(patch).length === 0) {
    throw new Error('No valid fields to update')
  }
  return patch
}

interface StoreFileShape {
  version: 1
  comments: DevComment[]
}

export interface ListFilter {
  path?: string
  status?: CommentStatus
}

export function createFileStore(filePath: string) {
  function readAll(): DevComment[] {
    if (!existsSync(filePath)) return []
    try {
      const raw = readFileSync(filePath, 'utf-8').trim()
      if (!raw) return []
      const parsed = JSON.parse(raw) as Partial<StoreFileShape> | DevComment[]
      const list = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.comments)
          ? parsed.comments
          : []
      return list.filter((item): item is DevComment => Boolean(item && typeof item.id === 'string'))
    } catch {
      return []
    }
  }

  function writeAll(comments: DevComment[]): void {
    const dir = dirname(filePath)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    const payload: StoreFileShape = { version: 1, comments }
    const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`
    writeFileSync(tmp, `${JSON.stringify(payload, null, 2)}\n`, 'utf-8')
    renameSync(tmp, filePath)
  }

  return {
    filePath,
    list(filter: ListFilter = {}): DevComment[] {
      const all = readAll()
      const normPath = filter.path ? normalizePath(filter.path) : null
      return all.filter((item) => {
        if (normPath && item.path !== normPath) return false
        if (filter.status && item.status !== filter.status) return false
        return true
      })
    },
    create(rawInput: unknown): DevComment {
      const input = validateCreateInput(rawInput)
      const now = new Date().toISOString()
      const record: DevComment = {
        id: randomUUID().slice(0, 8),
        path: input.path,
        quote: input.quote ?? '',
        prefix: input.prefix ?? '',
        suffix: input.suffix ?? '',
        heading: input.heading ?? '',
        body: input.body,
        kind: input.kind ?? 'rewrite',
        status: 'open',
        createdAt: now,
        updatedAt: now
      }
      const all = readAll()
      all.push(record)
      writeAll(all)
      return record
    },
    update(id: string, rawPatch: unknown): DevComment | null {
      const patch = validateUpdateInput(rawPatch)
      const all = readAll()
      const idx = all.findIndex((item) => item.id === id)
      if (idx === -1) return null
      const updated: DevComment = {
        ...all[idx]!,
        ...patch,
        updatedAt: new Date().toISOString()
      }
      all[idx] = updated
      writeAll(all)
      return updated
    },
    remove(id: string): boolean {
      const all = readAll()
      const next = all.filter((item) => item.id !== id)
      if (next.length === all.length) return false
      writeAll(next)
      return true
    },
    clear(filter: ListFilter = {}): number {
      const all = readAll()
      const normPath = filter.path ? normalizePath(filter.path) : null
      const kept = all.filter((item) => {
        const matchesPath = normPath ? item.path === normPath : true
        const matchesStatus = filter.status ? item.status === filter.status : true
        return !(matchesPath && matchesStatus)
      })
      const removed = all.length - kept.length
      if (removed > 0) writeAll(kept)
      return removed
    },
    replaceAll(rawComments: unknown): DevComment[] {
      if (!Array.isArray(rawComments)) {
        throw new Error('Comments snapshot must be an array')
      }
      const sanitized: DevComment[] = []
      for (const item of rawComments) {
        if (!item || typeof item !== 'object') continue
        const obj = item as Record<string, unknown>
        if (typeof obj.id !== 'string' || !obj.id.trim()) continue
        const kindRaw = typeof obj.kind === 'string' ? (obj.kind as CommentKind) : 'rewrite'
        const statusRaw = typeof obj.status === 'string' ? (obj.status as CommentStatus) : 'open'
        const now = new Date().toISOString()
        sanitized.push({
          id: obj.id.trim().slice(0, 64),
          path: normalizePath(typeof obj.path === 'string' ? obj.path : '/'),
          quote: clampString(obj.quote, 2000),
          prefix: clampString(obj.prefix, 120),
          suffix: clampString(obj.suffix, 120),
          heading: clampString(obj.heading, 240),
          body: clampString(obj.body, 8000),
          kind: VALID_KINDS.has(kindRaw) ? kindRaw : 'rewrite',
          status: VALID_STATUSES.has(statusRaw) ? statusRaw : 'open',
          createdAt: typeof obj.createdAt === 'string' ? obj.createdAt : now,
          updatedAt: typeof obj.updatedAt === 'string' ? obj.updatedAt : now
        })
      }
      writeAll(sanitized)
      return sanitized
    }
  }
}

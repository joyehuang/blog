import type { IncomingMessage, ServerResponse } from 'node:http'
import { resolve } from 'node:path'
import type { AstroIntegration } from 'astro'

import { createFileStore } from './store'
import type { CommentStatus } from './types'

const MAX_BODY_BYTES = 1024 * 1024

function sendJson(res: ServerResponse, status: number, data: unknown): void {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(data))
}

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolvePromise, rejectPromise) => {
    let size = 0
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        rejectPromise(new Error('Payload too large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf-8').trim()
      if (!text) {
        resolvePromise({})
        return
      }
      try {
        resolvePromise(JSON.parse(text))
      } catch {
        rejectPromise(new Error('Invalid JSON'))
      }
    })
    req.on('error', rejectPromise)
  })
}

/**
 * Dev-only Astro integration that exposes `/__dev/comments` on the Vite dev
 * server and stores annotations in `<repo>/.dev-comments.json` (gitignored).
 * Because it uses `astro:server:setup`, nothing is emitted in production builds.
 */
export function devCommentsIntegration(filename = '.dev-comments.json'): AstroIntegration {
  return {
    name: 'dev-inline-comments',
    hooks: {
      'astro:server:setup': ({ server }) => {
        const filePath = resolve(server.config.root, filename)
        const store = createFileStore(filePath)

        server.middlewares.use('/__dev/comments', async (req, res, next) => {
          const method = (req.method ?? 'GET').toUpperCase()
          const url = new URL(req.url ?? '/', 'http://localhost')
          const segments = url.pathname.split('/').filter(Boolean)
          const id = segments[0] ? decodeURIComponent(segments[0]) : null
          const pathParam = url.searchParams.get('path') ?? undefined
          const statusParam = url.searchParams.get('status')
          const status: CommentStatus | undefined =
            statusParam === 'open' || statusParam === 'resolved' ? statusParam : undefined

          try {
            if (method === 'GET' && !id) {
              const comments = store.list({ path: pathParam, status })
              sendJson(res, 200, { file: filename, comments })
              return
            }

            if (method === 'POST' && !id) {
              const body = await readJsonBody(req)
              const created = store.create(body)
              sendJson(res, 201, { comment: created })
              return
            }

            if (method === 'PATCH' && id) {
              const body = await readJsonBody(req)
              const updated = store.update(id, body)
              if (!updated) {
                sendJson(res, 404, { error: 'Comment not found' })
                return
              }
              sendJson(res, 200, { comment: updated })
              return
            }

            if (method === 'DELETE' && id) {
              const deleted = store.remove(id)
              if (!deleted) {
                sendJson(res, 404, { error: 'Comment not found' })
                return
              }
              sendJson(res, 200, { deleted: true, id })
              return
            }

            if (method === 'PUT' && !id) {
              const body = (await readJsonBody(req)) as { comments?: unknown }
              const comments = store.replaceAll(body?.comments)
              sendJson(res, 200, { comments })
              return
            }

            if (method === 'DELETE' && !id) {
              const removed = store.clear({ path: pathParam, status })
              sendJson(res, 200, { removed })
              return
            }

            next()
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Request failed'
            sendJson(res, 400, { error: message })
          }
        })
      }
    }
  }
}

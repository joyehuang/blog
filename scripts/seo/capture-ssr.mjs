// Audit the real Vercel server bundle for routes that were not prerendered.
import { access, mkdir, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const { default: handler } = await import(
  pathToFileURL(resolve('.vercel/output/functions/_render.func/dist/server/entry.mjs')).href
)
const server = createServer((req, res) => {
  req.headers.host = 'www.joyehuang.me'
  req.headers['x-forwarded-proto'] = 'https'
  handler(req, res).catch(() => {
    res.statusCode = 500
    res.end('render failed')
  })
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
try {
  for (const path of [
    '/about',
    '/contact',
    '/projects',
    '/links',
    '/tags',
    '/en/about',
    '/en/contact',
    '/en/projects',
    '/en/links',
    '/search',
    '/en/search'
  ]) {
    try {
      await access(join('.vercel/output/static', path, 'index.html'))
      continue
    } catch {}
    const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`)
    if (response.status !== 200) throw new Error(`SSR audit failed: ${path} (${response.status})`)
    const dir = join(process.argv[2] || 'artifacts/seo/baseline-ssr', path)
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, 'index.html'), await response.text())
  }
} finally {
  server.closeAllConnections()
  await new Promise((r) => server.close(r))
}

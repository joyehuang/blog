// Serves the production build locally — the same prerendered HTML, CSS and
// islands Vercel would ship — so changes can be reviewed without a Preview
// deployment. `astro preview` doesn't work with the Vercel adapter, so this
// serves `.vercel/output/static` directly.
//
//   bun run preview:local     # build, then serve on http://localhost:4323
//   bun run preview           # serve the last build only
//
// Only prerendered pages are served. On-demand routes (API endpoints, SSR
// pages) need `bun dev` or a real deployment.
import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { dirname, extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../.vercel/output/static')
const PORT = Number(process.env.PORT ?? 4323)

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm'
}

if (!existsSync(ROOT)) {
  console.error('[preview] no build at .vercel/output/static — run `bun run build` first')
  process.exit(1)
}

function resolveFile(pathname) {
  const safe = normalize(decodeURIComponent(pathname)).replace(/^[/\\]+/, '')
  if (safe.startsWith('..')) return null
  const base = join(ROOT, safe)
  for (const candidate of [base, join(base, 'index.html'), `${base}.html`]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate
  }
  return null
}

function send(res, file, status = 200) {
  res.writeHead(status, {
    'Content-Type': TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream'
  })
  createReadStream(file).pipe(res)
}

createServer((req, res) => {
  const { pathname } = new URL(req.url ?? '/', 'http://localhost')
  const file = resolveFile(pathname)
  if (file) return send(res, file)
  const notFound = resolveFile('/404.html')
  if (notFound) return send(res, notFound, 404)
  res.writeHead(404).end('Not found')
}).listen(PORT, () => {
  console.log(`[preview] production build at http://localhost:${PORT}`)
})

// Resolves the private `@joyehuang/jojo-web` package into vendor/jojo-web/
// (gitignored) before a build. This public repository never contains the
// package, its code or its artwork — only this loader and a sha256 pin.
//
// Sources, first match wins:
//   JOJO_WEB_DIR=/path/to/dist-web     local private build (copied)
//   JOJO_WEB_TGZ=/path/to/pkg.tgz      a packed tarball (sha256 must match the pin)
//   JOJO_WEB_TOKEN=<read-only token>   download the pinned release asset from the
//                                      private repo via the GitHub API; the token
//                                      goes in a header, never in a URL or file
//   vendor/jojo-web already at the pinned version
// Otherwise the site builds with Jojo switched off (the current site). That is
// the expected result for forks and unreviewed PRs, which get no token.
//
//   node scripts/jojo/jojo-web.mjs          # prepare, print status (no secrets)
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
export const ROOT = resolve(HERE, '../..')
export const VENDOR = join(ROOT, 'vendor/jojo-web')
const LOCK = JSON.parse(readFileSync(join(HERE, 'jojo-web.lock.json'), 'utf8'))

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex')

function installedVersion() {
  try {
    const pkg = JSON.parse(readFileSync(join(VENDOR, 'package.json'), 'utf8'))
    const ok = ['runtime.js', 'static.js'].every((f) => existsSync(join(VENDOR, f)))
    return ok ? pkg.version : null
  } catch {
    return null
  }
}

function extractTgz(buf) {
  const tmp = mkdtempSync(join(tmpdir(), 'jojo-web-'))
  try {
    const tgz = join(tmp, 'pkg.tgz')
    writeFileSync(tgz, buf)
    execFileSync('tar', ['-xzf', tgz, '-C', tmp])
    rmSync(VENDOR, { recursive: true, force: true })
    mkdirSync(dirname(VENDOR), { recursive: true })
    cpSync(join(tmp, 'package'), VENDOR, { recursive: true })
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
}

function verified(buf, allowUnpinned) {
  const got = sha256(buf)
  if (got === LOCK.sha256) return true
  if (allowUnpinned) return true
  throw new Error(
    `[jojo-web] tarball sha256 ${got.slice(0, 12)}… does not match the pin ${LOCK.sha256.slice(0, 12)}… ` +
      '(update scripts/jojo/jojo-web.lock.json deliberately, or set JOJO_WEB_ALLOW_UNPINNED=1 for local work)'
  )
}

async function download(token) {
  const api = `https://api.github.com/repos/${LOCK.repo}/releases/tags/${LOCK.tag}`
  const headers = {
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'joye-blog-jojo-web'
  }
  const rel = await fetch(api, { headers: { ...headers, Accept: 'application/vnd.github+json' } })
  if (!rel.ok) throw new Error(`[jojo-web] release lookup failed: HTTP ${rel.status}`)
  const asset = (await rel.json()).assets?.find((a) => a.name === LOCK.asset)
  if (!asset) throw new Error(`[jojo-web] asset ${LOCK.asset} not found on ${LOCK.tag}`)
  // The API answers with a redirect to a short-lived signed URL; fetch drops the
  // Authorization header when the redirect leaves api.github.com.
  const res = await fetch(asset.url, {
    headers: { ...headers, Accept: 'application/octet-stream' }
  })
  if (!res.ok) throw new Error(`[jojo-web] asset download failed: HTTP ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

/**
 * @returns {Promise<{ available: boolean, version: string | null, source: string }>}
 */
export async function prepareJojoWeb({ env = process.env, log = console.log } = {}) {
  const allowUnpinned = env.JOJO_WEB_ALLOW_UNPINNED === '1'
  try {
    if (env.JOJO_WEB_DIR) {
      const dir = resolve(env.JOJO_WEB_DIR)
      rmSync(VENDOR, { recursive: true, force: true })
      mkdirSync(dirname(VENDOR), { recursive: true })
      cpSync(dir, VENDOR, { recursive: true })
      return { available: !!installedVersion(), version: installedVersion(), source: 'dir' }
    }
    if (env.JOJO_WEB_TGZ) {
      const buf = readFileSync(resolve(env.JOJO_WEB_TGZ))
      verified(buf, allowUnpinned)
      extractTgz(buf)
      return { available: !!installedVersion(), version: installedVersion(), source: 'tgz' }
    }
    if (installedVersion() === LOCK.version) {
      return { available: true, version: LOCK.version, source: 'vendor' }
    }
    if (env.JOJO_WEB_TOKEN) {
      const buf = await download(env.JOJO_WEB_TOKEN)
      verified(buf, false)
      extractTgz(buf)
      return { available: !!installedVersion(), version: installedVersion(), source: 'release' }
    }
  } catch (err) {
    // A pinned package that fails to verify is a hard error: never build with
    // something other than what was reviewed.
    if (String(err?.message).includes('does not match the pin')) throw err
    log(`[jojo-web] unavailable: ${err?.message ?? err}`)
    return { available: false, version: null, source: 'error' }
  }
  return { available: false, version: null, source: 'none' }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  prepareJojoWeb().then((r) => console.log(JSON.stringify(r)))
}

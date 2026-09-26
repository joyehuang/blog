#!/usr/bin/env node
// Static page-weight inventory for a built site (dist/client or .vercel/output/static).
// For each page: HTML raw/gzip, every JS module it can load at startup (script src,
// modulepreload, astro-island component/renderer urls, followed through static and
// dynamic imports) with raw/gzip bytes, blocking stylesheets, and image requests
// referenced directly in the HTML. This is a *build inventory*, not a lab trace:
// it says what a page can load, not how fast it loads.
//
//   node scripts/jojo/measure-pages.mjs dist/client / /en /404 /about /blog/<slug>/post
import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { gzipSync } from 'node:zlib'

const [root = 'dist/client', ...pages] = process.argv.slice(2)
const ROOT = resolve(root)

const gz = (buf) => gzipSync(buf, { level: 9 }).length

function htmlFor(page) {
  const clean = page.replace(/^\/+|\/+$/g, '')
  const candidates = clean
    ? [join(ROOT, clean, 'index.html'), join(ROOT, `${clean}.html`)]
    : [join(ROOT, 'index.html')]
  return candidates.find((p) => existsSync(p))
}

function fileFor(url) {
  if (!url.startsWith('/')) return null
  const p = join(ROOT, url.split('?')[0])
  return existsSync(p) && statSync(p).isFile() ? p : null
}

const staticRe = /(?:import|export)\s*(?:[\w*{}\s,$]*?from\s*)?["'](\.{1,2}\/[^"']+\.js)["']/g
const dynamicRe = /import\(\s*["'](\.{1,2}\/[^"']+\.js)["']\s*\)/g

/** static import closure of the entries (= what loads at startup), plus what is only reachable via import() */
function walkJs(entryFiles) {
  const seen = new Map()
  const dynamicRoots = new Set()
  const visit = (roots, kind) => {
    const stack = [...roots]
    while (stack.length) {
      const f = stack.pop()
      if (seen.has(f)) continue
      const buf = readFileSync(f)
      seen.set(f, { raw: buf.length, gzip: gz(buf), load: kind })
      const src = buf.toString('utf8')
      for (const m of src.matchAll(staticRe)) {
        const next = resolve(dirname(f), m[1])
        if (existsSync(next)) stack.push(next)
      }
      for (const m of src.matchAll(dynamicRe)) {
        const next = resolve(dirname(f), m[1])
        if (existsSync(next)) dynamicRoots.add(next)
      }
    }
  }
  visit(entryFiles, 'initial')
  for (let guard = 0; guard < 8; guard++) {
    const pending = [...dynamicRoots].filter((f) => !seen.has(f))
    if (!pending.length) break
    visit(pending, 'on_demand')
  }
  return seen
}

const results = {}
for (const page of pages) {
  const file = htmlFor(page)
  if (!file) {
    results[page] = { error: 'not found' }
    continue
  }
  const html = readFileSync(file)
  const text = html.toString('utf8')
  const urls = new Set()
  for (const m of text.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)) urls.add(m[1])
  for (const m of text.matchAll(/<link[^>]*rel="modulepreload"[^>]*href="([^"]+)"/g)) urls.add(m[1])
  for (const m of text.matchAll(/(?:component-url|renderer-url)="([^"]+)"/g)) urls.add(m[1])
  const islands = [
    ...text.matchAll(/<astro-island[^>]*component-url="([^"]+)"[^>]*client="([^"]+)"/g)
  ].map((m) => ({ component: m[1].split('/').pop(), client: m[2] }))
  const entries = [...urls].map(fileFor).filter(Boolean)
  const js = walkJs(entries)
  const jsList = [...js.entries()].map(([f, s]) => ({ file: f.slice(ROOT.length), ...s }))
  const css = [...text.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)].map((m) => m[1])
  const imgs = [...new Set([...text.matchAll(/<img[^>]*\ssrc="([^"]+)"/g)].map((m) => m[1]))]
  const inlineScripts = [...text.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(
    (m) => m[1]
  )
  const ids = [...text.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])
  const dupIds = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))]
  results[page] = {
    html: { raw: html.length, gzip: gz(html) },
    inlineScriptBytes: inlineScripts.reduce((n, s) => n + Buffer.byteLength(s), 0),
    islands,
    js: {
      files: jsList.length,
      raw: jsList.reduce((n, f) => n + f.raw, 0),
      gzip: jsList.reduce((n, f) => n + f.gzip, 0),
      initial: {
        files: jsList.filter((f) => f.load === 'initial').length,
        raw: jsList.filter((f) => f.load === 'initial').reduce((n, f) => n + f.raw, 0),
        gzip: jsList.filter((f) => f.load === 'initial').reduce((n, f) => n + f.gzip, 0)
      },
      onDemand: {
        files: jsList.filter((f) => f.load === 'on_demand').length,
        gzip: jsList.filter((f) => f.load === 'on_demand').reduce((n, f) => n + f.gzip, 0)
      },
      list: jsList.sort((a, b) => b.gzip - a.gzip)
    },
    stylesheets: css,
    images: imgs.map((u) => {
      const f = fileFor(u)
      return { url: u, bytes: f ? statSync(f).size : null }
    }),
    duplicateIds: dupIds
  }
}
console.log(JSON.stringify({ root, measuredAt: new Date().toISOString(), results }, null, 2))

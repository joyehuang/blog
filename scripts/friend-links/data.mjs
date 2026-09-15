import { createHash } from 'node:crypto'
import { lookup } from 'node:dns/promises'
import { request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'
import ipaddr from 'ipaddr.js'
import { parseFragment } from 'parse5'

export const digest = (s) => createHash('sha256').update(s).digest('hex')
export const escapeHtml = (s) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  )
export function normalizeUrl(value) {
  if (typeof value !== 'string' || value.length > 2048 || /[\x00-\x20\x7f\\]/.test(value))
    throw Error('invalid URL')
  const u = new URL(value)
  if (
    !['http:', 'https:'].includes(u.protocol) ||
    u.username ||
    u.password ||
    u.port ||
    !u.hostname.includes('.')
  )
    throw Error('unsafe URL')
  if (/\.(localhost|local|internal|test|invalid)$/.test(u.hostname) || u.hostname.endsWith('.'))
    throw Error('unsafe hostname')
  // Do not support literal IP URLs. DNS results are independently validated and pinned below.
  if (ipaddr.isValid(u.hostname.replace(/^\[|\]$/g, ''))) throw Error('IP literal forbidden')
  u.hash = ''
  return u.href
}
export const urlKey = (value) => normalizeUrl(value).replace(/\/$/, '')
export function parseApplication(raw) {
  if (typeof raw !== 'string' || Buffer.byteLength(raw) > 16384) throw Error('comment too large')
  const walk = (node) => {
    if (node.nodeName === '#text') return node.value
    if (node.tagName === 'br') return '\n'
    if (node.tagName && !['p', 'div', 'a'].includes(node.tagName)) throw Error('unsupported markup')
    const text = (node.childNodes || []).map(walk).join('')
    if (node.tagName === 'a') {
      const hrefs = (node.attrs || []).filter((a) => a.name === 'href')
      if (hrefs.length !== 1 || normalizeUrl(hrefs[0].value) !== normalizeUrl(text.trim()))
        throw Error('ambiguous link')
    }
    return text + (['p', 'div'].includes(node.tagName) ? '\n' : '')
  }
  const lines = walk(
    parseFragment(raw, {
      onParseError: () => {
        throw Error('ambiguous HTML')
      }
    })
  )
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length !== 4) throw Error('exactly four fields required')
  const fields = {}
  for (const line of lines) {
    const m = /^(Name|Desc|Link|Avatar):\s*(.+)$/i.exec(line)
    if (!m || fields[m[1].toLowerCase()]) throw Error('duplicate or unknown field')
    fields[m[1].toLowerCase()] = m[2]
  }
  if (
    !fields.name ||
    !fields.desc ||
    !fields.link ||
    !fields.avatar ||
    fields.name.length > 120 ||
    fields.desc.length > 300 ||
    /[\x00-\x1f\x7f]/.test(fields.name + fields.desc)
  )
    throw Error('invalid fields')
  return {
    name: fields.name,
    intro: fields.desc,
    link: normalizeUrl(fields.link),
    avatar: normalizeUrl(fields.avatar)
  }
}
export function eligible(c) {
  return (
    c &&
    c.url === '/links' &&
    !c.pid &&
    !c.rid &&
    c.type !== 'administrator' &&
    c.status === 'approved' &&
    /^[A-Za-z0-9_-]{1,100}$/.test(String(c.objectId || ''))
  )
}
export function publicAddress(address) {
  try {
    return ipaddr.process(address).range() === 'unicast'
  } catch {
    return false
  }
}
export async function safeGet(
  value,
  { resolve = lookup, transport = pinnedRequest, maxBytes = 2097152, hops = 4 } = {}
) {
  let url = normalizeUrl(value)
  const deadline = Date.now() + 15000
  for (let hop = 0; hop <= hops; hop++) {
    const u = new URL(url)
    const remaining = deadline - Date.now()
    if (remaining <= 0) throw Error('fetch deadline')
    const addresses = await Promise.race([
      resolve(u.hostname, { all: true, verbatim: true }),
      new Promise((_, reject) => {
        const timer = setTimeout(() => reject(Error('DNS timeout')), remaining)
        timer.unref()
      })
    ])
    if (!addresses.length || addresses.some((a) => !publicAddress(a.address)))
      throw Error('non-public DNS')
    const response = await transport(u, addresses[0], maxBytes, Math.max(1, deadline - Date.now()))
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      if (!response.headers.location) throw Error('missing redirect')
      url = normalizeUrl(new URL(response.headers.location, u).href)
      continue
    }
    if (response.status !== 200) throw Error(`HTTP ${response.status}`)
    return { ...response, url }
  }
  throw Error('too many redirects')
}
export function pinnedRequest(u, address, maxBytes, timeout) {
  return new Promise((resolve, reject) => {
    const req = (u.protocol === 'https:' ? httpsRequest : httpRequest)(
      u,
      {
        agent: false,
        headers: { 'User-Agent': 'JoyeFriendLinks/1.0', 'Accept-Encoding': 'identity' },
        lookup: (_host, opts, cb) =>
          opts.all ? cb(null, [address]) : cb(null, address.address, address.family)
      },
      (res) => {
        let size = 0
        const chunks = []
        res.on('data', (chunk) => {
          size += chunk.length
          if (size > maxBytes) {
            const error = Error('response too large')
            reject(error)
            res.destroy(error)
            req.destroy(error)
          } else chunks.push(chunk)
        })
        res.on('error', (error) => {
          clearTimeout(timer)
          reject(error)
        })
        res.on('end', () => {
          clearTimeout(timer)
          resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) })
        })
      }
    )
    const timer = setTimeout(() => {
      const error = Error('fetch timeout')
      reject(error)
      req.destroy(error)
    }, timeout)
    req.on('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })
    req.end()
  })
}
export async function validateReachability(app, get = safeGet) {
  await get(app.link)
  const avatar = await get(app.avatar)
  if (!/^image\/[a-z0-9.+-]+(?:;|$)/i.test(avatar.headers['content-type'] || ''))
    throw Error('avatar response must be an image')
}
export function renderFiles(files, app, date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw Error('invalid date')
  const links = JSON.parse(files['public/links.json'])
  if (links.friends.some((g) => g.link_list.some((f) => urlKey(f.link) === urlKey(app.link))))
    return null
  const group = links.friends.find((g) => g.id_name === 'friend-links')
  if (!group) throw Error('links schema changed')
  group.link_list.push({ ...app, since: date, met: '互换友链', note: '通过友链申请添加。' })
  const marker = '\n    ],\n    // Yourself link info'
  const source = files['src/site.config.ts']
  if (source.split(marker).length !== 2) throw Error('logbook schema changed')
  const html = `添加 <a href="${escapeHtml(app.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(app.name)}</a>。`
  // JSON string literals are valid TypeScript; HTML is escaped before source encoding.
  const addition = `,\n      { date: ${JSON.stringify(date)}, content: ${JSON.stringify(html)} }`
  return {
    'public/links.json': JSON.stringify(links, null, 2),
    'src/site.config.ts': source.replace(marker, addition + marker)
  }
}

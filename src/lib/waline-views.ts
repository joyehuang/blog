/**
 * Throttled client for the self-hosted Waline counter API.
 *
 * Waline's own `pageviewCount` fires its increment `POST /api/article`
 * unconditionally — even on pages that render no counter element — and its
 * read-only branch issues a GET without checking that anything matched. Since
 * `ViewCounter` renders from `BaseLayout`, that meant a write plus a read
 * against Postgres on every page view across the whole site, which is what
 * drained the database's compute quota.
 *
 * This module talks to the same endpoints, but:
 * - counts a visit at most once per path per browser per day,
 * - reads every visible counter in a single batched request,
 * - reuses a fetched count for a few minutes within a tab,
 * - waits for the visit to settle, so bounces and background tabs never
 *   reach the database at all.
 */

/** How long a browser is remembered as having already counted a path. */
const WRITE_TTL = 24 * 60 * 60 * 1000
/** How long a fetched count is reused within a tab before refetching. */
const READ_TTL = 5 * 60 * 1000
/** Settle delay before touching the network, so quick bounces cost nothing. */
const SETTLE_MS = 1500

/** `/en/foo` and `/foo` are the same page, so they share one counter. */
export const stripEn = (path: string) => path.replace(/^\/en(?=\/|$)/, '') || '/'

const storage = (kind: 'local' | 'session'): Storage | null => {
  try {
    const store = kind === 'local' ? window.localStorage : window.sessionStorage
    const probe = '__waline_probe__'
    store.setItem(probe, '1')
    store.removeItem(probe)
    return store
  } catch {
    // Private mode or blocked cookies — fall back to counting every visit.
    return null
  }
}

const cacheGet = (store: Storage | null, key: string, ttl: number): number | null => {
  if (!store) return null
  try {
    const raw = store.getItem(key)
    if (!raw) return null
    const { n, t } = JSON.parse(raw) as { n?: number; t?: number }
    if (typeof n !== 'number' || typeof t !== 'number') return null
    return Date.now() - t < ttl ? n : null
  } catch {
    return null
  }
}

const cacheSet = (store: Storage | null, key: string, n: number) => {
  if (!store) return
  try {
    store.setItem(key, JSON.stringify({ n, t: Date.now() }))
  } catch {
    // Storage full — the counter still works, it just refetches next time.
  }
}

const apiBase = (server: string) => `${server.replace(/\/?$/, '/')}api/`

const unwrap = (payload: unknown, label: string): unknown => {
  if (payload && typeof payload === 'object' && 'errno' in payload) {
    const { errno, errmsg } = payload as { errno?: number; errmsg?: string }
    if (errno) throw new Error(`${label} failed with ${errno}: ${errmsg ?? ''}`)
  }
  return (payload as { data?: unknown } | null)?.data
}

const fetchViews = async (server: string, paths: string[], lang: string, signal: AbortSignal) => {
  const url = `${apiBase(server)}article?path=${encodeURIComponent(paths.join(','))}&type=time&lang=${encodeURIComponent(lang)}`
  const data = unwrap(await (await fetch(url, { signal })).json(), 'Get counter')
  return (Array.isArray(data) ? data : []).map((item) => Number((item as { time?: number })?.time))
}

const incrementView = async (server: string, path: string, lang: string) => {
  const url = `${apiBase(server)}article?lang=${encodeURIComponent(lang)}`
  const data = unwrap(
    await (
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, type: 'time', action: 'inc' })
      })
    ).json(),
    'Update counter'
  )
  const first = Array.isArray(data) ? data[0] : data
  const n = Number((first as { time?: number })?.time)
  return Number.isFinite(n) ? n : null
}

const fetchComments = async (
  server: string,
  paths: string[],
  lang: string,
  signal: AbortSignal
) => {
  const decoded = paths.map((path) => {
    try {
      return decodeURI(path)
    } catch {
      return path
    }
  })
  const url = `${apiBase(server)}comment?type=count&url=${encodeURIComponent(decoded.join(','))}&lang=${encodeURIComponent(lang)}`
  const data = unwrap(await (await fetch(url, { signal })).json(), 'Get comment count')
  // Waline answers with a bare number when a single path is requested.
  return (Array.isArray(data) ? data : [data]).map(Number)
}

const groupBy = (map: Map<string, HTMLElement[]>, path: string, el: HTMLElement) => {
  const group = map.get(path)
  if (group) group.push(el)
  else map.set(path, [el])
}

const paint = (els: HTMLElement[], n: number) => {
  for (const el of els) el.textContent = String(n)
}

/**
 * Fill every counter element on the page, doing as little database work as the
 * page actually needs. Safe to call on pages that render no counters at all.
 */
export const mountCounters = (serverURL: string) => {
  if (!serverURL) return

  const lang = document.documentElement.lang || navigator.language || 'en'
  const here = stripEn(window.location.pathname)
  const session = storage('session')
  const local = storage('local')

  const viewEls = [
    ...document.querySelectorAll<HTMLElement>('.waline-pageview-count, .waline-pageview-readonly')
  ]
  const commentEls = [...document.querySelectorAll<HTMLElement>('.waline-comment-count')]

  const pathOf = (el: HTMLElement) => {
    const raw = el.dataset.path
    const path = raw && raw.length > 0 ? stripEn(raw) : here
    el.dataset.path = path
    return path
  }

  const writeKey = `waline:hit:${here}`
  const shouldCount = cacheGet(local, writeKey, WRITE_TTL) === null

  // Elements showing the current path take their value from the increment
  // itself, so they never need a separate read.
  const writeTargets: HTMLElement[] = []
  const pendingViews = new Map<string, HTMLElement[]>()
  for (const el of viewEls) {
    const path = pathOf(el)
    if (shouldCount && path === here) {
      writeTargets.push(el)
      continue
    }
    const cached = cacheGet(session, `waline:v:${path}`, READ_TTL)
    if (cached !== null) {
      el.textContent = String(cached)
      continue
    }
    groupBy(pendingViews, path, el)
  }

  const pendingComments = new Map<string, HTMLElement[]>()
  for (const el of commentEls) {
    const path = pathOf(el)
    const cached = cacheGet(session, `waline:c:${path}`, READ_TTL)
    if (cached !== null) {
      el.textContent = String(cached)
      continue
    }
    groupBy(pendingComments, path, el)
  }

  const controller = new AbortController()
  const jobs: Array<() => Promise<void>> = []

  if (shouldCount) {
    jobs.push(async () => {
      const n = await incrementView(serverURL, here, lang)
      // Only remember the visit once the write actually landed, so an outage
      // does not silently swallow a day of counts.
      cacheSet(local, writeKey, 1)
      if (n === null) return
      cacheSet(session, `waline:v:${here}`, n)
      paint(writeTargets, n)
    })
  }

  if (pendingViews.size > 0) {
    jobs.push(async () => {
      const paths = [...pendingViews.keys()]
      const counts = await fetchViews(serverURL, paths, lang, controller.signal)
      paths.forEach((path, i) => {
        const n = counts[i]
        if (!Number.isFinite(n)) return
        cacheSet(session, `waline:v:${path}`, n)
        paint(pendingViews.get(path) ?? [], n)
      })
    })
  }

  if (pendingComments.size > 0) {
    jobs.push(async () => {
      const paths = [...pendingComments.keys()]
      const counts = await fetchComments(serverURL, paths, lang, controller.signal)
      paths.forEach((path, i) => {
        const n = counts[i]
        if (!Number.isFinite(n)) return
        cacheSet(session, `waline:c:${path}`, n)
        paint(pendingComments.get(path) ?? [], n)
      })
    })
  }

  // Everything was served from cache and this visit is already counted.
  if (jobs.length === 0) return

  let timer = 0

  const cleanup = () => {
    window.clearTimeout(timer)
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('pagehide', onLeave)
  }

  const fire = () => {
    cleanup()
    for (const job of jobs) {
      job().catch((error: unknown) => {
        if (error instanceof Error && error.name === 'AbortError') return
        console.error(error)
      })
    }
  }

  const arm = () => {
    window.clearTimeout(timer)
    timer = window.setTimeout(() => {
      if (document.visibilityState === 'visible') fire()
    }, SETTLE_MS)
  }

  // A tab restored in the background re-arms once it is actually looked at.
  function onVisibility() {
    if (document.visibilityState === 'visible') arm()
  }

  // Left before settling — this visit costs the database nothing.
  function onLeave() {
    cleanup()
    controller.abort()
  }

  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('pagehide', onLeave)
  arm()
}

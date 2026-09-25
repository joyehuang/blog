/**
 * Fuzzy route matching behind the 404 page's `command not found` easter egg.
 *
 * Deliberately pure and dependency-free: the route index is shaped at build
 * time (see `site-routes.ts`, which does reach for `astro:content`) but the
 * scoring runs in the browser, because a prerendered 404 only learns which
 * path was requested from `location.pathname`.
 */

/** One real, reachable page. Kept to two fields so the inlined index stays small. */
export type SiteRoute = {
  /** Absolute site path, e.g. `/blog/20260517---agentonboardingguide`. */
  url: string
  /** Human title shown beside the suggestion. */
  title: string
}

export type Suggestion = SiteRoute & { score: number }

/** Everything that is not a latin word char or a CJK ideograph is a separator. */
const SEPARATORS = /[^a-z0-9\u4e00-\u9fff]+/g

export function normalizePath(pathname: string): string {
  let path = pathname
  try {
    path = decodeURI(pathname)
  } catch {
    // malformed percent-escapes — score the raw string rather than throwing
  }
  path = path.toLowerCase().replace(/\/+$/, '')
  return path || '/'
}

export function sectionOf(url: string): string {
  const parts = url.split('/').filter(Boolean)
  return (parts[0] === 'en' ? parts[1] : parts[0]) ?? ''
}

export function langOf(url: string): 'zh' | 'en' {
  return url === '/en' || url.startsWith('/en/') ? 'en' : 'zh'
}

function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .split(SEPARATORS)
    .filter((token) => token.length > 1)
}

/**
 * Padded character trigrams. Padding makes short strings comparable and
 * gives the head/tail of a slug a little extra weight.
 */
function trigrams(input: string): Set<string> {
  const flat = ` ${input.toLowerCase().replace(SEPARATORS, ' ').trim()} `
  const grams = new Set<string>()
  for (let i = 0; i < flat.length - 2; i += 1) grams.add(flat.slice(i, i + 3))
  return grams
}

/** Sørensen–Dice coefficient over two trigram sets. */
function dice(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let shared = 0
  for (const gram of a) if (b.has(gram)) shared += 1
  return (2 * shared) / (a.size + b.size)
}

/**
 * How many of the requested path's words show up in the candidate. Partial
 * (substring either way) counts half, so `agent` still pulls in
 * `agentonboardingguide`.
 */
function tokenOverlap(asked: string[], candidate: string[]): number {
  if (asked.length === 0 || candidate.length === 0) return 0
  const exact = new Set(candidate)
  let hits = 0
  for (const token of asked) {
    if (exact.has(token)) hits += 1
    else if (candidate.some((other) => other.includes(token) || token.includes(other))) hits += 0.5
  }
  return hits / asked.length
}

export type SuggestOptions = {
  limit?: number
  /** Below this, a match is noise — better to fall back to `ls /`. */
  minScore?: number
}

/**
 * Rank real pages against a path that does not exist. Trigram similarity does
 * the heavy lifting (it survives typos and truncation); word overlap, staying
 * in the same section, and matching the visitor's locale break ties.
 */
export function suggestRoutes(
  pathname: string,
  routes: SiteRoute[],
  { limit = 3, minScore = 0.26 }: SuggestOptions = {}
): Suggestion[] {
  const path = normalizePath(pathname)
  const askedLang = langOf(path)
  const askedSection = sectionOf(path)
  const pathGrams = trigrams(path)
  const pathTokens = tokenize(path)

  return routes
    .map<Suggestion>((route) => {
      const similarity = Math.max(
        dice(pathGrams, trigrams(route.url)),
        dice(pathGrams, trigrams(route.title))
      )
      const overlap = tokenOverlap(pathTokens, tokenize(`${route.url} ${route.title}`))
      const sameSection = askedSection !== '' && sectionOf(route.url) === askedSection ? 1 : 0
      const sameLang = langOf(route.url) === askedLang ? 1 : 0
      const score = 0.5 * similarity + 0.3 * overlap + 0.14 * sameSection + 0.06 * sameLang
      return { ...route, score }
    })
    .filter((suggestion) => suggestion.score >= minScore)
    .sort((a, b) => b.score - a.score || a.url.localeCompare(b.url))
    .slice(0, limit)
}

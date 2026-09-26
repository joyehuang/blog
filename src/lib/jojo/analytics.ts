import { trackSiteEvent, type AnalyticsProperties } from '@/lib/analytics'

/**
 * Jojo events (see ANALYTICS.md). Each (event, surface, action) fires at most
 * once per page view: these answer "did visitors do this at all", not "how
 * many times" — no counts, no timings beyond the intro's duration_ms, nothing
 * re-sent on pagehide.
 */
const sent = new Set<string>()

export function trackOnce(event: string, props: AnalyticsProperties, send = trackSiteEvent) {
  const key = `${event}|${props.surface ?? ''}|${props.action ?? ''}`
  if (sent.has(key)) return false
  sent.add(key)
  try {
    send(event, props)
  } catch {
    // analytics must never break the page
  }
  return true
}

/** test hook */
export function resetTrackOnce() {
  sent.clear()
}

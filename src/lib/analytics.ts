import { track } from '@vercel/analytics'

type AnalyticsValue = string | number | boolean | null
export type AnalyticsProperties = Record<string, AnalyticsValue>

export function getLocale(pathname = globalThis.location?.pathname ?? '/'): 'zh' | 'en' {
  return pathname === '/en' || pathname.startsWith('/en/') ? 'en' : 'zh'
}

export function getDestinationType(href: string | null): string | null {
  if (!href) return null

  const url = new URL(href, globalThis.location?.origin ?? 'https://www.joyehuang.me')
  if (url.protocol === 'mailto:') return 'mailto'
  if (url.hostname === 'github.com') return 'github'
  if (url.hostname.includes('bilibili.com')) return 'video'
  if (url.hostname.includes('feishu.cn')) return 'doc'
  if (url.origin === globalThis.location?.origin) return 'internal'
  return 'external'
}

export function normalizeHref(element: HTMLElement): string | null {
  if (element instanceof HTMLAnchorElement) return element.href
  return element.dataset.analyticsHref ?? null
}

function normalizeValue(value: string): AnalyticsValue {
  if (value === 'true') return true
  if (value === 'false') return false
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value)
  return value
}

export function propertiesFromDataset(element: HTMLElement): AnalyticsProperties {
  const properties: AnalyticsProperties = {}

  for (const [key, value] of Object.entries(element.dataset)) {
    if (!key.startsWith('analytics') || key === 'analyticsEvent' || key === 'analyticsRevealEvent')
      continue
    const property = key
      .replace(/^analytics/, '')
      .replace(/^[A-Z]/, (match) => match.toLowerCase())
      .replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`)

    if (!property) continue
    properties[property] = value === undefined ? null : normalizeValue(value)
  }

  return properties
}

export function trackSiteEvent(eventName: string, properties: AnalyticsProperties = {}) {
  const page = globalThis.location?.pathname ?? '/'
  const href = typeof properties.href === 'string' ? properties.href : null

  track(eventName, {
    locale: properties.locale ?? getLocale(page),
    page: properties.page ?? page,
    ...properties,
    destination_type: properties.destination_type ?? getDestinationType(href)
  })
}

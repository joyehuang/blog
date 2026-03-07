import { DEFAULT_LOCALE, type Locale } from './locales'

export function isEnglishPath(pathname: string) {
  return pathname === '/en' || pathname.startsWith('/en/')
}

export function getLocaleFromPath(pathname: string): Locale {
  return isEnglishPath(pathname) ? 'en' : DEFAULT_LOCALE
}

export function stripEnglishPrefix(pathname: string) {
  if (!isEnglishPath(pathname)) return pathname
  const stripped = pathname.replace(/^\/en/, '')
  return stripped.length === 0 ? '/' : stripped
}

export function toEnglishPath(pathname: string) {
  if (isEnglishPath(pathname)) return pathname
  return pathname === '/' ? '/en' : `/en${pathname}`
}

export function toChinesePath(pathname: string) {
  return stripEnglishPrefix(pathname)
}

export function toLocalePath(pathname: string, locale: Locale) {
  return locale === 'en' ? toEnglishPath(pathname) : toChinesePath(pathname)
}

export function getAlternatePath(pathname: string, locale: Locale) {
  return locale === 'en' ? toChinesePath(pathname) : toEnglishPath(pathname)
}

export function getPreferredLocaleFromHeader(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE
  const normalized = acceptLanguage.toLowerCase()
  return normalized.includes('en') ? 'en' : DEFAULT_LOCALE
}

export function shouldBypassLocaleRedirect(pathname: string) {
  if (
    pathname.startsWith('/_astro') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/fonts') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/scripts') ||
    pathname.startsWith('/styles') ||
    pathname.startsWith('/icons')
  ) {
    return true
  }

  // Static files
  if (pathname.includes('.')) return true

  const checkPath = stripEnglishPrefix(pathname)
  return !(
    checkPath === '/' ||
    checkPath.startsWith('/about') ||
    checkPath.startsWith('/archives') ||
    checkPath.startsWith('/blog') ||
    checkPath.startsWith('/links') ||
    checkPath.startsWith('/papers') ||
    checkPath.startsWith('/projects') ||
    checkPath.startsWith('/search') ||
    checkPath.startsWith('/tags') ||
    checkPath.startsWith('/terms')
  )
}

export function isCrawlerUserAgent(userAgent: string | null) {
  if (!userAgent) return false
  const ua = userAgent.toLowerCase()
  return (
    ua.includes('googlebot') ||
    ua.includes('bingbot') ||
    ua.includes('duckduckbot') ||
    ua.includes('baiduspider') ||
    ua.includes('yandexbot') ||
    ua.includes('sogou') ||
    ua.includes('gptbot') ||
    ua.includes('claudebot') ||
    ua.includes('facebookexternalhit') ||
    ua.includes('slurp')
  )
}

import { getRelativeLocaleUrl } from 'astro:i18n'

import { type Locale, isLocale, normalizeLocale } from './config'

function ensureLeadingSlash(path: string) {
  return path.startsWith('/') ? path : `/${path}`
}

function trimSlashes(path: string) {
  return path.replace(/^\/+|\/+$/g, '')
}

export function hasLocalePrefix(pathname: string) {
  const firstSegment = trimSlashes(pathname).split('/')[0]
  return isLocale(firstSegment)
}

export function stripLocalePrefix(pathname: string) {
  const segments = trimSlashes(pathname).split('/').filter(Boolean)
  if (segments.length === 0) return '/'
  if (isLocale(segments[0])) segments.shift()

  return segments.length > 0 ? `/${segments.join('/')}` : '/'
}

export function getLocalePath(locale: Locale, pathname = '/') {
  const strippedPath = trimSlashes(stripLocalePrefix(pathname))
  return strippedPath ? getRelativeLocaleUrl(locale, strippedPath) : getRelativeLocaleUrl(locale)
}

export function getLocalizedHref(currentPathname: string, href: string, locale: Locale) {
  if (!href.startsWith('/')) return href
  if (!hasLocalePrefix(currentPathname)) return href
  return getLocalePath(locale, href)
}

export function getLocaleSwitchHref(currentPathname: string, targetLocale: Locale) {
  const pathname = hasLocalePrefix(currentPathname)
    ? stripLocalePrefix(currentPathname)
    : ensureLeadingSlash(currentPathname)

  return getLocalePath(targetLocale, pathname)
}

export function getCurrentLocale(pathname: string, currentLocale?: string | null) {
  if (currentLocale) return normalizeLocale(currentLocale)

  const firstSegment = trimSlashes(pathname).split('/')[0]
  return normalizeLocale(firstSegment)
}

import { defaultLocale, localeMeta, type Locale, supportedLocales } from './config'
import { getUiCopy, type UiCopy } from './ui'

function normalizePathname(pathname: string) {
  if (!pathname) return '/'
  if (pathname === '/') return pathname
  return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname
}

function splitHrefParts(href: string) {
  const hashIndex = href.indexOf('#')
  const queryIndex = href.indexOf('?')
  const splitIndex =
    hashIndex === -1 ? queryIndex : queryIndex === -1 ? hashIndex : Math.min(hashIndex, queryIndex)

  if (splitIndex === -1) {
    return { pathname: href, suffix: '' }
  }

  return {
    pathname: href.slice(0, splitIndex),
    suffix: href.slice(splitIndex)
  }
}

export { defaultLocale, getUiCopy, localeMeta, supportedLocales, type Locale, type UiCopy }

export function isLocale(value: string): value is Locale {
  return supportedLocales.includes(value as Locale)
}

export function getLocaleFromPathname(pathname: string): Locale {
  const normalizedPathname = normalizePathname(pathname)
  if (normalizedPathname === '/en' || normalizedPathname.startsWith('/en/')) {
    return 'en'
  }

  return defaultLocale
}

export function getLocaleMeta(locale: Locale) {
  return localeMeta[locale]
}

export function stripLocalePrefix(pathname: string) {
  const normalizedPathname = normalizePathname(pathname)

  if (normalizedPathname === '/en') {
    return '/'
  }

  if (normalizedPathname.startsWith('/en/')) {
    return normalizedPathname.slice('/en'.length)
  }

  return normalizedPathname
}

export function localizeHref(locale: Locale, href: string) {
  if (!href.startsWith('/')) {
    return href
  }

  const { pathname, suffix } = splitHrefParts(href)
  const strippedPath = stripLocalePrefix(pathname)

  if (locale === defaultLocale) {
    return `${strippedPath}${suffix}`
  }

  if (strippedPath === '/') {
    return `/${locale}${suffix}`
  }

  return `/${locale}${strippedPath}${suffix}`
}

export function getRssPath(locale: Locale) {
  return localizeHref(locale, '/rss.xml')
}

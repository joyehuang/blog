import type { MiddlewareHandler } from 'astro'

import {
  getLocaleFromPath,
  getPreferredLocaleFromHeader,
  isCrawlerUserAgent,
  shouldBypassLocaleRedirect,
  toLocalePath
} from './i18n/routing'

export const onRequest: MiddlewareHandler = async ({ request, url, redirect, isPrerendered }, next) => {
  if (isPrerendered) return next()

  const { pathname, search } = url
  if (shouldBypassLocaleRedirect(pathname)) return next()

  const userAgent = request.headers.get('user-agent')
  if (isCrawlerUserAgent(userAgent)) return next()

  const currentLocale = getLocaleFromPath(pathname)
  const preferredLocale = getPreferredLocaleFromHeader(request.headers.get('accept-language'))
  if (preferredLocale === currentLocale) return next()

  const targetPath = toLocalePath(pathname, preferredLocale)
  if (targetPath === pathname) return next()

  return redirect(`${targetPath}${search}`, 307)
}

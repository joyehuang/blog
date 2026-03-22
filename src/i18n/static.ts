import { DEFAULT_LOCALE, LOCALES, type Locale, normalizeLocale } from './config'

export function getLocaleStaticPaths() {
  return LOCALES.map((locale) => ({
    params: { locale }
  }))
}

export function getLocaleFromParam(locale: string | number | undefined) {
  return normalizeLocale(String(locale ?? DEFAULT_LOCALE)) as Locale
}

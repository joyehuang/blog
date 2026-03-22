export const LOCALES = ['zh', 'en'] as const

export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'zh'

export const LOCALE_LABELS: Record<Locale, string> = {
  zh: '简体中文',
  en: 'English'
}

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && LOCALES.includes(value as Locale)
}

export function normalizeLocale(value: string | undefined | null): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE
}

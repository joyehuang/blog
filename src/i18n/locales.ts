export const SUPPORTED_LOCALES = ['zh', 'en'] as const

export type Locale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'zh'

export const LOCALE_META: Record<Locale, { htmlLang: string; ogLocale: string; label: string }> = {
  zh: {
    htmlLang: 'zh-CN',
    ogLocale: 'zh_CN',
    label: '中文'
  },
  en: {
    htmlLang: 'en',
    ogLocale: 'en_US',
    label: 'English'
  }
}

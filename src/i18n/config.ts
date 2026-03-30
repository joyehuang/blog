export const supportedLocales = ['zh', 'en'] as const

export type Locale = (typeof supportedLocales)[number]

export const defaultLocale: Locale = 'zh'

export const localeMeta = {
  en: {
    htmlLang: 'en',
    label: 'English',
    ogLocale: 'en_US'
  },
  zh: {
    htmlLang: 'zh-CN',
    label: '简体中文',
    ogLocale: 'zh_CN'
  }
} as const

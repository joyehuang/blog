import type { Locale } from './locales'

export const messages = {
  zh: {
    switchLanguage: 'English',
    currentLanguage: '当前：中文'
  },
  en: {
    switchLanguage: '中文',
    currentLanguage: 'Current: English'
  }
} as const satisfies Record<Locale, Record<string, string>>

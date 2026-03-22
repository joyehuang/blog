import { type Locale } from './config'
import { getThemeConfig } from '../site.config'

export function formatDateForLocale(
  date: string | number | Date,
  locale: Locale,
  options?: Intl.DateTimeFormatOptions
) {
  const localeConfig = getThemeConfig(locale).locale

  return new Date(date).toLocaleDateString(localeConfig.dateLocale, {
    ...(localeConfig.dateOptions as Intl.DateTimeFormatOptions),
    ...options
  })
}

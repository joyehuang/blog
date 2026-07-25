import type { Lang } from './ui'

/**
 * Date locale per site language.
 *
 * astro-pure's `getFormattedDate` is hardwired to the single
 * `locale.dateLocale` in `site.config.ts` (`zh-CN`), so every English page that
 * used it rendered dates like `2026年5月23日`. Anything under `/en` formats its
 * dates through this module instead.
 */
export const dateLocales = {
  zh: 'zh-CN',
  en: 'en-US'
} as const satisfies Record<Lang, string>

/** Mirrors `locale.dateOptions` in `site.config.ts`, so both languages agree on granularity. */
const defaultDateOptions: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  year: 'numeric'
}

/** `2026年5月23日` for `zh`, `May 23, 2026` for `en`. */
export function formatDate(
  date: string | number | Date,
  lang: Lang,
  options?: Intl.DateTimeFormatOptions
) {
  return new Date(date).toLocaleDateString(dateLocales[lang], {
    ...defaultDateOptions,
    ...options
  })
}

import { DEFAULT_LOCALE, getLocalePath } from '@/i18n'

export const GET = () =>
  new Response(null, {
    status: 308,
    headers: {
      Location: getLocalePath(DEFAULT_LOCALE, '/rss.xml')
    }
  })

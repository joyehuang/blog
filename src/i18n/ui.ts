export const languages = {
  zh: '中',
  en: 'EN'
} as const

export const defaultLang = 'zh' as const

export type Lang = keyof typeof languages

export const ui = {
  zh: {
    'nav.blog': 'Blog',
    'nav.notes': 'Notes',
    'nav.projects': 'Projects',
    'nav.links': 'Links',
    'nav.about': 'About',
    'nav.search': 'Search',
    'nav.toggleMenu': 'Menu',
    'nav.toggleDarkMode': 'Dark Theme',
    'nav.toggleLang': '切换语言',
    'notice.translating':
      '网站界面已提供英文版，但大部分博客与笔记仍为中文，翻译正在进行中。',
    'home.title': '首页'
  },
  en: {
    'nav.blog': 'Blog',
    'nav.notes': 'Notes',
    'nav.projects': 'Projects',
    'nav.links': 'Links',
    'nav.about': 'About',
    'nav.search': 'Search',
    'nav.toggleMenu': 'Menu',
    'nav.toggleDarkMode': 'Dark Theme',
    'nav.toggleLang': 'Switch language',
    'notice.translating':
      "The site's interface is available in English, but most posts and notes are still in Chinese — translation is a work in progress.",
    'home.title': 'Home'
  }
} as const satisfies Record<Lang, Record<string, string>>

export function getLangFromUrl(url: URL | string): Lang {
  const pathname = typeof url === 'string' ? url : url.pathname
  const first = pathname.split('/').filter(Boolean)[0]
  if (first === 'en') return 'en'
  return defaultLang
}

export function useTranslations(lang: Lang) {
  return function t(key: keyof (typeof ui)[typeof defaultLang]) {
    return ui[lang][key] ?? ui[defaultLang][key]
  }
}

export function stripLangPrefix(pathname: string): string {
  if (pathname === '/en' || pathname === '/en/') return '/'
  if (pathname.startsWith('/en/')) return pathname.slice(3)
  return pathname
}

export function withLangPrefix(pathname: string, lang: Lang): string {
  const bare = stripLangPrefix(pathname)
  if (lang === defaultLang) return bare
  if (bare === '/') return '/en'
  return `/en${bare}`
}

export function localizedPath(path: string, lang: Lang): string {
  if (lang === defaultLang) return path
  if (path === '/') return '/en'
  return `/en${path.startsWith('/') ? path : `/${path}`}`
}

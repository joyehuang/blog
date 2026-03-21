import type { CardListData, Config, IntegrationUserConfig, ThemeUserConfig } from 'astro-pure/types'

import { DEFAULT_LOCALE, type Locale } from './i18n/config.ts'

const COMMON_SITE = {
  author: 'Joye',
  favicon: '/favicon/favicon.ico',
  logo: {
    src: 'src/assets/avatar.png',
    alt: 'Avatar'
  },
  titleDelimiter: '•',
  prerender: true,
  npmCDN: 'https://cdn.jsdelivr.net/npm',
  head: [],
  customCss: [],
  content: {
    externalLinksContent: ' ↗',
    blogPageSize: 8,
    externalLinkArrow: true,
    share: ['weibo', 'x', 'bluesky']
  }
} satisfies Partial<ThemeUserConfig>

const SITE_COPY: Record<
  Locale,
  {
    title: string
    description: string
    locale: ThemeUserConfig['locale']
    menu: { title: string; link: string }[]
    footerSitePolicy: string
    termsTitle: string
    termsList: { title: string; link: string }[]
    applyTipLabels: { name: string; val: string }[]
    walinePlaceholder: string
  }
> = {
  zh: {
    title: 'Joye 个人博客',
    description: 'Build fast, learn faster',
    locale: {
      lang: 'zh-CN',
      attrs: 'zh_CN',
      dateLocale: 'zh-CN',
      dateOptions: {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }
    },
    menu: [
      { title: '博客', link: '/blog' },
      { title: '归档', link: '/archive' },
      { title: '项目', link: '/projects' },
      { title: '友链', link: '/links' },
      { title: '关于', link: '/about' }
    ],
    footerSitePolicy: '站点政策',
    termsTitle: '站点政策',
    termsList: [
      { title: '隐私政策', link: '/terms/privacy-policy' },
      { title: '条款与条件', link: '/terms/terms-and-conditions' },
      { title: '版权声明', link: '/terms/copyright' },
      { title: '免责声明', link: '/terms/disclaimer' }
    ],
    applyTipLabels: [
      { name: '名称', val: 'Joye 个人博客' },
      { name: '简介', val: 'Build fast, learn faster' },
      { name: '链接', val: 'https://joyehuang.me/' },
      { name: '头像', val: 'https://joyehuang.me/favicon/favicon.ico' }
    ],
    walinePlaceholder: '欢迎留言。（填写邮箱可收到回复，无需登录）'
  },
  en: {
    title: 'Joye Personal Blog',
    description: 'Build fast, learn faster',
    locale: {
      lang: 'en',
      attrs: 'en_US',
      dateLocale: 'en-US',
      dateOptions: {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }
    },
    menu: [
      { title: 'Blog', link: '/blog' },
      { title: 'Archive', link: '/archive' },
      { title: 'Projects', link: '/projects' },
      { title: 'Links', link: '/links' },
      { title: 'About', link: '/about' }
    ],
    footerSitePolicy: 'Site Policy',
    termsTitle: 'Site Policy',
    termsList: [
      { title: 'Privacy Policy', link: '/terms/privacy-policy' },
      { title: 'Terms and Conditions', link: '/terms/terms-and-conditions' },
      { title: 'Copyright', link: '/terms/copyright' },
      { title: 'Disclaimer', link: '/terms/disclaimer' }
    ],
    applyTipLabels: [
      { name: 'Name', val: 'Joye Personal Blog' },
      { name: 'Description', val: 'Build fast, learn faster' },
      { name: 'Link', val: 'https://joyehuang.me/' },
      { name: 'Avatar', val: 'https://joyehuang.me/favicon/favicon.ico' }
    ],
    walinePlaceholder: 'Welcome to comment. Leave an email if you want reply notifications.'
  }
}

export function getThemeConfig(locale: Locale = DEFAULT_LOCALE): ThemeUserConfig {
  const copy = SITE_COPY[locale]

  return {
    ...COMMON_SITE,
    title: copy.title,
    author: COMMON_SITE.author,
    description: copy.description,
    favicon: COMMON_SITE.favicon,
    locale: copy.locale,
    logo: COMMON_SITE.logo,
    titleDelimiter: COMMON_SITE.titleDelimiter,
    prerender: COMMON_SITE.prerender,
    npmCDN: COMMON_SITE.npmCDN,
    head: COMMON_SITE.head,
    customCss: COMMON_SITE.customCss,
    header: {
      menu: copy.menu
    },
    footer: {
      links: [
        {
          title: copy.footerSitePolicy,
          link: '/terms/list',
          pos: 2
        }
      ],
      credits: true,
      social: {
        github: 'https://github.com/joyehuang'
      }
    },
    content: COMMON_SITE.content
  }
}

export function getIntegrationConfig(locale: Locale = DEFAULT_LOCALE): IntegrationUserConfig {
  const copy = SITE_COPY[locale]

  return {
    links: {
      logbook: [
        { date: '2024-07-01', content: 'Lorem ipsum dolor sit amet.' },
        { date: '2024-07-01', content: 'vidit suscipit at mei.' },
        { date: '2024-07-01', content: 'Quem denique mea id.' }
      ],
      applyTip: copy.applyTipLabels.map(({ name, val }) => ({ name, val })),
    },
    pagefind: true,
    quote: {
      server: 'https://api.quotable.io/quotes/random?maxLength=60',
      target: `(data) => data[0].content || 'Error'`
    },
    typography: {
      class: 'prose text-base text-muted-foreground'
    },
    mediumZoom: {
      enable: true,
      selector: '.prose .zoomable',
      options: {
        className: 'zoomable'
      }
    },
    waline: {
      enable: true,
      server: 'https://waline-git-main-joyehuangs-projects.vercel.app/',
      emoji: ['bmoji', 'weibo'],
      additionalConfigs: {
        pageview: true,
        comment: true,
        locale: {
          reaction0: locale === 'zh' ? '点赞' : 'Like',
          placeholder: copy.walinePlaceholder
        },
        imageUploader: false
      }
    }
  }
}

export function getTerms(locale: Locale = DEFAULT_LOCALE): CardListData {
  const copy = SITE_COPY[locale]

  return {
    title: copy.termsTitle,
    list: copy.termsList
  }
}

export function getSiteConfig(locale: Locale = DEFAULT_LOCALE): Config {
  return {
    ...getThemeConfig(locale),
    integ: getIntegrationConfig(locale)
  } as Config
}

export const theme = getThemeConfig(DEFAULT_LOCALE)
export const integ = getIntegrationConfig(DEFAULT_LOCALE)
export const terms = getTerms(DEFAULT_LOCALE)

const config = getSiteConfig(DEFAULT_LOCALE)
export default config

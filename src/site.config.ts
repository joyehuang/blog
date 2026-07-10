import type { Config, IntegrationUserConfig, ThemeUserConfig } from 'astro-pure/types'

export const theme: ThemeUserConfig = {
  // === Basic configuration ===
  /** Title for your website. Will be used in metadata and as browser tab title. */
  title: 'Joye Personal Blog',
  /** Will be used in index page & copyright declaration */
  author: 'Joye',
  /** Description metadata for your website. Can be used in page metadata. */
  description: 'Stay hungry, stay foolish',
  /** The default favicon for your site which should be a path to an image in the `public/` directory. */
  favicon: '/favicon/favicon.ico',
  /** Specify the default language for this site. */
  locale: {
    lang: 'zh-CN',
    attrs: 'zh_CN',
    // Date locale
    dateLocale: 'zh-CN',
    dateOptions: {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }
  },
  /** Set a logo image to show in the homepage. */
  logo: {
    src: 'src/assets/avatar.png',
    alt: 'Avatar'
  },

  // === Global configuration ===
  titleDelimiter: '•',
  prerender: true,
  npmCDN: 'https://cdn.jsdelivr.net/npm',

  // Still in test
  head: [
    /* Telegram channel */
    // {
    //   tag: 'meta',
    //   attrs: { name: 'telegram:channel', content: '@cworld0_cn' },
    //   content: ''
    // }
  ],
  customCss: [],

  /** Configure the header of your site. */
  header: {
    menu: [
      { title: 'Blog', link: '/blog' },
      { title: 'Notes', link: '/notes' },
      { title: 'Talks', link: '/talks' },
      { title: 'Projects', link: '/projects' },
      { title: 'Links', link: '/links' },
      { title: 'About', link: '/about' },
      { title: 'Contact', link: '/contact' }
    ]
  },

  /** Configure the footer of your site. */
  footer: {
    links: [],
    /** Enable displaying a “Astro & Pure theme powered” link in your site’s footer. */
    credits: true,
    /** Optional details about the social media accounts for this site. */
    social: {
      github: 'https://github.com/joyehuang'
      // linkedin: 'https://www.linkedin.com/in/joyehuang/'
    }
  },

  content: {
    externalLinksContent: ' ↗',
    /** Blog page size for pagination (optional) */
    blogPageSize: 8,
    externalLinkArrow: true, // show external link arrow
    // Currently support weibo, x, bluesky
    share: ['weibo', 'x', 'bluesky']
  }
}

export const integ: IntegrationUserConfig = {
  // Links management
  // See: https://astro-pure.js.org/docs/integrations/links
  links: {
    // Friend logbook
    logbook: [
      { date: '2025-07-04', content: '友链页面就绪，等第一位朋友。' },
      {
        date: '2025-11-04',
        content: '收到首位友链：<a href="https://sanbaiblog.cn/" target="_blank">一清三白</a>。'
      },
      {
        date: '2026-04-19',
        content: '添加 <a href="https://www.wengxiaoxiong.com/" target="_blank">翁小雄</a>。'
      },
      {
        date: '2026-04-27',
        content:
          '一天添加三位友链：<a href="http://www.windchant.online/" target="_blank">YinFeng\'s Blog</a>、<a href="https://kyc001.github.io/" target="_blank">Crayon</a>、<a href="https://evanlin.site/" target="_blank">Evan Lin</a>。'
      },
      {
        date: '2026-04-28',
        content:
          '添加 <a href="https://blog.forhermajesty.com/" target="_blank">Queen\'s DevLog</a>、<a href="https://limening.vercel.app/" target="_blank">Lime\'s Blog</a> 与 <a href="https://bigeartutu.beauty/" target="_blank">大耳朵图图</a>。'
      },
      {
        date: '2026-06-06',
        content:
          '添加 <a href="https://blog.cooingcode.space" target="_blank">Cooing\'s Blog</a> 与 <a href="https://blog.joshua2008.top" target="_blank">Joshua Chen Personal Blog</a>。'
      },
      {
        date: '2026-06-25',
        content: '添加 <a href="https://cxin.vercel.app/" target="_blank">Cxin Blog</a>。'
      }
    ],
    // Yourself link info
    applyTip: [
      { name: 'Name', val: theme.title },
      { name: 'Desc', val: theme.description || 'Null' },
      { name: 'Link', val: 'https://joyehuang.me/' },
      { name: 'Avatar', val: 'https://joyehuang.me/favicon/favicon.ico' }
    ]
  },
  // Page search runs on /api/search.json (see SiteSearch.astro); pagefind build hook disabled
  pagefind: false,
  // Add a random quote to the footer (default on homepage footer)
  // See: https://astro-pure.js.org/docs/integrations/advanced#web-content-render
  quote: {
    // https://developer.hitokoto.cn/sentence/#%E8%AF%B7%E6%B1%82%E5%9C%B0%E5%9D%80
    // server: 'https://v1.hitokoto.cn/?c=i',
    // target: (data) => (data as { hitokoto: string }).hitokoto || 'Error'
    // https://github.com/lukePeavey/quotable
    server: 'https://api.quotable.io/quotes/random?maxLength=60',
    target: `(data) => data[0].content || 'Error'`
  },
  // UnoCSS typography
  // See: https://unocss.dev/presets/typography
  typography: {
    class: 'prose text-base text-muted-foreground'
  },
  // A lightbox library that can add zoom effect
  // See: https://astro-pure.js.org/docs/integrations/others#medium-zoom
  mediumZoom: {
    enable: true, // disable it will not load the whole library
    selector: '.prose .zoomable',
    options: {
      className: 'zoomable'
    }
  },
  waline: {
    enable: true,
    server: 'https://waline.joyehuang.me',
    additionalConfigs: {
      pageview: true,
      comment: true
    }
  }
}

const config = { ...theme, integ } as Config
export default config

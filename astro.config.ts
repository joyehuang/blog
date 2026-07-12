import { copyFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { AstroIntegration } from 'astro'
import { rehypeHeadingIds } from '@astrojs/markdown-remark'
import react from '@astrojs/react'
import sitemap from '@astrojs/sitemap'
import vercel from '@astrojs/vercel'
import AstroPureIntegration from 'astro-pure'
import { defineConfig } from 'astro/config'
import rehypeKatex from 'rehype-katex'
import remarkCjkFriendly from 'remark-cjk-friendly'
import remarkMath from 'remark-math'

// Others
// import { visualizer } from 'rollup-plugin-visualizer'

// Local integrations
// Local rehype & remark plugins
import rehypeAutolinkHeadings from './src/plugins/rehype-auto-link-headings.ts'
import remarkReadingTime from './src/plugins/remark-reading-time.ts'
// Shiki
import {
  addCopyButton,
  addLanguage,
  addTitle,
  transformerNotationDiff,
  transformerNotationHighlight,
  updateStyle
} from './src/plugins/shiki-transformers.ts'
import config from './src/site.config.ts'

const excludedSitemapPathPatterns = [
  /^\/(?:en\/)?404\/?$/,
  /^\/(?:en\/)?search\/?$/,
  /^\/api(?:\/|$)/,
  /^\/\.well-known\/joye-manifest\.json$/
]

const shouldIncludeInSitemap = (page: string) => {
  const { pathname } = new URL(page)
  return !excludedSitemapPathPatterns.some((pattern) => pattern.test(pathname))
}

const exposeSingleSitemap = (): AstroIntegration => ({
  name: 'expose-single-sitemap',
  hooks: {
    'astro:build:done': async ({ dir }) => {
      const outputDir = fileURLToPath(dir)
      await copyFile(join(outputDir, 'sitemap-0.xml'), join(outputDir, 'sitemap.xml'))
    }
  }
})

const bilingualReadingTime = (): AstroIntegration => ({
  name: 'bilingual-reading-time',
  hooks: {
    'astro:config:setup': ({ updateConfig }) => {
      // Run after astro-pure's reading-time plugin so this bilingual estimate wins.
      updateConfig({
        markdown: {
          remarkPlugins: [remarkReadingTime]
        }
      })
    }
  }
})

// https://astro.build/config
export default defineConfig({
  // Top-Level Options
  site: 'https://www.joyehuang.me',
  // base: '/docs',
  trailingSlash: 'never',

  // Adapter
  // https://docs.astro.build/en/guides/deploy/
  // 1. Vercel (serverless)
  adapter: vercel(),
  output: 'server',
  // 2. Vercel (static)
  // adapter: vercelStatic(),
  // 3. Local (standalone)
  // adapter: node({ mode: 'standalone' }),
  // output: 'server',
  // ---

  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp'
    }
  },

  integrations: [
    sitemap({
      filter: shouldIncludeInSitemap,
      i18n: {
        defaultLocale: 'zh',
        locales: {
          zh: 'zh-CN',
          en: 'en'
        }
      }
    }),
    exposeSingleSitemap(),
    // astro-pure will automatically add sitemap, mdx & unocss
    AstroPureIntegration(config),
    bilingualReadingTime(),
    react()
  ],
  // root: './my-project-directory',

  // Prefetch Options
  prefetch: true,
  // Server Options
  server: {
    host: true
  },
  // Markdown Options
  markdown: {
    // remark-cjk-friendly：修复 **加粗** 紧贴全角标点时不渲染的 CommonMark flanking 问题
    remarkPlugins: [remarkMath, remarkCjkFriendly],
    rehypePlugins: [
      [rehypeKatex, {}],
      rehypeHeadingIds,
      [
        rehypeAutolinkHeadings,
        {
          behavior: 'append',
          properties: { className: ['anchor'] },
          content: { type: 'text', value: '#' }
        }
      ]
    ],
    // https://docs.astro.build/en/guides/syntax-highlighting/
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark'
      },
      transformers: [
        transformerNotationDiff(),
        transformerNotationHighlight(),
        updateStyle(),
        addTitle(),
        addLanguage(),
        addCopyButton(2000)
      ]
    }
  },
  experimental: {
    contentIntellisense: true
  },
  vite: {
    plugins: [
      //   visualizer({
      //     emitFile: true,
      //     filename: 'stats.html'
      //   })
    ],
    resolve: {
      dedupe: ['react', 'react-dom']
    },
    ssr: {
      external: ['@resvg/resvg-js'],
      noExternal: ['satori']
    },
    optimizeDeps: {
      include: [
        'satori',
        'linebreak',
        'base64-js',
        'unicode-trie',
        'unicode-properties',
        '@waline/client',
        'recaptcha-v3'
      ],
      esbuildOptions: {
        plugins: [
          {
            name: 'externalize-virtual-modules',
            setup(build) {
              build.onResolve({ filter: /^virtual:/ }, (args) => ({
                path: args.path,
                external: true
              }))
            }
          }
        ]
      }
    }
  }
})

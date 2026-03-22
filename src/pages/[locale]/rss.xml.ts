import type { AstroGlobal, ImageMetadata } from 'astro'
import { getImage } from 'astro:assets'
import type { CollectionEntry } from 'astro:content'
import rss from '@astrojs/rss'
import type { Root } from 'mdast'
import rehypeStringify from 'rehype-stringify'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'
import { visit } from 'unist-util-visit'

import { getLocalizedBlogEntries } from '@/content-utils'
import { LOCALES, getLocaleFromParam } from '@/i18n'
import { getSiteConfig } from '@/site-config'

export const prerender = true

export function getStaticPaths() {
  return LOCALES.map((locale) => ({
    params: { locale }
  }))
}

const imagesGlob = import.meta.glob<{ default: ImageMetadata }>(
  '/src/content/blog/**/*.{jpeg,jpg,png,gif}'
)

const renderContent = async (
  post: CollectionEntry<'blog'>,
  site: URL
) => {
  function remarkReplaceImageLink() {
    return async function (tree: Root) {
      const promises: Promise<void>[] = []
      visit(tree, 'image', (node) => {
        if (node.url.startsWith('/images')) {
          node.url = `${site}${node.url.replace('/', '')}`
        } else {
          const imagePathPrefix = `/src/content/blog/${post.id}/${node.url.replace('./', '')}`
          const promise = imagesGlob[imagePathPrefix]?.().then(async (res) => {
            const imagePath = res?.default
            if (imagePath) {
              node.url = `${site}${(await getImage({ src: imagePath })).src.replace('/', '')}`
            }
          })
          if (promise) promises.push(promise)
        }
      })
      await Promise.all(promises)
    }
  }

  const file = await unified()
    .use(remarkParse)
    .use(remarkReplaceImageLink)
    .use(remarkRehype)
    .use(rehypeStringify)
    .process(post.body)

  return String(file)
}

export async function GET(context: AstroGlobal) {
  const locale = getLocaleFromParam(context.params.locale)
  const config = getSiteConfig(locale)
  const allPostsByDate = await getLocalizedBlogEntries(locale)
  const siteUrl = context.site ?? new URL(import.meta.env.SITE)

  return rss({
    trailingSlash: false,
    xmlns: { h: 'http://www.w3.org/TR/html4/' },
    stylesheet: '/scripts/pretty-feed-v3.xsl',
    title: config.title,
    description: config.description ?? config.title,
    site: import.meta.env.SITE,
    items: await Promise.all(
      allPostsByDate.map(async (post) => {
        const heroImageSrc =
          typeof post.data.heroImage?.src === 'string'
            ? post.data.heroImage.src
            : post.data.heroImage?.src?.src

        return {
          pubDate: post.data.publishDate,
          link: `/${locale}/blog/${post.data.routeSlug || post.id}`,
          customData: heroImageSrc
            ? `<h:img src="${heroImageSrc}" />
          <enclosure url="${heroImageSrc}" />`
            : undefined,
          content: await renderContent(post, siteUrl),
          ...post.data
        }
      })
    )
  })
}

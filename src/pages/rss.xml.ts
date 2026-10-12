import { posix } from 'node:path'
import type { AstroGlobal, ImageMetadata } from 'astro'
import { getImage } from 'astro:assets'
import { getCollection, type CollectionEntry } from 'astro:content'
import rss from '@astrojs/rss'
import { mergeRssEntries, rssItemFields } from '@/lib/rss/items'
import type { Root } from 'mdast'
import rehypeStringify from 'rehype-stringify'
import remarkCjkFriendly from 'remark-cjk-friendly'
import remarkMdx from 'remark-mdx'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'
import { visit } from 'unist-util-visit'
import config from 'virtual:config'

import { getBlogCollection } from 'astro-pure/server'

export const prerender = true

// Get dynamic import of images as a map collection
const imagesGlob = import.meta.glob<{ default: ImageMetadata }>(
  '/src/content/blog/**/*.{jpeg,jpg,png,gif}' // add more image formats if needed
)

function remarkDropMdxImports() {
  return (tree: Root) => {
    visit(tree, (node, index, parent) => {
      if (node.type !== 'mdxjsEsm' || !parent || typeof index !== 'number') return
      parent.children.splice(index, 1)
      return index
    })
  }
}

const renderContent = async (
  post: CollectionEntry<'blog' | 'notes'>,
  site: URL,
  options: { mdx?: boolean; dropImports?: boolean } = {}
) => {
  const mdx = options.mdx ?? true
  // Replace image links with the correct path
  function remarkReplaceImageLink() {
    /**
     * @param {Root} tree
     */
    return async function (tree: Root) {
      const promises: Promise<void>[] = []
      visit(tree, 'image', (node) => {
        if (/^[a-z][a-z\d+.-]*:/i.test(node.url)) return
        if (node.url.startsWith('/')) {
          node.url = new URL(node.url, site).href
          return
        }

        const filePath = post.filePath?.replaceAll('\\', '/')
        if (!filePath) throw new Error(`Missing source path for RSS entry: ${post.id}`)

        const imageKey = `/${posix.normalize(posix.join(posix.dirname(filePath), node.url))}`
        const loadImage = imagesGlob[imageKey]
        if (!loadImage) throw new Error(`Unable to resolve RSS image: ${imageKey}`)

        promises.push(
          loadImage().then(async ({ default: imagePath }) => {
            const optimized = await getImage({ src: imagePath })
            node.url = new URL(optimized.src, site).href
          })
        )
      })
      await Promise.all(promises)
    }
  }

  // Markdown notes use comparisons like `<1000` and `</`. remark-mdx treats those as JSX
  // and fails the feed. MDX notes still go through remark-mdx; blog posts stay on it too.
  const processor = unified().use(remarkParse)
  if (mdx) processor.use(remarkMdx)
  if (options.dropImports) processor.use(remarkDropMdxImports)
  const file = await processor
    .use(remarkCjkFriendly)
    .use(remarkReplaceImageLink)
    .use(remarkRehype)
    .use(rehypeStringify)
    .process(post.body ?? '')

  return String(file)
}

const GET = async (context: AstroGlobal) => {
  const posts = (await getBlogCollection()) as CollectionEntry<'blog'>[]
  const notes = await getCollection('notes')
  const entries = mergeRssEntries(posts, notes, import.meta.env.PROD)
  const siteUrl = context.site ?? new URL(import.meta.env.SITE)

  return rss({
    // Basic configs
    trailingSlash: false,
    xmlns: { h: 'http://www.w3.org/TR/html4/' },
    stylesheet: '/scripts/pretty-feed-v3.xsl',

    // Contents
    title: config.title,
    description: config.description,
    site: import.meta.env.SITE,
    items: await Promise.all(
      entries.map(async (item) => {
        const fields = rssItemFields(item)
        if (item.kind === 'note') {
          // Do not spread note frontmatter: `source` is an external URL, not the item link.
          return {
            ...fields,
            content: await renderContent(item.entry, siteUrl, {
              mdx: item.entry.filePath?.endsWith('.mdx') ?? false,
              dropImports: true
            })
          }
        }

        const post = item.entry
        const heroSrc =
          typeof post.data.heroImage?.src === 'string'
            ? post.data.heroImage.src
            : post.data.heroImage?.src.src
        return {
          ...fields,
          // no heroImage -> no customData; interpolating undefined emits src="undefined"
          ...(heroSrc
            ? { customData: `<h:img src="${heroSrc}" />\n          <enclosure url="${heroSrc}" />` }
            : {}),
          content: await renderContent(post, siteUrl),
          ...post.data
        }
      })
    )
  })
}

export { GET }

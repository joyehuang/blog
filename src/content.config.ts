import { defineCollection, z, type SchemaContext } from 'astro:content'
import { glob } from 'astro/loaders'

function removeDupsAndLowerCase(array: string[]) {
  if (!array.length) return array
  const lowercaseItems = array.map((str) => str.toLowerCase())
  const distinctItems = new Set(lowercaseItems)
  return Array.from(distinctItems)
}

// Shared schemas so the Chinese collections and their English mirrors stay in sync.
const blogSchema = ({ image }: SchemaContext) =>
  z.object({
    // Required
    title: z.string().max(60),
    description: z.string().max(160),
    publishDate: z.coerce.date(),
    // Optional
    updatedDate: z.coerce.date().optional(),
    heroImage: z
      .object({
        src: image(),
        alt: z.string().optional(),
        inferSize: z.boolean().optional(),
        width: z.number().optional(),
        height: z.number().optional(),

        color: z.string().optional()
      })
      .optional(),
    tags: z.array(z.string()).default([]).transform(removeDupsAndLowerCase),
    language: z.string().optional(),
    // For English mirrors: the Chinese entry's URL path after `/blog/`
    // (e.g. `20251216---normalization/post`). Drives en routing + hreflang.
    translationKey: z.string().optional(),
    draft: z.boolean().default(false),
    comment: z.boolean().default(true)
  })

const archiveSchema = z.object({
  // Required
  title: z.string(),
  date: z.coerce.date(),
  // Optional
  description: z.string().optional(),
  updatedDate: z.coerce.date().optional(),
  tags: z.array(z.string()).default([]).transform(removeDupsAndLowerCase),
  // Type of archive entry: note, snippet, draft, idea, research, etc.
  type: z.enum(['note', 'snippet', 'draft', 'idea', 'research', 'reference']).default('note'),
  // Status: in-progress, incomplete, ready, archived
  status: z.enum(['in-progress', 'incomplete', 'ready', 'archived']).default('in-progress'),
  draft: z.boolean().default(false),
  // For English mirrors: the Chinese entry's id (e.g. `0326-foo`). Drives en routing + hreflang.
  language: z.string().optional(),
  translationKey: z.string().optional(),
  // Relationships - connect archive entries to blog posts and other archives
  relatedBlog: z.array(z.string()).optional(),
  relatedArchive: z.array(z.string()).optional(),
  // External source or reference URL
  source: z.string().url().optional()
})

// Chinese (default) blog posts: every `post.mdx` EXCEPT English mirrors `post.en.mdx`.
const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: ['**/*.{md,mdx}', '!**/*.en.{md,mdx}'] }),
  schema: blogSchema
})

// English mirrors: `post.en.mdx` siblings, kept in a separate collection so they
// never leak into the Chinese blog list / RSS / OG generation.
const blogEn = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.en.{md,mdx}' }),
  schema: blogSchema
})

const archive = defineCollection({
  loader: glob({ base: './src/content/archive', pattern: ['**/*.{md,mdx}', '!**/*.en.{md,mdx}'] }),
  schema: archiveSchema
})

const archiveEn = defineCollection({
  loader: glob({ base: './src/content/archive', pattern: '**/*.en.{md,mdx}' }),
  schema: archiveSchema
})

const curated = defineCollection({
  loader: glob({ base: './src/content/curated', pattern: '**/*.{md,mdx}' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string().max(200),
      date: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      source: z.string().url(), // link to the original paper/blog/article/repo
      sourceTitle: z.string().optional(), // original title
      sourceAuthor: z.string().optional(), // author / organization
      why: z.string().max(180).optional(),
      tags: z.array(z.string()).default([]).transform(removeDupsAndLowerCase),
      type: z.enum(['paper', 'blog', 'article', 'report', 'repo']).default('blog'),
      status: z.enum(['curated', 'digested']).default('curated'),
      difficulty: z.enum(['intro', 'intermediate', 'deep']).optional(),
      relatedBlog: z.array(z.string()).optional(),
      relatedArchive: z.array(z.string()).optional(),
      heroImage: z
        .object({
          src: image(),
          alt: z.string().optional()
        })
        .optional(),
      draft: z.boolean().default(false)
    })
})

export const collections = { blog, blogEn, archive, archiveEn, curated }

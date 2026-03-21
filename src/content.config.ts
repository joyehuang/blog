import { defineCollection, z } from 'astro:content'
import { glob } from 'astro/loaders'
import { normalizeTags } from './tags'

const blog = defineCollection({
  // Load Markdown and MDX files in the `src/content/blog/` directory.
  loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
  // Required
  schema: ({ image }) =>
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
      tags: z.array(z.string()).default([]).transform(normalizeTags),
      locale: z.enum(['zh', 'en']).default('zh'),
      translationKey: z.string().optional(),
      routeSlug: z.string().optional(),
      language: z.string().optional(),
      draft: z.boolean().default(false),
      // Special fields
      comment: z.boolean().default(true)
    })
})

const archive = defineCollection({
  // Load Markdown and MDX files in the `src/content/archive/` directory.
  loader: glob({ base: './src/content/archive', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    // Required
    title: z.string(),
    date: z.coerce.date(),
    // Optional
    description: z.string().optional(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]).transform(normalizeTags),
    locale: z.enum(['zh', 'en']).default('zh'),
    translationKey: z.string().optional(),
    routeSlug: z.string().optional(),
    // Type of archive entry: note, snippet, draft, idea, research, etc.
    type: z.enum(['note', 'snippet', 'draft', 'idea', 'research', 'reference']).default('note'),
    // Status: in-progress, incomplete, ready, archived
    status: z.enum(['in-progress', 'incomplete', 'ready', 'archived']).default('in-progress'),
    draft: z.boolean().default(false),
    // Relationships - connect archive entries to blog posts and other archives
    relatedBlog: z.array(z.string()).optional(),
    relatedArchive: z.array(z.string()).optional(),
    // External source or reference URL
    source: z.string().url().optional()
  })
})

export const collections = { blog, archive }

import { defineCollection, z } from 'astro:content'
import { glob } from 'astro/loaders'

function removeDupsAndLowerCase(array: string[]) {
  if (!array.length) return array
  const lowercaseItems = array.map((str) => str.toLowerCase())
  const distinctItems = new Set(lowercaseItems)
  return Array.from(distinctItems)
}

const createBlogSchema = (locale: 'zh' | 'en') =>
  ({ image }: { image: () => z.ZodTypeAny }) =>
    z.object({
      title: z.string().max(60),
      description: z.string().max(160),
      publishDate: z.coerce.date(),
      locale: z.literal(locale),
      translationKey: z.string(),
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
      draft: z.boolean().default(false),
      comment: z.boolean().default(true)
    })

const createPaperSchema = (locale: 'zh' | 'en') =>
  ({ image }: { image: () => z.ZodTypeAny }) =>
    z.object({
      title: z.string().max(120),
      description: z.string().max(280),
      publishDate: z.coerce.date(),
      locale: z.literal(locale),
      translationKey: z.string(),
      paperLink: z.string().url(),
      authors: z.array(z.string()).min(1),
      year: z.number().int(),
      updatedDate: z.coerce.date().optional(),
      venue: z.string().optional(),
      pdfLink: z.string().url().optional(),
      codeLink: z.string().url().optional(),
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
      status: z.enum(['reading', 'completed', 'revisit']).default('completed'),
      language: z.string().optional(),
      draft: z.boolean().default(false),
      comment: z.boolean().default(true),
      featured: z.boolean().default(false)
    })

const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
  schema: createBlogSchema('zh')
})

const blogEn = defineCollection({
  loader: glob({ base: './src/content/blog-en', pattern: '**/*.{md,mdx}' }),
  schema: createBlogSchema('en')
})

const papers = defineCollection({
  loader: glob({ base: './src/content/papers', pattern: '**/*.{md,mdx}' }),
  schema: createPaperSchema('zh')
})

const papersEn = defineCollection({
  loader: glob({ base: './src/content/papers-en', pattern: '**/*.{md,mdx}' }),
  schema: createPaperSchema('en')
})

export const collections = { blog, blogEn, papers, papersEn }

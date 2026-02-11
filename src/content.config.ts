import { defineCollection, z } from 'astro:content'
import { glob } from 'astro/loaders'

function removeDupsAndLowerCase(array: string[]) {
  if (!array.length) return array
  const lowercaseItems = array.map((str) => str.toLowerCase())
  const distinctItems = new Set(lowercaseItems)
  return Array.from(distinctItems)
}

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
      tags: z.array(z.string()).default([]).transform(removeDupsAndLowerCase),
      language: z.string().optional(),
      draft: z.boolean().default(false),
      // Special fields
      comment: z.boolean().default(true)
    })
})

const papers = defineCollection({
  // Load Markdown and MDX files in the `src/content/papers/` directory.
  loader: glob({ base: './src/content/papers', pattern: '**/*.{md,mdx}' }),
  schema: ({ image }) =>
    z.object({
      // Required
      title: z.string().max(120),
      description: z.string().max(280),
      publishDate: z.coerce.date(),
      paperLink: z.string().url(),
      authors: z.array(z.string()).min(1),
      year: z.number().int(),
      // Optional
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
})

export const collections = { blog, papers }

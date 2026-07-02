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
    ogImage: z.string().optional(),
    // For English mirrors: the Chinese entry's URL path after `/blog/`
    // (e.g. `20251216---normalization/post`). Drives en routing + hreflang.
    translationKey: z.string().optional(),
    tocDepth: z.number().int().min(2).max(6).optional(),
    tocLabels: z.record(z.string(), z.string()).optional(),
    draft: z.boolean().default(false),
    comment: z.boolean().default(true)
  })

const notesSchema = z.object({
  // Required
  title: z.string(),
  date: z.coerce.date(),
  // Optional
  description: z.string().optional(),
  updatedDate: z.coerce.date().optional(),
  tags: z.array(z.string()).default([]).transform(removeDupsAndLowerCase),
  // Type of note entry: note, snippet, draft, idea, research, etc.
  type: z.enum(['note', 'snippet', 'draft', 'idea', 'research', 'reference']).default('note'),
  // Status: in-progress, incomplete/needs-more, ready, archived
  status: z.enum(['in-progress', 'incomplete', 'ready', 'archived']).default('in-progress'),
  draft: z.boolean().default(false),
  // For English mirrors: the Chinese entry's id (e.g. `0326-foo`). Drives en routing + hreflang.
  language: z.string().optional(),
  translationKey: z.string().optional(),
  // Relationships - connect note entries to blog posts and other notes
  relatedBlog: z.array(z.string()).optional(),
  relatedNote: z.array(z.string()).optional(),
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

const notes = defineCollection({
  loader: glob({ base: './src/content/notes', pattern: ['**/*.{md,mdx}', '!**/*.en.{md,mdx}'] }),
  schema: notesSchema
})

const notesEn = defineCollection({
  loader: glob({ base: './src/content/notes', pattern: '**/*.en.{md,mdx}' }),
  schema: notesSchema
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
      relatedNote: z.array(z.string()).optional(),
      heroImage: z
        .object({
          src: image(),
          alt: z.string().optional()
        })
        .optional(),
      draft: z.boolean().default(false)
    })
})

// Weekly sharing-session series (分享会 / Talks). Each entry is one session;
// the structured fields drive the changelog feed, tag filter and per-session detail.
const talksSchema = z.object({
  // Required
  episode: z.number(),
  title: z.string(),
  date: z.coerce.date(),
  // Optional meta
  subtitle: z.string().optional(),
  durationMinutes: z.number().optional(),
  attendees: z.string().optional(),
  deckUrl: z.string().optional(),
  slideCount: z.number().optional(),
  video: z
    .object({
      bvid: z.string(),
      url: z.string().url().optional()
    })
    .optional(),
  // Structured content (topics keep their display casing, so no lowercase transform)
  topics: z.array(z.string()).default([]),
  quotes: z.array(z.object({ text: z.string(), gloss: z.string().optional() })).default([]),
  takeaways: z.array(z.object({ title: z.string(), desc: z.string().optional() })).default([]),
  diagrams: z.array(z.object({ src: z.string(), caption: z.string().optional() })).default([]),
  // Cover-style teaser shown on the Talks feed when an episode is upcoming.
  // Mirrors the deck's terminal cover: a shell prompt line + a loading line.
  teaser: z
    .object({
      prompt: z.string(),
      loading: z.string().optional()
    })
    .optional(),
  // State
  status: z.enum(['published', 'upcoming']).default('published'),
  draft: z.boolean().default(false)
})

const talks = defineCollection({
  loader: glob({ base: './src/content/talks', pattern: ['**/*.{md,mdx}', '!**/*.en.{md,mdx}'] }),
  schema: talksSchema
})

export const collections = { blog, blogEn, notes, notesEn, curated, talks }

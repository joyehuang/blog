import fs from 'node:fs/promises'
import path from 'node:path'

import { postHeroPng } from '../src/lib/og'

const BLOG_DIR = path.resolve('src/content/blog')
const HERO_COLOR = '#527D94'

type Frontmatter = {
  title: string
  description: string
  publishDate: string
  tags: string[]
}

function readScalar(frontmatter: string, key: keyof Omit<Frontmatter, 'tags'>) {
  const value = frontmatter.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))?.[1]?.trim()
  if (!value) throw new Error(`Missing ${key}`)

  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replaceAll("''", "'")
  }
  if (value.startsWith('"') && value.endsWith('"')) {
    return JSON.parse(value)
  }
  return value
}

function readTags(frontmatter: string) {
  const value = frontmatter.match(/^tags:\s*(.+)$/m)?.[1]?.trim()
  if (!value) return []
  return Array.from(value.matchAll(/'([^']*)'|"([^"]*)"/g)).map((match) => match[1] ?? match[2])
}

function parseFrontmatter(markdown: string): { frontmatter: Frontmatter; raw: string } {
  const raw = markdown.match(/^---\n([\s\S]*?)\n---/)?.[1]
  if (!raw) throw new Error('Missing frontmatter block')

  return {
    raw,
    frontmatter: {
      title: readScalar(raw, 'title'),
      description: readScalar(raw, 'description'),
      publishDate: readScalar(raw, 'publishDate'),
      tags: readTags(raw)
    }
  }
}

function formatDate(value: string) {
  const date = new Date(value.replace(' ', 'T'))
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function heroBlock(fileName: string, title: string) {
  return [
    'heroImage:',
    `  src: './${fileName}'`,
    `  alt: ${JSON.stringify(title)}`,
    `  color: '${HERO_COLOR}'`
  ].join('\n')
}

function withHeroImage(markdown: string, fileName: string, title: string) {
  if (/^heroImage:/m.test(markdown)) return markdown
  return markdown.replace(/^(publishDate:\s*.+)$/m, `$1\n${heroBlock(fileName, title)}`)
}

async function findPostFiles() {
  const dirs = await fs.readdir(BLOG_DIR, { withFileTypes: true })
  const files: string[] = []

  for (const dir of dirs) {
    if (!dir.isDirectory()) continue
    for (const fileName of ['post.mdx', 'post.en.mdx']) {
      const filePath = path.join(BLOG_DIR, dir.name, fileName)
      try {
        await fs.access(filePath)
        files.push(filePath)
      } catch {
        // Not every directory needs every language variant.
      }
    }
  }

  return files.sort()
}

const files = await findPostFiles()

for (const filePath of files) {
  const markdown = await fs.readFile(filePath, 'utf8')
  const { frontmatter } = parseFrontmatter(markdown)
  const isEnglish = filePath.endsWith('.en.mdx')
  const fileName = isEnglish ? 'hero.en.png' : 'hero.png'
  const imagePath = path.join(path.dirname(filePath), fileName)

  const png = await postHeroPng({
    title: frontmatter.title,
    description: frontmatter.description,
    date: formatDate(frontmatter.publishDate),
    tags: frontmatter.tags
  })
  await fs.writeFile(imagePath, png)

  const nextMarkdown = withHeroImage(markdown, fileName, frontmatter.title)
  if (nextMarkdown !== markdown) {
    await fs.writeFile(filePath, nextMarkdown)
  }

  console.log(`generated ${path.relative(process.cwd(), imagePath)}`)
}

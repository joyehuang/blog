#!/usr/bin/env node

import { existsSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const args = new Set(process.argv.slice(2))
const getArg = (name, fallback) => {
  const prefix = `${name}=`
  const found = process.argv.slice(2).find((arg) => arg.startsWith(prefix))
  return found ? found.slice(prefix.length) : fallback
}

const jsonMode = args.has('--json')
const includeDrafts = args.has('--include-drafts')
const limit = Number(getArg('--limit', '12'))
const failUnder = Number(getArg('--fail-under', '0'))
const site = getArg('--site', 'https://www.joyehuang.me')

const contentRoots = [
  ['blog', path.join(root, 'src/content/blog')],
  ['archive', path.join(root, 'src/content/archive')],
  ['curated', path.join(root, 'src/content/curated')],
  ['talks', path.join(root, 'src/content/talks')]
]

const GEO_TERMS = [
  'agent',
  'ai',
  'llm',
  'rag',
  'mcp',
  'harness',
  'transformer',
  'attention',
  'codex',
  'claude',
  'openai',
  'vercel',
  '工程',
  '面试',
  '入门',
  '大模型',
  '智能体',
  '源码',
  '求职'
]

const GENERIC_DESCRIPTIONS = new Set([
  'stay hungry, stay foolish',
  'some posts or archives of my blog',
  'not found'
])

const walk = async (dir) => {
  if (!existsSync(dir)) return []
  const entries = await readdir(dir, { withFileTypes: true })
  const files = await Promise.all(
    entries.map((entry) => {
      const fullPath = path.join(dir, entry.name)
      return entry.isDirectory() ? walk(fullPath) : fullPath
    })
  )
  return files.flat()
}

const parseFrontmatter = (raw) => {
  if (!raw.startsWith('---')) return [{}, raw]
  const end = raw.indexOf('\n---', 3)
  if (end === -1) return [{}, raw]

  const block = raw.slice(3, end).trim()
  const body = raw.slice(end + 4).trim()
  const data = {}

  for (const line of block.split('\n')) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/)
    if (!match) continue

    const key = match[1]
    let value = match[2].trim()

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }

    if (value.startsWith('[') && value.endsWith(']')) {
      data[key] = value
        .slice(1, -1)
        .split(',')
        .map((item) => item.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean)
    } else if (value === 'true' || value === 'false') {
      data[key] = value === 'true'
    } else {
      data[key] = value
    }
  }

  return [data, body]
}

const stripMarkdown = (body) =>
  body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/^import .*$/gm, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/[#>*_`~|-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const countMatches = (text, regex) => (text.match(regex) ?? []).length
const hasAny = (text, terms) => terms.some((term) => text.toLowerCase().includes(term.toLowerCase()))
const clamp = (value, max) => Math.min(value, max)

const add = (bucket, points, max, label, pass, advice) => {
  bucket.score += pass ? points : 0
  bucket.max += max
  if (!pass && advice) bucket.issues.push(`${label}: ${advice}`)
}

const auditContentFile = async (file, collection) => {
  const raw = await readFile(file, 'utf8')
  const [frontmatter, body] = parseFrontmatter(raw)
  if (!includeDrafts && (frontmatter.draft === true || frontmatter.status === 'upcoming')) {
    return {
      skipped: true,
      path: path.relative(root, file),
      reason: frontmatter.draft === true ? 'draft' : 'upcoming'
    }
  }

  const plain = stripMarkdown(body)
  const lowerPlain = plain.toLowerCase()
  const title = String(frontmatter.title ?? '').trim()
  const description = String(frontmatter.description ?? frontmatter.subtitle ?? frontmatter.why ?? '').trim()
  const tags = Array.isArray(frontmatter.tags)
    ? frontmatter.tags
    : Array.isArray(frontmatter.topics)
      ? frontmatter.topics
      : []
  const headings = [...body.matchAll(/^(#{2,4})\s+(.+)$/gm)].map((match) => ({
    depth: match[1].length,
    text: match[2].replace(/#+$/, '').trim()
  }))
  const h2Count = headings.filter((heading) => heading.depth === 2).length
  const tableCount = countMatches(body, /^\|.+\|$/gm)
  const listCount = countMatches(body, /^\s*[-*]\s+/gm) + countMatches(body, /^\s*\d+\.\s+/gm)
  const externalLinkCount = countMatches(body, /\]\(https?:\/\/[^)]+\)/g)
  const internalLinkCount = countMatches(body, /\]\(\/[^)]+\)/g)
  const blockquoteCount = countMatches(body, /^>\s+/gm)
  const codeBlockCount = countMatches(body, /```/g) / 2
  const questionCount = countMatches(body, /[?？]/g)
  const wordishCount = plain.split(/\s+/).filter(Boolean).length
  const charCount = plain.length
  const firstChunk = plain.slice(0, 900)
  const titleDesc = `${title} ${description}`

  const bucket = { score: 0, max: 0, issues: [] }
  const bonuses = []

  add(bucket, 6, 6, 'title', title.length >= 12 && title.length <= 80, '标题建议保持 12-80 字符，方便搜索结果和 AI 摘要直接引用')
  add(bucket, 8, 8, 'description', description.length >= 70 && description.length <= 180, '描述建议 70-180 字符，并直接说明本文解决什么问题')
  add(bucket, 4, 4, 'date', Boolean(frontmatter.publishDate || frontmatter.date), '缺少 publishDate/date，AI 摘要较难判断时效性')
  add(bucket, 4, 4, 'tags', tags.length >= 3, '建议至少 3 个具体主题标签')
  add(bucket, 5, 5, 'topic clarity', hasAny(titleDesc, GEO_TERMS), '标题或描述里最好出现明确主题词，例如 Agent、LLM、RAG、工程、面试等')

  add(bucket, 8, 8, 'opening summary', firstChunk.length > 220 && hasAny(firstChunk, ['本文', 'this post', 'guide', 'what', 'why', 'how', '问题', '适合', '解答']), '开头 2-3 段建议直接说明结论、对象、解决的问题')
  add(bucket, 5, 5, 'heading structure', h2Count >= 3, '建议至少 3 个二级标题，把文章切成可被引用的小节')
  add(bucket, 5, 5, 'extractable lists', listCount >= 3 || tableCount >= 2, '建议加入列表或表格，AI 更容易抽取步骤、对比和要点')
  add(bucket, 4, 4, 'question coverage', questionCount >= 2 || hasAny(lowerPlain, ['what', 'why', 'how', '为什么', '是什么', '怎么']), '建议显式写出文章回答的问题')
  add(bucket, 4, 4, 'quote-ready passages', blockquoteCount >= 1 || description.length >= 100, '建议提供摘要、引用块或一句话结论')

  add(bucket, 5, 5, 'author/entity signal', hasAny(plain.slice(0, 2000), ['joye', '作者', '我叫', 'my name']), '建议在 About 或长文中保留作者/身份信号')
  add(bucket, 5, 5, 'external citations', externalLinkCount >= 2 || collection === 'archive', '建议引用官方文档、论文、项目或原始资料')
  add(bucket, 4, 4, 'freshness', Boolean(frontmatter.updatedDate || /updated\s*:/i.test(body) || /更新/.test(body)), '建议重要文章提供 updatedDate 或正文更新日期')
  add(bucket, 4, 4, 'evidence density', codeBlockCount >= 1 || tableCount >= 2 || /[0-9]{2,}/.test(plain), '建议加入代码、数据、案例或具体数字')
  add(bucket, 3, 3, 'internal graph', internalLinkCount >= 1, '建议链接到站内相关文章，增强主题簇')

  add(bucket, 4, 4, 'length', charCount >= 1500 || wordishCount >= 600, '内容偏短，AI 可能难以形成可信摘要')
  add(bucket, 4, 4, 'non-generic description', !GENERIC_DESCRIPTIONS.has(description.toLowerCase()), '描述过于泛化')
  add(bucket, 3, 3, 'multilingual mapping', collection !== 'blog' || file.endsWith('.en.mdx') || existsSync(file.replace(/post\.mdx$/, 'post.en.mdx')) || Boolean(frontmatter.translationKey), '中文长文建议提供英文镜像或 translationKey')
  add(bucket, 3, 3, 'specific noun phrases', countMatches(titleDesc, /[A-Z][A-Za-z0-9.+-]{1,}|[\u4e00-\u9fa5]{2,}/g) >= 4, '标题和描述应包含更多具体实体/概念')
  add(bucket, 3, 3, 'stable slug hint', !/[()]/.test(file) && !/\s{2,}/.test(file), '路径应稳定、简洁、避免特殊字符')

  if (frontmatter.language === 'en' || file.endsWith('.en.mdx')) bonuses.push('English mirror')
  if (tableCount >= 2) bonuses.push('tables')
  if (codeBlockCount >= 2) bonuses.push('code examples')

  const score = Math.round((bucket.score / bucket.max) * 100)
  const relativePath = path.relative(root, file)

  return {
    path: relativePath,
    collection,
    title,
    description,
    score,
    stats: {
      chars: charCount,
      headings: headings.length,
      h2: h2Count,
      lists: listCount,
      tables: tableCount,
      externalLinks: externalLinkCount,
      internalLinks: internalLinkCount,
      codeBlocks: codeBlockCount,
      tags: tags.length
    },
    issues: bucket.issues,
    bonuses,
    aiTestPrompts: buildPrompts(title, description, tags)
  }
}

const buildPrompts = (title, description, tags) => {
  const topic = title || tags.slice(0, 3).join(' ')
  const promptTopic = topic || description.slice(0, 80)
  const quotedTopic = promptTopic.replaceAll('"', "'")
  return [
    `请总结 Joye Huang 关于「${promptTopic}」的观点，并引用来源。`,
    `What does Joye Huang explain about "${quotedTopic}"? Cite the source.`,
    `site:joyehuang.me ${tags.slice(0, 3).join(' ') || promptTopic}`
  ]
}

const auditDist = async () => {
  const distDir = path.join(root, 'dist')
  if (!existsSync(distDir)) {
    return {
      built: false,
      issues: ['未找到 dist。先运行 bun run build 后，脚本可以额外检查 HTML、sitemap、robots 和 JSON-LD。'],
      stats: {}
    }
  }

  const files = await walk(distDir)
  const htmlFiles = files.filter((file) => file.endsWith('.html'))
  const robots = files.find((file) => file.endsWith('robots.txt'))
  const sitemap = files.find((file) => file.endsWith('sitemap.xml'))
  let jsonLdPages = 0
  let missingCanonical = 0
  let missingDescription = 0
  let missingOg = 0

  for (const file of htmlFiles) {
    const html = await readFile(file, 'utf8')
    if (html.includes('application/ld+json')) jsonLdPages += 1
    if (!/rel=["']canonical["']/i.test(html)) missingCanonical += 1
    if (!/name=["']description["']/i.test(html)) missingDescription += 1
    if (!/property=["']og:title["']/i.test(html)) missingOg += 1
  }

  const issues = []
  if (!robots) issues.push('dist 中没有 robots.txt')
  if (!sitemap) issues.push('dist 中没有 sitemap.xml')
  if (htmlFiles.length && jsonLdPages === 0) issues.push('没有检测到 JSON-LD。建议文章页添加 BlogPosting/Article 结构化数据。')
  if (missingCanonical) issues.push(`${missingCanonical} 个 HTML 页面缺少 canonical`)
  if (missingDescription) issues.push(`${missingDescription} 个 HTML 页面缺少 meta description`)
  if (missingOg) issues.push(`${missingOg} 个 HTML 页面缺少 Open Graph title`)

  return {
    built: true,
    issues,
    stats: {
      htmlPages: htmlFiles.length,
      jsonLdPages,
      hasRobots: Boolean(robots),
      hasSitemap: Boolean(sitemap)
    }
  }
}

const readSiteConfigSignals = async () => {
  const siteConfigPath = path.join(root, 'src/site.config.ts')
  if (!existsSync(siteConfigPath)) return []
  const source = await readFile(siteConfigPath, 'utf8')
  const issues = []
  const descriptionMatch = source.match(/description:\s*['"`]([^'"`]+)['"`]/)
  if (descriptionMatch && GENERIC_DESCRIPTIONS.has(descriptionMatch[1].toLowerCase())) {
    issues.push('站点默认 description 过于泛化，建议改成一句明确定位：你写什么、给谁看、有什么可信度。')
  }
  if (!source.includes('github') && !source.includes('GitHub')) {
    issues.push('站点配置里缺少明显的 GitHub/作者实体信号。')
  }
  return issues
}

const main = async () => {
  const filesByCollection = await Promise.all(
    contentRoots.map(async ([collection, dir]) => {
      const files = (await walk(dir)).filter((file) => /\.(md|mdx)$/.test(file))
      return files.map((file) => [collection, file])
    })
  )

  const auditResults = await Promise.all(
    filesByCollection
      .flat()
      .filter(([, file]) => !file.includes('/node_modules/'))
      .map(([collection, file]) => auditContentFile(file, collection))
  )
  const skipped = auditResults.filter((item) => item.skipped)
  const audits = auditResults.filter((item) => !item.skipped)

  const dist = await auditDist()
  const siteConfigIssues = await readSiteConfigSignals()
  const sorted = audits.toSorted((a, b) => a.score - b.score)
  const average = audits.length
    ? Math.round(audits.reduce((sum, item) => sum + item.score, 0) / audits.length)
    : 0

  const result = {
    site,
    averageScore: average,
    pagesAudited: audits.length,
    pagesSkipped: skipped.length,
    skipped,
    dist,
    siteConfigIssues,
    weakestPages: sorted.slice(0, limit),
    strongestPages: sorted.slice(-Math.min(limit, sorted.length)).reverse()
  }

  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    printReport(result)
  }

  if (failUnder > 0 && average < failUnder) {
    process.exitCode = 1
  }
}

const printReport = (result) => {
  console.log(`\nGEO audit for ${result.site}`)
  console.log(
    `Average score: ${result.averageScore}/100 across ${result.pagesAudited} content files` +
      (result.pagesSkipped ? ` (${result.pagesSkipped} skipped)` : '') +
      '\n'
  )

  if (result.siteConfigIssues.length) {
    console.log('Site-level issues')
    for (const issue of result.siteConfigIssues) console.log(`- ${issue}`)
    console.log('')
  }

  console.log('Build artifact checks')
  if (!result.dist.built) {
    console.log(`- ${result.dist.issues[0]}`)
  } else {
    console.log(`- HTML pages: ${result.dist.stats.htmlPages}`)
    console.log(`- JSON-LD pages: ${result.dist.stats.jsonLdPages}`)
    console.log(`- robots.txt: ${result.dist.stats.hasRobots ? 'yes' : 'no'}`)
    console.log(`- sitemap.xml: ${result.dist.stats.hasSitemap ? 'yes' : 'no'}`)
    for (const issue of result.dist.issues) console.log(`- ${issue}`)
  }
  console.log('')

  console.log(`Weakest ${result.weakestPages.length} pages`)
  for (const page of result.weakestPages) {
    console.log(`\n${page.score}/100 ${page.path}`)
    console.log(`  ${page.title || '(missing title)'}`)
    for (const issue of page.issues.slice(0, 5)) console.log(`  - ${issue}`)
    if (page.issues.length > 5) console.log(`  - ...${page.issues.length - 5} more`)
  }

  console.log('\nAI search test prompts')
  for (const page of result.strongestPages.slice(0, 3)) {
    console.log(`\n${page.title}`)
    for (const prompt of page.aiTestPrompts) console.log(`- ${prompt}`)
  }

  console.log('\nRun options: --json, --limit=20, --fail-under=75, --include-drafts, --site=https://example.com')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

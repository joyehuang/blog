import type { Locale } from './i18n'

type TagDefinition = {
  labels: Record<Locale, string>
  aliases?: string[]
}

const TAG_DEFINITIONS: Record<string, TagDefinition> = {
  internship: {
    labels: { zh: '实习', en: 'Internship' },
    aliases: ['实习', 'internship']
  },
  frontend: {
    labels: { zh: '前端', en: 'Frontend' },
    aliases: ['前端', 'frontend']
  },
  interview: {
    labels: { zh: '面试', en: 'Interview' },
    aliases: ['面试', 'interview']
  },
  'open-source': {
    labels: { zh: '开源', en: 'Open Source' },
    aliases: ['开源', 'open-source', 'open source']
  },
  tutorial: {
    labels: { zh: '教程', en: 'Tutorial' },
    aliases: ['教程', 'tutorial']
  },
  llm: {
    labels: { zh: 'LLM', en: 'LLM' },
    aliases: ['LLM', 'llm']
  },
  transformer: {
    labels: { zh: 'Transformer', en: 'Transformer' },
    aliases: ['Transformer', 'transformer']
  },
  minimind: {
    labels: { zh: 'MiniMind', en: 'MiniMind' },
    aliases: ['MiniMind', 'minimind']
  },
  'deep-learning': {
    labels: { zh: '深度学习', en: 'Deep Learning' },
    aliases: ['Deep Learning', 'deep learning', 'deep-learning']
  },
  normalization: {
    labels: { zh: '归一化', en: 'Normalization' },
    aliases: ['Normalization', 'normalization']
  },
  rope: {
    labels: { zh: 'RoPE', en: 'RoPE' },
    aliases: ['RoPE', 'rope']
  },
  'position-encoding': {
    labels: { zh: '位置编码', en: 'Position Encoding' },
    aliases: ['Position Encoding', 'position encoding', 'position-encoding']
  },
  attention: {
    labels: { zh: '注意力', en: 'Attention' },
    aliases: ['Attention', 'attention']
  },
  'multi-head': {
    labels: { zh: '多头注意力', en: 'Multi-Head' },
    aliases: ['Multi-Head', 'multi-head', 'multi head']
  },
  feedforward: {
    labels: { zh: '前馈网络', en: 'FeedForward' },
    aliases: ['FeedForward', 'feedforward', 'feed-forward']
  },
  swiglu: {
    labels: { zh: 'SwiGLU', en: 'SwiGLU' },
    aliases: ['SwiGLU', 'swiglu']
  },
  architecture: {
    labels: { zh: '架构', en: 'Architecture' },
    aliases: ['Architecture', 'architecture']
  },
  react: {
    labels: { zh: 'React', en: 'React' },
    aliases: ['React', 'react']
  },
  agent: {
    labels: { zh: 'Agent', en: 'Agent' },
    aliases: ['Agent', 'agent']
  },
  ai: {
    labels: { zh: 'AI', en: 'AI' },
    aliases: ['AI', 'ai']
  },
  waline: {
    labels: { zh: 'Waline', en: 'Waline' },
    aliases: ['Waline', 'waline']
  },
  prompt: {
    labels: { zh: 'Prompt', en: 'Prompt' },
    aliases: ['Prompt', 'prompt']
  },
  performance: {
    labels: { zh: '性能', en: 'Performance' },
    aliases: ['Performance', 'performance']
  },
  astro: {
    labels: { zh: 'Astro', en: 'Astro' },
    aliases: ['Astro', 'astro']
  },
  images: {
    labels: { zh: '图像', en: 'Images' },
    aliases: ['Images', 'images']
  },
  typescript: {
    labels: { zh: 'TypeScript', en: 'TypeScript' },
    aliases: ['TypeScript', 'typescript']
  },
  reference: {
    labels: { zh: '参考', en: 'Reference' },
    aliases: ['Reference', 'reference']
  }
}

type TaggableEntry = {
  data: {
    tags: string[]
  }
}

function normalizeTagToken(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[/_]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function getCompareLocale(locale: Locale) {
  return locale === 'zh' ? 'zh-CN' : 'en'
}

function humanizeFallbackTag(tag: string) {
  return tag
    .split('-')
    .filter(Boolean)
    .map((segment) => {
      if (segment === 'ai' || segment === 'llm') return segment.toUpperCase()
      return `${segment.slice(0, 1).toUpperCase()}${segment.slice(1)}`
    })
    .join(' ')
}

const TAG_ALIAS_TO_KEY = Object.fromEntries(
  Object.entries(TAG_DEFINITIONS).flatMap(([tag, definition]) =>
    [tag, ...(definition.aliases ?? [])].map((alias) => [normalizeTagToken(alias), tag])
  )
) as Record<string, string>

export function normalizeTag(tag: string) {
  const normalized = normalizeTagToken(tag)
  return TAG_ALIAS_TO_KEY[normalized] ?? normalized
}

export function normalizeTags(tags: string[]) {
  if (!tags.length) return tags

  const seen = new Set<string>()
  const normalizedTags: string[] = []

  for (const tag of tags) {
    const normalized = normalizeTag(tag)
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    normalizedTags.push(normalized)
  }

  return normalizedTags
}

export function getTagLabel(tag: string, locale: Locale) {
  const canonicalTag = normalizeTag(tag)
  return TAG_DEFINITIONS[canonicalTag]?.labels[locale] ?? humanizeFallbackTag(canonicalTag)
}

export function getTagAliases(tag: string) {
  const canonicalTag = normalizeTag(tag)
  const aliases = TAG_DEFINITIONS[canonicalTag]?.aliases ?? []
  return Array.from(new Set([canonicalTag, ...aliases]))
}

export function compareTags(a: string, b: string, locale: Locale) {
  return getTagLabel(a, locale).localeCompare(getTagLabel(b, locale), getCompareLocale(locale), {
    sensitivity: 'base'
  })
}

export function getSortedTags<T extends TaggableEntry>(entries: T[], locale: Locale) {
  return Array.from(new Set(entries.flatMap((entry) => entry.data.tags))).sort((a, b) =>
    compareTags(a, b, locale)
  )
}

export function getTagCounts<T extends TaggableEntry>(entries: T[]) {
  return entries.reduce(
    (counts, entry) => {
      for (const tag of entry.data.tags) {
        counts[tag] = (counts[tag] || 0) + 1
      }
      return counts
    },
    {} as Record<string, number>
  )
}

export function getSortedTagCounts<T extends TaggableEntry>(entries: T[], locale: Locale) {
  return Object.entries(getTagCounts(entries)).sort(
    ([tagA, countA], [tagB, countB]) => countB - countA || compareTags(tagA, tagB, locale)
  )
}

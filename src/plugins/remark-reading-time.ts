import type { Root } from 'mdast'
import type { Plugin } from 'unified'

const CJK_CHARACTER =
  /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u{20000}-\u{2fa1f}]/gu
const NON_CJK_WORD = /[\p{L}\p{N}]+(?:[.'’_-][\p{L}\p{N}]+)*/gu

export interface ReadingTimeOptions {
  cjkCharactersPerMinute?: number
  wordsPerMinute?: number
}

export interface ReadingTimeResult {
  cjkCharacters: number
  displayedMinutes: number
  minutes: number
  words: number
}

function extractText(node: unknown): string {
  if (!node || typeof node !== 'object') return ''

  const { children, value } = node as { children?: unknown[]; value?: unknown }
  const ownText = typeof value === 'string' ? value : ''
  const childText = children?.map(extractText).join(' ') ?? ''
  return `${ownText} ${childText}`
}

export function calculateReadingTime(
  text: string,
  {
    cjkCharactersPerMinute = 350,
    wordsPerMinute = 200
  }: ReadingTimeOptions = {}
): ReadingTimeResult {
  const cjkCharacters = text.match(CJK_CHARACTER)?.length ?? 0
  const nonCjkText = text.replace(CJK_CHARACTER, ' ')
  const words = nonCjkText.match(NON_CJK_WORD)?.length ?? 0
  const minutes = cjkCharacters / cjkCharactersPerMinute + words / wordsPerMinute

  return {
    cjkCharacters,
    displayedMinutes: Math.ceil(minutes),
    minutes,
    words
  }
}

/**
 * Override astro-pure's English-centric reading time with a bilingual estimate.
 * Chinese characters and non-CJK words use separate reading speeds.
 */
export const remarkReadingTime: Plugin<[], Root> = function () {
  return function (tree, { data }) {
    const readingTime = calculateReadingTime(extractText(tree))

    if (data.astro?.frontmatter) {
      data.astro.frontmatter.minutesRead = `${readingTime.displayedMinutes} min read`
      data.astro.frontmatter.words = readingTime.cjkCharacters + readingTime.words
    }
  }
}

export default remarkReadingTime

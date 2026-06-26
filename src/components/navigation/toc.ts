import type { MarkdownHeading } from 'astro'

export interface TocItem {
  depth: number
  slug: string
  text: string
  subheadings: TocItem[]
}

function diveChildren(item: TocItem, depth: number): TocItem[] {
  if (depth === 1 || !item.subheadings.length) return item.subheadings
  return diveChildren(item.subheadings[item.subheadings.length - 1] as TocItem, depth - 1)
}

export function generateToc(rawHeadings: readonly MarkdownHeading[]) {
  const bodyHeadings = rawHeadings.filter(({ depth }) => depth > 1)
  const toc: TocItem[] = []

  bodyHeadings.forEach((h) => {
    const heading: TocItem = { ...h, subheadings: [] }

    if (heading.depth === 2 || !toc.length) {
      toc.push(heading)
      return
    }

    const lastItemInToc = toc[toc.length - 1]!
    const gap = heading.depth - lastItemInToc.depth
    const target = gap > 0 ? diveChildren(lastItemInToc, gap) : toc
    target.push(heading)
  })

  return toc
}

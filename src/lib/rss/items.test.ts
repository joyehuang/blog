import { describe, expect, test } from 'bun:test'

import { includeInRss, mergeRssEntries, rssItemFields, type RssNote, type RssPost } from './items'

const post = (id: string, publishDate: string, extra: Partial<RssPost['data']> = {}): RssPost => ({
  id,
  data: {
    title: `Post ${id}`,
    description: `Description ${id}`,
    publishDate: new Date(publishDate),
    ...extra
  }
})

const note = (id: string, date: string, extra: Partial<RssNote['data']> = {}): RssNote => ({
  id,
  data: {
    title: `Note ${id}`,
    description: `Description ${id}`,
    date: new Date(date),
    ...extra
  }
})

const uiTaste = note('1026-ui-taste', '2026-10-13T00:00:00.000Z', {
  title: '审美不是一个 skill 文件：从组件到产品的三级练法',
  description:
    '从「前端有什么好的设计 skill」出发，把做出好的前端产品倒推成三级：认组件、看成熟产品的 workflow、从产品属性做整体设计。'
})

const sourced = note('1026-moats-after-ai', '2026-10-12T00:00:00.000Z', {
  title: 'AI 之后的技术护城河',
  description: '从 Nikita Bier 的三条看起。',
  source: 'https://x.com/nikitabier/status/2109497987055640958'
})

describe('RSS notes', () => {
  test('published notes are merged with posts, newest date first', () => {
    const entries = mergeRssEntries(
      [post('older', '2026-09-01T00:00:00.000Z'), post('newer', '2026-10-14T00:00:00.000Z')],
      [uiTaste, sourced, note('incomplete-note', '2026-08-01T00:00:00.000Z', { draft: false })],
      true
    )
    const fields = entries.map(rssItemFields)

    expect(fields.map((item) => item.link)).toEqual([
      '/blog/newer',
      '/notes/1026-ui-taste',
      '/notes/1026-moats-after-ai',
      '/blog/older',
      '/notes/incomplete-note'
    ])

    const taste = fields.find((item) => item.link === '/notes/1026-ui-taste')
    expect(taste).toEqual({
      title: uiTaste.data.title,
      description: uiTaste.data.description,
      pubDate: uiTaste.data.date,
      link: '/notes/1026-ui-taste'
    })
  })

  test('frontmatter source is not the item link', () => {
    const [item] = mergeRssEntries([], [sourced], true).map(rssItemFields)
    expect(item?.link).toBe('/notes/1026-moats-after-ai')
    expect(JSON.stringify(item)).not.toContain('x.com')
    expect(item && 'source' in item).toBe(false)
  })

  test('drafts follow the existing production filter', () => {
    const draft = note('secret', '2026-11-01T00:00:00.000Z', { draft: true })
    expect(includeInRss(true, true)).toBe(false)
    expect(includeInRss(false, true)).toBe(true)
    expect(includeInRss(undefined, true)).toBe(true)
    expect(includeInRss(true, false)).toBe(true)

    expect(mergeRssEntries([], [uiTaste, draft], true).map((item) => item.entry.id)).toEqual([
      '1026-ui-taste'
    ])
    expect(mergeRssEntries([], [draft], false).map((item) => item.entry.id)).toEqual(['secret'])
  })

  test('frontmatter date orders the feed, not updatedDate or source', () => {
    const revised = note('revised', '2026-01-01T00:00:00.000Z', {
      updatedDate: new Date('2026-12-01T00:00:00.000Z'),
      source: 'https://example.com/revised'
    })
    const fields = mergeRssEntries([post('may', '2026-05-01T00:00:00.000Z')], [revised], true).map(
      rssItemFields
    )
    expect(fields.map((item) => item.link)).toEqual(['/blog/may', '/notes/revised'])
    expect(fields[1]?.pubDate).toEqual(revised.data.date)
    expect(JSON.stringify(fields[1])).not.toContain('example.com')
  })
})

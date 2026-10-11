import { getCollection } from 'astro:content'

import { personalItems, type SpaceItem } from '@/components/workshop/content'

export type SpaceDocument = SpaceItem & { content: string }

export async function getSpaceContent() {
  const posts = (await getCollection('blog')).filter((p) => !p.data.draft)
  const notes = (await getCollection('notes')).filter((p) => !p.data.draft)
  const selections = [
    {
      id: 'context',
      match: 'frominternshipinterviewstoagentengineering',
      title: '你的判断，\n才是 Context。',
      subtitle: '经验、品味，和你走过的路。',
      tone: 'paper'
    },
    {
      id: 'interview',
      match: 'agentinterviewmindset',
      title: '把自己放到\n真实反馈里。',
      subtitle: '面试、复盘，与持续校准。',
      tone: 'silver'
    }
  ]
  const selected: SpaceItem[] = selections.flatMap((selection) => {
    const post = posts.find((p) => p.id.toLowerCase().includes(selection.match))
    return post
      ? [
          {
            ...selection,
            kind: 'thought' as const,
            label: 'PERSONAL NOTES / A POINT OF VIEW',
            description: post.data.description ?? '',
            href: `/blog/${post.id}`,
            tags: post.data.tags ?? [],
            body: [post.data.description ?? '', `原文：${post.data.title}`],
            related:
              selection.id === 'context'
                ? ['harness', 'community', 'about']
                : ['talks', 'atypica', 'community']
          }
        ]
      : []
  })
  const memory = notes.find((p) => p.id.includes('0526-hermes'))
  if (memory)
    selected.push({
      id: 'memory',
      kind: 'thought',
      label: 'RESEARCH NOTE / MEMORY',
      title: '让一次理解，\n留下来。',
      subtitle: memory.data.title,
      description: memory.data.description ?? '',
      href: `/notes/${memory.id}`,
      tone: 'lime',
      tags: ['记忆', '技术', 'Agent', '研究', '架构'],
      body: [
        memory.data.description ?? '',
        '我的笔记里有原理，也有实现约束：成本、可靠性、检索和持续运行时会遇到的细节。'
      ],
      related: ['minimind', 'harness', 'atypica']
    })
  const items = [...personalItems, ...selected]

  const byHref = new Map(items.map((item) => [item.href, item]))
  const documents: SpaceDocument[] = items.map((item) => ({
    ...item,
    content: item.body.join('\n\n')
  }))
  for (const [collection, entries] of [
    ['blog', posts],
    ['notes', notes]
  ] as const) {
    for (const entry of entries) {
      const href = `/${collection}/${entry.id}`
      const featured = byHref.get(href)
      const content = entry.body ?? entry.data.description ?? ''
      if (featured) {
        documents.find((doc) => doc.id === featured.id)!.content = content
        continue
      }
      documents.push({
        id: `${collection}:${entry.id}`,
        kind: 'thought',
        label: collection === 'blog' ? 'WRITING / FROM THE ARCHIVE' : 'RESEARCH / FIELD NOTES',
        title: entry.data.title,
        subtitle: collection === 'blog' ? '一篇公开的思考。' : '在具体的问题里，继续研究。',
        description: entry.data.description ?? '',
        href,
        tone: collection === 'blog' ? 'paper' : 'mint',
        tags: entry.data.tags ?? [],
        body: [entry.data.description ?? ''],
        related: [],
        content
      })
    }
  }
  return {
    items: documents.map((document) => {
      const { content, ...item } = document
      void content
      return item
    }),
    documents,
    featuredIds: items.map((item) => item.id)
  }
}

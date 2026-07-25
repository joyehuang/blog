import { getCollection } from 'astro:content'
import { teams } from '@/data/agent-teams'
import { getPortfolioRepos } from '@/data/portfolio-repos'

import type { V4Data, V4Item, V4Locale, V4Milestone } from './types'

/**
 * The points on the hero spiral. Each is anchored to a post folder prefix so
 * the link can never drift, and the copy is a one-line gloss of that post.
 */
const MILESTONES: {
  /** Date-stamped folder prefix under `src/content/blog`, or '' for a page. */
  prefix: string
  /** Used when there is no post behind the entry. */
  href?: string
  fallbackDate?: string
  zh: { title: string; note: string }
  en: { title: string; note: string }
}[] = [
  {
    prefix: '20250701',
    zh: { title: '人生中的第一个 PR', note: '给 VisActor / VMind 写的一个单元测试，被 merge 了。' },
    en: {
      title: 'My first pull request',
      note: 'A unit test for VisActor / VMind — and it got merged.'
    }
  },
  {
    prefix: '20251023',
    zh: {
      title: '第一次把面试写成方法',
      note: '国内小厂前端实习面试：投递数据、技术考点、完整准备清单。'
    },
    en: {
      title: 'Turning interviews into a method',
      note: 'Frontend internship rounds in China: the data, the questions, the full prep list.'
    }
  },
  {
    prefix: '20251219',
    zh: {
      title: '从零拆开 Transformer',
      note: 'RMSNorm、RoPE、Attention、FeedForward——四篇把一个 Block 拆到底。'
    },
    en: {
      title: 'Taking the Transformer apart',
      note: 'RMSNorm, RoPE, Attention, FeedForward — four posts down to one full block.'
    }
  },
  {
    prefix: '20260309',
    zh: {
      title: '博客转向 Agent 开发',
      note: '面完近 10 家 AI 创业公司后，写下一份大二实习生的面试修炼手册。'
    },
    en: {
      title: 'The blog turns to agents',
      note: 'After nearly ten AI startup loops: what agent interviews actually test.'
    }
  },
  {
    prefix: '20260410',
    zh: {
      title: '一天读完 11,733 行',
      note: 'OpenHarness 源码精读，从 CLI 启动一路走到 Agent Loop。'
    },
    en: {
      title: '11,733 lines in one day',
      note: 'Reading OpenHarness end to end, from CLI boot to the agent loop.'
    }
  },
  {
    prefix: '20260512',
    zh: {
      title: '坐到面试官那一侧',
      note: '1 小时 19 分钟模拟面试全公开——这次我在提问的一侧。'
    },
    en: {
      title: 'Moving to the other chair',
      note: 'A 79-minute mock interview, published in full — this time I asked the questions.'
    }
  },
  {
    prefix: '20260517',
    zh: {
      title: '1.5 万字入门指南',
      note: '写给所有「想入门 Agent 但不知道从哪开始」的人。'
    },
    en: {
      title: 'A 15,000-word onboarding guide',
      note: 'For everyone who wants to start with agents and has no idea where.'
    }
  },
  {
    prefix: '20260615',
    zh: {
      title: '第一场分享会',
      note: '粉丝群里讲了 45 分钟，PPT 和回放全部公开。'
    },
    en: {
      title: 'The first community talk',
      note: '45 minutes to the reader group — deck and recording both public.'
    }
  },
  {
    prefix: '',
    href: '/agent-teams',
    fallbackDate: '2026.07',
    zh: {
      title: 'Summer of Agents',
      note: '第一届粉丝 Agent 比赛，各队正在开发中。'
    },
    en: {
      title: 'Summer of Agents',
      note: 'The first reader agent competition — teams are building right now.'
    }
  }
]

const formatMonth = (date: Date) =>
  `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}`

/** `joye + 30 位群友` → 30. Attendance is recorded in the talk frontmatter. */
const attendeesFrom = (value?: string) => Number(value?.match(/\d+/)?.[0] ?? 0)

export async function getV4Data(locale: V4Locale): Promise<V4Data> {
  const isEn = locale === 'en'
  const visible = <T extends { data: { draft?: boolean } }>(entry: T) =>
    import.meta.env.PROD ? !entry.data.draft : true

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat(isEn ? 'en-AU' : 'zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date)

  /* --- blog --------------------------------------------------------- */

  const zhPosts = (await getCollection('blog')).filter(visible)
  const enPosts = (await getCollection('blogEn')).filter(
    (post) => visible(post) && post.data.translationKey
  )

  const posts: V4Item[] = (isEn ? enPosts : zhPosts)
    .slice()
    .sort(
      (a, b) =>
        +(b.data.updatedDate ?? b.data.publishDate) - +(a.data.updatedDate ?? a.data.publishDate)
    )
    .slice(0, 6)
    .map((post) => ({
      title: post.data.title,
      href: isEn ? `/en/blog/${post.data.translationKey}` : `/blog/${post.id}`,
      meta: formatDate(post.data.updatedDate ?? post.data.publishDate),
      kind: isEn ? 'Essay' : '长文'
    }))

  /* --- notes -------------------------------------------------------- */

  const zhNotes = (await getCollection('notes')).filter(visible)
  const enNotes = (await getCollection('notesEn')).filter(
    (note) => visible(note) && note.data.translationKey
  )

  const notes: V4Item[] = (isEn ? enNotes : zhNotes)
    .slice()
    .sort((a, b) => +(b.data.updatedDate ?? b.data.date) - +(a.data.updatedDate ?? a.data.date))
    .slice(0, 6)
    .map((note) => ({
      title: note.data.title,
      href: isEn ? `/en/notes/${note.data.translationKey}` : `/notes/${note.id}`,
      meta: formatDate(note.data.updatedDate ?? note.data.date),
      kind: note.data.type
    }))

  /* --- talks -------------------------------------------------------- */

  const talks = (await getCollection('talks')).filter(
    (talk) => visible(talk) && talk.data.status === 'published'
  )

  /* --- milestones --------------------------------------------------- */

  const milestones: V4Milestone[] = MILESTONES.flatMap((entry) => {
    const copy = isEn ? entry.en : entry.zh

    if (!entry.prefix) {
      return [
        { date: entry.fallbackDate ?? '', title: copy.title, note: copy.note, href: entry.href }
      ]
    }

    const post = zhPosts.find((item) => item.id.startsWith(entry.prefix))
    if (!post) return []

    // The English translation lives in the same dated folder.
    const enPost = enPosts.find((item) => item.id.startsWith(entry.prefix))
    const href =
      isEn && enPost?.data.translationKey
        ? `/en/blog/${enPost.data.translationKey}`
        : `/blog/${post.id}`

    return [{ date: formatMonth(post.data.publishDate), title: copy.title, note: copy.note, href }]
  })

  /* --- repos & counts ----------------------------------------------- */

  const repos = (await getPortfolioRepos(locale)).map((repo) => ({
    name: repo.name,
    href: repo.href,
    stars: repo.stars,
    eyebrow: repo.eyebrow,
    description: repo.description
  }))

  return {
    posts,
    notes,
    repos,
    milestones,
    counts: {
      posts: zhPosts.length,
      notes: zhNotes.length,
      talks: talks.length,
      stars: repos.reduce((total, repo) => total + repo.stars, 0),
      teams: teams.length,
      attendees: talks.reduce((total, talk) => total + attendeesFrom(talk.data.attendees), 0)
    }
  }
}

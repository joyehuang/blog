/**
 * "带我逛逛" — an opt-in walk down the home page, offered from the Jojo dock.
 * Each stop is a home section marked `data-jojo-stop="<id>"`; Jojo scrolls to
 * it, outlines it and says one line taken from what the section already says.
 * Only stops that exist on the page are visited (the English home has no
 * Product or Talks).
 */

export type StopId =
  | 'product'
  | 'blog'
  | 'notes'
  | 'talks'
  | 'experience'
  | 'opensource'
  | 'education'
  | 'skills'

export interface Stop {
  id: StopId
  title: string
  line: string
}

export const STOP_ORDER: readonly StopId[] = [
  'product',
  'blog',
  'notes',
  'talks',
  'experience',
  'opensource',
  'education',
  'skills'
]

const LINES: Record<'zh' | 'en', Record<StopId, { title: string; line: string }>> = {
  zh: {
    product: {
      title: '面试手记',
      line: 'Joye 的新企划：158 道真题一字不删，连答砸的都有，逐字稿回放一场面试真实的样子。'
    },
    blog: { title: 'Blog', line: '最新的几篇博客在这儿，更多的都在 Blog 页。' },
    notes: { title: 'Notes', line: '比博客更短的东西：笔记、片段、草稿和想法。' },
    talks: {
      title: 'Talks',
      line: '群里每周一次的线上交流会，每期的内容和幻灯片都沉淀在这里。'
    },
    experience: {
      title: 'Experience',
      line: '做过的地方：Adastra Labs、特赞、AIXCut 和 fAIshion.ai，每张卡片都能点开看产品。'
    },
    opensource: { title: 'Open Source', line: 'Joye 在 GitHub 上的开源项目，旁边是星数。' },
    education: { title: 'Education', line: '墨尔本大学，计算与软件工程，2024 – 2027。' },
    skills: { title: 'Skills', line: '最后是技能栈：语言、前端、后端、AI 与 Agent，还有常用工具。' }
  },
  en: {
    product: {
      title: 'Interview Notes',
      line: "Joye's new project: 158 real interview questions, unedited, bad answers included."
    },
    blog: { title: 'Blog', line: 'The latest posts. The rest live on the Blog page.' },
    notes: { title: 'Notes', line: 'The shorter stuff: notes, snippets, drafts and ideas.' },
    talks: {
      title: 'Talks',
      line: 'A weekly online meetup; every session and its slides are here.'
    },
    experience: {
      title: 'Experience',
      line: 'Where Joye has worked: Adastra Labs, Tezign, AIXCut and fAIshion.ai. Each card links to the product.'
    },
    opensource: {
      title: 'Open Source',
      line: "Joye's open-source projects on GitHub, with their stars."
    },
    education: {
      title: 'Education',
      line: 'University of Melbourne, Computing & Software Systems, 2024 – 2027.'
    },
    skills: {
      title: 'Skills',
      line: 'Last, the toolbox: languages, frontend, backend, AI & agents, and tools.'
    }
  }
}

export const GUIDE_END = {
  zh: '逛完啦～想聊聊的话，顶部有 Connect Me；有事随时戳我。',
  en: "That's the tour! Want to talk? Connect Me is up top, and I'm here if you need me."
} as const

const isStop = (id: string): id is StopId => (STOP_ORDER as readonly string[]).includes(id)

/** the stops on this page, in page order, each once */
export function guideStops(pageIds: readonly string[], lang: 'zh' | 'en'): Stop[] {
  const seen = new Set<StopId>()
  const out: Stop[] = []
  for (const id of pageIds) {
    if (!isStop(id) || seen.has(id)) continue
    seen.add(id)
    out.push({ id, ...LINES[lang][id] })
  }
  return out
}

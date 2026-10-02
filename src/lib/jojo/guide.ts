import type { EmotionId } from '@jojo-web/runtime'

/**
 * "带我逛逛" — an opt-in walk down the home page, offered from the Jojo dock.
 * Each stop is a home section marked `data-jojo-stop="<id>"`; Jojo flies to
 * it, lands on its top edge and talks about it in one or more short bubbles,
 * in the mood that section deserves. The lines say what a visitor would not
 * get from skimming the section (Joye's views, what a repo is really for),
 * taken from Joye's own posts and repos. Only stops that exist on the page
 * are visited (the English home has no Product or Talks).
 */

export type StopId =
  | 'product'
  | 'blog'
  | 'talks'
  | 'experience'
  | 'opensource'
  | 'education'
  | 'skills'

export interface Stop {
  id: StopId
  title: string
  /** bubbles, one after another */
  lines: string[]
  /** Jojo's face while it talks about this stop */
  mood: EmotionId
  /** an outbound link offered in the bubble */
  link?: { href: string; label: string }
}

/** how Jojo feels about each stop */
export const MOODS: Record<StopId, EmotionId> = {
  product: 'smug',
  blog: 'think',
  talks: 'laugh',
  experience: 'focus',
  opensource: 'happy',
  education: 'shy',
  skills: 'celebrate'
}

export const STOP_ORDER: readonly StopId[] = [
  'product',
  'blog',
  'talks',
  'experience',
  'opensource',
  'education',
  'skills'
]

export const BILIBILI = 'https://space.bilibili.com/3546914882587480'

type Copy = Omit<Stop, 'id' | 'mood'>
const LINES: Record<'zh' | 'en', Record<StopId, Copy>> = {
  zh: {
    product: {
      title: '面试手记',
      lines: ['Joye 的新企划：158 道面试真题一字不删，答砸的也留着。']
    },
    blog: {
      title: 'Blog',
      lines: [
        'Joye 的 Agent 观：模型负责智能，Harness 负责其余一切。',
        '安全靠代码，不靠提示词：权限跟着请求走，不跟着机器走。',
        '最近在想：让 Agent 从工具变成能长期一起做事的伙伴。'
      ]
    },
    talks: {
      title: '直播',
      lines: [
        '每周分享改成了 B 站直播：像线上自习室，Joye 写代码、读文档，你可以一起学、随时提问。'
      ],
      link: { href: BILIBILI, label: '去 B 站' }
    },
    experience: {
      title: 'Experience',
      lines: ['做过 Playyy.ai、atypica、AIXCut 和 fAIshion.ai，卡片都能点开看产品。']
    },
    opensource: {
      title: 'Open Source',
      lines: [
        'Learn-Open-Harness：OpenHarness 开源次日做的教程，把 Agent 外壳拆成循环、工具、权限和多 Agent。',
        'minimind-notes 往里再拆一层：从零训一个小模型，用对照实验看每个训练设计为什么这么选。'
      ]
    },
    education: {
      title: 'Education',
      lines: ['墨尔本大学，计算与软件工程，2024 – 2027。']
    },
    skills: {
      title: 'Skills',
      lines: ['技能栈：语言、前后端、AI 与 Agent、常用工具。']
    }
  },
  en: {
    product: {
      title: 'Interview Notes',
      lines: ["Joye's new project: 158 real interview questions, unedited, flops included."]
    },
    blog: {
      title: 'Blog',
      lines: [
        "Joye's take on agents: the model brings the intelligence; the harness does everything else.",
        'Safety lives in code, not prompts: permissions follow the request, not the machine.',
        'Lately: turning an agent from a tool into a partner for the long run.'
      ]
    },
    talks: {
      title: 'Live',
      lines: [
        'The weekly talks became Bilibili live streams: a study room where Joye codes and you can ask anything.'
      ],
      link: { href: BILIBILI, label: 'Bilibili' }
    },
    experience: {
      title: 'Experience',
      lines: ['Playyy.ai, atypica, AIXCut, fAIshion.ai. Each card opens the product.']
    },
    opensource: {
      title: 'Open Source',
      lines: [
        'Learn-Open-Harness, built the day after OpenHarness launched, takes the agent harness apart: loop, tools, permissions, multi-agent.',
        'minimind-notes goes one layer down: train a small LLM from scratch, with controlled experiments for each design choice.'
      ]
    },
    education: {
      title: 'Education',
      lines: ['University of Melbourne, Computing & Software Systems, 2024 – 2027.']
    },
    skills: {
      title: 'Skills',
      lines: ['The toolbox: languages, frontend, backend, AI & agents, tools.']
    }
  }
}

/** the closing bubble, with the way to swap friend links */
export const GUIDE_END = {
  zh: {
    line: '逛完啦。想交换友链，去 Links 页留言；想聊聊，点顶部的 Connect Me。',
    links: { href: '/links#apply-links', label: '去加友链' }
  },
  en: {
    line: "That's the tour. Swap links on the Links page, or say hi via Connect Me up top.",
    links: { href: '/en/links#apply-links', label: 'Add a link' }
  }
} as const

const isStop = (id: string): id is StopId => (STOP_ORDER as readonly string[]).includes(id)

/** the stops on this page, in page order, each once */
export function guideStops(pageIds: readonly string[], lang: 'zh' | 'en'): Stop[] {
  const seen = new Set<StopId>()
  const out: Stop[] = []
  for (const id of pageIds) {
    if (!isStop(id) || seen.has(id)) continue
    seen.add(id)
    out.push({ id, ...LINES[lang][id], mood: MOODS[id] })
  }
  return out
}

import type { EmotionId, StatusId } from '@jojo-web/runtime'

/**
 * "带我逛逛" — an opt-in onboarding walk down the home page, offered from the
 * Jojo dock. Each stop is a home section marked `data-jojo-stop="<id>"`; Jojo
 * flies to it, lands on its top edge and talks the visitor through it in a few
 * bubbles. The bubbles carry what the section itself does not say — which
 * post to start with for your situation, what Notes and Lab are, what each
 * product actually is — taken from Joye's posts and notes, the Lab entries and
 * the products' own sites. Only stops that exist on the page are visited (the
 * English home has no Product or Talks).
 */

export type StopId = 'product' | 'blog' | 'notes' | 'talks' | 'experience'

export interface Bubble {
  text: string
  /** Jojo's face for this bubble (else the stop's) */
  mood?: EmotionId
  /** a status signal Jojo shows while saying it */
  status?: StatusId
  link?: { href: string; label: string; external?: boolean }
}

export interface Stop {
  id: StopId
  title: string
  bubbles: Bubble[]
  /** Jojo's face while it talks about this stop */
  mood: EmotionId
}

export const STOP_ORDER: readonly StopId[] = ['product', 'blog', 'notes', 'talks', 'experience']

const MOODS: Record<StopId, EmotionId> = {
  product: 'smug',
  blog: 'think',
  notes: 'curious',
  talks: 'happy',
  experience: 'focus'
}

export const BILIBILI = 'https://space.bilibili.com/3546914882587480'
const post = (lang: 'zh' | 'en', slug: string) => `${lang === 'en' ? '/en' : ''}/blog/${slug}/post`
const site = (href: string, label: string) => ({ href, label, external: true })

type Copy = Omit<Stop, 'id' | 'mood'>
const COPY: Record<'zh' | 'en', Partial<Record<StopId, Copy>>> = {
  zh: {
    product: {
      title: '面试手记',
      bubbles: [
        {
          text: '先说 Joye 正在做的新东西「面试手记」。2026 年求职季面了 100 多家 Agent 岗位，Joye 挑出其中几场，把整场对话整理成逐字稿公开。'
        },
        {
          text: '它和普通面经不一样：面试官怎么追问、哪里卡壳、哪里答砸了，都原样留着。每场配完整 JD 和一份 5 分钟精华，也能按 Agent 架构、场景题、项目深挖这些主题刷。',
          mood: 'laugh'
        },
        {
          text: '还没上线，免费，可以先留邮箱预约。你要是也面过 Agent 岗，上线后能投稿，署你的名。',
          mood: 'happy',
          link: site('https://joyehuang.dev', '去预约')
        }
      ]
    },
    blog: {
      title: 'Blog',
      bubbles: [
        {
          text: '博客这一年主要在写 Agent 工程，分三条线：怎么入门、Agent 产品底下的 Harness 怎么搭、怎么找 Agent 相关的工作。按你的情况挑一条读就好。'
        },
        {
          text: '刚想入门的话，先读《写给所有"想入门 Agent"的人》：1.8 万字，从 Agent 是什么、为什么是现在，一路讲到怎么入门和求职，适合当地图用。',
          mood: 'happy',
          link: { href: post('zh', '20260517---agentonboardingguide'), label: '读入门指南' }
        },
        {
          text: '想知道 Agent 产品底下怎么搭，先读权限隔离那篇：Joye 用自己的个人 Agent 和 800 人群里的 QQ bot 举例，讲一条请求要过的五道检查，每道怎么设计、常见错在哪。',
          mood: 'focus',
          link: { href: post('zh', '20260912---agentpermissionisolation'), label: '读权限隔离' }
        },
        {
          text: '接着读《三种协作尺度》：从 Codex 负责人的一段播客说起，讲模型变强以后，哪些 Harness 会被模型学走，哪些反而会越做越大。',
          mood: 'think',
          link: { href: post('zh', '20260912---codexharnessevolution'), label: '读协作尺度' }
        },
        {
          text: '还有一篇更个人的：Joye 给自己的 Agent 开了独立邮箱，又接上支付授权、记忆和 QQ 分身，聊怎么把它从一次性工具，慢慢变成能长期共事的同伴。',
          mood: 'shy',
          link: { href: post('zh', '20260914-agent-email-chatgpt'), label: '读这篇' }
        },
        {
          text: '在准备 Agent 岗面试的话，先看《面试不是考试，是双向选择》：Joye 面了 100 多家之后，讲为什么要早投简历、录音复盘、认真反问，怎么和创始人聊到同一张桌子上。',
          mood: 'laugh',
          link: { href: post('zh', '20260523---agentinterviewmindset'), label: '读面试心态' }
        },
        {
          text: '再看那两篇模拟面试复盘：每道题、候选人的回答、Joye 的点评，还有 Joye 自己会怎么答，都摊开写了。',
          mood: 'smug',
          link: { href: post('zh', '20260512---agentmockinterview'), label: '看模拟面试' }
        }
      ]
    },
    notes: {
      title: 'Notes',
      bubbles: [
        {
          text: 'Notes 和博客不一样：博客是想清楚了才写的长文，这里是 Joye 研究一个东西时整理的笔记，更短，也更贴近工程细节。'
        },
        {
          text: '比如拆 Hermes Agent 的记忆系统：不用向量库，靠 SQLite 全文搜索加 LLM 摘要分四层；还有 Prompt Caching、RAG 检索这些专题。',
          mood: 'focus',
          link: { href: '/notes', label: '看全部笔记' }
        },
        {
          text: '顺便说下顶部导航里的 Lab：那里是前端小样，排版、布局、动效、交互里那些「其实可以更好」的小技巧，每条都能直接上手玩，再配一段为什么。',
          mood: 'happy',
          link: { href: '/lab', label: '去 Lab 玩玩' }
        },
        {
          text: '比如跳动的数字为什么要用等宽数字、加载提示为什么要晚一点出现。还有一条是 Joye 给我设计状态信号时想明白的：一个状态一个形状，动一下就停。',
          mood: 'smug',
          status: 'working'
        }
      ]
    },
    talks: {
      title: '直播',
      bubbles: [
        {
          text: '以前这里是群里每周一次的分享，现在改成在 B 站直播了。往期的分享和幻灯片还在下面，点「全部分享」能回看。'
        },
        {
          text: '直播不一定每次都有主题，更像一个线上自习室：Joye 写代码、读文档、做项目，你可以一起学、随时提问，也可以挂着各忙各的。一个人学容易焦虑，一群人一起会轻松很多。',
          mood: 'laugh',
          link: site(BILIBILI, '去 B 站看看')
        }
      ]
    },
    experience: {
      title: 'Experience',
      bubbles: [
        {
          text: '这四段都在做 AI 产品。先说 Playyy.ai：石墨文档出海团队做的 AI 设计画布，用一句话或几张参考图生成营销图，生成后图层还能接着改，一整套素材也能保持同一个品牌风格。',
          link: site('https://playyy.ai/', 'Playyy.ai')
        },
        {
          text: 'atypica 是特赞的商业研究产品：用真实行为数据搭出一批 AI 消费者，品牌和咨询团队可以去访谈它们、开焦点小组、测新概念，最后拿到研究报告。底下是一套 Multi-Agent 系统。',
          mood: 'think',
          link: site('https://atypica.ai/', 'atypica.ai')
        },
        {
          text: 'AIXCut 是网页上的 AI 剪辑工具，用脚本驱动剪辑；时间线能导出成 Final Cut、Premiere、达芬奇或 CapCut 的工程接着精修。Joye 参与做了里面的剪辑 Agent。',
          mood: 'curious',
          link: site('https://aixcut.cn/', 'aixcut.cn')
        },
        {
          text: 'fAIshion.ai 是 AI 穿搭助手：上传照片和身材数据，把各家店的衣服收进一个数字衣橱，它按场合帮你搭，还能虚拟试穿看效果。',
          mood: 'happy',
          link: site('https://www.faishion.ai/', 'fAIshion.ai')
        }
      ]
    }
  },
  en: {
    blog: {
      title: 'Blog',
      bubbles: [
        {
          text: 'This year Joye has mostly written about agent engineering, along three threads: getting started, how the harness under an agent product is built, and landing an agent job. Pick the one that fits you.'
        },
        {
          text: 'New to agents? Start with the beginner’s guide. It runs from what an agent is and why now, all the way to how to get in and get hired, so you can use it as a map.',
          mood: 'happy',
          link: { href: post('en', '20260517---agentonboardingguide'), label: 'Read the guide' }
        },
        {
          text: "The newest harness posts are in Chinese for now: the five checks a request should pass, which parts of a harness models will absorb and which keep growing, and giving Joye's own agent an inbox.",
          mood: 'think',
          link: { href: post('zh', '20260912---agentpermissionisolation'), label: 'Read (Chinese)' }
        },
        {
          text: 'Preparing for agent interviews? Start with “Interviews are a two-way choice”: after 100+ agent interviews, why Joye applies early, records and reviews every round, asks real questions back, and talks with founders as a peer.',
          mood: 'laugh',
          link: { href: post('en', '20260523---agentinterviewmindset'), label: 'Read it' }
        },
        {
          text: "Then the two mock-interview write-ups lay out every question, the candidate's answer, the feedback, and how Joye would answer it.",
          mood: 'smug',
          link: { href: post('en', '20260512---agentmockinterview'), label: 'Read one' }
        }
      ]
    },
    notes: {
      title: 'Notes',
      bubbles: [
        {
          text: 'Notes are different from the blog: posts are written once an idea is settled; notes are what Joye writes while digging into something. Shorter, and closer to the engineering.'
        },
        {
          text: "For example: how Hermes Agent's memory works in four layers with SQLite full-text search and LLM summaries instead of a vector store, how to design for prompt caching, the details of RAG retrieval.",
          mood: 'focus',
          link: { href: '/en/notes', label: 'All notes' }
        },
        {
          text: 'And Lab, up in the menu, is a set of small frontend demos: typography, layout, motion and interaction tips you can play with, each with a why. Written in Chinese, but the demos speak for themselves.',
          mood: 'happy',
          link: { href: '/lab', label: 'Open Lab' }
        }
      ]
    },
    experience: {
      title: 'Experience',
      bubbles: [
        {
          text: "All four are AI products. Playyy.ai, from Shimo Docs' global team, is an AI design canvas: make marketing images from a sentence or a few references, keep editing the layers, and keep a whole campaign on-brand.",
          link: site('https://playyy.ai/', 'Playyy.ai')
        },
        {
          text: "atypica, at Tezign, is for business research: it builds AI consumers from real behavioral data, so brands can interview them, run focus groups, test concepts and get a report. There's a multi-agent system underneath.",
          mood: 'think',
          link: site('https://atypica.ai/', 'atypica.ai')
        },
        {
          text: 'AIXCut is a script-driven video editor in the browser; the timeline exports to Final Cut, Premiere, DaVinci or CapCut for finishing. Joye worked on its editing agent.',
          mood: 'curious',
          link: site('https://aixcut.cn/', 'aixcut.cn')
        },
        {
          text: 'fAIshion.ai is an AI stylist: add a photo and your sizes, collect clothes from different stores into one wardrobe, get outfits for the occasion and try them on virtually.',
          mood: 'happy',
          link: site('https://www.faishion.ai/', 'fAIshion.ai')
        }
      ]
    }
  }
}

/** the closing bubble, with the way to swap friend links */
export const GUIDE_END = {
  zh: {
    line: '就逛到这儿。想交换友链，去 Links 页按格式留言就行；想找 Joye 聊，点顶部的 Connect Me。',
    links: { href: '/links#apply-links', label: '去加友链' }
  },
  en: {
    line: "That's the tour. To swap links, leave a note on the Links page; to talk to Joye, hit Connect Me up top.",
    links: { href: '/en/links#apply-links', label: 'Add a link' }
  }
} as const

const isStop = (id: string): id is StopId => (STOP_ORDER as readonly string[]).includes(id)

/** the stops on this page that have something to say, in page order, each once */
export function guideStops(pageIds: readonly string[], lang: 'zh' | 'en'): Stop[] {
  const seen = new Set<StopId>()
  const out: Stop[] = []
  for (const id of pageIds) {
    if (!isStop(id) || seen.has(id)) continue
    const copy = COPY[lang][id]
    if (!copy) continue
    seen.add(id)
    out.push({ id, ...copy, mood: MOODS[id] })
  }
  return out
}

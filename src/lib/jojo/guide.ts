import type { EmotionId } from '@jojo-web/runtime'

/**
 * "带我逛逛" — an opt-in onboarding walk down the home page, offered from the
 * Jojo dock. Each stop is a home section marked `data-jojo-stop="<id>"`; Jojo
 * flies to it, lands on its top edge and talks the visitor through it in a few
 * bubbles. The bubbles carry what the section itself does not say — which
 * post to start with for your situation, what each product actually is, what
 * a repo lets you do beyond its one-line card — taken from Joye's posts, the
 * products' own sites and the repos' READMEs. Only stops that exist on the
 * page are visited (the English home has no Product or Talks).
 */

export type StopId = 'product' | 'blog' | 'talks' | 'experience' | 'opensource'

export interface Bubble {
  text: string
  /** Jojo's face for this bubble (else the stop's) */
  mood?: EmotionId
  link?: { href: string; label: string; external?: boolean }
}

export interface Stop {
  id: StopId
  title: string
  bubbles: Bubble[]
  /** Jojo's face while it talks about this stop */
  mood: EmotionId
}

export const STOP_ORDER: readonly StopId[] = [
  'product',
  'blog',
  'talks',
  'experience',
  'opensource'
]

const MOODS: Record<StopId, EmotionId> = {
  product: 'smug',
  blog: 'think',
  talks: 'happy',
  experience: 'focus',
  opensource: 'happy'
}

export const BILIBILI = 'https://space.bilibili.com/3546914882587480'
const post = (lang: 'zh' | 'en', slug: string) => `${lang === 'en' ? '/en' : ''}/blog/${slug}/post`

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
          link: { href: 'https://joyehuang.dev', label: '去预约', external: true }
        }
      ]
    },
    blog: {
      title: 'Blog',
      bubbles: [
        {
          text: '博客这一年主要在写 Agent 工程，分三条线：怎么入门、Agent 底下的 Harness 怎么搭、怎么找 Agent 相关的工作。按你的情况挑一条读就好。'
        },
        {
          text: '刚想入门的话，先读《写给所有"想入门 Agent"的人》：1.8 万字，从 Agent 是什么、为什么是现在，一路讲到怎么入门和求职，适合当地图用。',
          mood: 'happy',
          link: { href: post('zh', '20260517---agentonboardingguide'), label: '读入门指南' }
        },
        {
          text: '想知道 Agent 底下怎么跑，先读《花一天读完 OpenHarness》，再读权限隔离那篇：Joye 用自己的个人 Agent 和 800 人群里的 QQ bot，讲一条请求要过的五道检查。',
          mood: 'focus',
          link: { href: post('zh', '20260410---openharnessphase1'), label: '从这篇读起' }
        },
        {
          text: '在准备 Agent 岗面试的话，看那两篇模拟面试复盘：每道题、候选人的回答、Joye 的点评，还有 Joye 自己会怎么答，都摊开写了。',
          mood: 'smug',
          link: { href: post('zh', '20260512---agentmockinterview'), label: '看模拟面试' }
        },
        {
          text: '想往模型里面看一层，去年底还有个 Transformer 原理系列：归一化、RoPE、Attention、FeedForward，四篇读完能自己拼出一个完整的 Block。',
          mood: 'curious',
          link: { href: post('zh', '20251216---normalization'), label: '从第一篇读起' }
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
          link: { href: BILIBILI, label: '去 B 站看看', external: true }
        }
      ]
    },
    experience: {
      title: 'Experience',
      bubbles: [
        {
          text: '这四段都在做 AI 产品。先说 Playyy.ai：石墨文档出海团队做的 AI 设计画布，用一句话或几张参考图生成营销图，生成后图层还能接着改，一整套素材也能保持同一个品牌风格。'
        },
        {
          text: 'atypica 是特赞的商业研究产品：用真实行为数据搭出一批 AI 消费者，品牌和咨询团队可以去访谈它们、开焦点小组、测新概念，最后拿到研究报告。底下是一套 Multi-Agent 系统。',
          mood: 'think'
        },
        {
          text: 'AIXCut 是网页上的 AI 剪辑工具，用脚本驱动剪辑；时间线能导出成 Final Cut、Premiere、达芬奇或 CapCut 的工程接着精修。Joye 参与做了里面的剪辑 Agent。',
          mood: 'curious'
        },
        {
          text: 'fAIshion.ai 是 AI 穿搭助手：上传照片和身材数据，把各家店的衣服收进一个数字衣橱，它按场合帮你搭，还能虚拟试穿看效果。',
          mood: 'happy'
        }
      ]
    },
    opensource: {
      title: 'Open Source',
      bubbles: [
        {
          text: 'Learn-Open-Harness 是 HKUDS 开源 OpenHarness 的第二天就做出来的：把它 1.1 万多行的 Harness 代码，拆成 12 章零基础也能跟的交互教程。',
          mood: 'smug'
        },
        {
          text: '里面能直接上手：看 Agent Loop 一步步转，在权限沙盒里试三层权限会拦下什么，每章还有小测验。它和博客里那篇 OpenHarness 是一对，一篇读源码，一个陪你动手。',
          mood: 'laugh',
          link: {
            href: 'https://learn-openharness.vercel.app',
            label: '在线体验',
            external: true
          }
        },
        {
          text: 'minimind-notes 往模型里走：每个设计选择都用对照实验回答"不这样做会怎样"。比如去掉归一化，训练约 500 步就出 NaN；Pre-LN + RMSNorm 最稳，也是现在大模型的标配。',
          mood: 'focus'
        },
        {
          text: '实验基于 MiniMind，在笔记本 CPU 上几分钟就能跑完，文档放在 minimind.wiki；它和博客里的 Transformer 系列讲的是同一套组件，可以对着读。',
          mood: 'happy',
          link: { href: 'https://minimind.wiki', label: '看文档', external: true }
        }
      ]
    }
  },
  en: {
    blog: {
      title: 'Blog',
      bubbles: [
        {
          text: 'This year Joye has mostly written about agent engineering, along three threads: getting started, how the harness under an agent works, and landing an agent job. Pick the one that fits you.'
        },
        {
          text: 'New to agents? Start with the beginner’s guide. It runs from what an agent is and why now, all the way to how to get in and get hired, so you can use it as a map.',
          mood: 'happy',
          link: { href: post('en', '20260517---agentonboardingguide'), label: 'Read the guide' }
        },
        {
          text: 'Curious what actually runs under an agent? Start with the post on reading OpenHarness in a day: Joye reads the core of an 11,733-line harness, from CLI startup to the agent loop.',
          mood: 'focus',
          link: { href: post('en', '20260410---openharnessphase1'), label: 'Start here' }
        },
        {
          text: "Preparing for agent interviews? The two mock-interview write-ups lay out every question, the candidate's answer, the feedback, and how Joye would answer it.",
          mood: 'smug',
          link: { href: post('en', '20260512---agentmockinterview'), label: 'Read one' }
        },
        {
          text: 'Want to look inside the model? Late last year Joye wrote a Transformer series: normalization, RoPE, attention, feed-forward. Together they add up to a full block.',
          mood: 'curious',
          link: { href: post('en', '20251216---normalization'), label: 'Start the series' }
        }
      ]
    },
    experience: {
      title: 'Experience',
      bubbles: [
        {
          text: "All four are AI products. Playyy.ai, from Shimo Docs' global team, is an AI design canvas: make marketing images from a sentence or a few references, keep editing the layers, and keep a whole campaign on-brand."
        },
        {
          text: "atypica, at Tezign, is for business research: it builds AI consumers from real behavioral data, so brands can interview them, run focus groups, test concepts and get a report. There's a multi-agent system underneath.",
          mood: 'think'
        },
        {
          text: 'AIXCut is a script-driven video editor in the browser; the timeline exports to Final Cut, Premiere, DaVinci or CapCut for finishing. Joye worked on its editing agent.',
          mood: 'curious'
        },
        {
          text: 'fAIshion.ai is an AI stylist: add a photo and your sizes, collect clothes from different stores into one wardrobe, get outfits for the occasion and try them on virtually.',
          mood: 'happy'
        }
      ]
    },
    opensource: {
      title: 'Open Source',
      bubbles: [
        {
          text: 'Learn-Open-Harness was built the day after HKUDS open-sourced OpenHarness: its ~11,700 lines of harness code, turned into 12 interactive chapters anyone can follow.',
          mood: 'smug'
        },
        {
          text: "It's hands-on: watch the agent loop turn, see what three permission tiers block in a sandbox, take a quiz every chapter. It pairs with the OpenHarness post: one reads the source, the other gets you playing.",
          mood: 'laugh',
          link: {
            href: 'https://learn-openharness.vercel.app',
            label: 'Try it live',
            external: true
          }
        },
        {
          text: 'minimind-notes goes into the model, answering each design choice with a controlled experiment: drop normalization and training hits NaN around step 500; Pre-LN + RMSNorm is the most stable, which is why modern LLMs use it.',
          mood: 'focus'
        },
        {
          text: "The experiments build on MiniMind and run on a laptop CPU in minutes, with docs at minimind.wiki. They cover the same components as the blog's Transformer series, so read them side by side.",
          mood: 'happy',
          link: { href: 'https://minimind.wiki', label: 'Docs', external: true }
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

export type SpaceKind = 'work' | 'thought' | 'people' | 'self'
export type SpaceItem = {
  id: string
  kind: SpaceKind
  label: string
  title: string
  subtitle: string
  description: string
  href: string
  image?: string
  tone: string
  tags: string[]
  body: string[]
  related: string[]
}

export const personalItems: SpaceItem[] = [
  {
    id: 'playyy',
    kind: 'work',
    label: 'ADASTRA LABS / PRODUCT ENGINEERING',
    title: 'Playyy',
    subtitle: '让 AI 进入真实的创作过程。',
    description:
      '品牌感知的 AI 图像工作台。参与产品与工程研发，把品牌上下文、生成和迭代放进同一个创作界面。',
    href: 'https://playyy.ai/',
    image: '/images/landing/playyy-ui.png',
    tone: 'lavender',
    tags: ['产品', 'AI', '全栈', '图像', '作品'],
    body: [
      '我在 Adastra Labs 参与 Playyy 的产品与工程研发。它把品牌上下文、图像生成和持续迭代放进同一个创作工作区。',
      '对我来说，Agent 工程的落点是人能使用的产品：理解需求、组织上下文、把结果交付出来。'
    ],
    related: ['atypica', 'aixcut', 'product-form']
  },
  {
    id: 'atypica',
    kind: 'work',
    label: 'TEZIGN / MULTI-AGENT',
    title: 'atypica',
    subtitle: '把研究问题，交给一组 Agent。',
    description: '商业研究多智能体系统。在特赞参与 Interview Agent、Persona 访谈与相关工程研发。',
    href: 'https://atypica.ai/',
    image: '/images/landing/atypica-site-light.webp',
    tone: 'mint',
    tags: ['产品', 'AI', '工程', '访谈', '多智能体'],
    body: [
      '在 Tezign AIGC 研发团队，我参与商业研究方向的 Multi-Agent 系统，工作涉及 Persona 访谈、上下文组织与工具调用。',
      '真实项目也反过来影响我的写作：面试中被追问的设计决策，往往正是系统运行时需要认真处理的问题。'
    ],
    related: ['playyy', 'memory', 'interview']
  },
  {
    id: 'aixcut',
    kind: 'work',
    label: 'AIXCUT / CREATIVE TOOLS',
    title: 'AIXCut',
    subtitle: '从意图，到剪辑。',
    description: '参与 AI 视频剪辑 Agent 的设计与工程化落地。',
    href: 'https://aixcut.cn/',
    image: '/images/landing/aixcut-site-light.webp',
    tone: 'silver',
    tags: ['产品', '视频', 'AI', '全栈'],
    body: [
      '参与 Agent 辅助视频剪辑产品与全栈流程，围绕脚本、素材组织和剪辑定位推进工作。',
      '创作工具的交互尤其有意思：用户表达的往往是一种想要的效果，产品需要把它承接成可调整、可交付的结果。'
    ],
    related: ['playyy', 'product-form']
  },
  {
    id: 'harness',
    kind: 'work',
    label: 'OPEN SOURCE / LEARNING BY BUILDING',
    title: 'Learn\nOpen Harness',
    subtitle: '把理解，做成可以探索的教程。',
    description: 'OpenHarness 零基础交互式教程，涵盖 Agent Loop、Tools、Memory 与 Multi-Agent。',
    href: 'https://github.com/joyehuang/Learn-Open-Harness',
    tone: 'lime',
    tags: ['开源', '源码', '教程', 'Agent', '学习'],
    body: [
      '从读真实 Agent Harness 的源码开始，把理解整理成可以继续探索的教程。',
      '我喜欢把学习留下痕迹：能走读的代码、可以对照的图解，以及别人能接着用的东西。'
    ],
    related: ['minimind', 'context', 'community']
  },
  {
    id: 'minimind',
    kind: 'work',
    label: 'OPEN SOURCE / UNDER THE HOOD',
    title: 'MiniMind\nNotes',
    subtitle: '往模型里面，再走一步。',
    description: '从 Transformer 到训练流程的学习注解、原理解释与对照实验。',
    href: 'https://github.com/joyehuang/minimind-notes',
    tone: 'paper',
    tags: ['开源', 'LLM', '模型', '学习', 'Transformer'],
    body: [
      '学习 MiniMind 时，我把核心技术点整理成注解仓库，并写了归一化、RoPE、Attention 和 FeedForward 四篇文章。',
      '通过代码、图解和动手实验，把“听过这个词”推进到理解它为什么这样工作。'
    ],
    related: ['harness', 'memory']
  },
  {
    id: 'community',
    kind: 'people',
    label: 'SUMMER OF AGENTS / COMMUNITY',
    title: '一起，\n做点东西。',
    subtitle: '第一届 Joye 粉丝 Agent 比赛',
    description: '从交流到组队，把想法带到真实项目里。',
    href: '/agent-teams',
    tone: 'orange',
    tags: ['社群', '比赛', '活动', '朋友', '一起', '交流'],
    body: [
      '我在社群里发起了 Summer of Agents。大家可以选赛道，也可以带着自己的想法组队。',
      '游戏、个人助手、面试转录、个人电台……交流可以从一个问题开始，也可以继续变成一起做一个东西。'
    ],
    related: ['talks', 'harness', 'interview']
  },
  {
    id: 'talks',
    kind: 'people',
    label: 'OPEN CONVERSATIONS / TALKS',
    title: '把思考，\n拿出来聊。',
    subtitle: '技术、产品，以及这一行正在发生的事。',
    description: '社群线上分享会，讲稿、幻灯片和回放公开。',
    href: '/talks',
    tone: 'paper',
    tags: ['交流', '分享', '视频', '社群', '朋友'],
    body: [
      '第一期聊从实习面试到 Agent 开发，第二期从一场面试反推 AI 时代的产品形态。',
      '我把讲稿、幻灯片和回放放在网站上，让交流之后留下可继续讨论的内容。'
    ],
    related: ['product-form', 'community', 'context']
  },
  {
    id: 'product-form',
    kind: 'thought',
    label: 'A POINT OF VIEW / TALK 02',
    title: '别盯着 Agent。\n盯产品形态。',
    subtitle: '写出一个 Agent 之后，用户为什么要用它？',
    description: '从一场面试出发，讨论意图、交互、垂类上下文与产品的未来。',
    href: '/talks',
    tone: 'mint',
    tags: ['观点', '产品', 'AI', '交互', '判断'],
    body: [
      '第二期分享从一家“文档协作 → AI 版 Canva”公司的面试出发，讨论软件怎样承接用户意图。',
      '我关心的是用户为什么要用这个产品，以及它积累了怎样的领域上下文、工作流和交付能力。'
    ],
    related: ['playyy', 'aixcut', 'talks']
  },
  {
    id: 'lab',
    kind: 'thought',
    label: 'INTERACTION STUDY / LAB',
    title: '层级，\n不靠框框。',
    subtitle: '同样的内容，可以有完全不同的观感。',
    description: '一个关于字号、留白、颜色与信息层级的交互实验。',
    href: '/lab/info-hierarchy',
    tone: 'silver',
    tags: ['审美', '设计', 'UI', 'UX', '交互', '实验'],
    body: [
      '在这个实验里，同一份数据被渲染成三种布局。通过对照，观察字号、颜色、背景和留白怎样改变信息层级。',
      '设计判断也可以被拆开、比较，并且放进可以操作的页面里。'
    ],
    related: ['product-form', 'playyy']
  },
  {
    id: 'about',
    kind: 'self',
    label: 'THE PERSON / BEHIND THE WORK',
    title: 'Hi, 我是 Joye。',
    subtitle: 'AI Agent 工程师，墨尔本大学在读。',
    description: '做产品，写下思考，和别人一起探索。偶尔弹琴、拉大提琴、组模型、拍照。',
    href: '/about',
    tone: 'paper',
    tags: ['关于', '经历', '生活', '墨尔本', '音乐', '摄影', '我'],
    body: [
      '我在 AI Agent 与全栈产品工程之间工作，也把自己的学习和实践公开在这里。',
      '从第一次开源 PR，到实习、面试、做教程和发起社群活动，我喜欢先动手，再从真实反馈中修正自己。',
      '工作之外，音乐、模型和摄影也是生活的一部分。这里会继续长出新的东西。'
    ],
    related: ['context', 'community', 'playyy']
  }
]

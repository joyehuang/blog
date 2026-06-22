// Real data from blog/src/pages/index.astro — keep in sync.

const PROFILE = {
  name: 'Joye',
  location: 'Melbourne, Australia',
  github: 'https://github.com/joyehuang/blog',
  githubHandle: 'joyehuang',
  linkedin: 'https://www.linkedin.com/in/deshiouhuang/',
  email: 'huangdeshiou@gmail.com',
  motto: 'Stay hungry, stay foolish',
  about: {
    line1: 'AI Agent & Full-Stack Developer',
    line2: '墨尔本大学在读，目前在特赞 Tezign 做 atypica（商业研究 Multi-Agent），同时在 fAIshion.ai 与 Goshu Tech 做 AI 全栈与剪辑 Agent。在意 LLM 的底层机制，也在意产品能不能真正跑起来。Build fast, learn faster — 平时弹琴、拉大提琴、玩摄影。',
  },
};

const NAV = [
  { title: 'Blog', link: '/blog' },
  { title: 'Notes', link: '/archive' },
  { title: 'Projects', link: '/projects' },
  { title: 'Links', link: '/links' },
  { title: 'About', link: '/about' },
];

const RECENT_POSTS = [
  { slug: 'atypica-multi-agent-design',     title: '在 Tezign 构建 atypica：Multi-Agent 协作的 7 个设计抉择', date: '2026-04-12' },
  { slug: 'rsc-vs-islands',                 title: 'RSC 与 Astro Islands 的交界处',                        date: '2026-04-03' },
  { slug: 'llm-tool-calling-patterns',      title: 'LLM Tool Calling 的五种模式',                          date: '2026-03-24' },
  { slug: 'minimind-transformer-notes',     title: 'minimind 笔记：从 SFT 到 RLHF',                         date: '2026-03-11' },
  { slug: 'terminal-ui-on-the-web',         title: '在 web 上做一个真正好用的 terminal UI',                 date: '2026-02-28' },
];

const RECENT_NOTES = [
  { type: '笔记', title: 'Vercel AI SDK 的 streaming 心智模型' },
  { type: '片段', title: 'React useSyncExternalStore 一个小坑' },
  { type: '想法', title: 'agent 的记忆层 —— 短期、长期、工作记忆' },
  { type: '研究', title: '从 ReAct 到 Reflection 的 5 篇关键论文' },
];

const EXPERIENCE = [
  { heading: '上海特赞 Tezign', subheading: 'AIGC 研发部门全栈实习生', bullet: '参与 atypica.ai — 面向商业研究场景的 Multi-Agent 系统' },
  { heading: 'fAIshion.ai',     subheading: 'AI 全栈工程师（远程）',     bullet: 'AI 虚拟试衣与服装搭配平台的全栈开发与模型集成' },
  { heading: 'AIXCut',          subheading: 'AI 全栈研发',               bullet: '参与 AI 视频剪辑 Agent 的设计与工程化落地' },
];

const OPEN_SOURCE = [
  { name: 'Learn-Open-Harness', stars: 297, description: 'OpenHarness 零基础交互式教程 — Agent Loop、Tools、Memory、Multi-Agent' },
  { name: 'minimind-notes',     stars:  93, description: '从零构建 LLM — Transformer、Pretraining、SFT 的原理与对照实验' },
];

const SKILLS = {
  Languages: ['TypeScript', 'JavaScript', 'Python', 'SQL'],
  Frontend:  ['React', 'Next.js', 'Tailwind CSS', 'Remotion', 'Vite'],
  Backend:   ['Node.js', 'Vercel', 'Supabase', 'AWS', 'Stripe', 'Inngest'],
  'AI & Agent': ['Claude Code', 'LLM', 'Transformer', 'Multi-Agent', 'RAG', 'Function Calling', 'Prompt Engineering'],
  Tools:     ['Cursor', 'Git', 'Docker', 'Bun', 'Figma', 'ESLint/Prettier'],
};

Object.assign(window, { PROFILE, NAV, RECENT_POSTS, RECENT_NOTES, EXPERIENCE, OPEN_SOURCE, SKILLS });

// Agent 比赛 — 队伍主题配置（静态）。
//
// 每支队伍一个 `id`：
//   - 作为 Redis key（`agentteam:v1:{id}`）存报名名单；
//   - 作为埋点事件 `agent_team_signup` 的 `team` 属性值。
// 因此 `id` 一旦上线、有人报名后就不要再改，否则名单会对不上。

export type AgentTeam = {
  /** 稳定 slug，做 Redis key 和埋点标识，上线后勿改 */
  id: string
  /** 主题标题 */
  title: string
  /** 一句话简介 */
  summary: string
  /** 展示用标签 */
  tags?: string[]
  /** 名额上限；省略表示不限 */
  capacity?: number
}

/** 活动整体信息（页面头部展示用） */
export const activity = {
  /** 比赛的英文名 / 品牌名 */
  name: 'Summer of Agents',
  title: '第一届 Joye 粉丝 Agent 比赛',
  subtitle: '比赛进行中',
  tagline: '组队已经截止啦，现在各队都在开发中。围观、追进度、找灵感都欢迎，对 Agent 感兴趣就来看看 🤖',
  /** 组队截止日（YYYY-MM-DD，测试会校验格式） */
  deadline: '2026-07-10',
  /** 组队截止时刻（北京时间 7/10 晚 12 点）——过点后 API 与看板同时关闭报名/建队 */
  signupClosesAt: '2026-07-11T00:00:00+08:00',
  /** 活动详情文档（飞书 wiki） */
  docHref: 'https://my.feishu.cn/wiki/LHJiw36mxietv4kKZjacOIbznhe?from=from_copylink'
}

/** 组队是否已截止——报名 / 建队通道随之关闭（API 与看板共用） */
export function isSignupClosed(now: number = Date.now()): boolean {
  return now >= Date.parse(activity.signupClosesAt)
}

/** 第一届比赛的真实赛道 —— 简介 / tags 可随时改，id 上线后勿动 */
export const teams: AgentTeam[] = [
  {
    id: 'game-agent',
    title: '游戏 Agent（杀戮尖塔 2）',
    summary: '让 Agent 自己读局面、做决策、打通关，以《杀戮尖塔 2》为例。',
    tags: ['game', 'planning'],
    capacity: 10
  },
  {
    id: 'personal-agent',
    title: '个人 Agent',
    summary: '一个只属于你的私人助理，帮你打理日常里那些琐碎事。',
    tags: ['personal', 'assistant'],
    capacity: 10
  },
  {
    id: 'interview-transcript-agent',
    title: '面试转录 Agent',
    summary: '实时转录面试对话，结束后自动复盘、指出可以改进的地方。',
    tags: ['transcription', 'review'],
    capacity: 10
  },
  {
    id: 'radio-agent',
    title: '个人电台 Agent（憨神）',
    summary: '像憨神那样，用你的口味生成一档会聊天、会放歌的私人电台。',
    tags: ['audio', 'voice'],
    capacity: 10
  },
  {
    id: 'galgame-agent',
    title: 'Galgame Agent',
    summary: '会写剧情、能分支选择的 Galgame，随玩随生成。',
    tags: ['galgame', 'narrative'],
    capacity: 10
  },
  {
    id: 'mock-interview-agent',
    title: '模拟面试 Agent',
    summary: '扮演面试官出题、追问、打分，陪你练到手不抖。',
    tags: ['interview', 'practice'],
    capacity: 10
  },
  {
    id: 'memory-agent',
    title: '个人回忆 Agent',
    summary: '收集、整理、随时回放你的人生片段。',
    tags: ['memory', 'life'],
    capacity: 10
  },
  {
    id: 'qq-clone-bot',
    title: 'QQ 群整理 Bot（数字分身）',
    summary: '潜伏在群里学你说话，替你冒泡的数字分身。',
    tags: ['qq', 'clone'],
    capacity: 10
  },
  {
    id: 'knowledge-archive-agent',
    title: '个人知识存档 Agent',
    summary: '自动归档、持续累积你的知识，越用越懂你。',
    tags: ['knowledge', 'archive'],
    capacity: 10
  },
  {
    id: 'e2e-test-agent',
    title: '前端 E2E 测试 Agent',
    summary: '自动跑端到端测试，发现并复现前端的 UI bug。',
    tags: ['testing', 'frontend'],
    capacity: 10
  },
  {
    id: 'roleplay-agent',
    title: 'Roleplay Agent',
    summary: '稳定人设、长程记忆，聊多久都不出戏的角色扮演。',
    tags: ['roleplay', 'character'],
    capacity: 10
  },
  {
    id: 'abstract-agent',
    title: '抽象 Agent（虾神）',
    summary: '主打一个抽象——像虾神一样不按常理出牌的整活 Agent。',
    tags: ['fun', 'meme'],
    capacity: 10
  },
  {
    id: 'rss-agent',
    title: 'RSS Agent',
    summary: '帮你订阅、筛选、总结 RSS，只把你在意的推给你。',
    tags: ['rss', 'feed'],
    capacity: 10
  },
  {
    id: 'learning-agent',
    title: '学习领域 Agent',
    summary: '规划路线、出题讲解、追踪进度，陪你把一个领域啃下来。',
    tags: ['learning', 'tutor'],
    capacity: 10
  },
  {
    id: 'live2d-agent',
    title: 'Live2D Agent',
    summary: '给 Agent 一副 Live2D 皮囊，会说话、有表情、随对话动起来的桌面伙伴。',
    tags: ['live2d', 'avatar'],
    capacity: 10
  },
  {
    id: 'language-learning-agent',
    title: '语言学习 Agent',
    summary: '陪你练口语、纠发音、记单词，按你的水平定制每天的语言练习。',
    tags: ['language', 'tutor'],
    capacity: 10
  },
  {
    id: 'newcomer-onboarding-agent',
    title: '新人入门新领域 Agent',
    summary: '面向零基础新人，把陌生领域拆成上手路径，边学边练地带你入门。',
    tags: ['onboarding', 'learning'],
    capacity: 10
  },
  {
    id: 'vr3d-agent',
    title: 'VR/3D Agent',
    summary: '根据你的想法生成、摆布 3D 场景，在 VR 里跟 Agent 一起搭世界。',
    tags: ['vr', '3d'],
    capacity: 10
  },
  {
    id: 'video-editing-agent',
    title: '剪视频 Agent',
    summary: '自动剪辑、配字幕、卡点，把一堆素材理成一条能发的视频。',
    tags: ['video', 'editing'],
    capacity: 10
  }
  // 「自命题赛道」不再是静态卡：由用户在页面上自助创建（见 store.ts 的 createTeam）。
  // 「个人参赛」也走自助创建：创建赛道时选「个人」即可（名额 1，别人加不进来）。
]

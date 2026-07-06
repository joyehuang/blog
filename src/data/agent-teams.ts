// Agent 比赛组队报名 — 队伍主题配置（静态）。
//
// 这里的内容是占位，之后直接改成真实主题即可。每支队伍一个 `id`：
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
  title: '第一届 Joye 粉丝 Agent 比赛',
  subtitle: '组队报名',
  tagline: '选一个你感兴趣的主题，填个名字就算加入。参赛、围观、找队友都欢迎，对 Agent 感兴趣就来玩。',
  /** 占位截止日，改成真实日期 */
  deadline: '2026-08-31',
  /** 活动详情文档（飞书 wiki） */
  docHref: 'https://my.feishu.cn/wiki/LHJiw36mxietv4kKZjacOIbznhe?from=from_copylink'
}

/** 第一届比赛的真实赛道 —— 简介 / tags 可随时改，id 上线后勿动 */
export const teams: AgentTeam[] = [
  {
    id: 'game-agent',
    title: '游戏 Agent（杀戮尖塔 2）',
    summary: '让 Agent 自己读局面、做决策、打通关，以《杀戮尖塔 2》为例。',
    tags: ['game', 'planning'],
    capacity: 6
  },
  {
    id: 'personal-agent',
    title: '个人 Agent',
    summary: '一个只属于你的私人助理，帮你打理日常里那些琐碎事。',
    tags: ['personal', 'assistant'],
    capacity: 6
  },
  {
    id: 'interview-transcript-agent',
    title: '面试转录 Agent',
    summary: '实时转录面试对话，结束后自动复盘、指出可以改进的地方。',
    tags: ['transcription', 'review'],
    capacity: 6
  },
  {
    id: 'radio-agent',
    title: '个人电台 Agent（憨神）',
    summary: '像憨神那样，用你的口味生成一档会聊天、会放歌的私人电台。',
    tags: ['audio', 'voice'],
    capacity: 6
  },
  {
    id: 'galgame-agent',
    title: 'Galgame Agent',
    summary: '会写剧情、能分支选择的 Galgame，随玩随生成。',
    tags: ['galgame', 'narrative'],
    capacity: 6
  },
  {
    id: 'mock-interview-agent',
    title: '模拟面试 Agent',
    summary: '扮演面试官出题、追问、打分，陪你练到手不抖。',
    tags: ['interview', 'practice'],
    capacity: 6
  },
  {
    id: 'memory-agent',
    title: '个人回忆 Agent',
    summary: '收集、整理、随时回放你的人生片段。',
    tags: ['memory', 'life'],
    capacity: 6
  },
  {
    id: 'qq-clone-bot',
    title: 'QQ 群整理 Bot（数字分身）',
    summary: '潜伏在群里学你说话，替你冒泡的数字分身。',
    tags: ['qq', 'clone'],
    capacity: 6
  },
  {
    id: 'knowledge-archive-agent',
    title: '个人知识存档 Agent',
    summary: '自动归档、持续累积你的知识，越用越懂你。',
    tags: ['knowledge', 'archive'],
    capacity: 6
  },
  {
    id: 'e2e-test-agent',
    title: '前端 E2E 测试 Agent',
    summary: '自动跑端到端测试，发现并复现前端的 UI bug。',
    tags: ['testing', 'frontend'],
    capacity: 6
  },
  {
    id: 'roleplay-agent',
    title: 'Roleplay Agent',
    summary: '稳定人设、长程记忆，聊多久都不出戏的角色扮演。',
    tags: ['roleplay', 'character'],
    capacity: 6
  },
  {
    id: 'abstract-agent',
    title: '抽象 Agent（虾神）',
    summary: '主打一个抽象——像虾神一样不按常理出牌的整活 Agent。',
    tags: ['fun', 'meme'],
    capacity: 6
  },
  {
    id: 'rss-agent',
    title: 'RSS Agent',
    summary: '帮你订阅、筛选、总结 RSS，只把你在意的推给你。',
    tags: ['rss', 'feed'],
    capacity: 6
  },
  {
    id: 'learning-agent',
    title: '学习领域 Agent',
    summary: '规划路线、出题讲解、追踪进度，陪你把一个领域啃下来。',
    tags: ['learning', 'tutor'],
    capacity: 6
  },
  {
    id: 'live2d-agent',
    title: 'Live2D Agent',
    summary: '给 Agent 一副 Live2D 皮囊，会说话、有表情、随对话动起来的桌面伙伴。',
    tags: ['live2d', 'avatar'],
    capacity: 6
  },
  {
    id: 'language-learning-agent',
    title: '语言学习 Agent',
    summary: '陪你练口语、纠发音、记单词，按你的水平定制每天的语言练习。',
    tags: ['language', 'tutor'],
    capacity: 6
  },
  {
    id: 'newcomer-onboarding-agent',
    title: '新人入门新领域 Agent',
    summary: '面向零基础新人，把陌生领域拆成上手路径，边学边练地带你入门。',
    tags: ['onboarding', 'learning'],
    capacity: 6
  }
  // 「自命题赛道」不再是静态卡：由用户在页面上自助创建（见 store.ts 的 createTeam）。
]

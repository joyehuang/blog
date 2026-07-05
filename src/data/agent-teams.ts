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

/** 约 10 个占位主题 —— 之后替换成真实内容 */
export const teams: AgentTeam[] = [
  {
    id: 'deep-research-agent',
    title: '深度研究 Agent',
    summary: '自动检索、交叉验证、产出带引用的研究报告。',
    tags: ['research', 'web'],
    capacity: 6
  },
  {
    id: 'coding-agent',
    title: '编程 Agent',
    summary: '从 issue 到 PR：自己写代码、跑测试、修 bug。',
    tags: ['coding', 'tools'],
    capacity: 6
  },
  {
    id: 'browser-agent',
    title: '浏览器操作 Agent',
    summary: '用视觉 + DOM 自主完成网页上的真实任务。',
    tags: ['browser', 'vision'],
    capacity: 6
  },
  {
    id: 'memory-agent',
    title: '记忆与个性化 Agent',
    summary: '长期记忆、用户画像、跨会话保持人格。',
    tags: ['memory', 'personalization'],
    capacity: 5
  },
  {
    id: 'multi-agent-orchestra',
    title: '多智能体协作',
    summary: '编排一群 Agent 分工，合力完成复杂任务。',
    tags: ['multi-agent', 'orchestration'],
    capacity: 6
  },
  {
    id: 'voice-agent',
    title: '语音实时 Agent',
    summary: '可打断、可转接，边听边想的实时语音对话。',
    tags: ['voice', 'realtime'],
    capacity: 5
  },
  {
    id: 'data-analyst-agent',
    title: '数据分析 Agent',
    summary: '连数据库、跑查询、出图表，直接给结论。',
    tags: ['data', 'sql'],
    capacity: 5
  },
  {
    id: 'game-npc-agent',
    title: '游戏 NPC Agent',
    summary: '会记仇、会计划、可玩的智能 NPC。',
    tags: ['game', 'simulation'],
    capacity: 5
  },
  {
    id: 'life-automation-agent',
    title: '生活自动化 Agent',
    summary: '订票、排日程、跑报销，一条龙帮你搞定。',
    tags: ['automation', 'daily'],
    capacity: 5
  },
  {
    id: 'rag-knowledge-agent',
    title: '知识库问答 Agent',
    summary: '私有资料检索问答，答案可溯源到出处。',
    tags: ['rag', 'knowledge'],
    capacity: 5
  }
]

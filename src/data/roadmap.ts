// 站点 Roadmap —— `/roadmap` 页面的唯一数据源。
//
// `ROADMAP.md` 是本文件的 GitHub 浏览镜像，请通过修改本文件来更新路线图，
// 镜像由人工同步，不要反向回流。
//
// `id` 是稳定标识：用于 changelog 的 `refs`、issue 引用和埋点。一旦上线不要改，
// 改了会断掉历史关联。改标题、summary、goals、tags 都安全。

export type RoadmapStatus = 'now' | 'next' | 'later' | 'done'

export interface RoadmapItem {
  /** 稳定短 id，上线后勿改 */
  id: string
  /** 展示标题 */
  title: string
  /** 一句话说明 */
  summary: string
  /** 所处阶段 */
  status: RoadmapStatus
  /** ISO date，仅 done 项填，表示完成日期 */
  shippedAt?: string
  /** 相关文件 / issue / 外部链接 */
  refs?: { label: string; href: string }[]
  /** 完成定义 / 验收点 */
  goals?: string[]
  /** 可选展示标签 */
  tags?: string[]
}

export const roadmap: RoadmapItem[] = [
  {
    id: 'maintenance-loop',
    title: '仓库原生维护循环',
    summary:
      '建立一套不依赖记忆的维护系统：站点方向、已完成变更、读者反馈、agent 指引都有各自的归处。',
    status: 'done',
    shippedAt: '2026-07-06',
    refs: [
      { label: 'ROADMAP.md', href: '/roadmap' },
      { label: 'CHANGELOG.md', href: '/changelog' },
      { label: 'CLAUDE.md', href: 'https://github.com/joyehuang/blog/blob/main/CLAUDE.md' },
      { label: 'ANALYTICS.md', href: 'https://github.com/joyehuang/blog/blob/main/ANALYTICS.md' }
    ],
    goals: [
      '文章页反馈入口能开 GitHub issue',
      'Issues 承担讨论与分诊',
      'ROADMAP 跟踪计划、CHANGELOG 跟踪已发布',
      'CLAUDE.md 告知 agent 该检查和更新哪些维护文件',
      'ROADMAP / CHANGELOG 渲染为公开站点页面'
    ]
  },
  {
    id: 'public-feedback-loop',
    title: '公开反馈闭环',
    summary: '让读者建议从站点更顺畅地流入 GitHub Issues，并定期把采纳的建议推进到 roadmap。',
    status: 'next',
    tags: ['feedback', 'issues'],
    goals: [
      '在部分非文章页（Talks、Curated 等）增加反馈入口',
      '补充 feedback / content / site / analytics 标签',
      '定期复盘反馈 issue，把采纳项提升进 Now'
    ]
  },
  {
    id: 'content-maintenance',
    title: '内容维护',
    summary: '让内容状态更容易被审计，识别陈旧或未完成的内容。',
    status: 'next',
    tags: ['content'],
    goals: [
      '为旧 notes / 文章建立轻量复盘清单',
      '在内部报告里暴露陈旧或未完成内容',
      '明确哪些内容变更需要进 CHANGELOG'
    ]
  },
  {
    id: 'automation-review',
    title: '自动化复盘',
    summary:
      '在手工工作流稳定之后，探索定时提醒或 GitHub Automation 处理陈旧 issue、roadmap 复盘、changelog 提醒。',
    status: 'later',
    tags: ['automation']
  }
]

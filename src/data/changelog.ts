// 站点 Changelog —— `/changelog` 页面的唯一数据源。
//
// `CHANGELOG.md` 是本文件的 GitHub 浏览镜像，请通过修改本文件来记录变更，
// 镜像由人工同步，不要反向回流。
//
// 只记用户可见或影响后续维护的变更：站点功能、内容系统、analytics、维护流程。
// 跳过纯格式化、typo、例行依赖升级（除非它们带来真实行为变化）。
//
// 工作流：
//   - 进行中的工作先放进 `Unreleased`。
//   - 合并 / 上线后，把条目移进一个 dated release。
//   - 有关联 issue 时用 `refs` 标注，例如 `['#12']` 或 `['roadmap:maintenance-loop']`。

export type ChangeType = 'added' | 'changed' | 'fixed' | 'removed' | 'deprecated' | 'notes'

export interface ChangeEntry {
  /** 变更类型 */
  type: ChangeType
  /** 一句话描述 */
  summary: string
  /** 关联 issue 或 roadmap item，例如 `['#12']`、`['roadmap:maintenance-loop']` */
  refs?: string[]
}

export interface ChangelogRelease {
  /** 版本号，`Unreleased` 或 `v4.1.0` */
  version: string
  /** ISO date，`Unreleased` 留空 */
  date?: string
  entries: ChangeEntry[]
}

export const releases: ChangelogRelease[] = [
  {
    version: 'Unreleased',
    entries: []
  },
  {
    version: 'v4.1.0',
    date: '2026-07-06',
    entries: [
      {
        type: 'added',
        summary:
          '新增公开的 /roadmap 与 /changelog 页面，由 src/data 下的 TS 数据源驱动，ROADMAP.md 与 CHANGELOG.md 降为镜像。',
        refs: ['roadmap:maintenance-loop']
      },
      {
        type: 'added',
        summary:
          '建立仓库原生维护循环：issue 模板、PR 维护清单、文章页反馈入口、CLAUDE.md 维护指引。',
        refs: ['roadmap:maintenance-loop']
      },
      {
        type: 'added',
        summary: '新增 site_feedback_click analytics 事件，衡量文章页反馈入口的点击意图。'
      },
      {
        type: 'changed',
        summary: 'issue 模板与 agent 指引指向博客自身的维护流程，而非上游主题支持。',
        refs: ['roadmap:maintenance-loop']
      },
      {
        type: 'changed',
        summary:
          '校准 issue 模板：feedback 与 bug 的重叠选项合并、feature 模板的冗余勾选项精简、contact_links 指向站点页面。'
      },
      {
        type: 'changed',
        summary: '文章页反馈入口文案校准：明确「内容错漏走评论，结构 / 功能建议开 issue」的边界。'
      }
    ]
  }
]

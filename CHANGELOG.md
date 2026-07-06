# Changelog

> 数据源在 `src/data/changelog.ts`；本文件是它的 GitHub 浏览镜像，方便不打开站点时也能看。
> 维护方式以 `CLAUDE.md` 为准：改 TS 数据源，再人工同步本镜像。站点 `/changelog` 页面渲染自 TS 数据源。

只记用户可见或影响后续维护的变更：站点功能、内容系统、analytics、维护流程。跳过纯格式化、typo、例行依赖升级（除非它们带来真实行为变化）。

## Unreleased

_暂无。_

## v4.1.0 — 2026-07-06

### Added

- 新增公开的 `/roadmap` 与 `/changelog` 页面，由 `src/data` 下的 TS 数据源驱动，`ROADMAP.md` 与 `CHANGELOG.md` 降为镜像。Refs roadmap item `maintenance-loop`.
- 建立仓库原生维护循环：issue 模板、PR 维护清单、文章页反馈入口、`CLAUDE.md` 维护指引。Refs roadmap item `maintenance-loop`.
- 新增 `site_feedback_click` analytics 事件，衡量文章页反馈入口的点击意图。

### Changed

- issue 模板与 agent 指引指向博客自身的维护流程，而非上游主题支持。Refs roadmap item `maintenance-loop`.
- 校准 issue 模板：feedback 与 bug 的重叠选项合并、feature 模板的冗余勾选项精简、`contact_links` 指向站点页面。
- 文章页反馈入口文案校准：明确「内容错漏走评论，结构 / 功能建议开 issue」的边界。

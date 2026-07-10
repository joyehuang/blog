# Personal Blog Template

这是一个基于 [Astro](https://astro.build/) 和 [Astro Theme Pure](https://astro-pure.js.org/) 改造的个人博客模板，适合搭建技术博客、个人主页、项目展示、notes 知识库、精选阅读和公开分享页面。

它不是一个无代码主题，而是一份已经跑过真实内容生产的工程模板。你可以 fork 后替换个人信息，也可以只参考其中的内容组织、双语路由、组件拆分、搜索、评论、agent-facing manifest 和 terminal dev mode。

## 功能

- Blog：正式文章，支持中英文镜像。
- Notes：短笔记、研究卡片、未成稿材料和面试题沉淀。
- Curated：外部文章、论文、项目的精选与消化。
- Talks：公开分享、幻灯片和活动记录。
- Projects / Links / About / Contact：个人主页常见页面。
- 中英文路由、RSS、站内搜索、评论、访问统计、OG 图片和 agent 读取接口。

## 技术栈

- Astro 5 + TypeScript
- React islands
- UnoCSS / Astro Theme Pure
- Bun
- Vercel Analytics / Speed Insights
- Waline comments

## 快速开始

环境要求：

- [Node.js](https://nodejs.org/): 18.0.0+
- [Bun](https://bun.sh/): 本项目使用 Bun 管理依赖和脚本

```shell
bun install
bun dev
```

常用命令：

```shell
bun run check
bun run build
bun preview
bun new
bun format
bun lint
```

发布前建议至少运行：

```shell
bun run check
bun run build
```

## 改成你自己的博客

优先替换这些位置：

- `src/site.config.ts`: 站点标题、作者、导航、社交链接、友链申请信息、评论服务等全局配置。
- `src/pages/about/index.astro` 和 `src/pages/en/about/index.astro`: 关于页内容。
- `src/pages/contact/index.astro` 和 `src/pages/en/contact/index.astro`: 联系方式与二维码展示。
- `src/assets/avatar.png`: 首页和站点使用的头像。
- `public/favicon/*`: 浏览器图标和 PWA 图标。
- `public/links.json`: 友链数据。
- `src/content/blog`: 正式文章。
- `src/content/notes`: notes、研究卡片和未成稿材料。
- `src/content/curated`: 精选外部资料。
- `src/content/talks` 和 `public/talks`: 公开分享、幻灯片或活动记录。

如果你不需要某些页面，例如 talks、curated、links 或 notes，可以删除对应页面、内容集合和导航项。

## 内容约定

正式博客使用文件夹组织：

```text
src/content/blog/
  20260615 - example-post/
    post.mdx
    post.en.mdx
```

中文文章默认使用 `post.mdx`。英文翻译使用同目录下的 `post.en.mdx`，并在 frontmatter 中添加：

```yaml
language: en
translationKey: '20260615---example-post/post'
```

Notes 使用单文件组织：

```text
src/content/notes/example-note.md
src/content/notes/example-note.en.md
```

Notes 的 `status` 可选：

- `in-progress`: 进行中
- `incomplete`: 待补充
- `ready`: 已整理
- `archived`: 已归档

建议只把真正可以公开阅读、且正文里没有明显 `待补充` 段落的内容标成 `ready`。

## 计划中的 Agent Skills

这部分只是规划，当前仓库还没有落地 skill 文件。

1. `deploy-blog-template`

   - 目标：让 agent 能一键部署这个博客模板。
   - 需要覆盖：依赖安装、环境变量检查、Vercel 项目初始化、域名/站点配置提示、build 验证和部署后 smoke test。
   - 输入：仓库路径、部署目标、站点域名、评论/Analytics 开关。
   - 输出：部署 URL、需要人工确认的配置项、失败时的最小排查路径。

2. `materialize-clean-blog-template`
   - 目标：从当前个人博客生成一个“真空模板”，去掉个人内容，只保留可复用结构。
   - 需要覆盖：清空或替换 `src/content/*`、头像/favicon/二维码/友链、个人项目、联系方式、公开 talks、analytics 事件中的个人语义。
   - 输入：模板目标路径、站点名称、作者名、是否保留 demo 内容。
   - 输出：一个可直接初始化的新博客模板目录，以及替换清单。

## 本地组件清单

这些是当前仓库在主题基础上保留、改造或新增的项目本地组件：

- `AnalyticsEvents.astro`: 统一处理 `data-analytics-event` 点击上报。
- `BaseHead.astro`: SEO、OG、favicon、字体预加载、双语 hreflang。
- `Header.astro`: 双语导航、搜索入口、dev mode 入口。
- `HeroEn.astro`: 英文博客详情页 hero，修正英文 tag/link 路由。
- `LanguageSwitcher.astro`: 中英文页面切换按钮。
- `PostPreviewEn.astro`: 英文博客列表卡片。
- `ThemeProvider.astro`: 主题切换、系统主题同步和 toast。
- `TranslationNotice.astro`: 英文站点翻译进度提示。
- `WechatReveal.astro`: 微信号悬停/聚焦显示。
- `about/Substats.astro`: 关于页外部平台数据/粉丝数展示。
- `about/ToolSection.astro`: 关于页工具栈展示。
- `blog/FeatureCalloutCard.astro`: 博客内功能/重点卡片。
- `blog/TalkEpisodeCard.astro`: 博客内嵌分享会入口卡片。
- `blog/TalkSlideFigure.astro`: 博客内嵌分享会 slide 图片。
- `comment/Comment.astro`: Waline 评论挂载。
- `comment/PageInfo.astro`: 页面浏览量/评论元信息。
- `comment/ViewCounter.astro`: 浏览量计数。
- `contact/ContactQR.astro`: 联系页二维码卡片。
- `curated/CuratedItem.astro`: Curated 单条资料卡。
- `curated/CuratedLibrary.astro`: Curated 列表、筛选和布局。
- `home/LinkCard.astro`: 首页外链卡片。
- `home/ProjectCard.astro`: 首页项目卡片。
- `home/Section.astro`: 首页通用 section 容器。
- `home/SiteStats.astro`: 首页站点统计。
- `home/SkillLayout.astro`: 首页技能/工具布局。
- `intro/IntroOverlay.astro`: 首页开场动效/引导层。
- `links/FriendConstellation.astro`: 友链星座可视化。
- `links/FriendList.astro`: 友链列表。
- `mascot/JoJo.tsx` 和 `mascot/jojo.css`: 首页 mascot 交互组件。
- `navigation/BackToTop.astro`: 回到顶部按钮。
- `navigation/TableOfContents.astro`: 文章目录容器。
- `navigation/TableOfContentsItem.astro`: 文章目录项。
- `navigation/toc.ts`: Markdown headings 到 TOC 树的转换。
- `projects/GitHubContributions.astro`: GitHub contributions 展示。
- `projects/ProjectSection.astro`: 项目页分组 section。
- `projects/Sponsors.astro`: 赞助者列表。
- `projects/Sponsorship.astro`: 赞助入口。
- `search/SiteSearch.astro`: 站内搜索 UI（走 /api/search.json，中英文各自索引）。
- `talks/TalksSeries.astro`: Talks 时间线/系列展示。
- `terminal/*`: terminal dev mode、pseudo-FS、命令系统、文章 viewer 和样式。

## 部署

这个项目可以直接部署到 Vercel。默认配置见 `vercel.json` 和 `astro.config.ts`。

部署前请确认：

- 已替换站点域名、作者、头像和 favicon。
- 已替换或关闭 Waline 评论服务。
- 已确认 Analytics / Speed Insights 是否符合你的隐私和合规要求。
- 已清理示例文章、示例图片、二维码和个人联系方式。

## 许可

代码基于 Apache 2.0 协议开源。

文章、图片、PPT、二维码和个人内容不属于模板授权范围。fork 后请替换为你自己的内容。

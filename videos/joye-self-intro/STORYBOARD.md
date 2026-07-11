# Joye 自我介绍｜60 秒竖屏分镜

## Strategy Lock

- **唯一信息：** Joye 是一位把真实 Agent 工程、求职与开源实践持续公开沉淀的年轻全栈开发者；关注他能获得可执行、经过实践的中文一手经验。
- **叙事弧：** 反差 Hook → 身份与实践 → 数据证明 → 热门文章深挖 → 方法论 → 开源证明 → CTA。
- **受众：** 中文小红书/B站/短视频平台上的 AI 开发者、学生、Agent 求职者和开源爱好者。
- **类型：** 可直接发布的中文个人品牌自我介绍。
- **时长/格式：** 60 秒，1080×1920，30fps，9:16。
- **节奏/情绪：** 前 3 秒强 Hook，中段清爽快速，热门文章处稍停，结尾温暖明确；整体 light-first、工程感、不过度煽情。
- **旁白/字幕：** 全程中文旁白；烧录中文字幕，最多两行，每行不超过 16 个汉字。
- **音乐：** 低存在感的现代技术感节拍，旁白优先，关键数字有轻微 UI 击中音。

## Beat 1 — 三个数字先认识我（0.00–7.44s）

**传达：** 用“大二 / 100+ / 30+”建立反差和可信度。

**旁白：** 大二，面过一百多家 AI 公司，拿到三十多个 offer，我把踩过的坑全写进一个网站。

**构图：** 纸白底，三个巨型 Mono 数字依次纵向推入：`大二`、`100+ AI 公司`、`30+ offers`。数字后方有极淡网格；最后三块卡片收束成一个浏览器地址栏 `joyehuang.me`。

**镜头：** 中景动态排版，1.00→1.065 缓慢推进；前景数字卡、中景地址栏、背景网格形成三层视差。

**动画：** 0.0s 光标闪现；0.3/1.4/2.5s 三个数字用 `back.out(1.4)` 落位；4.2s 卡片 FLIP 收束；5.2s 地址栏光标完成输入。

**Accents：** 无截图；真实数字来自热门文章作者介绍。

## Beat 2 — Joye 是谁（7.44–17.12s）

**传达：** 学生身份与 AI Agent 全栈实践并存。

**旁白：** 我是 Joye，墨尔本大学计算与软件工程在读，也是一名 AI Agent 全栈开发者。我做过商业研究 Multi-Agent、视频剪辑 Agent 和虚拟试衣。

**构图：** `joye.png` 半身头像从左侧圆形遮罩中出现；右侧是姓名、墨尔本定位和四条经历轨道：Adastra Labs / Tezign / AIXCut / fAIshion.ai。轨道末端依次长出“图像生成 / 商业研究 / 视频 Agent / 虚拟试衣”标签。

**镜头：** 中景左右分屏，1.00→1.06 缓慢推进；背景网格与信号线、头像中景、履历轨道前景分层移动。

**动画：** 头像 0.5s mask reveal；经历轨道按旁白词组逐条绘制；标签用淡蓝底快速 pop。

**Accents：** `capture/assets/joye.png`，左侧 42% 宽，轻微 1.03 倍呼吸。

## Beat 3 — 一个持续生长的知识库（17.12–22.68s）

**传达：** 网站不是简历静态页，而是持续沉淀的内容系统。

**旁白：** 网站有十三篇博客、十一篇 Notes、两场公开分享，总浏览量两万四千七百五十二。

**构图：** 四个站点统计单元格从下向上排成 2×2：13 文章、11 Notes、2 分享、24,752 浏览。背景模拟首页的 Blog/Notes/Talks 列表，但由 HTML 行重构，不粘贴截图。

**动画：** 数字计数到真实值；列表行以 80ms stagger 滚入；24,752 落下时有一圈 Sky Signal 扩散。

**Accents：** 无外部资产；数据来自仓库内容集合与 Waline `/api/stats`（2026-07-11）。

## Beat 4 — 最受欢迎的 1.1 万字指南（22.68–28.24s）

**传达：** 深挖站内最受欢迎内容，而非只列标题。

**旁白：** 最受欢迎的是一万一千字的 Agent 入门指南，已有两千零八次阅读。

**构图：** 一张纵向“文章纸张”快速展开，标题《写给所有“想入门 Agent 但不知道从哪开始”的人》占据中心；`11,000 字` 与 `2,008 阅读` 作为琥珀色印章落下。侧边目录条依次亮起“是什么 / 生态地图 / 心态 / 入门求职 / 内功”。

**镜头：** 文章中近景，1.00→1.06 持续推进；背景巨型编号与线条、中景纸张、前景数据印章形成三层深度。

**动画：** 纸张从 18% 高度延展到 82%；标题逐行擦入；目录高亮快速向下扫描；两枚数据印章有轻微回弹。

**Accents：** 无截图；标题、章节和阅读量均取自仓库正文与 Waline 实时查询。

## Beat 5 — Agent 的四件套（28.24–36.14s）

**传达：** 给观众一个真正能记住的文章观点。

**旁白：** 我把 Agent 讲成四件事：大脑、工具、记忆，还有一个会自己循环的身体。

**构图：** 中央一个 `LLM` 圆核，四周依次连接“感知”“工具”“记忆”“循环”。最后连接线闭合，形成会自己运行的回路；底部出现文章原句的短版：`想一下 → 做一下 → 直到完成`。

**动画：** SVG path draw + 节点脉冲；循环箭头在镜头局部 4.76s（全片 33.00s）闭合，随后用 3.14s 的流动回路、节点脉冲和核心电路推进承载视觉呼吸；每个词与旁白短语对齐。

**Accents：** 无图标资产，全部用 CSS/SVG 重构，保持清洁一致。

## Beat 6 — 不追名词，按阶段动手（36.14–42.86s）

**传达：** Joye 的内容强调可执行路线，而不是焦虑营销。

**旁白：** 入门不用追完所有名词：先跑通 SDK，再理解机制，最后做一个你真的会用的项目。

**构图：** 三段阶梯向上推进：`3–5 天 跑通 SDK`、`1–2 周 理解机制`、`1–2 月 真实项目`。背景漂过 Prompt / MCP / RAG / Skills 等词，但被阶梯横线压到次要层级。

**动画：** 阶梯逐级生长；每上一级，背景术语降低不透明度；最终“真实项目”占满视野。

**Accents：** 无。

## Beat 7 — 公开、复盘、开源（42.86–48.10s）

**传达：** 用开源结果证明“公开学习痕迹”的理念。

**旁白：** 我相信，做过的事要公开，踩过的坑要复盘。minimind-notes 有一百四十六颗星。

**构图：** 两张 GitHub 风格仓库卡片横向交接：`minimind-notes ★146` 与 `Learn-Open-Harness ★19`。上方短句像提交记录一样逐字写入：`build → fail → reflect → share`。

**动画：** 星数计数；提交点从左向右点亮；第二张卡片以代码 diff 擦除切换。

**Accents：** `capture/assets/svgs/svg-a0b4ad49.svg`（GitHub 标记）只作 28px 角标；数据来自 GitHub API（2026-07-11）。

## Beat 8 — 去哪里找到我（48.10–59.91s）

**传达：** 明确网站主 CTA，并提供四个平台账号。

**旁白：** 想继续看 Agent 工程、求职复盘和开源实践，来 joyehuang.me。小红书、B站、GitHub 和 X，都能找到我。Build fast, learn faster.

**构图：** `joyehuang.me` 以大号地址栏居中；下方四个平台胶囊：`小红书 · Joye`、`B站 · UID 3546914882587480`、`GitHub · @joyehuang`、`X · @deshiou0604`。头像小圆章落在网址左侧；底部 Slogan 停留。

**动画：** 网址 0.7s 键入；平台胶囊 100ms stagger；最后 3.8s 稳定持有 CTA，音乐收束。

**Accents：** `capture/assets/joye.png` 小圆章；`svg-baab9268.svg` X 标记；`svg-a0b4ad49.svg` GitHub 标记。

## Asset Audit

已查看 `capture/screenshots/contact-sheet.jpg`、`capture/assets/contact-sheet.jpg` 和两张 SVG contact sheet。下面逐项说明：

| Asset | USE / SKIP | 理由 |
|---|---|---|
| `favicon.png` | SKIP | 与头像重复且分辨率最低。 |
| `joye.png` | USE（Beat 2/8） | 最清晰、最能识别作者的品牌头像。 |
| `og-image.png` | SKIP | 深色横版社交卡与本片 light-first 竖屏体系冲突，文字也会重复。 |
| `profile.webp` | SKIP | 与 `joye.png` 重复，不引入第二套裁切。 |
| `svg-03e08fa9-2.svg` | SKIP | Contact sheet 中无可辨识品牌信息。 |
| `svg-03e08fa9-3.svg` | SKIP | 同组重复/不可辨识。 |
| `svg-03e08fa9-4.svg` | SKIP | 同组重复/不可辨识。 |
| `svg-03e08fa9.svg` | SKIP | 同组重复/不可辨识。 |
| `svg-045bfd54.svg` | SKIP | 通用汉堡菜单，视频中无交互菜单。 |
| `svg-2440a18b-2.svg` | SKIP | Contact sheet 中无可辨识品牌信息。 |
| `svg-2440a18b-3.svg` | SKIP | 同组重复/不可辨识。 |
| `svg-2440a18b-4.svg` | SKIP | 同组重复/不可辨识。 |
| `svg-2440a18b-5.svg` | SKIP | 同组重复/不可辨识。 |
| `svg-2440a18b.svg` | SKIP | 同组重复/不可辨识。 |
| `svg-24d7ed64.svg` | SKIP | 通用箭头用 CSS 绘制更便于动画。 |
| `svg-34922176.svg` | SKIP | RSS 图标不是用户指定 CTA。 |
| `svg-458d186c.svg` | SKIP | 通用搜索图标与叙事无关。 |
| `svg-6701d986-2.svg` | SKIP | Contact sheet 中无可辨识品牌信息。 |
| `svg-6701d986-3.svg` | SKIP | 同组重复/不可辨识。 |
| `svg-6701d986-4.svg` | SKIP | 同组重复/不可辨识。 |
| `svg-6701d986.svg` | SKIP | 同组重复/不可辨识。 |
| `svg-6ab8ab16.svg` | SKIP | 主题切换太阳，不是叙事内容。 |
| `svg-892ca2ed.svg` | SKIP | 通用显示器图标不增加信息。 |
| `svg-a0b4ad49.svg` | USE（Beat 7/8） | GitHub 平台标记，直接服务开源证明与 CTA。 |
| `svg-ab25f18e.svg` | SKIP | 主题切换月亮，不是叙事内容。 |
| `svg-baab9268.svg` | USE（Beat 8） | X 平台标记，服务用户指定 CTA。 |
| `svg-bfed9e00.svg` | SKIP | 位置图标由文字“Melbourne”表达更清楚。 |
| `svg-cb1dba64.svg` | SKIP | 与已选 GitHub 图标重复。 |

## Production Architecture

```text
videos/joye-self-intro/
├── index.html
├── DESIGN.md
├── SCRIPT.md
├── STORYBOARD.md
├── audio_request.json
├── audio_meta.json
├── transcript.json
├── narration.wav
├── capture/
├── compositions/
│   ├── beat-1-hook.html
│   ├── beat-2-identity.html
│   ├── beat-3-stats.html
│   ├── beat-4-popular-post.html
│   ├── beat-5-agent-four.html
│   ├── beat-6-roadmap.html
│   ├── beat-7-open-source.html
│   └── beat-8-cta.html
└── snapshots/
```

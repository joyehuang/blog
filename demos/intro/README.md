# 入场动画 · 设计与实现说明（Particle Constellation Intro）

> 这是 Joye 个人博客首页入场动画的完整自然语言描述，作为后续复用 / 再生成 / 写作的素材。
>
> - 对应组件：[`src/components/intro/IntroOverlay.astro`](../../src/components/intro/IntroOverlay.astro)，接入于首页 `src/pages/index.astro` 与 `src/pages/en/index.astro`。
> - 本目录另有四个独立全屏 demo（探索期方向）：
>   - [`constellation.html`](./constellation.html) —— 动画一 · 粒子聚合
>   - [`terminal-boot.html`](./terminal-boot.html) —— 动画二 · 终端开机 `joye.init()`
>   - [`kinetic-type.html`](./kinetic-type.html) —— 动画三 · 动态排版 Kinetic Type
>   - [`multi-agent.html`](./multi-agent.html) —— 动画四 · Multi-Agent 编排
>   - [`index.html`](./index.html) —— 四方案对比画廊
>
> **当前状态（评审中）**：四个方向都已集成为组件里的「变体」，由左下角的 **Tweak 切换面板**（动画一 / 二 / 三 / 四 + replay）实时切换，方便对比。默认当前播放 **动画二 · 终端**。Tweak 面板是评审辅助工具，定稿前会下掉或加开关。
>
> 下方的「逐拍 / 视觉 / 实现」详述以 **动画一 · 粒子聚合** 为主线；动画二（终端开机）、动画三（动态排版）、动画四（Multi-Agent 编排）的描述见各自 demo 文件顶部与组件源码。

---

## 一句话

首页首次打开时，画面不是随机展示关键词，而是像一个 Agent 正在执行“生成 joye.dev/home”的任务：`agent.runtime()` 启动 loop，`mcp.filesystem()` 加载博客和项目，`mcp.github()` 读取公开作品，`memory.search()` 找回设计 / 前端经验，`examples.unitize()` 生成内容碎片，最后 `merge_context()` 把这些碎片合并成中央的 **「JOYE」**。成形后动画停在可互动状态：用户可以移动鼠标拨动粒子，准备好后点击 **「进入 ~/joye →」**，粒子向上消散并淡出，露出底下真实首页。

## 设计意图

- 给「内容已经很好、但缺视觉冲击」的博客补一记开场重拳，让路人第一眼就被抓住。
- 借开场展示前端功底，同时把视觉语义绑定到 Joye 平时做的事：Agent Runtime、Tool / MCP、记忆检索、内容写作和例子生成，而不是一个可替换名字的通用粒子特效。
- 技术上仍是 text→particle 采样、Canvas 粒子物理、星座连线、鼠标交互，全部手写、零动画库。
- 不喧宾夺主：成形后把节奏交给用户，既可停留体验，也可随时进入 / 跳过；每次会话只播一次，并且**不另做 hero**，而是淡出露出真实首页 —— 过渡自然、零信息重复。

## 逐拍体验（时间轴）

> 时间基于「粒子开始」后的相对秒数。

| 时间 | 阶段 | 画面 |
| --- | --- | --- |
| 0.0 – 0.7s | **接收任务** | 顶部出现 `task: compose joye.dev/home`，先给出明确指令。 |
| 0.7 – 1.55s | **调用工具** | `agent.runtime()`、`mcp.filesystem()`、`mcp.github()`、`memory.search()` 等工具面板依次出现，并用细线连接到中心。 |
| 1.55 – 2.55s | **生成碎片** | 每个 tool 面板输出小的内容 shard，例如 `posts`、`projects`、`OpenHarness`、`design taste`、`UI case`。 |
| 2.95 – 4.35s | **合并成形** | `merge: context shards → JOYE` 出现，粒子从各个工具位置汇入中央，拼出点阵「JOYE」。 |
| 4.35s 起 | **停留 / 进入** | 「进入 ~/joye →」按钮浮现，并出现 trace 彩蛋：`agent loop complete · context merged`。点击后粒子向上漂散约 0.85s，再让整层 overlay 在 0.9s 内淡出。 |

主动点击时通常约 **4–5s** 后即可进站；如果用户停留观赏，按钮出现约 **12s** 后会自动进入，避免挡住首页。任意时刻点击右下角「跳过 →」按钮，立即淡出进站。

## 视觉语言

- **跟随站点主题**（读取 CSS 设计变量，不写死颜色）：
  - 深色模式：青色粒子（≈ `hsl(195 95% 85%)`）+ 居中辉光，在深底上最「炸」。
  - 浅色模式：钢蓝粒子（基于 `--primary`，明度下压到 ≈40%、提高饱和与不透明度），保证在近白底上依然清晰、有重量。
- 粒子颜色沿水平方向有约 ±9% 的明度渐变，形成左深右亮的细微层次。
- **背景与站点 `--background` 同色**（所以淡出时背景不跳色）+ 一层径向主色辉光。
- 字形：用站点品牌字体 **Satoshi、700 字重**采样，字间距加宽到 `0.18em`，保证 J/O/Y/E 四个字母清晰可读。
- 「进入 ~/joye →」按钮在 JOYE 下方浮现，配色走 `--card` / `--border` / `--primary` 的半透明终端风，而不是高对比白色 CTA；右下角保留一颗更低调的 mono 字体「跳过 →」胶囊按钮，作为兜底。

## 技术实现（手写，无第三方动画库）

- **text→particle 采样**：离屏 canvas 用 Satoshi 700 画出加宽字距的「JOYE」，逐像素扫描（步距 `7×DPR`），`alpha > 128` 的像素记为一个目标点；约 1500–2000 个点（随视口与 DPR 变化）。
- **Agent run 层**：DOM 层呈现一个短任务链：`agent.runtime()`、`mcp.filesystem()`、`mcp.github()`、`memory.search()`、`examples.unitize()`、`merge_context()`；每个工具输出 1–2 个 shard，随后合并到 JOYE。
- **物理**：每颗粒子向目标点做弹簧吸引（汇聚 `ease≈0.045`，并按粒子延迟分批启动；停顿 `ease≈0.11`），速度阻尼 `0.87`；消散阶段改为向上漂移 + 轻微外扩，阻尼 `0.91`。
- **鼠标交互**：半径 `110×DPR` 内的粒子被反向推开，力随距离衰减。
- **星座连线**：仅在成形阶段，给距离 `< 26×DPR` 的相邻粒子之间画极低透明度连线。
- **揭幕**：点击「进入 ~/joye →」后先切到 `scatter`，粒子向上消散约 0.85s，再给 overlay 加 `.intro-done`（`opacity → 0`，0.9s）；因 overlay 背景与站点同色，淡出是「溶解」而非「换页」。
- **性能**：`DPR` 上限 2；动画结束即 `cancelAnimationFrame` 并移除节点；只在首页、每会话一次。

## 交互与无障碍规则

- **每次会话只播一次**：`sessionStorage` 标记 `intro-seen`；同标签刷新不重播；新标签 / 新会话重播。
- **可进入 / 可跳过**：点击「进入 ~/joye →」自然揭幕；点击「跳过」按钮立即揭幕；如果用户长时间停留，按钮出现约 12s 后自动进入。
- **尊重 `prefers-reduced-motion`**：直接不渲染、零动画（首屏即真实首页）。
- **首帧无闪**：overlay 在 HTML 里即不透明覆盖；一段同步 inline 脚本在首帧前判断「已看过 / 减少动效」并直接移除，避免老访客看到一闪。
- **SEO / 可访问性**：真实首页 HTML 始终在底层，overlay 仅是视觉层、`aria-hidden`，淡出后移除。

## 可调参数（改这些就能改观感）

| 想改什么 | 调哪里 |
| --- | --- |
| 节奏快慢 | 任务 0.12s / 工具 0.72s / shards 1.55s / merge 2.95s / 按钮 4.35s 出现 / 点击后上浮消散 0.85s / 淡出 0.9s |
| 粒子密度 | 采样步距（默认 `7×DPR`，越小越密） |
| 字号 / 字距 | `sampleText` 里的 `size` 与 `tracking`（0.18） |
| 粒子大小 | `r`（0.7–1.6 × DPR） |
| 浅色够不够「重」 | 浅色的 `baseL`(40) / `sat`(+18) / alpha 下限 |
| 显示的文字 | 把 `'JOYE'` 换成任意词即可（采样逻辑通用） |
| 触发频率 | `sessionStorage` → `localStorage` 可改成「永久只播一次」 |

## 复用 / 再生成提示词（English — 喂给 AI 用）

> A full-screen Canvas-2D intro overlay for a personal site's home page. It plays like a tiny agent
> run, not a decorative keyword cloud: `task: compose joye.dev/home` appears first, then tool panels
> for `agent.runtime()`, `mcp.filesystem()`, `mcp.github()`, `memory.search()`,
> `examples.unitize()`, and `merge_context()` invoke in sequence. Each tool emits 1-2 small content
> shards (`posts`, `projects`, `OpenHarness`, `design taste`, `UI case`), and particles originate
> from those tool positions before springing toward target points that spell **"JOYE"** in a bold
> sans-serif (targets sampled from offscreen-canvas text on a ~7px grid). Faint curves connect tool
> nodes to the center, nearby particles form subtle constellation links, and the final trace reads
> `agent loop complete · context merged`. A small glassy monospace "enter ~/joye →" button appears
> below the word. When clicked, particles drift upward and fade for ~0.85s while the whole overlay
> fades out over 0.9s and is removed, revealing the real page underneath — the overlay background
> matches the site background so it *dissolves* rather than cuts. Include a low-key skip button and a long fallback auto-enter timeout so the overlay never blocks the page. Theme-aware: cyan particles + glow on dark; darker, more-saturated
> steel-blue on near-white light mode (colours read from CSS custom properties `--primary` /
> `--background`). Plays **once per session** (sessionStorage), exits through the enter button or a
> small monospace "skip" pill, and fully disabled under `prefers-reduced-motion`. Vanilla JS, no
> animation libraries; spring easing toward targets, velocity damping ~0.87, DPR capped at 2.

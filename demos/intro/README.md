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

首页首次打开时，一层很淡的 Agent / 内容关键词（`context`、`planner`、`tools`、`memory`、`RAG`、`OpenHarness` 等）先浮在背景里，像站点正在读取上下文。随后成百上千颗钢蓝 / 青色粒子分批、放慢地从屏幕四周汇入，在中央拼出名字 **「JOYE」**。成形后动画不急着退场，而是停在一个可互动状态：用户可以移动鼠标拨动粒子，准备好后点击 **「进入 ~/joye →」**，粒子向上自然消散并整体淡出，露出底下真实的首页。

## 设计意图

- 给「内容已经很好、但缺视觉冲击」的博客补一记开场重拳，让路人第一眼就被抓住。
- 借开场展示前端功底，同时把视觉语义绑定到 Joye 平时做的事：Agent、上下文、工具、记忆、评估、内容写作，而不是一个可替换名字的通用粒子特效。
- 技术上仍是 text→particle 采样、Canvas 粒子物理、星座连线、鼠标交互，全部手写、零动画库。
- 不喧宾夺主：成形后把节奏交给用户，既可停留体验，也可随时进入 / 跳过；每次会话只播一次，并且**不另做 hero**，而是淡出露出真实首页 —— 过渡自然、零信息重复。

## 逐拍体验（时间轴）

> 时间基于「粒子开始」后的相对秒数。

| 时间 | 阶段 | 画面 |
| --- | --- | --- |
| 0.0 – 1.2s | **上下文浮现** | 屏幕周围出现很淡的 Agent / 内容关键词，作为“读入上下文”的氛围层。 |
| 0.2 – 3.15s | **分批汇聚** | 粒子从屏幕外一圈以更慢的弹簧式缓动分批飞向各自目标点，边飞边连出若隐若现的星座连线；中央一团柔和的主色辉光。 |
| 3.15 – 4.05s | **成形 / 停顿** | 粒子收束成清晰的点阵「JOYE」，做轻微呼吸式明暗闪烁；此时鼠标移动可把附近粒子推开，离开后回流复位。 |
| 4.05s 起 | **停留 / 进入** | 「进入 ~/joye →」按钮浮现，并出现一行很淡的 trace 彩蛋：`context loaded · tools ready · welcome back`。点击按钮后粒子向上漂散约 1.35s，再让整层 overlay 在 0.9s 内淡出；淡出结束后从 DOM 移除，真实首页完全显现。 |

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
- **语义背景层**：DOM token 层呈现 `context / planner / tools / memory / eval / RAG / OpenHarness / frontend / design` 等关键词；汇聚中逐渐变淡，像被吸收进 JOYE。
- **物理**：每颗粒子向目标点做弹簧吸引（汇聚 `ease≈0.045`，并按粒子延迟分批启动；停顿 `ease≈0.11`），速度阻尼 `0.87`；消散阶段改为向上漂移 + 轻微外扩，阻尼 `0.91`。
- **鼠标交互**：半径 `110×DPR` 内的粒子被反向推开，力随距离衰减。
- **星座连线**：仅在成形阶段，给距离 `< 26×DPR` 的相邻粒子之间画极低透明度连线。
- **揭幕**：点击「进入 ~/joye →」后先切到 `scatter`，粒子向上消散约 1.35s，再给 overlay 加 `.intro-done`（`opacity → 0`，0.9s）；因 overlay 背景与站点同色，淡出是「溶解」而非「换页」。
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
| 节奏快慢 | 上下文 1.2s / 汇聚 3.15s / 按钮 4.05s 出现 / 点击后上浮消散 1.35s / 淡出 0.9s |
| 粒子密度 | 采样步距（默认 `7×DPR`，越小越密） |
| 字号 / 字距 | `sampleText` 里的 `size` 与 `tracking`（0.18） |
| 粒子大小 | `r`（0.7–1.6 × DPR） |
| 浅色够不够「重」 | 浅色的 `baseL`(40) / `sat`(+18) / alpha 下限 |
| 显示的文字 | 把 `'JOYE'` 换成任意词即可（采样逻辑通用） |
| 触发频率 | `sessionStorage` → `localStorage` 可改成「永久只播一次」 |

## 复用 / 再生成提示词（English — 喂给 AI 用）

> A full-screen Canvas-2D intro overlay for a personal site's home page. First, a very subtle layer
> of agent/work tokens appears around the screen — `context`, `planner`, `tools`, `memory`, `eval`,
> `RAG`, `OpenHarness`, `frontend`, `design` — like the site is loading context. Then several
> hundred small particles fly in slowly from beyond the screen edges in staggered waves and spring
> toward target positions that spell the word **"JOYE"** in a bold sans-serif (targets sampled from
> offscreen-canvas text on a ~7px grid). While forming, faint constellation lines connect nearby
> particles and a soft radial glow sits behind. Particles then hold as an interactive constellation
> with a gentle twinkle and are repelled by the cursor within ~110px. A small glassy monospace
> "enter ~/joye →" button appears below the word, with a faint trace line: `context loaded · tools
> ready · welcome back`. When clicked, particles drift upward and fade for ~1.35s while the whole
> overlay fades out over 0.9s and is removed, revealing the real page underneath — the overlay
> background matches the site background so it *dissolves* rather than cuts. Include a low-key skip
> button and a long fallback auto-enter timeout so the overlay never blocks the page. Theme-aware: cyan particles + glow on dark; darker, more-saturated
> steel-blue on near-white light mode (colours read from CSS custom properties `--primary` /
> `--background`). Plays **once per session** (sessionStorage), exits through the enter button or a
> small monospace "skip" pill, and fully disabled under `prefers-reduced-motion`. Vanilla JS, no
> animation libraries; spring easing toward targets, velocity damping ~0.87, DPR capped at 2.

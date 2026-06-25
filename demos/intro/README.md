# 入场动画 · 设计与实现说明（Particle Constellation Intro）

> 这是 Joye 个人博客首页入场动画的完整自然语言描述，作为后续复用 / 再生成 / 写作的素材。
>
> - 对应组件：[`src/components/intro/IntroOverlay.astro`](../../src/components/intro/IntroOverlay.astro)，接入于首页 `src/pages/index.astro` 与 `src/pages/en/index.astro`。
> - 本目录另有三个独立全屏 demo（探索期的三个方向）：
>   - [`constellation.html`](./constellation.html) —— 动画一 · 粒子聚合
>   - [`terminal-boot.html`](./terminal-boot.html) —— 动画二 · 终端开机 `joye.init()`
>   - [`kinetic-type.html`](./kinetic-type.html) —— 动画三 · 动态排版 Kinetic Type
>   - [`index.html`](./index.html) —— 三方案对比画廊
>
> **当前状态（评审中）**：三个方向都已集成为组件里的「变体」，由左下角的 **Tweak 切换面板**（动画一 / 二 / 三 + replay）实时切换，方便对比。默认当前播放 **动画二 · 终端**。Tweak 面板是评审辅助工具，定稿前会下掉或加开关。
>
> 下方的「逐拍 / 视觉 / 实现」详述以 **动画一 · 粒子聚合** 为主线；动画二（终端开机）、动画三（动态排版）的描述见各自 demo 文件顶部与组件源码。

---

## 一句话

首页首次打开时，成百上千颗钢蓝 / 青色粒子从屏幕四周飞入、在中央汇聚拼出名字 **「JOYE」**，短暂停顿后炸散并整体淡出，露出底下真实的首页。

## 设计意图

- 给「内容已经很好、但缺视觉冲击」的博客补一记开场重拳，让路人第一眼就被抓住。
- 借开场展示前端功底：text→particle 采样、Canvas 粒子物理、星座连线、鼠标交互，全部手写、零动画库。
- 不喧宾夺主：约 3.5 秒、可随时跳过、每次会话只播一次；并且**不另做 hero**，而是淡出露出真实首页 —— 过渡自然、零信息重复。

## 逐拍体验（时间轴）

> 时间基于「粒子开始」后的相对秒数。

| 时间 | 阶段 | 画面 |
| --- | --- | --- |
| 0.0 – 1.7s | **汇聚** | 粒子从屏幕外一圈以弹簧式缓动飞向各自目标点，边飞边连出若隐若现的星座连线；中央一团柔和的主色辉光。 |
| 1.7 – 2.5s | **成形 / 停顿** | 粒子收束成清晰的点阵「JOYE」，做轻微呼吸式明暗闪烁；此时鼠标移动可把附近粒子推开，离开后回流复位。 |
| 2.5s 起 | **揭幕** | 粒子获得向外（略微向上）的随机速度炸散，同时整层 overlay 在 0.9s 内淡出；淡出结束后从 DOM 移除，真实首页完全显现。 |

总时长约 **3.5s**。任意时刻点击页面或右下角「跳过 →」按钮，立即淡出进站。

## 视觉语言

- **跟随站点主题**（读取 CSS 设计变量，不写死颜色）：
  - 深色模式：青色粒子（≈ `hsl(195 95% 85%)`）+ 居中辉光，在深底上最「炸」。
  - 浅色模式：钢蓝粒子（基于 `--primary`，明度下压到 ≈40%、提高饱和与不透明度），保证在近白底上依然清晰、有重量。
- 粒子颜色沿水平方向有约 ±9% 的明度渐变，形成左深右亮的细微层次。
- **背景与站点 `--background` 同色**（所以淡出时背景不跳色）+ 一层径向主色辉光。
- 字形：用站点品牌字体 **Satoshi、700 字重**采样，字间距加宽到 `0.18em`，保证 J/O/Y/E 四个字母清晰可读。
- 右下角是一颗 mono 字体的「跳过 →」胶囊按钮，配色走 `--card` / `--border` / `--muted-foreground`。

## 技术实现（手写，无第三方动画库）

- **text→particle 采样**：离屏 canvas 用 Satoshi 700 画出加宽字距的「JOYE」，逐像素扫描（步距 `7×DPR`），`alpha > 128` 的像素记为一个目标点；约 1500–2000 个点（随视口与 DPR 变化）。
- **物理**：每颗粒子向目标点做弹簧吸引（汇聚 `ease≈0.07`、停顿 `ease≈0.13`），速度阻尼 `0.86`；炸散阶段改为随机外向速度。
- **鼠标交互**：半径 `110×DPR` 内的粒子被反向推开，力随距离衰减。
- **星座连线**：仅在成形阶段，给距离 `< 26×DPR` 的相邻粒子之间画极低透明度连线。
- **揭幕**：给 overlay 加 `.intro-done`（`opacity → 0`，0.9s），结束后 `remove()`；因 overlay 背景与站点同色，淡出是「溶解」而非「换页」。
- **性能**：`DPR` 上限 2；动画结束即 `cancelAnimationFrame` 并移除节点；只在首页、每会话一次。

## 交互与无障碍规则

- **每次会话只播一次**：`sessionStorage` 标记 `intro-seen`；同标签刷新不重播；新标签 / 新会话重播。
- **可跳过**：点击 overlay 任意处或「跳过」按钮，立即揭幕。
- **尊重 `prefers-reduced-motion`**：直接不渲染、零动画（首屏即真实首页）。
- **首帧无闪**：overlay 在 HTML 里即不透明覆盖；一段同步 inline 脚本在首帧前判断「已看过 / 减少动效」并直接移除，避免老访客看到一闪。
- **SEO / 可访问性**：真实首页 HTML 始终在底层，overlay 仅是视觉层、`aria-hidden`，淡出后移除。

## 可调参数（改这些就能改观感）

| 想改什么 | 调哪里 |
| --- | --- |
| 节奏快慢 | 汇聚 1.7s / 停顿到 2.5s / 淡出 0.9s |
| 粒子密度 | 采样步距（默认 `7×DPR`，越小越密） |
| 字号 / 字距 | `sampleText` 里的 `size` 与 `tracking`（0.18） |
| 粒子大小 | `r`（0.7–1.6 × DPR） |
| 浅色够不够「重」 | 浅色的 `baseL`(40) / `sat`(+18) / alpha 下限 |
| 显示的文字 | 把 `'JOYE'` 换成任意词即可（采样逻辑通用） |
| 触发频率 | `sessionStorage` → `localStorage` 可改成「永久只播一次」 |

## 复用 / 再生成提示词（English — 喂给 AI 用）

> A full-screen Canvas-2D intro overlay for a personal site's home page. Several hundred small
> particles fly in from beyond the screen edges and spring toward target positions that spell the
> word **"JOYE"** in a bold sans-serif (targets sampled from offscreen-canvas text on a ~7px grid).
> While forming, faint constellation lines connect nearby particles and a soft radial glow sits
> behind. Particles hold for ~0.8s with a gentle twinkle and are repelled by the cursor within
> ~110px. Then they scatter outward while the whole overlay fades out over 0.9s and is removed,
> revealing the real page underneath — the overlay background matches the site background so it
> *dissolves* rather than cuts. Theme-aware: cyan particles + glow on dark; darker, more-saturated
> steel-blue on near-white light mode (colours read from CSS custom properties `--primary` /
> `--background`). Plays **once per session** (sessionStorage), skippable by clicking anywhere or a
> small monospace "skip" pill, and fully disabled under `prefers-reduced-motion`. Vanilla JS, no
> animation libraries; spring easing toward targets, velocity damping ~0.86, DPR capped at 2.

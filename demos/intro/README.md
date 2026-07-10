# 首页入场动画 Demo

这个目录保存第一代首页入场动画的探索原型。它们是独立 HTML 文件，只作为历史素材保留；当前生产实现位于 `src/components/intro/`，接入在 `src/pages/index.astro` 和 `src/pages/en/index.astro`。

## 文件说明

- `index.html`: 四个主要方案的对比画廊。
- `constellation.html`: 动画一，粒子聚合成 `JOYE`。
- `terminal-boot.html`: 动画二，终端启动 `joye.init()`。
- `kinetic-type.html`: 动画三，动态排版。
- `multi-agent.html`: 动画四，Multi-Agent 编排。
- `agent-story.html` / `agent-diffusion.html` / `constellation-emit.html`: 后续扩展实验，暂时只作为素材池保留。

## 为什么 README 放在这里

这份文档应该和 demo HTML 放在同一目录里。原因很简单：它解释的是这些一次性原型的取舍，不是站点通用规范；放在根目录会干扰项目 README，放在 `src` 又会让原型和生产代码混在一起。

## 当前生产方案

生产组件包含三个独立 variant，共用 `intro-controller.ts` 选择和管理生命周期：

- `focus`: F/1.4 / Into Focus，光圈和景深对焦后落到真实头像。
- `line`: One Continuous Thought，一条线连接琴弦、签名、代码、Agent 与页面结构。
- `jojo`: JoJo Pulls the Page，JoJo 拉开纸幕并落到常驻吉祥物位置；默认方案。

三个 variant 现在都是约 5 秒的长篇版本，会把头像、线稿或 JoJo 的最后一帧直接交给沉浸式首页，不再要求点击“进入”。首次自动播放使用版本化 localStorage 门控，回访可通过选择器主动重播。

## Trigger

- URL：`?intro=focus`、`?intro=line`、`?intro=jojo`，忽略已看门控并强制播放。
- 选择器：首页底部的“选择入场”。
- 事件：`window.dispatchEvent(new CustomEvent('joye:intro', { detail: { variant: 'focus' } }))`。
- API：`window.__joyeIntro.play('focus')`。
- 辅助：`?intro=picker` 直接打开选择器，`?intro=off` 禁用本次入场。

## 预览方式

直接在浏览器打开对应 HTML 即可，不需要启动 Astro dev server。要看生产接入效果，再运行：

```shell
bun dev
```

然后访问首页。

## 上线前检查

- 尊重 `prefers-reduced-motion`。
- 每个动画版本只自动播放一次，并提供首帧可用的跳过入口和 `Esc`。
- 不阻塞真实首页 HTML 的渲染和 SEO。
- 退出动画时背景色要和站点背景一致，避免闪屏。
- 删除或隐藏仅用于评审的 Tweak 面板。

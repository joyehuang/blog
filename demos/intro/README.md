# 首页入场动画 Demo

这个目录保存首页入场动画的探索原型。它们是独立 HTML 文件，用来快速比较方向；真正上线的实现位于 `src/components/intro/IntroOverlay.astro`，接入在 `src/pages/index.astro` 和 `src/pages/en/index.astro`。

## 文件说明

- `index.html`: 四个主要方案的对比画廊。
- `constellation.html`: 动画一，粒子聚合成 `JOYE`。
- `terminal-boot.html`: 动画二，终端启动 `joye.init()`。这是目前最适合作为首页默认方向的方案。
- `kinetic-type.html`: 动画三，动态排版。
- `multi-agent.html`: 动画四，Multi-Agent 编排。
- `agent-story.html` / `agent-diffusion.html` / `constellation-emit.html`: 后续扩展实验，暂时只作为素材池保留。

## 为什么 README 放在这里

这份文档应该和 demo HTML 放在同一目录里。原因很简单：它解释的是这些一次性原型的取舍，不是站点通用规范；放在根目录会干扰项目 README，放在 `src` 又会让原型和生产代码混在一起。

## 当前建议

优先保留并打磨 `terminal-boot.html` 对应的方向：

- 它和博客首页的终端、Agent 主题更一致。
- 动画语义清楚：像一次小型启动过程，而不是单纯的视觉特效。
- 性能和可访问性更容易控制，适合做成每个 session 只出现一次的轻量开场。

粒子聚合方案视觉冲击更强，但更像展示特效；Multi-Agent 编排信息量更大，适合做活动或项目页，而不是首页首次加载。

## 预览方式

直接在浏览器打开对应 HTML 即可，不需要启动 Astro dev server。要看生产接入效果，再运行：

```shell
bun dev
```

然后访问首页。

## 上线前检查

- 尊重 `prefers-reduced-motion`。
- 每个 session 只播放一次，并提供跳过入口。
- 不阻塞真实首页 HTML 的渲染和 SEO。
- 退出动画时背景色要和站点背景一致，避免闪屏。
- 删除或隐藏仅用于评审的 Tweak 面板。

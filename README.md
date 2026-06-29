# Joye Huang's Blog

这里是 [joyehuang.me](https://joyehuang.me) 的源码。它既是我的个人博客，也是我沉淀 Agent 开发、AI 全栈、求职面试和公开分享的地方。

## 关于我

我是 Joye，墨尔本大学在读，主要做 AI Agent 和全栈开发。现在同时在几个真实产品里踩坑：Adastra Labs / Playyy.ai、Tezign atypica、fAIshion.ai、AixCut / Goshu Tech。平时会写技术文章、做分享会，也做 Agent / ML 方向的模拟面试和简历陪练。

如果你想了解我，优先看这些入口：

- [博客文章](https://joyehuang.me/blog)：Agent、LLM、全栈和求职复盘。
- [一手笔记](https://joyehuang.me/archive)：还没整理成文章的工程笔记和面试题。
- [分享会](https://joyehuang.me/talks)：每周线上交流会，PPT 和回放会逐步公开。
- [项目](https://joyehuang.me/projects)：开源项目、产品尝试和活动。
- [联系我](https://joyehuang.me/contact)：付费咨询、模拟面试、交流群入口。

也可以在这些地方找到我：

- GitHub: [joyehuang](https://github.com/joyehuang)
- Bilibili: [Joye 的主页](https://space.bilibili.com/3546914882587480)
- X: [@deshiou0604](https://x.com/deshiou0604)

## 内容结构

- `src/content/blog`: 正式文章，默认中文，英文镜像使用 `post.en.mdx`。
- `src/content/archive`: 笔记、研究卡片和未完全文章化的内容。
- `src/content/curated`: 外部文章、论文、项目的精选与消化。
- `src/content/talks`: 分享会元数据，驱动 `/talks` 页面。
- `public/talks`: 可公开访问的幻灯片和分享素材。
- `demos`: 独立 HTML 原型和视觉实验。

## 技术栈

- Astro 5 + TypeScript
- React islands
- UnoCSS / Astro Theme Pure
- Bun
- Vercel Analytics / Speed Insights
- Waline comments

## 本地开发

环境要求：

- [Node.js](https://nodejs.org/): 18.0.0+
- [Bun](https://bun.sh/)：项目统一使用 Bun，不混用 npm / pnpm / yarn

常用命令：

```shell
bun install
bun dev
bun run build
bun preview
bun new
bun format
bun lint
bun yijiansilian
```

发布前至少跑：

```shell
bun run check
```

## 许可

代码基于 Apache 2.0 协议开源。文章、图片、PPT 和个人内容默认保留版权，引用请注明来源。

---
title: 2027 的 agent 平台：先把对话和运行时拆开
description: John Suh 的 2027 agent 平台蓝图把界面收成对话和审批收件箱，运行时只是三根柱子里的一根。另记 Dex 用 code mode 把每日 Linear 巡扫从 24.5 万 token 压到 2.3 万，以及 Warp 实测各阶段配子 agent 贵 40%、质量没有提升。
date: 2026-11-23
tags:
  - ai
  - agent
  - multi-agent
  - orchestration
  - workflow
  - software engineering
type: research
status: ready
source: https://x.com/john_ssuh/status/2124336124172935336
relatedNote:
  - 1126-deepseek-super-agent
  - 0326-harness-engineering-codex-production-practice
  - 0426-agent-routing-multi-agent-cost-control
draft: false
---

> 参考：<https://x.com/john_ssuh/status/2124336124172935336>

## 核心内容

John Suh（[@john_ssuh](https://x.com/john_ssuh)）2026-11-22 的长帖《Agent platform of 2027》，把 2027 年的 agent 平台收成花园的土壤：用户种下自己的种子，界面只留对话和审批收件箱，运行时、电脑、文件系统和事件监听拆开，而不是把编码 agent 的 session 直接摊给用户。平台要支持多种 agent 配置，并把定义、实例、会话分开。Harrison Chase 和 Elvis 接上同一句：运行时只是三根柱子里的一根，还缺评测和治理。

同一天，Factory 的 Dex 用 code mode 做了一次真实的每日 Linear 巡扫，不是实验室估算。245,000 token、7 分钟，改成程序先过滤之后是 23,000 token、36 秒。Warp 的 Zach Lloyd 在自己的工厂上测：各阶段各带子 agent，比更简单的做法贵 40%，质量没有明显提升。帖子没有逐项分数，视频大约 6 分 47 秒。

## 要点整理

### 1. 2027 agent 平台：花园的土壤

原文是 John Suh 2026-11-22 的长帖，原标题「Agent platform of 2027」。正文后面 4 张图才是完整蓝图。Elvis、Mario 和 Harrison Chase 先后引用了它。

一句话摘要：把 agent 平台做成花园的土壤，让用户种下自己的种子。用户界面是对话和审批收件箱。运行时、电脑、文件系统和事件监听要拆开，而不是把编码 agent 的 session 直接暴露给用户。

他认为 ChatGPT 和 Claude 应用层的终局，是一个让百万 agent 蜂群在上面工作的「agent 操作系统」，其它软件会退化成这个层的数据库。大多数 ADE、「企业 agent 平台」和垂直 SaaS 都看得太窄。花园的土壤是：用户种下自己的种子，由 agent、人和业务传感器里的信号一起养护，而不是再做一个「工厂的工厂」。

### 2. 蓝图拆开的几块

4 张图收成下面几块。八块原语是这张表。

| 一块             | 示意图上的一句            |
| ---------------- | ------------------------- |
| 对话             | 不是把 session 直接给用户 |
| 审批收件箱       | 只放批准和提问            |
| Actor 运行时     | 定义、实例、会话要分开    |
| N × M 电脑       | 沙箱和本地电脑            |
| 带权限的文件系统 | 代码、文件和应用          |
| Listener         | 自定义事件，不只是 cron   |
| 代码定义的工作流 | 不要用拖拽自动化          |
| 可 fork 的 App   | 像系统预装的默认应用      |

**把 agent 当成 actor**。现在很多可扩展的 agent 工作负载是用 Temporal 这类工作流引擎部署的。他认为会转向 actor，让每个 harness 有完全独立的运行时。运行时隔离是自我改进的前提：agent 要能当场给自己写扩展或 hook，同一个租户里也可以安全地跑不同的 agent loop。平台要支持多种配置，并把 agent 的定义、实例和会话分开。他特别写的反例：Anthropic 口头上主张一个超级 agent，但在形式化费马大定理时，每个 agent 只拿到 shell 和文件编辑器。「即使是主张超级 agent 的公司，露出的偏好也更接近代码定义的 Grok Bot 模型。」相关项目他点了 Cloudflare Durable Objects、Pi Durable、Vercel Eve、Rivet 和 DeepSeek Agent。

**电脑和环境**。平台要同时支持可检查点的沙箱克隆，以及人自己的本地电脑。N 个 agent 要能搭配 M 台电脑。例子是一个 agent 拉起 5 个沙箱做对比，或 1,000 个 agent 共用 100 台虚拟机。这些环境应该能由 agent 自己配置。

**带权限的共享文件系统**。蜂群跑在云上的共享 POSIX 文件系统上，权限和「哪台电脑」分开。这一层既像 GitHub（放 agent 生成的代码、扩展和定义），又像 Google Drive（放上传、下载和生成的文件与「应用」）。目录可以用 git 或 jj 做版本管理，也可以放 `.env`。权限模型可以是「agent 像人一样」，也可以按「是谁发起了这一轮」来授权，或两者混合。

**会话和对话拆开**。现在大多数编码 agent 产品把 agent session，包括中间的工具调用，直接展示给用户。他认为这是错的。用户交互的应该是「对话」，抽象级别相当于 Slack 频道、iMessage 或邮件线程。写给用户看的内容要通过一次工具调用发出去，而不是把底层 assistant 消息直接暴露出来。直接打开 agent session 应该像读代码库：用来检查和调试，不是主界面。他点名 2025–2026 年那些把编码 session 包一层就当产品的 ADE，会碰到 Cursor 已经碰到过的创新者窘境。相关产品写的是 Duet、Grok Bot 和 Dots。

**审批收件箱和 Listener**。用户会越来越多地面对一个只放审批和提问的收件箱，而不是把每段对话都读完。更关键的是事件层：agent 应该能按租户定义从外部世界进来的事件流（WebSocket、Kafka、CDC 等），再决定式或由 agent 翻译成可执行的信号。这些监听应该能当场搭建，不必等平台预置集成。他举的例子：「我希望 Capy Captain / Dots / Duet / 主 Grok Bot 对每封进来的邮件先经过 JEV 过滤，再触发一次 agent」；或者「这一周，只处理来自 acmecorp.com 的邮件，而且必须是即时的」。他的判断是，现在这个行业（Grok Bot、Muse、Instinct 等）其实只支持定时 cron，从平台视角触发一次 agent。如果不能把 webhook 集成写成插件，Listener 和 Monitor 才是真正的超集。相关项里写着 Claude Code Monitor，以及「Grok Bot 的未来功能」。

**代码定义的工作流，以及可 fork 的 App**。长周期、混合「agent 步骤 + 确定性步骤」的流程，应该用代码写在这个平台上，而不是用 n8n、Zapier 那种拖拽自动化。界面则全部收敛成文件系统里的 App（他也叫 Artifact）：像操作系统预装的默认应用一样，用户得到一份可改的克隆。垂直 SaaS 假设同一个行业共享足够多的流程，所以可以做成统一界面。他认为这个假设作为创业命题已经破了。更好的形态是，用户直接让自己的 agent 去改应用，而不是等供应商的实施团队来配置。

### 3. Harrison 的三根柱子

Harrison Chase 认为这是一份很好的未来 agent 运行时愿景，接近他们在 LangSmith 里做的 agent server、沙箱和 deepagents harness，但运行时装的是打算让 agent 怎么做，agent 并不会总按打算去做，所以自我改进还要观测和评测（实际发生了什么、调用了哪些工具、在哪些场景下表现如何，进化之后它多半还会给自己写测试），以及用 LLM 网关和工具网关强制执行的治理（以谁的身份调用工具、怎么用这些工具、能花多少钱）。

Elvis 强调多种 agent 配置，以及定义、实例和会话要分开，点名了文中的 Pi Durable、Eve 和 Grok Bot，并建议加上 DeepSeek Harness、Exo、记忆和知识（Harrison 前一天写的知识工厂），再加一层评测，因为不能测量就不能优化。

它有效，是因为它不是又一篇「agent 会取代软件」的空话，而是把平台拆成可以逐项对照的原语，并且用 Anthropic 自己的研究项目当反例，说明口头上的超级 agent 和实际给每个 agent 的工具不是一回事。这种长文可以拿去当设计清单。

### 4. code mode：程序先过滤，再把字段交回模型

Dex（[@dexhorthy](https://x.com/dexhorthy)，在 Factory 做 MTS）2026-11-23 发帖。原标题是 “holy shit i just implemented a weird code mode hack…”。有人问节省主要来自不再把所有 Linear issue 拉进上下文，还是先用代码过滤和批量调用，他答主要是让模型只看到对决策有用的 Linear 字段，而不是通常会吐出来的大块 JSON。

问题是普通 agent loop。模型每调一次工具，原始返回就会追加进上下文。像每日扫一遍 Linear 这种活，字段又多又长，上下文会被 JSON 撑满，既贵又慢。

他改成 Procedural Tool Calling，也就是 code mode。模型先写一段程序去调工具、在程序里过滤，再把精简结果交回模型。帖子没有再展开实现细节。

|            | 直接塞进上下文   | 程序先过滤（PTC） |
| ---------- | ---------------- | ----------------- |
| 模型看到的 | 整包 Linear JSON | 只留决策字段      |
| token      | 245,000          | 23,000            |
| 时间       | 7 分钟           | 36 秒             |

大约只剩原来的十分之一 token，时间大约是原来的十二分之一。

Factory 在 10 月 29 日的 [Droid 1.0 博文](https://factory.com/news/frontier-harness)里写过同一套思路。PTC 是默认机制。模型写一段在沙箱里跑的 JavaScript，他们叫 Script tool。原始工具输出留在程序变量里，模型只拿到程序的输出。一次程序里可以跑许多次互不依赖的调用。检查和循环由代码确定性地执行，而不是指望模型每一步都不偷懒。

同一天稍早，他还写了一条 harness 该自己做多少的长帖。有人把立场改成用模型厂的 harness，但要能随时换。Dex 的拆法更细：不要因为是实验室做的就盲目整份照搬。但工具定义和系统提示是他们做强化学习时的一部分，改掉这些，就基本上是在靠自己了。编排、背压、正向压力、工具集、hook 实现、记忆和上下文，这些应该自己拥有。真正核心的 agent loop，除非有很强的反证，他会尽量对齐前沿实验室的 harness。

PTC 把「模型一步步看原始输出」换成「代码先做完确定的过滤和批量调用」，省下的不只是钱，还有轮次。harness 那条给了一个可执行的分界，避免在「全自建」和「全托管」两极之间摆动。

### 5. 各阶段配子 agent：贵 40%，质量没有明显提升

Zach Lloyd（[@zachlloydtweets](https://x.com/zachlloydtweets)，Warp 创始人）2026-11-23 发帖。原标题是 “I benchmarked whether it was more or less effective and efficient to have different factory stages use their own subagents.” 附了一段约 6 分 47 秒的视频。说明在 [warp.dev/factories](https://warp.dev/factories)。

给工厂的不同阶段各自配一套子 agent，听起来像是更「agent 原生」的拆法，也是现在线上很常见的叙事。他想用自己的设置验证：这样到底更有效，还是只是更贵。

公开写出来的结论只有这一句：子 agent 方案比更简单的做法贵 40%，质量没有明显提升。他说这和网上关于子 agent 的叙事相符，但仍然值得用自己的数据证明一遍。帖子本身没有再列出各阶段的逐项分数。

这是一个具体的门槛：先证明拆出去的子 agent 在质量和成本上值得，再拆。它也和第 1 条对上。平台可以支持很多种 agent 配置，不等于每个阶段都要变成一个独立的 agent。这不是外部评测，而是工厂的建造者在自己的流水线上测出来的。

可以借鉴的做法：挑一个已经在跑、而且看起来该拆成子 agent 的流程（比如巡检、评测、写日报），做一次小对照。同一批任务，带专职子 agent 和不带，各跑一轮，只看成本和错误率。如果贵了却没有质量收益，就保持简单。

### 6. 另外几条

- Aiden Bai（[@aidenybai](https://x.com/aidenybai)）做了一个本地、120 FPS 的 GitHub 代码浏览页：把任意仓库 URL 里的 github.com 换成 egithub.com 即可打开。可以马上试，但不是 agent 工程方法。
- Elvis 推荐了 Google 的 [BuggyMLE](https://arxiv.org/abs/2611.25088)。向 222 个能跑的机器学习仓库注入受控 bug 来升高难度。最强模型在最容易一档的解决率是 95%，最难一档掉到 9%。用这份课程训练的 Qwen3.5-9B 能把 SWE-bench Lite 从 24% 拉到 33%。方法清楚，也有真实数字，但主要是给模型训练做课程，不是明天就能装上的评测卡口。
- Matt Pocock 在打磨一个「理想 TypeScript 代码库」skill，和给非开发者用的 `/vector` 工作流。都还在早期，等可以公开安装再看。
- poteto 又在推 pstack 的仓库清理，和前几期重复。同站已有 [pstack](/notes/1026-pstack)。

## 相关链接

- Harrison Chase 的引用：<https://x.com/hwchase17/status/2124654748104302930>
- Elvis 的推荐：<https://x.com/omarsar0/status/2124506354324840953>
- Mario 的引用：<https://x.com/badlogicgames/status/2124577986988916931>
- Dex 的 code mode 帖：<https://x.com/dexhorthy/status/2124624191563698426>
- Dex 的 harness 分界帖：<https://x.com/dexhorthy/status/2124613833050472826>
- Factory Droid 1.0：<https://factory.com/news/frontier-harness>
- Zach Lloyd 的对照帖：<https://x.com/zachlloydtweets/status/2124592480674779605>
- Warp factories：<https://warp.dev/factories>
- Aiden Bai：<https://x.com/aidenybai/status/2124550726882136542>
- BuggyMLE：<https://arxiv.org/abs/2611.25088>
- 同站：[Super-agent](/notes/1126-deepseek-super-agent)、[Harness Engineering 与 Codex 生产实践](/notes/0326-harness-engineering-codex-production-practice)、[Agent Routing 与多智能体成本控制](/notes/0426-agent-routing-multi-agent-cost-control)、[pstack](/notes/1026-pstack)

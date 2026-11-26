---
title: 2027 的 agent 平台：先把对话和运行时拆开
description: John Suh 的 2027 agent 平台蓝图主张把对话界面与底层运行时拆开，而运行时只是三根柱子里的一根。另记 Factory 用 code mode 把每日 Linear 巡检从 24.5 万 token 压到 2.3 万，以及 Warp 实测各阶段配子 agent 贵 40% 且质量未见提升。
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

## 核心内容

2026 年 11 月 22 日，John Suh（@john_ssuh）发了长帖《Agent platform of 2027》。他把未来的 agent 平台比作「花园的土壤」：用户种下自己的种子，前端只留对话和审批收件箱，底层则把运行时、电脑、文件系统和事件监听拆开，而不是把编码 agent 的 session 直接摊到用户眼前。平台要支持多种 agent 配置，并把定义、实例、会话三者分离。Harrison Chase 和 Elvis 随后不约而同地补了一句：运行时只是三根柱子里的一根，还缺观测评测与治理。

2026 年 11 月 23 日，又有两组一线实测。Factory 的 Dex 用 code mode 改写了每天例行的 Linear 巡检，把单次消耗从 245,000 token、7 分钟压到了 23,000 token、36 秒。同一天，Warp 的 Zach Lloyd 在自家流水线上做了对照：给不同阶段各自配专职子 agent，成本比简单方案高出 40%，质量却没有明显提升。

这篇按这几条线索往下记：

- 蓝图总纲：「花园的土壤」与拆出的八个模块
- 运行时之外，Harrison Chase 和 Elvis 补上的观测、评测与治理
- code mode：先用代码过滤，再把关键字段交回模型（以及 harness 的自建边界）
- 各阶段配子 agent：贵了 40%，质量没有明显提升
- 顺手记的四条动态：120 FPS 代码浏览、BuggyMLE 课程、TypeScript skill 和 pstack

## 要点整理

### 1. 2027 的 agent 平台：花园的土壤

John Suh 这条长帖的重点在文末那 4 张架构图。[Elvis](https://x.com/omarsar0/status/2124506354324840953)、[Mario](https://x.com/badlogicgames/status/2124577986988916931) 和 [Harrison Chase](https://x.com/hwchase17/status/2124654748104302930) 先后转发讨论了它。

在 John Suh 看来，ChatGPT 和 Claude 这类应用层的终局，是一个能让百万级 agent 蜂群在上面协作的「agent 操作系统」，其他软件最终会退化成这个操作系统底下的数据库。按这个尺度看，眼下大多数 ADE、「企业 agent 平台」和垂直 SaaS 看得都太窄了。他不认为答案是再造一个「工厂的工厂」，而是把平台做成「花园的土壤」——用户种下自己的种子，再由 agent、人和来自业务系统的信号一起养护。

### 2. 蓝图拆出的八个模块

那 4 张图把整个平台拆成了八个核心模块：

| 模块             | 核心思路                           |
| ---------------- | ---------------------------------- |
| 对话             | 面向用户的高层交互，不暴露底层会话 |
| 审批收件箱       | 集中收拢需要人拍板和回答的事项     |
| Actor 运行时     | 独立隔离，把定义、实例和会话拆开   |
| N × M 电脑       | 云端沙箱与本地电脑解耦，多对多搭配 |
| 带权限的文件系统 | 统一存放代码、文件和应用           |
| Listener         | 监听外部事件流，不止于定时 cron    |
| 代码定义的工作流 | 用代码写混合流程，不做拖拽自动化   |
| 可 fork 的 App   | 像系统自带的默认应用，用户可随时改 |

**把 agent 当成 actor。** 目前很多可扩展的 agent 工作负载跑在 Temporal 这类工作流引擎上，但 John Suh 判断行业会转向 actor 模型，让每个 harness 拥有完全独立的运行时。运行时隔离是 agent 自我改进的前提：它需要能当场给自己写扩展或 hook，同一个租户里也要能安全地混跑不同的 agent loop。平台因此要支持多种配置，并且把 agent 的定义、实例和会话分开管理。他举了个反例：Anthropic 口头上主张单一的「超级 agent」，但在形式化费马大定理的研究里，每个 agent 实际拿到的只有 shell 和文件编辑器——「哪怕是主张超级 agent 的公司，真落到代码里，偏好也更接近代码定义的 Grok Bot 模型。」他提到的相关项目包括 Cloudflare Durable Objects、Pi Durable、Vercel Eve、Rivet 和 DeepSeek Agent。

**N × M 的电脑与执行环境。** 平台要同时接住两类机器：带检查点、随时能克隆的云端沙箱，以及用户自己的本地电脑。agent 和电脑不该是一对一绑死的，而是 N 个 agent 灵活搭配 M 台电脑——比如一个 agent 拉起 5 个沙箱做横向对比，或者 1,000 个 agent 共用 100 台虚拟机。而且这些环境应该能由 agent 自己按需配置。

**带权限的共享文件系统。** agent 蜂群运行在一个云端共享 POSIX 文件系统之上，权限策略和「具体在哪台机器上跑」解耦。这一层身兼两职：既像 GitHub，存放 agent 生成的代码、扩展和配置定义；又像 Google Drive，存放上传、下载和产出的数据文件与小型应用。目录可以用 git 或 jj 做版本管理，也能存放 `.env`。权限模型既可以把 agent 当作独立用户来授权，也可以按「谁发起了这一轮任务」来委托授权，或者两者混用。

**把「对话」和「会话（session）」拆开。** 现在多数编码 agent 产品会把完整的 agent session——包括中间密密麻麻的工具调用——直接摊给用户。John Suh 认为这是走偏了。用户面对的应该是「对话」，抽象层级相当于 Slack 频道、iMessage 或邮件线程；真正要给用户看的内容，应该由 agent 通过一次工具调用显式发出来，而不是把底层 assistant 消息直接吐到主界面。打开原始 agent session 应该像翻代码库一样，用来检查和调试，不该成为默认交互。他顺带点名了 2025–2026 年那些给编码 session 套一层壳就当产品的 ADE，认为它们很快会碰上 Cursor 已经遇到过的创新者窘境。相关产品他提到了 Duet、Grok Bot 和 Dots。

**审批收件箱和 Listener。** 当后台同时跑着大批 agent，人不可能把每段对话从头读到尾，日常入口会收敛成一个只放审批和提问的收件箱。更关键的是事件层：agent 应该能按租户定义外部事件流（WebSocket、Kafka、CDC 等），再由确定性代码或 agent 翻译成可执行的信号，而且这些监听规则应该能当场搭建，不必苦等平台预置集成。他举了两个很具体的场景：「让 Capy Captain / Dots / Duet / 主 Grok Bot 对每封进来的邮件先过一遍 JEV 过滤，再触发一次 agent」，或者「这一周里，只即时处理来自 `acmecorp.com` 的邮件」。在他看来，目前行业里的产品（Grok Bot、Muse、Instinct 等）大多还停留在定时 cron，从平台侧按时触发 agent。靠平台一个个预置 webhook 插件永远覆盖不完，Listener 和 Monitor 才是更通用的超集。这一块他举了 Claude Code Monitor，还把监听列为 Grok Bot 的未来功能。

**代码定义的工作流，以及可 fork 的 App。** 长周期、混合了「agent 步骤 + 确定性步骤」的业务流程，应该直接用代码写在这个平台上，而不是退回到 n8n、Zapier 那类拖拽式自动化。至于应用界面，最终会全部收敛为文件系统里的 App（他也称作 Artifact）：就像操作系统预装的默认应用一样，用户拿到的是一份随时可改的副本。垂直 SaaS 成立的前提，是同一行业共享足够多的流程，所以能用一套统一界面服务所有人；他认为这个创业命题已经失效了。更合理的形态是让用户直接指挥自己的 agent 去改应用，而不是等供应商的实施团队来慢慢配置。

### 3. 运行时之外：评测与治理

Harrison Chase 很认可这份蓝图，觉得方向和他们在 LangSmith 里做的 agent server、沙箱和 deepagents harness 很接近。但他点出了一个关键缺口：**运行时管的是「打算让 agent 怎么做」，可 agent 并不会总是按预期行事。** 如果真要让系统自我改进，光有运行时不够，还得补齐另外两根柱子：

- **观测与评测**：记录实际发生了什么、调用了哪些工具、在不同场景下表现如何。到自我演进的阶段，agent 大概率还会反过来给自己写测试。
- **治理**：通过 LLM 网关和工具网关做硬性约束——以谁的身份调用工具、允许怎么用、最多能花多少钱。

Elvis 的回应则把重点落在了「多种 agent 配置」以及「定义、实例、会话分离」上。他点名了蓝图里的 Pi Durable、Eve 和 Grok Bot，并建议把 DeepSeek Harness、Exo、记忆与知识（呼应 Harrison 前一天聊到的「知识工厂」）一并放进版图，再补上一层评测——没法度量，就无从优化。

这份蓝图能当设计清单来用，在于它没有停在「agent 会取代软件」的空泛判断上，而是把平台拆成了一组可以逐项核对的原语，还顺手拿 Anthropic 自己的研究项目作对照，点出了「口头上的超级 agent」和「实际给工具的方式」之间的落差。

### 4. code mode：先用代码过滤，再把字段交回模型

2026 年 11 月 23 日，Factory 的工程师（MTS）Dex（@dexhorthy）在 [X 上分享了一次 code mode 实测](https://x.com/dexhorthy/status/2124624191563698426)，跑的是每天例行的 Linear 工单巡检。

按常规 agent loop 的做法，模型每调一次工具，完整的原始返回就会追加进上下文。像每日巡检 Linear 这种任务，返回体字段又多又长，上下文很快会被大包 JSON 撑满，既烧钱又拖慢速度。

Dex 把这一步改成了 Procedural Tool Calling（PTC，也就是 code mode）：让模型先写一段程序去调用工具、在代码里筛掉无关数据，最后只把精简后的结果交回给模型。有人追问省下来的开销主要靠什么，他回复说，核心就是让模型只看做决策真正需要的字段，不再硬吞整包 JSON。

|            | 直接塞进上下文   | 程序先过滤（PTC） |
| ---------- | ---------------- | ----------------- |
| 模型看到的 | 整包 Linear JSON | 只留决策字段      |
| token      | 245,000          | 23,000            |
| 耗时       | 7 分钟           | 36 秒             |

token 消耗降到原来的约十分之一，耗时缩到约十二分之一。

Factory 在 2026 年 10 月 29 日的 [Droid 1.0 博文](https://factory.com/news/frontier-harness)里就写过这套思路，并把 PTC 做成了默认机制：模型生成一段在沙箱里运行的 JavaScript（他们叫 Script tool），工具的原始返回留在脚本变量里，模型只能拿到脚本的输出。一次执行可以顺手跑完多个互不依赖的调用，校验和循环也交给代码确定性地完成，不必寄望于模型每一步都不偷懒。

同一天稍早，Dex 还发了一条关于 [harness 到底该自己做多少](https://x.com/dexhorthy/status/2124613833050472826)的长帖。当时有人提出「直接用模型厂的 harness，但保留随时切换的余地」，Dex 给出的分界更具体：没必要因为是实验室出品就全盘照搬，但要分清哪些改不得、哪些必须握在自己手里。工具定义和系统提示往往参与了模型厂商的强化学习训练，随手大改这两样，基本等于放弃了模型原生的配合度；真正应该由团队自己掌控的，是编排、背压与正向压力、工具集、hook 实现、记忆和上下文管理。至于核心的 agent loop，除非有很强的反证，他倾向于尽量对齐前沿实验室的 harness。

合起来看，PTC 把「模型逐轮消化原始输出」变成「代码先做确定的过滤和批处理」，省的不只是 token，还有来回的轮次；harness 的分界则帮团队避开「全部自建」和「完全托管」两个极端。

### 5. 各阶段配子 agent：贵了 40%，质量没有明显提升

2026 年 11 月 23 日，Warp 创始人 Zach Lloyd（@zachlloydtweets）发帖分享了[一组在自家 agent 工厂上的基准对照](https://x.com/zachlloydtweets/status/2124592480674779605)（附有约 6 分 47 秒的视频，流水线背景见 [warp.dev/factories](https://warp.dev/factories)）。

给流水线的不同阶段各自配一套专职子 agent，听上去很符合眼下「agent 原生」的架构叙事。Zach 想在自己的真实系统里验证一下：这样拆到底更有效，还是只是更贵。

他给出的结论很直接：**给各阶段配子 agent，成本比更简单的方案高了 40%，质量却没有明显提升。** 原帖没有展开各阶段的细分分数，他只说这个结果和社区里关于子 agent 的普遍体感一致，但仍然值得用自家数据真正跑一遍。

这条一线实测正好给前面 John Suh 的蓝图加了一道现实约束：平台底层可以支持多种 agent 配置，不等于业务流程里的每一个阶段都该拆成独立子 agent。是否要拆，不妨设一道简单的门槛——拿同一批正在跑的任务（比如巡检、评测或写日报），带专职子 agent 和不带各跑一轮，直接看成本和错误率。如果多花了钱却换不来质量提升，就老老实实保持简单。

### 6. 顺手记的四条动态

- [Aiden Bai](https://x.com/aidenybai/status/2124550726882136542)（@aidenybai）做了一个本地渲染、120 FPS 的 GitHub 代码浏览页，把任意仓库链接里的 `github.com` 换成 `egithub.com` 就能直接打开体验。
- Elvis 推荐了 Google 的 [BuggyMLE](https://arxiv.org/abs/2611.25088)：团队向 222 个可运行的机器学习仓库注入受控 bug，按难度分级。前沿模型在最容易一档的解决率高达 95%，到最难一档会跌到 9%；拿这份数据集当训练课程，能把 Qwen3.5-9B 在 SWE-bench Lite 上的成绩从 24% 拉到 33%。它的定位更偏向模型训练课程，还不是拿来就能挂进工程流水线的现成评测集。
- Matt Pocock 正在打磨一个「理想 TypeScript 代码库」skill，以及面向非开发者的 `/vector` 工作流，目前还在早期阶段，等正式开放安装再看。
- poteto 继续在分享用 pstack 清理代码库的做法，同站之前已经记过一篇完整的 [pstack 笔记](/notes/1026-pstack)。

---
title: 一个 agent 同时干很多活，靠的是系统结构
description: DeepSeek Harness 的 Super-agent 长文：Router 不执行、Worker 一事一会话、快慢通路和 Watchdog，以及委派实验的对照。另记 Patrick Collison 的 improvements 输入框。
date: 2026-11-02
tags:
  - ai
  - agent
  - multi-agent
  - orchestration
  - routing
  - software engineering
  - workflow
type: research
status: ready
source: https://x.com/DeepSeekHarness/status/2116857257245987236
relatedBlog:
  - 20261011---alwaysonagents/post
relatedNote:
  - 0326-harness-engineering-codex-production-practice
  - 0426-agent-routing-multi-agent-cost-control
  - 1026-ai-pilled-company
draft: false
---

> 参考：<https://x.com/DeepSeekHarness/status/2116857257245987236>

## 核心内容

2026-11-02 的 X 精选页只留了两条，覆盖 11-01 早上 8 点到 11-02 早上 9 点（墨尔本时间）。主条是 DeepSeek Harness 团队的 X 长文，讲怎么把 agent 从「一个会话一件事」做成一直在线、同时推进很多任务的系统。另一条是 Patrick Collison 给自己的小应用加的「改进」输入框。这篇按那一页改写，数字和取舍以该页所记为准。

旁边已有三篇挨着的笔记，材料不是同一篇，所以没有并进去。[Agent Routing](/notes/0426-agent-routing-multi-agent-cost-control) 记的是通用调度和成本，[Harness Engineering](/notes/0326-harness-engineering-codex-production-practice) 记的是 Codex 的生产实践，[常驻舰队](/notes/1026-ai-pilled-company) 记的是 Spawn 的做法。

页面上的两张图是带动画的 SVG，markdown 里放不进去。结构改成下面的步骤，压测数字改成表。

DeepSeek 那条最值得留。系统拆成只管对接人和派活的 Router、各管一件事的 Worker，输入改成事件，外面再挂一个独立的 Watchdog 看每个 Worker 有没有实质进展。实验里最硬的一组：单会话加上「该委派就委派」，5 次里一次都没委派；改成「优先委派」，5 次里委派了 4 次；结构上不让 Router 干活的版本，p95 完成时间 15.7 分钟，中性提示词那版是 29.5 分钟。

第二条是产品形态。用户写一句改进，agent 直接实现。页面认为这和点子墙、回答反馈是同一条链路的两头。

看过但没展开的，页面自己跳过了。Karpathy 的 HackerTube（让 Claude 从 20 年的 HN 评论里筛出 6454 个反复被推荐的视频）有 2 万多赞。Thorsten Ball 讲 agent 时代改用 trunk-based 开发的帖，10-30 那期推过，这次只是追了一条回应。mattpocockuk 的 Sandcastle 当时只是一段产品宣传语。swyx 的 low effort 加 critique loop 是在转 theo。mitsuhiko 说 Opus 两周能重写 CPython，只是一句判断。badlogicgames 的 pi-schema 是一个 JSON schema 库。

## 要点整理

### 1. 原文在讲什么

原文是 DeepSeek Harness（@DeepSeekHarness，页面记约 4.6 万粉）的长文《Exploring Super-agent Design: Towards a More Autonomous Agent System》，作者 Yujia Qiao，11-01 发出。页面记当时 7768 赞、7400 收藏、85 万浏览。omarsar0（约 32.7 万粉）转发时说这是他读过最贴近自己带 agent 团队方式的文章，那条转发有 865 收藏。badlogicgames（Mario Zechner，Pi 的作者）说内容和他们在 earendil 的方向基本一致。开源原型是 [dsh-superagent-prototype](https://github.com/deepseek-ai/dsh-superagent-prototype)。

文章的问题：单个任务受限于模型能力，同时跑多个任务受限于人的注意力。一个人通常只能盯 3 到 5 个活跃会话，所以要让系统而不是人去管理会话。顺序是两层架构、事件驱动、全双工多渠道、计算和状态和执行环境分离、Watchdog、实验、还没解决的问题。

### 2. 单个 ReAct 循环给不了的四件事

现在主流 agent 以单个会话为工作单位，会话之间互相隔离。给本地单会话接上 CLI、MCP 和连接器，它能收到外部消息，但还是同步跑在一个会话里。长操作卡住对话，不同任务的上下文混在一起，本机一离线就全停。

他们要的四个特征：

- 用户在 IM 和 GitHub 评论里跟它说话，始终觉得是同一个 agent
- 能同时推进几件复杂的事，上一件没完就能接下一条指令
- 不等人一步步吩咐，盯着环境里的事件自己动手，没事就不出声
- 一直在线，出了异常能自己恢复

文章的判断是，任何单个 ReAct 循环都给不了这四样，只能靠外面的系统结构。

### 3. Router 不执行，Worker 只管一件事

两种不够用的摆法。所有事件进一个会话，上下文最连续，但 ReAct 一次走一步，吞吐低，不同任务的中间细节搅在一起。每个事件开一个新会话，吞吐上去了，结果彼此脱节，好几个会话分别回复用户也很乱。

他们拆成两层。

**Router**。一个长期存活的会话，接收所有入口的人类消息。它是全局的顺序点、协调点和记忆。它不执行任务，连 Bash 工具都可以没有，只负责和人对话、派活、记住任务之间的关系。文章特意和常见的 Agent Team 分开：Team Lead 要把一个复杂任务拆细、协调成员，推理负担很重。Router 不拆单个任务，活比想象中简单，用较轻的模型就够快也够好。

**Worker**。每个会话只做一件事，上下文隔离、工具齐全，用最强的模型。从不直接对人说话，只向 Router 汇报。几个 Worker 碰到同一个 PR 时，都订阅这个 PR 的事件流，自己就能看到对方在干什么、自己解决冲突。少数需要跨任务协调的事才由 Router 转达。

页面那张架构图，静态下来是这六步：

1. 环境事件进来：群聊消息、PR 评论、CI 结果、邮件、日历。
2. 先过代码过滤，看来源和白名单。
3. 新任务交给 Router。Router 只对接人、派活。
4. Router 把活派给 Worker A、Worker B、Worker C。
5. 同一个 PR 或话题一旦有 Worker 订阅，后续事件绕过 Router，直接到那个 Worker。
6. Watchdog 画在主系统外面：定时检查进展，不只看进程是否活着。

### 4. 事件分快慢两条路

agent 的输入不再是人敲的提示词，而是群消息、邮件、日历提醒、评审评论、CI 结果。文章叫 Trigger。

真实群聊里绝大多数消息不需要 agent 管，所以先走代码做的快路径：按来源、群、用户或 bot 白名单判断。每个来源可以设成「只回应明确请求」「当作候选」或「忽略」。过了这一关的候选事件才交给模型，按写成提示词的策略决定要不要动手。这一层也是人随时用自然语言加减规则的地方。

路由同样分快慢。Router 第一次为某个 PR、IM 话题或邮件串派出 Worker 后，这个 Worker 直接订阅这条线程，之后的事件由代码直接递给它。Router 只处理还没人订阅的新事件。

### 5. 上下文当缓存：Inline、Spill、Chain of Recall

注入太多，窗口被塞满，注意力被稀释。注入太少，模型要反复调工具去读。他们借编译器的说法分两种操作。

**Inline**：把马上可能用到的信息直接放进窗口。

**Spill**：太长或少用的内容留在窗口外，只放一个引用或摘要。

具体顺序是先只给当前对象的 ID 和摘要，再按时间和空间上的相邻关系补一点。例子有前 50 个字、这条 IM 消息的前后几条和它回复的那条、同一段代码评审里相邻的评论。超长的截断，并留下「后面在哪」的指针。

Router 的老任务记不住全部历史。他们给 Trigger、线程、Worker 会话都编上唯一 ID，注入时带上相关对象的 ID。模型可以顺着 ID 一跳一跳往回查。他们叫 Chain of Recall。

还有一条借 CPU 的推测执行。内部用户群配了「静默复现并修复」：有人报问题或讨论改动时，agent 先在后台试着复现、找修法。只有确认了问题、也找到了简单修法才出声，否则全程不说话。

### 6. 全双工，以及不同渠道怎么说话

耗时的命令和工具改成异步的 `start()` 和 `stop()`。`start()` 立刻返回「已开始」，结果回来时作为一条新事件送回会话，所以 agent 在后台跑长任务时也能马上回应新消息。开源原型里，前台 shell 命令超过 5 秒就转成后台任务。

渠道不同，说话方式不同。IM 里尽量少打扰，只在需要决定或签字时找人，只问直接的问题，给简短结论。他们验证过一条硬规则：每条回复不超过 100 个词。GitHub、邮件、文档这类异步渠道要信息密集，PR 要写清背景、改动和验证结果。

### 7. 计算、状态、执行环境分开，再加 Watchdog

跑 agent 循环的计算可以是无状态的云容器，会话等状态放数据库。容器随便重启替换，本机睡眠也不影响 agent 在线。

执行环境往往有没提交的改动、私有凭证、内网依赖和特定工具链，很难同步到云上，所以干脆不搬。每台执行机器只跑一个不存状态的轻量守护进程，只负责执行命令、返回结果。用户自己的电脑也能接进来，离线时相关任务等它重新上线再继续。

文章提到 Anthropic 的 “Decoupling the brain from the hands” 是同一思路。区别是 Anthropic 讲托管服务，他们先要接的是人每天用、时在时不在的个人电脑。精选页没有附这篇文章的链接。

长期在线的系统只靠内部逻辑撑不久，需要主系统之外独立的控制循环。很多异常不是崩溃：进程还活着，但模型在原地打转，或者偏离了目标。Watchdog 是一个由定时消息驱动的独立 agent 会话。它既处理 API 报错、状态恢复失败这类基础设施问题，也用模型判断每个 Worker 有没有实质进展。维护者还能用自然语言问它为什么出错，让它在系统运行中改提示词或调整触发规则。

### 8. 实验数字

合成负载，文章自己也说结果只作参考。端到端实验每轮约 300 条群聊和 GitHub CI 消息，其中约 20 条是真正的工作请求。编码工作用一个只耗时间的工具模拟。四种设计各跑 5 次。

| 设计                                                   | 页面记下的结果                                                                                  |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| Super-agent，结构上 Router 不执行                      | 从请求到结果 p50 12.4 分钟，p95 15.7 分钟                                                       |
| 单会话加子 agent 工具，中性提示词「合适时用 subagent」 | 5 次里一次都没委派。活都在主会话里，不断被新消息打断。p95 29.5 分钟                             |
| 同一套单会话，提示词改成「优先委派」                   | 5 次里委派了 4 次。剩下那次模型觉得活很小，自己干了，拖出一条长尾                               |
| 去掉直达订阅                                           | 完成时间差不多。Router 每轮多做约 30% 的决策。缓存读取 token 从 2320 万涨到 3180 万，多了约 37% |

Router 单独压测，页面说取的是文章 7.2 节的两端。需要决策的事件从每分钟约 1 个加到约 40 个。事件越密，单次请求略慢，摊到每个决策快了约四倍。原因是一轮推理期间到达的事件会在下一轮被合并处理。

|              | 约 1 个事件/分钟 | 约 40 个事件/分钟 |
| ------------ | ---------------- | ----------------- |
| 平均每批     | 1.0 个           | 2.8 个            |
| 单次请求     | 2.5 秒           | 3.9 秒            |
| 摊到每个决策 | 6.4 秒           | 1.6 秒            |

### 9. 他们自己标成还没解决的

- Router 什么时候该分片，Worker 之间什么时候该直接通信，还要更多场景验证。
- 系统跑上几个月以后，长期记忆会成为主要瓶颈。
- 会话对用户隐藏之后，任务该怎么展示给人，人怎么在中途插手。他们的实例直接在 GitHub Issue 和 PR 里工作。
- 组织变大以后，开几个 Super-agent 实例等于决定哪些上下文共享、哪些隔离。实例之间就变成 agent 对 agent 通信。
- 安全上，云端循环不断吃进外部事件，执行机器上有私有代码和凭证。一次提示注入就可能波及所有接入的机器。所以 agent 需要一种能用凭证、但看不到凭证的方式。

### 10. 为什么这组对照有分量

页面的判断：它没提出新理论，用的都是计算机系统里的老办法，快慢路径、订阅分发、缓存和溢出、推测执行、存算分离、外部控制循环。最有分量的是委派那组对照。同一个模型，靠提示词决定要不要委派，结果取决于它当时觉得活大还是小。把「Router 不执行任务」做成结构，这个不稳定就没了。页面把这和 Joye 一直坚持的方向放在一起：规矩放在结构里，而不是靠提示词里多写一句。

### 11. 「改进」输入框

Stripe CEO Patrick Collison（[@patrickc](https://x.com/patrickc/status/2116636967517798672)，页面记约 184 万粉，3922 赞、3637 收藏、34 万浏览）在 11-01 早上发帖。他给自己所有用 vibe coding 做的个人应用都加了一个 improvements 功能：一个自由输入框，接着一个 agent，用户写什么它就直接实现什么。打磨毛边、加新功能的门槛低到几乎没有。另一个在用他应用的人，几天里已经提交了 150 个改进。他叫做 liquid software，觉得没有这个功能的软件都开始显得有点僵硬。

他自己列了没想清楚的地方：时间长了会不会没法维护，多人协作的软件怎么用这个模式，这样做出来的软件能不能安全可靠。结论是，至少在个人场景里很好用。

Sentry 创始人 David Cramer（[@zeeg](https://x.com/zeeg/status/2116657400312971463)，约 3.6 万粉，146 赞、141 收藏）接了两句。一是 Sentry 已有的 [User Feedback](https://docs.sentry.io/product/user-feedback/) 可以承接这类输入。二是他们正在 Sentry 的 MCP 里试一件事：agent 在某个东西没按它的预期工作时，用同一个接口自动提交反馈。反馈的来源不只是人，用产品的 agent 本身也成了提意见的用户。

页面觉得值得留，是因为它把用户反馈和开发之间那段人工流程压得很短。Patrick 担心的维护、协作、安全，是团队产品绕不开的三件事。zeeg 的补充是另一头也在变：提反馈的可能是 agent。

## 和 Joye 相关

页面把 Super-agent 对到 Joye 11-01 日报里的三件事。

**派出去的活没有进展。** #1468 连派三次 Claude 都没推新提交。Forge 的复盘是「下次先看会话卡在哪」。Tata 也写了「P1 PR 超过 2 小时没新提交就去问」。这是文章里 Watchdog 判断 Worker 有没有实质进展的那一层。页面写当时靠两个 bot 各自记着。

**执行机器是单点。** Mac mini 磁盘写满，同时拖垮了 CI runner 和主群，断了约 13.5 小时。Watch 的复盘写着 #317 之前 Mac mini 仍是单点。文章第 5 节的思路是只把执行环境留在那台机器上，循环和状态都不放在那里。

**巡查看的是连接，不是任务。** Watch 的巡查每 5 分钟看一次 connected 和 napcat。复盘里反复写「只看了连接状态，没核对主群真实回复」。文章说的是 Watchdog 要看任务进展，不能只看进程活没活着。

另外，Tata 写到她合 PR 太快，Forge 和 Watch 的日报写完时 main 已经变了。这类谁手里的状态过时了，文章用的办法是让相关 Worker 都订阅同一条事件流。

Forge、Watch、Tata、Scout、Ledger 的分工记在[常驻舰队那篇](/notes/1026-ai-pilled-company)。这一页没有重讲那份名单。

页面给出的最小一步：给派出去的任务加一个独立的进展检查。定时看每个开着的 PR 或 Claude 会话最近一次提交时间，超过阈值就判定卡住，交给一个会话去看原因，而不是原样重派。再往后，可以对照原型仓库的 [003 Execution](https://github.com/deepseek-ai/dsh-superagent-prototype/blob/main/docs/003-execution.md)，看 Router 和 Worker 的工具集怎么分、5 秒怎么转后台。原型目前只支持 github.com 和飞书，要求给 agent 单独开一个 GitHub 用户账号。GitHub App 不行，因为它要读账号通知。页面的结论是适合读，不一定适合直接装。

页面还留了一句以后可以做成博客或视频的题目：「我的 7 个 bot 对照 Super-agent 的五个模块」。每个模块配一件团队里发生过的事，比如 #1468 重派三次、Mac mini 磁盘满，然后说打算先补哪一块。委派实验的 0/5 和 4/5 被标成适合做开场。五个模块这一页没有逐个点名，这里不补。

夹夹这边，页面写两头都有现成的东西。一头是 #1330 点子墙，当时 CI 绿、可合并，等 Joye 决定上不上。另一头是 #1464，需求是「回答反馈几乎没数据」。Ledger 的统计里 10-31 一次回答反馈都没有，10-30 是 4 次，其中 3 次是同一条回答上来回点的。点子墙如果上线，要定的是点子落到哪一步就停：直接派 agent 实现，还是只开 issue 进 Tata 的流程。另外，问夹夹自己调工具失败时，页面举的例子是 Scout 记录的线上搜索 30 秒不返回，能不能像 zeeg 说的那样由 agent 自动记一条反馈，而不是只等用户点踩。短视频的设想页面也写了：拿点子墙做演示，讲会在哪一步加人工把关。

## 相关链接

- DeepSeek Harness 长文：<https://x.com/DeepSeekHarness/status/2116857257245987236>
- 原型仓库：<https://github.com/deepseek-ai/dsh-superagent-prototype>
- 原型 003 Execution：<https://github.com/deepseek-ai/dsh-superagent-prototype/blob/main/docs/003-execution.md>
- Patrick Collison 的 improvements 帖：<https://x.com/patrickc/status/2116636967517798672>
- David Cramer 的回复：<https://x.com/zeeg/status/2116657400312971463>
- Sentry User Feedback：<https://docs.sentry.io/product/user-feedback/>
- 本篇改写的精选页：<https://files.joyehuang.dev/notes/x-picks-20261102.html>
- 页脚写的其他材料：DeepSeek Harness 的 X 长文全文、dsh-superagent-prototype 仓库、patrickc 和 zeeg 的帖子、qqbot 10-31 与 11-01 开发日报。数据截至 2026-11-02 早上（墨尔本时间）
- 同站：[Agent Routing 与多智能体成本控制](/notes/0426-agent-routing-multi-agent-cost-control)、[Harness Engineering 与 Codex 生产实践](/notes/0326-harness-engineering-codex-production-practice)、[常驻舰队](/notes/1026-ai-pilled-company)

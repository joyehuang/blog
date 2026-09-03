---
title: 什么是 Agent Harness：定义、四组件与「你拥有它」的论点
description: Earendil 官方博客《What is a Harness?》深读 + 三方材料对照（Mario Zechner 锐评、Glukhov harness 评测、DeepSeek Harness 源码、我们自己的 pi 栈实践）——climbing harness 类比、四组件逐个拆解（含学校推荐信的完整 loop 案例）、translation layer 的政治含义、中性开源 harness 谱系，以及「模型是租的、harness 是可拥有的」这条所有权分界线。
date: 2026-09-02
updatedDate: 2026-09-03
tags:
  - ai
  - agent
  - llm
  - software engineering
type: reference
status: ready
source: https://earendil.com/posts/what-is-a-harness/
relatedNote:
  - 0926-deepseek-harness-internals
  - 0326-harness-engineering-codex-production-practice
draft: false
---

## 核心内容

「Agent = Model + Harness」这个等式已经满天飞，但 harness 到底指什么，多数文章语焉不详——有的把它当成 prompt 工程的同义词，有的把它当成「套壳」。Earendil（pi 背后公司）2026-08-20 的《What is a Harness?》是目前最清晰的入门定义。这篇文章单独读是个不错的定义文，但把它和 Mario Zechner（pi 作者）的锐评、独立评测者的 harness 横评、以及我们自己通读过的 DeepSeek Harness 源码对照着读，可以拼出一张立体得多的地图——定义、实现上限、和日常实践三个视角各占一角。

## Climbing Harness 类比

作者的切入是攀岩安全带（climbing harness）：它连接你和绳索——防坠落、控节奏、管路线；它还有装备环，可以挂粉袋、快挂、镁粉袋。核心隐喻在后半句：**换一座山，你可以带着它走，按地形改装装备环**。攀岩 harness 的本质是可适配、可被拥有者改造成自己东西的装备。

Agent harness 同构：它提供一个模型运行的环境，且用户可以直接拥有和改装它。这个类比选得准，因为它把「harness 不是模型的一部分，而是模型外面的装备」和「装备属于使用者」这两件事一次讲清了。

## 四组件

### I. System Prompt

规定模型在 harness 语境下如何响应的指令集。作者给了一个和「Claude 的 soul document」的对照来划边界：Claude Opus 4.5 那份被广泛讨论的 soul document 是模型**训练时内化**的自我认知，而 system prompt 更像**新员工入职第一天拿到的工作守则**——它没有被内化，但知道在该工作场景下应该遵守。system prompt 随每一轮 prompt 一起注入，负责让模型在 harness 的语境下做出恰当行为。

「内化 vs 随身携带」这个区分很关键：soul document 是模型公司写进权重里的，你改不了；system prompt 是 harness 的组成部分，**每轮都注入、每轮都可以改**——这就把「谁能定义 agent 的行为边界」这个问题的答案从模型厂挪到了 harness 侧。

### II. Tools

一组用代码写的能力，模型可以「调用」。harness 做两件事：描述工具（让模型知道有什么可用）+ 提供工具本身的软件实现（web search、执行代码、写邮件）。**关键设计约束：harness 通常不规定模型何时、如何使用工具**——它只是把工具摆出来、描述清楚，把「何时用、怎么用」的决策权留给模型。

这个「描述清楚但不指挥」的边界值得细想：工具描述的质量直接决定模型会不会用、用得好不好，但决策链路又必须留给模型——这是 harness 设计里「给信息不给指令」的一个微妙平衡。

### III. Agentic Loops

loop 是 harness 的本质组件。作者用了一个完整的例子讲清楚它，这个例子值得完整复述，因为它把「loop 到底在循环什么」讲得比大多数文章都具体：

假设 harness 里有 WebSearch、WriteCode、ComposeEmail 三个工具，用户要求 agent 对比本地小学的排名和测试成绩并给出推荐。模型的行为序列：

1. 理解请求——「primary school」是什么、「local area」指哪里、用户在乎什么排名（靠预训练知识）
2. 构造搜索 query 抓取数据
3. **在 harness 里，模型能把搜索结果放回原始请求的上下文里审视**——它可能判断第一次搜索没抓到对的信息或不够多，于是**自己决定再搜一次**。作者强调：这个「基于自我评估决定再次调用工具」的决定，就是 loop 的第一个清晰实例
4. 数据够了，模型用 WriteCode 造电子表格（"所有电子表格都只是代码"），用它做数学、格式化结果
5. 把表格和原始 prompt 对照——如果数据不满意，loop 回去再搜
6. 满意了，调用 ComposeEmail：审查发现、写摘要、把电子表格作为附件
7. 模型审查最终产出，认为任务完成——**agentic loop 闭合**

用户在几秒后收到一封正文带摘要推荐、附件是数据表格的邮件。整个过程的本质是：**模型基于自己对自己产出的评估来决定是否再调用工具**——自我评估驱动的再调用，这就是 agent 和「一次调用」的区别。

### IV. Translation Layer

让同一个 harness 配不同模型工作的翻译层——甚至可以在同一个 loop 里给不同步骤用不同模型（不同模型擅长不同任务）。这是四组件里政治含义最重的一层，下一节专门讲。

## Translation Layer = 用户主权

作者把 translation layer 的意义讲得非常直白：**它把权力和杠杆从 AI 实验室手里拿回终端用户手里**。具体拆开是三层：

- **agency（能动性）**：拥有并本地运行自己的 harness，意味着你保留能动性——你的 agent 不是别人 SaaS 里的一个租户
- **改装自由**：保留把工具变成自己东西的自由
- **会话所有权**：本地保留会话副本——这些会话「随时间累积成人机往来通信（correspondence with machines）」，这批资产应该在你手里

同一封邮件可以发给 OpenAI、Anthropic、开源权重模型，对比结果、对比成本，答案留在一个地方——而不是散在三个 App 里。「cost-per-task」这个开源模型的价值度量也被顺带点出来：翻译层让成本对比成为可能。

## 中性开源 harness 的谱系

Harness 不是天生开源中立的。第一个流行的 agent harness Claude Code 就不中性——它是「用 Claude 模型在你本地写代码」的**应用**。此后开源 harness 增长迅速：OpenClaw、OpenCode、Hermes、Pi。

Earendil 的立场是把 pi 做成**中性的、交付能力选择与自由的** harness：system prompt 短、工具集最小、开箱即用地「让开」；用户在使用中扩展它——改 system prompt、写适配工作流的扩展、互相分享（pi 用户已互享 5,000+ 扩展）。pi 免费开源，跑在你自己的笔记本上。

结尾立场句值得原样记录：「我们会用清醒的眼睛和紧握的手去驾驭它们；确保我们挥舞锤子，而不是锤子挥舞我们。」（with clear eyes and a firm grip; ensuring that we wield the hammer, the hammer does not wield us）

## 三方对照：同题不同答

单看 Earendil 这篇，harness 是一个四组件的静态定义。把另外三个材料对进来，图景就立体了：

**视角一：定义（本文）**。四组件 + 所有权论。价值在于给出了讨论 harness 的公共词汇表——之后所有 harness 讨论（包括下面两条）都可以落在「它在改哪个组件」的坐标系里：改 system prompt 的（各家 style）、改工具层的（MCP 生态）、改 loop 的（planning/反思机制）、改 translation layer 的（路由、降级、多模型）。

**视角二：实现（DeepSeek Harness 源码调研，见同主题卡）**。四组件之上还有整整一层「harness 的自我工程化」：一切皆插件到主循环自己都是一行配置、append-only 事件日志做唯一真相源、工具执行管线的单调守卫与信号熔合、沙箱 fail-closed。它证明 harness 的天花板远比「定义 + 几个工具」高——从定义到生产级 harness 之间隔着的不是功能，是并发正确性、可恢复性、审计性这些工程密度。

**视角三：用户实测（Mario Zechner 的锐评与独立评测者的 harness 横评）**。从使用侧看 harness 差异落在哪：扩展生态（能不能装别人的扩展、写自己的）、记忆方案（session 怎么存、跨会话怎么检索）、上下文管理（何时压缩、压缩策略是否 KV-cache 友好）、以及 system prompt 的干预空间。这些维度在定义文里只是一行字，在真实使用里是每天都要做的取舍。

**视角四（我们自己的日常）**：pi 的扩展 + Telegram 桥 + 记忆注入 + skills，就是「拥有并改装 harness」这个论断的 everyday practice。最有说服力的一条：translation layer 让我们可以在 OpenRouter / Command Code 之间按成本与稳定性路由模型（8 月底 GLM 延迟毛刺排查 → 切换路由的整个过程），这正是作者说的「自由与选择」的日常形态——不是口号，是出问题时你有第二条路可走。

## 当前理解 / 结论

- 「Agent = Model + Harness」的等式里，**模型是租的、harness 是可拥有的**——这个所有权区别是 2026 年 agent 生态的政治经济学基础。Garry Tan 的 personal AGI 论（见同主题卡）是它的另一个表述；AI 实验室把产品做成「模型 + 锁定 harness」，中立派把 harness 做成通用装备
- 四组件中 **loop 是本质**（自我评估驱动的再调用），**translation layer 是杠杆**（模型可替换性）。两者合起来解释了为什么 harness 层的创新速度比模型层对用户的实际影响更大：模型升级你只能等，harness 升级你可以自己做
- harness 谱系正在分化：**极简中性派**（pi：短 prompt、少工具、用户扩展）、**深度插件派**（DeepSeek Harness：43 万行、门禁、双语规范）、**应用派**（Claude Code：绑定自家模型的开箱即用）。选型时先问「我要所有权和可改装，还是要开箱即用」——两头的优势不可兼得，中间路线反而两头不占
- 评测一个 harness 时，四组件是个完整的检查表：它的 loop 有什么正确性保证？工具层怎么管策略？system prompt 留了多少干预空间？translation layer 是不是真开放（还是只开了一个口）？

## 相关链接 / 来源

- 原文：[What is a Harness? — EARENDIL](https://earendil.com/posts/what-is-a-harness/)（2026-08-20）
- 对照材料：Mario Zechner 博文、Glukhov《Pi Review》、[deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)（完整源码审阅见同主题卡）
- 同主题卡片：DeepSeek Harness 源码解读、Harness Engineering 与 Codex 生产实践

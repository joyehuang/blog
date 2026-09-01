---
title: 什么是 Agent Harness：定义、四组件与「你拥有它」的论点
description: Earendil 官方博客《What is a Harness?》深读 + 三方材料对照（Mario Zechner 锐评、Glukhov harness 评测、DeepSeek Harness 源码）——harness 的四组件拆解、与 climbing harness 的类比、translation layer 带来的用户主权、以及中性开源 harness 为什么重要。
date: 2026-09-02
updatedDate: 2026-09-02
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

「Agent = Model + Harness」这个等式已经满天飞，但 harness 到底指什么，多数文章语焉不详。Earendil（pi 背后公司）2026-08-20 的《What is a Harness?》是目前最清晰的入门定义，把它和我们在 pi / Claude Code / Codex / DeepSeek Harness 上的实际使用与源码调研对照着读，可以拼出一张完整的地图。

## Climbing Harness 类比

作者的切入是攀岩安全带：harness 连接你和绳索（防坠落、控节奏、管路线），还能挂粉袋快挂等工具；**换一座山你可以带着它走，按地形改装装备环**——攀岩 harness 是可适配、可被拥有者改造成自己的东西。Agent harness 同构：提供一个模型运行的环境，用户可以直接拥有和改装它。

## 四组件

1. **System Prompt**：规定模型在 harness 语境下如何响应的指令集。作者给了个准确的类比——模型训练内化的规则像 Claude 的「soul document」，而 system prompt 更像**新员工入职第一天拿到的工作守则**：它没有内化，但知道在该工作场景下遵守。每轮随 prompt 注入
2. **Tools**：用代码写成的、模型可以「调用」的能力集（搜索、执行代码、发邮件）。关键设计立场：**harness 通常不规定模型何时如何用工具**——只把工具做出来、描述清楚，用不用、怎么用由模型自己决定
3. **Agentic Loop**：整个框架最核心的机制。作者用「选小学」的例子走了一遍完整循环：理解请求 → 构造搜索 → 评估结果不满意 → **自己决定再搜一次**（这就是 loop 的第一课）→ 写代码做表格 → 对照原始请求不满意 → 回头再搜 → 满意后发邮件。**「基于自我评估决定再次调用工具」是 agent 区别于单轮问答的本质**
4. **Translation Layer**：让同一个 harness 配不同模型工作的翻译层——甚至可以在同一个 loop 里给不同步骤用不同模型。这是四组件里政治含义最重的一层（见下）

## Translation Layer = 用户主权

作者把 translation layer 的意义讲得很直白：**它把权力和杠杆从 AI 实验室手里拿回终端用户手里**。拥有并本地运行自己的 harness 意味着：保留 agency（能动性）、保留把工具改成自己东西的自由、保留会话的本地副本——「人与机器的往来通信」积累在自己手里。同一个问题可以发给 OpenAI、Anthropic、开源权重模型，对比结果、对比成本、答案留在一个地方——而不是散在三个 App 里。

## 中性开源 harness 的谱系

第一个流行的 agent harness Claude Code 不是中性的——它是「用 Claude 模型在你本地写代码」的应用。此后开源 harness 增长迅速：OpenClaw、OpenCode、Hermes、Pi。Earendil 的立场是把 pi 做成**中性的、交付能力选择与自由的** harness：system prompt 短、工具集最小、开箱即用地「让开」，用户在使用中扩展它（pi 用户已互享 5000+ 扩展），改 system prompt、写适配工作流的扩展、互相分享。

结尾的立场句值得记录：「我们会用清醒的眼睛和紧握的手去驾驭它们；确保我们挥舞锤子，而不是锤子挥舞我们。」

## 三方对照：同题不同答

把这篇和另外两个材料对读，「harness 是什么」的图景就立体了：

- **Mario Zechner 的锐评**（pi 作者的另一篇）和 **Glukhov 的 Pi Review**（独立评测博主，评测过多个 harness）：从用户视角看 harness 的差异——扩展生态、记忆方案、上下文管理的取舍
- **DeepSeek Harness 源码调研**（我们的完整源码审阅，见同主题卡）：从实现视角看 harness 能做到什么程度——「一切皆插件」到主循环自己都是一行配置、事件日志作为唯一真相源。它证明四组件之上还有整整一层「harness 的自我工程化」空间
- **我们的日常实践**：pi 的扩展 + Telegram 桥 + 记忆注入 + skills，就是在「拥有并改装 harness」这个论断上的 everyday practice——translation layer 让我们可以在 OpenRouter / Command Code 之间按成本与稳定性路由模型，这正是作者说的「自由与选择」的日常形态

## 当前理解 / 结论

- 「Agent = Model + Harness」的等式里，**模型是租的、harness 是可拥有的**——这个所有权区别是 2026 年 agent 生态的政治经济学基础，Garry Tan 的 personal AGI 论是它的另一个表述
- 四组件中 loop 是本质（自我评估驱动的再调用），translation layer 是杠杆（模型可替换性），两者合起来解释了为什么 harness 层的创新速度比模型层对用户的实际影响更大
- harness 谱系正在分化：极简中性派（pi）、深度插件派（DeepSeek Harness）、应用派（Claude Code）——选型时先问「我要所有权和可改装，还是要开箱即用」

## 相关链接 / 来源

- 原文：[What is a Harness? — EARENDIL](https://earendil.com/posts/what-is-a-harness/)（2026-08-20）
- 对照材料：Mario Zechner 博文、Glukhov《Pi Review》、[deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)

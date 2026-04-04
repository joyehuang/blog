---
title: Agent Routing 与多智能体成本控制
description: 围绕 agent route / agent routing 的基础概念、常见实现方式，以及 multi-agent 系统里的成本控制思路整理。
date: 2026-04-04
updatedDate: 2026-04-04
tags:
  - ai
  - agent
  - llm
  - multi-agent
  - orchestration
  - routing
  - workflow
type: research
status: ready
source: https://gemini.google.com/share/572c022c7cde
draft: false
---

## 核心内容

这张卡片想记的是一个在 agent 系统里非常基础、但一旦做真实产品就会立刻变得很关键的概念：

> **Agent Routing / Agent Route，本质上是在多智能体系统里决定“这件事该交给谁做、按什么顺序做、要带着哪些上下文去做”的调度层。**

如果只把它理解成“把请求分给不同 agent”，其实还不够。
更准确一点说，它同时涉及三件事：

- **任务识别**：当前请求到底属于什么类型
- **能力匹配**：应该交给哪个 agent / tool / workflow
- **执行编排**：是一跳直达，还是多步串联，还是 supervisor 持续监督

Gemini 分享链接里给的是一个很入门但很清楚的解释：

- Agent Route 很像“前台分诊台”
- 它决定请求先去搜索 agent、代码 agent、财务 agent，还是别的执行单元
- 在复杂任务里，它不只是一次分发，而可能是连续的任务接力

而 Botpress 那两篇文章把这件事往产品化方向又推进了一层：

- 一篇强调 **routing 是 multi-agent 系统的大脑**
- 一篇强调 **一旦 routing 做成动态、多层、多模型协作，成本和延迟就会迅速变成系统级问题**

所以我现在更愿意把这个主题理解成：

> Agent Routing 不是一个小功能，而是 multi-agent architecture 里连接 **意图理解、任务分发、上下文传递、延迟控制、成本控制** 的核心层。

## 要点整理

### 1. Agent Routing 解决的不是“会不会做”，而是“谁来做”

单 agent 系统的默认假设是：

- 用户说什么
- 同一个 agent 都尽量接住

但只要系统里开始出现多个专家角色，这个假设就不成立了。

比如一个系统里有：

- research agent
- coding agent
- browser agent
- reporting agent
- human escalation channel

这时真正先要解决的问题，不是某个 agent 本身会不会写报告，而是：

- 当前请求需要搜索、分析、写作还是执行操作
- 是由单个 agent 完成，还是多个 agent 接力
- 哪个 agent 最值得先调用
- 哪一步必须转人工

也就是说，routing 先解决的是 **任务归属**。

如果这一步做不好，后面即使每个 agent 本身能力不错，系统整体也会显得：

- 反应慢
- 容易绕路
- 容易重复调用工具
- 成本飙升
- 用户体验很像“被踢皮球”

### 2. Routing 本身就已经是 multi-agent 的一部分

用户原问题里有一个很对的直觉：

> “这个也涉及到 multi agent 了吧？”

是，**而且通常不是边缘问题，是核心问题。**

因为只要存在：

- 多个专家 agent
- 多种工具
- 多阶段任务
- supervisor / orchestrator

routing 就已经是 multi-agent system 的调度中枢。

更具体地说，multi-agent 往往至少包含下面几个层次：

1. **Orchestrator / Router**
   - 负责理解当前任务该怎么拆
   - 决定交给谁
2. **Worker / Specialist Agents**
   - 各自做特定子任务
3. **Context Handoff Layer**
   - 把必要上下文、参数、历史传下去
4. **Verification / Supervisor Layer**
   - 检查结果是否合格，必要时重试或改派

所以“multi-agent”不只是很多 agent 并排放着，
而是这些 agent 之间有一套 **谁先做、谁后做、何时回退、何时升级** 的机制。

这套机制里最先出现的能力，就是 routing。

### 3. 常见 routing 方式其实可以分成三类

#### A. 静态 / 规则路由

最简单的方式是：

- 关键词匹配
- if/else
- 正则
- 显式枚举规则

比如：

- 出现 refund / billing → finance agent
- 出现 code / bug / stack trace → coding agent
- 出现 angry complaint → human escalation

优点：

- 快
- 便宜
- 可控
- 易于解释和调试

缺点：

- 很脆
- 不擅长处理自然语言变体
- 遇到多意图、语气转换、跨轮对话时很容易错

这种方式适合：

- 任务边界非常清晰
- 业务空间有限
- 对可控性要求极高

#### B. LLM-based semantic routing

这也是现在最常见的做法：

- 给模型一份 agent / tool capability 描述
- 让模型根据用户输入和上下文判断“下一步该去哪里”
- 输出一个结构化路由结果，比如：

```json
{"next_agent":"research_agent","reason":"user asks for competitor info before writing report"}
```

优点：

- 灵活
- 能理解语义
- 能处理比较自然、模糊、跨轮的请求

缺点：

- 比规则路由慢
- 每次路由都要额外花 token
- 可能误判，也可能幻觉出不合适的 agent

所以它虽然强，但如果滥用，会把每一步都变成“再问一次大模型”，最终导致：

- latency 变高
- cost 变高
- 整体系统过度依赖 router model

#### C. 分层 / Supervisor 路由

再复杂一点的系统会进入 hierarchical routing：

- 顶层 supervisor 先决定大方向
- 某个子系统内部再做二级路由
- 子 agent 做完后把结果交回上层验收

这已经不只是“分发”，而是 **编排 + 监督**。

它的优点是：

- 适合复杂业务流
- 可以显式控制阶段与责任边界
- 容易挂接 retry / validation / fallback

但缺点也很明显：

- 架构复杂
- 链路更长
- 上下文传递更容易膨胀
- 调一次完整任务可能消耗多轮模型调用

### 4. 真正的难点不是选中 agent，而是把正确上下文一起送过去

这点在很多“agent routing 是什么”的解释里容易被说轻。

实际上，路由最难的部分往往不是：

- “选 research agent 还是 coding agent”

而是：

- **把哪部分上下文传给下游 agent**
- **哪些历史要保留，哪些噪声要裁掉**
- **参数要不要标准化**
- **结果回传后由谁来继续决策**

如果 handoff 做不好，就会出现典型问题：

- 子 agent 不知道自己为什么被调用
- 子 agent 没拿到关键约束
- 上游和下游看到的任务描述不一致
- 每次切 agent 都重新喂大段上下文，造成 token 浪费

所以 routing 实际上和下面几个词是绑在一起的：

- orchestration
- context engineering
- state management
- tool schema design

我的判断是：

> 在真实系统里，routing quality 很大程度上取决于 handoff quality。

### 5. Routing 的设计会直接决定成本结构

Botpress 那篇 cost optimization 文章虽然不是专门讲 multi-agent，但放到这里看非常有启发。

因为多智能体系统的一个天然风险就是：

> 每多一个路由判断、每多一次 agent handoff、每多一层模型调用，成本和延迟都会累积。

几个特别值得记的点：

#### a. 不要把所有问题都交给最贵模型

高成本模型应该保留给：

- 复杂判断
- 高风险分流
- 高价值回答

能用更轻的逻辑解决的，就不要强行上大模型。

这意味着 routing 层本身就应该有 **cost-aware policy**：

- FAQ / 明确规则 → 静态路由
- 中等复杂意图 → 小模型 / embedding routing
- 模糊且高价值问题 → 大模型 router

#### b. 先缩小范围，再调用昂贵能力

这和知识库分 scope 的思路很像。

不要一上来就让一个总控 agent 带着所有文档、所有工具、所有专家描述去推理。
更合理的方式通常是：

- 先把任务粗分类
- 再进入某个子域
- 再在子域里做更细路由

也就是：

> **先 narrow the search space，再做 expensive reasoning。**

#### c. 简单任务不要伪装成 AI 任务

如果一个动作本质上只是：

- 查表
- 规则判断
- 数据格式转换
- 固定模板回复

那就应该尽量用 code / deterministic workflow / retrieval 完成。

否则在 multi-agent 系统里，最容易出现的浪费就是：

- 明明是固定逻辑
- 却层层交给 agent “思考”
- 最后把一个本来几毫秒可完成的事做成数轮 LLM 调用

### 6. 一个更实用的理解：Routing 是“正确性、延迟、成本”的平衡器

如果只从概念上讲，routing 很像“智能分发”。

但如果从工程角度看，它其实是在做三件彼此冲突的优化：

#### 正确性
- 选对 agent
- 传对上下文
- 在必要时 fallback / escalate

#### 延迟
- 少绕路
- 少多余调用
- 让用户尽快拿到结果

#### 成本
- 少调用不必要模型
- 少做重复 reasoning
- 控制 token、工具和外部 API 开销

一个 routing 设计好不好，通常不是看它“聪不聪明”，而是看它能否在这三者之间保持可接受的平衡。

### 7. 比起“万金油 agent”，很多时候更合理的是 orchestrator + specialists

Botpress 那篇 routing 文章里一个隐含逻辑我比较认同：

- 不要让一个单一 agent 既负责理解、又负责执行、又负责解释所有业务
- 更稳定的方式通常是一个 orchestrator 负责判断，多个 specialist 负责执行

这样做的好处是：

- 每个 agent 的上下文窗口可以更小
- prompt 更聚焦
- 幻觉面更窄
- debug 更清楚
- 权限边界更容易控制

但它不是免费午餐。

因为一旦拆成多个 specialists：

- router prompt 要更清楚
- handoff schema 要更清楚
- 日志和 tracing 必须更好
- 不然系统只会变成“更多 agent，更难排查”

### 8. 一个很值得长期跟进的方向：语义路由不一定等于每次都问 LLM

Gemini 总结和 Botpress 路由文章都比较偏 LLM-based routing。
但从系统设计看，我觉得更值得记住的是：

> 语义路由 ≠ 每次都调用一个昂贵大模型做判断。

还有不少替代路线：

- embedding similarity routing
- small classifier model
- hybrid rule + semantic routing
- staged routing（粗分 + 精分）

这类方案的意义在于：

- 保留一定语义理解能力
- 同时把 latency 和 cost 压下来

如果以后系统规模变大，这类 hybrid routing 往往比“全靠一个大模型前台总控”更稳。

## 当前理解 / 结论

我现在会把 Agent Routing 理解成下面这句话：

> **它是 multi-agent system 的调度内核，负责在正确性、延迟、成本之间，决定任务该如何被拆解、分发、接力与回收。**

这里面最值得反复记的不是定义，而是几个判断：

1. **Routing 本身就是 multi-agent 核心能力，不是附属概念。**
2. **真正困难的不只是选 agent，而是 context handoff。**
3. **Routing 设计会直接决定成本曲线。**
4. **能规则化的就别语义化，能轻量化的就别重模型化。**
5. **成熟系统更像 orchestrator + specialists，而不是一个万金油总 agent。**

## 对实际工作的启发

如果以后自己要设计 agent system，我觉得 routing 层至少该先回答清楚这些问题：

### 1. 路由单位是什么？
- 路由到 agent
- 路由到 tool
- 路由到 workflow
- 还是路由到 human

### 2. 路由依据是什么？
- 关键词
- schema
- embeddings
- 小模型分类
- 大模型判断
- 混合策略

### 3. handoff 最小上下文是什么？
- 目标
- 约束
- 已完成步骤
- 关键中间结果
- 禁止事项

### 4. fallback 怎么做？
- 澄清问题
- 换 agent
- 降级规则流
- 升级人工

### 5. cost policy 是什么？
- 哪些请求不值得走多 agent
- 哪些请求必须保守路由
- 哪些请求才值得调用高成本模型

## 待补充

后面还值得继续补的方向：

1. LangGraph / CrewAI / Botpress 在 routing 上各自的具体抽象
2. context handoff schema 应该如何设计才不臃肿
3. multi-agent tracing / observability 应该记录哪些关键节点
4. embedding router、小模型 router、大模型 router 的适用边界
5. routing 与权限控制、prompt injection 风险之间的关系

## 相关链接 / 来源

- Gemini 分享：<https://gemini.google.com/share/572c022c7cde>
- Botpress: Ultimate Guide to AI Agent Routing (2026)
  - <https://botpress.com/blog/ai-agent-routing>
- Botpress: How to Optimize AI Spend Cost in Botpress
  - <https://botpress.com/blog/how-to-optimize-ai-spend-cost-in-botpress>

---
title: OpenHarness Phase 1 架构走读笔记
description: 记录 OpenHarness 从 CLI 启动、双进程 UI 架构到 Agent Loop 的核心实现，以及几个值得记住的 harness 设计决策。
date: 2026-04-10
tags:
  - ai
  - agent
  - harness
  - claude code
  - python
  - software engineering
  - reference
type: research
status: ready
relatedArchive:
  - 0326-harness-engineering-codex-production-practice
source: https://github.com/HKUDS/OpenHarness
draft: false
---

## 核心内容

这张卡整理的是一篇关于 **OpenHarness Phase 1** 的源码学习笔记。

它最有价值的地方，不只是“OpenHarness 模仿了 Claude Code”，而是把一个生产级 agent harness 的主干非常清楚地暴露出来了：

- CLI 怎么启动
- UI 和后端怎么协作
- Runtime 怎么装配
- Agent Loop 到底如何工作
- tool execution、permission、hook 如何串起来

如果说之前那张 `Harness Engineering 与 Codex 生产实践` 更偏方法论，这张卡更偏“源码里到底长什么样”。

## 要点整理

### 1. OpenHarness 的价值在于“小而完整”

这篇笔记里最重要的背景判断是：

- OpenHarness 只有约 `11,733` 行 Python
- 但已经实现了：
  - Agent Loop
  - 43 个 tools
  - 54 个 commands
  - 权限系统
  - plugin system
  - MCP client
  - multi-agent coordination

这让它非常适合当作“生产级 harness 缩小模型”来读。

也就是说，它不是玩具 demo，而是一个足够真实、但规模还没大到不可读的 agent system。

### 2. 14 个子系统可以分成三层理解

笔记把 `src/openharness/` 下面的大模块归纳成三层，这个视角我觉得很好用：

#### 执行层
- `engine`
- `tools`
- `permissions`
- `hooks`

关注的是：**agent 怎么跑**。

#### 知识层
- `prompts`
- `skills`
- `memory`

关注的是：**agent 知道什么**。

#### 扩展层
- `mcp`
- `plugins`
- `coordinator`
- `tasks`
- `commands`

关注的是：**agent 怎么连接外部世界**。

这个分层很像在提醒一件事：

> 读 agent 项目时，先抓执行主干，再看知识注入，最后看扩展挂件。

### 3. 交互模式的关键不是 CLI，而是双进程架构

这篇笔记里我最喜欢的观察之一，是把 OpenHarness 的交互模式拆成了一个非常直观的双进程启动链：

- 你先启动 Python CLI
- Python 进程启动 React/Ink 的 Node.js TUI
- Node.js 再反向 spawn 一个 `--backend-only` 的 Python 进程
- 最后实际常驻的是：
  - Node.js 负责 UI
  - Python backend 负责 agent engine

这个设计的核心理由很直接：

- 终端 UI 生态，React/Ink 在 Node.js 侧更成熟
- agent engine、LLM SDK、asyncio、文件系统等更适合 Python

所以它没有硬把所有东西塞进一个 runtime，而是用了：

> UI / Engine 分语言，各自做最擅长的事，用 JSON-lines 协议通信。

这和 web 里的 browser / server 分工很像，只是 OpenHarness 把 HTTP 换成了 stdin/stdout。

### 4. 前后端协议非常轻，但已经够构成一个完整的 agent shell

笔记里强调的一个点我也很认同：

OpenHarness 的前后端协议不是复杂 RPC，而是很朴素的：

- 每行一个 JSON object
- 前端发 request
- 后端发 event
- 通过 stdin/stdout 读写

这个设计有几个很实际的好处：

- 调试成本低
- 协议边界清楚
- 不需要网络栈
- 本地同机通信非常轻

而且这个协议已经覆盖了 agent shell 最关键的几类状态：

- 用户提交输入
- assistant 增量输出
- tool started / completed
- modal request（如权限确认）
- shutdown / session 管理

换句话说，它不是“简陋替代品”，而是对本地 agent UI 来说刚刚好的协议复杂度。

### 5. `build_runtime()` 是整个 harness 的装配中心

这篇笔记把 `build_runtime()` 看作整个系统最重要的函数，我觉得这个判断是对的。

它做的不是业务逻辑，而是 **composition root**：

- load settings
- load plugins
- create API client
- connect MCP manager
- build tool registry
- build hook executor
- build system prompt
- 最后注入到 `QueryEngine`

这里最值得记的一点是：

> `QueryEngine` 不自己创建依赖，而是被装配出来。

这意味着整个系统天然更适合：

- 测试
- mock
- 切 provider
- 切运行模式
- 并行支持多个 session

这其实就是 agent harness 里非常重要的一种工程纪律：

- 核心循环保持小
- 依赖由外部装配
- runtime 用 bundle 明确表达上下文

### 6. `RuntimeBundle` 本质上是 runtime 级依赖容器

这篇文章把 `RuntimeBundle` 类比成 React 的 Context Provider 打包对象，这个类比挺准。

它的作用是把：

- api client
- tool registry
- mcp manager
- hook executor
- engine
- app state
- commands

统一放在一个显式容器里。

这比模块级全局变量更好，因为：

- 依赖关系可追踪
- 多 session 更自然
- 测试可以构造 fake bundle
- 运行时边界更清楚

对 agent 项目来说，这种设计很重要，因为系统对象很多，生命周期也复杂。

### 7. Agent Loop 的本质真的可以压缩到一个 if

这篇笔记里最抓人的一句话，是把 agent 和普通 chatbot 的差异压缩到了这两行：

- 如果模型回复里没有 `tool_uses`，就结束
- 如果有 `tool_uses`，就继续执行工具并进入下一轮

也就是：

> chatbot: user → model → answer → end
> 
> agent: user → model → tool(s) → model → ... → end

这一点特别重要，因为它把“agent 很神秘”的感觉拆穿了。

真正神秘的是模型能力本身，harness 做的是：

- 把工具告诉模型
- 执行工具
- 记录结果
- 把结果送回模型
- 决定何时停止

OpenHarness 的 `run_query` 之所以值得反复看，就是因为它非常明确地展示了这个循环骨架。

### 8. 单 tool 和多 tool 分支体现的是 UX 与吞吐权衡

文章里提到一个很值得记的小决策：

- 单 tool 调用时，顺序执行并即时发 started/completed 事件
- 多 tool 调用时，用 `asyncio.gather` 并发执行

这不是为了“写法优雅”，而是为了同时满足：

- 单工具场景的即时反馈
- 多工具场景的整体吞吐

也就是说，这不是算法问题，而是产品体验问题。

我觉得这类细节特别像真正生产级 harness 会做的事：

> 不是所有场景都追求同一种最优，系统会根据交互语义做不同策略。

### 9. Tool execution 真正重要的是安全链，而不是 execute 本身

笔记把 tool execution 总结成一条很清楚的链路：

1. `PreToolUse` hook
2. `tool_registry.get()`
3. Pydantic 参数校验
4. permission checker
5. tool execute
6. `PostToolUse` hook

这个顺序特别值得记，因为它说明：

- 工具执行不是单个函数调用
- 而是一条带治理能力的流水线

这里面最重要的几个治理点是：

- schema validation
- permission gating
- hook-based extensibility

也就是说，一个 harness 的成熟度，很多时候不在于工具本身有多强，而在于：

> 工具调用有没有被包在一个可治理、可审计、可扩展的执行管道里。

### 10. Pydantic schema 不只是校验，它还是 tool contract 的来源

这篇文章里还有个我很认同的点：

Pydantic 在这里不是简单“防止参数类型错”，它还承担了：

- 生成 JSON Schema
- 作为 tools API 的参数契约
- 统一参数错误处理
- 给工具实现提供强类型输入

这个角色和 TypeScript 生态里 `zod` 很像。

对于 agent harness 来说，这很关键，因为 tool schema 同时服务两边：

- 上游给模型看
- 下游给执行器和工具实现看

也就是说它既是“AI 可读 contract”，也是“工程侧可验证 contract”。

## 当前理解 / 结论

我对这篇 OpenHarness Phase 1 笔记的核心判断是：

### 1. 它最适合用来理解“agent harness 的主干长什么样”

如果 OpenAI / Anthropic 的文章更像方法论，这篇笔记更像结构解剖图。

它把 agent harness 最不可跳过的骨架拆开给你看：

- 入口
- 运行时装配
- UI / engine 通信
- agent loop
- tool execution pipeline

### 2. 真正有价值的不是“会不会用 agent”，而是能不能看懂 harness

因为一旦你能看懂这层结构，很多抽象概念都会落地：

- tool use
- session runtime
- permission model
- hook system
- multi-agent orchestration

这些不再只是论文词汇，而是具体模块和依赖关系。

### 3. OpenHarness 说明了一个强事实：production-grade harness 不一定要巨大

它当然不可能完整等价 Claude Code，但它足够证明：

- agent 核心主干并不一定需要几十万行代码
- 真正复杂的地方，主要在边界、协议、治理、扩展性
- 一个设计清楚的小系统，已经能非常有教学价值

## 待补充

这条笔记后面还值得继续扩展：

1. OpenHarness 的 tools 体系具体怎么注册和组织
2. `agent_tool.py` / multi-agent coordinator 的实现细节
3. permission modes 的具体策略差异
4. skills / memory / prompts 是如何注入系统 prompt 的
5. MCP client 在 OpenHarness 里的接入方式
6. 后续 Phase 2-6 是否能整理出更系统的架构图

## 相关链接 / 来源

- OpenHarness 项目：<https://github.com/HKUDS/OpenHarness>
- 相关文章：`0326-harness-engineering-codex-production-practice`

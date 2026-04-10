---
title: Vercel AI SDK 中的 Message 类型整理
description: 记录 AI SDK 6.x 里 ModelMessage 与 UIMessage 的职责分离、结构差异，以及实际开发时的状态管理建议。
date: 2026-04-10
tags:
  - ai
  - llm
  - frontend
  - react
  - typescript
  - agent
  - reference
type: reference
status: ready
source: https://grok.com/share/c2hhcmQtMw_d99687f4-6a5f-4c97-bf1f-28d2dccb8e4a
draft: false
---

## 核心内容

这张卡主要整理 Vercel AI SDK 6.x 里的两类消息模型：

- `ModelMessage`
- `UIMessage`

它们看起来都像“聊天消息”，但职责完全不同。

一个更准确的理解是：

- `ModelMessage` 是给模型看的输入格式
- `UIMessage` 是给前端和应用状态管理看的完整消息格式

这套设计的核心价值，不是单纯改了类型名，而是把“模型上下文”和“UI 状态”彻底拆开，减少工具调用、流式渲染、消息持久化时的混乱。

## 要点整理

### 1. `ModelMessage` 是传给 LLM 的干净消息

`ModelMessage` 属于 AI SDK Core 层，主要给这类函数使用：

- `streamText`
- `generateText`
- `streamObject`

它的重点是“只保留模型真正需要的信息”。

典型角色包括：

- `system`
- `user`
- `assistant`
- `tool`

可以理解成：

> `ModelMessage` = 推理时真正进入上下文窗口的消息格式。

它支持的内容也不只是字符串，还能覆盖：

- 多模态用户输入
- assistant 发起的 tool call
- tool 返回的结果

但整体仍然是一个偏“推理输入”的结构，而不是完整 UI 状态。

### 2. `UIMessage` 是前端里的 source of truth

`UIMessage` 属于 AI SDK UI 层，通常出现在：

- `useChat()`
- `useAssistant()`

它不是单纯的一条文本消息，而是一条带结构化 `parts` 的 UI 状态对象。

它通常包含：

- `id`
- `role`
- `metadata`
- `parts`

这里最关键的是 `parts`。

`UIMessage` 的 `parts` 可以承载很多不同状态，例如：

- `text`
- `reasoning`
- `tool-${name}`
- `source-url`
- `source-document`
- `file`
- `data-${name}`
- `step-start`

这意味着它天然适合描述：

- 流式文本生成
- tool call 的输入和输出生命周期
- RAG 引用来源
- 文件附件
- 自定义数据块
- 多步 agent 过程

所以更准确地说：

> `UIMessage` = 前端渲染与应用状态的完整档案。

### 3. 两者的差别，不只是“一个简化一个复杂”

更底层的区别在于：

#### `ModelMessage` 关心的是模型推理
它关注：

- 角色是什么
- 内容是什么
- 有没有 tool call / tool result

#### `UIMessage` 关心的是应用过程
它关注：

- 这条消息如何渲染
- 是否还在 streaming
- tool 当前处于哪个 state
- 有没有 metadata
- 前端是否需要持久化和恢复这条消息

所以它们并不是上下位替代关系，而是两个不同层面的模型。

### 4. 一个很重要的实践建议是：持久化优先存 `UIMessage`

这条分享里一个很重要的建议是：

- 聊天历史持久化时，优先保存 `UIMessage`
- 真正请求模型时，再把它转换成 `ModelMessage`

这个建议背后的逻辑很合理：

- `UIMessage` 保存了完整状态
- 它对前端恢复最友好
- 工具调用过程、流式阶段、自定义 part 都不会丢
- `ModelMessage` 更像运行时输入，不适合作为唯一持久化真相

我很认同这个拆法，因为很多聊天系统一开始就是把“模型消息”和“UI 消息”混在一起，最后会在以下场景变得很痛苦：

- 恢复历史会话
- 工具调用状态回放
- streaming 中断后的续接
- 自定义附件 / 数据块渲染
- 多步 agent 过程展示

### 5. `tool-${name}` part 是 AI SDK UI 的关键设计点

如果是做带工具调用的 AI 应用，`tool-${name}` 这类 part 很值得单独记。

它能表达一个 tool call 的完整生命周期，例如：

- `input-streaming`
- `input-available`
- `output-available`
- `output-error`

这比“assistant 发一句文本 + 前端自己猜现在在哪个阶段”强很多。

它的意义在于：

- tool UI 可以直接和状态机对齐
- loading / success / error 可以统一建模
- 多工具并发时也更容易稳定渲染
- tool 输入输出可以直接成为消息历史的一部分

这其实是 AI 聊天 UI 从“文本气泡”升级到“结构化交互记录”的关键一步。

### 6. `UIMessage` 的泛型能力很实用

分享里还提到一个很实用的点：

- 可以给 `UIMessage` 自定义 `metadata`
- 可以约束 `data parts`
- 可以从工具集推导 `UITools`

这意味着在 TypeScript 项目里，可以把：

- 消息元数据
- 工具渲染类型
- 自定义数据分片

全部纳入类型系统。

如果项目是 React + TypeScript，这个能力很值钱，因为它能显著减少：

- message shape 漂移
- tool 组件 props 不匹配
- 前后端消息协议失真

## 当前理解 / 结论

我现在对这套设计的理解是：

### 1. `ModelMessage` 和 `UIMessage` 是“推理层 / 应用层”分离

这不是单纯的 SDK 重构，而是明确分层：

- `ModelMessage` 负责模型交互
- `UIMessage` 负责产品状态

### 2. 真正稳定的聊天系统，不能只用一种 message 同时承担所有职责

如果一个消息结构既想服务模型，又想服务 UI，又想服务持久化，又想服务工具状态，那大概率会越来越混乱。

Vercel AI SDK 这次拆分，本质上是在承认：

> 模型需要的消息，不等于产品需要保存的消息。

### 3. 对 agent / tool-heavy 应用来说，`parts` 比单纯 `content: string` 更接近未来

尤其是：

- tool use
- reasoning
- RAG source
- attachment
- multi-step workflow

这些场景都说明，聊天系统已经不是“一个人说一句话”的线性文本流了，而是结构化事件流。

## 待补充

后面还值得继续补几块：

1. `UIMessage -> ModelMessage` 的具体转换链路
2. `useChat()` 在服务端 route handler 里的消息处理实践
3. `tool-${name}` part 在复杂工具 UI 里的组件拆分方式
4. 历史消息裁剪时，`pruneMessages` 和 UI 持久化应该怎么配合
5. 多模态输入时 `UserContent` 和 `parts` 的边界该怎么设计

## 相关链接 / 来源

- Grok 分享页：<https://grok.com/share/c2hhcmQtMw_d99687f4-6a5f-4c97-bf1f-28d2dccb8e4a>
- ModelMessage 文档：<https://ai-sdk.dev/docs/reference/ai-sdk-core/model-message>
- UIMessage 文档：<https://ai-sdk.dev/docs/reference/ai-sdk-core/ui-message>

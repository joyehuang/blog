---
title: Vercel AI SDK 中的 Message 类型整理
description: 记录 Vercel AI SDK 中 Message 分层、SSE 流式协议，以及实际开发时的状态管理建议。
date: 2026-04-10
updatedDate: 2026-04-10
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

另外，这个线程还补上了另一层很关键的理解：

- `streamText()` 返回的并不是“直接 SSE”
- 真正的流式协议封装发生在 `fullStream -> toUIMessageStreamResponse()` 这一步
- 前端 `useChat()` 消费的是 AI SDK 标准化后的 **SSE Data Stream Protocol**

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

### 6. `streamText()` 只是入口，真正的流式核心在 `fullStream`

第二条分享里一个很重要的补充是：

- `streamText()` 本身不是 SSE
- 它先创建与 provider 的流式连接
- 再把 provider 返回的 chunk 转成统一的事件流

这里最关键的是 `fullStream`。

可以把它理解成：

> `fullStream` = AI SDK 内部统一后的完整事件总线。

它不只包含文本，还可能包含：

- `text-delta`
- `text-start`
- `text-end`
- `reasoning-delta`
- `tool-call`
- `tool-result`
- `finish`
- step 边界事件

而 `textStream` 只是从这些事件里筛出纯文本增量的一个更轻量视图。

所以如果想真正理解 Vercel AI SDK 的 streaming，不应该只盯着 `streamText()` 这个函数名，而要看到：

- provider chunk
- `TextStreamPart`
- `fullStream`
- SSE 协议封装
- 前端事件消费

这一整条链路。

### 7. AI SDK UI 用 SSE 作为标准流式协议

这条补充最值得归档的地方，是它把 AI SDK 5 之后的流式协议说得更具体了。

Vercel AI SDK 选择用 **SSE, Server-Sent Events** 作为标准流式传输方案。

我理解它的原因主要有几个：

- AI 输出天然是“服务端持续往前端推送”
- 单向推送场景下，SSE 比 WebSocket 更轻
- 浏览器原生支持，调试也更方便
- 协议是 HTTP 兼容的，对 Node / Edge runtime 都比较友好

在 AI SDK 里，典型后端写法像这样：

- `streamText(...)`
- `return result.toUIMessageStreamResponse()`

这一步的本质不是“把文本返回给前端”，而是：

- 把 `fullStream` 里的结构化事件
- 编码成 `text/event-stream`
- 按 AI SDK UI 的 data stream protocol 持续发送给前端

### 8. `toUIMessageStreamResponse()` 是协议转换的关键点

这一步特别值得单独记，因为它是后端和前端之间真正对齐的桥。

可以把它理解成：

> `toUIMessageStreamResponse()` = 把 AI SDK 内部事件流转换成前端 `useChat()` 能消费的标准 SSE 响应。

它做的事大致包括：

- 遍历 `fullStream`
- 把每个事件编码成 SSE `data: ...\n\n`
- 自动设置响应头
- 在结束时发出 `finish` / `[DONE]`

这就解释了为什么很多人只看到 `streamText()` 还会觉得“流式到底是怎么出来的”。

答案其实是：

- `streamText()` 负责拿到统一事件流
- `toUIMessageStreamResponse()` 负责把它标准化成 SSE
- `useChat()` 负责在前端解析这些 SSE 事件并更新 `UIMessage.parts`

### 9. 从后端到前端的完整流式链路

把整个过程压缩成一条更容易记忆的链路，大概是：

- `streamText(...)`
- provider 返回原始 chunk
- AI SDK 转成 `TextStreamPart` / `fullStream`
- `toUIMessageStreamResponse()` 把事件流变成 SSE Response
- 前端 `useChat()` 或兼容客户端解析 SSE
- 收到 `text-delta` 时实时追加到当前消息
- 收到 `finish` 时触发收尾逻辑，比如 `onFinish`

如果用更面试化一点的话说，就是：

> Vercel AI SDK 先把模型输出归一化成内部事件流，再通过 SSE Data Stream Protocol 增量发送到浏览器，前端按事件类型更新消息状态和 UI。

### 10. 这说明 `UIMessage` 不是静态数据结构，而是协议终点

这条补充让我更明确地意识到：

`UIMessage` 的意义不只是“前端里有个复杂的消息类型”，而是：

- 后端 SSE 事件最终要落到 `UIMessage.parts`
- 所有 text / reasoning / tool / source / file 事件
- 最后都会收敛成前端状态里的结构化消息

所以它既是：

- 持久化时的 source of truth
- 也是流式协议在前端落地后的最终状态形态

### 11. `UIMessage` 的泛型能力很实用

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

而且这个 `parts` 结构不是孤立设计出来的，它和后端 SSE 协议是连在一起的。

也就是说：

- 后端发出的不是“纯文本流”
- 而是结构化事件流
- 前端再把这些事件归并到 `UIMessage.parts`

这也是为什么 AI SDK 可以比较自然地支持：

- tool 调用生命周期
- reasoning 片段
- source 引用
- file / data part
- 多步 agent workflow

因为协议层和状态层本来就是同构设计。

### 4. 如果面试里被问 SSE，最好讲“事件流标准化”而不只是“打字效果”

一个比较完整但不绕的说法可以是：

- SSE 是基于 HTTP 的单向服务端推送机制，常用 `Content-Type: text/event-stream`
- 在 AI 场景里，它特别适合把模型增量输出持续推给浏览器
- 在 Vercel AI SDK 里，`streamText()` 先得到内部事件流，`toUIMessageStreamResponse()` 再把这些事件编码成 SSE
- 前端 `useChat()` 消费这些结构化事件，不只是追加文本，也会同步 tool、reasoning、sources 等状态
- 所以它本质上不是“把 token 一个个吐出来”，而是“把 AI 交互过程标准化成事件协议并实时同步到 UI”

这样回答会比只说“因为 SSE 能实时返回 token”更完整。

### 5. 自定义后端时，要关心协议兼容而不只是能 stream

如果以后不是直接用 Vercel 默认 route，而是：

- 自己写后端
- 用 Python / FastAPI
- 或者接别的模型网关

真正的关键不是“我也能返回流”，而是：

- 你的返回是否符合 AI SDK 的 SSE Data Stream Protocol
- 事件类型是否能被前端识别
- Header 是否对齐
- 是否正确发出结束信号

否则前端即使收到了流，也未必能正确恢复成 `UIMessage`。

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

---
title: Prompt Caching 工程实践：Anthropic 的缓存设计与 defer_loading 模式
description: 从 Claude Code 的 prompt caching 实践出发，整理缓存设计哲学、OpenAI/Anthropic/Google 的差异、defer_loading 占位模式。
date: 2026-05-24
updatedDate: 2026-05-24
tags:
  - ai
  - agent
  - llm
  - prompt
  - performance
  - software engineering
type: research
status: ready
source: https://claude.com/blog/lessons-from-building-claude-code-prompt-caching-is-everything
draft: false
---

## 核心内容

> 参考博客：https://claude.com/blog/lessons-from-building-claude-code-prompt-caching-is-everything

整理自一次关于 Claude Code Prompt Caching 的深度讨论，涉及：

- Prompt caching 的运作原理
- "动态信息不要放 system prompt，要放 messages"原则
- OpenAI / Anthropic / Google 三家缓存策略对比
- defer_loading 模式——解决 MCP 工具太多时的缓存问题

---

## 要点整理

### 1. Prompt Caching 的基础：前缀匹配

调用 LLM 时，每次请求要发送完整的 prompt（system prompt + tools + 对话历史）。几万 token 每次都重算既慢又贵。

**Anthropic 的原理**：如果本次请求的**前缀（prefix）**与上次完全一样，服务端直接复用缓存的中间计算结果。缓存命中的 token 价格只有原价的 10%。

关键：必须**从第一个 token 开始完全逐字节相同**。中间任何一个 token 变了，从变化点后的全部内容都得重算。

**缓存命中场景**：
```
请求 1: [system A] [tools B] [对话 1, 2]
请求 2: [system A] [tools B] [对话 1, 2, 3]
         └─── 这整段命中缓存 ───┘ └─新增─┘
         价格 10%                   价格 100%
```

**缓存失败场景**：
```
请求 1: [system A] [tools B] [对话 1, 2]
请求 2: [system A'] [tools B] [对话 1, 2, 3]
         └ 第一个token就变了，全部重算 ──┘
         价格 100%
```

### 2. "Use messages for updates"——核心原则

这是最重要的实践原则：**不要修改 prompt 前缀，把动态信息塞到 messages 里**。

**反面例子**：在 system prompt 里写 `Current time: 2026-05-24 14:30:00`，5 分钟后时间变了，必须改 system prompt → 整个对话历史的 cache 全废。

**正确做法**：system prompt 保持静态，把时间、文件状态等动态信息放到下一条 user message 里，用 `<system-reminder>` 标签包裹：

```
user message:
  <system-reminder>
  Current time: 2026-05-24 14:35:00
  File main.py was modified
  </system-reminder>
  帮我重构这个函数
```

这样做的好处：前缀完全没动，历史 token 继续享受 10% 价格；只有新增的 user message 按原价付。

**对 Hermes 的启示**：长期运行 agent 必然有大量"当前时间""最近事件""环境状态"要喂给模型，放对位置和放错位置的成本差一个数量级。

### 3. OpenAI vs Anthropic vs Google 缓存策略对比

| 维度 | OpenAI | Anthropic | Google Gemini |
|------|--------|-----------|---------------|
| 控制方式 | 自动，零配置 | 显式打 `cache_control` breakpoint | 显式配置 |
| 命中率 | ~50%（不可控） | 100%（明确标记时） | 可配置 |
| 写入缓存 | 免费 | 5min 贵 25%，1h 贵一倍 | 免费 |
| 读取缓存 | 便宜 50% | 便宜 90% | 便宜 |
| TTL | 几分钟（不透明） | 5min 或 1h（明确） | 最长 60min |
| 最小缓存 | 1024 token | 1024–4096 token（按模型） | 不明确 |

**核心差异**：OpenAI 是"白嫖优惠"——写入不加价但只省一半；Anthropic 是"付费办会员"——写入要多付但读的时候省 90%。

**实战判断**：
- 快速原型 → OpenAI，省事
- 生产环境 agent / RAG，长 prompt 反复用 → **Anthropic**，控制力强、折扣大
- 对 Hermes 这种长期运行的 personal agent → Anthropic 更对路，因为 agent loop 一轮一轮调用，system prompt + tools + 历史对话都一样，正好是 90% 折扣发挥作用的场景

### 4. "Never add or remove tools mid-session"

tools 是 cached prefix 的一部分。任何中途增删工具，整个 cache 全废。

**直觉错误**："应该只给模型当前需要的工具"——但在缓存视角，这个直觉害死人。

#### Plan Mode 的解法

Claude Code 的做法：**不换工具集，把"切换模式"做成工具本身**。

- 所有工具常驻请求中
- `EnterPlanMode` 和 `ExitPlanMode` 是两个普通 tool
- 进入 Plan Mode 时，通过 system message 告知模型当前模式
- **工具定义从不变更**

额外好处：因为 `EnterPlanMode` 是工具，模型**可以自主调用**——检测到复杂问题时自己进入 plan mode，不需要用户触发，也不破坏缓存。

#### defer_loading 模式（后半部分重点）

问题：重度用户可能挂 20 个 MCP server，每个暴露十几个工具，加起来上百个。每个工具定义 200–500 token，100 个工具 = 30k–50k token。

两难：
- **全部塞进去**：prefix 稳定，但每次背 50k token 即使 90% 折扣也很贵
- **按需加载**：每次加工具 = 改 prefix = cache miss，反而更贵

**Anthropic 的解法**：轻量 stub + 按需发现

每次请求里都塞所有 100 个工具，但绝大多数只塞一个 **stub（桩）**：

```json
// 之前：完整定义（~300 token）
{
  "name": "asana_create_task",
  "description": "Create a new task in Asana...",
  "input_schema": { ... }
}

// 现在：stub（~20 token）
{
  "name": "asana_create_task",
  "defer_loading": true
  // 无 description，无 schema
}
```

stub 只有名字 + `defer_loading: true`，没有 description 和 schema，每个 ~20 token。100 个 stub = ~2k token，而不是 30k–50k。

模型通过 **tool search** 工具在需要时发现完整定义。stub 在 prefix 里永远按相同顺序存在，不破坏缓存。

**核心 trick**：你不必在 prefix 里放全部信息。只要放一个"名字 + 可发现性"，让模型在需要时自己去拉。这与 L2 的 FTS5 + LLM 摘要有相似的设计哲学——把"即时可用"和"按需查找"分离。

### 5. Compaction（对话压缩）——cache-safe 的上下文压缩

当 context window 即将用尽时，需要压缩历史对话。Naive 的做法会踩一个隐藏的成本陷阱。

**错误做法**：开一个独立 API call 做总结

```
主对话:    [system A][tools A][180k 对话]  ← cache 命中
总结 call: [system "请总结"][][180k 对话]   ← 第一个 token 就不同
                                            ← 180k 全部原价，贵 10x
```

问题：system prompt 一变，tools 一变，cache 立刻全废。**对话越长，这一刀砍下去越疼。**

**正确做法：cache-safe forking**——复用完全相同的 system + tools，只在末尾追加一条"请总结"的 user message：

```
主对话最后请求:  [system A][tools A][180k 对话]
Compaction 请求: [system A][tools A][180k 对话][user: "总结一下"]
                 └─────── 这整段命中 cache ────────┘└─新 token─┘

180k token 全部按 10% 计费，只有最后一条 user message 按原价。

**Compaction buffer**：compaction 必须在 context 还没满之前触发。需要预留 ~15–20k 的空间给"这次 compaction 请求 + 输出的 summary"。Claude Code 大概在 80–90% 占用时就启动 compaction，绝不会让对话真的撞到上限。

**Compaction 之后**：把 180k 历史替换成一条 5k 的 summary user message——system + tools 不变，新的 prefix cache 从"system + tools + summary"开始重新累积。

```
 compaction 前:
 [system][tools][180k 对话历史]
 └──────── 全部在 cache 里 ────────┘

 compaction 后:
 [system][tools][summary 5k][新对话...]
 └─ 命中 ─┘└─新 prefix ─┘└─逐步进 cache ─┘
```

**对 Hermes 的启示**：长期 agent 必然撞 context 上限。关键实现要点：
1. 设定 compaction threshold（如 75% 占用）
2. compaction 时复用 system + tools，只追加一条总结指令
3. 压缩后把原始历史归档到磁盘——summary 是有损的，未来可能需要回查细节
4. 这和你之前 memory 架构的 snapshot 思路能接上：summary 是 working memory 的压缩态，原始历史进入 long-term storage

---

## 当前理解 / 结论

这个讨论最有价值的四点：

### 1. 缓存是你必须（而非可以）考虑的设计约束
不是优化阶段才加的，它从根本上决定了你该怎么组织 prompt。Hermes 的几个 system prompt 块、工具列表、历史对话——如果不考虑缓存边界，每次添加功能就是在烧钱。

### 2. "塞 messages 不塞 system" 应该成为 agent 开发的基本规范
所有动态变化的信息（时间、文件状态、环境变量、最近事件）全部通过 messages 传，不让其进入 cached prefix。这个原则应该体现在 Hermes 的 prompt 构建逻辑中。

### 3. defer_loading 是更通用的 "lightweight stub + demand discovery" 模式
不仅适用于 tools，也适用于任何在 prefix 中占位但调用率低的信息片段。核心设计 pattern：**让 prefix 保持轻量稳定，把重量级信息变成可发现资源**。

### 4. Compaction 不是等到 context 满才做，而是主动管理的
正确做法是 cache-safe forking——复用完全相同的 system + tools，只在对话末尾追加总结指令。压缩后的历史归档到磁盘，summary 作为 working memory 的压缩态继续累积新 cache。这对长期运行的 agent 来说是必备能力。

---

## 相关链接 / 来源

- 参考博客：https://claude.com/blog/lessons-from-building-claude-code-prompt-caching-is-everything
- Compaction 文档：https://platform.claude.com/docs/en/build-with-claude/compaction
- defer_loading 文档：https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool

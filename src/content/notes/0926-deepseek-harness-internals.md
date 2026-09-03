---
title: DeepSeek Harness（dsh）源码解读：一切皆插件的 Agent 运行时
description: 通读 deepseek-harness 0.1.0-rc.5 真实源码后的完整拆解——Cordis 插件树、Capability Seam、事件日志唯一真相源、turn/step 状态机、工具执行管线的正确性设计、Code Mode、KV-cache 感知压缩、沙箱 fail-closed 姿态，以及作为基础设施工程师视角的可改进点。
date: 2026-09-02
updatedDate: 2026-09-03
tags:
  - ai
  - agent
  - llm
  - orchestration
  - software engineering
type: research
status: ready
source: https://github.com/deepseek-ai/deepseek-harness
relatedNote:
  - 0326-harness-engineering-codex-production-practice
draft: false
---

## 核心内容

先说清楚「Harness」是什么：模型本身只负责生成文本和工具调用意图，真正让一个 Agent 跑起来的是模型外面那一整层运行时——会话编排、工具注册与执行、权限审批、沙箱、上下文压缩、持久化、子 Agent 委派、Web/CLI 前端。这层东西就是 Agent Harness，对标 Claude Code / Codex CLI 的底座。

DeepSeek Harness（命令名 `dsh`）是 DeepSeek AI 开源的这样一层运行时。本文基于 `0.1.0-rc.5`（MIT，developer preview）的真实源码通读——我通读了 `apps/`、`packages/`、`python/`、`native/`、`scripts/`、`vendor/`、`docs/`，下文所有文件路径与行号均来自实际文件，不是文档转述。

它的核心主张写在 README.md 第一段：

> It uses an architecture where **everything is a plugin**, and is powered by Cordis.

这不是营销话术。`docs/architecture.md` 把它讲得很硬：

> There is no privileged core to patch: you extend dsh by mounting a plugin beside the others, and registrations are effects that unwind when their plugin unloads.

实际验证下来确实如此——**模型适配器、工具注册表、会话日志、乃至 Agent 主循环本身都是插件**。`packages/bundle/base/cordis.patch.yml`（451 行）里，`@deepseek-ai/dsh-agent-loop` 只是第 437 行的一行配置，和 `dsh-tool-bash`（211 行）、`dsh-llm-deepseek`（451 行）地位完全平等。不存在需要 patch 的特权 core。

它解决的核心问题可以概括成六个：

- **能力裁剪**：Agent 能力要按部署场景裁剪（CLI / Web / 一次性 headless / SDK 嵌入）——Profile + Bundle 分层组合，同一套插件按场景组合出不同产品形态
- **执行后端切换**：从本地换到远程沙箱不想改一堆工具——Capability Seam（能力接缝）：换 `ctx.fs` + `ctx.subprocess` 的 Provider，Bash/PTY/LSP 全部跟着搬家，零分叉
- **会话可恢复**：会话要能 fork / resume / 回放 / 审计——单一 append-only 事件日志 + `deriveMessages()` 投影，"model-visible ⟺ logged" 作为运行时不变量
- **策略拦截**：工具执行要能被策略拦截（审批、超时、重试、指标）——四段式 waterfall 管线
- **上下文压力**：长会话爆上下文——`ctx.compaction` 接缝 + 复用 KV cache 的摘要策略
- **命令不可信**：不信任模型执行的命令——`ctx.sandbox` 接缝：Linux bwrap/Landlock、macOS Seatbelt、Windows ACL，一律 fail-closed

## 整体架构：一棵 Cordis 插件树

先给一张组件拓扑图，后文反复会用到：

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          入口层  apps/ + python/                              │
│                                                                              │
│   apps/cli (bin: dsh)        apps/web (React SPA)      python/sdk            │
│   ├─ dsh web                 └─ 打包进 host/frontend-   └─ HarnessClient      │
│   ├─ dsh --profile headless      static 由 webserver     (stdio JSON-RPC 2.0) │
│   └─ dsh --dump-config           托管                    ↓                    │
│        │                                              packages/sdk/server    │
│        │  apps/cli/src/profile-boot.ts                                       │
│        ↓                                                                     │
└────────┼─────────────────────────────────────────────────────────────────────┘
         │  ① 解析 profile  ② 按序叠 patch 层  ③ 挂到空的 root config
         ↓
┌──────────────────────────────────────────────────────────────────────────────┐
│                      组合层  Profile / Bundle  (packages/bundle/)             │
│                                                                              │
│   dsh-base ──────────────► 模型适配器/工具/持久化/沙箱/审批/设置/凭据/遥测      │
│      +                     (cordis.patch.yml, 451 行, ~70 个插件行)           │
│   dsh-web-app  或  dsh-headless                                              │
│      +  profile 自己的 cordis.patch.yml                                       │
│      +  $DSH_HOME/cordis.patch.yml                                           │
│      +  --patch 覆盖层            ← 后层可按 id 替换/插入任意一行             │
└────────┬─────────────────────────────────────────────────────────────────────┘
         │  Cordis Loader 展开成一棵插件树（vendor/loader + vendor/include）
         ↓
┌──────────────────────────────────────────────────────────────────────────────┐
│                        Cordis 运行时  (vendor/cordis)                         │
│   一个共享 Context：typed events + services + 可回滚 effects                  │
│                                                                              │
│  ┌────────────────────────── 核心骨架 packages/core/ ──────────────────────┐ │
│  │  ctx.agents ◄── core/agent      Agent 接口 + Inbox + agent/* 事件       │ │
│  │      ▲                                                                  │ │
│  │      │ 实现                                                             │ │
│  │  ctx.agentLoop ◄─ core/agent-loop  ReactLoopAgent（默认驱动）            │ │
│  │      ├──► ctx.systemPrompt ◄─ core/system-prompt  section/tool 装配     │ │
│  │      ├──► ctx.tools        ◄─ core/tools    注册表 + 4 段执行管线        │ │
│  │      ├──► ctx.sessions     ◄─ core/session  append-only 事件日志         │ │
│  │      └──► ctx.llm          ◄─ llm/llm       流式适配器接缝               │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌───────────────────── 能力接缝 Capability Seams ────────────────────────┐  │
│  │  Service Definition ── Service Provider ── Consumer(通常是工具)          │  │
│  │  ctx.fs         │ fs-local / fs-e2b        │ tool-fs, tool-fs-search   │  │
│  │  ctx.subprocess │ subprocess-local / -e2b  │ (被 shell/lsp/mcp 复用)   │  │
│  │  ctx.shell      │ bash-local/-sandbox      │ tool-bash, tool-pwsh ...  │  │
│  │  ctx.sandbox    │ sandbox-local (bwrap/    │ bash-sandbox 包 argv      │  │
│  │                 │ Landlock/Seatbelt/ACL)   │                           │  │
│  │  ctx.subagent   │ spawn/fork-in-process,   │ tool-subagent             │  │
│  │                 │ acp/claude-code/codex/sdk│                           │  │
│  │  ctx.compaction │ compaction-basic         │ command-compact           │  │
│  │  (外部) MCP     │ mcp-client (一个 server 一个插件实例)                 │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────── 持久化 & 投影 packages/session/ ──────────────────┐  │
│  │  session-persistence-jsonl (.jsonl.zstd, 默认)                          │  │
│  │  session-persistence-sqlite  ┐ 都用 Node 内置 node:sqlite               │  │
│  │  session-query-sqlite        ┘ （无原生依赖）                            │  │
│  │  session-projection(-cache) / session-telemetry(-otel) ...              │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

一句话总结：**dsh 把"Agent Harness"重写成了一棵可热插拔的 Cordis 插件树，用一条 append-only 事件日志做唯一真相源，用"能力接缝"把执行世界（fs/subprocess/sandbox）和模型面工具彻底解耦。**

## 技术栈与工程形态

pnpm workspace monorepo，成员分六类：

- `vendor/*`：**vendored 的 Cordis 框架源码**（cordis、cosmokit、schemastery、loader、include、hmr 等 9 个包、34 个 `.ts`）——框架不从 npm 拉，直接 vendor 进来，`pnpm-workspace.yaml` 里用 `overrides` 强制 `link:` 到 vendor 目录，保证不会和 npm 上的同名包串味
- `packages/<group>/<pkg>/`：全部业务包，命名一律 `@deepseek-ai/dsh-<name>`，共 48 个 group、**2240 个 `.ts/.tsx`，约 43 万行**
- `apps/*`：产品装配层——`apps/cli`（拥有 `dsh` bin）、`apps/web`（React SPA）
- `native/landlock-run`：Landlock 启动器，**是 C 不是 Rust**（后面细讲）
- `python/sdk-runtime`：单文件可执行构建的部署根 + Python 运行时载体
- `examples/`：可运行的 `cordis.yml` 叶子

几个能体现工程审慎的细节：

- `pnpm-workspace.yaml` 的 `allowBuilds` **默认拒绝**所有带安装脚本的依赖，逐个显式放行（esbuild、node-pty、koffi），并显式 `false` 掉 `@google/genai`、`protobufjs`——注释写明 "those are no-ops we don't need, so we deny them"
- SQLite 用 **Node 内置 `node:sqlite`**（不用 better-sqlite3，零原生编译）；压缩用 **Node 内置 Zstandard**（不引第三方压缩库）；`koffi` 仅为在 Windows 调 `MoveFileExW` 做写穿发布这一个调用引入
- 引擎要求 `node: ^22.19.0 || >=24.0.0`，全仓 `"type": "module"`（纯 ESM），lint 用 oxlint 而非 eslint，打包用 tsdown 而非 tsup
- `playwright` **只在** `apps/web` 的 devDependencies 里，用途是测自家 Web UI 的 E2E——**不是给 Agent 用的浏览器工具**。dsh 不内置浏览器自动化，"上网"能力走 `ctx.web` 接缝（web-search-deepseek / exa / perplexity + web-fetch-http）

`python/` 目录也容易误解：**不是** Python 实现的 Agent，而是**驱动 dsh 的 Python 客户端**。`HarnessClient`（873 行）以子进程方式拉起 dsh 运行时，走 stdio 上的 newline-delimited JSON-RPC 2.0，有独立 reader 线程和 stderr 线程，提供 `initialize` / `session_prompt` / `subscribe_session_notifications` / `respond`（反向请求，供审批类交互回传）。

## Agent 会话编排：turn / step 状态机与 Inbox

### 二级状态机

`docs/architecture.md` 定义：**step = 一次模型请求 + 它调用的工具**；**turn = 零个或多个 step**，在首个输入被 claim 前开启，在无债可还时关闭。

主实现是 `packages/core/agent-loop/src/agent.ts` 的 `ReactLoopAgent`（第 64 行）。它的内部相位是一个三态判别联合：

```ts
type Phase =
  | { kind: 'idle'; lastTurn: number }
  | { kind: 'maintenance'; abort: AbortController; lastTurn: number; wakeRequested: boolean }
  | { kind: 'running'; abort: AbortController; turn: number; step: number; wakeRequested: boolean }
```

对外只暴露 `idle | running` 两态。`maintenance`（压缩、标题生成这类维护作业）对外表现为 idle 但会 **latch 住唤醒**，等作业结束再补放——这是一个容易被忽略的细节：维护期间到达的输入不会被丢，也不会打断维护。

### Inbox：三种输入语义

用户输入、系统注入、中途转向，统一从**一个 Inbox** 进（`packages/core/agent/src/inbox.ts`）。Inbox 只有两个投递目标 `next-turn` / `next-step`，组合出三种对外语义：

- `followup(input)`：投到 `next-turn` 并唤醒——普通新一轮用户消息
- `steer(input)`：投到 `next-step` 并唤醒——**中途转向**，插到下一个 step 边界并立刻生效
- `inject(input)`：投到 `next-step` 但**不唤醒**——注入上下文，等别的消息把它带出去

一个细节体现了作者对并发的重视（`agent.ts:116`）：

```ts
// Waking input cannot join an aborted activity, so it starts the next turn.
// Captured before the insertion so a reentrant cancel from a splice observer cannot reclassify it.
const wakingAfterAbort = wakeup && this.phase.kind !== 'idle' && this.phase.abort.signal.aborted
```

分类在插入**之前**算好，防止 splice 观察者重入取消导致分类漂移。Inbox 本身还是**事件日志的投影**：构造时从 `agent/inbox/spliced` 事件重放——所以进程重启后待办输入不会丢。

### 一个 turn 的完整生命周期

`turn()`（`agent.ts:246`）的骨架：

```
append('turn/start', {turn})
  loop:
    preStep(target, {turn, step})
      ├─ reject          → turnEnds = {kind:'blocked'}, 关 turn
      └─ enter(messages)
    若 step===0 且 messages 为空 → turnEnds={kind:'completed'}, 关 turn
    append('step/start')
    for m of messages: append('user/message', m, {surfaceOp:'append'})
    step(assembly)                            ← 一次模型请求 + 工具
    append('step/end')                        ← 放在 finally，异常也写
    若已结束且 inbox.nextStep 为空 → serial('agent/turn-stopping') → break
    target = 'next-step'
finally:
  append('turn/end', {turn, reason: turnEnds})
```

几个值得注意的正确性处理：

- **max-tokens 是"粘性"的**：一旦某个 step 撞到 token 上限，后续正常完成的 step **不得**把 turn 结果降级回 `completed`
- **异常结构化**：`LlmError` 保留其 `failure` 事实，其余一律经 `errorChain()` 拍平成 `UNKNOWN` code
- **turn/end 一定写**：放在 `finally`，且写失败会再走 `throwError` 上报
- 每个 await 点后都有 `signal.throwIfAborted()`——全文出现十余次，取消是一等公民

`preStep()` 是扩展点最密集的地方：它把「claim 到的输入 + system prompt 装配 + 运行时上下文」打包，交给 `agent/pre-step` waterfall——监听器可以改写模型将要看到的消息，也可以整体 `reject`。压缩（compaction）就挂在这里做步边界压力检查。

## 工具层：注册、调度、执行管线

这是整个项目设计密度最高的部分，分四层看。

### 注册表：作用域化 + 单调守卫

`ctx.tools`（`packages/core/tools/src/index.ts`，1946 行）提供的核心 API：

- `register(definition)`：**注册层级 = 调用方 context 的 scope**。普通插件 context 注册的是全局工具；从 `agent.ctx` 注册则只对该 agent 可见，并**遮蔽同名全局工具**。返回 disposer
- `restrict(filter)`：agent 作用域的 allow/deny 掩码，多个掩码取交集。README 明确说明这是 "live visibility composition, **not an authority boundary**"——是可见性组合，不是权限边界
- `guard(guard)`：在 `tools/pre-execute` waterfall **之后**的**单调**同步守卫——返回字符串即拒绝，且**后续 waterfall 监听器无法把守卫的拒绝翻回允许**
- `schemas(scope?)`：该作用域可见的全部 schema（自动喂给 `ctx.systemPrompt.tools()`）
- `executionMode(exec)`：只有可见定义的 `isConcurrencySafe(args)` **恰好返回 `true`** 才判为 `parallel`；未知/隐藏/未声明/抛错一律 exclusive

「单调守卫」这个设计很关键：waterfall 是可重排的，容易被后挂的监听器绕过；`guard` 提供了一条**不可翻案**的策略通道。

### 执行管线：四段 waterfall + 一个终结器

README 与源码一致的完整顺序：

```
ctx.tools.execute(exec)
  ├─ 参数无损快照 + 冻结，分配不透明 ToolExecutionToken（symbol，永不跨模型/日志/worker 边界）
  ├─ [prepare]
  │     ├─ tools/pre-execute   (waterfall) → allow | deny(reason) | ask(reason?)
  │     │      └─ ask → ctx.approval 服务；未挂载则**降级为 deny**（安全方向降级）
  │     └─ ctx.tools.guard 链  (单调，global 层 → scope 链，远者优先)
  ├─ [dispatch]
  │     └─ tools/execute       (waterfall，around 包装：超时/重试/指标)
  │           └─ dispatchToolBody()
  │                 ├─ fuseToolSignals(callerSignal, wrapperSignal)  ← 重新熔合原始调用方信号
  │                 ├─ tool.execute(args, exec)
  │                 └─ 结果按 output.schema 校验 + render
  ├─ [finalize]
  │     ├─ tools/post-execute  (waterfall) → accept(替换) | block(反馈)
  │     ├─ definition.finalizeContent(exec, result)  ← 同步、全函数，每个结果都跑一次
  │     └─ 无损物化 + 冻结
  └─ tools/result  (仅观察，不可改)
```

几个设计细节值得单独记：

- **around wrapper 只能替换 `signal`**，且注册表在调用 body 前立刻把原始调用方信号熔合回去——包装器无法偷偷解除调用方的取消权
- **取消语义分级**：body 未开始 → `ABORTED_BEFORE_DISPATCH`；body 已开始 → `ABORTED`；但拒绝、包装器失败、工具失败、超时都更具体，优先保留。而且 "cancellation never abandons the body"——已启动的 promise 会跑到静止态，不甩掉
- **content 替换不是保密边界**：README 明写 "Content replacement is not a confidentiality boundary: block or replace the value when programmatic consumers must not receive it"——`tools/post-execute` 里换掉 content 的插件作者很容易以为自己脱敏了，其实没有

### 并行调度：并行池 + 排他栅栏 + 中途重分类

`packages/core/agent-loop/src/tool-calls.ts` 是本仓最精巧的一个文件。它要同时满足两个冲突目标：**dispatch 可以重叠**（吞吐），但**策略、结果、结果上下文必须保持模型顺序**（正确性）。

`executeToolCalls()` 按模型顺序扫描调用，用 `executionMode()` 分组：`parallel` 组进滚动池，其余单独成排他栅栏。核心是 `commitReady()`——**只沿连续的模型顺序槽位推进提交**：前面还有没落地的，就停住等，结果永远按模型发出的顺序落日志。

而最少见的一处严谨是补池时的**重新分类**：

```ts
// Re-read later modes after ordered commits so registry changes can create a barrier.
if (nextToStart > 0 && mode === 'parallel'
  && ctx.tools.executionMode(nextCall.exec).kind !== 'parallel') break
```

也就是说：如果某个工具在执行过程中改了注册表（比如换了个不再并发安全的实现），**尚未启动的调用会被立刻重新分类成栅栏**。这个 case 极少有人想到，更少有人会实现。

并发上限 `maxParallelToolCalls` 默认 **10**，可在 cordis.yml 配置。取消路径同样讲究：中止时**已启动的调用会被 drain 并按序提交**，未启动的调用则逐个补一条合成错误结果（`TOOL_ABORTED_BEFORE_DISPATCH`）——保证回放时 `tool/call` 与 `tool/result` **永远配对**，不会出现悬空调用。而调度器自身失败（区别于工具失败）则明确不伪造结果，让上层看到真实断裂。

### Code Mode：与 native function calling 平权的第三条路

`code-mode.ts`（673 行）实现了工具暴露的第三条路。`ctx.tools` 的 `mode` 配置有三档：

- `native`（默认）：工具作为 function definitions 呈现
- `code`：只呈现保留工具 **`run_code`** + 生成的 `tools:sdk` prompt section + `tools:code-only` 规则；**执行器会真正强制执行**——模型直接调用任何其他工具会在策略之前就被解析为 `UNKNOWN_TOOL`
- `both`：两种都呈现，且不声明 code-only 规则（因为 native 调用确实能执行）

模型写的是一段异步函数体，用 `await tools.name(args)` 调工具，TypeScript 和 Python 两套 flavor 各有独立的类型声明渲染器把 JSON Schema 转成 TS/Py 类型进 system prompt。

省 token 的关键在这句模块注释：

> each sub-dispatch is logged for reconstruction, while **only the outer curated result enters model history**

程序内的每次子调用都有日志可重建（审计不丢），但中间产物不污染上下文。

值得强调的是强制是真强制：`code` 模式下模型直接调别的工具，会在**策略之前**就被解析为 `UNKNOWN_TOOL`——不是靠 prompt 里说一句"请只调 run_code"。配套的严谨度：语言 flavor 表和 SDK 渲染器表都用 `satisfies` 对同一个 `CodeSdkLanguage` 联合做检查，**少加一个就 typecheck 失败**，防止模型收到"TypeScript 的 schema 配 Python 的 SDK"。保留名 `run_code` 无论什么模式都不可注册、遮蔽、限制或移除。

### MCP 客户端桥

`packages/mcp/mcp-client`（929 行）：**一个 MCP server 一个插件实例**，在 cordis.yml 里配置，支持 stdio 和 streamable-http 两种 transport。

**命名契约**是这个包最花心思的地方：

```ts
export function publicToolName(serverName: string, rawName: string): string {
  const joined = `mcp__${serverName}__${rawName}`
  const normalized = joined.replace(INVALID_NAME_CHARS, '_')
  if (normalized === joined && normalized.length <= MAX_PUBLIC_NAME_LENGTH) return normalized
  const hash = createHash('sha256').update(`${serverName}\0${rawName}`).digest('hex').slice(0, HASH_LENGTH)
  return `${normalized.slice(0, MAX_PUBLIC_NAME_LENGTH - HASH_LENGTH - 1)}_${hash}`
}
```

- 干净情况直接 `mcp__<server>__<raw>`（与 Claude Code / Codex 同形，不发明新格式）
- 一旦因字符替换或 64 字符截断发生**有损归一化**，就追加 12 位 SHA-256——保证不同 MCP 身份**永不塌缩成同名**
- 名字是 `(serverName, rawName)` 的**纯函数**：连接顺序、重同步、其他 server 都不会让某个工具改名——这对 KV cache 和用户审批记忆都很重要

**两阶段同步**：先 fetch 拉全量（失败则上一代注册原封不动），再 swap（先 dispose 旧代再注册新代）。swap 阶段的冲突只可能是外部注册占了本 server 的命名空间，此时**整代回滚**（该 server 变成零工具），绝不留下半套。连接层有**有界指数退避重连**：500ms 起每次失败翻倍，30s 封顶，10 次上限；调用超时默认 60s。另外它刻意绕开了 MCP SDK 的两处内部缓存，避免 SDK 用本桥不支持的 output schema 做前置校验。

## 数据层：append-only 事件日志是唯一真相源

### 内存模型

`packages/core/session/src/index.ts`（1157 行）的 `Session` 是核心。`append()`（第 604 行）是唯一写入口，契约极严：

```ts
append<T extends SessionEventType>(
  type: T,
  data: SessionEventMap[T],
  ...opts: T extends SurfaceEventType ? [opts: SurfaceIntent] : []
): SessionEvent<T>
```

注意这个**条件元组类型**：凡是"会产生消息"的事件类型（SurfaceEventType），编译器**强制**你传 `surfaceOp`；非表面事件传了则编译报错。这把 "model-visible ⟺ logged" 这条架构不变量**编码进了类型系统**。

写入时做的事，每一步都有明确理由：

1. `snapshotJsonValue(data)`——一次递归遍历同时完成读取、校验、拷贝，注释写明理由："so a stateful getter cannot supply one value to validation and another to storage"（防 TOCTOU 式取值不一致）
2. 拒绝一切非无损 JSON：BigInt、函数、symbol、undefined、负零、非有限数、循环引用、稀疏数组、Map/Set/Date/类实例
3. **重入检测**：观察者回调里再 append 会直接拒绝
4. `deepFreeze` 后校验表面契约
5. 先收集回调、再 push、再同步通知——**观察者失败被逐个 contained**，不影响返回值也不阻断后续监听器

`deriveMessages()` 把日志投影成 LLM 消息历史。它是**带缓存的增量投影**：每个表面节点只投影一次，一次调用开销 O(新节点)。返回的数组是每次新建的快照（避免调用方持有的数组被后续 append 撑大），但里面的 Message 对象是**共享且深冻结**的——复用已冻结的持久事件数据，省掉第二次深拷贝。

**Fork** 也有封闭联合的失败码，其中值得注意 `OPEN_TURN`：**不允许在未闭合的 turn 中间切分**。

### 落盘：JSONL + Zstandard

默认后端是 `.jsonl.zstd`：目录按项目归组，每个会话独占一个目录。物理编码是**标准的独立 Zstd frame 串接**——header 单独一帧，之后每个持久化批次一帧。列表操作**只读并校验 header 帧**，不解全文。

有个实用的优化叫 **chunk 打包**：把 ≥3 个连续同 block 的 `assistant/chunk` delta 事件压成一行 packed row，只存 `seq0`/`time0` 和逐成员 `dt` 增量，可**精确重建**每个成员的 seq/time。README 给的实测收益是 **~60% smaller logical logs**（真实编码会话上测的）。读取端是布局盲的——packed / unpacked / 混合文件加载结果完全一致。

持久性语义做得相当扎实：

- **懒物化**：`create(meta)` 不写盘，首次 `append` 才写；创建但从未 append 的会话盘上不留任何东西
- **首次发布（POSIX）**：写临时文件 → `fsync` → **hard link 无覆盖发布** → `fsync` 父目录；Windows 走 `MoveFileExW(MOVEFILE_WRITE_THROUGH)`
- **追加**：只追加，已刷盘事件永不重写；写/同步失败**回滚到先前字节长度**
- **崩溃恢复**：校验每个完整 frame；最后一帧结构不完整 → 保留已解码记录、从该帧起截断、补上合成 tool/step/turn 闭合事件后重新编码；无完整 header 帧、校验和解压失败、或缺陷位于最后一个已提交 `turn/end` **之前**——判定为损坏，拒绝加载

版本策略上 `AGENTS.md` 写得很直白：`SESSION_FORMAT_VERSION` 保持在 `0`，**没有兼容承诺**，后端直接拒绝旧的盘上格式。这是 pre-release 阶段的有意选择——但也埋下了一个迁移故事空白的问题（见可改进点）。

## 沙箱与执行安全：fail-closed 姿态

`packages/sandbox/sandbox-local` 按平台选一个 runner 并缓存：

| 平台 | 机制 |
|---|---|
| Linux | 优先可用的 `bwrap`，否则 Landlock（`native/landlock-run`） |
| macOS | Seatbelt（`sandbox-exec`），allow-default + 写白名单，所有路径做规范化（`/tmp` 就是 `/private/tmp`） |
| Windows | ACL 受限令牌，每个工作区一个确定性写 SID + 每会话一个随机私有临时目录 |

全局原则是 **fail-closed**：不支持的平台和不可用的 runner 报 `SANDBOX_UNAVAILABLE`，"execution never silently falls through unconfined"。

`native/landlock-run` 的 C 启动器（298 行，C11）值得单独讲：它是 **self-restrict-then-exec**——给自己装上 Landlock ruleset，然后 `exec` 目标命令；ruleset 跨 `execve` 继承，于是被包的命令及其所有子进程都在约束内，而调用方本身不受限。几个决策很讲究：

- 纯 C11 + musl 静态链接，"no libraries beyond libc"，整个审计面就是那一个文件加内核稳定的 syscall 契约
- **不 include `<linux/landlock.h>`**，本地重新声明 UAPI 结构体——既让构建独立于工具链头文件版本，又 "double as the audit record of exactly which kernel API this launcher touches"
- **fail-closed**：ruleset 建不起来或内核不真正执行，就 **exit 125 且不 exec**
- **不读任何环境变量**——"which binary confines a process is never decidable by the ambient environment"

模型面的表现也设计过：`bash` 工具的 `sandbox_permissions` 参数**只在挂载的执行器确实会沙箱化时才向模型呈现**，取值是封闭词表，且**只能加宽不能收窄**，加宽必须同时给 `justification`——一句给人看的理由。

## 一条完整的调用链：从用户输入到工具执行

这是理解 dsh 最重要的一条链。以"用户在 Web UI 输入『帮我修一下这个 bug』，模型决定并行调 `read_file` + `grep`"为例，完整走一遍：

```
① 输入进入：Client ─WebSocket─► host/webserver ─► api/gateway (Typert RPC)
      └─► agent.followup(userMessage) ─► inbox.splice(...) 落事件 + wakeDriver()

② 驱动启动：setPhase(running) → kick() → while (await this.turn())

③ 开 turn：session.append('turn/start')

④ 组装这一步的输入（preStep）：
      inbox.claim(...)                    ← 取出用户消息
      ctx.systemPrompt.assemble(...)      ← 汇总所有插件的 prompt section + 工具 schema
      runtimeContext.project(...)         ← cwd/时间/环境
      waterfall('agent/pre-step', ...)    ← ★ 扩展点：可改写或整体 reject

⑤ 落 step 与用户消息：append('step/start') + append('user/message', {surfaceOp:'append'})

⑥ 构造请求：
      buildRequest(...) 从 session.requestHeader() 折出上一次 header
      waterfall('agent/request')          ← ★ 扩展点：改 provider/model/effort
      header 变了 → append('request/header')
      messages 来自 session.deriveMessages() ← 请求历史 100% 从日志推导

⑦ 流式接收：每个 chunk 都 append('assistant/chunk') 落库（回放/UI 保真）

⑧ 收束 assistant 消息：
      error/aborted → waterfall('agent/request-error')  ← llm-retry / compaction 挂这里
      正常 → append('assistant/message', {sourceEventSeqs: chunkSeqs}) ← 结果引用源 chunk

⑨ 执行工具：
      executeToolCalls(...) → 按 executionMode 分组
        ├─ fillPool() 最多 10 个在飞，每个 startCall:
        │     append('tool/call') 记下 seq
        │     → waterfall('tools/pre-execute') → 单调 guard 链
        ├─ dispatch → waterfall('tools/execute') → 工具 body
        └─ commitReady() ★ 只沿连续模型顺序提交：
              waterfall('tools/post-execute') + finalizeContent
              → append('tool/result', {sourceEventSeqs:[callSeq]})

⑩ 收尾：turn 结束且 inbox.nextStep 为空 → serial('agent/turn-stopping')（可再塞活）→ break
      finally: append('turn/end', {turn, reason})

⑪ 输出回到用户：每次 append 同步触发 session/event
      → 异步缓冲落盘（热路径不阻塞 I/O）
      → session-projection → api/gateway → Client 渲染
```

**这条链最值得记住的一点**：第 ⑥ 步的 `messages` 参数是 `session.deriveMessages()` 的返回值——**模型看到的历史完全从事件日志推导，没有第二份内存态对话数组**。这就是 "Model-visible ⟺ logged" 那条不变量的物理保证。

## 设计亮点

### "一切皆插件"是真的，不是修辞

我见过很多号称插件化的 harness，最后总有一个不可替换的 core。dsh 没有——主循环自己就是一行配置。对比来看：Claude Code / Codex CLI 的扩展面主要是 MCP + hooks + skills，循环本身是黑盒；dsh 把循环、工具注册表、会话日志、prompt 装配全都开成了 Cordis 服务。**代价是抽象层数明显更多**，但换来的可组合性是实打实的。

### Capability Seam：一次 Provider 替换搬走整个执行世界

`docs/architecture.md` 定义得很清楚：一个接缝必须**同时**有三个角色——Service Definition / Service Provider / Consumer，"one role alone is not a seam"。而且 `packages/AGENTS.md` 还加了一条约束：**Design Service Definitions for all current Consumers**——不许让某一个 Consumer 劫持服务契约。

回报是文档里那句话：

> Filesystem and subprocess providers share one execution world, so pointing them at a remote sandbox moves Bash, PTY, and LSP with them, **with no provider forks**.

`packages/e2b/` 就是这个论断的验证：只换 `fs-e2b` + `subprocess-e2b` 两个 Provider，Bash、PTY、LSP 全部执行类工具自动远程化。比"每个工具各自实现一个 remote 变体"干净一个量级。

### 事件日志作为唯一真相源，三层保障

- **类型层**：`append()` 的条件元组类型让"表面事件必须声明 surfaceOp"成为编译期错误
- **运行时层**：每个包必须导出 `./invariant`，注册检查"事件流/可变数据关系"的运行时不变量，`verify-package-invariants` 门禁把关
- **契约层**：`AGENTS.md` 明写 "a new model-visible input requires a session event"

结果就是 fork / resume / 回放 / 遥测 / 持久化**全是同一个流的派生**，没有需要单独维护的第二份状态。这是我在这个项目里最欣赏的一条主线。

对比 Anthropic/OpenAI 公开的 agent SDK 思路：它们通常把消息数组作为一等公民，日志是旁路产物；dsh 反过来——**日志是一等公民，消息数组是投影**。后者在"会话可 fork、可从任意边界恢复、UI 可精确回放"这几件事上明显更省心。

### KV-cache 感知的压缩策略

`compaction-basic` 的摘要不是"另起一个干净请求"，而是**逐字回放会话自己的 system prompt、tools 和阴影区消息**（包括 image references），把压缩指令作为最后一条 user 消息追加——**复用 provider 的暖前缀缓存而不是作废它**。同时它设 `purpose = 'compaction'`，DeepSeek 适配器把它转成请求头做归因，不碰模型可见的 body。

配套细节都体现了对失败模式的想清楚：

- 摘要**只取返回的 text**，排除 reasoning（会泄漏私有推理）和 tool call（会造成孤儿调用）
- 先跑 model-free 的工具结果剪裁，重新测压力，**够了就不摘要**
- `compaction/start` 事件本身就是**持久化的锁**；未配对的 start 出现在更新的 `session/end-seed` 之前，判为上一生命周期的陈旧证据、不阻塞
- **收敛保护**：拒绝"没有变小"的摘要，重试仍降不下阈值就抛错，绝不无限循环
- 宁可显式报错也不静默丢图：image output 失败时抛 `UNSUPPORTED_CONTENT` 而不是悄悄消失

### 工具执行管线的三个非显然正确性设计

**(a) 单调守卫 vs 可重排 waterfall 的分工。** waterfall 灵活但可被绕过，`guard()` 提供不可翻案的通道。配套规则写得很狠：

> **Enforce a decision in the operation that makes it.** Schema omission, prompt filtering, facades, wrappers, and listener order are not enforcement when direct or alternate callers can bypass them; **test denial through the executor**.

**(b) around wrapper 只能换 signal，且 body 前重新熔合原始信号**——包装器可以加自己的取消条件（超时），但**无法剥夺调用方的取消权**。

**(c) 并行调度中途重新分类**——注册表在执行中变化，未启动的调用立即降级为栅栏。再加上取消时"已启动的 drain 并按序提交、未启动的补合成错误结果"，保证 `tool/call` / `tool/result` 永远配对、回放永远合法——这是很多 harness 在中断场景下会漏的坑。

### 安全设计的"降级方向"始终朝安全一侧

一组高度一致的选择：

- `tools/pre-execute` 返回 `ask` 但没挂 `ctx.approval` → **降级为 deny**
- Landlock ruleset 建不起来或内核不执行 → **exit 125，不 exec**
- 沙箱平台不支持 / runner 不可用 → `SANDBOX_UNAVAILABLE`，绝不静默无约束执行
- `DSH_TELEMETRY_DISABLED` 设成 `'0'` → **仍然关闭**（"a privacy switch prefers off-by-mistake over on-by-mistake"）
- 模型请求加宽沙箱权限 → 只能加宽不能收窄，且必须附 justification
- pnpm 依赖带安装脚本 → 默认拒绝，逐个显式放行
- 未知的 `reconnect` 配置 key → 直接 throw（"Misconfiguration fails loud"）

这种一致性不是偶然，`docs/defensive-patterns.md` 是被 `AGENTS.md` 要求在做生命周期/并发/子进程/拆卸工作前必读的。

### 与外部生态的互操作做得很实在

- MCP 工具名与 Claude Code / Codex 同形，不发明新格式
- `hooks-claude-code` / `hooks-codex` 直接桥接两家的 hook 协议
- `subagent-claude-code` 把 Claude Code 当子 Agent 调官方 SDK，且有个很克制的决定：**不去代管对方的凭据和配置文件**——"The provider neither copies nor filters those files and does not create or modify login state"
- `packages/acp`：Agent Client Protocol 服务端（纯自动化）

### 文档与门禁的工程化程度

`scripts/` 下 145 个条目，大量是 `verify-*` 门禁：`verify-package-invariants`、`verify-export-jsdoc`、`verify-cordis-config`、`verify-doc-refs`、`verify-doc-budgets`……`docs/` 下 60+ 篇，相当一部分是**生成的**（`module-graph.md` 1638 行），并且全部维护中英双语。

测试规模：**647 个 `.spec.ts` + 129 个 `.e2e.ts`，218 个 tests 目录**。CI 门禁是逐文件 100% 覆盖率，另有 keyless snapshot 回放测试验证真实装配应用的 transcript 输出。有一条测试政策特别值得抄：

> **Product-visible plugins require a non-unit REAL-composition test.** Hand-built `ctx.plugin(...)` suites are insufficient. Boot test-only `cordis.yml` through the Loader and app/process; mock only external services or nondeterministic inputs.

即"手搓 context 的单测不算数，必须通过 Loader 真实启动组合"。

### 依赖极简主义

SQLite 用 Node 内置 `node:sqlite`、压缩用内置 Zstandard、Landlock 启动器纯 C11 + musl 静态、`koffi` 只为一个 Windows 调用引入。同时 `AGENTS.md` 又有一条反向平衡规则——"**Prefer maintained dependencies over hand-rolling** when they genuinely delete owned code and tests"。所以不是无脑造轮子，是有取舍标准的。

## 可改进点

以下按"我作为基础设施工程师会在 review 里提的问题"排序。需要说明：这个项目**主动记录了大量自身局限**（每个包 README 都有 Known Limitations 章节，且有门禁强制），所以很多条是"已知且已记录"，我的意见集中在优先级和外部感知上。

**复杂度本身是最大的风险。** 43 万行 TS、48 个 package group、约 180 个 workspace 包。一次"加个工具"要触及：工具包 + `invariant` 导出 + README（含 Model Experience / KV Cache effect 章节）+ bundle patch 行 + 中英双语文档 + snapshot 测试 + 真实组合测试——`docs/cookbook/adding-a-tool.md` 的存在本身就说明这个流程需要专门指南。`AGENTS.md` 有 149 行规则。这是深思熟虑的取舍，但它意味着第三方插件生态能否长起来，取决于"写一个插件"是否真的比"读懂这 149 行规则"容易。建议为外部插件作者提供一条明确更轻的路径，把内部严格度和外部准入门槛解耦。

**Cordis 的生态与 bus factor。** 整个架构建立在相对小众的 Cordis 之上。仓库把它 vendored 进 `vendor/` 并维护上游 SHA 清单——正确的缓释措施——但学习曲线是双份的（Cordis + dsh），vendored 后上游同步成本会随时间累积。需要明确 vendored Cordis 的长期归属：跟随上游还是事实上 fork。

**文档漂移已出现可验证实例。** `AGENTS.md:35` 列了 `self-modification/` 目录，但 `packages/self-modification` 不存在（实际功能在 `packages/extensions/`）。这条落在每个 agent 每次都读的那份 AGENTS.md 里——是被 LLM 反复消费的错误上下文，成本比普通文档错字高。既然已有 145 个 verify 门禁，加一条校验 AGENTS.md 与实际目录一致是低成本高收益。

**Web 服务端安全姿态值得提级。** webserver 明写 "No TLS, auth, or origin policy"，host 配置只接受 `127.0.0.1` 和 `0.0.0.0`。问题在于这个 Web UI 背后是**能执行任意 shell 命令的 Agent**——一旦有人为了远程开发机把绑定设成 `0.0.0.0`，就等于把无认证的 RCE 端点挂上网络。建议：非 loopback 绑定强制要求 token，没 token 拒绝启动；加 Origin 校验防 DNS-rebinding——这条即使在纯 loopback 部署下也有价值。

**沙箱的不完全执行需要在模型面可见。** Windows ACL 报 `enforcement: 'partial'`、老 ABI Landlock 同样 `partial`、Seatbelt 依赖已标记 deprecated 的 `sandbox-exec`——诚实标注是对的，但 `partial` 是否传递到了模型面并不明确。如果 `bash` 工具结果里没体现"你只是部分受限"，模型可能基于"已沙箱化"的假设做更激进的操作。

**MCP 的降级是静默的。** `failOnStartupError` 默认 `false`：首次连接失败时插件照常激活，只是没有工具。从模型视角看，这表现为"某些工具从 system prompt 里消失了"，而模型没有任何信号说明为什么。建议：MCP server 不可用时向 session 注入一条模型可见的说明（`agent.inject()` 正好是架构文档推荐的机制），让模型知道是基础设施故障而非自己用错了工具。

**会话格式的迁移故事目前是空白。** rc 阶段拒绝旧盘上格式完全合理，但 `.jsonl.zstd` 里存的是用户真实的工作历史。首个 tagged release 之前需要回答：已有会话怎么办？在格式冻结之前把"读旧版并升级"做进 persistence 接缝（哪怕只支持 N-1），比冻结之后再补便宜得多。

**Code Mode 的审批心智模型需要说清楚。** native 模式下用户对每个工具调用有 `ask` 拦截点；Code Mode 下模型提交的是一整段程序，用户批准 `run_code` 时看到的是代码文本，程序内部会发生多少次子调用要到执行时才逐个触发策略。管线本身是对的（子调用确实走完整策略），但"批准一段代码 ≠ 批准它将要做的每件事"——子调用日志已经存在，只是没进用户视野，应该进。

## 当前理解 / 结论

- 「一切皆插件」在 dsh 不是修辞，是可用类型系统和门禁验证的架构事实——但这个深度插件化的成本（抽象层数、贡献门槛）决定了它更适合做「harness 的 Linux」，而不是「harness 的 macOS」
- 事件日志一等公民 + 消息数组投影，是所有需要「可恢复、可回放、可审计」的 agent 系统值得抄的主线
- 工具执行管线的并发/取消/顺序保证（单调守卫、信号熔合、中途重分类、结果配对）是目前我见过的 harness 里最完整的，中断场景下不留悬空调用这件事看着小，做对很难
- fail-closed 的一致性（连遥测开关都朝安全侧降级）说明安全设计的关键不是单个决定，而是**方向一致**的一组决定
- 主要风险不在正确性，而在复杂度的可持续性：43 万行、双份学习曲线、高门槛贡献规约——这套架构能否兑现可组合性承诺，取决于第三方插件生态是否真的长得起来
- 至于立刻该修的：AGENTS.md 文档漂移（低成本、被 LLM 反复消费）、`0.0.0.0` 绑定安全姿态（后果不对称）、会话格式迁移路径（越晚做越贵）

## 相关链接 / 来源

- 官方仓库：[deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)
- 审阅对象：`0.1.0-rc.5`（MIT，developer preview），完整源码审阅报告 1116 行留存于本地调研库，本文所有路径与行号均可在该版本核对
- 同主题卡片：Harness Engineering 与 Codex 生产实践

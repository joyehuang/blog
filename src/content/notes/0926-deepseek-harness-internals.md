---
title: DeepSeek Harness（dsh）源码解读：一切皆插件的 Agent 运行时
description: 通读 deepseek-harness 0.1.0-rc.5 真实源码后的完整拆解——Cordis 插件树、Capability Seam、事件日志唯一真相源、KV-cache 感知压缩、工具执行管线的正确性设计、Code Mode、fail-closed 安全姿态，以及作为基础设施工程师视角的可改进点。
date: 2026-09-02
updatedDate: 2026-09-02
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

DeepSeek Harness（命令名 `dsh`）是 DeepSeek AI 开源的 Agent Harness——即「跑 Agent 的那层运行时」，对标 Claude Code / Codex CLI 的底座：会话编排、工具注册与执行、权限审批、沙箱、上下文压缩、持久化、子 Agent 委派、Web/CLI 前端。本文基于 `0.1.0-rc.5`（MIT，developer preview）的真实源码通读，所有文件路径与行号均来自实际文件，不是文档转述。

它的核心主张写在 README 第一段：**everything is a plugin**，由 Cordis 驱动。验证下来属实——模型适配器、工具注册表、会话日志、乃至 Agent 主循环本身都是插件：`packages/bundle/base/cordis.patch.yml` 第 437 行，`@deepseek-ai/dsh-agent-loop` 只是其中一行配置，和 `dsh-tool-bash`、`dsh-llm-deepseek` 地位完全平等。

## 架构：Profile + Bundle 的分层组合

- **入口层**：`apps/cli`（bin: dsh）、`apps/web`（React SPA，静态资源由 webserver 托管）、`python/sdk`（stdio JSON-RPC 2.0 的 HarnessClient）
- **组合层**：Profile 决定启用哪些插件，Bundle 是插件集合的 patch 配置——同一套插件按部署场景（CLI / Web / headless / SDK 嵌入）组合出不同产品形态
- **扩展方式**：不存在需要 patch 的特权 core——「you extend dsh by mounting a plugin beside the others, and registrations are effects that unwind when their plugin unloads」

对比 Claude Code / Codex CLI：它们的扩展面主要是 MCP + hooks + skills，循环本身是黑盒；dsh 把循环、工具注册表、会话日志、prompt 装配全部开成了 Cordis 服务。**代价是抽象层数明显更多，换来的可组合性是实打实的。**

## 设计亮点

### Capability Seam：一次 Provider 替换搬走整个执行世界

一个接缝必须**同时**有三个角色：Service Definition / Service Provider / Consumer——「one role alone is not a seam」。回报是：Filesystem 和 subprocess providers 共享同一个「执行世界」，把它们指向远程沙箱时，Bash、PTY、LSP 全部跟着搬家，**零 provider 分叉**。`packages/e2b/` 就是这个论断的验证：只换两个 Provider，全部执行类工具自动远程化。比「每个工具各自实现一个 remote 变体」干净一个量级。

### 事件日志是唯一真相源，且类型系统强制

三层保障叠加：

1. **类型层**：`append()` 的条件元组类型让「表面事件必须声明 surfaceOp」成为编译期错误
2. **运行时层**：每个包必须导出 `./invariant`，`verify-package-invariants` 门禁把关
3. **契约层**：AGENTS.md 明写「a new model-visible input requires a session event」

结果是 fork / resume / 回放 / 遥测 / 持久化**全是同一个事件流的派生**，没有第二份需要维护的状态。对比 Anthropic/OpenAI 的 agent SDK 思路——它们把消息数组当一等公民、日志是旁路；dsh 反过来：**日志是一等公民，消息数组是投影**。在「会话可 fork、可从任意边界恢复、UI 可精确回放」这几件事上明显更省心。

### KV-cache 感知的压缩策略

压缩摘要不是「另起一个干净请求」，而是**逐字回放会话自己的 system prompt、tools 和阴影区消息**，把压缩指令作为最后一条 user 消息追加——**复用 provider 的暖前缀缓存而不是作废它**。配套细节都体现了对失败模式的想清楚：

- 摘要只取返回 text，排除 reasoning（防私有推理泄漏）和 tool call（防孤儿调用）
- 先跑 model-free 的工具结果剪裁，压力够了就不摘要
- `compaction/start` 事件本身就是持久化的锁；未配对的 start 出现在更新的 `session/end-seed` 之前判为陈旧证据，不阻塞
- 收敛保护：拒绝「没有变小」的摘要，重试后仍降不下来就抛错，绝不无限循环

### 工具执行管线的三个非显然正确性设计

这是本仓工程水平的最好证明：

1. **单调守卫与可重排 waterfall 分工**：`pre-execute` 是可重排 waterfall（灵活但可被绕过），其后的 `guard()` 是单调同步守卫——**后续监听器无法把拒绝翻成允许**。配套规则：「Enforce a decision in the operation that makes it」——schema 省略、prompt 过滤、wrapper、监听器顺序都不算执行，必须通过 executor 测试拒绝
2. **around wrapper 只能换 signal**：调 body 前重新熔合原始信号——包装器可以加自己的超时，但**无法剥夺调用方的取消权**
3. **并行调度中途重新分类**：补池时重读后续调用的 mode，注册表在执行中变化则未启动的调用立即降级为栅栏；取消时已启动的 drain 并按序提交、未启动的补合成错误结果，保证 `tool/call` 与 `tool/result` **永远配对**、回放永远合法

### Code Mode：与 native function calling 平权的第三条路

把工具暴露成生成式 SDK（TS/Python 类型声明进 system prompt），模型写程序而不是发一串 tool call。省 token 的关键：每个子派发都有日志可重建（审计不丢），但**只有外层精选结果进模型历史**。而且强制是真的：code 模式下模型直接调其他工具，会在策略之前就被解析为 `UNKNOWN_TOOL`——不靠 prompt 里说一句「请只调 run_code」。语言的 flavor 表和 SDK 渲染器表用 `satisfies` 对同一联合类型检查，少加一个就 typecheck 失败。

### 安全姿态：降级方向永远朝安全一侧

一组高度一致的选择：pre-execute 返回 `ask` 但没挂 approval → **降级为 deny**；Landlock 建不起来 → exit 125 不 exec；平台不支持沙箱 → `SANDBOX_UNAVAILABLE`，绝不静默无约束执行；遥测禁用开关设成 `'0'` **仍然关闭**（prefers off-by-mistake over on-by-mistake）；依赖安装脚本默认拒绝逐个放行；未知配置 key 直接 throw。

### 互操作与工程化

- MCP 工具名与 Claude Code / Codex 同形（`mcp__<server>__<tool>`），不发明新格式；官方包直接桥接两家的 hook 协议，甚至能把 Claude Code 当子 Agent 调（且刻意不代管对方的凭据与配置文件）
- `scripts/` 下 145 个条目大量是 `verify-*` 门禁；docs 60+ 篇相当部分是生成的（module-graph 1638 行），全程维护中英双语
- 测试规模：647 个 `.spec.ts` + 129 个 `.e2e.ts`，CI 门禁逐文件 100% 覆盖；有一条特别值得抄的测试政策：「**手搓 context 的单测不算数，产品级插件必须通过 Loader 真实启动组合来测**」
- 依赖极简主义：SQLite 用 Node 内置 `node:sqlite`、压缩用内置 Zstandard、Landlock 启动器纯 C11 + musl 静态——同时有反向规则「优先维护良好的依赖而不是手搓」，不是无脑造轮子

## 可改进点

- **复杂度本身是最大的风险**：插件树的抽象层数对贡献者门槛不低，Cordis 生态的 bus factor 依赖 cordiverse 社区
- **文档漂移已出现可验证实例**（rc 阶段的常见病）
- **Web 服务端安全姿态**有已记录但值得提级的问题
- **沙箱的不完全执行**需要在模型面和用户面都可见——模型应该知道自己跑在沙箱里

## 当前理解 / 结论

- 「一切皆插件」在 dsh 不是修辞，是可用类型系统和门禁验证的架构事实——但这个深度插件化的成本（抽象层数、贡献门槛）决定了它更适合做「harness 的 Linux」，而不是「harness 的 macOS」
- 事件日志一等公民 + 消息数组投影，是所有需要「可恢复、可回放、可审计」的 agent 系统值得抄的主线
- fail-closed 的一致性（连遥测开关都朝安全侧降级）说明安全设计的关键不是单个决定，而是**方向一致**的一组决定

## 相关链接 / 来源

- 官方仓库：[deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)
- 完整源码审阅报告（1116 行，含全部文件路径与行号）留存于本地调研库
- 同主题卡片：Harness Engineering 与 Codex 生产实践

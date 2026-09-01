---
title: eve SRE agent 源码精读：单 agent 循环、filesystem-first 与 runbook 即 skill
description: Vercel Labs eve-sre-agent-template 的 2200 行源码精读——为什么选单 agent 循环而非多 agent（1M 窗口下编排价值下降）、eve 框架五抽象（Channels/Instructions/Skills/Connections/defineState）、skills 沉淀 runbook 的设计，以及「参考架构值得精读但不建议照抄当作品」的判断。
date: 2026-09-02
updatedDate: 2026-09-02
tags:
  - ai
  - agent
  - multi-agent
  - orchestration
  - software engineering
type: reference
status: ready
source: https://github.com/vercel-labs/eve-sre-agent-template
relatedNote:
  - 0926-vercel-agentic-infrastructure
  - 0926-ai-native-sdlc-playbook
draft: false
---

## 核心内容

Vercel Labs 2026-08-25 发布的 SRE agent 官方模板的完整源码精读（全部约 2200 行 TS，9 个测试文件）。它是「AI 原生运维」的参考实现：跑在 Slack 里，从 Datadog/Vercel/GitHub/Slack 拉上下文，生成 2-4 个根因假设逐一验证，给出带证据链接的结论。

## 是不是 multi agent？——不是

这是标准的**单 agent 循环架构**：一个模型实例（`gpt-5.6-terra`，reasoning effort 拉满）在一个 session 里循环跑工具调用，直到自己判断证据够了。没有 planner/worker 分层、没有子 agent 扇出、没有 agent 间消息传递。并发只在入口层——每条 Slack 消息/webhook 各开一个独立 session。

选单 loop 的理由写在 `agent.ts` 注释里：「loop 大量工具调用会吃掉很多上下文」→ 所以直接给 **1M 窗口**而不是拆多 agent。这个取舍本身值得记：**上下文够大时，流程编排的价值下降**。配套细节：compaction 设在 70% 触发——预期长会话会打满，用压缩兜底而非多 agent 切分。

## eve 框架的五个抽象

eve（0.44.4，「filesystem-first durable backend agent framework」，eve.dev）：

- **Channels**（触发面）：slack.ts（mention/DM/频道监听）、webhook.ts（POST /v1/investigate）、本地 TUI——同一个 agent 挂多个触发面
- **Instructions**：identity + 硬规则（不许编造、绝对时间戳、受控英语）
- **Skills**：deep-investigation / hypothesis-validation / on-call-handoff / suggest-follow-ups 四个内置 SKILL.md + `create_skill/delete_skill/list_skills` 工具——**agent 能在对话中把「这次的处理步骤」沉淀成 runbook 存进 Blob，下次自动加载**。这是本仓库最值得学的设计：程序性知识外置成可版本化的文件，而不是 prompt 里的一段话
- **Connections**：Datadog 和 Vercel 走 MCP 连接器，GitHub 是独立 extension，认证全走 Vercel Connect 的 read-only 凭据
- **defineState**：evidence（证据）是用它实现的一等公民状态——每个结论都能回溯到证据对象

依赖表干净到只有 5 个运行时依赖：eve、ai-sdk/openai、vercel/blob、vercel/connect、zod。

## 参考价值 vs 照抄风险

- **值得精读**：假设驱动的调查结构（先生成 2-4 个假设 → 逐一验证 → 证据链接收口）、runbook 即 skill 的自沉淀设计、单 loop + 大窗口 vs 多 agent 的取舍论证
- **不建议照抄当作品**：这是 Vercel Labs 官方模板，曝光度极高、方向极热，照抄会很扎眼（面试官一搜第一屏就是这个 repo）；且它教的是 eve 框架怎么用，框架 API 本身不通用
- **正确的打开方式**：拿它当参考架构，**在别的域做同构的东西**——把领域从 SRE 换掉（Sentry/Grafana 告警排查 agent、电商运营异常诊断、内容审核 triage），保留骨架（假设驱动的 skill 结构、evidence 系统、多触发面）

## 我们的对照

- 「agent 自沉淀 runbook」与我们 skills 仓库的 handroll 维护是同一件事的两个方向：我们靠人识别重复沉淀，eve 让 agent 在对话中自己调 create_skill——后者是 self-evolving 方向的落地形态（与 /refine 卡的安全约束可以组合）
- 「单 loop + 1M 窗口 vs 多 agent」的取舍，对我们的 herdr 多 agent 实践是个反例参照：**任务本身不需要并行视角时，一个大窗口单循环更简单可靠**
- evidence 一等公民状态 + defineState，与 PersonaMem/Prime Agent 卡里「证据可回溯」的结论互相印证

## 相关链接 / 来源

- [vercel-labs/eve-sre-agent-template](https://github.com/vercel-labs/eve-sre-agent-template)（2026-08-25）
- 官方指南：[Investigate incidents with the eve SRE agent](https://vercel.com/kb/guide/eve-incident-sre-agent)
- 同主题卡片：Vercel Agentic Infrastructure（平台视角）、Liquid agent-loops（外部验证同构）

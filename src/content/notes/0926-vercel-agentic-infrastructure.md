---
title: Vercel 的 Agentic Infrastructure：八块积木与「平台自己当 SRE」
description: Vercel 从 2025-11 到 2026-08 的 agentic 路线整合深读——Agentic Infrastructure 八块积木（AI SDK 6/Chat SDK/AI Gateway/Fluid/Workflows/Sandbox/Observability）、基础设施本身变成 agent 的自治运维、eve filesystem-first agent 框架与 SRE agent 实例。
date: 2026-09-02
updatedDate: 2026-09-02
tags:
  - ai
  - agent
  - orchestration
  - workflow
type: reference
status: ready
source: https://vercel.com/blog/agentic-infrastructure
relatedNote:
  - 0926-ai-native-sdlc-playbook
draft: false
---

## 核心内容

Vercel 从 2025 年 11 月（Self-driving Infrastructure 愿景文）到 2026 年 8 月（eve SRE agent 指南）的整条 agentic 路线整合。核心主张一句话：**像当年统一 serverless 一样统一 AI 原语**——把散落的 AI 能力整合成一套有共享上下文的系统，且最终让基础设施本身变成 agent。

## 八块积木

- **AI SDK 6**：新增 agent 抽象——agent 定义一次，跨界面/工作流复用
- **Chat SDK**：一套代码把 agent 接到几十个聊天平台
- **AI Gateway**：几百个模型的统一端点，预算/监控/路由/重试/降级
- **Fluid Compute**：为 AI 负载设计的运行时（长延迟、高并发、空闲等待）
- **Workflows + Queues**：agent 暂停/恢复/重试/保持状态/后台任务
- **Sandbox**：不可信代码的隔离执行环境
- **Observability**：追踪 agent 在做什么、哪里出错

注意 Vercel 的口径：「Vercel is agentic infrastructure」是品牌口号，不是独立产品页；支撑它的是上面这组互相咬合的产品矩阵。

## 真正的新意：基础设施本身变成 agent

传统基建是单向的——代码进、日志出、人读日志修代码。Vercel 的做法：平台有完整的实时可见性，**延迟尖峰、模型供应商抽风时，平台自己调查异常、查观测数据、读日志、看源码、做根因分析、在沙箱里验证修复**，然后人批准执行。原文的表述：「平台解读开发者想干什么，观察系统实际做了什么，对差距采取行动。」

现在还有人类批准环，但方向明确：未来平台自动承担更多运维负担。数据支撑是 Ship 2026 的「agents now drive half of deployments」。

## eve 与 SRE agent 实例

**eve** 是 Vercel 的 filesystem-first durable backend agent 框架，权限走 Vercel Connect 的 read-only token。2026-08-25 发布的 SRE agent 实例（官方指南 + 开源模板 vercel-labs/eve-sre-agent-template）：

- 跑在 Slack 里：`@sre` 提一下或自动响应告警
- 从 Datadog / Vercel / GitHub / Slack 拉上下文，生成 2-4 个根因假设逐一验证
- 最后给出带证据链接的结论（影响、时间线、受影响系统、下一步）
- 配套给 Claude Code / Cursor 一键部署的 prompt

配套的还有 **@design-agent**（Slack 里的设计 critique agent，见 design.md 方法论卡）：每个 thread 是一次真实请求 + 真实输出 + 真实反馈，反馈自动聚类成 design.md 的 proposed change——运维和设计都用同一套「agent 在真实使用中产生反馈 → 反馈驱动基建演进」的循环。

## 我们的对照

- Workflows/Queues + Sandbox 这套分层，正是我们 Mac mini 上常驻 agent 基建（trajectory-daemon、mail-watch、watch 全家桶）的对标物——launchd + 脚本是我们手搓版的 Workflows，CF Access + 限额是手搓版的权限边界
- 「平台调查异常 → 生成假设 → 验证 → 人批准」的自治运维模式，和 mail-watch / mizzen-watch 的「watch → 去重 → 通知」是同一思想的低配版；缺的是根因假设生成环节
- AI Gateway 的「预算/监控/路由/重试/降级」正是我们用 failover 代理 + cc/or 双路由手搓的东西——Vercel 把它产品化了，说明这个需求是普遍的

## 当前理解 / 结论

- 「agentic infrastructure」的正确读法是两层：一层是给 agent 用的基建（Gateway/Sandbox/Workflows），一层是基建自己成为 agent（自治运维）——Vercel 两层都在做，且第二层是差异化所在
- 对个人 agent 体系的启发：把手搓的 watch/daemon 逐步升级出「假设生成 + 沙箱验证」能力，就是走向自治运维的最短路径
- 人类批准环（从 eve SRE 到 platform 自治）始终保留——这与 Cumora 的「软机制配硬上限」、Anthropic playbook 的「hooks 审批门」是同一安全共识

## 相关链接 / 来源

- [Agentic Infrastructure — Vercel Blog](https://vercel.com/blog/agentic-infrastructure)（2026-04，Tom Occhino）
- [Investigate incidents with the eve SRE agent](https://vercel.com/kb/guide/eve-incident-sre-agent)（2026-08-25）+ [vercel-labs/eve-sre-agent-template](https://github.com/vercel-labs/eve-sre-agent-template)
- 前序：[Self-driving infrastructure](https://vercel.com/blog/self-driving-infrastructure)（2025-11）、[Introducing the new Vercel Agent](https://vercel.com/blog/vercel-agent)（2026-07）

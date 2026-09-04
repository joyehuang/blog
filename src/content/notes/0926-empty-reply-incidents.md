---
title: pi 空回复事故分析：18 起日志实证与 empty-reply-guard 保险丝
description: agent 偶发「整轮无最终回复」事故的完整排查——session 日志实证 8-11 以来的 18 起、两种模式分类（stopReason=error 的跨模型空回复 vs glm 特有的正常 stop 空回复）、bridge 语义下 quote 缺失的分析，以及 empty-reply-guard 扩展的兜底设计（agent_end 检测 + followUp 重试一次）。
date: 2026-09-02
updatedDate: 2026-09-02
tags:
  - ai
  - agent
  - llm
  - software engineering
type: research
status: ready
source: https://github.com/earendil-works/pi
draft: false
---

## 核心内容

pi agent 偶发「整轮无最终回复」——Telegram 侧表现为只有中间消息、没有 quote 回复，用户看到的对话直接断掉。这不是单次 bug：对 session 日志的逐条排查实证了 8-11 以来的 **18 起同型事故**，跨 4 个模型发生。这张卡记录完整的归因分析与修复设计。

## 归因前的关键澄清：bridge 语义

排查时先钉死一个语义事实：**turn 的最终 quote 回复 = turn 的最后一条 assistant 消息**。这意味着：即使 run 中途发过带工具调用的中间进展消息，只要收尾是空消息，quote 回复就永远缺失——所以 18 起全部是用户可见的「断掉」，无一例外。

按 run 内有无纯文字中间消息分型：10 起中间有进展消息（用户看到了过程但没有结论）、8 起全程静默直接断（用户什么都看不到，以为 agent 死了）。

## 两种模式

**模式 A：stopReason=error 的空回复（8-11~8-28，14 起，跨模型）**

- 模型分布：deepseek 9 次 / cc-deepseek 3 次 / Qwen3.8 3 次 / opus 2 次——**跨模型发生，多紧跟 Command aborted 之后**
- 性质：上游 API/网关层的错误边界——错误到达时 content 为空，harness 把空 completion 当正常 turn 结束

**模式 B：stopReason=stop 的空回复（8-29 起 4 起，全部 glm-5.3-flash）**

- 生成了 37-68 秒后**正常 stop 但 content 为空**——模型自己决定停止，却没输出任何内容
- 性质：模型生成层的问题（该模型的已知毛病之一，与它后来的输出漂移事故同族），非网关问题

模式分类的价值：**两种模式的锅不在同一层**，但症状相同、对用户的影响相同——所以修复放在 harness 的中立位置，而不是各打五十大板。

## 修复：empty-reply-guard 保险丝

设计原则是「不改主流程，只在边界兜底」：

- **agent_end 钩子检测**：最后一条 assistant 消息为空（无文字、无工具调用、非 aborted）时，自动注入 followUp 用户消息触发续答
- **每轮最多重试 1 次**，真正的新用户输入重置计数——防止死循环
- 机制验证：agent_end 的 sendUserMessage followUp + triggerTurn 确实能触发第二轮（先用测试扩展验证再上生产）
- 对两种模式都有效：模式 A 重试大概率命中正常路由，模式 B 重试给模型第二次生成机会

## 排查方法论复盘

- **先钉死系统语义再归因**：如果没搞清「quote = 最后一条消息」的 bridge 语义，会把 10 起误判为「无害」（有中间消息嘛）而漏掉一半事故
- **逐条看日志而不是看计数**：855 行加长版上下文日志（每起含前 6 条事件全文）让两种模式无处遁形——只有聚合统计的话，stopReason 分布的差异就是全部洞察了
- **修复位置选择**：跨模型的病放 harness 中立层兜底，模型特有的病记录为该模型的去留证据——**修通用性和记黑名单要分开**

## 当前理解 / 结论

- 空回复是 harness 的「边界条件盲区」：错误边界（模式 A）和模型怪癖（模式 B）都会产生合法结构的空 completion，harness 不做防御就会静默断轮
- agent 的可靠性工程大部分是这类「低频但致命」的边界：单次概率 1% 的事故，在高频对话里每周都能撞见
- 保险丝（重试一次）是处理「生成层不确定性」的正确抽象——比修 provider、换模型都便宜，且对所有模式生效

## 相关链接 / 来源

- 完整事故日志（855 行加长版，每起含前 6 条事件全文）留存于本地调研库
- 修复实现：empty-reply-guard 扩展（pi-agent-config 仓库，commit 2c87171）

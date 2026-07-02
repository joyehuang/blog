---
title: Useful Memories Become Faulty When Continuously Updated by LLMs
description: 实验验证 LLM 做记忆 consolidation 的致命问题——先升后降，最终不如无记忆。episodic-only 方案持平或超越所有抽象方案。直接验证了我们之前对 Hermes Agent 记忆系统的直觉。
date: 2026-05-24
source: https://arxiv.org/abs/2605.12978
sourceTitle: Useful Memories Become Faulty When Continuously Updated by LLMs — Zhang et al.
sourceAuthor: UIUC / Tsinghua
why: 直接挑战 LLM memory consolidation 的常见设计，给 Hermes 记忆系统提供了反证。
tags:
  - agent
  - memory
  - consolidation
  - research
type: paper
status: digested
difficulty: deep
relatedNote:
  - 0526-hermes-fts5-session-search
draft: false
---

GPT-5.4 用 ground-truth 解法做 consolidation，ARC-AGI 准确率从 100% 跌到 54%。**不是轨迹质量的问题，是 consolidation 步骤本身有毒。** 三种机制：misgrouping（强行合并不相关任务）、overgeneralization（抽象丢失条件区分）、overfit（窄分布过拟合并不能泛化）。

**最有力的实验**：ARC-AGI Stream 里，Episodic Management Only（关掉 consolidation，只做 retain/delete）持平最优 Auto 策略，而 Force（每步强制 consolidate）只有一半准确率。有用的信息存在 raw episodes 里，不在 distill 出的条目中。

**可落地**：Hermes 可以加一层 EpisodicStore（append-only raw trajectory），consolidation 变成显式 gated 触发，不再靠模型自觉做整理。与现有 frozen snapshot 完全兼容。

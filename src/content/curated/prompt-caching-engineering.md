---
title: Prompt Caching 设计哲学——缓存不是优化，是约束
description: 从 Claude Code 的 prompt caching 实践出发，整理"动态信息放 messages 不放 system prompt"、defer_loading 模式、以及三家 LLM 厂商的缓存策略对比。对做 agent 的人来说是必读的工程纪律。
date: 2026-05-24
source: https://claude.com/blog/lessons-from-building-claude-code-prompt-caching-is-everything
sourceTitle: Prompt caching is everything — Lessons from building Claude Code
sourceAuthor: Anthropic
why: 让 prompt caching 从成本优化变成 agent prompt 组织约束，直接影响长期 loop 成本。
type: blog
status: digested
difficulty: intermediate
tags:
  - agent
  - llm
  - prompt
  - performance
relatedNote:
  - 0526-prompt-caching-engineering
draft: false
---

核心三件事：

1. **Use messages for updates**——所有动态信息（时间、文件状态）放 user message，不要改 system prompt，否则整个对话 cache 全废
2. **Never add/remove tools mid-session**——工具定义是 cached prefix 的一部分，增删 = cache miss。用 defer_loading stub 解决 MCP 工具太多的问题
3. **Anthropic 的显式 breakpoint 设计更适合 agent loop**——90% 读取折扣、100% 命中率、明确的 TTL 控制

**为什么值得看**：对于做长期运行 agent 的人，这直接决定了成本结构。一个 agent loop 动辄几十轮调用，正确组织 prefix 和动态信息的差别是 10x 成本。

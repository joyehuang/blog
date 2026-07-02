---
title: Hermes FTS5 会话检索——搜索与理解的解耦
description: Hermes Agent 用 SQLite FTS5 + LLM query-focused summary 替代向量检索做会话搜索，把"召回"和"理解"拆成两个独立系统。单用户场景下比 vector RAG 更便宜、更稳、零运维。
date: 2026-05-24
source: https://github.com/nousresearch/hermes-agent
sourceTitle: Hermes Agent — hermes_state.py + session_search_tool.py
why: 单用户 agent 场景下，搜索系统可以先做词法召回，再把理解交给 LLM。
type: repo
status: digested
difficulty: intermediate
tags:
  - agent
  - llm
  - search
  - retrieval
relatedNote:
  - 0526-hermes-fts5-session-search
draft: false
---

双 FTS5 表（unicode61 + trigram）做词法召回 → Gemini Flash 并行做 query-focused 摘要，替代传统的 vector + rerank pipeline。

**为什么值得看**：这不是一篇论文，而是 Hermes 实际在跑的架构。它对"什么时候不用向量"给出了一个很有说服力的工程论证——单用户场景下 BM25 的召回质量被低估了，而且 trigram 在中英混杂场景比 jieba 分词更稳。

**可落地**：如果你在做单用户 Agent 的搜索功能，可以直接参考这套 FTS5 + LLM 两阶段方案。代码在 Hermes 的 `hermes_state.py` + `session_search_tool.py`。

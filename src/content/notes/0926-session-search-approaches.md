---
title: 跨会话检索的 4 类方案：recall 问题不是语义搜索问题
description: 自建 session search 前的完整方案调研——grep 脚本 / SQLite+FTS5 索引 / 向量语义检索 / 内置记忆层四类的代表项目、优劣与取舍；核心判断：「大多数查询不是语义搜索问题，是 recall 问题」；以及 CLI + 扩展双层的最终选择理由。
date: 2026-09-02
updatedDate: 2026-09-02
tags:
  - ai
  - agent
  - retrieval
  - search
  - sqlite
type: research
status: ready
source: https://github.com/braincompany/sessiongrep
relatedNote:
  - 0526-hermes-fts5-session-search
  - 0504-hermes-memory-safety-mechanisms
draft: false
---

## 核心内容

「用户说『那篇/那个/之前聊过的 X』时 agent 找不回来」——解决这个问题前的完整市场调研。四类方案各有一个代表项目，调研的核心收获是一个反直觉判断：**跨会话检索大多数时候不是语义搜索问题，是 recall 问题**。

## 4 类方案

**1. 简单 grep 脚本（cc-search 类）**

- 代表：cc-search（Claude Code 社区的 Python 脚本）、raine/claude-history（fuzzy 搜索）
- 思路：直接扫 sessions 目录的 jsonl，正则匹配 + 显示上下文片段 + 按时间倒序
- 优点：零依赖、几十行、秒级可用。缺点：无语义搜索、数据量大后变慢（调研时 20MB / 34 会话还很小，一年后几百 MB 就不行了）

**2. SQLite + FTS5 索引（sessiongrep）**

- 代表：braincompany/sessiongrep（Rust，2026-05 发布）
- 思路：把 Claude/Codex/Cursor 的 JSONL 归一化进 SQLite，FTS5 全文检索 + 元数据排序，增量刷新（按 mtime/size 跳过未变文件）
- 提供 CLI + TUI + **MCP server**（agent 自己也能搜历史）
- 优点：快、增量、本地优先、可被 agent 调用。缺点：**只支持 Claude/Codex/Cursor 三种格式，不支持 pi**——但它的 Session 模型是 provider-agnostic 的，加一个 adapter 即可

**3. 向量数据库 / 语义检索**

- 代表：sqlite-vec（嵌入式）、mem0（记忆层）
- sessiongrep 作者的判断很锋利：**"Most queries are not semantic search problems. They are recall problems"**——「那个 Redis 的事」「修 ArgoCD 那次」，关键词检索对会话检索足够，语义检索性价比低。关键词搜不到的，往往是当时就没说清，语义搜也未必好

**4. 内置记忆层（mem0 等）**

- 定位不同：mem0 管的是**长期事实记忆**（「用户偏好 X」），不是**会话全文检索**（「那天聊过什么」）——两者互补不可互替

## 最终选择与架构

**方案 2（sessiongrep 思路）+ 自写 pi adapter**，做成 CLI + 扩展双层：

1. 痛点就是 recall 问题，FTS5 足够，不需要向量
2. 数据量会涨，纯 grep 会慢，SQLite 索引一劳永逸
3. 已有 `recaps/` 摘要索引做第一层（时间线定位），session search 做第二层全文兜底——两层正好补成完整的检索链
4. CLI 形态（`pi-search "关键词"`）人能用，扩展形态（agent 在对话中自动调用）机器能用

## 后记：这个判断后来被验证了吗

部分验证、部分推翻——实践发现**模糊提问**（「之前聊过的那个东西」）确实需要语义扩展，纯关键词召回率不够，所以 pi-search 后来加了 LLM 查询扩展 + 真实 IDF 排序修复（hit@1 29.6% → 48.1%）。修正后的结论更准确：**检索骨架用 FTS5（召回是关键词问题），但查询理解需要语义层（措辞是语义问题）**——「recall 不是语义问题」指的是匹配机制，不是查询改写。

## 相关链接 / 来源

- [braincompany/sessiongrep](https://github.com/braincompany/sessiongrep)
- [raine/claude-history](https://github.com/raine/claude-history)、cc-search（definite.app 博客）
- 同主题卡片：Hermes Agent 会话搜索（FTS5 + LLM 摘要的另一种形态）

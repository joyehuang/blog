---
title: Hermes Agent 会话检索：FTS5 + LLM 摘要架构
description: Hermes Agent 的 L2 记忆层——用 SQLite FTS5（unicode61 + trigram）做词法召回、Gemini Flash 做 query-focused 语义提炼。不依赖向量索引。
date: 2026-05-24
updatedDate: 2026-05-24
tags:
  - ai
  - agent
  - llm
  - retrieval
  - search
  - software engineering
type: research
status: ready
source: https://claude.ai/share/3b628472-9217-41bb-90a0-2c9ea0129ced
relatedArchive:
  - 0504-hermes-memory-safety-mechanisms
draft: false
---

## 核心内容

Hermes Agent 的 L2 会话检索层，核心思路是**把"搜索"和"理解"解耦**：

```
Stage 1: FTS5 词法召回（廉价、宽口径、允许噪音）
Stage 2: LLM query-focused summary（昂贵、窄输出、过滤噪音）
```

不依赖向量 embedding，也不依赖外部搜索服务。

---

## 要点整理

### 1. 存储基础：SQLite + 双 FTS5 虚拟表

`~/.hermes/state.db` 中的 `messages` 表，开 WAL 模式（多读单写）。所有 CLI / Telegram / Discord / cron session 的每条消息落地。

两张并行的 FTS5 虚拟表，通过 trigger 自动同步：

```sql
-- 默认 unicode61 tokenizer（拉丁文/英文友好）
CREATE VIRTUAL TABLE messages_fts USING fts5(content);

-- trigram tokenizer（CJK / 任意脚本子串匹配）
CREATE VIRTUAL TABLE messages_fts_trigram USING fts5(
  content,
  tokenize='trigram'
);
```

**关键设计**：trigger 索引的是 `content + tool_name + tool_calls` 的拼接——工具调用的参数也是可搜的，不只是聊天文本。Agent 系统里大量信号藏在工具参数里。

### 2. 写入路径：零额外成本

每条消息存到 SQLite 时 trigger 自动维护 FTS 索引。不需要 embedding 推理、不需要向量库写入。磁盘 IO 就是 SQLite 一次 fsync。

### 3. 检索路径：两步 cascade

agent 调 `session_search` 工具时的完整流程：

1. **FTS5 MATCH** 拿到 top 50 相关消息（按 BM25 ranking）
   - 英文/拉丁查询：走 `messages_fts`（unicode61）
   - ≥3 个 CJK 字符：走 `messages_fts_trigram`（CJK 子串匹配）

2. **_sanitize_fts5_query()** 转义 FTS 特殊字符，带 `-` `.` 的术语自动加引号

3. **按 session_id 分组**，去重，跳过当前会话血缘

4. **_truncate_around_matches()** 选 100k 字符窗口
   - 25% before / 75% after 命中点

5. **并发发给 Gemini Flash**（默认 3 路），按搜索关键词 summarize
   - 不是返回原文！是 query-focused summary
   - 每个 session 返回摘要 + 元数据（时间、source、模型）

### 4. 为什么 FTS5 不是向量

这套设计最值得展开的论点：

**BM25 在单用户数据上被低估了。** 用户搜自己写过的东西时，查询词和原始消息往往共享词汇表。语义泛化在这里是负担——会把别的 session 里讨论类似话题的内容也召回进来。

**Trigram 对 CJK 是中英混杂场景的结构正确选择。** 中文没有空格，jieba 分词要么过分要么不够。Trigram 是字符级 n-gram，子串匹配免费。在中英混杂、技术术语密集、新概念频出的 Agent 场景中，trigram 比分词稳得多。

**写入零延迟**（不算 embedding）。**零运维**（SQLite 跟着主进程走，不用部署 Qdrant/Chroma）。**跨设备同步**只要复制一个 .db 文件。

### 5. Query-focused summary 是关键创新

大多数 RAG 系统在这一步要么返回 chunks（让主模型自己读），要么做 query-agnostic 摘要。

Query-focused summary 实际上是**带推理的软 rerank**：小模型读 100k 字符窗口，被要求"针对 query X 总结"——它在做语义匹配，而且是带推理的 rerank，不是相似度打分。

**核心收益**：

- **信息密度从 ~10% 拉到 ~80%**。无关 token 不进主模型 context。
- **吸收了一部分语义泛化的需要**。FTS5 不会把"死锁"和"ReAct loop 卡住"匹配起来，但如果"死锁"这个 query 在另一个 session 里有过字面命中，FTS5 召回那个 session，然后摘要 prompt 让 LLM 在读到 "ReAct loop 卡住"时——它知道这就是用户问的死锁，会在摘要里翻译成"用户之前用 max_iter 解决了 ReAct loop 卡死的问题"。
- 语义泛化的工作从**召回阶段**被推迟到了**摘要阶段**。

### 6. 非对称成本结构

| 操作 | 频率 | 单次成本 |
|------|------|---------|
| FTS5 写入 | 每条消息 | 接近零 |
| FTS5 检索 | 每次 session_search | 接近零 |
| LLM 摘要 | 每次有匹配的 session | 调用 Gemini Flash |
| 向量写入 | 每条消息 | 中（embedding 推理） |
| 向量检索 | 每次搜索 | 中（ANN 索引） |

**关键不对称性**：FTS5 召回是廉价的，因此可以用更宽的召回口径而不心疼成本。甚至可以用 OR 扩展 query 来拉宽召回——因为进入摘要阶段后，LLM 会自己过滤。如果召回是昂贵的（比如每次都要算 embedding），就必须把召回口径收窄，而这恰恰是导致漏召回的原因。

---

## 当前理解 / 结论

这套方案最有价值的地方不是"FTS5 vs 向量"谁更好，而是**把搜索召回和语义理解做成了两个独立的系统**，让各自做自己最擅长的事：

- FTS5 负责：廉价、高命中、词汇级的宽召回
- LLM 负责：昂贵、精准、语义级的理解和提炼

这比"embedding 一把梭"的 vector RAG 方案更适合单用户 Agent 场景。核心原因：单用户的数据量级（几万到百万条消息）下，向量的运维成本和写入延迟的 overhead 不值得支付。

**对 Hermes 的启示**：这已经是实际在跑的方案，下次如果要优化搜索质量，应该优先考虑：

1. 查询扩展（用 LLM 把用户 query 扩展成多个 FTS5 子查询）
2. Session 级别的元数据过滤（时间范围、source 过滤）
3. 摘要质量的评估和改进（当前用的 Gemini Flash 够不够好）

---

## 与现有 memory 卡片的关系

之前的 `0504-hermes-memory-safety-mechanisms` 讲的是 `memory_tool.py`——长期记忆的存储安全性。

这张卡片讲的是 `session_search_tool.py` + `hermes_state.py`——会话记忆的检索架构。

两者是 Hermes memory 系统的不同层面：

- **长期记忆**（memory_tool）：持久化的事实和偏好，文件级存储
- **会话记忆**（session_search）：历史对话的按需检索，SQLite + FTS5

后续如果 Hermes 加入中间层（working memory / episodic buffer），还可以再开新卡。

---

## 相关链接 / 来源

- 对话来源：https://claude.ai/share/3b628472-9217-41bb-90a0-2c9ea0129ced
- Hermes Agent 源码：`hermes_state.py`、`tools/session_search_tool.py`
- 相关 archive：0504-hermes-memory-safety-mechanisms

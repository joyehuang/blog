---
title: Hermes Agent 记忆架构：从 L0 到 L2 的四层设计
description: Hermes Agent 的记忆系统完整概览——系统提示词装配（L0）、持久化记忆工具（L1）、外部记忆插件（L1.5）、会话搜索（L2）、以及上下文压缩与 session 分裂。不依赖向量数据库。SQLite FTS5 + LLM 摘要 + 文件级持久化。
date: 2026-05-24
updatedDate: 2026-05-24
tags:
  - ai
  - agent
  - llm
  - memory
  - retrieval
  - search
  - sqlite
  - architecture
type: research
status: ready
source: https://github.com/nousresearch/hermes-agent
relatedNote:
  - 0504-hermes-memory-safety-mechanisms
draft: false
---

## 核心内容

Hermes Agent 的记忆系统由**四个协同层**组成，按持久化程度和访问模式分层：

```
L0  — 工作上下文（系统提示词 + 注入记忆块）  ← session 内有效
L1  — 持久化记忆（memory_tool，文件级存储）
L1.5 — 外部记忆插件（honcho / mem0 / supermemory 等）
L2  — 会话搜索（session_search_tool，SQLite FTS5 + LLM 摘要）  ← 跨 session 按需检索
```

外加一个**横切层**：**上下文压缩 + session 分裂**，处理超长会话时的 context 窗口管理。

核心哲学是**分层解耦**：每层只做自己擅长的事，不依赖向量数据库，不依赖外部搜索服务。

---

## 要点整理

### 0. 设计原则

Hermes 的记忆系统遵循几条关键设计哲学：

1. **Frozen snapshot pattern**: L1 记忆在 session 启动时冻结到系统提示词中，session 内写入不改变提示词，保留前缀缓存
2. **On-demand recall**: L2 搜索是工具调用触发的，不是每轮注入——成本与收益精确对齐
3. **Decoupled search and understand**: FTS5 做廉价宽召回，LLM 做昂贵语义提炼
4. **Plugin extensibility**: 外部记忆提供者通过 `MemoryProvider` ABC 接入，支持多种后端
5. **Safety-first**: 所有写入路径都有注入扫描、文件锁、原子写入等安全措施

### 0.5 核心权衡：Prefix Cache 经济模型

理解 Hermes 记忆架构的关键在于理解 **prefix cache** 的经济模型。这不是一个设计细节，而是整个 frozen snapshot 方案存在的前提。

**Prefix Cache 原理**：LLM 推理的核心成本来自 prefill（处理输入 tokens）。Anthropic / OpenAI / Google 都做了优化——如果当前请求的前 N 个 tokens 和之前某次完全一致，KV 缓存可以直接复用，跳过 prefill。缓存按**前缀 hash 索引**，从第 0 个 token 开始连续匹配。Anthropic 的 prompt caching 命中部分按原价 10% 收费（写入按 1.25x），默认 5 分钟 TTL。

**Agent 场景下 prefix cache 的爆炸性收益**：一个典型的长 agent 任务中，到第 50 轮时输入可能有 80,000 tokens，但 system prompt 那 5,000 tokens 始终不变——每轮都能从缓存拿。前 49 轮的对话历史也是不变的——也能从缓存拿。第 50 轮真正需要 prefill 的只有最新的增量。如果缓存全程保持，Anthropic 说自己能省 90% 输入成本、2 倍延迟提升——**agent 场景下这个节省更夸张**。

**Frozen snapshot 的隐性成本**：如果改为朴素方案（记忆动态注入→agent 写一条就立刻更新 system prompt），system prompt 一变，**整个会话的 prefix cache 全部失效**。前面 49 轮的缓存白存了。写一次记忆，相当于扔掉几万 tokens 的缓存——按 Sonnet 价格约 $0.10-0.30 每写一次。

**Hermes 的取舍**：用**写入延迟到下一 session** 的代价，换**前缀缓存全程命中**的经济收益。工具响应里实时返回 live state（"成功写入了 X"），模型知道自己写过什么，逻辑层面不会出错。

**核心三角权衡**：记忆架构本质上是在 **latency / cost / consistency** 之间做选择。
- 想要实时性（低 latency）→ 牺牲缓存（高 cost）
- 想要省钱（低 cost）→ 牺牲实时（高 latency）
- 想要多 agent 一致 → 通常两边都要牺牲

Hermes 选了 cost 优先，这对 CLI agent 场景是合理的。但任何要构建记忆系统的人都应该先想清楚：**谁来承担 invalidation 的成本？**

### L0: 系统提示词装配与工作上下文

**机制**：`run_agent.py` 中的 `_build_system_prompt()` 方法在 session 启动时组装系统提示词。

**组成内容**（按顺序）：
1. Agent 身份定义（`SOUL.md` 或默认身份）
2. 用户/系统消息（如提供）
3. L1 记忆块：`MEMORY.md` 和 `USER.md` 的**冻结快照**（见 L1 节）
4. 外部记忆提供者的 `system_prompt_block()` 输出
5. Skills 指导、AGENTS.md/CLAUDE.md 等上下文文件
6. 日期/时间信息
7. 平台提示（CLI / Telegram / Discord 等）

**缓存策略**：系统提示词缓存在 `_cached_system_prompt` 中，只在上下文压缩时重建——常规 turn 不变。这保留了模型提供商的**前缀缓存**（prompt caching），大幅降低延迟和成本。

**Per-turn 上下文注入**：在每次 API 调用前，外部记忆提供者的 `prefetch()` 结果作为一个 `<memory-context>...</memory-context>` 围栏块注入到当前用户消息中。
- 关键设计：只在 API 调用时注入，原始消息永不突变，不会泄漏到 session 持久化中
- 使用 `build_memory_context_block()` 封装，配合流式响应中的 `StreamingContextScrubber` 处理分界围栏

---

### L1: 持久化记忆（memory_tool）

**存储**：两个 markdown 文件在 `$HERMES_HOME/memories/`：
- `MEMORY.md`——agent 的个人笔记（环境事实、项目约定、经验教训）
- `USER.md`——用户画像（偏好、沟通风格、习惯）

**工具接口**：单一 `memory` 工具，三个操作：
- `memory(target="memory"|"user", action="add", content="...")`
- `memory(action="replace", old_text="...", content="...")`
- `memory(action="remove", old_text="...")`

**条目格式**：条目之间用 `\n§\n`（section 符号）分隔。没有 ID——replace/remove 通过唯一子串匹配定位。

**默认容量**：Memory = 2200 字符，User = 1375 字符（字符数而非 token 数，因为字符计数不受模型影响）。超限时返回错误信息，让 agent 自己决定替换哪些内容。

**Frozen Snapshot Pattern（核心设计）**：

```
Session 启动 → load_from_disk() 读取 MEMORY.md/USER.md
            → 捕获 _system_prompt_snapshot
            → 快照注入系统提示词（保留前缀缓存）

Session 运行中 → 写入更新磁盘文件（即时持久化）
               → 不修改系统提示词（保留前缀缓存）

下一个 Session → 重新读取文件 → 新快照 → 新提示词
```

这是最精妙的设计决策：**内存写入是即时持久的，但快照是冻结的**。两个状态并行存在：
- **冻结快照**（`_system_prompt_snapshot`）→ 用于系统提示词注入，session 内不变
- **活跃条目**（`self.entries`）→ 用于工具调用的返回结果，实时反映最新状态

**安全机制**（详见 `0504-hermes-memory-safety-mechanisms`）：
1. 注入扫描：13 种威胁模式正则 + 不可见 Unicode 检测
2. 文件锁定：`fcntl.flock`（Unix）/ `msvcrt`（Windows）通过独立 `.lock` 文件
3. 锁下重读：写入前在锁下重新读取磁盘状态，防止丢失更新
4. 容量强制拒绝：超限时返回完整上下文错误
5. 原子写入：临时文件 → fsync → `os.replace()`，读者始终看到一致状态
6. 子串匹配：replace/remove 用唯一子串而非全文，降低 LLM 精确度误差

---

### L1.5: 外部记忆插件架构

**MemoryProvider ABC**（`agent/memory_provider.py`）定义了完整生命周期：
- 核心：`is_available()`、`initialize()`、`system_prompt_block()`、`prefetch()`、`queue_prefetch()`、`sync_turn()`、`get_tool_schemas()`、`handle_tool_call()`、`shutdown()`
- 可选钩子：`on_turn_start()`、`on_session_end()`、`on_session_switch()`、`on_pre_compress()`、`on_delegation()`、`on_memory_write()`、`get_config_schema()`、`save_config()`

**MemoryManager**（`agent/memory_manager.py`）管理所有记忆提供者：
- 总是先注册 `BuiltinMemoryProvider`（不可移除）
- 最多允许**一个**外部提供者（第二个会被拒绝并警告）
- 通过 `tool_name → provider` 索引路由工具调用
- 元数据兼容性垫片层：自动检测 `on_memory_write()` 的参数签名（positional/keyword/legacy）
- 上下文围栏：`sanitize_context()` 剥离输出中的 `<memory-context>` 标签；`StreamingContextScrubber` 处理流式响应的分界围栏
- `build_memory_context_block()` 将 prefetch 输出封装在带系统说明的围栏块中

**已打包的插件**（`plugins/memory/`）：

| 插件 | 说明 |
|------|------|
| honcho | Honcho API 后端 |
| mem0 | Mem0 记忆后端 |
| supermemory | Supermemory API |
| retaindb | RetainDB 存储 |
| hindsight | 可插拔的 hindsight 召回 |
| holographic | 全息记忆 + 检索存储 |
| openviking | 文件记忆，自行定义 L0/L1/L2 三层 |
| byterover | 字节级记忆存储 |

**加载机制**：扫描两个位置——内置 `plugins/memory/<name>/` 和用户安装的 `$HERMES_HOME/plugins/<name>/`。内置优先。启发式检测：在 `__init__.py` 中查找 `MemoryProvider` 子类或 `register_memory_provider`。

---

### L2: 会话搜索（session_search_tool + hermes_state.py）

#### 存储基础：SQLite + 双 FTS5 虚拟表

`~/.hermes/state.db` 中的 `messages` 表，开 WAL 模式（多读单写）。所有 CLI / Telegram / Discord / cron session 的每条消息落地。

`state.db` 包含五张核心表：
- `sessions` —— session 元数据（ID、来源、模型、时间戳、token 数、成本、标题、parent_session_id）
- `messages` —— 完整对话历史（角色、内容、tool_calls、reasoning）
- `messages_fts` —— unicode61 tokenizer 的 FTS5 虚拟表
- `messages_fts_trigram` —— trigram tokenizer 的 FTS5 虚拟表
- `state_meta` —— key/value 存储

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

**CJK 检测启发式**：搜索时 ≥3 个 CJK 字符 → 走 trigram 路径；1-2 个 CJK 字符 → LIKE 回退。

#### 写入路径：零额外成本

每条消息存到 SQLite 时 trigger 自动维护 FTS 索引。不需要 embedding 推理、不需要向量库写入。磁盘 IO 就是 SQLite 一次 fsync。

#### 检索路径：十步流水线

agent 调 `session_search` 工具时的完整流程：

1. **空查询** → `_list_recent_sessions()`：纯数据库查询，零 LLM 成本，返回标题和预览

2. **关键词查询** → `db.search_messages()`：FTS5 MATCH + Snippets（摘要 + 上下文），按 BM25 ranking

3. **FTS5 查询净化**：`_sanitize_fts5_query()` 转义 FTS 特殊字符，带 `-` `.` 的术语自动加引号

4. **按 session_id 分组**，去重

5. **血缘排除**：解析 delegation 链（通过 parent_session_id 递归遍历），排除当前 session 的整个祖先/后代链

6. **取 top N**：默认 3 个 session，最多 5 个

7. **加载完整对话**：`get_messages_as_conversation()` → 格式化为可读文本

8. **智能截断**（`_truncate_around_matches`）：三种策略——全文匹配 → 术语邻近共现（200 字符窗口）→ 单个术语位置。选择覆盖最多匹配位置的窗口。匹配点前 25%、后 75%。

9. **并发 LLM 摘要**：发送截断后文本 + 结构化 prompt 给辅助模型（默认 Gemini Flash，temperature=0.1）。并发数有界（默认 3，最多 5），90s 聚合超时。

10. **回退**：如果摘要器不可用，返回原始预览片段

#### 为什么 FTS5 不是向量

这套设计最值得展开的论点：

**BM25 在单用户数据上被低估了。** 用户搜自己写过的东西时，查询词和原始消息往往共享词汇表。语义泛化在这里是负担——会把别的 session 里讨论类似话题的内容也召回进来。

**Trigram 对 CJK 是中英混杂场景的结构正确选择。** 中文没有空格，jieba 分词要么过分要么不够。Trigram 是字符级 n-gram，子串匹配免费。在中英混杂、技术术语密集、新概念频出的 Agent 场景中，trigram 比分词稳得多。

**写入零延迟**（不算 embedding）。**零运维**（SQLite 跟着主进程走，不用部署 Qdrant/Chroma）。**跨设备同步**只要复制一个 .db 文件。

#### Query-focused summary 是关键创新

大多数 RAG 系统在这一步要么返回 chunks（让主模型自己读），要么做 query-agnostic 摘要。

Query-focused summary 实际上是**带推理的软 rerank**：小模型读 100k 字符窗口，被要求"针对 query X 总结"——它在做语义匹配，而且是带推理的 rerank，不是相似度打分。

**核心收益**：
- **信息密度从 ~10% 拉到 ~80%**。无关 token 不进主模型 context。
- **吸收了一部分语义泛化的需要**。FTS5 不会把"死锁"和"ReAct loop 卡住"匹配起来，但如果"死锁"这个 query 在另一个 session 里有过字面命中，FTS5 召回那个 session，然后摘要 prompt 让 LLM 在读到 "ReAct loop 卡住"时——它知道这就是用户问的死锁，会在摘要里翻译成"用户之前用 max_iter 解决了 ReAct loop 卡死的问题"。
- 语义泛化的工作从**召回阶段**被推迟到了**摘要阶段**。

#### 非对称成本结构

| 操作 | 频率 | 单次成本 |
|------|------|---------|
| FTS5 写入 | 每条消息 | 接近零 |
| FTS5 检索 | 每次 session_search | 接近零 |
| LLM 摘要 | 每次有匹配的 session | 调用 Gemini Flash |
| 向量写入 | 每条消息 | 中（embedding 推理） |
| 向量检索 | 每次搜索 | 中（ANN 索引） |

**关键不对称性**：FTS5 召回是廉价的，因此可以用更宽的召回口径而不心疼成本。甚至可以用 OR 扩展 query 来拉宽召回——因为进入摘要阶段后，LLM 会自己过滤。如果召回是昂贵的（比如每次都要算 embedding），就必须把召回口径收窄，而这恰恰是导致漏召回的原因。

#### 工具接口

```python
session_search(
    query: str = "",       # 可选：关键词、短语、OR/AND/NOT 布尔、prefix (deploy*)
    role_filter: str = "", # 可选：逗号分隔的角色限制
    limit: int = 3        # session 数（默认 3，最多 5）
)
```

---

### 上下文压缩与 Session 分裂

当对话上下文超过模型限制的 75% 时（阈值可配置），触发压缩：

1. `context_compressor.compress()` 总结中间轮次，返回压缩后的消息列表
2. **中段保护**：保留前 3 条消息 + 后最多 6 条（按 token 预算调整）
3. **迭代式摘要更新**：每次压缩保留上次摘要，不断累积——多次压缩后信息持续存在
4. 旧 session 以 `end_reason='compression'` 结束
5. **新 session 创建**，`parent_session_id=旧 session ID`
6. 标题自动编号："My Session" → "My Session #2"（通过 `get_next_title_in_lineage()`）
7. 记忆提供者收到 `on_session_switch(reset=False, reason="compression")`
8. 上下文引擎收到 `on_session_start(boundary_reason="compression")` 用于 DAG 谱系维护

**压缩末梢追踪**：`get_compression_tip()` 方法沿链向前遍历（最多 100 跳），区分压缩延续和子 agent 委托——通过时间戳比较：子 agent 的 started_at >= parent 的 ended_at（委托的子 session 创建于 parent 结束后）。

**普通用户视角**：`list_sessions_rich()` 默认将压缩链投射到最新末梢，一次逻辑对话 = 一个列表条目。

---

### 完整记忆生命周期

```
AIAgent.__init__()
  └─ MemoryManager() 创建
      ├─ BuiltinMemoryProvider 注册（不可移除）
      └─ 外部 provider 从 config memory.provider 加载

initialize_all(session_id, platform)
  └─ 所有提供者初始化

Session 启动（_build_system_prompt）
  ├─ MemoryStore.load_from_disk() → 读取 MEMORY.md/USER.md → 冻结快照
  ├─ L1 记忆块 + 外部 provider 块注入系统提示词
  └─ 系统提示词缓存（前缀缓存生效）

每轮对话
  ├─ on_turn_start()
  ├─ prefetch_all(user_message) → 结果封装到 <memory-context> 围栏
  ├─ 注入到 API 调用（不在 messages 中持久化）
  ├─ AI 响应 + 工具调用
  │    └─ 工具调 memory() → on_memory_write() 同步到外部 provider
  ├─ sync_all(user, response) → 持久化本轮
  └─ queue_prefetch_all() → 后台预热下一次

上下文压缩（context > 75% 限制）
  ├─ compress() → 总结中间轮
  ├─ on_pre_compress() → 提取 provider 见解
  ├─ 旧 session 结束（end_reason='compression'）
  └─ 新 session 创建（parent_session_id=旧 session_id）
      └─ on_session_start(boundary_reason="compression")

Session 结束
  ├─ on_session_end(messages)
  └─ shutdown_all()
```

---

## 各层关系

| 层 | 名称 | 机制 | 范围 | 持久化 | 注入点 |
|----|------|------|------|--------|--------|
| **L0** | 系统提示词 + 上下文注入 | `_build_system_prompt()` 装配，L1 块 + 提供者块 | 当前 session | 压缩时重建 | 系统提示词；每轮 `<memory-context>` 围栏块 |
| **L1** | 持久化记忆 | `memory_tool.py`，MEMORY.md / USER.md | 跨 session | 磁盘文件，session 启动时快照 | 系统提示词（session 开始时冻结） |
| **L1.5** | 外部记忆提供者 | `MemoryProvider` 插件 via `MemoryManager` | 跨 session | 因插件而异（API、本地 DB 等） | 提供者 `system_prompt_block()` + `prefetch()` 上下文 |
| **L2** | 会话搜索 | `session_search_tool.py`，SQLite FTS5 | 跨 session（全部历史） | SQLite state.db | 按需通过工具调用 |
| **压缩** | 上下文窗口管理 | `context_compressor.py` | 当前 session 过往轮次 | 摘要作为压缩消息持久化 + session 分裂 | 替换压缩消息为紧凑摘要 |

这五层不是互斥的，而是**协同工作**：
- L0 是**常驻**上下文：agent 始终"知道"这些信息
- L1 是**有意写入**的记忆：agent 判断"这值得记住"
- L1.5 是**外部扩展**：用第三方服务扩展记忆能力
- L2 是**按需回忆**：只有需要时才搜索历史
- 压缩是**应急机制**：只在对话超长时触发，结束后通过 session 分裂维持可检索性

---

## 与其他 memory 卡片的关系

之前的 `0504-hermes-memory-safety-mechanisms` 从**安全角度**详细分析了 L1 `memory_tool.py` 的六项安全机制（注入扫描、文件锁、锁下重读、容量拒绝、原子写入、子串匹配）。

这张卡片从**架构角度**覆盖了整个记忆系统的四个层次及其交互，包括：
- L0 系统提示词装配与缓存策略
- L1 的 frozen snapshot pattern（0504 未涉及）
- L1.5 外部记忆插件架构
- L2 完整检索流水线
- 上下文压缩与 session 分裂机制
- 完整记忆生命周期
- 各层关系与设计哲学

---

## 设计权衡与已知局限

### 1. Consolidation 的脆弱性

Hermes 的 consolidation（记忆整理）方案是**最薄弱的环节**。核心问题在于它"靠模型自觉"：

- **consolidate 是低优先级动作**：agent 在执行任务时注意力在当前请求上。看到 "[85% — 1,870/2,200]" 这种 header，大概率"嗯知道了"然后继续干活。除非显式报错（容量超限），否则不会主动整理。
- **consolidate 本身是高难度任务**：真正整理需要判断哪些信息过时、哪些可以合并、哪些虽旧仍关键。agent 没有 mental space 做好这种元任务。
- **错误恢复路径重**：容量超限 → echo 全部条目 → 让模型 review → 输出 replace 操作。一轮就要几千 tokens，且模型可能为了"快速解决问题"激进删除。

这是一个 MVP 级别的方案——能 work 是因为 Hermes 目标场景下记忆增长慢（CLI agent，单用户），80% 容量本身就少见。搬到一个高频写入的场景会立刻崩溃。

### 2. 扁平命名空间的天花板

只用 MEMORY.md + USER.md 两个文件的主要局限：

- **无结构索引**：所有记忆展平到一个文件里，没有分类、没有标签、没有时效性
- **容量天花板**：超过 2200/1375 字符就只能做有损压缩。如果记忆量持续增长，这个架构没有 fallback——除非助记词本身的容量提高（受限于 system prompt 能塞下的量）
- **写路径和读路径耦合**：写入是即时持久的，但读取依赖 session 启动时的 snapshot。写入后不能在同一个 session 内生效

### 3. 与替代方案的对比

| 方案 | 核心机制 | 缓存友好度 | 扩展性 | 实现复杂度 | 适用场景 |
|------|----------|-----------|--------|-----------|---------|
| **Hermes (L1 frozen snapshot)** | 文件 → system prompt 快照，session 内冻结 | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | 单用户、慢变记忆、CLI agent |
| **Sliding window + summary** | 保留最近 N 轮，更早的压缩成 summary | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | 长对话，记忆需求集中在"最近发生了什么" |
| **Letta / MemGPT (分层)** | working/recall/archival 三层，模型主动搬运 | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | 长 horizon、单 agent、高记忆密度 |
| **向量 RAG** | 每轮按 query 检索 top-k 注入 | ⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | 可扩展几乎无限，但偏好类记忆难召回 |
| **知识图谱** | entity-relation 三元组 → 图查询 | ⭐ | ⭐⭐⭐⭐⭐ | ⭐ | 事实型精确检索，多跳推理 |
| **混合方案（生产级）** | snapshot + 向量 + KV + 关键词 多路召回 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐ | 多用户、跨 session、生产系统 |

**混合方案的 insight**：不同类型的记忆有不同的访问 pattern，应该用不同的存储
- 稳定的偏好/身份信息 → snapshot 进 system prompt（保缓存）
- 会话内的临时状态 → 留在 conversation history
- 跨会话的事实记忆 → 向量库 + 关键词索引双路召回
- 结构化属性（名字、职业） → 单独的 KV store

### 4. 可能的改进方向

基于当前架构的局限，以下改进是有意义的：

1. **后台 curator agent**：独立的记忆整理 agent，定期扫描记忆库做去重、合并、过时标记。主 agent 不背负整理负担。写入是廉价的（直接 append），整理是异步的（后台跑），读取是分层的（频繁的进 prompt，长尾的走召回）
2. **分类记忆**：把记忆分三类——identity/preferences（进 system prompt）、episodic facts（按需召回）、working state（在 conversation history 里）
3. **双轨召回**：关键词倒排索引（处理"上次我说的 X"）+ embedding（语义相似）+ 结构化 KV（确定性查询），每轮三路 + rerank
4. **主动学习**：给模型一个显式的 `remember_this()` 工具，在察觉到关键信息时主动写入，而非事后被动整理

Hermes 的记忆系统最有价值的不是某一种技术选择（FTS5 vs 向量、MEMORY.md vs SQLite），而是**整套分层架构的设计哲学**：

1. **Frozen snapshot pattern** 让持久记忆写入不影响当前 session 的延迟和成本
2. **Decoupled search and understand** 让 FTS5 和 LLM 各自做最擅长的事
3. **On-demand recall** 确保记忆检索的成本和收益精确对齐
4. **Plugin extensibility** 让记忆后端可替换而不影响核心架构
5. **Safety-first** 的所有写入路径都有保护机制

这是单用户 Agent 场景下，比"embedding 一把梭"的 vector RAG 方案更适合的实际可运行设计。

**未来可考虑的方向**：
1. L2 查询扩展（用 LLM 把用户 query 扩展成多个 FTS5 子查询）
2. Session 级别的元数据过滤（时间范围、source 过滤）
3. 摘要质量的评估和改进（当前用的 Gemini Flash 够不够好）
4. 中间层（working memory / episodic buffer）的引入

---

## 相关链接 / 来源

- Hermes Agent 源码：`tools/memory_tool.py`、`tools/session_search_tool.py`、`hermes_state.py`、`agent/memory_manager.py`、`agent/memory_provider.py`、`agent/context_compressor.py`、`plugins/memory/`
- 相关 note：0504-hermes-memory-safety-mechanisms（L1 安全机制详解）

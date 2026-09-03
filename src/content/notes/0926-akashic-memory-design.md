---
title: Akashic Agent 记忆架构：三层记忆、偏执级抽取 prompt 与因果图实验
description: 通读 akashic-agent 源码——L1 Markdown / L2 语义引擎 / L3 会话压缩三层结构、绑定 compaction 的记忆抽取、220 行「默认全空」的抽取 prompt 工程、supersede 阈值随情绪权重提高、effect 语义与强制注入通道、prompt cache 优先的注入排序，以及最独特的实验：把记忆做成从对话确定性派生的自组织因果图。
date: 2026-09-02
updatedDate: 2026-09-03
tags:
  - ai
  - agent
  - memory
  - retrieval
  - architecture
type: research
status: ready
source: https://github.com/kachofugetsu09/akashic-agent
relatedNote:
  - 0926-agentmemory-source-review
  - 0926-personamem-v3-mem0-failure-modes
draft: false
---

## 核心内容

先说定位：Akashic 不是一个编码 Agent，而是**单人长期陪伴型 AI 伙伴**——README 自述"一个会主动找你的 AI 伙伴"，三个核心卖点是被动回复、主动推送（按"电量模型"自适应轮询订阅源，由 LLM 决策"现在该不该发消息"）和 Drift 空闲任务（没东西可推时执行用户写的 SKILL.md 后台任务，比如审计长期记忆是否准确）。决策文档里有一条 `0017-one-person-companion-security-boundary`，说明它明确按"单人助手"而非多租户产品来设计——这个前提解释了记忆设计里的很多选择：没有 user_id 维度、全局单图、Asia/Shanghai 硬编码时区。

本文基于 `51bd9ab`（2026-08-12）的源码通读（`git clone --depth 1` 后直接读源码与 docs/），重点拆它的记忆模块——这个项目里最成熟、最值得借鉴的部分。主要涉及 `memory2/`、`core/memory/`、`plugins/default_memory/`、`plugins/akasha/`、`agent/retrieval/`、`session/` 等目录。

## 三层记忆结构

Akashic 的「记忆」不是一个东西，而是**三个层次叠在一起**——很多讨论把这误读成一层：

- **L1 Markdown 层**：`workspace/memory/` 下的 `MEMORY.md`（稳定用户档案）/ `SELF.md`（Agent 自我认知）/ `PENDING.md`（待归档候选），每轮作为静态 prompt block 注入；由定时归档维护
- **L2 语义记忆引擎**：SQLite + sqlite-vec 的结构化记忆条目（default 引擎），或「因果记忆图」（akasha 实验引擎）；事件驱动写入，每轮 pre-retrieval 注入 + 工具显式召回
- **L3 会话压缩层**：`sessions.db` + compaction ledger，原始消息与版本化摘要；**消息正文只追加，压缩是非破坏性投影，不 UPDATE/DELETE 既有消息**（decision 0002 明文规定）

L1 与 L2 之间由事件 `ConsolidationCommitted` 连接；L3 是 L1/L2 的触发源——压缩发生时才产出记忆候选。

两个语义引擎可切换（`config.toml` 的 `[memory].engine`），但**数据模型完全不兼容**：default 存「记忆条目」，akasha 存「turn 因果图」；default 支持 timeline/memorize/forget，akasha 全部 unsupported。切换引擎不是配置项，是数据模型迁移，且没有迁移路径。实际状态是 default_memory 是当前生产默认，akasha 是已实现但未默认启用的下一代引擎。

两个引擎都实现 `core/memory/engine.py` 里定义的 `MemoryEngine` Protocol（276 行，纯 dataclass + Protocol，零依赖）。**这个协议是整个模块设计最值得直接学的部分**：引擎自己声明能力（`MemoryCapability`）和自己要暴露的工具（`MemoryToolProfile`），runtime 不需要知道任何引擎的语义——任何要做"可插拔记忆后端"的项目都可以直接抄这个形状。

## 主链路：抽取绑定 compaction，而不是每轮

这是设计上最有信息量的决定。Akashic **不在每轮对话后立刻抽记忆**，而是把抽取绑定在"上下文压缩"这个事件上：

```
每次业务模型调用前读 session compaction ledger
        │  超过模型真实 context window 水位
        ▼
compactor 从当前有效 generation 之后选择「完整逻辑单元」，生成版本化摘要
        ▼
LLM 按页抽取 → history_entry_payloads + pending_items + conversation
        ├── append_pending_once() → PENDING.md（幂等）
        └── emit ConsolidationCommitted 事件
                │
                ▼
        DefaultMemoryEngine._on_consolidation_committed()
                ├── history_entry → event 条目（embed → 语义去重 → upsert）
                └── conversation → LLM 隐式长期记忆抽取 → profile/preference/procedure
```

所有幂等副作用成功后才提交 ledger 并推进 cursor；消息正文只追加，压缩不 UPDATE/DELETE 既有消息。

绑定 compaction 一举三得：**省 token**（不是每轮跑抽取）、**天然拿到完整逻辑单元而不是碎片**（压缩选的就是完整逻辑单元）、顺带解决了「什么时候该总结」的时机问题——不用自己发明触发策略。

## 220 行「默认全空」的抽取 prompt

`plugins/default_memory/engine.py:227` 的 `_build_long_term_prompt` 是我在开源项目里见过写得最偏执的记忆抽取 prompt，约 220 行，值得完整讲：

- **默认答案是全空**："提取门槛要高，宁可不提取"
- **核心判断标准**："把这条信息放进 6 个月后的一次全新对话，它还有用吗？"
- **四道顺序检查**（任一不过即不提取）：
  - 检查 0——元讨论/举例：ASSISTANT 为说明概念举的例子一律不得提取
  - 检查 A——**USER 原话锚点**：必须在 USER 消息里找到逐字存在的直接原句，ASSISTANT 的解释/建议/工具返回数据都不算
  - 检查 B——时效性：涉及"本次/今天/这个项目"的一律不提
  - 检查 C——来源方向："USER 没有反驳 ≠ USER 授权 Agent 长期执行这条规则"
- **反例驱动**：11 个带 id 的反例，专门堵已知失败模式。比如"你还记得我什么时候开始戴 fitbit 的吗"→ 提问不是事实披露，绝对不反推；Agent 自己建议"每 45 分钟起来活动"→ 不能变成用户偏好
- **summary 写法约束**："语气不得强于 USER 原话"（"不太喜欢" ≠ "强烈反感且要求永久避免"）、必须脱离对话独立成立、profile 每条只表达一条事实绝不合并
- 每条附带 `emotional_weight`（0-10），不确定时保守输出 0

这些规则显然是被真实误记忆事故反向逼出来的——那 11 个反例恰恰说明失败发生过。**如果只从这个项目抄一样东西，抄这个 prompt。** 它同时堵住了 PersonaMem-v3 指出的两大记忆失败模式：把推断当事实写入（信息不该存的存进去了）和过期偏好（当时对、现在错的依据）。

## 四种记忆类型与写入侧

### 类型 taxonomy

贯穿全模块的核心分类（`memory_items` 表，store.py 2067 行）：

- `profile`——用户客观事实（category：personal_fact / purchase / decision / status）
- `preference`——用户希望被怎样服务（方向性偏好）
- `procedure`——Agent 未来必须遵守的执行规则（可带 `tool_requirement` / `steps` / `rule_schema`）
- `event`——有时间性的具体事件（**只由 consolidation 产出，禁止 LLM 隐式抽取**）

删除是软删除：`status='superseded'`，从不物理删除。`memory_replacements` 记录新旧替换关系，dashboard 的 undo 能沿着这条链把被顶替的旧条目恢复回 active。

### supersede：阈值随情绪权重提高

`memorizer.py` 的 `save_item_with_supersede`：

- `procedure` / `preference`：向量检索 top-5，相似度 ≥ 0.90 的旧条目标 superseded；`procedure` 额外尝试 **merge**——相似度 ≥ 0.70 且 `tool_requirement` 相同则合并 summary 与 steps
- `profile`：只对 `status` / `purchase` 类做同 category 退休，且 **`emotional_weight ≥ 7` 的旧条目阈值提到 0.92——情绪重的记忆更难被顶掉**
- `event`：与最近 7 天事件相似度 ≥ 0.92 不新建，改为 reinforce 已有条目
- 幂等三重保险：`content_hash` 唯一索引 + `source_ref` 主键 + `commit digest`

「情绪权重影响 supersede 阈值」这个细节很见功力：用户带着强烈情绪说的偏好，确实不该被一条后来的中性陈述轻易顶掉。

### 回复后的失效检测

`post_response_worker.py` 订阅 `TurnIngested`，跑在主回复链路之外（入队不等待）。它**不做隐式抽取**（那是 consolidation 的活），只处理一件事：用户明确说"你这个做法错了/以后别这样"时，把对应的旧 procedure/preference 退休。

三步：轻量模型抽取"被否定的行为主题" → 向量召回相关 procedure/preference（阈值 0.82，排除本轮刚写入的 protected_ids）→ 轻量模型判断哪些真的该 supersede。有 **token 预算**（每轮 1000 tokens，超预算直接跳过）；返回未知 ID 会 fail-loud 抛错；prompt 里明确列了"绝对不触发"的情况（疑问句、含"也许/可能"、用户在询问流程）。

### Markdown 层的崩溃恢复做到偏执级

`agent/memory.py` 的写入设计：

- `append_pending_once()` 在文件里写 HTML 注释 marker，SQLite 里写索引，两边**双向崩溃恢复**——索引有文件没有 → 从 payload 补写；文件有索引没有 → 尾部 1MB 扫描补索引
- PENDING → MEMORY 归档用**两阶段提交**：`snapshot_pending()` 用 POSIX rename 原子移走文件（此后新增量写进全新的 PENDING.md，完全隔离），成功删快照，失败把快照按"旧在前新在后"合并回去；启动时自动检测遗留 snapshot 做崩溃回滚

## 检索与注入

### 每轮无条件自动召回

`agent/core/passive_turn.py:904` 在每轮 turn 开始时把「用户当前消息 + session history + metadata」打包成 `MemoryQuery(intent="context", effect="stateful")`，engine 返回的 `text_block` 直接进 ContextBundle。**这是自动的，不需要模型决定要不要回忆。** 只有系统轮次显式带 `skip_memory_retrieval` 元数据时才跳过。

### 检索管线（default 引擎）

**Lane 1—向量**：query 与 HyDE 假设 query 并行 embed（每条独立 8s 超时，单条失败只降级该 lane）。打分不是纯余弦：

```
final = (1 - hotness_alpha) * cosine + hotness_alpha * hotness   # hotness_alpha = 0.20
hotness = f(reinforcement, 距 updated_at 的指数半衰 14 天, emotional_weight)
```

**Lane 2—关键词**：注意这里**不是 BM25**——是 `summary LIKE '%term%'` 的 OR 查询 + 命中词数打分，无 IDF 无词频。分词是手写的：ASCII token 正则 + CJK bigram 切分（>4 字的中文 chunk 切成相邻二元组），带 40 词中文停用词表。融合用标准 RRF（k=60，关键词 lane 权重 0.5）。

HyDE（假设文档检索）也有：并行生成两个假设记忆条目（event 风格带具体时间戳、general 风格第三人称），80 tokens / 3s 超时，失败静默降级。

### effect 语义：检索本身会改变记忆状态

这是最容易被忽视的好设计。检索不是只读的——它会触发 reinforcement、会留 akasha 的 RetrievalTicket——所以协议层区分 `stateful | read_only`：

- runtime 每轮的自动预检索是 `stateful`（算一次学习信号）
- `recall_memory` 工具是 `read_only`——**不会污染下一次学习**

akasha 侧实现得很硬：query 要拿 commit_gate、等前一次图发布完成，`intent=context && effect=stateful` 的查询留一张 RetrievalTicket 绑到当前 session，只有对应的 `TurnCommitted` 能消费它并据此学习。这个问题（一次只读工具调用污染学习状态）很少有项目意识到。

### 强制注入通道

`build_injection_block` 分三段，各有独立配额：

1. `## 【强制约束】记忆规则（必须执行）`——带 `tool_requirement` 的 procedure，**绕过分数阈值强制注入**（最多 3 条），且不受字符预算裁剪
2. `## 【流程规范】用户偏好与规则`——procedure/preference（最多 4 条）
3. `## 【相关历史】`——event/profile（最多 4 条）

第 1 段承认了一件很多检索方案不承认的事：**「用户要求你必须用某工具」这类记忆的价值不该由余弦相似度决定**。规则就是规则，不该在分数竞争中跟"用户养了只猫"竞争同一个 6000 字符预算。

### 置信度传给模型

每条记忆带元信息：`（有印象，不确定；发生于: 2026-03-08 14:20；距今约 12 天；证据: 可回源原文；src: telegram:xxx:yyy）`。分数只比类型阈值高一点点（< 阈值 + 0.15）时打上"有印象，不确定"标签——**把检索置信度显式传给模型，而不是让模型对所有召回一视同仁**。0.51 分和 0.95 分的召回混在一起呈现，模型会当成同样可信。

event 段的段头 prompt 也在治两种具体的病：`时间戳可信，可直接引用，不得自行否定；数字/金额/地名等具体值以记录为准，不得用常识替换`——分别治"模型不信自己的记忆"和"模型用常识覆盖记录"。

### 五种 intent

`core/memory/engine.py` 定义了统一的查询意图，所有引擎共享同一套语义：

- `context`——runtime 内部每轮自动预检索，产出注入 prompt 的 text_block
- `answer`——`recall_memory` 工具的主题检索，走 HyDE + 更低阈值（0.35）+ top_k 15
- `timeline`——按时间范围列事件（纯 SQL，不走向量）
- `interest`——只查 preference/profile，供主动推送判断"用户会不会感兴趣"
- `procedure`——只查 procedure/preference，用专门的 query builder 扩展 query

### Prompt 组装按变化频率排序

`prompt_block.py:45` 的优先级表按"变化频率从低到高"排列，显然是为 **prompt cache 命中率**优化：

```
 5  人格真源（VEDA.md，用户维护）
10  身份（workspace 路径 + 文件索引）      [最稳定]
15  固定行为规范
20  技能目录
30  自我模型（SELF.md）                   [低频]
35  长期档案（MEMORY.md）                 [低频]
40  会话环境
45  本轮命中的 skill
50  本轮检索结果（retrieved_memory_block） [最高频，每轮都变]
```

所以每轮系统提示里同时有 L1 的 MEMORY.md/SELF.md 全文和 L2 的本轮语义检索结果——两层各干各的活。

### 定时归档

`MemoryOptimizerLoop` 默认**每 18 小时**一次：LLM 把 PENDING 合并进 MEMORY.md（输出校验失败回滚 snapshot，成功先备份再写），15 秒后用同一批 pending 更新 SELF.md（校验三个必需 section 不能为空）。也可从 dashboard 手动触发。

### 完整数据流总览

把前面所有机制串起来，一轮对话的记忆数据流长这样：

```
用户消息
  ├─(1) 每轮自动 pre-retrieval → engine.query(intent=context) → 注入 prompt block(优先级50)
  │                                      │
  │                                      └─(akasha) 留下 RetrievalTicket
  ├─(2) prompt 里带 MEMORY.md / SELF.md 全文(优先级 30/35)
  ├─(3) 模型可选调用 recall_memory / memorize / forget
  ▼
回复 → TurnCommitted
  ├─→ TurnIngested → PostResponseMemoryWorker（失效检测，异步、有 token 预算）
  └─→ (akasha) MemoryCycle.commit 消费 ticket，图学习

上下文超水位 → compaction → ConsolidationCommitted
  ├─→ PENDING.md 追加（幂等）
  └─→ DefaultMemoryEngine 写 event + 隐式抽取 profile/preference/procedure

每 18h → MemoryOptimizer：PENDING → MEMORY.md，更新 SELF.md
```

失败模式也有明确处理：embedding 服务故障时向量 lane 降级为 JSON TEXT 存储 + numpy 全表扫描（单人场景万级条目完全可接受）；严格 TOML（未知字段直接 raise）；`skip_post_memory` 必须是严格 JSON boolean，字符串 `"false"` 会 fail-loud——很少见到记忆系统愿意在这些地方崩而不是静默降级。

## 最独特的实验：记忆作为派生的因果图（akasha 引擎）

如果只能指出一个"别处见不到"的设计：**akasha 把记忆做成了从对话历史确定性派生的、自组织的因果图，而不是一个被写入的数据库**。

它的存储哲学：**不保存自己的一份"记忆条目"**。唯一事实源是 `sessions.db`（messages + message_embeddings，冻结的重建输入）；两个 sidecar（因果稀疏索引 + 记忆图状态）都是纯派生物，任何时候可以**从 sessions.db 确定性重放重建**——在线逐轮增长与全量 replay 保证得到相同逻辑状态。上游是独立仓库，通过 UPSTREAM.json 固定 commit + tree + sha256，CI gate 校验字节一致。

在这个模型里：

- 没有"记忆条目"概念——图是纯派生物
- remember/forget 不是增删记录，而是给图的可塑性更新加偏置（`remember_boost ∈ [1.0, 3.0]`），参数只接受 fetch_messages 返回的 Message ID，工具描述里反复强调"没有第三种 correct 动作"——纠正 = forget 旧消息 + remember 新消息
- 检索不是查找匹配项，而是从 query 出发在图上跑带重启的稀疏个性化 PageRank（Residual Push，带稳定 tie-break 和显式 L1 误差界），落到若干 basin（engram）上做模式补全
- 完全不做 LLM 抽取——每个 turn 变成图节点，检索结果做突触可塑性更新（potentiation / inhibition / hub 形成 / 遗忘），参数是神经科学味的：restart=0.25、learning_rate=0.5、activation_power=2.0……

换来两个实在的性质：**记忆永远和对话事实一致**（不会出现"库里有但对话里没有"的幻觉记忆），以及**记忆状态可完整重放和审计**（在线增量与全量 replay 保证同一逻辑状态，"记忆图坏了怎么办"有确定答案：重建）。

代价是丧失直接写入记忆的能力——`ingest()` 和 `mutate()` **直接返回 unsupported**，拒绝任何绕过 TurnCommitted 的写入。作者显然认为这个约束是特性而不是缺陷。工程现实：约 6000 行数值代码、7 个自由度的参数，调试门槛远高于"把相似度阈值调高一点"。

## 已知短板

- **default 引擎的关键词 lane 太弱**：`LIKE` + 命中数打分，无 IDF 无词频无长度归一，与真 BM25 差距明显，RRF 里权重 0.5 实际贡献有限。akasha 引擎里有真 BM25 但只用于图 seed，不作为独立召回 lane
- **中文 prompt、停用词、时区全部硬编码**——单人项目的合理选择，但限制复用面；要换语言得改代码，不是改配置
- **MEMORY.md 与 profile/preference 条目内容高度重叠**，两层职责没有去重机制——历史演进的产物（Markdown 层在先），目前两边都做，有一定冗余
- **LLM 抽取再偏执也是概率性的**——每次 consolidation 跑 600-token 主模型抽取，post-response 每轮最多 2 次轻量模型调用；prompt 写得再好，失败模式还是存在
- **语义层不能 git diff、不能手改**，可审计性弱于 Markdown；Recall Inspector 只能看召回了什么，不能看库长什么样
- **两个引擎切换是数据模型迁移**，没有迁移路径；且 decision 0006 说 akasha 是唯一实现、wiring 默认却是 default——文档与代码的张力会让人踩坑

## 与 agentmemory 的横向对比

两者思路完全不同，一张表说清关键差异：

| 维度 | agentmemory | Akashic |
|---|---|---|
| 形态 | 独立本地 server，hooks 挂进任意 Agent | 内嵌宿主进程，engine 是宿主插件 |
| 复用性 | 天然跨 Agent / 跨项目 | 强绑定自己的 session/事件/prompt 体系 |
| BM25 | 有（真 BM25） | default 引擎没有（LIKE + bigram） |
| 写入策略 | hook 触发的显式/半自动抽取 | 绑定 compaction，抽取门槛极高 |
| 遗忘 | 简单 TTL | supersede + hotness 衰减 + 突触遗忘 |
| 多 Agent | 天然支持 | 单人单 Agent（明确的边界决策） |

一句话：agentmemory 是**通用记忆基础设施**（谁都能接，检索能力齐全）；Akashic 的记忆是**一个特定陪伴型 Agent 的记忆器官**（和它的 compaction、prompt block、proactive 长在一起，拆不干净，但对它自己的场景调得非常细）。

一个更划算的组合思路（报告里的判断，我认同）：**规则/偏好走 Markdown（人可编辑、每轮全量注入、可 git diff），事件/历史走向量库（按需召回）**。Akashic 目前两边都做，procedure/preference 放语义库里其实牺牲了可审计性——这两类稳定、量小、值得人看，本来就该在 Markdown 层。

如果已经在用别的记忆方案，Akashic 这里值得偷的是：那个 220 行的抽取 prompt 和四道检查；`procedure` 带 `tool_requirement` 时绕过阈值强制注入；召回分数低时打"有印象，不确定"标签；supersede 而非删除 + replacement 链 + undo；`intent` / `effect` 二元查询协议。

## 可复用性

- `memory2/` 的六个核心文件（store / embedder / memorizer / retriever / rule_schema / query_builder，约 3300 行）拿出来做独立记忆库是现实的，一天工作量——但真正的价值不在代码，在**四类记忆的 taxonomy、supersede/merge 规则、注入分段与置信度标注、以及那个抽取 prompt**
- `plugins/akasha/` 算法层高度可复用且质量很高（确定性、可重放、有 L1 误差界、有 append-only 违规检测），但输入契约是 Akashic 自己的 sessions.db schema，换宿主要重写 1364 行的稀疏索引 builder
- `core/memory/engine.py` 协议（276 行，零依赖）任何做"可插拔记忆后端"的项目都可以直接抄

## 当前理解 / 结论

- 「抽取绑定 compaction」+「默认全空的偏执 prompt」+「supersede 阈值随情绪权重提高」，这三个决定组合起来是截至目前看到的最完整写入侧方案——PersonaMem-v3 揭示的「信息缺失」和「过期偏好」两个失败模式，在这里都有对应机制
- effect 语义和强制注入通道是两个容易被忽视但极实用的协议层设计：前者解决「检索污染学习」，后者解决「规则的价值不该由相似度决定」
- 「有印象，不确定」的置信度标注是低成本高收益的一招：把检索分数翻译成模型能理解的措辞，比让模型自己猜召回可信度靠谱得多
- akasha 的派生图路线代表了记忆的另一种哲学：不存状态，存「从事实确定性派生的结构」——短期不实用（6000 行数值代码、7 个自由度参数），但「记忆永远与对话事实一致 + 可完整重放」这两个性质长期值得关注
- 单人场景的工程选择（硬编码时区、中文 prompt、无多租户）再次说明：记忆系统没有通用解，都是为特定场景的长处付费、为特定场景的约束让路

## 相关链接 / 来源

- 仓库：[kachofugetsu09/akashic-agent](https://github.com/kachofugetsu09/akashic-agent)（MIT，Python 3.12，commit 51bd9ab 调研）
- 完整调研报告（542 行）留存于本地调研库，本文所有文件路径与行号均可在该版本核对
- 同主题卡片：agentmemory 源码解读、PersonaMem-v3 里的 Mem0 失败模式

---
title: Akashic Agent 记忆架构：三层记忆、偏执级抽取 prompt 与因果图实验
description: 通读 akashic-agent 源码——L1 Markdown / L2 语义引擎 / L3 会话压缩三层结构、绑定 compaction 的记忆抽取、220 行「默认全空」的抽取 prompt 工程、supersede 与失效检测、强制注入通道、effect 语义，以及最独特的实验：把记忆做成从对话确定性派生的自组织因果图。
date: 2026-09-02
updatedDate: 2026-09-02
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

Akashic 不是一个编码 Agent，而是**单人长期陪伴型 AI 伙伴**（被动回复 + 主动推送 + 空闲后台任务）。单人助手的定位解释了它记忆设计里的很多选择：没有 user_id 维度、全局单图、时区硬编码。本文基于 `51bd9ab`（2026-08-12）的源码通读，重点拆它的记忆模块——这个项目里最成熟、最值得借鉴的部分。

## 三层记忆结构

Akashic 的「记忆」是三个层次叠在一起，很多讨论把这误读成一层：

- **L1 Markdown 层**：`MEMORY.md`（稳定用户档案）/ `SELF.md`（Agent 自我认知）/ `PENDING.md`（待归档候选），每轮作为静态 prompt block 注入；由定时归档维护
- **L2 语义记忆引擎**：SQLite + sqlite-vec 的结构化记忆条目（默认引擎），或「因果记忆图」（akasha 实验引擎）；事件驱动写入，每轮 pre-retrieval 注入 + 工具显式召回
- **L3 会话压缩层**：`sessions.db` + compaction ledger，原始消息与版本化摘要；**消息正文只追加，压缩是非破坏性投影，不 UPDATE/DELETE 既有消息**

两层引擎可切换但数据模型完全不兼容：default 存「记忆条目」，akasha 存「turn 因果图」——切换是数据迁移，不是配置项。

## 主链路：抽取绑定 compaction，而不是每轮

记忆抽取发生在上下文压缩时（`compaction → consolidation → 语义记忆`），不是每轮对话后：

1. session 超过模型真实 context window 水位 → compactor 选「完整逻辑单元」生成版本化摘要
2. LLM 按页抽取 → 写入 PENDING.md（幂等 append）→ 发 `ConsolidationCommitted` 事件
3. 记忆引擎消费事件：history 条目 embed → 语义去重 → upsert；conversation 走 LLM 隐式抽取 → 产出 profile/preference/procedure

绑定 compaction 一举三得：省 token、天然拿到完整逻辑单元而不是碎片、顺带解决了「什么时候该总结」的时机问题。

## 220 行「默认全空」的抽取 prompt

`_build_long_term_prompt` 是开源项目里见过最偏执的记忆抽取 prompt，值得单独讲：

- **默认答案是全空**：「提取门槛要高，宁可不提取」
- **核心判断标准**：「把这条信息放进 6 个月后的一次全新对话，它还有用吗？」
- **四道顺序检查**（任一不过即不提取）：元讨论/举例不得提取；**必须在 USER 消息里找到逐字存在的原句**（ASSISTANT 的解释、建议、工具返回都不算）；涉及「本次/今天/这个项目」的一律不提；「USER 没有反驳 ≠ USER 授权 Agent 长期执行这条规则」
- **11 个带 id 的反例**，专门堵真实失败模式：提问不是事实披露（「你还记得我什么时候开始戴 fitbit 的吗」绝不反推）、Agent 自己的建议不能变成用户偏好
- **summary 语气不得强于 USER 原话**（「不太喜欢」≠「强烈反感且要求永久避免」）、profile 每条只表达一条事实绝不合并、每条带 emotional_weight（0-10，不确定输出 0）

这些规则显然是被真实误记忆事故反向逼出来的。**如果只从这个项目抄一样东西，抄这个 prompt。**

## 写入侧：supersede、失效检测与幂等

- **写新记忆时主动取代旧的**（`save_item_with_supersede`）：向量检索 top-5，相似度 ≥ 0.90 标记旧条目 superseded；procedure 相似度 ≥ 0.70 且工具要求相同则合并；**emotional_weight ≥ 7 的旧条目阈值提到 0.92——情绪重的记忆更难被顶掉**；event 与最近 7 天相似度 ≥ 0.92 不新建、改为 reinforce 已有条目
- **回复后的失效检测**（PostResponseWorker）：用户说「这个做法错了/以后别这样」时，抽取被否定的行为主题 → 召回相关 procedure/preference → 判断该 supersede 哪些。跑在主回复链路外、有 1000 token 预算、prompt 列明「绝对不触发」的情况（疑问句、含「也许/可能」）
- **幂等三重保险**：content_hash 唯一索引 + source_ref 主键 + commit digest；崩溃恢复做到 PENDING 两阶段提交 + 文件/SQLite 双向补偿

## 检索与注入

- **每轮无条件自动召回**：把用户消息 + session history 打包成 `MemoryQuery(intent="context")`，结果注入 prompt——**是自动的，不靠模型决定要不要回忆**
- **effect 语义**（最容易被忽视的好设计）：检索本身会改变记忆状态（reinforcement），所以协议层区分 `stateful | read_only`——`recall_memory` 工具是 read_only，不会污染下一次学习
- **强制注入通道**：带 `tool_requirement` 的 procedure 不参与分数竞争、不受字符预算裁剪，直接进「必须执行」区块。这承认了一件事：**「用户要求你必须用某工具」这类记忆的价值不该由余弦相似度决定**
- **置信度传给模型**：分数刚过阈值标「有印象，不确定」，不把 0.51 和 0.95 的召回混在一起
- **prompt 组装按变化频率排优先级**（人格真源 → 身份 → 行为规范 → 技能目录 → 自我模型 → 长期档案 → 会话上下文 → 本轮检索结果），显然是为 prompt cache 命中率优化的
- **定时归档**每 18 小时：PENDING 合并进 MEMORY.md（输出校验失败回滚、成功先备份再写）

## 最独特的实验：记忆作为派生的因果图（akasha 引擎）

如果只指出一个「别处见不到」的设计：**akasha 把记忆做成从对话历史确定性派生的、自组织的因果图，而不是一个被写入的数据库**。

- 没有记忆条目概念——sessions.db 是唯一事实，图是纯派生物，任何时候可从头重建
- remember/forget 不是增删记录，而是给图的可塑性更新加偏置（boost ∈ [1.0, 3.0]）
- 检索不是查找匹配项，而是从 query 出发在图上跑带重启的扩散，落到若干 basin（engram）上做模式补全

换来两个实在的性质：**记忆永远和对话事实一致**（不会出现「库里有但对话里没有」的幻觉记忆），以及**记忆状态可完整重放和审计**。代价是丧失直接写入记忆的能力（ingest/mutate 直接 unsupported）——作者显然认为这个约束是特性。工程现实：约 6000 行数值代码、7 个自由度的参数，调试门槛远高于「把相似度阈值调高一点」。

## 已知短板

- default 引擎的关键词 lane 太弱（LIKE + 命中数打分，无 IDF 无词频），与真 BM25 差距明显
- 中文 prompt、停用词、时区全部硬编码——单人项目的合理选择，但限制复用面
- MEMORY.md 与 profile/preference 条目内容高度重叠，两层职责没有去重机制
- LLM 抽取再偏执也是概率性的——那 11 个反例恰恰说明失败发生过
- 语义层不能 git diff、不能手改，可审计性弱于 Markdown（试图用 Recall Inspector 补，但那只能看召回不能看库）

## 当前理解 / 结论

- 「抽取绑定 compaction」+「默认全空的偏执 prompt」+「supersede 阈值随情绪权重提高」，这三个决定组合起来是截至目前看到的最完整写入侧方案——PersonaMem-v3 揭示的「信息缺失」和「过期偏好」两个失败模式，在这里都有对应机制
- effect 语义和强制注入通道是两个容易被忽视但极实用的协议层设计：前者解决「检索污染学习」，后者解决「规则的价值不该由相似度决定」
- akasha 的派生图路线代表了记忆的另一种哲学：不存状态，存「从事实确定性派生的结构」——短期不实用，长期值得关注

## 相关链接 / 来源

- 仓库：[kachofugetsu09/akashic-agent](https://github.com/kachofugetsu09/akashic-agent)（MIT，commit 51bd9ab 调研）
- 完整调研报告（542 行）留存于本地调研库
- 同主题卡片：agentmemory 源码解读、PersonaMem-v3 里的 Mem0

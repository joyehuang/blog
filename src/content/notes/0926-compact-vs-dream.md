---
title: Compact 与 Dream：agent 上下文管理的两个不同层次
description: pi compact 机制的源码级拆解（20k 保留边界、结构化总结、增量压缩、split turn）与 Claude 的 Dream 记忆巩固机制（AutoDream 后台整理 / Platform Dreams 异步 job）对照——压缩管「腾窗口」，巩固管「记什么」，两者是互补层不是竞争方案。
date: 2026-09-02
updatedDate: 2026-09-02
tags:
  - ai
  - agent
  - memory
  - llm
type: reference
status: ready
source: https://github.com/earendil-works/pi
relatedNote:
  - 0926-akashic-memory-design
  - 0926-personamem-v3-mem0-failure-modes
draft: false
---

## 核心内容

「compact 和 dream 有什么区别？」——这两个概念经常被混为一谈，但它们管理的是**完全不同的东西**：compact 管「上下文窗口装不下了怎么办」，dream 管「长期记忆该记什么、怎么巩固」。这张卡把两者都拆到源码级。

## pi 的 compact 机制

**触发**：上下文超阈值（`contextTokens > contextWindow - 16k reserve`）或手动 `/compact [指令]`。

**流程（本质是摘要替换，不是删除）**：

- 从最新消息往回保留最近 **20k tokens**（`keepRecentTokens`）
- 更早的消息序列化后发给 LLM，生成**结构化总结**——Goal / 进度 / 关键决策 / 下一步 / 关键上下文，还追踪 read/modified 的文件
- 存一个 `CompactionEntry`（含 summary + firstKeptEntryId），session 重载后模型只看到 `system + summary + 保留的消息`
- **下次 compact 从上次的保留边界继续总结**，不会重复丢信息
- 单轮超预算时支持 split turn：切一半分别总结再合并
- 配套 branch summarization：`/tree` 切分支时总结离开的分支注入新分支
- 扩展可拦截 `session_before_compact` 自定义总结模型/格式

一句话：**compact = 内存不够时清缓存**——服务于当前会话的连续性。

## Claude 的 Dream 机制

概念来自人脑睡眠记忆巩固，Claude 有两代官方实现：

- **Claude Code AutoDream**：空闲时后台自动跑，对 memory 文件做整合——**去重、删矛盾条目、清理过期信息**（相对日期失效等）。运行期间只读项目代码、只能写 memory 目录、有 lock 防并发
- **Claude Platform Dreams**（research preview）：异步 job，输入 = 现有 memory store + 1~100 个历史 session transcripts → 挖模式、提新洞察 → **产出一份新的 memory store**。输入不被修改，可以审查输出再决定用不用——这个「输出可审查」的设计让巩固过程安全可控

一句话：**dream = 跨会话定期整理长期记忆**，像睡眠一样把碎片巩固成干净持久的形式。

## 对照

- **触发**：compact 是上下文爆了/手动；dream 是空闲后台/定时
- **处理对象**：compact 是当前会话的老消息；dream 是跨会话的 memory 存储
- **目的**：compact 腾出上下文窗口；dream 长期记忆去重/纠错/巩固

## 我们的对照

我们自己的记忆体系（memory.md 增量追加 + mem0 语义库 + recaps 索引）长期缺的正是 dream 这一层——**只有写入和召回，没有定期整理**：mem0 里重复、矛盾、过期的条目会随时间累积（PersonaMem-v3 揭示的「过期偏好」问题有一部分正是缺整理导致的）。

借鉴点：dream 机制的三个设计约束（只读源、只写目标目录、输出可审查后再替换）是「给记忆动手术」的安全边界——自动整理记忆这件事危险在「改错」，这三个约束把改错的代价降到可回滚。Later：mem0 侧的 supersede/时间衰减解决的是单条记忆的生命周期，dream 解决的是全库的卫生——两层都需要。

## 当前理解 / 结论

- compact 是「会话内的问题」，dream 是「会话间的问题」——同一个 agent 记忆栈里它们是上下相邻的两层，不构成方案竞争
- dream 式整理的安全设计（只读源 + 输出可审查 + 可回滚）适用于一切「批量修改长期状态」的场景：记忆、skills、配置全一样
- 上下文窗口越大，compact 的戏份越少，dream 的戏份越多——1M 窗口时代，真正的瓶颈从「装不装得下」转移到「该记住什么」

## 相关链接 / 来源

- pi compact：pi 源码（session/compaction），扩展接口 `session_before_compact`
- Claude Dream：Claude Code AutoDream 文档、Claude Platform Dreams（research preview）公告

---
title: MetaMemory 源码调研：带 ACL 的自托管文档库，不是自动记忆
description: xvirorotics/metabot 的 MetaMemory 模块源码调研——定位纠偏（不是「自动从对话抽取知识」，是带 ACL 的 SQLite+FTS5 共享知识库）、两套彼此独立的记忆（外包给 Claude 的 auto-memory + 主动式 MetaMemory）、文档与代码不一致的发现（自动同步不存在）。
date: 2026-09-02
updatedDate: 2026-09-02
tags:
  - ai
  - agent
  - memory
  - multi-agent
  - sqlite
type: research
status: ready
source: https://github.com/xvirobotics/metabot
relatedNote:
  - 0926-agentmemory-source-review
  - 0926-akashic-memory-design
draft: false
---

## 核心内容

metabot（xvirobotics）的 MetaMemory 模块源码调研（commit 6be8030，2026-08-12）。结论一句话纠偏：**MetaMemory 不是「自动从对话里抽取知识」的记忆系统，而是一个带 ACL 的、Agent 主动读写的自托管文档库（SQLite + FTS5 + HTTP API + CLI）**。它解决「多 Agent / 多渠道共享同一份长期知识」，不解决「记忆自动沉淀」。

## 定位的关键发现：两套彼此独立的记忆

metabot 实际有两套记忆，职责完全不同：

- **MetaMemory**：Core 服务的 `/api/memory/*`，SQLite `central.db`，由 Agent 主动调 `metabot memory create` 写入——跨会话、跨 Agent、跨渠道
- **Claude Code 原生 auto-memory**：executor 里**主动默认开启**（环境变量缺省即启用），Claude 自己往 `~/.claude/projects/<projDir>/memory/` 的 markdown 写 project patterns/preferences/decisions——单机、单 project 目录

也就是说：**「自动记忆」这件事 metabot 自己没做，是外包给 Claude Code 的原生机制；MetaMemory 本身是纯手动/Agent 主动的**。评估「值不值得抄」时这是最关键的事实——它和 agentmemory（hooks 自动抓取）走的是完全相反的路线。

## 架构

- **存储**：单个 SQLite 文件（better-sqlite3 同步 API、WAL、外键约束），Memory 和 Skills/Agents/Inbox/Chat 共用一个 db；依赖极轻——Core 的运行时依赖只有 better-sqlite3 + pino，**没有向量库、没有 embedding、没有外部服务**
- **数据模型**：folders + documents 两张主表 + FTS5 虚表；content_type 只允许 text/markdown | text/html；tags 为 JSON 数组字符串
- **知识如何提取——答案：不提取**。没有压缩、没有归纳、没有 embedding，就是原文进原文出，靠 FTS5 关键词检索
- **权限模型比想象中认真**：带 ACL（哪些 agent 能读/写哪些 folder），这是「多 agent 共享一份知识」场景下防串扰的必要设计
- **检索**：FTS5 全文 + 元数据过滤，无语义层

## 一个值得记录的坑：文档与代码不一致

文档宣称的飞书知识库「自动同步」，**在代码里实际上不存在**（同步是手动触发的，没有自动化路径）。教训：评估开源项目的记忆能力时，README 的能力声明必须逐条对应到代码调用路径——「自动」这个词尤其要查触发器。

## 对比其他方案的位置

- **对比纯 markdown 记忆文件**：MetaMemory 赢在跨 agent 共享 + ACL 权限 + 结构化检索；输在不能直接 `cat`/手改/进 git
- **对比 agentmemory**：agentmemory 是「自动抓取 + 自动淘汰」的重架构（外部引擎 + 12 hooks），MetaMemory 是「主动写入 + 极简依赖」的轻架构——两者代表记忆共享光谱的两端
- **对比我们的栈**：我们的 memory.md（人可读真相源）+ mem0（语义库）组合在「个人 agent」场景下更合适；MetaMemory 的价值点在**多 agent 团队共享一份带权限的知识库**——如果未来做多 agent 协作（cumora 方向），ACL + 共享库这层是现成参考

## 当前理解 / 结论

- 记忆系统选型的第一个问题不是「用什么算法」，是「**谁写入、谁读取、范围多大**」——单人单 agent（markdown 够）、个人多工具（语义库）、多 agent 团队（共享库 + ACL）是三个不同的问题
- 「外包自动记忆给底层模型 + 自己只做共享层」是个聪明的减法：Claude Code 的 auto-memory 已经把单 agent 场景做得够好，重复造没意义
- 极简依赖（SQLite + FTS5，零外部服务）的自托管路线在单人/小团队场景下是对 agentmemory 这类重架构的有力反驳

## 相关链接 / 来源

- [xvirobotics/metabot](https://github.com/xvirobotics/metabot)（commit 6be8030 调研，完整报告 380 行留存本地调研库）
- 同主题卡片：agentmemory 源码解读、Akashic 记忆架构

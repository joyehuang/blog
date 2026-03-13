---
title: LLM 上下文窗口管理策略
date: 2026-02-20
tags: ['llm', 'agent', 'ai']
type: 'research'
status: 'incomplete'
draft: false
---

## 问题

在 Agent 开发中，长对话会导致上下文窗口溢出。

## 常见解决方案

### 1. FIFO (First In First Out)
简单但会丢失重要信息

### 2. 记忆分层
- Working Memory: 当前对话
- Short-term: 近期摘要
- Long-term: 持久化知识库

### 3. 摘要压缩
使用 LLM 对历史对话进行摘要

### 4. 语义检索
将历史存入向量数据库，按需检索

## 待深入

- Token Budget 管控实现
- Prompt Cache 最佳实践
- 混合策略设计

## 来源

面试复盘笔记

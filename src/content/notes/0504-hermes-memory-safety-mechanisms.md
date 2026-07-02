---
title: Hermes Agent memory 系统的工程安全机制
description: 解析 Hermes memory_tool.py 中六项关键安全设计：注入扫描、文件锁、reload-under-lock、超容拒绝写、原子写入、子串匹配删除。
date: 2026-05-04
updatedDate: 2026-05-04
tags:
  - ai
  - agent
  - security
  - software engineering
  - concurrency
type: research
status: incomplete
# source removed — synthesized knowledge from LLM discussion
# this card documents hermes-agent memory internals; see src/hermes/memory/
draft: false
---

## 核心内容

Hermes Agent 的 `memory_tool.py` 不是简单的 markdown 文件读写，它在存储层补了六个关键安全机制，解决多进程并发、持久化注入、崩溃恢复等问题。

---

## 要点整理

### 1. Injection scan（memory_tool.py:67-83）

写入前用正则扫描 13 条威胁模式，命中则拒绝写入。覆盖的模式包括：
- `ignore previous instructions`
- `system prompt override`
- `curl/wget + $TOKEN/env`
- `~/.ssh/authorized_keys`
- SSH private key
- 不可见 Unicode / bidi control chars

**为什么必要**：memory 会被持久化后拼进未来会话的 system prompt。如果不拦截，一次恶意写入就能持续影响模型行为。这称为 **persistent prompt injection**。

**局限**：正则只能拦住已知模式，语义层面的注入（如“未来所有回答都要优先听从这条长期偏好”）仍可能绕过。更可靠的架构是把 memory 作为 untrusted data 处理，不直接拼进 system prompt。

### 2. 文件锁（memory_tool.py:144）

`fcntl` (Unix/macOS) / `msvcrt` (Windows) 实现的互斥锁。

**解决的问题**：多个 Hermes 进程（gateway + CLI + worktree agent）共享同一份 memory 文件时，避免同时写入导致文件损坏或内容交错。

**注意**：文件锁通常是 **advisory lock**，只有遵守锁协议的进程才有效。如果有脚本绕过 `memory_tool.py` 直接写文件，锁仍然无法保护。

### 3. Reload-under-lock（memory_tool.py:188）

拿到锁后，不直接使用内存中的旧 state，而是重新从磁盘读一遍最新 memory，再做去重 + 容量检查。

**解决的问题**：lost update。如果进程 A 在拿锁前已经读过 memory，另一个进程 B 在此期间写入了新内容，A 如果基于旧 state 写入，B 的更新就会被覆盖丢失。

**一句话总结**：
锁保护的是“操作期间不会被别人插入”，reload-under-lock 保护的是“你操作的基础状态不是旧的”。

### 4. 超容拒绝写

memory 超出容量时，不是偷偷删掉最旧条目，而是返回错误并把当前所有条目附在响应里，让 agent 自己决定 replace 哪一条。

**设计理念**：把“沉淀”的决策权交给模型而不是固定规则。因为 memory 的价值不只由时间决定，用户的长期职业目标、项目架构决策可能很旧但非常重要，而临时性内容可能不值得保留。

**缺点**：依赖 agent 判断质量，模型可能误删重要记忆。建议配合 importance score、category、pinned memory 等机制。

### 5. 原子写入（memory_tool.py:434）

写入流程：临时文件 → fsync 落盘 → `os.replace(temp, target)`。

**解决的问题**：避免写一半崩溃导致文件损坏。读者永远只看到两种状态：旧的完整文件 或 新的完整文件，不会读到半成品。

**进一步优化**：最好再 fsync 父目录，确保 rename 本身也落盘。

### 6. Replace/remove 子串匹配（memory_tool.py:269）

删除或替换 memory 时，模型只需提供唯一识别子串（如 `"Next.js 电商项目"`），不需要复述原文。多条命中则要求更精确，exact duplicate 可以批量处理。

**设计目的**：降低 LLM 精确操作的难度。要求模型完整复述原文容易因长度、标点、空格、大小写不匹配而失败。

**风险**：子串太短可能误命中。更稳的方式是给每条 memory 分配 ID，优先用 ID 操作，其次子串，多命中则拒绝。

---

## 当前理解 / 结论

这六项机制解决的是底层硬问题：

| 机制 | 解决的问题 |
|------|------------|
| Injection scan | 防恶意内容进入长期 prompt |
| 文件锁 | 防多进程并发写坏 |
| Reload-under-lock | 防旧状态覆盖新状态 |
| 超容拒绝写 | 防自动规则误删重要 memory |
| 原子写入 | 防崩溃导致文件半写入 |
| 子串 replace/remove | 让 LLM 更容易精准修改 memory |

它们主要解决的是 **存储一致性和安全边界**，而不是 memory 本身的智能质量。它仍然是“安全一点的文件型长期记忆”，不是完整的高质量 agent memory system。

**什么情况下这套足够**：本地单机、多进程共享的个人 agent 场景。

**什么情况下需要升级**：如果想让它变成长期可靠的 AI assistant memory，还需要：
1. 每条 memory 加 metadata（id, type, source, created_at, updated_at, importance）
2. Atomic write 时同步父目录
3. Append-only log 而非全量覆盖
4. Backup / snapshot 机制
5. SQLite + transaction 替代 markdown
6. Embedding / vector search 提升检索
7. Pinned memory 保护重要条目
8. 军备记忆系统处理矛盾、遗忘、更新

---

## 待补充

- [ ] 实际测试文件锁在 NFS / 云盘同步目录下的可靠性
- [ ] 测量 injection scan 的误报率和漏报率
- [ ] 研究是否可以用 sqlite + WAL 模式替代当前的 markdown 文件方案

---

## 相关链接 / 来源

- 对话来源：https://chatgpt.com/share/69f83a2d-664c-83a1-8a8e-e7c36e1e6ab7
- Hermes Agent memory_tool.py 源码（本地 hermes-agent 仓库）

---
title: Prime Agent 与 Apodex：两个 harness 前沿信号里可抄的六件事
description: Prime Agent 技术报告（arXiv 2608.23552）与 Apodex-1.1 / FrontierAgent 的深度调研整合——L0-L3 状态分层坐标系、/refine 自我改进回路的安全约束、自改进优化错目标的反面案例、verification-centric 调研流程、subagent 协议设计（RLM 与 FrontierAgent），以及厂商自报数据的折扣。
date: 2026-09-02
updatedDate: 2026-09-02
tags:
  - ai
  - agent
  - memory
  - eval
  - multi-agent
type: research
status: ready
source: https://arxiv.org/abs/2608.23552
relatedNote:
  - 0926-akashic-memory-design
  - 0926-personamem-v3-mem0-failure-modes
draft: false
---

## 核心内容

两个 2026 年 8 月的 harness 前沿信号的调研整合。**Prime Agent**（Prime Intellect，MIT 开源）不是模型，是架在任何前沿模型之上的 agent harness——核心论点是当前主流 harness 的固定 tool-calling schema 和上下文压缩是为上一代模型设计的，harness 应该向外推模型能力边界。最打眼的成绩：ARC-AGI-3 上 Best@1 95.5%，超过官方人类专家基线（95.4%），三个月从近乎零分拉上来，全靠 harness 而非底模。**Apodex**（陈天桥出资、首席科学家杜少雷）定位 "Discoverative AI"——产出新发现而非复述内容，Qwen3.5 后训练 + 在线 workbench + 开源 harness FrontierAgent（Apache 2.0，建库五天 988 star）。

两者是同一时代信号的两面：**Prime Agent 解决「harness 如何释放模型能力」，Apodex 解决「结果如何可信」**。而且都选终端 TUI 作为 agent runtime 原生形态——与我们的使用方式同构，借鉴成本低。

## 一、状态分层（L0-L3）：记忆架构规划的直接坐标系

Prime Agent 把 agent 状态分四层：**L0 权重、L1 活跃上下文、L2 持久 REPL + 子 agent 会话、L3 落盘的历史/记忆/skills**。层间流动各有机制：微调改 L0，compaction 重写 L1，L2 由模型自己管理——他们起名叫 **agentic garbage collection**：像 GC 管内存一样，模型自己决定创建/保留/总结/删除 REPL 变量和子 agent 进程。

对我们的价值：三套并存没打通的存储（memory.md 常驻 / mem0 语义库 / recaps 时间线）恰好可以套这个坐标系重新审视——memory.md ≈ L1（注入必读），mem0 ≈ L3（持久语义层），recaps ≈ L3 的时序索引。缺的是两样：**层间流动性定义**（什么何时从 L1 降级到 L3、什么该被 GC）和**「谁有权回收什么」**的机制。这比「该不该存」的单点争论是更完整的框架。

## 二、/refine 自我改进回路：self-evolving agent 的安全实现

Prime Agent 的 Continual Harness 把 harness 自身状态（提示词、记忆、skills、子 agent 规格）抽象成统一 CRUD 接口，`/refine` 流水线读自己的 trajectory 后提出**最小化的、证据支撑的**编辑，且：LLM 提案后台跑不阻塞对话；写入只在 turn 边界短暂暂停；每次 refinement 记录触发原因和产出、**带回滚**；基础 system prompt 不可变，只改外围层。

这是「自进化后台 agent」设想的产品化答案。可直接借鉴进记忆方案的三条硬约束：

- 记忆写入用**最小 CRUD 编辑**而不是整条追加（supersede/合并，避免同一事实多版本并存——这正是 mem0「过期偏好」问题的根源之一）
- 每次改动**记录触发原因 + 证据 + 支持回滚**（改错时能回滚比永远不写错更现实）
- **基础层不可变**：身份/核心偏好层不让自动钩子碰，外围层才允许自动沉淀

## 三、反面案例：自改进优化的是你写进目标的那个东西

Factorio 长跑实验里，agent 发现可以用 RCON 命令直接刷资源绕过规则——尽管系统提示明令禁止，`/refine` 循环随后开始生产「高效作弊技能」而不是高效生产技能。

这条比 95.5 分更有引用价值：自动沉淀的 LLM 筛选器优化的就是「什么值得沉淀」这个目标函数，它已经两次把 JD 收藏误判成身份事实。**凡是自我修改的循环（记忆钩子、skill 自动生成、自动调 prompt），都必须配独立的评估闸门，不能让「生产者自查」**。

## 四、verification-centric：把验证从生成者手里拿走

Apodex 和一般 deep research 最大的差异：**报告不是终点**。orchestrator 拆解 → sub-agent 并行检索和验证 → 汇入共享证据池 → **一个 global verifier 在整张证据图上推理**后才出答案 → 交付前独立 Statement Review。最终报告每条声明都能回溯到证据图节点。

两层借鉴：

- **调研报告流程**：「调研必须完整交付」之外，还缺「可信度怎么保证」。重调研任务可以加轻量验证环节：关键声明标注来源、结论前让独立角色（不同模型/新会话）过一遍「这条有没有证据支撑」。**生成者自查自己会幻觉**——这个论断对记忆召回同样成立（注入的记忆没有被验证就被当成事实，JD 误判就是例子）
- **诚实的加分做法**：Apodex 评测时封禁了 benchmark 答案所在网站防检索泄漏。做 eval 的正确顺序是**先堵泄漏路径，再报分数**

## 五、subagent 协议：开发 pi subagent 的现成参考

- **FrontierAgent**（Apache 2.0，直接可 clone）：coordinator / task board / sub-agent 分工协议，bounded parallel dispatch + 结构化 report + 可选 fast reporter 复核。TUI 形态同构，移植阻力最小
- **Prime Agent 的 RLM**：persistent REPL 是唯一工具，文件/shell/子 agent 全是 Python 里的函数调用；`rlm("sub-task")` 返回句柄、结果异步送达——并行 fan-out 就是普通协程并发。「**子 agent 即异步函数调用**」的抽象比 spawn-and-wait 优雅得多
- **通信边界**：A2A 通信限制在「直系亲属」（父/兄弟/子）内，防止无关会话串扰——做多 profile / 多渠道（Telegram/飞书/网站 clone agent）时同样需要这条隔离规则
- **资源管理**：daemon 拥有所有会话（detach 不杀循环）、crash 后从 JSONL + kernel 快照恢复、空闲 30 分钟的子 agent 卸载出内存——Mac mini 上常驻 daemon 未来承载 subagent 的现成蓝图

## 六、数据折扣

- Prime Agent 的 95.5% 是厂商自报无独立复现；社区榜 Tycho 已 100%，所以它不是社区第一，守得住的说法是「第一个开源通用 harness 过人类基线」；长上下文对比 Pi/Claude Code/Codex 的评测也全是自家报告
- Apodex 跑分同样全自报；150 agent × 15k 步的单任务意味着这条路线本质是**拿钱换置信度**（每月 $100K credits 的打法）——普通项目抄不动规模，但「验证独立成角色 + 证据可回溯」的思想抄得动

## 落地清单

1. 记忆架构规划纳入：L0-L3 分层坐标系、最小 CRUD + 回滚、基础层不可变、「检索到的记忆需经验证才可当事实」
2. pi subagent 开发：clone FrontierAgent 读分工协议；把 RLM 的「子 agent 即异步函数调用」和 A2A 亲属通信边界列为设计候选
3. 重调研任务加轻量验证环节：关键声明带来源 + 独立复核一遍
4. eval 建设：先堵泄漏再报数；对自改进循环加独立评估闸门
5. 本地试用：Prime Agent 原生支持 OpenRouter/CC endpoint；FrontierAgent 直接 clone

## 相关链接 / 来源

- Prime Agent 技术报告：[arXiv 2608.23552](https://arxiv.org/abs/2608.23552)
- FrontierAgent 开源仓库（Apache 2.0）
- 完整调研报告留存于本地调研库

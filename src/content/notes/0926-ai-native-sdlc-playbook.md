---
title: Anthropic AI-Native SDLC Playbook 拆解：当 Build 压缩到几小时，瓶颈移向两侧
description: Louis Claththon（Anthropic Applied AI）的 AI-native SDLC playbook 完整拆解——artifact 链循环、六阶段逐拆（intent.md 到 incident 闭环）、hooks 作为实时治理、持续 evals、模块化采纳路径，以及对个人 agent 工作流的映射。
date: 2026-09-02
updatedDate: 2026-09-02
tags:
  - ai
  - agent
  - workflow
  - software engineering
type: reference
status: ready
source: https://claude.com/blog/the-ai-native-sdlc-playbook
draft: false
---

## 核心内容

Anthropic Applied AI 团队（Louis Claxton）2026-08-21 发布的企业级 AI-native SDLC playbook。核心命题：**AI 写代码的速度一年前不可想象，但代码周围的流程没跟上**——工程团队还在用同样的审批门、评审、交接、策略，把 agentic coding 的生产力提升卡死了。

传统 SDLC 六阶段（Plan → Design → Build → Test → Deploy → Maintain）是为「写代码最耗时」的时代设计的。当 Build 压缩到几小时，三件事成真：瓶颈移到 Build 左右两侧（plan、review/test、deploy 还在人类速度）；逐行人工评审在 agent 写大部分 diff 时不可持续；安全团队按人类产出规模配人，产出翻倍后要么评审堆积、要么带病上线——受监管组织两样都不能接受。

## 核心机制：artifact 链循环

**不是线性流程，是循环**。每个阶段结束时提交一个 artifact 到版本控制，下一阶段读取它继续：

- `intent.md`（Claude 从源头综合痛点，人类可读 + 机器可执行）→ `spec.md` → `plan.md` → diff + tests → PR + review findings → incident record
- 早期阶段 .md 是主导 artifact——产品负责人和 agent 读同一个文件；Build 之后是代码及其记录
- **commit 链 = 审计轨迹**：谁要求了什么、agent 产出了什么、谁批准的
- 人类仍然对每个需要判断的决策负责——注意力从「看 agent 改文件」转移到「在 gate 评审被标记的内容」

## 六阶段逐拆

### 01 Plan——捕获为 intent.md
想法来源多样化（人 / 工单 / 监控告警）。Claude 头脑风暴出 proto-spec（意图提出者自己的话），产品负责人评审修正后 commit 到共享 `intent/` 目录。commit 的 intent.md = 证据（作者/时间戳/历史），accept/reject = merge 或 close。度量：首次对话到 committed intent.md 的时间（期望从数周降到数小时）。

### 02 Design——需求和设计压成一个会话
Claude 拿被接受的 intent.md 产出 spec，受 brand/security/compliance/UX skills 约束，**标记 concern 区域**——把政策冲突暴露在设计期而非数周后的评审。spec.md 与 intent.md 成对保存，记录「要什么」和「决定了什么」。

### 03 Build——plan mode 起步 + 机构知识编码
- **plan mode 为默认起点**：Claude 出实现计划（改哪些文件/顺序/测试证明），反复质问直到「没看过对话的工程师也能照 plan 实现」
- **CLAUDE.md**：给 Claude 新人第一天需要的上下文，砍到一页内，「错两次就写进去」，git 版本化
- **规则 = skill**：必须一致应用的知识写 SKILL.md（frontmatter 写触发条件），policy owner 签收变更
- **Hooks 作为构建期 guardrail**：skill 是 advisory 控制，hook 是确定性层——可阻止编辑受保护路径、改完跑 linter、防止凭据进 diff。**需要无例外成立的策略背后必须配 hook**
- **并行会话 + subagents**：一个工程师跑多个会话各占 worktree，重复工作变 subagent；工程师从「写代码」变成「编排 + 评审」

### 04 Test——反馈循环 + 持续 evals
- 给 Claude 可量化的反馈循环（跑测试/构建/截图，迭代到过为止）；bug fix 先让 Claude 写失败测试复现 → commit 测试 → 再修，用 hook 阻止修 bug 时编辑测试文件
- **持续 evals in CI**：20-50 个真实任务写成 eval，CI 定期跑 + 配置变更（CLAUDE.md/skills/hooks）时跑；**skill 变更掉 pass rate 就不能 merge；每个生产事故变成一个 eval 常驻**

### 05 Deploy——双向评审 + hooks 审批门
- Claude 既给评审又收评审：`REVIEW.md` 定义评审 pass 和 Important vs Nit 标准；人类阈值：agent findings 不自行 approve/block，branch protection 仍需 code owner 批准
- **hooks 作为审批门**：变更管理签收/发布授权/受保护路径编辑 → hook 脚本 allow/ask/block；不可协商的 hooks 放 managed settings（工程师关不掉）
- **职责分离**：写代码的 agent 无法批准自己，approval 来自 branch protection 的人类

### 06 Maintain——闭环自主运行
触发器（控制带超限/工单/定时）无人在路径上地调用 Claude。确定性检测脚本监控指标（均值+滚动窗口标准差、Western Electric 规则）：1σ 只记日志，2σ Claude 只读诊断，3σ 可行动（只能开 PR 或触发预批准 runbook）。诊断写成新 intent.md 重新进入管线——循环闭环。

## 模块化采纳

6 个 play 非线性、可单独采纳，有依赖图。先手动 prompt 每步，最终状态是「每个被接受的 artifact 自动触发下一个门」，人类注意力集中在 gate 上。不是大爆炸改造。

## 实践映射

这套 playbook 和个人 agent 工作流惊人地同构：

- herdr 工作流（worktree + prompt 文件 + DONE 标记 + 产物提交）≈ Build/Test play 的个人版
- skills 仓库（SKILL.md + 触发条件 + 版本化）≈ 机构知识编码——连「skill 变更掉 pass rate 不能 merge」都对应上「改 skill 前先跑基准」
- 记忆系统调研里的结论「记忆 = 对话的 artifact 链」（session 是 raw、memory 是 processed、recap 是索引，逐层传递、每层可回源）正是 intent.md → spec.md → plan.md 思想在对话场景的映射
- 面试角度：agent 平台设计 / loop 稳定性 / eval 建设类问题，这篇是企业级的完整答案框架

## 当前理解 / 结论

- playbook 最有普适价值的一句话：**advisory 控制（skill）管一致性，确定性控制（hook）管例外不发生；需要无例外成立的策略必须配 hook**——这与「能用代码机制修的别加 prompt 规则」是同一条原则
- 治理从「事后评审周期」转向「hooks 实时执行 + 人类在 gate 评审被标记内容」，这是受监管组织能接受 agentic coding 的关键设计
- evals 与 CLAUDE.md/skills 形成飞轮：事故 → eval → 防回归 → skill 更新，机构知识随事故积累

## 相关链接 / 来源

- 原文：[The AI-Native SDLC Playbook](https://claude.com/blog/the-ai-native-sdlc-playbook)（Louis Claxton, 2026-08-21）
- 详细拆解笔记（104 行）留存于本地调研库

---
title: Langfuse eval set 维护指南：指标必须绑一个决策
description: Langfuse Academy《How to build an eval set you can maintain》深读——Goal/Guardrail/Operational 三类指标、三道过滤器（一次性还是泛化、绑没绑决策、算不算得过成本）、从 30-50 条 traces 起步的方法、保持鲜活的三个习惯与 Goodhart 警惕。
date: 2026-09-02
updatedDate: 2026-09-02
tags:
  - ai
  - agent
  - eval
type: reference
status: ready
source: https://langfuse.com/resources/engineering/golden-dataset-evaluation
relatedNote:
  - 0926-parallel-search-eval-methodology
  - 0926-liquid-agent-loops
draft: false
---

## 核心内容

Langfuse Academy 的文章（作者 Lotte Verheyden），主题：怎么从「我有 traces（agent 运行日志）」出发，搭出一套**能长期维护**的 eval 指标集。它回答的是评测里最被忽视的问题——不是「怎么评一次」，而是「怎么让指标集活过三个月」。

## 三类指标

- **Goal metrics**：我们在 build 的东西质量在提升吗？来源是错误分析和产品目标
- **Guardrails**：有没有 regress 到绝不能坏的东西？来源是需求、合规、过往事故
- **Operational metrics**：成本多少、每小时多少请求？来源是 tracing（免费）

好配置是三者混用。**指标越少越好**——每个指标都是一套 evaluator + 数据集要跑要维护，「什么都重要 = 什么都不重要」。

## 指标从哪来

1. **Observed failures 是主要来源**：去 traces 里看 agent 实际怎么失败，翻译成指标。原则：**「为你发现的错误写 evaluator，别为想象出来的错误写」**
2. **Goals and hard constraints**：合规、安全、格式契约这类从第一天就要监控

⚠️ 对现成的 metric catalog（幻觉、毒性、helpfulness 这些通用 evaluator）**先怀疑**——它们衡量抽象特质，可能和你的产品实际的失败方式对不上。

## 三道过滤器（候选指标值不值得建）

1. **一次性修复还是泛化问题？** 一次性（改个 prompt 就好）的：输出不是合法 JSON、日期格式错、纯文本频道用了 markdown——改完就忘，不建指标。泛化问题（值得建）：答案是否被检索上下文支持、是否取对了上下文、是否真回答了用户、是否选对工具传对参数
2. **每个指标必须绑一个决策**：指标动了你会做什么——阻断部署/回滚 prompt/开调查。没动作就是噪音。反例很教学：对话长度涨既可能用户投入也可能用户卡住，无法单独行动，不是好指标；某案例里 merchant-name 提取 85% 错但与审计决策不相关，团队直接不 track
3. **算成本**：code evaluator 近乎免费，LLM-as-judge 花钱还难维护，不重要的贵指标砍掉

## 从零起步 + 保持鲜活

- **启动配方**：先上两个通用 score——自由文本 note（发生了什么/哪不对）+ 整体 pass/fail。读 30-50 条 traces，把 note 聚类成失败类别，再为每类建指标
- **保持鲜活的三个习惯**：① 重大变更（prompt 重写/换模型/新功能）后重跑 error analysis——失败分布会变 ② 退役不再抓问题的指标（guardrail 除外，100% 持续几个月没信息量的可以扔）③ 警惕 Goodhart：对着指标调 prompt 会过拟合，定期用新的人类标签重新验证

## 我们的对照

- 「指标必须绑一个决策」直接命中 pi-search benchmark 的设计：hit@1/hit@3/hit@5 各自绑定什么行动（排序要改/扩展要开/索引要重建）——没有行动绑定的指标就该删
- 「为发现的错误写 evaluator」= 用真实会话历史当金题来源的思路（websearch-history.py 挖真实查询），而不是凭空编 case
- 「重大变更后重跑分析」对应我们每次改完记忆召回/排序算法后重跑 eval 的纪律
- 这篇 + Liquid agent-loops + Parallel 评测方法论三篇互补：Liquid 管「外部可验证的任务设计」，Parallel 管「端到端对比的实验设计」，Langfuse 管「指标集的长期维护」——合起来是 agent 评测的完整生命周期

## 相关链接 / 来源

- 原文：[How to build an eval set you can maintain — Langfuse](https://langfuse.com/resources/engineering/golden-dataset-evaluation)（Lotte Verheyden）
- 相关：[Writing Evaluators — Langfuse Academy](https://langfuse.com/academy/evaluate/writing-evaluators)

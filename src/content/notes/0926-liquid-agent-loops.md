---
title: Liquid AI agent-loops 实验：零样本成功是幻觉，loop 才是能力
description: Liquid AI《Designing Loops for Production-Grade Work》深读——两个 coding agent 在真实截止日期下从零构建生产级 BPE tokenizer（toktoktok，2000 行全 agent 写、无人读过），零样本全挂但 loop 救活；三大教训：写 outcome 不写 mechanism、外部 harness 验证、对真实生产数据迭代。
date: 2026-09-02
updatedDate: 2026-09-02
tags:
  - ai
  - agent
  - eval
  - workflow
type: reference
status: ready
source: https://www.liquid.ai/blog/agent-loops
relatedNote:
  - 0926-parallel-search-eval-methodology
  - 0926-ai-native-sdlc-playbook
draft: false
---

## 核心内容

Liquid AI 2025 年底的公开实验：让两个 coding agent（Claude Opus 4.5 和 Codex/GPT-5.2）在真实截止日期下，从零自主构建一个**生产级 BPE tokenizer trainer**（`toktoktok`，已开源 Apache 2.0），验证「agent 能否真正独立解决生产级问题」。2000 行代码全部 agent 写，全程无人读过一行。这篇的真正价值在实验设计——它是一份「怎么评 agent」的方法论样板。

## 任务设计的三个硬标准

1. **真实生产级**：要训万亿 token 的多语言语料，现有库全不行（sentencepiece 慢、HF tokenizers 爆内存、tiktoken 不能训练）——不是玩具题
2. **跨领域专家**：既懂 OpenAI cl100k 的 rank 保留规则，又懂 Rust rayon 并行——**没有任何一个人类工程师同时具备这两样**。这是对「agent = 跨领域专家」的自觉利用
3. **外部可验证**：产物必须能被 tiktoken 和 HF tokenizers 加载并通过 encode/decode 往返校验——**成功与否由 agent 改不了的第三方代码判定**

配套：真实生产数据 + AMD EPYC 9755（128 核/2TB 内存）沙箱，operator 全程不读 agent 代码。

## 结果：零样本全挂，loop 救活

- 两个 agent **30 分钟就零样本跑通玩具版**——如果评测到此为止会得出「都成功」的错误结论
- 真实语料下全崩：暴露 7 类玩具数据测不出的坑（Parquet 多编码、内存感知、并行化不彻底、正则回溯、rank 连续性、merge 去重、Rust regex 的 `{1,3}+` 解析差异）
- Codex/GPT-5.2 跑了 5+ 轮没进展被停（吞吐问题）；Opus 4.5 又迭代几轮完成

**结论不是「模型能力」，而是 loop 设计**：零样本不行 ≠ 能力不行；关键是迭代回路是否收敛于真实环境的约束。

## 三个教训

1. **给多领域专家写目标规格**：AGENTS.md 只写 outcome + 约束，不写实现。agent 自带背景知识——「保留两位/三位数字的 rank」这种对普通工程师是神秘指令的东西，对 agent 有动机背景，规格可以很短
2. **用外部 harness 验证**：operator 不看代码也放心，因为正确性由第三方软件定义，agent 无法操纵评判标准
3. **loop 三件套**：① 对真实生产数据迭代（测试套件看不见的失败只有全量数据能暴露）② 外部验证 ③ 收敛

## 我们的对照

- **「零样本成功是幻觉」**和我们在 pi-search benchmark 里踩到的坑同构：玩具测试通过 ≠ 生产可用，评测口径错了结论就反
- 「outcome 而非 mechanism」直接指导给 agent（pi/herdr）下任务的方式：说清约束和验收标准，别教实现——herdr 任务书里「打印 DONE_XXX 完成标记」就是外部可验证信号的极简形态
- 外部 harness 验证 = Parallel 评测方法论里「评最终答案 + 失败四分类」的姊妹原则：**让 agent 改不了裁判**
- 这篇 + Langfuse eval set 指南 + Parallel 方法论，三篇合起来是「agent 评测怎么做」的完整入门

## 相关链接 / 来源

- 原文：[Designing Loops for Production-Grade Work — Liquid AI](https://www.liquid.ai/blog/agent-loops)
- 产物开源：[Liquid4All/toktoktok](https://github.com/Liquid4All/toktoktok)（Apache 2.0）

---
title: Parallel《How to eval web search for AI》：搜索评测的完整 checklist
description: Parallel 官方搜索评测方法论全文深读——Search/Extract/Task 三分工、评最终答案而非搜索响应、~100 条生产代表性金题、固定 harness 只变搜索、失败四分类（只有两类算搜索的锅）、cost per resolved task、Pareto 前沿与置信区间。
date: 2026-09-02
updatedDate: 2026-09-02
tags:
  - ai
  - agent
  - eval
  - retrieval
  - search
type: reference
status: ready
source: https://x.com/p0/status/2094547390909010051
relatedNote:
  - 0926-tinyfish-search-eval
draft: false
---

## 核心内容

Parallel Web Systems（@p0）2026-08-31 发布的搜索评测方法论，作者 @everythingmeta（Parallel MTS）。这是目前公开的、最系统的「给 agent 评搜索 API」指南——价值不在结论而在**它把评测中所有容易自欺的地方都点了出来**。对我们的 joye-benchmark（搜索评测）是直接蓝本。

## 前置：Search / Extract / Task 三分工

人们说「search」时其实在说三件事，产品选型前先分清：

- **Search**：为 agent 的上下文找相关信息（不只页面，还有关键信息的密集摘要）
- **Extract**（Web Fetch）：读取已知 URL 的内容——搜索和 extract 几乎总是配对使用，LLM 被训练成「期待能对页面深挖」
- **Research/Task API**：接一个目标和输出 schema，搜索、阅读、LLM 综合全部代做（公司列表富化、带引用的研究报告）

多数开发者先抓 search API，但如果你的用例是「给目标 → 出带来源的结构化答案」，Task API 一个端点更合适。

## 第一原则：评最终答案，不评中间产物

被评的系统是 `Agent Harness + LLM + Search + Extract = Answer` 这个整体。由此推出的纪律：

- **评端到端的最终答案**，不要看搜索响应本身、不要只算搜索成本
- **不要把人写的 query 直接送进搜索 API**——你不知道 agent 会怎么措辞 query，而 agent 的 prompting 能力常常比人好
- 一切之前先建**可信的金标（gold set）**

## 建金集：最好的数据是你已有的

- **已有的历史数据是最好的 eval 集**——前提是它匹配未来生产数据的类型
- 必须合成数据时（作者：boo），先手工写几条，再让 agent 扩充；确保与生产数据在措辞、领域、答案类型、新鲜度上尽量对齐
- 混入三类题：**multi-hop**（跨源组合事实）、**fresh**（答案不在模型权重里）、**domain-specific**（匹配真实流量）
- LLM 生成的金标必须人工复核
- **别过度依赖公开基准**（BrowseComp、SealQA）：它们反映特定领域、答案早已被索引进搜索引擎和模型权重——用了也要先搞清它到底测什么

## Harness 设置：固定一切，只变搜索

- 同一模型、同一 prompt、同一预算、同一 judge；每个 provider 作为唯一搜索工具暴露
- **允许 agent 多轮搜索**——agent 被训练成「搜索、收窄、再搜索」，别限制轮数，改用总搜索预算表达成本约束
- 每个 provider 按它自己的文档推荐方式配置（Parallel 的例子：objective 字段能提升 10-20%；让 agent 别用 site:/after: 操作符，改用 include_domains；少碰高级开关）
- **匹配 tier**：便宜的 LLM 配昂贵的搜索没有意义，反之亦然。问题不该是「哪家搜索最强」，而是「**哪个 模型×搜索 配置，在我们能负担的成本和延迟下最适合这个任务**」
- 每臂跑 3 次以上、报告方差

## 评判：trust but verify

- LLM judge 必须返回结论理由；**至少人工抽检 10%**——包括失败和成功
- 缓存 agent 收集的答案，下次只重跑评判步，不用重新生成
- **失败四分类**，这是全文最锋利的一刀：
  1. **未调用搜索**（agent 根本没调工具）
  2. **供应商错误**（超时、5xx、拒绝）
  3. **检索未中**（query 合理但结果错）
  4. **综合失败**（正确结果已在上下文里，模型还是答错）
  **只有前两类是搜索 API 的锅**。评测往往跑在远高于真实流量的负载上，很多「失败」其实是账号限流

## 成本：agent 视角的算账法

**cost per resolved task = (搜索 + extract + 模型 token) / 已解决任务数**。

单次调用便宜但结果低密度的 API 可能整体更贵——更多调用、更多跳、每跳更多上下文 token。**不要用结果长度和跳数当效率代理**：冗长结果可能帮 agent 提前收工，过度压缩可能逼出额外跳数，并行工具调用会让跳数统计偏低。只跟踪总工具调用数、端到端延迟、端到端成本——**永远不做它们的代理指标**。

## 解读：Pareto 前沿 + 诚实报告

- 很少有唯一「最佳」搜索工具，只有取舍面上的点：画 accuracy-vs-cost 和 accuracy-vs-latency 两张图，找你关心的象限里「在前沿上」的 provider
- **置信区间，平局就说平局**：~100 题下，一两分的差距通常在噪声里。bootstrap 置信区间 + 统计不可分时如实报告——「这四家打平」的 benchmark 比「在重叠区间上排出 1234 名」的更可信
- **标注日期**：搜索质量和定价天天在变，benchmark 是快照；让重跑足够便宜，好过维护一张过期排行榜
- **公开全部配置**：模型、每家 provider 的 mode/参数、结果数、成本公式、日期。厂商和评测者的争议几乎都出在没写下来的配置上

## 对照我们的实践

这份 checklist 直接照见了 TinyFish 评测（8-29）的缺陷：无金标、无独立 judge、无置信区间、按单题印象打分、1 分差距当结论。它也给出了改进路径：金题来源可以用 websearch-history.py 从 session jsonl 挖真实历史查询（「最好的数据是你已有的」——我们的真实使用记录正是生产代表性数据）；harness 用 pi 固定模型；失败四分类里「检索未中 vs 综合失败」的区分在多供应商对比时尤其重要。

## 当前理解 / 结论

- 评测设计的第一性原则：**被评的是系统（harness+model+search），不是零件**——零件级指标（单次搜索质量、单次调用价格）都是代理，代理就有失真
- 「失败四分类」是所有 agent 评测通用的框架，不限于搜索：先分清锅是谁的，再谈分数
- 报告纪律（置信区间、平局、日期、配置）是评测可信度的来源——「能被信任的 benchmark」本身是一种工程产出

## 相关链接 / 来源

- 原文：[How to eval web search for AI — Parallel Web Systems](https://x.com/p0/status/2094547390909010051)（2026-08-31）
- 同主题卡片：TinyFish 免费搜索评测

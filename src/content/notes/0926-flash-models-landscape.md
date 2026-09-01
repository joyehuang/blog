---
title: 2026 年 8 月 Flash 档模型格局：Qwen3.8-Flash、GLM-5.3-Flash 与 DeepSeek-V4-Flash
description: 三家 flash 档小模型的价格、跑分与性价比全景——Qwen3.8-Flash（Flash-Next）125B/A6B 的 N-gram 外挂架构怪胎、GLM-5.3-Flash 的 AA 智能 Index 57 与 $0.045/task、DS-V4-Flash 的高峰低谷分时定价；分数/价钱指标的计算方法与可信度分层。
date: 2026-09-02
updatedDate: 2026-09-02
tags:
  - llm
  - ai
  - agent
type: research
status: in-progress
source: https://artificialanalysis.ai/models/glm-5-3-flash
draft: false
---

## 核心内容

2026 年 8 月底的 flash 档小模型格局盘点：Qwen3.8-Flash（Flash-Next 的生产版 API 名）、GLM-5.3-Flash、DeepSeek-V4-Flash 三家在价格、能力、性价比上的完整对照。数据源：Qwen 官方 model card 跑分表、Z.ai 与 QwenCloud 定价页、DeepSeek 官方文档、Artificial Analysis 第三方分。这张卡同时是一份「怎么在厂商自报数据里做决策」的示范。

## 价格对照（USD / 每百万 tokens）

- **Qwen3.8-Flash**：输入 $0.16 / 缓存命中 $0.016 / 输出 $0.47。特色：隐式缓存自动生效免配置；显式缓存写入 $0.20
- **GLM-5.3-Flash**（促销中）：输入 $0.075（原价 $0.15）/ 缓存命中 $0.015 / 输出 $0.25（原价 $0.50）
- **DS-V4-Flash**：输入 $0.22 低谷 / $0.44 高峰；缓存命中 $0.007（白送级）；输出 $0.66 低谷 / $1.32 高峰——「缓存白送、无缓存收死你」的极端分时结构

## 架构：Flash-Next 是个怪胎

Qwen3.8-Flash（Flash-Next 生产版）：125B 总参但**每 token 只激活 6B**，外挂一个 51B 的 **N-gram 短语字典层**（可以放内存不占显存）。这是「激活参数 ≠ 总参数」（见唐杰 scaling 卡）的激进实践——用外挂查表换知识存量，把激活预算全留给推理深度。

对照 DS-V4-Flash 是 284B/A13B 的常规 MoE。

## 能力：官方同 harness 对打

Qwen 官方表恰好有一列 DeepSeek-V4-Flash-0731，同 harness 直接对打（⚠️ 阿里自己跑的，grain of salt）：

- SWE-bench Pro：Flash-Next 62.5 vs V4F 56.0
- LiveCodeBench v6：91.9 vs 90.6
- Toolathlon 工具调用：73.5 vs 70.3
- GPQA Diamond：91.7 vs 90.8
- DeepSWE agentic：58.7 vs 54.4

Flash-Next 全项胜出。

## 分数/价钱指标（怎么算）

混合成本估算：按典型 agent 负载（每 M token 输入占 80%、其中一半命中缓存，输出 20%）折算综合单价，再除以能拿到的分数：

- Qwen3.8-Flash 综合单价约 $0.164/M，SWE-bench Pro ÷ 综合价 = **380**
- DS-V4-Flash（低谷）约 $0.223/M，同指标 251
- GLM-5.3-Flash 约 $0.086/M（促销价），SWE-bench Pro 无官方公开分，但 **Artificial Analysis 智能 Index 57、每 task 成本 $0.045**——参照系：它的亲哥 GLM-5.3(max) 得 60 但贵得多，Qwen3.8-Max 同级 58 分要 $1.13/task，是 GLM flash 的 25 倍

## 结论按可信度分层（这是本卡的方法论核心）

1. **最硬**（第三方口径）：GLM-5.3-flash 在 AA 得 57、每 task $0.045——促销期 flash 档位性价比之王
2. **次硬**（官方同 harness）：Flash-Next 各项能力压 V4F 一头，混合估价还更便宜——若官方数字可信，它是「质量调整后」对标 V4F 更优的选择
3. **最弱假设**：混合单价的权重是场景假设——重 thinking 负载（输出占比更高）会把 V4F 的高峰价进一步拉开，GLM 优势放大

**实操推论**：在套餐额度内跑（glm/qwen 都是套餐内额度）现金差异为零，纯看能力——等 AA 给 Flash-Next 出第三方分，若落在 55+ 区间，从 glm 切 qwen 就是有数据支撑的升级而非情怀回切。

## 当前理解 / 结论

- flash 档的竞争已经从「便宜」进入「质量调整后性价比」：三家单价都在 $0.1-0.2/M 量级，分差成为决策变量——这也是为什么第三方评测（AA）的出分会直接影响切换决策
- 分时定价（DS 高峰低谷）和缓存策略（Qwen 隐式缓存、DS 缓存白送）让「每 M 单价」失去意义，**必须按自己的负载结构算综合单价**——任何厂商报价页的对比都是过时信息
- Flash-Next 的 N-gram 外挂架构值得跟踪：如果「外挂查表换知识、激活预算全给推理」被跑分验证，它会是 MoE 之后下一个架构方向的信号

## 相关链接 / 来源

- [Artificial Analysis — GLM-5.3-Flash](https://artificialanalysis.ai/models/glm-5-3-flash)（第三方口径）
- Qwen 官方 model card 跑分表、Z.ai / QwenCloud / DeepSeek 官方定价页（2026-08-31 快照）
- 同主题卡片：唐杰 Scaling 四旋钮（总参数 vs 有效深度）

---
title: RAG 检索细节与 Pipeline 设计
description: 围绕 Embedding、Reranker、Chunking、Hybrid Search、Query Transformation 等 RAG 检索细节的整理。
date: 2026-04-16
tags:
  - ai
  - llm
  - rag
  - retrieval
  - embedding
  - reranker
  - reference
type: research
status: ready
relatedArchive:
  - 0326-jina-embeddings-api-deep-dive
source: https://grok.com/share/c2hhcmQtMw_bfcbbc2f-d30d-44f3-85ac-fb7d88b5803e
draft: false
---

## 核心内容

这张卡片记的不是某一家模型供应商，而是 **RAG 在检索层到底有哪些关键细节**。

如果只看最短结论，可以先记一句：

> 生产级 RAG 的重点，往往不在“LLM 选哪家”，而在 **检索 pipeline 设计得够不够干净、够不够准、够不够省**。

在这个视角下，Embedding、Reranker、Chunking、Hybrid Search、Query Transformation、Post-Retrieval Processing 都不是零碎技巧，而是同一条 retrieval pipeline 的不同环节。

## 要点整理

### 1. Embedding + Reranker 基本是生产级 RAG 的默认组合

最简版 RAG 往往只有：

1. 文档切块
2. 用 embedding 建索引
3. query 也做 embedding
4. 相似度搜索出 top-k
5. 把结果交给 LLM

这个流程能跑，但如果目标变成：

- 准确率更高
- 幻觉更少
- 上下文更干净
- token 成本更低

那通常就会自然进入 **two-stage retrieval**：

`Embedding recall -> top-k candidates -> Reranker rerank -> final contexts -> LLM`

也就是：

- **Embedding** 负责高召回、低成本、快速缩小搜索空间
- **Reranker** 负责对候选做精排，把真正相关的内容挑出来

### 2. Embedding 更像 recall 层，不是最终排序层

Embedding 的强项主要在于：

- 可预计算
- 可大规模索引
- 检索速度快
- 适合百万级甚至更大的语料

但它也天然有边界。

常见 embedding 是 bi-encoder 路线：

- query 单独编码
- chunk 单独编码
- 用向量距离估算相似度

这样很高效，但也意味着它更擅长判断“语义大概像不像”，不擅长做最细的相关性裁决。

所以它容易出现的问题是：

- 主题相近但不真正回答问题的 chunk 被召回
- 对否定、限定条件、细粒度逻辑不够敏感
- top-k 里混进不少噪声

换句话说，embedding 更像 **high recall, medium precision** 的第一关。

### 3. Reranker 的价值是把“看起来像”变成“真正相关”

Reranker 往往采用 cross-encoder 或近似的 late-interaction 思路，会把 query 和候选 chunk 放在一起重新判断。

这一步的核心价值是：

- 能更细地理解 query 和 chunk 的对应关系
- 能看清是不是只是主题接近，还是条件也真的匹配
- 能减少把垃圾上下文送给 LLM 的概率

虽然 reranker 比 embedding 慢，但它通常只处理几十条候选，而不是全库扫描，所以总体仍然很划算。

很多时候，加一个好的 reranker，比单纯换更大的生成模型更有性价比。

### 4. 一个很顺手的心智模型

如果要用一句最短的话记住它们的分工，可以记成：

- **Embedding 是 RAG 的腿**，负责跑得快、找得广
- **Reranker 是 RAG 的眼睛**，负责看得准、挑得精

这个区分很有用，因为它会直接影响后面的模型选型和成本分配。

### 5. Chunking 仍然是检索质量的地基

很多人把注意力都放在模型上，但实际做系统时，chunking 经常更早决定上限。

常见问题是：

- chunk 太小，语义断裂
- chunk 太大，向量不够准，还浪费 token
- overlap 不合理，导致重复或缺失
- 分块方式没贴合文档结构

值得持续研究的方向包括：

- fixed-size chunking
- semantic chunking
- overlap 策略
- parent-child / hierarchical chunking
- Late Chunking

这里最重要的经验不是“某个方法永远最好”，而是：

> chunking 必须和语料形态、查询类型、后续 rerank / generation 方式一起看。

### 6. Hybrid Search 往往比纯 dense retrieval 更像生产默认项

只靠 embedding 做 dense retrieval，很容易在这些场景吃亏：

- 产品编号
- API 名
- 报错字符串
- 代码符号
- 法律条文编号
- 专有名词

因为这类内容往往需要更强的字面匹配。

所以生产里很常见的做法是：

- dense retrieval 负责语义召回
- sparse / keyword retrieval（如 BM25）负责字面召回
- 再做 fusion 与 rerank

这就是 **Hybrid Search** 的基本逻辑。

### 7. Query Transformation 是低成本高收益环节

用户原始 query 经常太短、太口语、太模糊，或者缺上下文。

因此在真正检索之前，先做 query transformation 往往很划算，比如：

- query rewrite
- query expansion
- multi-query retrieval
- HyDE

它的价值在于：

- 提高 recall
- 降低用户提问质量对系统效果的影响
- 常常不需要重写整条检索链

### 8. Post-Retrieval Processing 可以直接改善成本和可控性

检索回来的内容，并不一定要原样全部交给 LLM。

中间可以再做一层整理：

- metadata filtering
- context compression
- chunk summarization
- duplicate removal
- citation alignment

这一层的作用很实际：

- 少给垃圾上下文
- 少浪费 token
- 降低答案跑偏的概率
- 提升引用和证据链的可读性

### 9. 更高阶的方向才是 Agentic / Corrective / Graph RAG

如果基础检索层已经比较稳，下一步才值得看这些更复杂的架构：

- **Agentic RAG**：系统自己决定要不要多搜几轮、换 query、调用工具
- **Corrective RAG**：先判断当前检索结果够不够好，不够就修正流程
- **Graph RAG**：把知识组织成实体关系图，用图结构辅助检索与推理

这些方向决定的是 RAG 从“查资料”升级到“检索驱动推理”的上限，但不适合在基础检索没打稳之前就一头扎进去。

## 当前理解 / 结论

如果从工程角度看，RAG 检索层最值得优先优化的顺序，大致可以记成：

1. 先把 **chunking** 做对
2. 再把 **embedding recall + reranker rerank** 跑顺
3. 然后加上 **hybrid search** 和 **query transformation**
4. 再考虑 **post-retrieval processing**
5. 最后再进入 **agentic / corrective / graph** 这类更复杂的架构

也就是说，真正稳定的 RAG，靠的通常不是某个单点神技，而是：

> 一条从 query 到 context 的 retrieval pipeline，每一层都少犯一点错。

## 待补充

1. semantic chunking 与 Late Chunking 的边界和适用条件
2. Hybrid Search 的具体融合策略（如 RRF）
3. HyDE / multi-query retrieval 的真实收益边界
4. reranker 的 cross-encoder 与 late-interaction 路线差异
5. 不同类型语料下的 chunk size / overlap 经验表
6. 一个通用的 production RAG retrieval reference pipeline

## 相关链接 / 来源

- Grok 分享原文（本次已实际浏览阅读）：<https://grok.com/share/c2hhcmQtMw_bfcbbc2f-d30d-44f3-85ac-fb7d88b5803e>
- 相关 archive：<./0326-jina-embeddings-api-deep-dive>

## 备注

- 这张卡片从原先的 Jina Embeddings 卡中拆出，目的是把 provider-specific 内容和通用 RAG 检索设计拆开。
- 当前内容更偏 retrieval 侧，不讨论 generation prompt、tool use、agent orchestration 等更上层问题。

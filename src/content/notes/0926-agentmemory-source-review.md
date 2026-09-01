---
title: agentmemory 源码解读：本地记忆服务器的完整架构与诚实评测
description: 通读 rohitg00/agentmemory v0.9.29 源码（41k 行）——iii-engine 三原语架构、~50 个 KV scope、supersede 机制、三路混合检索、12 个 hooks 自动抓取、SKILL.md 家规；以及最重要的一节：它自己的 benchmark 显示三路混合检索并不比纯 BM25 好，真正无可争议的收益是 token 预算。
date: 2026-09-02
updatedDate: 2026-09-02
tags:
  - ai
  - agent
  - memory
  - retrieval
  - software engineering
type: research
status: ready
source: https://github.com/rohitg00/agentmemory
relatedNote:
  - 0526-hermes-fts5-session-search
  - 0926-personamem-v3-mem0-failure-modes
draft: false
---

## 核心内容

agentmemory 是一个**本地运行的记忆服务器**（不是库）：HTTP REST（:3111）为主协议，MCP 只是套在上面的一层薄桥。它通过宿主 Agent 的生命周期 hooks 自动抓取工具调用与对话，压缩成结构化 observation，用 BM25 + 向量 + 知识图谱三路混合检索召回，带 capture→compress→consolidate→forget 完整生命周期。本文基于 `--depth 1` 克隆的 main 源码通读（v0.9.29，Apache-2.0，~41,000 行 src），全部数字经源码核实。

规模数据：**54 个 MCP 工具、130 个 REST 端点、6 个 MCP resources、12 个 hooks、15 个 skills、260+ mem::* functions**。仓库里已有现成的 pi 集成（`integrations/pi/index.ts`，302 行，用 pi 原生 ExtensionAPI）。

## 架构：强依赖外部 iii-engine

- 核心设计约束（AGENTS.md 写死）：一切能力必须是 iii-engine 的三原语之一——**Worker / Function / Trigger**，禁止绕过引擎自建 SQLite 或进程内实现。iii-engine 是外部原生二进制，CLI 首次运行自动 `curl | sh` 安装（版本 pin）
- 端口布局：3111 REST / 3112 Streams / 3113 Viewer（实时可视化）/ 49134 引擎；`--instance N` 把整个端口块平移 N×100 支持多实例
- **存储不是文件，是 KV scope**：所有数据是 iii-engine StateModule 里的 KV 记录，物理落盘在单个 `state_store.db`。`schema.ts` 定义了 ~50 个 KV scope，按语义分区（会话/长期记忆/索引/知识图谱/多 Agent 协作/治理/结构化槽位）

## 数据模型：版本化与 supersede

`Memory` 核心字段：`type`（pattern/preference/architecture/bug/workflow/fact）、`concepts`（检索标签，最关键字段）、`strength`（默认 7，用于衰减）、`parentId`/`supersedes[]`/`isLatest`（版本链）、`forgetAfter`（TTL）、`agentId`/`project`（多 Agent/多项目隔离）。

**supersede 机制**：新记忆写入时遍历所有 `isLatest !== false` 的记忆，Jaccard 相似度 > 0.7 即判定为更新版本——旧的标记非最新、version+1、parentId 指向旧的。这是相比纯 markdown 追加的真实优势：**记忆自动去重和演进，而不是无限堆积矛盾内容**。工程细节：Jaccard 分词专门处理了 CJK（分词器 + 字符 bigram shingles 兜底），中日泰文没有词间空格，朴素 split 会把整句折成一个 token 导致去重完全失效——对中文用户是实打实的加分项。

## 检索：三路混合 + RRF

1. **BM25**：自建倒排索引 + 词干还原 + 同义词扩展
2. **向量**：余弦相似；embedding provider 可插拔，默认 local（Xenova/all-MiniLM-L6-v2 进程内跑，不需要 API key）
3. **图谱扩展**：从 query 抽实体，BFS 深度 2

默认权重 bm25=0.4 / vector=0.6 / graph=0.3，RRF 常数 K=60。另有 query expansion（改写 + 时间具体化，各跑一遍再归并）。索引持久化做了**分片**（每片 200 万字符 + manifest + generation 标识）来绕过引擎的单条记录大小限制。

## 写入管线：capture → compress → consolidate → forget

- **Capture**：payload 校验 → 对 (sessionId, toolName, toolInput) 算 hash 去重 → **入库前**隐私过滤（`<private>` 标签内容 + 15 类密钥正则：OpenAI/Anthropic/GitHub/Slack/AWS/Google/JWT/npm/GitLab...）→ 存 RawObservation → 压缩（可走 LLM，也有零 LLM 规则式压缩）
- **Consolidate**：四个 tier——semantic（抽事实）/ reflect（反思）/ procedural（抽工作流）/ decay（按 Ebbinghaus 曲线衰减 strength）
- **Forget**：按 TTL、访问频率、保留分数、磁盘配额多维淘汰

## SKILL.md 家规（最可迁移的资产）

15 个 skills 的结构规范由 CI 脚本强制执行，这套组合与后端架构完全解耦、可直接搬到任何 agent 项目：

- **description 两句式硬规范**：第一句陈述能力，第二句必须以 "Use when" 开头列出具体触发词（CI 用正则校验）——因为 description 是 Agent 决定是否加载 skill 时唯一能看到的东西
- **SKILL.md 100 行上限**，细节强制挪到 REFERENCE.md / EXAMPLES.md 三层分文件
- **固定正文顺序**：$ARGUMENTS → Quick start（含 Expected output）→ Why → Workflow → Anti-patterns（只写最容易犯的那一个错，WRONG/RIGHT 对照）→ Checklist → See also（交叉引用只允许一层深）→ Troubleshooting（单点共享文件，禁止内联）
- **AUTOGEN 防漂移**：数据表由源码直接生成，`--check` 模式下源码改了文档没改就 CI fail

## 最重要的一节：检索质量的诚实解读

用它自己 `benchmark/QUALITY.md` 的数据（240 observation / 20 条带标注 query）：

- **三路混合（默认配置）在 Recall@5、Precision@5、NDCG@10、MRR 四项上都输给纯 BM25**——加了图谱这路反而把 Recall@5 从 43.8% 拉低到 36.8%。它自己的文档只挑 Recall@10（+4%）来说事，回避了其余指标的回退
- 相比 grep 基线（CLAUDE.md），检索质量提升很小（Recall@10 58.0% vs 55.8%）；**真正无可争议的收益是 token 数：3,142 vs 22,610（-86%）**
- LongMemEval-S 上 95.2% R@5 很漂亮，但那是学术长对话基准，不是编码 Agent 场景，且 COMPARISON.md 自己声明只有自家数字可复现

诚实的结论：**agentmemory 的核心价值是「自动抓取 + 自动淘汰 + token 预算」，不是「检索更准」**。痛点是「记忆没人写、写了没人删、全塞 context 太贵」→ 它解决得很好；痛点是「找不到想要的记忆」→ 它提升有限，关掉向量和图谱用纯 BM25 可能反而更好。

## 多 Agent 协作（markdown 方案做不到的部分）

Leases（租约互斥）、Signals（Agent 间异步消息）、Mesh（跨实例同步）、Team（共享记忆池）、Sentinels（条件唤醒）、Routines（cron）、Checkpoints/Replay、Sketches（草稿态记忆）、Slots（结构化槽位）、Crystallize/Lessons（重复模式结晶成教训）、Governance（全变更审计 + 带 reason 的合规删除）、CLIP 图像记忆。`agentId` 和 `project` 贯穿数据模型，跨项目隔离有专门测试。

## 决策建议

- **适合上**：多 Agent 并用要共享记忆、会话量大到 markdown 装不下、要零心智负担的自动记录、需要 commit↔session 溯源（git blame → SHA → 产出它的 session）、有审计合规要求
- **继续用 markdown 更好**：单 Agent 单机、看重记忆可读可手改可进 git、不想为记忆养常驻服务 + 外部二进制、记忆量在几十条量级（这个规模 grep 的 Precision@5 有 78%）、对静默失忆零容忍（服务器不可达时全链路静默降级返回 null，Agent 会不知情地失忆）
- **折中（最推荐）**：markdown 继续当权威可读真相源，只吸收三个方法论：① SKILL.md 家规 ② CI 校验防 skill 腐化 ③ **supersede 语义**——写新记忆时主动检查并取代旧的，这是 markdown 方案最容易学、收益最大的一条

## 当前理解 / 结论

- 记忆系统的核心矛盾从来不是检索算法，是「写入靠自觉、删除靠搬家、上下文靠预算」——agentmemory 用 hooks + supersede + TTL 把三个都机制化了，这个思路比它的具体实现更值得学
- 自家 benchmark 打自家默认配置是少见（且值得尊敬）的诚实；读任何记忆产品的宣传数字前先找它的 QUALITY.md
- 架构上强耦合一个外部原生二进制是把双刃剑：能力上限高，但引擎的 bug 就是你的 bug（CHANGELOG 里已有 37MB WS 帧、137GB 日志两起事故）

## 相关链接 / 来源

- 仓库：[rohitg00/agentmemory](https://github.com/rohitg00/agentmemory)（v0.9.29 调研，2026-08-12）
- 完整源码审阅报告（631 行）留存于本地调研库
- 同主题卡片：PersonaMem-v3 里的 Mem0、Hermes Agent 记忆架构

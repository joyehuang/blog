---
title: agentmemory 源码解读：本地记忆服务器的完整架构与诚实评测
description: 通读 rohitg00/agentmemory v0.9.29 源码（41k 行）——iii-engine 三原语架构、~50 个 KV scope、supersede 版本链、三路混合检索、12 个 hooks 自动抓取、SKILL.md 家规、pi 集成现状；以及最重要的一节：它自己的 benchmark 显示三路混合检索并不比纯 BM25 好，真正无可争议的收益是 token 预算。
date: 2026-09-02
updatedDate: 2026-09-03
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

Agent 记忆的三大死穴：**记忆没人写**（用户不会每次都记得"存一下"）、**写了没人删**（markdown 文件越写越长、越写越自相矛盾）、**全塞 context 太贵**（几千行记忆直接吃掉 token 预算）。agentmemory 就是冲着这三个死穴来的：一个**本地运行的记忆服务器**（不是库），HTTP REST（:3111）为主协议，MCP 只是套在上面的一层薄桥。

它通过宿主 Agent 的**生命周期 hooks 自动抓取**工具调用与对话，压缩成结构化 observation，用 **BM25 + 向量 + 知识图谱三路混合检索**召回，带 capture→compress→consolidate→forget 完整生命周期。本文基于 `--depth 1` 克隆的 main 源码通读（v0.9.29，Apache-2.0，~41,000 行 src，1,596+ 测试），全部数字经源码核实。

规模数据：**54 个 MCP 工具、130 个 REST 端点、6 个 MCP resources、12 个 hooks、15 个 skills、260+ mem::* functions**。

⚠️ 先把最重要的结论放在最前面：**它自己的 benchmark 显示三路混合检索并不比纯 BM25 好**，部分指标上甚至输给 "CLAUDE.md + grep" 基线。它真正的价值在别处——后面专门有一节讲这个。

## 架构：强依赖外部 iii-engine

整体分层长这样：

```
┌─────────────────────────────────────────────────────────┐
│  宿主 Agent (Claude Code / pi / Cursor / Codex ...)      │
│    ├─ 12 个 lifecycle hooks（自动抓取）                    │
│    ├─ 15 个 SKILL.md（教 Agent 何时调用工具）               │
│    └─ MCP stdio 客户端 或 原生扩展                          │
└────────────────────┬────────────────────────────────────┘
        ┌────────────┴────────────┐
   @agentmemory/mcp          直接 HTTP
   (stdio MCP 桥)          (REST :3111)
        └────────────┬────────────┘
                     ▼
┌─────────────────────────────────────────────────────────┐
│  agentmemory worker (node dist/index.mjs)               │
│    src/triggers/api.ts   → 130 个 api::* HTTP triggers   │
│    src/functions/*.ts    → 260+ 个 mem::* functions       │
└────────────────────┬────────────────────────────────────┘
                     │  WebSocket (iii-sdk)
                     ▼
┌─────────────────────────────────────────────────────────┐
│  iii-engine（外部原生二进制，端口 49134）                    │
│    iii-http / iii-state / iii-queue / iii-pubsub /       │
│    iii-cron / iii-stream / iii-observability / iii-exec  │
│    └─ 状态落盘：file_based KV → ./data/state_store.db     │
└─────────────────────────────────────────────────────────┘
```

核心设计约束（`AGENTS.md` 写死）：**一切能力必须是 iii-engine 的三原语之一——Worker / Function / Trigger，禁止绕过引擎自建 SQLite 或进程内实现**。iii-engine 是外部原生二进制，CLI 首次运行自动 `curl | sh` 安装（版本 pin），或走 Docker。这个约束意味着 agentmemory 强依赖一个小众引擎——引擎的 bug 就是你的 bug（后面会讲两个真实事故）。

端口布局：3111 REST（锚点）/ 3112 Streams（实时事件流）/ 3113 Viewer（实时可视化 Web UI）/ 49134 引擎。`--instance N` 把整个端口块平移 N×100，支持多实例并存。

**存储不是文件，是 KV scope。** 不存在"一个 markdown 文件"这种东西——所有数据都是 iii-engine StateModule 里的 KV 记录，物理落盘在单个 `state_store.db`。KV 抽象极薄（`src/state/kv.ts`，47 行），只有 5 个操作：`get / set / update / delete / list`，全部通过 `sdk.trigger()` 走 WebSocket 到引擎。`schema.ts` 定义了 **~50 个 KV scope**，按语义分区：

- 会话与观察：`mem:sessions`、`mem:obs:{sessionId}`、`mem:summaries`
- 长期记忆：`mem:memories`、`mem:semantic`、`mem:procedural`、`mem:lessons`、`mem:crystals`
- 索引：`mem:index:bm25`、`mem:emb:{obsId}`、`mem:latent:{obsId}`
- 知识图谱：`mem:graph:nodes`、`mem:graph:edges`、`mem:graph:snapshot` 等
- 多 Agent 协作：`mem:leases`、`mem:signals`、`mem:mesh`、`mem:team:{id}:shared`
- 治理：`mem:audit`、`mem:retention`、`mem:access`、`mem:checkpoints`

数据目录按平台约定（macOS 在 `~/Library/Application Support/agentmemory`），可用 `--data-dir` 覆盖。

## 数据模型：版本化与 supersede

`Memory` 核心字段（`types.ts`，951 行）：`type`（pattern/preference/architecture/bug/workflow/fact 六类）、`concepts`（检索标签，**最关键的字段**——记忆能不能被找回来全看它）、`files`（关联文件路径）、`strength`（默认 7，用于衰减）、`parentId`/`supersedes[]`/`isLatest`（版本链）、`forgetAfter`（TTL）、`agentId`/`project`（多 Agent/多项目隔离）。原始抓取走两级：`RawObservation` → `CompressedObservation`（带 `facts[]`/`narrative`/`importance`）。

**supersede 机制**是数据模型里最有价值的设计（`src/functions/remember.ts`）：新记忆写入时，遍历所有 `isLatest !== false` 的记忆，**Jaccard 相似度 > 0.7 即判定为"更新版本"**——旧的标记非最新、version+1、parentId 指向旧的。这是相比纯 markdown 追加的真实优势：**记忆会自动去重和演进，而不是无限堆积矛盾内容**。markdown 记忆方案的通病是"同一个偏好改了三次，文件里有三条互相矛盾的说法"，supersede 从数据模型层面解决它。

一个对中文用户实打实的工程细节：Jaccard 分词专门处理了 CJK（`src/state/cjk-segmenter.ts`）。中日泰文没有词间空格，朴素 `split(/\s+/)` 会把整句折成一个 token，导致去重**完全失效**——所有相似度都是 0 或 1。它用分词器 + 字符 bigram shingles 兜底。很多同类项目在这里直接失效而不自知。

## 检索：三路混合 + RRF

`src/state/hybrid-search.ts` 的 `tripleStreamSearch` 三路：

1. **BM25**（`search-index.ts`，自建倒排索引 + 词干还原 + 同义词扩展）
2. **向量**（余弦相似；embedding provider 可插拔，默认 `local`——Xenova/all-MiniLM-L6-v2 进程内跑，**不需要 API key、不花钱**；可选 openai/gemini/cohere/voyage/openrouter，另有 CLIP 图像 embedding）
3. **图谱扩展**（从 query 抽实体，BFS 深度 2）

默认权重 bm25=0.4 / vector=0.6 / graph=0.3，RRF 常数 K=60。另有 query expansion（把原 query 扩展成多个改写 + 时间具体化，各跑一遍再归并去重）。索引持久化做了**分片**（每片 200 万字符 + manifest + generation 标识，5 秒 debounce 落盘）——这是为了绕过 iii-engine 的单条记录大小/WS 帧限制。

## 写入管线：capture → compress → consolidate → forget

**Capture**（`observe.ts`）五步：payload 校验 → 对 `(sessionId, toolName, toolInput)` 算 hash **去重**（命中直接丢弃）→ **入库前**隐私过滤（`stripPrivateData()` 抹掉 `<private>` 标签内容 + 15 类密钥正则：OpenAI `sk-`、Anthropic `sk-ant-`、GitHub `ghp_`、Slack `xoxb-`、AWS `AKIA`、Google `AIza`、JWT、npm、GitLab……）→ 存 RawObservation 推实时流 → 压缩（可走 LLM，也有**零 LLM 规则式压缩**兜底）。入库前脱敏而不是查询时脱敏——密钥根本不该落盘，这个顺序是对的。

**Consolidate**：四个 tier——`semantic`（从 session summary 抽事实）/ `reflect`（反思）/ `procedural`（抽工作流步骤）/ `decay`（按 Ebbinghaus 遗忘曲线衰减 strength）。可整体跑也可单 tier 跑。

**Forget**：`auto-forget.ts` / `retention.ts` / `evict.ts` / `disk-size-manager.ts`，按 TTL、访问频率、保留分数、磁盘配额多维淘汰。

还有一个明智的默认值设计：**耗 token 的功能默认关闭**。`AGENTMEMORY_AUTO_COMPRESS`（LLM 摘要）和 `AGENTMEMORY_INJECT_CONTEXT`（自动上下文注入）都默认 off，理由写得很清楚——这两个的 token 成本与工具调用频率成正比。不装 API key 也能完整跑（BM25 + 本地 embedding），LLM provider 只是让摘要更好看。

## 12 个 Hooks：自动抓取的工程细节

Claude Code 侧通过 `plugin/hooks/hooks.json` 注册，各 hook 抓什么：

- SessionStart 注册 session（可选注入项目上下文）；UserPromptSubmit 捕获意图
- PreToolUse（matcher: `Edit|Write|Read|Glob|Grep`）**注入相关记忆**；PostToolUse 捕获改了什么；PostToolUseFailure 捕获失败——**错误也是记忆**
- PreCompact：在宿主裁剪上下文**之前**抢救内容（这个时机选得很聪明）
- SubagentStart/Stop 子 Agent 边界；Notification/TaskCompleted/Stop/SessionEnd 会话收尾、触发 consolidation
- PostCommit（git hook）：**把 commit SHA 关联到 session**——支撑后面讲的 commit-context 能力

Hook 脚本的工程约束是踩过坑才总结出来的（`AGENTS.md` 写得非常细）。hook 是独立 Node 脚本（不 import iii-sdk），读 stdin JSON → 打 REST → 退出，分两类：

- **注入型**（pre-tool-use / pre-compact / session-start）：要把召回内容写 stdout 给宿主注入，**必须** `try/catch` + `await fetch(..., { signal: AbortSignal.timeout(N) })`。超时是唯一的挂起上界（注入 1500ms / 注册 800ms）
- **纯遥测型**（其余 9 个）：不写 stdout，必须 fire-and-forget `fetch(...).catch(() => {})` 配 `setTimeout(() => process.exit(0), 500).unref()`

为什么必须有那个 `setTimeout`？注释解释了：**没有它，Node 会为了等待 in-flight fetch 保持事件循环存活，hook 就会阻塞宿主的下一轮 prompt 边界长达 AbortSignal 的整个时长——正是 fire-and-forget 本想避免的 bug。** 另有 issue #221 的教训：服务器不可达时 5 秒超时在并发扇出（Slack bot、多 Agent）下会指数放大，形成正反馈把 iii-engine OOM kill 掉，所以超时被压到 800–1500ms。

## REST 是主协议，MCP 是薄桥

官方文档原话："REST is agentmemory's primary surface. **MCP is a bridge on top of it.**" 130 个端点全在 `http://localhost:3111/agentmemory/*` 下。直接好处：非 MCP 宿主可以完全绕开 MCP 直接打 HTTP。

REST 层（`api.ts`，3,295 行）的安全约定由 `AGENTS.md` 强制：**端点必须白名单字段，绝不透传原始 body 给内部函数**；所有状态变更走 `recordAudit()`。鉴权靠 `AGENTMEMORY_SECRET` 启用 Bearer，默认关闭（因为默认只绑 127.0.0.1）。

MCP 层有个**优雅的降级设计**（`rest-proxy.ts` + `standalone.ts`）：stdio MCP 服务器启动时探测 `localhost:3111`（2 秒超时，结果缓存 30 秒）——**探测到**走 proxy 模式，全部 54 个工具可用；**探测不到**降级 local 模式，只有 7 个核心工具（save/recall/smart_search/sessions/export/audit/governance_delete），数据存本地 JSON 文件。并且会在 stderr 明确告知当前模式和原因。这也是官方文档里写"**只看到 7 个工具说明 MCP shim 没连上服务器**"的原因——把一个隐蔽的失败模式变成了可诊断的信号。这比"静默半残"好太多。

协议正确性上踩过的坑（代码注释记录）：JSON-RPC notification（无 `id` 字段）**绝不能回响应**——宽松的客户端能容忍，但 Codex CLI 会判定协议违规直接关闭传输（issue #129）。还有 `${VAR}` 占位符问题：不展开占位符的宿主会把字面量 `"${AGENTMEMORY_URL}"` 传进来——被当成真值、绕过 `||` 兜底、导致 DNS 失败，所以专门写了字面占位符剥离。

另一个值得学（也值得警惕）的做法：一个工具要在 8 个地方登记（tools-registry → server.ts switch → api.ts → 计数日志 → 计数断言 → README → plugin.json → copilot json），`AGENTS.md` 写死 checklist，还有专门的计数一致性测试锁死。**用测试和文档对抗"多处登记"的架构债是成熟做法——但需要这种 checklist 本身就说明抽象层没分好。**

## SKILL.md 家规（最可迁移的资产）

15 个 skills 全在 `plugin/skills/<name>/`，是纯 `<dir>/SKILL.md` 格式，零后端耦合。结构规范由 `write-agentmemory-skill/SKILL.md` 定义，并由 **CI 脚本 `scripts/skills/check.ts` 强制执行**。这套组合与后端架构完全解耦，可直接搬到任何 agent 项目：

- **description 两句式硬规范**：第一句陈述能力，第二句必须以 "Use when" 开头列出具体触发词（CI 用正则校验，不符合直接 fail）。理由：**description 是 Agent 决定是否加载该 skill 时唯一能看到的东西**。例如 remember 的 description："Save an insight, decision, or learning to long-term storage with searchable concept tags. Use when the user says 'remember this', 'save this', 'note that', 'don't forget'..."
- **SKILL.md 100 行上限**，超过直接报错，细节强制挪到 REFERENCE.md（密集事实，自动生成）/ EXAMPLES.md（完整对话实录）三层分文件
- **固定正文顺序**：$ARGUMENTS → Quick start（含 Expected output，给出期望的输出样式）→ Why（支配性原则）→ Workflow（编号步骤含决策关卡）→ Anti-patterns（**只写最容易犯的那一个错**，WRONG/RIGHT 对照，比列十条泛泛建议有效）→ Checklist → See also（交叉引用**只允许一层深**）→ Troubleshooting（单点共享 `_shared/TROUBLESHOOTING.md`，禁止内联）
- **AUTOGEN 防漂移**：参考类 skill 里的数据表由源码直接生成，`<!-- AUTOGEN:key -->` 包裹，`npm run skills:check` 跑 `--check` 模式——源码改了文档没改就 CI fail

8 个可调用 skills 里几个设计亮点：`remember` 强制抽 2-5 个具体 concept 短语并回显给用户（"A memory is only as useful as the terms that retrieve it"）；`forget` 强制**先展示匹配项、拿到用户明确确认才删**；`commit-context` 用 `git blame` 拿 SHA 反查产出该 commit 的 Agent session——回答"这段代码为什么在这"，这个能力 markdown 方案做不到。

## pi 集成现状

仓库里**已经有现成的 pi 集成**：`integrations/pi/index.ts`（302 行）是完整的 pi 原生扩展，用 `ExtensionAPI` 而非 MCP，直接钩进 agent 生命周期：

- 注册 3 个工具（memory_health / memory_search / memory_save）+ `/agentmemory-status` 命令
- `before_agent_start`：拿 prompt 去 smart-search，把 top-5 结果拼进 systemPrompt 返回——**这就是自动召回注入**
- `agent_end`：把最后一条 assistant 消息写回（fire-and-forget）
- 状态栏 🧠 显示连接状态

细节做得不错：`resolveProjectName()` 复刻 hooks 的 project 解析顺序并缓存，目的是让 pi 会话和其他 Agent 落到**同一个 project 桶**；`security.ts` 实现了明文 HTTP 传 Bearer token 的告警。但 8 个可调用 skill 里只有 `remember` 开箱即用——`recall` 要改工具名，`recap`/`handoff`/`forget`/`commit-*` 依赖 pi 扩展没注册的工具。另外 `agentmemory connect pi` 适配器是残缺的（47 行，只会打印手动步骤，`kind: "stub"`）。

## 最重要的一节：检索质量的诚实解读

这是全文最该记住的一节。用它自己 `benchmark/QUALITY.md` 的数据（240 observation / 30 session / 20 条带标注 query）：

| 系统 | Recall@5 | Precision@5 | NDCG@10 | MRR | Tokens/query |
|---|---|---|---|---|---|
| grep 基线（CLAUDE.md） | 37.0% | 78.0% | 80.3% | 82.5% | 22,610 |
| BM25 单路 | **43.8%** | **95.0%** | 82.7% | **95.5%** | 3,142 |
| 双路（BM25+向量） | 42.4% | 90.0% | **84.7%** | 95.4% | 3,142 |
| **三路（默认配置）** | 36.8% | 87.0% | 81.7% | 87.9% | 3,142 |

三个关键观察：

1. **三路混合（默认配置）在 Recall@5、Precision@5、NDCG@10、MRR 四项上都输给纯 BM25**。加了图谱这一路反而把 Recall@5 从 43.8% 拉低到 36.8%。它自己的文档在"Why This Matters"里只挑 Recall@10（58.0% vs 55.8%，"+4%"）来说事，回避了其余指标的回退——这个文档手法本身值得警惕。
2. **相比 grep 基线，检索质量提升很小**；**真正无可争议的收益是 token 数：3,142 vs 22,610（-86%）**。
3. LongMemEval-S 上 95.2% R@5 的数字很漂亮，但那是**学术长对话检索基准，不是编码 Agent 场景**；且 COMPARISON.md 自己声明只有自家数字可复现，其他都是厂商自称。

诚实的结论：**agentmemory 的核心价值是「自动抓取 + 自动淘汰 + token 预算」，不是「检索更准」**。如果你的痛点是"记忆没人写、写了没人删、全塞 context 太贵"——它解决得很好；如果你的痛点是"找不到想要的记忆"——它的提升相当有限，而且用纯 BM25 单路（关掉向量和图谱）可能比默认配置还好。

## vs 简单 markdown 记忆：真实优劣

**agentmemory 赢的地方**：自动抓取（12 个 hooks 无感捕获，这是**最大的差异**——markdown 方案死穴就是没人主动写）；不会无限膨胀（supersede + TTL + Ebbinghaus 衰减 + 配额淘汰）；规模不受上下文限制（索引 + top-k，有 100k 条压测）；跨 Agent 共享（一个服务器同时服务 pi/Claude Code/Codex/Cursor）；commit ↔ session 溯源；入库前脱敏；审计与合规删除（带 reason 的 GDPR 式删除）；多 Agent 协作原语；CJK 去重真的有效。

**markdown 赢的地方**：零依赖零进程（agentmemory 要常驻服务器 + 外部原生二进制 + 4 个端口）；**可读可手改可进 git**——数据在 `state_store.db` 里，不能 `cat`、不能 grep、不能 diff、不能手改，而 markdown 可以直接编辑、走 code review；认知开销小（54 个工具/130 端点/50 个 scope vs 读一个 md 文件）；**没有静默失忆**——agentmemory 服务器挂了全链路静默降级返回 null，Agent 会**在不知情的情况下失忆**（pi 扩展里所有失败都 `return null`）；成熟度（v0.9.29 未到 1.0，CHANGELOG 189KB，API 仍在变）。

两个真实事故说明引擎耦合的代价：75K 节点规模下 `kv.list` 全量枚举产生 37MB WS 帧，解析阻塞心跳，worker 被判定死亡（#814）；以及一次 137GB 的日志事故（#519）。引擎的 bug 就是你的 bug。

**多 Agent 协作是 markdown 方案完全做不到的部分**，也是它真正的差异化：Leases（多 Agent 抢占互斥）、Signals（Agent 间异步消息）、Mesh（跨实例同步）、Team（共享记忆池）、Sentinels（条件唤醒）、Routines（cron）、Checkpoints/Replay、Sketches（草稿态记忆）、Slots（结构化槽位）、Crystallize/Lessons（重复模式结晶成教训）、Governance（全变更审计 + 合规删除）、CLIP 图像记忆（能记住截图）。`agentId` 和 `project` 贯穿数据模型，跨项目隔离有专门测试。

## 决策建议

**适合上 agentmemory**：多 Agent 并用要共享记忆；会话量大到 markdown 装不下；要零心智负担的自动记录；需要 commit↔session 溯源（git blame → SHA → 产出它的 session）；有审计合规要求。

**继续用 markdown 更好**：单 Agent 单机；看重记忆可读可手改可进 git；不想为记忆养常驻服务 + 外部二进制；记忆量在几十条量级（这个规模 grep 的 Precision@5 有 78%，完全够用）；对静默失忆零容忍。

**折中（最推荐先试）**：markdown 继续当权威、可读、可进 git 的真相源，只吸收三个方法论——

1. **SKILL.md 家规**（两句式 description + 100 行上限 + 三层文件 + WRONG/RIGHT 对照）
2. **CI 校验防 skill 腐化**（AUTOGEN + `--check` 模式）
3. **supersede 语义**——写新记忆时主动检查并取代旧的，而不是无脑追加。这是 markdown 方案最容易学、收益最大的一条

## 可直接借鉴的工程实践清单

不管最终是否引入，这十条本身值得抄：

1. skill description 两句式硬规范 + CI 正则校验——因为它是 Agent 选择加载时唯一可见的信息
2. SKILL.md 100 行上限 + 三层分文件——强制保持可扫读
3. AUTOGEN 块 + `--check` 模式防文档漂移——数据表从源码生成，改源码不改文档就 CI fail
4. Anti-patterns 只写最容易犯的那一个，WRONG/RIGHT 对照
5. 共享 Troubleshooting 单点维护 + 禁止内联，交叉引用只允许一层深
6. hook 的两类超时模式（注入型 await+timeout / 遥测型 fire-and-forget + `setTimeout().unref()`）——踩过"hook 阻塞宿主 prompt 边界"的坑才总结出来的
7. 耗 token 的功能默认 off，并在文档里解释成本模型
8. 降级模式要可诊断（"只看到 7 个工具 = shim 没连上"），而不是静默半残
9. 多处登记的 checklist + 计数一致性测试——用测试锁死架构债
10. 入库前脱敏而非查询时脱敏——密钥根本不该落盘

## 当前理解 / 结论

- 记忆系统的价值分层要看清：**自动抓取 + 自动淘汰 + token 预算**是 agentmemory 被验证的价值，**检索更准**不是——它的自家 benchmark 亲手证明了三路混合不如纯 BM25，加图谱那一路甚至拉低 Recall
- supersede 版本链是比"检索"更本质的设计：记忆需要演进语义（新取代旧），不是追加语义（越积越多）。这个思想对任何记忆方案（包括纯 markdown）都适用
- 中文去重的 CJK 分词兜底是个容易被忽视但决定成败的细节——朴素的空白分词会让 Jaccard 在中文上完全失效
- 评估一个记忆系统时，先问它相对 grep 基线到底提升了什么：如果答案是 token 而不是准确率，那就按 token 工具来定价，不要为"更聪明"付架构复杂度的钱

## 相关链接 / 来源

- 官方仓库：[rohitg00/agentmemory](https://github.com/rohitg00/agentmemory)
- 审阅版本 v0.9.29（Apache-2.0），完整调研报告（631 行）留存于本地调研库
- 同主题卡片：Hermes FTS5 会话检索、PersonaMem-v3 × Mem0 失败模式

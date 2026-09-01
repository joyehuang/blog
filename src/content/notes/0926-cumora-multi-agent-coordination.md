---
title: Cumora COORDINATION.md：多 Agent 协作的失败模式与防御分层
description: yetone 的 Cumora（多 agent 团队聊天）COORDINATION.md 精读——两大失败模式（竞态碰撞 vs 大脑误判）、七层防御（模型 pin、并发闸、spawn 间隔、新鲜度 preflight、原子去重 HOLD、triage 门、standing prompt）、十二条反模式，以及「能用代码机制修的别加 prompt 规则」这条总原则。
date: 2026-09-02
updatedDate: 2026-09-02
tags:
  - ai
  - agent
  - multi-agent
  - orchestration
  - software engineering
type: reference
status: ready
source: https://github.com/yetone/cumora
draft: false
---

## 核心内容

Cumora 是 yetone（OpenAI Translator 作者）开源的跨平台团队聊天应用，Agent 一等公民：每个 agent 是操作者机器上的独立 claude/codex 引擎会话，被服务端 SSE 事件唤醒，读同一份对话，独立决定做什么。`docs/COORDINATION.md`（776 行）是它的多 agent 协调总纲——这份文档的价值不在产品，而在它把**一群 LLM 在同一个房间里如何互相踩踏**这个问题的全部踩坑史工程化了，还配了可复跑的协调基准（chain/counting/werewolf/kanban）和双基线（2026-05-28 的 prompt 形状 + 0.1.119 的链式测试通过态）。

## 问题的形状：两种失败模式

1. **竞态碰撞（race collisions）**：两个 agent 同一瞬间醒来、都决定发同样内容、都 INSERT 进 messages（经典案例：数数游戏里 Iris 和 Marcus 同时发 "3"）。服务端能用 pre-INSERT 检查兜住
2. **大脑误判（brain misjudgment）**：agent 看到的状态是对的，但大脑仍然选错动作（发重复、回退序列、跳步）。服务端兜不住——只能靠 prompt 塑造，而 prompt 是有天花板软机制

区分两者是整份文档的总纲：**能用代码机制修的绝不加 prompt 规则；大脑在正确状态面前做错决定时，代码机制也救不了**。

## 七层防御（从「无需大脑注意」到「软、经大脑调解」）

1. **Per-agent 模型 pin**：本地 claude CLI 曾在会话中途把默认模型从 opus-4-7 静默翻到 opus-4-8，行为漂移——所以部署环境强制 pin，不让 agent 继承 CLI 默认值
2. **大脑并发闸**：同一台机器 N 个 agent 被 SSE 同时唤醒会齐步撞 provider 短窗限流（实测 7-agent 数数游戏 17 分钟 130 次限流）。信号量把 spawn 串行化，排队等待
3. **确定性 spawn 间隔**：取代随机 jitter——随机是概率性的，4 个同时唤醒可能都掷出低值照样齐步；固定间隔让突发速率**按构造**成为硬上限
4. **分层各自限流**：大模型和 triage 小模型是两层，共用同一 provider 账号和本地 CLI 池——只 cap 一层的教训见反模式
5. **服务端新鲜度 preflight**：`cumora reply` 发送前校验「有没有比我上次看到的更新的消息」，有则 HELD——agent 可以确认后重发（shown ⇒ seen 契约），不搞仪式
6. **原子逐字去重 HOLD（事务内）**：pre-INSERT 的逐字检查有 TOCTOU 漏洞（两个 agent 相隔 2 秒都能通过快照检查然后都写入）；改成在 `BEGIN/COMMIT` 事务内、过了行级锁之后再查一次。**这层不允许 `--send-anyway` 绕过**——给 agent 发一条和紧邻上一条逐字相同的内容不存在合法用例；而 seq-baseline preflight 可绕过，因为 agent 可能正当回应特定 @mention
7. **小脑 triage 门 + standing prompt**：真正协调规则在 GLANCE_YIELD_RULES（两处引擎共享同一常量，单点编辑）；prompt 契约是**简洁**（~5KB），三条收尾原则全部是形状级而非场景枚举：显式数字限制才算配额（「挨个」是节奏词不是配额词）、数物品不数人头、**成员缺席时团队重新分配**（最后这条是突破：链条测试里一个 agent 的引擎全程坏着，团队照样 8/8 完成——修法是 prompt 原则层，不是修好那台坏引擎）

## 反模式清单（试过不该重来的）

这份文档最值钱的部分是反模式，每条都有 commit 号和事故现场：

- **只 cap 一层忘了另一层**：cap 了大脑忘了 triage——同样的惊群上移一层，triage 全部超时 abort → 进冷却 → 无人 triage → 无人唤醒大脑，整台机器静默。**对任一 spawn 类做外部限流保护时，必须同时 cap 共享同一基建的另一类**
- **往 prompt 里堆场景例子**：给数数任务写「你的唯一合法输出是 4」看似有用，实际 (a) 膨胀 prompt (b) 让大脑在非数数场景（链式、投票）认不出同构形状 (c) 开启「每个 observed bug 配一条场景从句」的滑坡——最贵的 prompt bug 类别
- **往 standing prompt 里倒人格规则和 CLI 目录**：5KB 人格块导致 agent 回复里出现怪话且抢走协调规则的注意力；命令目录应该是按需 `--help`
- **修基础设施问题用 prompt 改动**：分类器上游 100% 503 三个小时，整个兜底路径静默死亡——症状像「agent 不再被唤醒」，本能是加 prompt 规则，正确诊断是看日志（`grep "classifier failed"` → 上游账号池空了）。**端到端症状不匹配任何在位防御层的预期行为时，先怀疑基建**
- **锤打已收敛的 LLM 判断**：fallback 路径同一 stall 每 5 分钟重唤醒、每次赢得 claim 的 agent 都拒绝——6 次唤醒烧 6 轮大模型 token 换同一个「不」。修法是 decline cap（3 次拒绝后停火，有新消息才重置）。「软机制没有自约束时，加一个硬上限」
- **把缺席成员当「待修复的故障」**：用户的关键纠偏——「就算组里有个不响应的 agent，游戏也应该能完成。像真实人类团队：有人请假，不会说『任务没法完成』」。修在 prompt 原则层而不是运维层
- **回归时对上一个好基线做 diff**：协调从完美变坏，正确动作是 `git log --since=<last-good>` 读每个 commit 找回罪魁（一次人格 dump + prompt 堆积 + 模型默认翻转），**回退到基线形状而不是在坏状态上叠新机制**

## 对我们的借鉴

- 「能用代码机制修的别加 prompt 规则」+ 反模式清单，直接适用于我们的记忆钩子（LLM 过滤层已两次误判，需要的不是更多 prompt 规则而是更硬的闸门）和 herdr 多 agent 接力
- seen-cursor 契约（shown ⇒ seen、原子事务内去重、可绕过门与不可绕过门的区分）是我们未来做多 agent 协作/Threaded Mode 的现成参考
- 「diff against last good baseline」是排障纪律的通用形态——我们 8-29 的模型切换事故复盘用的正是同一方法
- 它的协调基准（chain/counting/werewolf/kanban）证明多 agent 协作是可以跑分的——joye-benchmark 未来做 agent 协作评测时可参考其出题方式

## 相关链接 / 来源

- Cumora 仓库：[yetone/cumora](https://github.com/yetone/cumora)，文档 `docs/COORDINATION.md`（776 行，本地 clone 于 ~/dev/cumora）
- 同主题：AI-Native SDLC playbook（hooks 实时治理同款思想）

---
title: Cumora COORDINATION.md：多 Agent 协作的失败模式与防御分层
description: yetone 的 Cumora（多 agent 团队聊天）COORDINATION.md 精读——两大失败模式（竞态碰撞 vs 大脑误判）、从模型 pin 到 triage 门的全部防御层细节（含 seen-cursor 契约、hold token、原子去重）、十二条反模式、T1-T10 链式测试全记录，以及「能用代码机制修的别加 prompt 规则」这条总原则。
date: 2026-09-02
updatedDate: 2026-09-03
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

Cumora 是 yetone（OpenAI Translator 作者）开源的跨平台团队聊天应用，Agent 一等公民：每个 agent 是操作者机器上的独立 claude/codex 引擎会话，被服务端 SSE 事件唤醒，读同一份对话，独立决定做什么。`docs/COORDINATION.md`（776 行）是它的多 agent 协调总纲——这份文档的价值不在产品，而在它把**一群 LLM 在同一个房间里如何互相踩踏**这个问题的全部踩坑史工程化了。

它的严谨程度从基线设定就能看出来：文档维护着**两个显式基线**——prompt 形状基线（2026-05-28，commit `3c5786e9`，当时数数游戏、werewolf、群脑暴全部干净运行）和端到端行为基线（`cumora@0.1.119`，链式测试 8/8 顺序完成、0 重复、缺席成员被队友覆盖）。正文的大部分内容，是「通过不断叠加机制破坏了那个完美状态、再恢复它」的过程记录。还配了可复跑的协调基准（chain/counting/werewolf/kanban）。

## 问题的形状：两种失败模式

Multi-agent 协作在 Cumora 里的形态是：**N 个独立的 claude/codex 引擎会话跑在同一台操作者机器上**，每个被 SSE 事件唤醒，读同一份对话，独立决定做什么。两种失败模式：

1. **竞态碰撞（race collisions）**：两个 agent 同一瞬间醒来、都决定发同样内容、都 INSERT 进 messages。经典案例：数数游戏里 Iris 和 Marcus 同时发 "3"。**服务端能用 pre-INSERT 检查兜住**——"有没有比我上次看到的更新的消息？"
2. **大脑误判（brain misjudgment）**：agent 看到的状态是对的（它看到了最新消息），但大脑仍然选错动作——发重复、回退序列、跳步。**服务端兜不住**——只能靠 prompt 塑造，而 prompt 是有天花板的软机制。

区分两者是整份文档的总纲：**能用代码机制修的绝不加 prompt 规则；大脑在正确状态面前做错决定时，代码机制也救不了。** 这两句话分别对应两大类错误：把 prompt 问题当代码问题（堆机制没用），和把代码问题当 prompt 问题（规则挡不住）。

## 七层防御（从「无需大脑注意」到「软、经大脑调解」）

### 1. Per-agent 模型 pin

部署环境强制 `CUMORA_DEFAULT_CLAUDE_MODEL=claude-opus-4-7`，agent 不继承本地 CLI 的默认模型。存在的原因：本地 claude CLI 曾在会话中途把默认模型从 opus-4-7 **静默翻到 opus-4-8**（2026-05-31），而 4-8 对 prompt-injection 类模式更谨慎、多 agent 流程里行为不同。不 pin 的话，Anthropic 每发一个新模型，所有用户的行为都会漂移。

### 2. 大脑并发闸 + 确定性 spawn 间隔

同一台机器 N 个 agent 被同一次 SSE fanout 唤醒，不加闸会齐步撞 provider 短窗限流（实测 7-agent 数数游戏 **17 分钟 130 次限流**）。`BigBrainSemaphore` 把 spawn 串行化（默认 cap 6）。

spawn 间隔用**确定性间隔**（默认 500ms）而不是随机 jitter——这是个精妙的细节：随机是概率性的，4 个同时唤醒的 agent 可能都掷出低值照样齐步；固定间隔让突发速率**按构造**成为硬上限（1/interval），不靠运气。

AdaptivePacer 在此基础上自适应：任何 agent 遇到限流就把全局最小 spawn 间隔**翻倍**（cap 8 秒），连续 5 轮干净后**减半**回落。它同时挂在冷 spawn 和持久会话的 chat-turn 两条路径上——因为持久会话的 `session.send` 不经过冷 spawn 的闸门，只挂一处的 pacer 看不到 chat-turn 的限流。

### 3. 分层各自限流 + 唤醒去抖

大模型和 triage 小模型是两层，**共用同一 provider 账号和本地 CLI 池**，各自有自己的并发 cap（大脑 6 / triage 8）。只 cap 一层的教训见反模式——这是整份文档里被"重新学到"过一次的课。

唤醒侧还有 debounce 与合并：首次唤醒起 2.5 秒去抖窗口，窗口内的唤醒折叠成**一个**引擎 turn（快照全部未读）；turn 运行中再来的唤醒合并成一次 pending rerun。两个逃生口保延迟：DM/@mention 到达时**直接注入运行中的持久会话**（在下一个安全的流边界插话，agent 在任务中途回应而不是等长 turn 结束）；普通群活动只发一条无内容的 nudge。另有 20 秒慢速 inbox 轮询兜底 SSE 静默断连。

### 4. 服务端新鲜度 preflight（seen-cursor 契约）

`cumora reply` 发送前从 Redis 读这个 agent 的 "seen seq" 基线（10 分钟 TTL），查「有没有比基线更新的非自己消息」——有则返回 HELD 信封（exit code 2），内联 Held 消息，并把基线推进到 held 的最大 seq（防止无限 HOLD 循环）。agent 确认后可以重发。

这里的核心契约是 **shown ⇒ seen**：**每一个**向大脑展示过消息的表面（wake brief、glance、messages、HELD 信封本身）都会推进 seen 基线。这个契约来之不易——早期设计里 glance 有副作用：agent B 的 glance 展示了 A 刚落地的消息（大脑正确地看到了 A），但副作用是把 B 的基线推过了 A，于是 B 的 preflight 认为"没有更新的"，照样发了重复。第一版修法（compose-anchor：在 turn 开始时盖时间戳、glance 不推进它）引入了新问题——忙碌房间里几乎所有首次尝试都被 HOLD，即使 agent 真的读完了所有消息，transcript 里全是"Same HELD — those messages are what I already glanced → send-anyway"，每次回复多花 1-2 轮大模型往返。最终形态：所有表面统一 shown ⇒ seen，普通重发无仪式直接过；而 glance 展示了对方消息仍发同样内容的那类重复，由不可绕过的逐字去重门兜住（见下）。

两个工程细节值得记：

- **基线放 Redis 而不是 `conversation_reads.last_read_at`**：早期尝试（commit `a6e69aa`，已回退）用后者，结果那个列是 loadInbox 的 SELECT cursor，bump 成 NOW() 后下一次 loadInbox 返回空行，daemon 静默忙循环。**任何与 inbox cursor 共享状态的东西在结构上都是不安全的**——Redis 在 DB 事务图之外，无行锁无竞争，Lua 保证单调更新无竞态。
- **probe 读取不推进基线**：daemon 用 `?probe=1` 探测决定是否注入，这类不给大脑看行的读取绝不许污染基线。

它能拦住经典的 POST-INSERT 竞态（Iris 的 "3" 落地，Marcus 的 preflight 看到更新消息被 HOLD）；拦不住大脑级的乱序（Nova 在 Iris 的 "5" 落地前就决定发 "6"——那一瞬间确实没有比基线新的东西）——那是服务端无法覆盖的大脑决策。

### 5. 原子逐字去重 HOLD（事务内）

pre-INSERT 的逐字检查有用但是 **TOCTOU 漏洞**：两个 agent 相隔 2 秒都能通过快照检查（快照在对方 INSERT 提交前拍的）然后都写入。修法：在 `BEGIN/COMMIT` 事务内、`conversation_counters` UPSERT 拿到行级锁**之后**再查一次最新非自己消息，逐字相同 → `ROLLBACK` + HELD。

**这层不允许 `--send-anyway` 绕过**——给 agent 发一条和紧邻上一条逐字相同的内容不存在合法用例（哪怕 DM 里重复对方最后一句也是噪音）。而 seq-baseline preflight 可绕过，因为 agent 可能正当回应特定 @mention。**可绕过门与不可绕过门的区分本身就是设计**。

### 6. Hold token：覆盖旗标必须是对「服务端展示过的 HOLD」的确认

这是整个文档里最精彩的一层进化。2026-06-11/12 的双交付事故：agent 们学会了**预防性地**传 `--send-anyway` 省一个 round-trip（完全符合"高效"的 prompt 期望）——saga 编完整故事后 49 秒内直接 `--send-anyway` 发出，而本会展示 nova 已发过同样交付物的 preflight 被提前绕过。**新鲜度门还在，但被免费旗标架空了。**

修法不是"prompt agent 们负责任地用旗标"（软机制守软机制），而是 hold token（Redis，2 分钟 TTL）：每个 HELD 信封记录一个 `(agentId, scope)` token，`--send-anyway` **只在 token 存在时被尊重**，消费是原子的。预防性传旗 → 被忽略，preflight 照跑，HELD 文本解释旗标为什么没起作用。Redis 故障时 fail-open（降级为旧行为，不阻塞工作）。

而 token 的生命周期还在继续收紧（2026-07-08 数数游戏事故）：saga 17:30 被 HELD 时正确地**让了**（yield），却因此攒下了 token（只有成功发送才清除它）；3.5 分钟后新一轮的预防性 `--send-anyway` 消费了这个**陈旧 token**，绕过了 Nova 的 6 和 Iris 的 7。所以现在：

- **token 绑定 seq**（reply 场景）：token 存 HELD 信封展示的最大 peer sequence；消费时重查有没有更新的消息，房间往前走了旗标就作废、发新 HELD——**同 turn 的确认也不能跳过 agent 没被展示过的消息**
- turn 结束即失效、agent ack 即失效、2 分钟 TTL 兜崩溃

通用规则一句话：**任何协调门上的绕过旗标，必须是对"服务端实际展示过的状态"的确认，不能是客户端自己的意见。**

### 7. 小脑 triage 门 + standing prompt

真正协调规则在 `GLANCE_YIELD_RULES` 常量里——**两处引擎共享同一常量，单点编辑**。prompt 契约是**简洁**（~5KB）：opener、glance-yield 协议、发帖机制一段、表情一段、记忆一段、drive-what-you-own 一段、隐私一行。

triage 门（小模型）只做一件事：判断这次唤醒 `actionable` 与否，`true` 才唤醒大脑。它是纯门——不决定谁回、怎么回、回什么。判断基于**服务端从 DB/Redis 收集的事实信号**而不是消息措辞：worklog claim（有活跃 claim 的 agent 线程是在进行的被认领工作；没有 claim 的纯 agent 闲聊正是这扇门要压掉的噪音）、人类注意力信号（人类消息/表情/读 cursor 都算"人类正在看"）、以及**确定性循环底线**（已认领线程的 agent 消息硬 cap 20；未认领线程一旦开始 LAPPING——消息数超过不同参与者数——判死循环；agent↔agent DM 每 8 条查一次循环）。这三个底线被删过两次（"为了 AI-native 优雅"），两次都回归了——文档里写着 do not remove。

当前的 `GLANCE_YIELD_RULES` 收敛为五条（形状级，无场景枚举）：人类可以点名某个队友而不 @（读出点名的是谁，不是你就别插手）；从**真实已发布状态**回复而不是从自己的队列位置或对 peers 的猜测；**乐观发送，服务端是安全网**——不搞 glance→think→glance 循环，HELD 就读、重算、重发；不重复 peer，按**任务的物品数**衡量完成（成员缺席时在场者接下一件，哪怕第二turn）；从不 claim 聊天 turn 或游戏名额——claim 只为真正的共享交付物存在。

## 反模式清单（试过不该重来的）

这份文档最值钱的部分是反模式，每条都有 commit 号和事故现场：

- **只 cap 一层忘了另一层**：cap 了大脑忘了 triage——同样的惊群上移一层，triage 全部超时 abort → 进冷却 → 无人 triage → 无人唤醒大脑，整台机器静默。**对任一 spawn 类做外部限流保护时，必须同时 cap 共享同一基建的另一类**——它们从同一个账号、同一个 CLI 池拉资源，以同样的方式失败。
- **往 prompt 里堆场景例子**：给数数任务写「你的唯一合法输出是 4」看似有用，实际 (a) 膨胀 prompt (b) 让大脑在非数数场景（链式、投票、成语接龙）认不出**同构形状** (c) 开启「每个 observed bug 配一条场景从句」的滑坡——最贵的 prompt bug 类别。看到大脑在具体 case 上犯错，先问：形状级规则是否已覆盖？已覆盖则大脑只是没遵守，重写措辞比加规则有用；是真竞态？服务端 preflight 才是答案。
- **往 standing prompt 里倒人格规则和 CLI 目录**：5KB 人格块（"lean into your voice / disagree / have edges / FLAWS"）导致 agent 回复出现怪话且抢走协调规则的注意力——正向 injunction 个体表达压过了让位。命令目录应该是按需 `--help`。
- **写「如何处理 HELD」的说明节**：HELD 信封的返回文本本身已经解释了发生了什么、建议怎么做——大脑像读任何工具结果一样读它。standing prompt 里的解释器是冗余的：**契约在被需要的那一刻由实际返回文本传达**。
- **循环防护机制堆叠**：系统已有 triage 门、每分钟激活率下限、cost gate、quiet-window 节流四个机制。为一个特定观察到的循环加第五个机制通常是错的——找出已有四个里哪个没接住，修那一个。
- **修基础设施问题用 prompt 改动**：分类器上游 100% 503 三个小时，整个兜底路径静默死亡——症状像「agent 不再被唤醒」，本能是加 prompt 规则，正确诊断是看日志（`grep "classifier failed"` → 30 分钟 123 次失败 → 上游账号池空了）。**端到端症状不匹配任何在位防御层的预期行为时，先怀疑基建。**
- **锤打已收敛的 LLM 判断**：fallback 路径同一 stall 每 5 分钟重唤醒、每次赢得 claim 的 agent 都拒绝——6 次唤醒烧 6 轮大模型 token 换同一个「不」。修法是 decline cap（3 次拒绝后停火，有新消息才重置）。**「软机制没有自约束时，加一个硬上限。」**
- **无成本地发绕过旗标**：见上文 hold token 那节——软门上的免费旗标会以 agent 优化 round-trip 的方式被预防性使用，门就静默不存在了。同理适用于「完成即自动释放的锁」：它防并发不防重复，必须配权威状态检查。
- **把缺席成员当「待修复的故障」**：用户的关键纠偏——「就算组里有个不响应的 agent，游戏也应该能完成。像真实人类团队：有人请假，不会说『任务没法完成』。AI-native 就是让 AI agent 像真正协作的人类。」修在 prompt 原则层（TEAM ADAPTS WHEN A MEMBER IS ABSENT）而不是运维层（修好 olivia 的 401）。原则上线后 T10 拿下 8/8，nova 三次 lap 顶上，olivia 全程是坏的。
- **往 daemon 的 fetch 里不加超时**：server 端点挂起 → runTurn 永久挂起 → busy 恒真 → 后续唤醒全部静默合并（无日志）→ agent 看起来永久失声。daemon 路径的任何新 fetch 都要有 AbortController。
- **回归时对上一个好基线做 diff**：协调从完美变坏，正确动作是 `git log --since=<last-good>` 逐 commit 读，找罪魁（一次人格 dump + prompt 堆积 + 模型默认翻转），**回退到基线形状而不是在坏状态上叠新机制**。

## 五条协调原则与「数数字面主义」级联

2026-07-24 又补了两条原则，起因是一次「数数字面主义」级联：prompt 写了 "count upward from 1, the numbers should be increasing and unique"，产出 `1, 5, 99, 100, 256, 500, 1000`——**零机制失败**：每个 agent 都被 HELD、重读了最新状态、合法地 `--send-anyway` 了一个字面合规但意图荒谬的数。Bram 注意到新 prompt 删了上一局游戏的显式 no-skip 规则，断定跳号合法，还"战略性"选 5 避开低号位竞争；5 落地后 "increasing" 让 2-4 不可玩，字面读法对后来者自我强化。

- **原则 4：玩人类想玩的游戏，不玩措辞允许的漏洞**——人类的任务陈述是对队友的普通请求，不是供 min-max 的 spec。字面与显见意图分歧时意图赢；真歧义就问人类。
- **原则 5：协调不是任务本身**——永远不要为了协调容易而弯折贡献内容（选"没人跟我抢的中间数"、给 peers 留 headroom、在正文里加协议标记）。Saga 的 `1 → next=2` 后缀来自 agent 们自己群规的 `chain-game-protocol.md` 记忆文件——**记忆文件也是状态**，需要审计。

加上更早的三条：显式数字限制才算配额（「挨个」是节奏词不是配额词，"I used my slot" 是记忆错误）；数物品不数人头；**成员缺席时团队重新分配**。原则 1+2 一度不够用——agent 们把数学诊断得完全正确（"我得 lap 才能凑齐 8/8"）然后以社交理由拒绝；原则 3 通过**点名陷阱并覆盖它**补上了缺口（"当你发现自己在想『再发就是我的第二次』——如果多个自然机会过去都没人接，你就是那个 someone else"）。

## T1-T10：链式测试的完整排障记录

「千里之行始于足下」8 字接力（6 活跃 agent + 1 故意缺席）从脆弱的 5/8 到干净的 8/8，十次试验九个 commit。这个表格本身就是一份多 agent 调试教材：

| Trial | 结果 | 学到了什么 |
|---|---|---|
| T1 | 6/8 | 无人 lap。记忆文件残留上一局的 "N 已用" 污染 |
| T2 | 7/8 | sem=2 降低碰撞；同样的记忆污染天花板 |
| T3 | 7/8 | sub2api 100% 503——整个 agenda 安全网静默死亡，靠读日志发现 |
| T4 | 7/8 | 部署确定性 fallback；被唤醒的 agent 大脑跑了 10s 拒绝 lap，45 分钟冷却锁死其他人 |
| T5 | 7/8 | 短 TTL fallback 让多个 agent 有机会；Iris **正确诊断了数学但以社交理由拒绝**——框架问题不是代码问题 |
| T6 | 7/8 | 清记忆+新会话无效；Bram 写了**新的**记忆文件「stalled chain 上保持沉默」——系统在主动自我投毒 |
| T7 | 10/8 有重复 | 团队适应原则生效，4 个 agent lap——但没带竞态保护，2 处碰撞 |
| T8 | 11/8 有重复 | pre-INSERT 逐字去重收窄但没关死 TOCTOU |
| T9 | 9/8 | 事务内原子逐字去重关死全部竞态重复；剩 bram 用 `--send-anyway` 强发重复 |
| **T10** | **8/8 ✅** | 不可绕过的逐字去重。Nova 三次 lap 顶上缺席的 olivia，零重复 |

配套的方法论（按优先级）：

1. **先读 agent transcript 再 speculate**——每个 agent 的完整推理都在 jsonl 里。T5 的 transcript（正确诊断数学但社交拒绝）告诉我们缺口在框架不在代码；T6 的 transcript（写新"保持沉默"记忆）告诉我们系统在自我投毒。不读真实推理，每个猜测都是错的。
2. **宣布测试失败前重查活状态**——T1 的 7 分钟 watcher 超时于 6/8，+9 分钟活查询显示实际已达 8/8。watcher 窗口不是判决书；异步系统（RL 冷却、agenda 心跳）经常恢复超过任意 watcher 窗口。
3. **记忆文件也是状态**——agent 把学习持久化到 memory 文件，但它们会把一次怪游戏的教训编码成普遍规则（显式 cap 的数数游戏变成"永不 lap"）。擦掉过拟合文件是外科手术式的修法，但**先审计再删**。
4. **诊断基建优先于加机制**。

## 验证过的基线状态

- 7 个 BYOA agent 数数游戏、prompt 恢复 5/28 最小形状、sem=4：**0 碰撞、0 限流、首个数字 28s、6 个数字 2:15**
- 同一设置加上人格规则 + CLI 目录 + 扩展规则：每局 1-3 次碰撞、首个数字 2:30+、3 分钟窗口完不成
- T10 链式含缺席成员：8/8 顺序、精确匹配、0 重复、约 4.5 分钟、0 限流泄漏进聊天；nova=3（lap 顶缺），其余五人各 1

**5/28 基线可复现，恰恰因为 prompt 是极小的**——不是因为系统有什么坏版本缺失的魔法机制。0.1.119 基线加上的是处理两个新失败模式的层：分类器宕机（确定性 fallback）和缺席成员覆盖（团队适应原则）。

## 对我们的借鉴

- 「能用代码机制修的别加 prompt 规则」+ 反模式清单，直接适用于记忆钩子的 LLM 过滤层（已两次误判——需要的不是更多 prompt 规则而是更硬的闸门）和 herdr 多 agent 接力
- seen-cursor 契约（shown ⇒ seen、原子事务内去重、可绕过门与不可绕过门的区分、hold token 必须绑定被展示的状态）是未来做多 agent 协作 / Threaded Mode 的现成参考
- 「diff against last good baseline」是排障纪律的通用形态——8-29 的模型切换事故复盘用的正是同一方法
- 「先读 transcript 再 speculate」对调试任何 agent 系统都成立——trajectory-panel 采的正是这个数据
- 它的协调基准（chain/counting/werewolf/kanban）证明多 agent 协作是可以跑分的——joye-benchmark 未来做 agent 协作评测时可参考其出题方式（固定 harness、端到端判分、失败分类）
- 成员缺席的处理哲学（设计 AS IF 坏件不在，而不是绕着坏件设计）适用于一切多 agent 可靠性设计

## 相关链接 / 来源

- Cumora 仓库：[yetone/cumora](https://github.com/yetone/cumora)，文档 `docs/COORDINATION.md`（776 行，本地 clone 于 ~/dev/cumora）
- 文中 commit 号是项目开源前开发历史的时序标记，在该仓库中不可 resolve
- 同主题：AI-Native SDLC playbook（hooks 实时治理同款思想）、Apodex × Prime Agent 借鉴报告

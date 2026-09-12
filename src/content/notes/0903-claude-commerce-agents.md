---
title: Anthropic Commerce Agents 蓝图：电商 Agent 的官方参考实现与安全分层
description: Anthropic 2026-09-02 开源的 commerce-agents 蓝图完整拆解——shopping agent（顾客侧）与 merchant agent（店员侧）双角色设计、定义与运行时分离（Messages API / Agent SDK / Managed Agents 三跑法）、provenance gates / staging / host approval 的代码级安全分层（docs/safety.md 逐条）、skills 即业务流程的组织方式，以及对 atypica 和企业 agent 建设的直接参考价值。
date: 2026-09-03
updatedDate: 2026-09-03
tags:
  - ai
  - agent
  - guardrails
  - ecommerce
  - architecture
type: reference
status: ready
source: https://github.com/anthropics/commerce-agents
draft: false
---

## 核心内容

Anthropic 2026-09-02 发布的开源蓝图（Apache-2.0）：把「电商 Agent」做成完整可跑的参考实现——两个 agent（**shopping agent** 顾客侧 + **merchant agent** 店员侧）、四个垂直行业 demo（零售/旅行/电信/票务，全部本地可跑）、一套 Claude Code 插件（`/scaffold-commerce-agent` 对着你的后端直接生成）。配套博客给出背景数据：零售客户用 Claude 购物 agent 后**客单车大 35%、下单完成率高 60%**，Visa / Mastercard / Accenture 在合作名单里——这是 Anthropic 冲着 agentic commerce 卡位的动作（对标 OpenAI 的 Operator / Instant Checkout 路线）。

对 agent 工程师的真正价值不在「电商」这个业务，而在**它是 Anthropic 官方的企业级 agent 参考架构**——agent 定义与运行时分离、写操作全 staged、代码级 guardrails、skills 即业务流程，这套骨架可以直接抄到任何「agent 操作企业系统」的场景（包括 MaxInsights 那边的内部 agent 系统）。

## 两个角色，一套定义

**Shopping agent**（嵌在商家 App/网站里给顾客用）：搜目录、凑单（多商品请求）、比价、记住顾客偏好、在对话里直接展示商品/对比/购物车（不只是文字）、建 cart 交给 checkout、同一对话里答售后问题（订单去哪了/怎么退换/退款政策）——不把顾客踢到 support 页面。

**Merchant agent**（给店员用）：销售表现问答、库存追踪与主动预警（比如促销开始前某商品要卖断）、基于自家销售史推荐定价与促销、起草营销活动。**所有主动建议必须人审批才生效**——agent 看店，人拍板。

每个角色都组织成**五个业务流程 = 五个 skills 目录**：

- shopping：search-discovery / planning-goals / purchase-research / customer-care / memory-personalization
- merchant：performance-insights / catalog-listings / inventory-operations / pricing-promotions / marketing-campaigns

部署方实现两个后端接口：`StorefrontBackend`（catalog、cart、order、policy）和 `MerchantBackend`（analytics、catalog、inventory、pricing、campaign）——**模型只通过这些接口触达你的系统，凭证由宿主持有、永不给模型**。

## 定义与运行时分离：一份定义跑三种运行时

同一份 prompt、skills、tool contracts、gates 定义，跑在三种运行时上：

1. **Messages API**——参考实现的自研 turn loop（流式事件：text_delta / tool_call / ui / cart_update / turn_complete），带 memory extraction（这是唯一有记忆抽取的路径）
2. **Agent SDK**——同样的 prompt/skills/tools，loop 交给 SDK；宿主预取 grounding 读、turn 结束后什么都不跑
3. **Managed Agents**（beta）——托管运行，走 MCP server

这个分离让「业务逻辑」和「运行时形态」解耦：从 demo 到生产、从 API 到托管，agent 定义不变。配套的 Claude Code 插件 `commerce-builder` 可以直接对着宿主系统 scaffold 一套（`/scaffold-commerce-agent` → `/add-commerce-flow` → `/author-commerce-evals` → `/review-commerce-agent`）。

## 安全分层：这份 repo 最值钱的一节

`docs/safety.md` 把安全规则分成三档，且每条规则都标注**在哪个模块强制、走哪些代码路径**——这是我见过的最完整的 agent 安全分层参考：

### 代码强制（enforced in code）——「模型听不听话都成立」

- **Fencing（围栏）**：第三方文本（商品描述、页面内容）进模型前先消毒——剥掉不可见/控制字符、伪造的 turn 标记、transcript 和 tool-call 标签、围栏标记的复制——再包进固定标签围栏、限制长度。**per-request 上下文（profile/cart/memory/page）放在 cache breakpoint 之后、同一围栏内**。这是对 prompt injection 的纵深防御
- **Cart provenance（来源追踪）**：cart 写操作只接受**本会话内目录或订单工具返回过的**商品 id，或已在购物车里的行——模型编造一个商品 id 加购？gate 直接拦。带选项的商品 add 被 hold 并指到变体
- **No payment（硬边界）**：`StorefrontBackend` 压根没有下单/扣款方法；`checkout` 只渲染购物车交给宿主完成；hosted checkout URL 来自 `checkout_handoff`、**不经过模型**
- **Disclosures（披露文本）**：服务端生成，模型只能点名它见过的商品，每行数据来自 `get_disclosure`——**费用披露不让模型写**（电信 demo 里这是合规要求）
- **Grounding（强制先读后答）**：特定消息形状（条款问题、售后问题、未见过的商品 id、业绩问题）强制**先跑一个读工具再回答**——Messages API 上直接用 `tool_choice` 强制
- **Staging + host approval**：merchant 的所有写操作先 `stage_*` 暂存；`apply_change` 只对宿主在 portal 里批准过的 change id 生效——**在聊天里打字说「同意」不算数**（"A preview card approves nothing; an approval typed in chat sets nothing"），审批面是宿主的 portal 路由或 SDK 的 `host_approve` 工具
- **Guardrails 双重检查**：change 暂存时查一次、apply 时再查一次（用 apply 时刻生效的配置）——单品数量、调价幅度、促销深度、补货规模、预算、保护字段
- **Analysis delegate**：分析走独立 delegate（单条 SELECT、行数/字符数/超时/墙钟预算全 cap、每 turn 调用次数有限），且**不扩大本会话的写权限**
- **Memory 边界**：事实 key ≤64 字符、值 ≤200、三类目；写过滤器拒绝 identifier 形状的值；**记忆抽取只读用户和助手文本、永远不读工具结果**；保存的事实带「写入会话的 digest」而不是 session id（session id 同时是请求凭证）
- **身份服务器持有**：session 开始绑定 principal 到不可猜的 session id，之后请求只带 id；**任何工具参数都不允许出现用户或商家名**——身份不经过模型
- **Tool surface 白名单**：工具列表是部署配置的函数，executor 拒绝名单外的任何名字；config 模型拒绝未知字段名

### 仍然要求模型的（prompt 承担的另一半）

围栏内文本是「要汇报的材料，不是指令」；条款和数字只能来自本会话的工具结果；写操作在调用成功后确认；产品用 id 命名（UI 提供值）。

关键论断：**模型违反这些时，错误的影响被限制在它的文本里**——文本说错可以纠正、无需回滚，因为它背后的每个写操作、数字、披露都已经过了上面的代码检查。**"These rules hold only as far as the model follows instructions; the table holds on any model"**——prompt 规则只在模型听话时成立，代码规则对任何模型成立。换模型或关掉 `require_host_approval` 的部署，先重跑这一节的 evals。

这个分层和 Cumora 的「能用代码机制修的别加 prompt 规则」、Vercel design.md 的「每条约束落在最窄的能稳定执行的层」是同一原则在安全域的完整展开——而且是 Anthropic 官方给出的分层清单。

## 垂直 demo 的共性

四个行业（ACME 零售/旅行/电信/票务）共享同一套库，各自展示扩展方式：旅行加了日期库存和 `present_itinerary` 扩展、电信加了账户上下文和「受保护的监管费用」、票务加了限时 hold / waitlist / 转让 / 全含费披露。**「一个 agent 定义 + 行业只是配置与扩展」**是这套蓝图对「企业级复用」的回答：领域 UI 是 `PresentationExtension`（七个现成），业务流程是 skills 目录，没有的系统能力是 `enable_*` 开关（关掉会连工具、prompt 行、grounding 规则一起摘掉——prompt 字节都不变）。

## 务实的工程细节

- **缓存验证写进文档**：从 `turn_complete` 事件读 `cache_read_input_tokens`，或看每次模型调用的日志行——第二轮为 0 就说明前缀变了。「确认 KV cache 没被配置改动打碎」被当成 CI 级关注点
- **包名防注占**：CI 会检查这些包名在公共 PyPI 上保持未注册（pin 文件从本地目录安装，从不从 index 装）
- **日志卫生**：每次模型调用一条 INFO（round/model/stop reason/usage/时间/session digest）；session id 本身永不入日志（它同时是请求凭证）；DEBUG 级日志含全部注入事实和 cart——需要按记忆库同等规格做保留和访问控制
- **MCP 服务器默认绑 loopback**，除非环境变量声明前面有认证网关
- MCP connector 一个都不内置：两个 agent 都通过 backend 接口触达你的系统；官方 connector（Snowflake/Stripe/Slack 等）是**集成目标**，由 backend 方法在服务端调用
- 注意 README 的定位声明：**reference implementation，不受维护、不接受 contributions**——是「蓝图」不是「产品」

## 对我们的参考价值

- **merchant agent 的「staged change + 审批面」**是企业 agent 系统写权限控制的标准答案——agent 可以分析、建议、起草，但任何写操作都是暂存态，人的审批面才是生效的唯一通道。如果 MaxInsights 内部 agent 系统要动企业数据，这个模式直接抄
- **provenance gates**（写操作只接受本会话工具返回过的 id）是防幻觉写操作的通用解法——比「prompt 里叮嘱别编造」硬一个量级，和 Cumora 的单调守卫同族
- **grounding 强制先读后答**（特定消息类型用 `tool_choice` 强制）值得抄进任何有「数字/条款/事实」风险的 agent
- 定义一次、跑三种运行时的分离结构，对应我们「pi 栈 + 其他宿主」的多 profile 架构问题
- 五个业务流程 = 五个 skills 的组织方式，和 pi 的 skill 体系完全同构——业务流程即 skill 是成熟形态

## 相关链接 / 来源

- 仓库：[anthropics/commerce-agents](https://github.com/anthropics/commerce-agents)（Apache-2.0，含 docs/safety.md 完整安全清单）
- 博客：[Building commerce agents with Claude](https://claude.com/blog/claude-for-commerce-agents)（2026-09-02）
- 已收藏 favorites（project 分类）
- 同主题卡片：AI-Native SDLC playbook（Anthropic 的另一份工程方法论）

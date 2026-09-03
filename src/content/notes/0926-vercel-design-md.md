---
title: Vercel design.md：把设计规范做成 eval 驱动的三层系统
description: Vercel《How our agents build on-brand pages with design.md》完整深读——第一次尝试失败的原因（描述性语言没约束力、公开 prompt 丢了环境上下文）、7 个冻结 scenario 的 eval loop（200+ runs、91→39 失败 -57% 的诚实度量）、三层形态（design.md 判断力层/公开 stylesheet 机制层/deterministic check 机械层）、修正归置原则、给反模式命名的技巧、@design-agent 长期维护机制，以及 5 步自建配方。
date: 2026-09-02
updatedDate: 2026-09-03
tags:
  - ai
  - agent
  - eval
  - frontend
  - workflow
type: reference
status: ready
source: https://vercel.com/blog/how-our-agents-build-on-brand-pages-with-design-md
draft: false
---

## 核心内容

Vercel 讲他们怎么让任意 agent 生成「像 Vercel 自己做的」页面——typography、color、composition 都要带上 Vercel 自己设计的判断力。背景：内部每个 repo 有一个 `product-design` skill 教 agent 按设计系统干活，但**报告、提案、一次性页面经常在 repo 之外的工具里生成**，读不到那些文件。答案是一个任何 agent 都能加载的单一公开文件：design.md。

这篇文章的核心价值不是那个文件本身，而是**把设计规范做成 eval 驱动的系统**这条路——它同时是一份设计系统文档方法论、一份 eval 实战报告，还是一份「怎么给 agent 写规范文件」的通用教程。

## 第一次尝试为什么失败

第一次尝试很直接：把 skill 折叠成公开 prompt（把 skill 的参考文件合并成一个可从 URL 读取的文件）。结果是：**prompt 把视觉语言描述得挺好，但每个模型读到的东西生成的页面天差地别**。

根因有两层，Vercel 拆得很准：

- **设计语言本身是主观的**。"keep the layout clean" 这种话可以指任何东西——"clean" 是什么？
- **更大的问题：公开 prompt 丢掉了环境**。在 repo 里，agent 读 product-design 时被真实组件和已上线的页面**包围着**——skill 描述的每个概念都有实物可参照。公开 prompt 里这些全没有，每个模型只能**从纯文字重建** Vercel 的风格。

推论：需要做的是**把环境提供的上下文蒸馏进单个文件**，而唯一知道有没有接近的方法是看产出的页面。于是他们放下移植，从头写新文件——**每一处改动都对着一组可复现的 eval prompt 测试**。

## 7 个冻结 scenario

从真实用例出发写了 7 个，配上 mock 输入：

- 用量与性能报告（usage and performance report）
- 续约提案（renewal proposal）
- 基准测试报告（benchmark report）
- 交互式规划页（interactive planning page）
- build-vs-buy 简报
- 安全治理简报
- 演示 deck

每个 scenario = **prompt 冻结 + mock 输入冻结 + viewport 设置冻结**，design.md 是 runs 之间唯一变化的东西——任何输出差异都能归因到文件。完整轮次在 Claude Opus 4.8 和 Codex GPT-5.5 两个模型上跑全部 7 页；要调查特定问题（比如只影响表格的规则改动）就只重跑受影响的 scenario 或单个模型，迭代环保持紧凑。

7 页一起生成还带来一个意外收获：**并排对比证明了 design.md 没有把所有页面推向同一个模板**。交互式规划页把控件放在最前面（打开规划页就是为了改数字看结果）；续约提案把推荐结论放在最前、商业对比紧随其后（它的读者在决定要不要续约）。**每页用同一套 Vercel typography/color/spacing，但每页的结构围绕读者来这里要做什么**——视觉语言统一、页面结构各就其位，这是「on-brand ≠ 同模板」的最好注脚。

## 三层系统

测试与重建过程中，scope 演化成三层系统：

**1. design.md（判断力层）**：教 agent 怎么框定读者的任务、组织证据、选版式、按 Vercel 的方式发布（细到 wordmark 和三角 logo 的资产规则）。还包括一节专门**给「绝对不想再看到的生成式设计烂模式」命名**。命名是关键技巧：**给模式起名字后，agent 识别和规避的可靠性大幅提升**——模型靠名字绑定概念，比「不要做得 generic」这类模糊描述有效得多，且团队反馈时可指名（「这页又是 X」）。

**2. 公开 stylesheet（机制层）**：agent 们不断自己发明 typography、spacing、layout——于是 Vercel **把这些决定从模型手里整个拿走**：把设计系统原语（headers、tables、stat strips、chart styles）打包成 CSS，任何页面通过公开 URL 引用。design.md 文档化 stylesheet 提供的 class 名和 token，agent 用这些名字写 HTML。**妙处在 agent 从不读 stylesheet 本身**——它在浏览器渲染时才加载，代码完全不进模型上下文，省出来的空间全给设计判断。

**3. deterministic check（机械层）**：能写成代码断言的绝不留在 prose 里——比如「表格无视可用宽度」这种机械失败。

**归置原则一句话：每条修正落在「最窄的、能稳定执行的层」**。判断进 prose、可复用机制进 stylesheet、机械可查的进代码。还有两条补充规则：harness 自身的问题留在 harness（不写进规范）；单个模型独有的失败**不进规则，直到它在其他模型上复现**——防止给单一模型的怪癖写规则。

## 修正怎么变成规则：一个完整案例

早期一次续约提案：commercial terms 表格被压到和正文一样的宽度，尽管页面有空间让表格宽一倍。评审标记「证据表格应该用满可用宽度」——翻历史产出发现**这个失败到处都是**。于是这条修正落进两处：

- design.md 里一条声明预期行为的规则
- 代码里一个 deterministic check，下次再出现同样的布局失败就抓住

落完之后重跑受影响 scenario 验证；到里程碑再跑**盲 A/B 轮**（新版 design.md vs 旧版），决定每处改动 keep / revise / revert。

## 度量：91 → 39 的诚实读法

构建文件花了 **200+ runs**（完整轮次、定向检查、dry run、所有死胡同都算）。人工评审之外还有模型 judge 给每轮写 critique，每轮的反馈都进下一轮。

最后的效果度量做法很严谨：选 3 个 desktop scenario，每个用 Codex GPT-5.5 生成两次（带/不带 design.md），**只取每次生成的第一稿、不重 roll**——然后跑 deterministic checks 数已知失败：

- 带 design.md：39 个失败
- 不带：91 个 → **-57%**

同时明确标注三个 caveat：① checks 只能抓「已经见过并写下来」的失败，这个测试不说明页面整体设计好坏；② 6 页样本太小，不能对质量或可靠性下断言；③ 每一页（带不带文件都一样）仍至少有一个严重到 block-shipping 的失败。**这份克制比数字本身更值得学**——但它证明了一件重要的事：**一旦你给一个失败命名并编码它，这个失败就倾向于不再出现**。

## 长期维护机制：@design-agent

eval loop 让文件上线，让文件保持新鲜的是真实使用：Slack 里的 @design-agent（基于 eve 搭的），@ 它就能做设计 critique、文案替代、图标推荐、从粘贴的数据建报告站。网站请求它会加载当前 design.md、对着已发布 stylesheet 构建、把整页截图和部署 URL 发回 thread。

**每个 thread 都是一次真实请求 + 真实输出 + 后续反馈/纠偏**——固定 scenario 之外的真实分布数据。每周把所有反馈（Slack threads + GitHub review 评论 + Figma）汇总到一处，自动化聚类反复出现的抱怨，每条重复抱怨变成一个 proposed change，人工审核：系统是否已覆盖、修正该落到哪一层（@design-agent / product-design skill / design.md / stylesheet / deterministic check）。**当人们开始要求一种从没测过的页面类型，这个请求就变成新的 eval scenario。**

**健康度量 = 同类抱怨在同类工作里随时间的出现频率**。编码了修正之后这个计数应该开始下降；不降就说明修正有问题——规则不清楚、没在需要时被加载、stylesheet 缺少能表达它的原语、或者它本该是 deterministic check 而不是 prose。

## 5 步自建配方

文章末尾给了从零起步的配方（不用 runner、不用模型 judge 也能开始）：

1. **选一个反复出现的工件**——有真实读者和真实输入的（提案/性能报告/benchmark/微型站），避免「make it on-brand」这种宽泛目标。生成前先写一个短 rubric：检验事实是否幸存、读者的决策是否清晰、你反复手动修正的那个问题是否被解决
2. **先存 baseline**——不带任何新设计上下文生成一次，保存 prompt/输入/配置/截图。没有 before 就无法判断新上下文有没有用
3. **从最近十条修正出发**——收集你在设计评审、PR、Slack 里反复给的反馈，把每条改写成**可观察的**表述（"Let evidence tables use the full available width" 而不是 "Make the table feel less cramped"——只有前者可检查）。放进一个文件，分四节：scope、reader and task、observable decisions、available primitives——这就是你的第一版 design.md
4. **约束可重复的机制**——如果输出总在发明自己的 typography/spacing/layout，发布 stylesheet 并文档化 agent 可用的确切 class 和 token；判断力留在 prose，可重复机制推到 CSS 或 deterministic check
5. **跑一次配对比较**——同输入同模型同 viewport，带文件再生成一次，和 baseline 洗牌后盲评。一次 trial 就能暴露大的明显失败；要测可靠性就跑多次独立 first-attempt trial（引 Anthropic 的指南）

## 我们的对照

- 我们的 blog `DESIGN.md`（8-31 CTA 任务的教训：给 agent 写任务书必须先读它）正是文里说的 in-repo skill 形态；handdrawn-ui skill 同理——这篇文章证明这条路是对的，并给出下一步路线图
- 可直接抄的三件事：① 把 handdrawn-ui 里踩过的坑（anim-rise 吃掉 rotate、seal 压正文）**命名 + 写成可机械检查的断言**（sealOverlapText 检查已经做了，思路同源）② 「判断进 prose / 机制进 stylesheet / 机械进 check」的分层归置 ③ 冻结 scenario + 盲 A/B + 抱怨频率的 eval 起步配方——这套配方同样适用于非设计文件：给 agent 的任何规范（记忆规则、任务书模板、review checklist）都可以用「冻结场景 + 唯一变量 + 修正归置最窄层」的循环来维护
- 「单文件设计契约 + 公开 stylesheet」正在变成行业惯例（Hermes 生态也有 design_md skill）

## 当前理解 / 结论

- 设计规范对 agent 生效的关键不是「写得多全」，而是**分层归置**：每类约束放在它能被稳定执行的最窄层——这条原则和 Cumora 的「能用代码机制修的别加 prompt 规则」完全同构，只是用在了设计域
- 「给反模式命名」是被低估的技巧——名字是模型绑定概念的锚点，也是团队指认问题的共同语言，成熟后可升级成机械检查。我们已经把这条记入了 handdrawn-ui 的备用方法
- eval 驱动的文档维护（真实使用产生反馈 → 聚类 → 修正 → 验证抱怨频率下降）是任何「给 agent 的规范文件」的长期形态：DESIGN.md、memory.md、skills 全都适用——**规范文件不是写出来的，是 eval 出来的**
- 度量的诚实度本身就是方法论：只报「已命名失败的复发率」，不冒充整体质量分数；6 页样本就明说样本小。这份克制让 -57% 这个数字可信

## 相关链接 / 来源

- 原文：[How our agents build on-brand pages with design.md — Vercel](https://vercel.com/blog/how-our-agents-build-on-brand-pages-with-design-md)（2026-09）
- 同主题：AI-Native SDLC playbook（eval 飞轮同构）、Liquid agent-loops（外部验证同构）、Cumora 多 Agent 防撞车（软硬机制分层同构）

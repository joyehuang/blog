---
title: Vercel design.md：把设计规范做成 eval 驱动的三层系统
description: Vercel《How our agents build on-brand pages with design.md》深读——第一次尝试失败的原因（描述性语言没约束力）、最终三层形态（design.md 判断力层/公开 stylesheet 机制层/deterministic check）、冻结 scenario 的 eval loop（91→39 失败，-57%）、给反模式命名的技巧与长期维护机制。
date: 2026-09-02
updatedDate: 2026-09-02
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

Vercel 讲他们怎么让任意 agent 生成「像 Vercel 自己做的」页面。核心价值不是那个文件本身，而是**把设计规范做成 eval 驱动的系统**这条路——它同时是一份设计系统文档方法论和一份 eval 实战报告。

## 第一次尝试为什么失败

Vercel 内部每个 repo 有一个 `product-design` skill 教 agent 按设计系统干活。但报告、提案、一次性页面经常在 repo 之外的工具里生成，读不到那些文件——所以需要一个**任何 agent 都能加载的单一公开文件**：design.md。

第一次尝试直接把 skill 折叠成公开 prompt，结果很失败：模型各自「理解」描述性语言（"keep it clean" 这种词没约束力），同一份 guidance 不同模型产出天差地别。根因：repo 里的 skill 有真实组件和已上线页面兜底，公开 prompt 只有文字。

## 最终形态：三层系统

- **design.md（判断力层）**：教 agent 怎么框定读者的任务、组织证据、选版式；还有一节专门**给「绝对不想再看到的生成式设计烂模式」命名**。命名的效果：agent 识别和规避的可靠性大幅提升——模型靠名字绑定概念，比「不要做得 generic」这类模糊描述有效得多，且反馈时可指名（「这页又是 X」）
- **公开 stylesheet（机制层）**：把设计系统原语打包成有边界的 class/token 词汇表。妙处在 **agent 从不读 CSS 本身**——样式表在浏览器渲染时才加载，完全不占模型上下文，省出来的空间全给设计判断
- **deterministic check（机械层）**：能写成代码断言的绝不留在 prose 里

归置原则：**每条修正落在「最窄的、能稳定执行的层」**——判断进 prose、可复用的机制进 stylesheet、机械可查的进代码。

## eval loop 怎么跑

- 7 个冻结 scenario（真实用例 + mock 输入 + 固定 viewport），prompt 不动、只改 design.md，输出差异可完全归因到文件
- 完整轮次在 Claude Opus 4.8 和 Codex GPT-5.5 两个模型上都跑，全程 200+ runs
- 每轮人工评审 + 模型 judge 写 critique；里程碑时跑盲 A/B（新版 vs 旧版 design.md）决定 keep/revert
- 效果度量很诚实：3 个 desktop scenario 各生成两次（有/无文件，不重 roll），已知 mechanical 失败 91 → 39（**-57%**）——但明确标注三个 caveat：只抓「已命名过的失败」、6 页样本太小、每页仍至少有一个 block-shipping 级失败。**这份克制比数字本身更值得学**

## 长期维护机制

内部用 Slack 里的 @design-agent（eve 模板搭的）：@ 它就能出报告页/设计 critique，每个 thread 是一次真实请求 + 真实输出 + 真实反馈。每周汇总所有反馈，自动聚类重复出现的抱怨 → 每条变成一个 proposed change → 人工决定落到哪一层（skill / design.md / stylesheet / check）。

**度量指标是同类抱怨的出现频率随时间下降**——改了规则后该类抱怨不降，就说明规则有问题（不清楚/没被加载/stylesheet 缺原语/该做成 check 而不是 prose）。

## 我们的对照

- 我们的 blog `DESIGN.md`（8-31 CTA 任务的教训：给 agent 写任务书必须先读它）正是文里说的 in-repo skill 形态；handdrawn-ui skill 同理——这篇文章证明这条路是对的，并给出下一步路线图
- 可直接抄的三件事：① 把 handdrawn-ui 里踩过的坑（anim-rise 吃掉 rotate、seal 压正文）**命名 + 写成可机械检查的断言**（sealOverlapText 检查已经做了，思路同源）② 「判断进 prose / 机制进 stylesheet / 机械进 check」的分层归置 ③ 冻结 scenario + 盲 A/B + 抱怨频率的 eval 起步配方
- Hermes 生态里也有 design_md skill（Google 的 DESIGN.md 规范方向）——「单文件设计契约 + 公开 stylesheet」正在变成行业惯例

## 当前理解 / 结论

- 设计规范对 agent 生效的关键不是「写得多全」，而是**分层归置**：每类约束放在它能被稳定执行的最窄层
- 「给反模式命名」是被低估的技巧——名字是模型绑定概念的锚点，也是团队指认问题的共同语言，成熟后可升级成机械检查
- eval 驱动的文档维护（真实使用产生反馈 → 聚类 → 修正 → 验证抱怨频率下降）适用于任何「给 agent 的规范文件」：DESIGN.md、memory.md、skills 全都适用

## 相关链接 / 来源

- 原文：[How our agents build on-brand pages with design.md — Vercel](https://vercel.com/blog/how-our-agents-build-on-brand-pages-with-design-md)（2026-09）
- 同主题：AI-Native SDLC playbook（eval 飞轮同构）、Liquid agent-loops（外部验证同构）

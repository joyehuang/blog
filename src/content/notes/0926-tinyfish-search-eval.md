---
title: TinyFish 免费搜索评测：免费档能到付费引擎的九成吗
description: TinyFish Search+Fetch 免费 API 的两轮实测——5 题基础能力 + 6 道三跳多跳题对照 Tavily/Exa（10.5 vs 11.5 vs 9），Fetch 直接抓 X 推文全文是独有价值，无结果硬凑特性需要上层防线，以及落地后的四层搜索路由设计。
date: 2026-09-02
updatedDate: 2026-09-02
tags:
  - ai
  - agent
  - retrieval
  - eval
type: research
status: ready
source: https://www.tinyfish.ai
relatedNote:
  - 0926-prime-agent-apodex-lessons
draft: false
---

## 核心内容

TinyFish（AgentQL 母公司）2026-05 起将 Search + Fetch API 完全免费开放，创始人放话「杀死了 Exa/Tavily/SerpAPI/Brave」（对比其 $7/千次定价）。免费逻辑：搜索与抓取是 agent 的「水电」级原语，用作获客钩子，真正收费的是上层 Web Agent。官方自测首条结果准确率 49.2% vs Tavily 45.6%——供应商自测，需独立验证。本文是两轮实测（5 题基础 + 6 道三跳多跳题）对照 Tavily 与 Exa 的完整记录。

## 第一轮：基础能力（5 题三引擎，均为真实使用场景）

- 技术报错检索（astro/cloudflare manifest 报错）：TinyFish ✅ 5/5 相关命中 GitHub issue；Exa ❌ 空
- wrangler pages 自定义域：TinyFish 偏社区实操（Reddit/CF 论坛）；Exa 官方 API 文档最准
- 时效检索（Qwen3.8-Flash-Next 发布、Claude Code changelog）：三家都能拿到官方页第一
- 中文检索（人物/公司背景）：TinyFish 与 Tavily 全相关；Exa ❌ 空

**计分：TinyFish 5/5，Tavily 5/5，Exa 3/5（两次空手）**——免费档与 Tavily 打平。

**Fetch 硬度（4 类页面）**：

- **X 推文页 ✅**：直接抓出全文。此前同类任务必须开浏览器，一条 curl 搞定——**本次评测最大价值点**
- 普通博客 ✅ 干净 markdown、arXiv 论文页 ✅ 结构完整
- 小红书 ❌ 反爬拦截返回空（预期内，此类仍需浏览器）

**稳健性**：10 连发延迟中位 ~1.5s（快于 Tavily 的 2-3s），零失败零限流。⚠️ 注意点：**无结果 query 不返回空，而是硬凑 YouTube 等结果填充**——上层调用必须做相关性判断，不能盲信「有结果就是对的」。

## 第二轮：六道三跳多跳题（难度升级）

计分规则：每题 3 跳各 1 分，只算「材料是否递到手上」；标准答案先用 GitHub API / 官网独立锁定（原题设计有误的已修正）。结果：

- 六家难题里最难的 T1（三层来源：pi harness 开发笔记 → 锐评段 → GitHub 非默认分支）只有 Tavily 命中 1 分，TinyFish 跑偏第三方横评，Exa 空
- T3（公司 → 创始人 → 仲裁案）TinyFish 与 Tavily 全 3 分拿满
- T5（Command Code → Z.AI → 当前型号价格）Exa 表现最好（3 分，含深度分析）
- **合计 /18：Tavily 11.5，TinyFish 10.5，Exa 9（2 题空手）**

**幻觉率：三家均为零**——所有返回结果真实存在。第一轮担心的「硬凑」在题面有真实结果时不出现。

## 结论

1. **免费版 TinyFish ≈ 90% 的 Tavily**：常规/时效/中文检索打平，延迟更低；付费引擎在其无解的题上同样无解（最难一层三家全灭）——瓶颈在题不在引擎
2. **Fetch 是独有价值**：X/普通页内容获取可替代大部分浏览器自动化场景，且免费
3. **Exa 不可替代的定位**：人物/技术图谱类多跳 + 语义检索；但中文复杂题和长尾技术题会空手，方差大
4. **风险**：注册仅 Google OAuth；活抓搜索引擎受反爬策略影响；免费策略持续性取决于其上层付费转化；无结果硬凑需要上层防线

## 落地：四层搜索路由

实测后 web-search skill 的路由调整为：

- **TinyFish = 免费默认层**：精确检索、时效检索、中文检索先行；Fetch 接管 X/普通网页内容获取
- **Tavily = 兜底**：TinyFish 结果可疑或限流时接手（credits 消耗大幅下降）
- **Exa = 专职语义**：模糊回忆、人物图谱类
- **上层相关性判断**：针对「无结果硬凑」特性，agent 对结果做质量复核
- **浏览器保留**：小红书、登录门、需要交互的页面

## 方法论注记

这次评测是自己后来学到的 eval 方法论的雏形，回头看有几个明确缺陷：无金标（靠自行锁定标准答案）、无独立 judge、无置信区间、按单题印象打分。当时测出来的相对排序（免费≈付费九成、Exa 图谱强、中文复杂题空手）在后续两个月的使用中经受住了验证，但「10.5 vs 11.5」这种 1 分差距在无置信区间下不应被当成结论。改进方向见 Parallel 评测方法论：固定 harness 只变搜索、评最终答案、失败四分类、cost per resolved task、平局就说平局。

## 相关链接 / 来源

- TinyFish：[tinyfish.ai](https://www.tinyfish.ai)；API：Search（30 次/分）、Fetch（150 URL/分）
- 完整评测记录（71 行）留存于本地调研库

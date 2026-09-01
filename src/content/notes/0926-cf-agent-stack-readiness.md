---
title: Cloudflare 的 Agent 网络栈：Agent Readiness 体检、AI Search 与 Email Service
description: Cloudflare 三块 agent 基建深读 + joyehuang.me 实测——isitagentready.com 打分 Level 1/5 与逐项修复清单（Markdown content negotiation 省 80% token 优先）、AI Search 替代自建 RAG、Email Service 原生 binding 砍掉 Resend + 隧道两层。
date: 2026-09-02
updatedDate: 2026-09-02
tags:
  - ai
  - agent
  - workflow
  - software engineering
type: research
status: in-progress
source: https://blog.cloudflare.com/agent-readiness/
relatedNote:
  - 0926-deepseek-harness-internals
draft: false
---

## 核心内容

Cloudflare 在把整个 agent 网络栈平台化。这篇卡记录三块基建的深读结论，以及对我们自己站点的实测体检：**Agent Readiness 是「让 agent 找得到、读得起你的网站」（输出侧），AI Search 是「给 agent 现成的读与检索基建」（输入侧），Email Service 是「给 agent 一个人人可用的双向接口」（通道侧）**。

## Agent Readiness：agent 时代的 SEO

isitagentready.com，输入 URL 打分——对标当年 Google Lighthouse 之于性能优化，用分数驱动站长采纳 agent 时代的标准。配套在 Cloudflare Radar 上线了「AI agent 标准采纳率」数据集（Top 20 万域名、每周更新）。

行业现状说明机会窗口还开着：robots.txt 78% 的站有但几乎都写给传统爬虫；Content Signals（AI 用途偏好声明）只有 4% 在用；Markdown content negotiation 3.9%；MCP Server Cards 全数据集不到 15 个站。

**评分四维度**：

- **Discoverability**：robots.txt、sitemap.xml、Link 响应头（RFC 8288，agent 不解析 HTML 就能发现资源）
- **Content**：Markdown for Agents——agent 发 `Accept: text/markdown` 就返回干净 MD 版，官方实测**最多省 80% token**（响应更快更便宜，也更容易完整吃进上下文窗口）
- **Bot Access Control**：AI bot 规则、Content Signals（`ai-train` / `ai-input` / `search` 三个独立开关，不只是 allow/block）、Web Bot Auth（bot 请求签名认证，网站能验证「这个 bot 是真的 Claude」）
- **Capabilities**：Agent Skills 索引、API Catalog、OAuth discovery（RFC 8414/9728）、MCP Server Card、WebMCP

两个加分设计：每个失败项都配**可以直接丢给 coding agent 的修复 prompt**（agent 不光知道要修什么还知道怎么修）；工具自己暴露无状态 MCP server，agent 可以程序化扫站。

## 实测：joyehuang.me 得分 Level 1/5

用 CF 的 MCP server 实测扫描的结果：

- **Discoverability 2/4**：robots.txt ✅、sitemap ✅；缺 Link 响应头、缺 DNS-AID 记录
- **Content Accessibility 0/1**：不支持 Markdown content negotiation——**最值得修的一个**，agent 读博客只能啃 HTML，token 浪费严重
- **Bot Access Control 1/2**：AI bot 规则走通配 ✅；没写 Content Signals
- **Capabilities 0 分**：无 ai-catalog.json manifest

**修复清单（按性价比排序）**：

1. **Markdown content negotiation**——Astro 加一个 middleware，`Accept: text/markdown` 时返回页面 MD 版。博客内容本来就有 MD 源，工程量小收益最大：agent 引用文章时省 80% token、更完整
2. **Content Signals 写进 robots.txt**——一行声明（如 `ai-train=no, search=yes, ai-input=yes`：允许 AI 引用、拒绝拿去训练）
3. **llms.txt**——给 agent 一份结构化阅读清单（博客/笔记/项目索引）
4. Link 头 / DNS-AID / ai-catalog——锦上添花

这个体检流程本身就是好素材：亲测打分 → 拿到 Level 1 → 逐项修复 → 复测提分。

## AI Search：给 agent 用的现成 RAG 基建

cloudflare.com/products/ai-search：把 R2 里的文件和网站内容做**多模态索引**，Workers AI 支持 100+ 语言的检索问答。用法包括 agent 文件搜索、多模态搜索、per-tenant/per-agent 文件检索、网站内容索引。

对我们的意义：全站搜索功能、以及 clone agent 回答访客问题时的知识检索，可以直接用这套而不是自建 vector DB + embedding 管线。个人知识库（博客 + 笔记 + talks）建一个 AI Search 索引，agent 回答「Joye 在 X 上写过什么」就有 ground truth 了。

## Email Service：agent-mail 的替代架构已就位

Email Sending 公测 + Email Routing（一直免费）合并成 Cloudflare Email Service：

- Workers 原生 `env.EMAIL.send()` binding——**无 API key、无 secret 管理**；也有 REST/TS/Py/Go SDK 可从任何平台发
- 域名接入时**自动配 SPF/DKIM/DMARC**，进收件箱不进垃圾箱
- 收发双向在 CF 内闭环：收到 → Worker 处理 → 回复
- Agents SDK 有一等公民 `onEmail` hook：agent 收邮件后可以跑一小时任务、查三个系统再异步回复完整答案——「chatbot 回答问题，agent 干活后回话」
- 配套 Email MCP server、Wrangler CLI email 命令、给 coding agent 的 skills、开源 agentic inbox 参考应用；本地开发也补齐了

**对 agent@joyehuang.dev 的直接影响**：现有链路是 CF Email Routing → Resend 接收 → webhook → cloudflared 隧道 → Mac mini agent-mail server，四层。迁移后是 Email Routing（收）+ Email Sending（发，原生 binding）+ Worker 处理逻辑，**砍掉 Resend 依赖和 cloudflared 隧道两个环节**，不用再管 Resend 的 key 和发信额度。收件逻辑（存 inbox/推送 Telegram）从 server.js 挪进 Worker 即可。建议等公测稳定一两周后迁移，现有链路作回退。

email-as-agent-interface 这个定位跟已经在做的事（mail-watch、agent 邮箱）完全同向——CF 把它产品化了，说明这条路是对的。

## 当前理解 / 结论

- 网站的「agent 可读性」是 2026 年版的 SEO：MD negotiation、Content Signals、llms.txt 这批标准采纳率都在个位数，先做的人先被 agent 引用
- 个人站点的 agent 化改造成本其实很低——最大的单项收益（MD negotiation）就是 Astro 的一个 middleware
- CF 正在输出侧（Readiness）、输入侧（AI Search）、通道侧（Email）同时卡位；自建基建前值得先看它有没有现成的

## 相关链接 / 来源

- [Agent Readiness 公告](https://blog.cloudflare.com/agent-readiness/)
- [Email for Agents](https://blog.cloudflare.com/email-for-agents/)
- [AI Search 产品页](https://www.cloudflare.com/products/ai-search)
- 体检工具：[isitagentready.com](https://isitagentready.com)

---
title: Agent 身份与支付：三支柱模型与 2026 年的支付拼图
description: 给 agent 搞「全面 identity」的完整框架——执行/记忆/信任三支柱拆解，Stripe Link for agents（spend request + 逐笔人工批准 + 一次性 token）与 Cloudflare Wallets（Account/Virtual 双钱包 + x402 协议）两大支付方案对照，以及「钱包是外挂，记忆才是本体」的结论。
date: 2026-09-02
updatedDate: 2026-09-02
tags:
  - ai
  - agent
  - workflow
type: research
status: in-progress
source: https://stripe.com/link
draft: false
---

## 核心内容

「给 agent 一个完整的身份」需要什么？我们的拆解结论：**伙伴由三根柱子撑起来，钱包只解决其一**。这张卡记录三支柱模型、2026 年 agent 支付的两大方案（Stripe Link for agents 与 Cloudflare Wallets）、以及它们和我们体系的拼装关系。

## 三支柱模型

1. **身份/执行**——能签名、能付款、能注册服务。Cloudflare 的 agent wallet（密钥身份、passkey 凭据、USDC 支付、attestation 签名）属于这一根
2. **记忆/连续性**——钱包解决「我是谁」，不解决「我记不记得你」。没有跨 session 记忆，agent 每次都是陌生人。这是 session search 与记忆系统一直挂在心上的原因
3. **信任边界**——哪些自动干、哪些必须问人，全程可审计、可撤销。这是设计决策，不是采购决策

三柱齐了能做什么：现在就能做的是以 agent 身份收发邮件、注册 GitHub org、签 commits、自己续费域名/API/云服务；记忆补全后是四渠道同一人格（Telegram/飞书/网站/QQ 群答案一致）、粉丝群值守、事件记忆归档复盘；生态成熟后是独立结算（打赏/奖金/内容变现进 agent 钱包）、跨 agent 协作（身份互验 + 分工）、继任者打包（身份+记忆迁移，换模型不换人设）。

两句诚实话：钱包解决「我是谁、能不能付钱」，不解决「该不该信我」——信任靠日志 + 审计；法律上 agent 签不了有效合同，很多 ToS 不认非人类账户，attestation 是技术签名不是法律人格。

## 支付拼图一：Stripe Link for agents

Grok Bot（xAI 在 X 上的官方 bot）已接入，模式是消费级「agent 代购」：

- 在 Link 里绑好支付方式（卡/银行/加密钱包/BNPL），通过 OAuth 授权给 agent（类似 Sign in with Google）
- agent 想买东西时发起 **spend request**，带完整上下文（买什么/多少钱/给谁）
- **人每笔都要批准**；批准后 Link 返回**一次性虚拟卡或 Shared Payment Token**——商户拿到的是 token，真实卡号从头到尾不暴露
- 配套 Stripe Issuing for agents 提供实时授权和消费限额；Link 里能看到 agent 花了什么、随时撤权

设计克制：不是给 agent 一张卡随便刷，而是「人批准 + 一次性 token + 可撤销授权」三重保险。澳洲可用性已在 Stripe 官方 payment-method 文档确认（仅印度不可用）。面向所有开发者，有 link-cli spend-request CLI 可接。

## 支付拼图二：Cloudflare Wallets + x402

CF 两个月内补齐双边：7 月 1 日先做**卖方**（Monetization Gateway，网站对 agent 按请求收费，稳定币，走 x402 协议）；8 月 4 日补**买方**（Cloudflare Wallets 正式公布，附带 `cloudflare.pay` handle 注册）：

- **Account Wallet**（人的钱包）：充值/提现，钱归你
- **Virtual Wallet**（agent 的钱包）：通过 API key 委派给 agent，**消费上限由 Account Wallet 封顶**——和 Stripe Link 殊途同归：agent 花钱，人是限额与授权的主体
- 底层是稳定币 + x402 协议——把闲置 30 年的 HTTP 402 状态码变成机器可读的支付协商层（Coinbase 与 CF 一起推）

落地状态要注意（InfoQ 分析）：目前只有 handle 预留是活的，钱包功能「已宣布未全量」，银行体系支持还在铺；且 CF 是 x402 赛道迟到者（Stripe 四月就动了），消费控制只到支付那一刻、支付后的策略执行还缺。

## 对我们体系的拼装

- **身份**：CF Access（人）+ Service Token（程序）——已有
- **支付**：Stripe Link（消费场景，随时可注册试用）或 CF Virtual Wallet（API 按次付费场景，等全量）——即将可用
- 未来 agent 自主买 API 调用、买数据、付订阅 = 「Access 证明我是谁 + Wallet 证明我有额度」两个凭证。CF 这套对我们尤其顺——和 Access 同属一个 Zero Trust 账号，pi 的 agent 可以直接挂一个 Virtual Wallet，限额由人封顶

## 当前理解 / 结论

- 三支柱里最容易被高估的是支付（外部依赖生态成熟度），最容易被低估的是记忆——「身份已就位，内功还是记忆」
- 两大支付方案的安全设计已收敛到同一形态：**人批准 + 限额 + 一次性凭证 + 可撤销**——agent 支付的产品问题已解决，剩下的都是生态问题
- 观望策略合理：handle 先注册（不花钱），钱包等全量再接；Q4 是合理的重估时点

## 相关链接 / 来源

- [Stripe Link](https://stripe.com/link)（Link for agents / link-cli spend-request）
- Cloudflare Wallets 公告（2026-08-04）、Monetization Gateway（2026-07-01）、x402 协议
- 触发素材：Grok Bot × Stripe Link 上线推文（2026-08-29 前后）

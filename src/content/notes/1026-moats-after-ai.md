---
title: AI 之后的技术护城河
description: 整理专有数据、网络效应、实体部分为什么在 AI 之后还成立，以及品牌、信任、品味和「拥有不等于护城河」。
date: 2026-10-12
tags:
  - ai
  - agent
  - software engineering
type: research
status: ready
source: https://x.com/nikitabier/status/2109497987055640958
draft: false
---

## 核心内容

这张卡片记的是 2026 年 10 月 12 日 Nikita Bier 的一条帖，以及评论区把它拆开之后，**技术领先被抹平以后，还剩下什么可以称为护城河**。

如果只看最短结论，可以先记一句：

> AI 抹平的是「把软件做出来」的时间。专有数据、网络效应、实体部分仍然稀缺，但握在手里不会自动生效。对个人和小团队，会复利的是品味、反馈和信任。

这篇涵盖：

- Nikita 的三条：专有数据、网络效应、实体部分。各自在防什么，AI 之后为什么还成立
- 评论区补上的品牌、信任、品味，以及它们为什么是同一个环
- levelsio 的个人软件视角：门槛消失是创造力，不只是唱衰
- Eno Reyes 的三个反例：拥有不等于护城河
- 一个可用的结论，以及对个人开发者够得着的那一部分

## 要点整理

### 1. 先把「能被隔夜复刻的」和「还不能的」分开

AI 改变的是复制软件的速度。给定一个说法，agent 可以在一夜之间把代码、功能和界面再做一遍。「我们先做出来」也不再是一段能维持很久的距离。

还没被同样速度抹平的，是原帖点名的三项，加上评论区反复补上的人和关系。

```
能被隔夜复刻                 还不能被隔夜复刻
代码 / 算法            →     专有数据
功能 / 界面                  网络效应
「我们先做出来」              实体部分
                             ── 评论区补的，多为人和关系 ──
                             品牌 / 信任 / 品味
                             监管（个人选不了）
                             执行速度（弱，不一定复利）
```

原帖本身只有三行，没有定义：

> Technical moats are mostly over at this point. If you’re building something that is meant to be durable, the only moats now are:
>
> • Proprietary data
> • Network effects
> • A physical component

[原帖](https://x.com/nikitabier/status/2109497987055640958)。翻译过来：技术护城河差不多结束了。想做能长久的东西，现在只剩专有数据、网络效应、实体部分。

这句话有分量，和他的履历有关。他做过两个被收购的青少年社交 app，tbh（Meta 收购）和 Gas（Discord 收购），后来当过 X 的产品负责人。当天的简介是「unemployed. former head of product @x」。他在 [Lenny's Podcast](https://podcastnotes.org/lennys-podcast-with-lenny-rachitsky/nikita-bier-how-to-consistently-go-viral-the-playbook-for-winning-at-consumer-apps-lennys-podcast/) 上讲的也是社交图谱和增长测试。三项里有两项是消费级社交的老逻辑，清单带着这个出身。

原帖把三项并列，好像它们是同一类耐久资产。下面要分开看：每一条在防什么，AI 之后为什么还成立，以及它在哪一步会失效。

### 2. 专有数据：复制得了界面，复制不了没公开过的原料

**专有数据**防的是「别人没有这份原料」。

AI 擅长的是从公开材料里再生实现：看得到的界面、说得清的功能、写得出来的代码。它生成不了从未进入训练集的东西，比如多年的交易和工单、一套系统自己的失败记录、一群具体的人反复卡在哪。这些不是提示词能补出来的。产品可以被重做，数据集不会跟着界面一起被生成。

所以在「做出来」变便宜之后，这项仍然成立。耐久的不是功能清单，是别人买不到、也爬不到的那份记录。

它的边界也很清楚。Eno Reyes（Factory AI 的 CTO）的第一个反例是：四大会计所有客户和流程数据，市场却被 Ramp 拿走了一块。原话是讽刺。它证明的是预期中的赢家没有赢，没有证明对方没用这份数据。能确定的只有：**有专有数据，没有自动变成胜势**。数据是原料。不用它做判断，仓库里的文件就不是护城河。

### 3. 网络效应：人的网络不能隔夜 fork

**网络效应**防的是「用户可以毫无成本地离开」。用的人越多，产品对每个人越有用，迁移就越疼。社交、市场、协作都是这个形状。

AI 可以 fork 仓库，不能 fork 那张「谁和谁在一起用」的图。代码是比特，网络是关系。这是 Nikita 自己的主场，所以它出现在清单里不意外。

它的边界是：网络还在，下一场可以换赢家。Eno 的第二个反例是 GitHub。开发者网络效应极强，AI 编程的赢家却不是它。一个为旧任务长出来的网络，不会自动接到新任务上。网络效应要继续挖，才还是护城河。

### 4. 实体部分：原子没有跟比特一起加速

**实体部分**防的是「纯软件式的隔夜抄袭」。

代码的复制从「一个团队几个月」被压到「一个 cloud agent 一晚上」。工厂、设备、物流、要真的把东西做出来的国防制造，没有获得同样的加速。所以想做长久的东西时，Nikita 把「有一块是原子」单独列出来。它成立，是因为 AI 压缩的是比特的再生产，不是原子的再生产。

它挡不住的是愿意进入原子世界的新公司。Eno 的第三个反例是国防：实体壁垒在，新的国防承包商照样出现。实体部分把比赛变慢，不把门口焊死。

### 5. 评论区补的不是第四种技术，是人和关系

另一派同意「技术护城河基本死了」，然后补清单。补上来的东西很集中。

品牌，被定义成可信的分发，不是 logo：

> Agreed technical moats are basically dead. Only others I’d add:
>
> 1) Brand aka trusted distribution
> 2) Regulatory positioning

[businessbarista 的引用帖](https://x.com/businessbarista/status/2109601795765121259)。

已经挣到的信任。界面可以抄，多年的记录、重新培训、客户愿不愿意把事交给你，抄不走：

> I'd add earned trust.
>
> A business may be able to copy your screens quickly. Convincing a customer to move years of records, retrain staff and rely on a new provider is a different job.

[AskMichaelTaiwo 的引用帖](https://x.com/AskMichaelTaiwo/status/2109601222407889096)。

品味和判断。智能变便宜以后，执行变成大路货，剩下的是知道做什么、不做什么。回复全文把这个环收完了：

> IMO, you missed the ones that actually compound: Taste and Judgement.
>
> When intelligence is abundant, execution commoditizes. The moat shifts to knowing what to build and what to leave out.
>
> Taste sets the direction. Tight feedback loops refine your judgment. Done consistently, that loop produces the only thing capital cannot replicate overnight: earned trust.

[Anoop Kumar Bhat 的回复](https://x.com/AnoopKumarBhat/status/2109603146393923823)。

执行速度被提出的人自己标成弱项：

> Totally agreed.
>
> And for now, pace of execution and shipping. Not sure it compounds but it is a (weak) moat for now

[rsarver 的引用帖](https://x.com/rsarver/status/2109602955494113447)。

| 补的东西 | 它在防什么 | 会不会自己留下来 |
| --- | --- | --- |
| 品牌 = trusted distribution | 别人信你，所以找得到你 | 靠时间攒 |
| earned trust | 迁移记录、重新培训、把事交给你 | 靠时间攒 |
| taste and judgement | 知道做什么、不做什么 | 会复利，最后变成 earned trust |
| regulatory positioning | 牌照和规则上的位置 | 个人创作者选不了 |
| pace of execution | 眼下跑得比别人快 | 弱，提出者自己说不一定复利 |

品牌、信任、品味不是三个新名词。Anoop 把它们收成一个环：**品味定方向，短反馈改判断，最后是资本一夜复制不了的信任**。监管是这组里的例外，它是外部规则，不是这个环。执行速度打开一段距离，距离会过期，所以它不进「会复利」那一列。

### 6. levelsio：同一件事的乐观读法是个人软件

levelsio 引用原帖只有一句：

> Even Nikita says it

[引用帖](https://x.com/levelsio/status/2109524844056543523)。同一天的回复把「唱衰」明确推开了：

> People feel threatened and they think my point is doom and I'm a doomer
>
> I'm not, there's an explosion of creativity if anyone can make their own personal software
>
> It'll just be a completely different paradigm I think

[这条回复](https://x.com/levelsio/status/2109545183876616408)。

这是同一事实的另一面。做软件的成本掉下来，在位者的技术领先守不住，局外人也因此进得来。个人软件不是「没什么可做了」，是一套不同的范式：任何人都能做自己的软件，稀缺从「能不能做出来」挪到「做什么、谁愿意留下」。

hxiao 的引用只有一句 `Yes, moat is gone, but also this:`，后面是一张梗图（[引用帖](https://x.com/hxiao/status/2109507980714742072)）。图的意思是：绝大多数人不敢试、失败三次就放弃、太慢、被新东西分心，最后只剩你和另一个人。门槛没了之后，还在做的人本身就是筛子。

### 7. Eno Reyes：三条都有反例，因为护城河不是名词

三条放在一起，最尖锐的反驳是 Eno 的引用：

> Proprietary data which is why big 4 accounting firms beat ramp - oh wait
>
> Network effects which is why Github won AI software dev - oh wait
>
> Physical component which is why there are no new defense contractors - oh wait
>
> There is no moat. You are defenseless and also can win it at all at the same time. Act accordingly.

[Eno Reyes 的引用帖](https://x.com/EnoReyes/status/2109540083284267356)。

三个「oh wait」和原帖的三项一一对应。专有数据没有让四大打赢 Ramp，网络效应没有让 GitHub 赢下 AI 编程，实体部分没有挡住新的国防公司。

Roy Shilkrot 把「这不是新闻」说完整了：

> I can’t see why this is news to anyone today since it’s always been the case.
> Any tech is (and was) on a path to commoditization.
> The only thing that did change is the speed at which competition can catch up.
>
> Moats are dug with picks and shovels, not bits and bytes.

[Roy Shilkrot 的引用帖](https://x.com/RoyShilkrot/status/2109606053549834346)。

技术走向商品化是老事实。新的是对手追上来的速度。护城河是镐和铲挖出来的，不是比特本身。

有人问还剩什么可做（[What's even left to build at this point lmao](https://x.com/latentfidelity/status/2109498908854583296)）。Nikita 回的不是一段反驳，是一张购物车截图（[这条回复](https://x.com/nikitabier/status/2109502507961766123)）。清单没有被改写。

### 8. 几方各自说对了哪一半

| 立场 | 技术还是不是护城河 | 还剩什么 | 漏掉的一半 |
| --- | --- | --- | --- |
| Nikita | 基本不是 | 专有数据、网络效应、实体部分 | 有资产不等于它在起作用；清单带着消费社交的出身 |
| 补项的人 | 同意技术护城河死了 | 品牌、信任、品味；监管；执行速度只是弱项 | 监管个人选不了；执行速度不一定复利 |
| levelsio / hxiao | 同意，而且当好消息 | 个人软件；还在做的人会把大多数人筛掉 | 没回答积累的东西会不会过期 |
| Eno | 另外三条也不是自动的护城河 | 你既毫无防御，又随时能赢 | 「没有护城河」容易被听成不用积累 |
| Roy | 技术商品化不是新闻 | 镐和铲，也就是持续挖 | 把速度说清了，没有往下说个人还能挖什么 |

## 当前理解 / 结论

### 1. 消失的是技术领先的半衰期

Roy 写得很直：技术一直在商品化，新的是追赶速度。以前抄一个产品要一个团队几个月，现在一个 cloud agent 一晚上。**护城河这个词还在，一段技术领先能维持的时间被压短了。** rsarver 把执行速度叫成弱护城河，说的是同一件事：你跑得快，别人用 agent 也能跑得快，拉开的距离会过期。

### 2. Nikita 的三条仍然指得对稀缺，但不会自动生效

专有数据、网络效应、实体部分，在 AI 之后仍然成立，原因各不相同：原料没被公开、人的网络不能 fork、原子没有跟比特一起加速。Eno 的反例否定的是「拥有即防御」，不是「这三样毫无用处」。**握在手里却没有变成胜势，就等于没有。**

### 3. 对个人和小团队，会复利的是一个环

专有数据和网络效应很难砸钱买到，只能靠时间攒。评论区补上的品牌、信任、品味，几乎都是人和关系。Anoop 的环是目前最完整的说法：品味定方向，反馈改判断，最后是资本一夜复制不了的信任。监管不在这条路上。

### 4. 护城河是动词

「你既毫无防御，又随时能赢」比任何清单都更接近真实。levelsio 的个人软件是这句的另一面：在位者守不住的缺口，就是局外人进得来的地方。

护城河不是你拥有的东西，是你每天在挖的东西。

这句是我的概括，不是谁的原话。hxiao 那张梗图说的是同一件事。

## 对个人开发者的启发

我自己在带一个 AI bot 团队，也在做粉丝社群，刚好站在「技术领先变短」的这一边：用 cloud agent 把东西做出来的人，就是 Eno 说的那个随时能赢、也毫无防御的人。个人开发者够得着的，通常不是砸钱买来的数据和网络，而是上面那个环。

### 1. 实现归到「能被隔夜复刻」那一列

bot 团队的代码，别人用 agent 也能写出来。抄不走的是社群里的人，以及他们问的问题。这是一个很小的网络效应，加上一份专有信号：读者到底卡在哪。选题从这里来。

### 2. 公开写、持续发，就是可信的分发

读者愿意看，多半不是因为这个观点别人想不到，而是因为相信我真的跑过：多 bot 团队怎么分工，哪类任务交给 agent 能成，哪类会翻车。这份记录越具体越难抄。它就是专有数据，也是 Anoop 说的那种资本一夜复制不了的信任。

### 3. 做一个给别人用的 agent 产品，不要把领先寄托在代码上

levelsio 那句成立：任何人都能做自己的个人软件。能留下来的是用的人，和跑出来的记录。代码会过期，记录会留下。

如果明天有人把整套做法原样复制走，他还缺什么，才能做出同样的效果？缺的那部分，就是该每天挖的地方。

## 相关链接 / 来源

- [Lenny's Podcast 笔记：Nikita Bier 谈消费级 app 的增长](https://podcastnotes.org/lennys-podcast-with-lenny-rachitsky/nikita-bier-how-to-consistently-go-viral-the-playbook-for-winning-at-consumer-apps-lennys-podcast/)
- [levelsio：Even Nikita says it](https://x.com/levelsio/status/2109524844056543523)
- [levelsio：个人软件是创造力的爆发](https://x.com/levelsio/status/2109545183876616408)
- [hxiao：moat is gone, but also this](https://x.com/hxiao/status/2109507980714742072)
- [businessbarista：品牌与监管](https://x.com/businessbarista/status/2109601795765121259)
- [AskMichaelTaiwo：earned trust](https://x.com/AskMichaelTaiwo/status/2109601222407889096)
- [Anoop Kumar Bhat：品味、判断和信任](https://x.com/AnoopKumarBhat/status/2109603146393923823)
- [rsarver：执行速度是弱护城河](https://x.com/rsarver/status/2109602955494113447)
- [Eno Reyes：There is no moat](https://x.com/EnoReyes/status/2109540083284267356)
- [Roy Shilkrot：镐和铲](https://x.com/RoyShilkrot/status/2109606053549834346)
- [latentfidelity：What's even left to build](https://x.com/latentfidelity/status/2109498908854583296)
- [Nikita 的购物车回复](https://x.com/nikitabier/status/2109502507961766123)

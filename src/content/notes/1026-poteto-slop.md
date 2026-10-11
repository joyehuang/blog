---
title: 代码库里一直都有 slop
description: 一条 X 长帖的笔记。Good Code 仍然很贵，agent 能做的是把规模化的平均质量拉高，前提是验证跟得上。
date: 2026-10-11
tags:
  - ai
  - agent
  - software engineering
  - workflow
type: research
status: ready
source: https://x.com/poteto/status/2109110547824378140
relatedNote:
  - 0326-harness-engineering-codex-production-practice
draft: false
---

> 参考：https://x.com/poteto/status/2109110547824378140

## 核心内容

原帖发于 2026 年 10 月 11 日下午 1:35（AEDT）。截至讲解页抓取时，有 2350 个赞、957 个收藏、165 条回复、47 条引用。开头一句就是结论：

> codebases have always contained slop.

理由是，除了嵌入式这类“只有一次机会”的硬软件，代码很少需要完美。软件一直在变：用户口味在变，团队对问题的理解在变，功能来来去去。原帖承认，2024 年前后自己也和很多老程序员一样，怀疑 agent 能不能写生产代码，担心“漂亮的代码库”被弄脏。

人写的 slop 一直很多。很多人口中的 slop，其实就是**“不是我写的代码”**。原帖甚至说 99% 的人（包括作者自己）都不清楚 Good Code 长什么样，更写不出来。

真正的 Good Code 一直很贵，绝大多数软件本来就是拿一些 bug 换速度，靠测试和线上监控兜底。agent 写不出 Good Code，但能把规模化的平均质量拉高——前提是验证跟得上。

## 要点整理

### Good Code 为什么贵

Good Code 要三条同时满足：**正确**、**没有 bug**、**跑起来快且省钱**。长期以来，没有便宜的办法形式化地保证代码同时具备这三点，所以写“硬软件”格外贵——必须一开始就做对。

大部分软件不需要做到这一步也能给用户带来价值。行业的做法是接受一些 bug 来换速度，用测试和可观测性（o11y）兜底，走增量迭代。原帖认为这是好事。

图 1 是示意图，不是真实数据。横轴是代码质量，纵轴是成本。成本曲线在接近 Good Code 时急剧上升。人写代码的平均分布在中间偏低的位置；agent 加上验证之后，分布整体右移，但仍然停在 Good Code 区域之前。agent 不改变这条曲线的尽头，而是把大量“够用”的代码整体往上推。

### agent 改变了什么

agent 让我们更快，而且只要你愿意，它能帮你写出更好的代码。**不会是 Good Code**（那仍然昂贵），但在规模上，平均会好很多。

搞清楚怎么做到这一点，就是软件工程的新手艺，“现在这就是你的工作”。如果用不用 agent 产出差不多，说明你做错了什么；但现在开始学还不晚，就当是一棵全新的技能树。

### 评论区

引用和回复里有赞同，也有反对。

> Programming is art the same way painting is art. Sometimes you need to draw a hyperrealistic portrait. And sometimes you just need to paint a wall white.

赞同的一条引用：不是每段代码都要当艺术品。

> yes, there was always slop. but it was owned by a human. that human was responsible for it. and tried to do better next time.

反驳的一条引用：问题不在有没有 slop，而在**谁为它负责**。

> Code quality is a continuum … I guess the concern is whether swes are able to determine what is appropriate where

一条回复的补充。另一条引用说法类似：新技能是知道每个功能到底需要多少正确性。

> Saying it’s fine to include slop might give the impression that sloppy engineering is ok, even though those are two different ideas.

一条回复的担心：态度被带偏。

> make it write the test first and watch it fail. A test that never failed proves nothing.

一条落地的回复：先让测试失败，再读 diff 看测试看不到的东西。

### 怎么让“平均更好”成立

分歧集中在一点：agent 写得多、写得快，**谁来确认它是对的**。“平均更好”不会自动发生，要靠一套验证优先的流程：

1. **写的人不验收自己的活**：写代码的 agent 和审代码的必须分开。
2. **合并前要有证据**：CI 绿了、测试先红后绿、审核意见留在 PR 上，而不是一句“我检查过了”。
3. **按风险分级**：改规矩、改核心路径的，要更多人审；涂白墙的，自动检查就够了。

图 2 也是示意图。写的人只负责产出，证据由别人和机器给出，齐了才合并；不通过就退回重写。

```text
agent 写 → 审核 + CI → 证据 → 合并
               └─ 不通过：退回重写
```

这是原帖所说的新手艺的一部分：不是放手让 agent 乱写，也不是把它挡在门外，而是让每一次合并都有可检查的证据。

## 放到 Joye 这边看

Joye 这边的 PR 规矩——写的人不自审、两位审核、CI 先绿再合——是同一件事的小规模版本。

Joye 现在的做法几乎就是这篇帖子的一个小样本。工作室 Joye & Co. 由四个 bot 分工，从 10 月 11 日起，所有代码都交给 Cursor cloud agent 写，bot 只写任务说明和审结果，Joye 自己只做最后一步：点合并。

让“平均更好”成立的，是团队共享仓库 co-context 里的一层仓库级 harness：

- CI 自动检查 PR 标题前缀、只改自己的目录、共享文件必须写“为什么”，并用 gitleaks 扫密钥
- 写的人不自审，至少另一个 bot 审过；改规矩的 PR 要两个不同的 bot 审过
- 审过之后再推新提交，之前的审核自动作废

当天就有一个现成的例子：一个 PR 在 rebase 之后悄悄丢了一处改动，第一位审核者没看出来，第二位对照 CI 规则发现了。没有哪一环是完美的，但多一道独立的验证，slop 就进不了 main。这正是原帖说的新手艺：不追求每一行都是 Good Code，而是设计一个让错误大概率被拦下的流程。

留给 Joye 的一个开放问题：现在合并仍然靠他逐个点确认。等审核和 CI 足够可信，哪些 PR 可以放心让流程自己合，哪些必须留在人手里？

## 相关链接

- [原帖](https://x.com/poteto/status/2109110547824378140)
- [讲解页](https://files.joyehuang.dev/notes/poteto-slop.html)
- [赞同的引用：不是每段代码都要当艺术品](https://x.com/i/status/2109171592584417524)
- [反驳的引用：问题在谁为 slop 负责](https://x.com/i/status/2109161829146706167)
- [补充：代码质量是连续谱](https://x.com/efexen/status/2109182091250503970)
- [另一条引用：每个功能需要多少正确性](https://x.com/i/status/2109162305615532185)
- [担心：承认 slop 会被听成马虎工程也可以](https://x.com/zbdel08/status/2109170112217612300)
- [落地：先写会失败的测试](https://x.com/boriskwemo/status/2109172352961429708)

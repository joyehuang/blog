---
title: Cursor《Git at any scale》：WAL 优先的无状态 Git 存储与 Origin 的野心
description: Cursor 长文深读——packfile 设计为何让大规模 Git 托管成为噩梦、三条演进路线（分布式文件系统/Spokes/WAL）、Continuity 的 S3 WAL 优先设计（线性化 push、100 副本线性读扩展、压缩只在主节点），以及 Origin 发布背后的 agent 时代叙事。
date: 2026-09-02
updatedDate: 2026-09-02
tags:
  - software engineering
  - performance
  - architecture
  - agent
type: reference
status: ready
source: https://cursor.com/cn/blog/git-at-any-scale
draft: false
---

## 核心内容

Cursor 的 Git 基础设施长文（2026-08），从 Linus 设计 Git 的原始场景讲到他们自研的 Continuity 存储系统，最后落到新产品 Origin 的发布。这是一篇罕见地把「为什么 Git 服务器难做」从第一性原理讲清楚的文章。

## 问题根源：packfile

Git 是分布式版本控制系统——服务器上的仓库和开发者笔记本上的仓库本质相同。这个设计对 Linux Kernel 的去中心化维护者完美，但对**托管** Git 的公司是噩梦，根源在 packfile：

- packfile 是 Git 存储**和**网络通信的基础构件——推送/拉取都以 packfile 传输，无法绕开
- packfile 里的对象为体积最优而生：随机分布、压缩、**大多以增量形式存储**。DAG 图上一次逻辑跳转，落到磁盘上要经历多次物理跳转
- 由此推论：Git 的默认实现对本地文件系统语义（锁定、同步）做了大量假设，**跨数 GB 数据的随机遍历与网络文件系统天然不兼容**

## 历史上的三条路线

**1. 分布对象本身（DHT）**：Git 是内容寻址存储（SHA-1 为键），天然适合映射到分布式 KV——但不可行。Git 仓库是 DAG，任何操作都要遍历图，而遍历的每一步必须先拿到前一个指针才知道下一个指针——每次取指针都是一次分布式往返。最有前景的一次尝试（作者前导师 Shawn Pearce 在 Google 用 JGit + DHT）死于 Git 协议本身：无论服务端怎么存，**协议要求传输 packfile**，clone 性能差到放弃。

**2. 分布文件系统（GitHub 早期路线）**：保持 Rails 单体不变，把 Git 数据放到分布式 FS——NFS（很快放弃）、GFS 短暂部署、DRBD 长期部署，全部碰壁：运维糟糕 + 性能不达标，根因还是 packfile 的随机遍历。GitHub 最终转向 RPC 系统（仓库在专用文件服务器上），水平扩展可观，但可用性和最热仓库性能未解决。

**3. Spokes（2013 起，行业标准）**：三副本方案——每次 push 依次写三个节点的三份拷贝（ref 同步 + 内容同步）。成为行业标准，但**最终一致性**是软肋：副本间同步有延迟窗口，故障转移复杂——同一仓库若意外在两个以上节点触发维护操作，容易导致故障转移。

## Continuity：WAL 优先的无状态设计

Cursor 的方案把依赖倒过来——**不是「仓库 + 复制」，而是「WAL + 无状态副本」**：

- **push 流程**：客户端 push → 服务端把增量作为新 WAL 段写入 S3 → **WAL 完全持久化之前绝不确认 push**。所有 push 线性化
- **副本无状态**：任意数量的副本只跟随 WAL 重放，副本间零协调。读吞吐量随副本数**线性增长**——100 副本压测线性扩展，push 吞吐无回归
- **压缩只在主节点**：压缩结果同时应用于磁盘仓库和 WAL，副本跟随压缩事件，只需从 S3 下载已压缩的 pack——**以带宽换 CPU**
- **吞吐数字**：S3 Standard 持续 120 push/s（同时完成压缩+复制）；S3 Express One Zone 上 300+ push/s，瓶颈变成磁盘压缩速度
- **WAL 作为事实来源**的一致性回报：能看到仓库经历过的每个状态、拥有所有 push 和 repack 的完整溯源、可回退/快进每个副本、无外部数据库同步。出 Git 缺陷时能精确定位并还原——「我们引入的新缺陷极少，因为所有 Git 操作都是用现成工具链在磁盘上的普通 Git 仓库执行的」

与 Azure DevOps 路线（packfile 进对象存储 + 引用进 MS SQL Server）的对比：关系库能扛大引用事务，但要运维一个关系库——Cursor 选择不依赖任何外部数据库。

## Origin：agent 时代的叙事

文章的落点是产品发布 Origin（Git 托管平台）。支撑叙事的是 agent 改变量：**更多代码、更多 PR、更多 CI 运行**——版本控制是这一切的核心，也是最难短时间改变的系统。「托管他人的源代码责任重大」——开发者推不了代码，公司就停摆。

这个叙事值得注意：agent 让代码产出翻倍后，**基础设施层的瓶颈会依次暴露**——先 CI，再版本控制。Cursor 在押注「AI 公司的 Git 托管是下一个被重新做的层」。

## 当前理解 / 结论

- WAL 优先 + 无状态跟随者是一套通用的存储设计模式（不止 Git）：把「确认写」和「可见」解耦，一致性换扩展性，再拿线性化 push 把一致性买回来
- 文章的方法论示范了怎么讲一个基础设施故事：从设计初衷（Linus 为自己设计）→ 约束推导（packfile 的物理特性）→ 历史失败案例（每条都有具体公司和技术名）→ 自己的设计取舍（每个决定都有 why not）
- agent 时代的基础设施重做清单：Git 托管（Origin）、eval 基建、记忆系统、观测（trajectory）——「AI 原生的」前缀正在逐层替换上一代设施

## 相关链接 / 来源

- 原文：[Git at any scale — Cursor Blog](https://cursor.com/cn/blog/git-at-any-scale)（2026-08）
- 相关：Azure DevOps 的对象存储 Git 设计、GitHub Spokes 架构资料

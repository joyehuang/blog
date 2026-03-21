---
title: Prompt Engineering 常用模式
description: 整理的一些实用 Prompt 编写技巧和模式
date: 2026-03-01
tags: ['ai', 'prompt', 'llm']
locale: zh
translationKey: prompt-engineering-patterns
type: 'snippet'
status: 'in-progress'
draft: false
relatedArchive: ['llm-context-window-strategies']
source: 'https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering'
---

## 结构化 Prompt

使用 XML 标签或 JSON Schema 帮助模型理解结构

```xml
<task>
  <objective>...</objective>
  <constraints>...</constraints>
  <output_format>...</output_format>
</task>
```

## Chain of Thought

引导模型逐步推理

```
Let's think step by step:
1. First, ...
2. Then, ...
3. Finally, ...
```

## Few-shot Learning

提供示例但要注意多样性

```
Example 1: ...
Example 2: ...
Now, handle this case: ...
```

## 指令层级

System Prompt > Developer Instructions > User Input

## 待补充

- 角色扮演模式
- 反思模式 (Self-Reflection)
- 多智能体协作模式

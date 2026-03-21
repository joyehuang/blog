---
title: LLM Context Window Strategies
date: 2026-02-20
description: Practical notes on managing context windows in agent systems and long-running LLM workflows
tags: ['llm', 'agent', 'ai']
locale: en
translationKey: llm-context-window-strategies
routeSlug: llm-context-window-strategies
type: 'research'
status: 'incomplete'
draft: false
relatedArchive: ['prompt-engineering-patterns']
---

## The Core Problem

In agent-style systems, long-running conversations and tool traces can overflow the available context window much faster than people expect. The problem is not only token count. It is also that noisy history reduces the quality of the model's next decision.

## Practical Strategies

### 1. Keep the working set small

Only keep the information that is necessary for the next decision:

- the current task,
- the current state,
- the most relevant recent evidence,
- and any hard constraints the model must obey.

Everything else can move into summaries or external memory.

### 2. Summarize aggressively, but not blindly

Summaries should preserve:

- unresolved goals,
- tool results,
- open questions,
- and decisions that changed the plan.

If a summary removes those, the agent may sound coherent while quietly losing the thread.

### 3. Separate memory types

It helps to distinguish between:

- short-term conversational context,
- durable task memory,
- and external reference material.

Once these layers are mixed together, prompts become bloated and harder to debug.

## What Usually Fails

The most common failure mode is keeping too much raw history. The model then spends tokens re-reading things it no longer needs, while the truly relevant state is hidden in the middle of the transcript.

Another failure mode is over-compressing too early. If the system summarizes before the problem structure is stable, it may throw away the exact details needed for the next tool call or decision.

## Working Rule

My default rule is simple: keep raw context for the current step, keep structured summaries for the recent past, and keep durable knowledge outside the prompt unless it is needed right now.

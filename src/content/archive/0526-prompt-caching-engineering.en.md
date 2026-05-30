---
title: "Prompt Caching in Practice: Cache Design and defer_loading"
description: "Lessons from Claude Code's prompt caching: the philosophy behind cache design, how OpenAI / Anthropic / Google differ, and the defer_loading stub pattern."
date: 2026-05-24
updatedDate: 2026-05-24
tags:
  - ai
  - agent
  - llm
  - prompt
  - performance
  - software engineering
type: research
status: ready
source: https://claude.com/blog/lessons-from-building-claude-code-prompt-caching-is-everything
draft: false
language: en
translationKey: '0526-prompt-caching-engineering'
---

## Core content

> Reference post: https://claude.com/blog/lessons-from-building-claude-code-prompt-caching-is-everything

Notes from a deep dive on Claude Code's prompt caching, covering:

- How prompt caching works
- The principle "don't put dynamic information in the system prompt — put it in messages"
- A comparison of the caching strategies from OpenAI, Anthropic, and Google
- The defer_loading pattern — solving the caching problem when you have too many MCP tools

---

## Key takeaways

### 1. The foundation of prompt caching: prefix matching

Every time you call an LLM, you send the full prompt (system prompt + tools + conversation history). Recomputing tens of thousands of tokens on every request is both slow and expensive.

**How Anthropic does it**: if the **prefix** of this request is byte-for-byte identical to the previous one, the server simply reuses the cached intermediate computation. Cache-hit tokens are billed at only 10% of the normal price.

The catch: it has to be **identical from the very first token, byte for byte**. Change a single token anywhere, and everything from that point onward has to be recomputed.

**Cache-hit scenario**:
```
Request 1: [system A] [tools B] [turns 1, 2]
Request 2: [system A] [tools B] [turns 1, 2, 3]
           └─── this whole span hits the cache ───┘ └─new─┘
           price 10%                                 price 100%
```

**Cache-miss scenario**:
```
Request 1: [system A]  [tools B] [turns 1, 2]
Request 2: [system A'] [tools B] [turns 1, 2, 3]
           └ first token already changed, recompute everything ──┘
           price 100%
```

### 2. "Use messages for updates" — the core principle

This is the single most important practice: **don't touch the prompt prefix; stuff dynamic information into the messages instead.**

**Anti-pattern**: putting `Current time: 2026-05-24 14:30:00` in the system prompt. Five minutes later the time has changed, so you have to edit the system prompt — and the cache for the entire conversation history is blown.

**The right approach**: keep the system prompt static, and put dynamic information like the current time or file state into the next user message, wrapped in a `<system-reminder>` tag:

```
user message:
  <system-reminder>
  Current time: 2026-05-24 14:35:00
  File main.py was modified
  </system-reminder>
  Help me refactor this function
```

The payoff: the prefix is untouched, so the historical tokens keep their 10% pricing; only the newly added user message is billed at the normal rate.

**What this means for Hermes**: a long-running agent will inevitably need to feed the model lots of "current time," "recent events," and "environment state." Putting that information in the right place versus the wrong place is an order-of-magnitude difference in cost.

### 3. OpenAI vs Anthropic vs Google caching strategies

| Dimension | OpenAI | Anthropic | Google Gemini |
|------|--------|-----------|---------------|
| Control mechanism | Automatic, zero config | Explicit `cache_control` breakpoints | Explicit config |
| Hit rate | ~50% (uncontrollable) | 100% (when explicitly marked) | Configurable |
| Cache writes | Free | 25% more for 5 min, 2x for 1 h | Free |
| Cache reads | 50% cheaper | 90% cheaper | Cheaper |
| TTL | A few minutes (opaque) | 5 min or 1 h (explicit) | Up to 60 min |
| Minimum cacheable | 1024 tokens | 1024–4096 tokens (model-dependent) | Unclear |

**The key difference**: OpenAI is the "freebie" model — writes cost nothing extra, but you only save half. Anthropic is "pay for membership" — writes cost more, but reads save you 90%.

**How to choose in practice**:
- Quick prototype → OpenAI, no fuss
- Production agent / RAG, long prompts reused over and over → **Anthropic**, more control and a bigger discount
- For a long-running personal agent like Hermes → Anthropic is the better fit, because the agent loop runs round after round with the same system prompt + tools + conversation history — exactly the scenario where the 90% discount pays off

### 4. "Never add or remove tools mid-session"

The tools are part of the cached prefix. Adding or removing any tool mid-session blows the entire cache.

**The misleading intuition**: "I should only give the model the tools it needs right now." From a caching perspective, that intuition will kill you.

#### How Plan Mode solves it

Claude Code's approach: **don't swap the tool set — make "switching modes" a tool itself.**

- All tools stay resident in every request
- `EnterPlanMode` and `ExitPlanMode` are just two ordinary tools
- When you enter Plan Mode, a system message tells the model the current mode
- **The tool definitions never change**

A nice bonus: because `EnterPlanMode` is a tool, the model **can invoke it on its own** — when it detects a complex problem it can enter plan mode by itself, without the user triggering it, and without breaking the cache.

#### The defer_loading pattern (the focus of the second half)

The problem: a power user might have 20 MCP servers attached, each exposing a dozen-odd tools — over a hundred in total. Each tool definition is 200–500 tokens, so 100 tools = 30k–50k tokens.

A dilemma:
- **Stuff them all in**: the prefix is stable, but you carry 50k tokens on every request — expensive even at a 90% discount
- **Load on demand**: every time you add a tool you change the prefix, which is a cache miss — and that ends up costing more

**Anthropic's solution**: lightweight stubs + on-demand discovery

Every request still includes all 100 tools, but the vast majority are reduced to a single **stub**:

```json
// Before: full definition (~300 tokens)
{
  "name": "asana_create_task",
  "description": "Create a new task in Asana...",
  "input_schema": { ... }
}

// Now: stub (~20 tokens)
{
  "name": "asana_create_task",
  "defer_loading": true
  // no description, no schema
}
```

A stub has only the name + `defer_loading: true`, with no description and no schema — about 20 tokens each. 100 stubs = ~2k tokens, instead of 30k–50k.

The model uses a **tool search** tool to discover the full definitions when it needs them. The stubs always sit in the prefix in the same order, so the cache stays intact.

**The core trick**: you don't have to put all the information in the prefix. Just put a "name + discoverability" there, and let the model fetch the rest when it needs it. This shares a design philosophy with L2's FTS5 + LLM summaries — separating "instantly available" from "look up on demand."

### 5. Compaction — cache-safe context compression

When the context window is about to run out, you need to compress the conversation history. The naive approach walks straight into a hidden cost trap.

**The wrong approach**: spin up a separate API call to summarize

```
main convo:   [system A][tools A][180k turns]       ← cache hit
summary call: [system "please summarize"][][180k turns]  ← first token already differs
                                                    ← all 180k at full price, 10x more expensive
```

The problem: change the system prompt or the tools, and the cache is instantly blown. **The longer the conversation, the more this cut hurts.**

**The right approach: cache-safe forking** — reuse the exact same system + tools, and just append a single "please summarize" user message at the end:

```
main convo last request: [system A][tools A][180k turns]
Compaction request:      [system A][tools A][180k turns][user: "summarize this"]
                         └─────── this whole span hits the cache ────────┘└─new tokens─┘
```

All 180k tokens are billed at 10%, and only the final user message is billed at the normal rate.

**Compaction buffer**: compaction has to fire before the context is actually full. You need to reserve ~15–20k of headroom for "this compaction request + the summary it produces." Claude Code kicks off compaction at around 80–90% utilization, so the conversation never actually slams into the ceiling.

**After compaction**: replace the 180k of history with a single 5k summary user message — system + tools stay unchanged, and a new prefix cache starts accumulating from "system + tools + summary."

```
 before compaction:
 [system][tools][180k conversation history]
 └──────── all in the cache ────────┘

 after compaction:
 [system][tools][summary 5k][new turns...]
 └─ hit ─┘└─new prefix ─┘└─enters cache gradually ─┘
```

**What this means for Hermes**: a long-running agent will inevitably hit the context limit. The key implementation points:
1. Set a compaction threshold (e.g. 75% utilization)
2. On compaction, reuse system + tools and only append a single summarization instruction
3. After compressing, archive the raw history to disk — the summary is lossy, and you may need to look up details later
4. This connects with the snapshot idea from your earlier memory architecture: the summary is the compressed state of working memory, while the raw history moves into long-term storage

---

## Current understanding / conclusions

The four most valuable points from this discussion:

### 1. Caching is a design constraint you must — not may — account for
It's not something you bolt on during an optimization phase; it fundamentally dictates how you should organize your prompt. Hermes's several system-prompt blocks, its tool list, its conversation history — if you don't respect the cache boundaries, every feature you add is just burning money.

### 2. "Put it in messages, not in system" should be a basic norm of agent development
All dynamically changing information (time, file state, environment variables, recent events) should be passed via messages, never allowed into the cached prefix. This principle should be baked into Hermes's prompt-construction logic.

### 3. defer_loading is a more general "lightweight stub + demand discovery" pattern
It applies not just to tools, but to any piece of information that occupies space in the prefix yet is rarely invoked. The core design pattern: **keep the prefix lightweight and stable, and turn heavyweight information into a discoverable resource.**

### 4. Compaction isn't something you do once the context is full — it's actively managed
The right approach is cache-safe forking: reuse the exact same system + tools and only append a summarization instruction at the end of the conversation. The compressed history is archived to disk, and the summary — as the compressed state of working memory — keeps accumulating new cache. For a long-running agent, this is a must-have capability.

---

## Related links / sources

- Reference post: https://claude.com/blog/lessons-from-building-claude-code-prompt-caching-is-everything
- Compaction docs: https://platform.claude.com/docs/en/build-with-claude/compaction
- defer_loading docs: https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool
</content>
</invoke>

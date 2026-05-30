---
title: "Hermes Agent Memory: A Four-Layer L0–L2 Design"
description: "Hermes Agent's memory system: system-prompt assembly (L0), persistent memory (L1), external plugins (L1.5), session search (L2), and compression. No vector DB."
date: 2026-05-24
updatedDate: 2026-05-24
tags:
  - ai
  - agent
  - llm
  - memory
  - retrieval
  - search
  - sqlite
  - architecture
type: research
status: ready
source: https://github.com/nousresearch/hermes-agent
relatedArchive:
  - 0504-hermes-memory-safety-mechanisms
draft: false
language: en
translationKey: '0526-hermes-fts5-session-search'
---

## Core idea

Hermes Agent's memory system is built from **four cooperating layers**, stratified by degree of persistence and access pattern:

```
L0  — Working context (system prompt + injected memory blocks)  ← valid within a session
L1  — Persistent memory (memory_tool, file-level storage)
L1.5 — External memory plugins (honcho / mem0 / supermemory, etc.)
L2  — Session search (session_search_tool, SQLite FTS5 + LLM summarization)  ← cross-session, on-demand retrieval
```

Plus one **cross-cutting layer**: **context compression + session splitting**, which handles context-window management for very long conversations.

The core philosophy is **layered decoupling**: each layer does only what it's good at — no vector database, no external search service.

---

## Key points

### 0. Design principles

The Hermes memory system follows a few key design philosophies:

1. **Frozen snapshot pattern**: L1 memory is frozen into the system prompt at session startup. Writes during the session don't change the prompt, which preserves the prefix cache.
2. **On-demand recall**: L2 search is triggered by tool calls, not injected every turn — cost and benefit are precisely aligned.
3. **Decoupled search and understand**: FTS5 does cheap, wide recall; the LLM does the expensive semantic refinement.
4. **Plugin extensibility**: external memory providers plug in through the `MemoryProvider` ABC, supporting a variety of backends.
5. **Safety-first**: every write path has safeguards — injection scanning, file locks, atomic writes, and more.

### 0.5 The core tradeoff: the prefix-cache economics

The key to understanding the Hermes memory architecture is understanding the **economics of the prefix cache**. This isn't a design detail — it's the very premise on which the entire frozen-snapshot scheme rests.

**How the prefix cache works**: the core cost of LLM inference comes from prefill (processing the input tokens). Anthropic, OpenAI, and Google all optimize for this — if the first N tokens of the current request are exactly identical to a previous request, the KV cache can be reused directly, skipping prefill. The cache is indexed by **prefix hash**, matching contiguously from token 0. Anthropic's prompt caching bills the cache-hit portion at 10% of the normal price (writes are billed at 1.25x), with a default 5-minute TTL.

**The explosive payoff of the prefix cache in agent scenarios**: in a typical long agent task, by turn 50 the input might be 80,000 tokens — but those 5,000 tokens of system prompt never change, so every turn can pull them from cache. The first 49 turns of conversation history are also unchanged, so they come from cache too. The only thing that genuinely needs prefill on turn 50 is the latest increment. If the cache stays warm the whole way through, Anthropic claims it can cut input cost by 90% and improve latency 2x — **and in agent scenarios the savings are even more dramatic**.

**The hidden cost of the frozen snapshot**: if you switch to the naive approach (dynamically inject memory → the moment the agent writes one entry, update the system prompt immediately), the instant the system prompt changes, **the entire session's prefix cache is invalidated**. The 49 turns of cache you'd built up are thrown away for nothing. Writing one memory entry is equivalent to discarding tens of thousands of tokens of cache — roughly $0.10–0.30 per write at Sonnet prices.

**Hermes's choice**: it pays the price of **deferring writes to the next session** in exchange for the economic benefit of **prefix-cache hits the whole way through**. The tool response returns the live state in real time ("successfully wrote X"), so the model knows what it wrote and won't go wrong at the logical level.

**The core triangle tradeoff**: a memory architecture is fundamentally a choice among **latency / cost / consistency**.
- Want real-time updates (low latency) → sacrifice cache (high cost)
- Want to save money (low cost) → sacrifice immediacy (high latency)
- Want multi-agent consistency → you usually have to sacrifice on both sides

Hermes chose cost first, which is reasonable for the CLI-agent scenario. But anyone building a memory system should first think clearly about one thing: **who pays the cost of invalidation?**

### L0: System-prompt assembly and working context

**Mechanism**: the `_build_system_prompt()` method in `run_agent.py` assembles the system prompt at session startup.

**What it's made of** (in order):
1. The agent's identity definition (`SOUL.md`, or the default identity)
2. The user/system message (if provided)
3. L1 memory blocks: a **frozen snapshot** of `MEMORY.md` and `USER.md` (see the L1 section)
4. The `system_prompt_block()` output from external memory providers
5. Skills guidance, context files like AGENTS.md/CLAUDE.md, etc.
6. Date/time information
7. Platform hints (CLI / Telegram / Discord, etc.)

**Caching strategy**: the system prompt is cached in `_cached_system_prompt` and only rebuilt during context compression — it stays constant on ordinary turns. This preserves the model provider's **prefix cache** (prompt caching), substantially reducing latency and cost.

**Per-turn context injection**: before each API call, the `prefetch()` results from external memory providers are injected into the current user message as a `<memory-context>...</memory-context>` fence block.
- Key design point: it's injected only at API-call time. The original message is never mutated, so nothing leaks into session persistence.
- Wrapped via `build_memory_context_block()`, working together with the `StreamingContextScrubber` in streaming responses to handle the boundary fences.

---

### L1: Persistent memory (memory_tool)

**Storage**: two markdown files under `$HERMES_HOME/memories/`:
- `MEMORY.md` — the agent's personal notes (environment facts, project conventions, lessons learned)
- `USER.md` — a user profile (preferences, communication style, habits)

**Tool interface**: a single `memory` tool with three actions:
- `memory(target="memory"|"user", action="add", content="...")`
- `memory(action="replace", old_text="...", content="...")`
- `memory(action="remove", old_text="...")`

**Entry format**: entries are separated by `\n§\n` (the section symbol). There are no IDs — replace/remove locate entries by unique-substring matching.

**Default capacity**: Memory = 2200 characters, User = 1375 characters (character counts rather than token counts, because character counting is model-independent). When the limit is exceeded, it returns an error message and lets the agent decide which content to replace.

**Frozen snapshot pattern (the core design)**:

```
Session startup → load_from_disk() reads MEMORY.md/USER.md
              → captures _system_prompt_snapshot
              → snapshot injected into the system prompt (preserves the prefix cache)

During the session → writes update the disk files (persisted immediately)
                  → the system prompt is not modified (preserves the prefix cache)

Next session → re-read the files → new snapshot → new prompt
```

This is the most elegant design decision: **memory writes are persisted immediately, but the snapshot is frozen**. Two states coexist in parallel:
- **The frozen snapshot** (`_system_prompt_snapshot`) → used for system-prompt injection, unchanging within the session
- **The live entries** (`self.entries`) → used for the return value of tool calls, reflecting the latest state in real time

**Safety mechanisms** (see `/en/archive/0504-hermes-memory-safety-mechanisms` for details):
1. Injection scanning: regex for 13 threat patterns + invisible-Unicode detection
2. File locking: `fcntl.flock` (Unix) / `msvcrt` (Windows) via a separate `.lock` file
3. Re-read under lock: re-read the on-disk state under the lock before writing, to prevent lost updates
4. Hard capacity rejection: return a full-context error when the limit is exceeded
5. Atomic writes: temp file → fsync → `os.replace()`, so readers always see a consistent state
6. Substring matching: replace/remove use a unique substring rather than the full text, reducing errors from the LLM's precision

---

### L1.5: External memory plugin architecture

**The MemoryProvider ABC** (`agent/memory_provider.py`) defines the full lifecycle:
- Core: `is_available()`, `initialize()`, `system_prompt_block()`, `prefetch()`, `queue_prefetch()`, `sync_turn()`, `get_tool_schemas()`, `handle_tool_call()`, `shutdown()`
- Optional hooks: `on_turn_start()`, `on_session_end()`, `on_session_switch()`, `on_pre_compress()`, `on_delegation()`, `on_memory_write()`, `get_config_schema()`, `save_config()`

**The MemoryManager** (`agent/memory_manager.py`) manages all memory providers:
- Always registers `BuiltinMemoryProvider` first (it can't be removed)
- Allows at most **one** external provider (a second one is rejected with a warning)
- Routes tool calls via a `tool_name → provider` index
- A metadata-compatibility shim layer: it auto-detects the parameter signature of `on_memory_write()` (positional/keyword/legacy)
- Context fencing: `sanitize_context()` strips `<memory-context>` tags from output; `StreamingContextScrubber` handles boundary fences in streaming responses
- `build_memory_context_block()` wraps the prefetch output in a fence block with system instructions

**Bundled plugins** (`plugins/memory/`):

| Plugin | Description |
|--------|-------------|
| honcho | Honcho API backend |
| mem0 | Mem0 memory backend |
| supermemory | Supermemory API |
| retaindb | RetainDB storage |
| hindsight | Pluggable hindsight recall |
| holographic | Holographic memory + retrieval store |
| openviking | File-based memory, defining its own L0/L1/L2 three-layer scheme |
| byterover | Byte-level memory store |

**Loading mechanism**: it scans two locations — the built-in `plugins/memory/<name>/` and the user-installed `$HERMES_HOME/plugins/<name>/`. Built-in takes precedence. Heuristic detection: it looks for a `MemoryProvider` subclass or `register_memory_provider` in `__init__.py`.

---

### L2: Session search (session_search_tool + hermes_state.py)

#### Storage foundation: SQLite + dual FTS5 virtual tables

The `messages` table in `~/.hermes/state.db`, with WAL mode on (multi-reader, single-writer). Every message from every CLI / Telegram / Discord / cron session lands here.

`state.db` contains five core tables:
- `sessions` — session metadata (ID, source, model, timestamps, token count, cost, title, parent_session_id)
- `messages` — the complete conversation history (role, content, tool_calls, reasoning)
- `messages_fts` — an FTS5 virtual table with the unicode61 tokenizer
- `messages_fts_trigram` — an FTS5 virtual table with the trigram tokenizer
- `state_meta` — a key/value store

Two parallel FTS5 virtual tables, kept in sync automatically via triggers:

```sql
-- Default unicode61 tokenizer (Latin/English-friendly)
CREATE VIRTUAL TABLE messages_fts USING fts5(content);

-- trigram tokenizer (CJK / arbitrary-script substring matching)
CREATE VIRTUAL TABLE messages_fts_trigram USING fts5(
  content,
  tokenize='trigram'
);
```

**Key design point**: the trigger indexes the concatenation of `content + tool_name + tool_calls` — so the arguments of tool calls are searchable too, not just chat text. In an agent system, a lot of signal is buried in tool arguments.

**CJK detection heuristic**: at search time, ≥3 CJK characters → take the trigram path; 1–2 CJK characters → fall back to LIKE.

#### Write path: zero extra cost

When each message is stored in SQLite, the trigger maintains the FTS index automatically. No embedding inference, no vector-store write. The disk IO is just a single SQLite fsync.

#### Retrieval path: a ten-step pipeline

The full flow when the agent calls the `session_search` tool:

1. **Empty query** → `_list_recent_sessions()`: a pure database query, zero LLM cost, returns titles and previews.

2. **Keyword query** → `db.search_messages()`: FTS5 MATCH + snippets (the match plus surrounding context), ranked by BM25.

3. **FTS5 query sanitization**: `_sanitize_fts5_query()` escapes FTS special characters; terms containing `-` or `.` are auto-quoted.

4. **Group by session_id** and deduplicate.

5. **Lineage exclusion**: parse the delegation chain (recursively walking parent_session_id) and exclude the current session's entire ancestor/descendant chain.

6. **Take the top N**: 3 sessions by default, 5 at most.

7. **Load the full conversation**: `get_messages_as_conversation()` → formatted into readable text.

8. **Smart truncation** (`_truncate_around_matches`): three strategies — full-phrase match → term proximity co-occurrence (a 200-character window) → individual term positions. It picks the window that covers the most match positions. 25% before the match point, 75% after.

9. **Concurrent LLM summarization**: send the truncated text plus a structured prompt to a helper model (Gemini Flash by default, temperature=0.1). Concurrency is bounded (3 by default, 5 at most), with a 90s aggregate timeout.

10. **Fallback**: if the summarizer is unavailable, return the raw preview snippets.

#### Why FTS5 instead of vectors

This is the argument in this design most worth unpacking:

**BM25 is underrated on single-user data.** When a user searches for something they wrote themselves, the query terms and the original message tend to share a vocabulary. Semantic generalization is a liability here — it would also pull in content from other sessions that merely discussed a similar topic.

**Trigram is the structurally correct choice for CJK in mixed Chinese-English scenarios.** Chinese has no spaces, and jieba tokenization is either too aggressive or not aggressive enough. Trigram is character-level n-grams, so substring matching is free. In agent scenarios — mixed Chinese and English, dense with technical terms, full of newly coined concepts — trigram is far more robust than tokenization.

**Zero write latency** (not counting embedding). **Zero ops** (SQLite rides along with the main process; no need to deploy Qdrant/Chroma). **Cross-device sync** is just copying a single .db file.

#### The query-focused summary is the key innovation

At this step, most RAG systems either return chunks (and let the main model read them itself) or do a query-agnostic summary.

A query-focused summary is effectively a **soft rerank with reasoning**: a small model reads a 100k-character window and is asked to "summarize with respect to query X" — it's doing semantic matching, and it's a rerank with reasoning, not a similarity score.

**The core benefits**:
- **Information density goes from ~10% up to ~80%**. Irrelevant tokens never enter the main model's context.
- **It absorbs part of the need for semantic generalization.** FTS5 won't match "deadlock" with "the ReAct loop got stuck," but if the query "deadlock" had a literal hit in another session, FTS5 recalls that session, and then the summary prompt has the LLM — when it reads "the ReAct loop got stuck" — recognize that this is the deadlock the user asked about, and translate it in the summary into "the user previously solved a ReAct-loop hang with max_iter."
- The work of semantic generalization is **deferred from the recall stage to the summarization stage**.

#### The asymmetric cost structure

| Operation | Frequency | Cost per call |
|-----------|-----------|---------------|
| FTS5 write | per message | near zero |
| FTS5 retrieval | per session_search | near zero |
| LLM summarization | per session with a match | a Gemini Flash call |
| Vector write | per message | medium (embedding inference) |
| Vector retrieval | per search | medium (ANN index) |

**The key asymmetry**: FTS5 recall is cheap, so you can use a wider recall aperture without worrying about cost. You can even widen recall by OR-expanding the query — because once you reach the summarization stage, the LLM filters it itself. If recall were expensive (e.g., having to compute embeddings every time), you'd have to narrow the recall aperture, and that's exactly what causes missed recall.

#### Tool interface

```python
session_search(
    query: str = "",       # optional: keywords, phrases, OR/AND/NOT booleans, prefix (deploy*)
    role_filter: str = "", # optional: comma-separated role restrictions
    limit: int = 3        # number of sessions (3 by default, 5 at most)
)
```

---

### Context compression and session splitting

When the conversation context exceeds 75% of the model's limit (the threshold is configurable), compression is triggered:

1. `context_compressor.compress()` summarizes the middle turns and returns a compressed message list.
2. **Middle-section protection**: it keeps the first 3 messages plus up to the last 6 (adjusted by token budget).
3. **Iterative summary updates**: each compression preserves the previous summary and keeps accumulating — so information persists across multiple compressions.
4. The old session ends with `end_reason='compression'`.
5. A **new session is created**, with `parent_session_id=old session ID`.
6. The title is auto-numbered: "My Session" → "My Session #2" (via `get_next_title_in_lineage()`).
7. Memory providers receive `on_session_switch(reset=False, reason="compression")`.
8. The context engine receives `on_session_start(boundary_reason="compression")` for DAG-lineage maintenance.

**Compression-tip tracking**: the `get_compression_tip()` method walks forward along the chain (up to 100 hops), distinguishing a compression continuation from a sub-agent delegation — via timestamp comparison: the sub-agent's started_at >= the parent's ended_at (a delegated sub-session is created after the parent ends).

**The ordinary-user view**: `list_sessions_rich()` by default projects a compression chain onto its latest tip, so one logical conversation = one list entry.

---

### The complete memory lifecycle

```
AIAgent.__init__()
  └─ MemoryManager() created
      ├─ BuiltinMemoryProvider registered (cannot be removed)
      └─ external provider loaded from config memory.provider

initialize_all(session_id, platform)
  └─ all providers initialized

Session startup (_build_system_prompt)
  ├─ MemoryStore.load_from_disk() → reads MEMORY.md/USER.md → freezes snapshot
  ├─ L1 memory blocks + external provider blocks injected into the system prompt
  └─ system prompt cached (prefix cache takes effect)

Each turn
  ├─ on_turn_start()
  ├─ prefetch_all(user_message) → results wrapped into a <memory-context> fence
  ├─ injected into the API call (not persisted in messages)
  ├─ AI response + tool calls
  │    └─ tool calls memory() → on_memory_write() syncs to the external provider
  ├─ sync_all(user, response) → persists this turn
  └─ queue_prefetch_all() → warms up the next prefetch in the background

Context compression (context > 75% of the limit)
  ├─ compress() → summarizes the middle turns
  ├─ on_pre_compress() → extracts provider insights
  ├─ old session ends (end_reason='compression')
  └─ new session created (parent_session_id=old session_id)
      └─ on_session_start(boundary_reason="compression")

Session end
  ├─ on_session_end(messages)
  └─ shutdown_all()
```

---

## How the layers relate

| Layer | Name | Mechanism | Scope | Persistence | Injection point |
|-------|------|-----------|-------|-------------|-----------------|
| **L0** | System prompt + context injection | `_build_system_prompt()` assembly, L1 blocks + provider blocks | Current session | Rebuilt on compression | System prompt; per-turn `<memory-context>` fence block |
| **L1** | Persistent memory | `memory_tool.py`, MEMORY.md / USER.md | Cross-session | Disk files, snapshotted at session startup | System prompt (frozen at session start) |
| **L1.5** | External memory providers | `MemoryProvider` plugins via `MemoryManager` | Cross-session | Varies by plugin (API, local DB, etc.) | Provider `system_prompt_block()` + `prefetch()` context |
| **L2** | Session search | `session_search_tool.py`, SQLite FTS5 | Cross-session (all history) | SQLite state.db | On demand, via tool call |
| **Compression** | Context-window management | `context_compressor.py` | Past turns of the current session | Summary persisted as a compressed message + session split | Replaces compressed messages with a compact summary |

These five layers aren't mutually exclusive — they **work together**:
- L0 is the **resident** context: the agent always "knows" this information
- L1 is **deliberately written** memory: the agent judges that "this is worth remembering"
- L1.5 is the **external extension**: a third-party service extends the memory capability
- L2 is **on-demand recall**: it only searches history when needed
- Compression is the **emergency mechanism**: it triggers only when a conversation gets too long, and afterward maintains retrievability via session splitting

---

## Relationship to the other memory cards

The earlier `/en/archive/0504-hermes-memory-safety-mechanisms` analyzed, from a **security angle**, the six safety mechanisms of L1's `memory_tool.py` in detail (injection scanning, file locks, re-read under lock, capacity rejection, atomic writes, substring matching).

This card covers, from an **architecture angle**, all four layers of the entire memory system and their interactions, including:
- L0 system-prompt assembly and caching strategy
- L1's frozen snapshot pattern (not covered in 0504)
- L1.5 external memory plugin architecture
- The full L2 retrieval pipeline
- The context-compression and session-splitting mechanism
- The complete memory lifecycle
- How the layers relate and the design philosophy

---

## Design tradeoffs and known limitations

### 1. The fragility of consolidation

Hermes's consolidation (memory tidying) scheme is the **weakest link**. The core problem is that it "relies on the model being conscientious":

- **Consolidation is a low-priority action**: while executing a task, the agent's attention is on the current request. When it sees a header like "[85% — 1,870/2,200]", it'll most likely go "yeah, noted" and keep working. Unless there's an explicit error (capacity exceeded), it won't proactively tidy up.
- **Consolidation is itself a hard task**: truly tidying up requires judging which information is stale, which can be merged, and which is old but still critical. The agent has no mental space to do this meta-task well.
- **The error-recovery path is heavy**: capacity exceeded → echo all entries → have the model review → output replace operations. A single round costs several thousand tokens, and the model might delete aggressively in order to "solve the problem quickly."

This is an MVP-level scheme — it works because memory grows slowly in Hermes's target scenario (a CLI agent, single user), so hitting 80% capacity is itself rare. Move it to a high-frequency-write scenario and it would collapse immediately.

### 2. The ceiling of a flat namespace

The main limitations of using just the two files MEMORY.md + USER.md:

- **No structured index**: all memory is flattened into a single file, with no categories, no tags, no recency.
- **A capacity ceiling**: once you exceed 2200/1375 characters, all you can do is lossy compression. If the memory volume keeps growing, this architecture has no fallback — short of raising the memory store's own capacity (limited by how much the system prompt can hold).
- **The write path and read path are coupled**: writes are persisted immediately, but reads depend on the snapshot taken at session startup. A write can't take effect within the same session.

### 3. Comparison with alternatives

| Scheme | Core mechanism | Cache-friendliness | Scalability | Implementation complexity | Suited for |
|--------|----------------|--------------------|-------------|---------------------------|------------|
| **Hermes (L1 frozen snapshot)** | File → system-prompt snapshot, frozen within the session | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | Single user, slow-changing memory, CLI agent |
| **Sliding window + summary** | Keep the most recent N turns, compress earlier ones into a summary | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | Long conversations where the memory need is concentrated on "what happened recently" |
| **Letta / MemGPT (tiered)** | Three tiers — working/recall/archival — with the model actively moving data | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | Long-horizon, single agent, high memory density |
| **Vector RAG** | Each turn retrieves top-k by query and injects | ⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | Scales nearly without limit, but preference-type memory is hard to recall |
| **Knowledge graph** | entity-relation triples → graph queries | ⭐ | ⭐⭐⭐⭐⭐ | ⭐ | Factual, precise retrieval; multi-hop reasoning |
| **Hybrid scheme (production-grade)** | snapshot + vector + KV + keyword, multi-path recall | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐ | Multi-user, cross-session, production systems |

**The insight behind the hybrid scheme**: different types of memory have different access patterns and should use different storage.
- Stable preference/identity information → snapshot into the system prompt (preserve the cache)
- Temporary in-session state → leave it in the conversation history
- Cross-session factual memory → vector store + keyword index, dual-path recall
- Structured attributes (name, occupation) → a separate KV store

### 4. Possible directions for improvement

Given the current architecture's limitations, the following improvements are meaningful:

1. **A background curator agent**: a standalone memory-tidying agent that periodically scans the memory store to deduplicate, merge, and mark staleness. The main agent doesn't bear the tidying burden. Writes are cheap (just append), tidying is asynchronous (runs in the background), and reads are tiered (frequent ones go into the prompt, long-tail ones go through recall).
2. **Categorized memory**: split memory into three classes — identity/preferences (into the system prompt), episodic facts (recalled on demand), and working state (in the conversation history).
3. **Dual-track recall**: a keyword inverted index (handling "the X I mentioned last time") + embeddings (semantic similarity) + a structured KV (deterministic queries), three paths per turn + rerank.
4. **Active learning**: give the model an explicit `remember_this()` tool so it proactively writes when it notices key information, rather than tidying up passively after the fact.

The most valuable thing about Hermes's memory system isn't any single technical choice (FTS5 vs vectors, MEMORY.md vs SQLite) — it's **the design philosophy of the whole layered architecture**:

1. The **frozen snapshot pattern** lets persistent-memory writes leave the current session's latency and cost untouched.
2. **Decoupled search and understand** lets FTS5 and the LLM each do what they're best at.
3. **On-demand recall** ensures the cost and benefit of memory retrieval are precisely aligned.
4. **Plugin extensibility** lets the memory backend be swapped out without affecting the core architecture.
5. The **safety-first** approach puts safeguards on every write path.

For single-user agent scenarios, this is a practical, runnable design that fits better than the "embedding everything" vector-RAG approach.

**Directions worth considering in the future**:
1. L2 query expansion (use an LLM to expand the user's query into multiple FTS5 sub-queries)
2. Session-level metadata filtering (time range, source filtering)
3. Evaluating and improving summary quality (is the Gemini Flash currently in use good enough?)
4. Introducing a middle layer (working memory / episodic buffer)

---

## Related links / sources

- Hermes Agent source: `tools/memory_tool.py`, `tools/session_search_tool.py`, `hermes_state.py`, `agent/memory_manager.py`, `agent/memory_provider.py`, `agent/context_compressor.py`, `plugins/memory/`
- Related archive: 0504-hermes-memory-safety-mechanisms (a detailed walkthrough of the L1 safety mechanisms)

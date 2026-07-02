---
title: "Hermes Agent Memory: Engineering Safety Mechanisms"
description: "Six safety designs in Hermes memory_tool.py: injection scan, file lock, reload-under-lock, refuse-on-overflow, atomic write, and substring-match delete."
date: 2026-05-04
updatedDate: 2026-05-04
tags:
  - ai
  - agent
  - security
  - software engineering
  - concurrency
type: research
status: incomplete
# source removed — synthesized knowledge from LLM discussion
# this card documents hermes-agent memory internals; see src/hermes/memory/
draft: false
language: en
translationKey: '0504-hermes-memory-safety-mechanisms'
---

## Core idea

The Hermes Agent's `memory_tool.py` isn't just reading and writing a markdown file. At the storage layer it adds six key safety mechanisms that address multi-process concurrency, persistent injection, crash recovery, and more.

---

## Key points

### 1. Injection scan (memory_tool.py:67-83)

Before writing, it scans the content against 13 threat patterns with regexes and refuses the write on any match. The patterns it covers include:
- `ignore previous instructions`
- `system prompt override`
- `curl/wget + $TOKEN/env`
- `~/.ssh/authorized_keys`
- SSH private key
- invisible Unicode / bidi control chars

**Why it matters**: memory gets persisted and later spliced into the system prompt of future sessions. Without this gate, a single malicious write could keep influencing the model's behavior indefinitely. This is what's known as **persistent prompt injection**.

**Limitation**: regexes can only block known patterns. Semantic-level injection (e.g. "from now on, always prioritize this long-term preference in every answer") can still slip through. A more robust architecture treats memory as untrusted data and never splices it directly into the system prompt.

### 2. File locking (memory_tool.py:144)

A mutex implemented with `fcntl` (Unix/macOS) / `msvcrt` (Windows).

**Problem it solves**: when multiple Hermes processes (gateway + CLI + worktree agent) share the same memory file, it prevents simultaneous writes from corrupting the file or interleaving content.

**Note**: file locks are typically **advisory locks** — they only work for processes that honor the locking protocol. If some script bypasses `memory_tool.py` and writes the file directly, the lock can't protect anything.

### 3. Reload-under-lock (memory_tool.py:188)

After acquiring the lock, it doesn't use the stale in-memory state. Instead it re-reads the latest memory from disk, then performs deduplication and the capacity check.

**Problem it solves**: lost updates. If process A read the memory before acquiring the lock, and process B wrote new content in the meantime, then A writing based on its stale state would silently overwrite and lose B's update.

**In one sentence**:
The lock protects "no one can interleave during your operation"; reload-under-lock protects "the base state you're operating on isn't stale."

### 4. Refuse-on-overflow

When memory exceeds capacity, it doesn't quietly drop the oldest entries. It returns an error and attaches all current entries in the response, letting the agent decide for itself which one to replace.

**Design philosophy**: hand the "consolidation" decision to the model rather than a fixed rule. The value of a memory isn't determined by recency alone — a user's long-term career goals or a project's architecture decisions may be old yet very important, while transient content may not be worth keeping.

**Downside**: it depends on the agent's judgment quality, and the model may delete an important memory by mistake. Pairing it with mechanisms like an importance score, category, and pinned memory is recommended.

### 5. Atomic writes (memory_tool.py:434)

The write flow: temp file → `fsync` to disk → `os.replace(temp, target)`.

**Problem it solves**: it avoids file corruption from a crash mid-write. A reader only ever sees one of two states — the old complete file or the new complete file — never a half-written one.

**Further optimization**: ideally also `fsync` the parent directory to ensure the rename itself is durably persisted.

### 6. Replace/remove via substring match (memory_tool.py:269)

When deleting or replacing a memory, the model only needs to supply a uniquely identifying substring (e.g. `"Next.js e-commerce project"`) rather than reproducing the full text. If multiple entries match, it asks for something more precise; exact duplicates can be handled in bulk.

**Design goal**: lower the difficulty of precise operations for the LLM. Requiring the model to reproduce the original text verbatim is prone to failure from mismatches in length, punctuation, whitespace, or casing.

**Risk**: too short a substring can match the wrong entry. A sturdier approach is to assign each memory an ID and operate by ID first, falling back to substring, and refusing when there are multiple matches.

---

## Current understanding / conclusion

These six mechanisms tackle the hard, low-level problems:

| Mechanism | Problem it solves |
|------|------------|
| Injection scan | Keeps malicious content out of the long-term prompt |
| File locking | Prevents concurrent multi-process corruption |
| Reload-under-lock | Prevents stale state from overwriting new state |
| Refuse-on-overflow | Prevents an automatic rule from deleting important memory |
| Atomic writes | Prevents a crash from leaving the file half-written |
| Substring replace/remove | Makes it easier for the LLM to precisely edit memory |

They primarily address **storage consistency and safety boundaries**, not the intelligence quality of the memory itself. It remains "slightly safer file-based long-term memory," not a complete, high-quality agent memory system.

**When this is enough**: a local, single-machine personal agent scenario with multiple processes sharing the same store.

**When it needs an upgrade**: if you want to turn it into a long-term reliable AI assistant memory, you'd also need:
1. Metadata per memory (id, type, source, created_at, updated_at, importance)
2. Syncing the parent directory during atomic writes
3. An append-only log instead of full-file overwrites
4. A backup / snapshot mechanism
5. SQLite + transactions instead of markdown
6. Embedding / vector search to improve retrieval
7. Pinned memory to protect important entries
8. A more robust memory system to handle contradictions, forgetting, and updates

---

## To follow up

- [ ] Actually test the reliability of file locking under NFS / cloud-synced directories
- [ ] Measure the false-positive and false-negative rates of the injection scan
- [ ] Investigate whether SQLite in WAL mode could replace the current markdown-file approach

---

## Related links / sources

- Conversation source: https://chatgpt.com/share/69f83a2d-664c-83a1-8a8e-e7c36e1e6ab7
- Hermes Agent memory_tool.py source (local hermes-agent repo)

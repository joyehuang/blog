---
title: Message Types in the Vercel AI SDK
description: "Notes on how the Vercel AI SDK layers its Message types, its SSE streaming protocol, and practical state-management advice for real-world development."
date: 2026-04-10
updatedDate: 2026-04-10
tags:
  - ai
  - llm
  - frontend
  - react
  - typescript
  - agent
  - reference
type: reference
status: ready
# source removed — synthesized knowledge from LLM discussion
draft: false
language: en
translationKey: '0426-vercel-ai-sdk-message-types'
---

## Core idea

This note is mainly about the two message models in Vercel AI SDK 6.x:

- `ModelMessage`
- `UIMessage`

Both look like "chat messages," but their responsibilities are completely different.

A more accurate way to think about it:

- `ModelMessage` is the input format the model sees
- `UIMessage` is the complete message format that the frontend and application state management see

The core value of this design isn't simply that the type names changed — it's that "model context" and "UI state" are now cleanly separated, which cuts down on the chaos around tool calls, streaming rendering, and message persistence.

This thread also added another crucial layer of understanding:

- What `streamText()` returns is not "raw SSE"
- The actual streaming protocol gets wrapped one step later, at `fullStream -> toUIMessageStreamResponse()`
- What the frontend `useChat()` consumes is the AI SDK's standardized **SSE Data Stream Protocol**

## Key points

### 1. `ModelMessage` is the clean message handed to the LLM

`ModelMessage` belongs to the AI SDK Core layer and is mainly used by functions like:

- `streamText`
- `generateText`
- `streamObject`

Its whole point is to "keep only the information the model actually needs."

The typical roles include:

- `system`
- `user`
- `assistant`
- `tool`

You can think of it as:

> `ModelMessage` = the message format that actually enters the context window during inference.

The content it supports isn't limited to strings either — it can cover:

- multimodal user input
- tool calls initiated by the assistant
- results returned by a tool

But overall it's still a structure oriented toward "inference input," not full UI state.

### 2. `UIMessage` is the source of truth in the frontend

`UIMessage` belongs to the AI SDK UI layer and usually shows up in:

- `useChat()`
- `useAssistant()`

It isn't just a single text message — it's a UI state object with structured `parts`.

It typically contains:

- `id`
- `role`
- `metadata`
- `parts`

The most important piece here is `parts`.

A `UIMessage`'s `parts` can carry many different states, for example:

- `text`
- `reasoning`
- `tool-${name}`
- `source-url`
- `source-document`
- `file`
- `data-${name}`
- `step-start`

This means it's naturally suited to describing:

- streaming text generation
- the input/output lifecycle of a tool call
- RAG citation sources
- file attachments
- custom data blocks
- multi-step agent processes

So more precisely:

> `UIMessage` = the complete record of frontend rendering and application state.

### 3. The difference is more than "one is simplified, one is complex"

The deeper distinction is this:

#### `ModelMessage` cares about model inference
It's concerned with:

- what the role is
- what the content is
- whether there's a tool call / tool result

#### `UIMessage` cares about the application process
It's concerned with:

- how this message renders
- whether it's still streaming
- which state the tool is currently in
- whether there's any metadata
- whether the frontend needs to persist and restore this message

So they aren't a superset/subset replacement for each other — they're two models at two different levels.

### 4. An important practical recommendation: persist `UIMessage` first

A key piece of advice from this discussion:

- When persisting chat history, save `UIMessage` first
- When you actually call the model, convert it into `ModelMessage` at that point

The reasoning behind this recommendation makes a lot of sense:

- `UIMessage` preserves the complete state
- it's the friendliest format for frontend restoration
- the tool-call process, streaming stages, and custom parts won't be lost
- `ModelMessage` is more like runtime input and isn't well suited as the single persisted source of truth

I really agree with this split, because a lot of chat systems start out mixing "model messages" and "UI messages" together, which eventually becomes painful in scenarios like:

- restoring historical conversations
- replaying tool-call state
- resuming after a streaming interruption
- rendering custom attachments / data blocks
- displaying multi-step agent processes

### 5. The `tool-${name}` part is a key design point of AI SDK UI

If you're building an AI app with tool calls, the `tool-${name}` family of parts is worth noting on its own.

It can express the full lifecycle of a tool call, for example:

- `input-streaming`
- `input-available`
- `output-available`
- `output-error`

This is far better than "the assistant sends a line of text + the frontend guesses which stage we're in right now."

Its significance is that:

- tool UI can be aligned directly with a state machine
- loading / success / error can be modeled uniformly
- it's easier to render stably even when multiple tools run concurrently
- tool input and output can become part of the message history directly

This is really a key step in AI chat UIs evolving from "text bubbles" into "structured interaction records."

### 6. `streamText()` is only the entry point; the real streaming core is `fullStream`

An important addition from the second discussion:

- `streamText()` itself is not SSE
- it first establishes the streaming connection with the provider
- then it converts the chunks the provider returns into a unified event stream

The key thing here is `fullStream`.

You can think of it as:

> `fullStream` = the complete event bus after the AI SDK has unified everything internally.

It contains more than just text — it may also include:

- `text-delta`
- `text-start`
- `text-end`
- `reasoning-delta`
- `tool-call`
- `tool-result`
- `finish`
- step-boundary events

And `textStream` is just a lighter-weight view that picks out only the pure text deltas from these events.

So if you want to truly understand streaming in the Vercel AI SDK, you shouldn't fixate on the function name `streamText()` — you need to see the whole chain:

- provider chunk
- `TextStreamPart`
- `fullStream`
- SSE protocol wrapping
- frontend event consumption

### 7. AI SDK UI uses SSE as its standard streaming protocol

The most note-worthy part of this addition is that it makes the post-AI-SDK-5 streaming protocol much more concrete.

The Vercel AI SDK chose **SSE (Server-Sent Events)** as its standard streaming transport.

As I understand it, the reasons mainly come down to a few things:

- AI output is, by nature, "the server continuously pushing to the frontend"
- for one-way push scenarios, SSE is lighter than WebSocket
- it's natively supported by browsers and easier to debug
- the protocol is HTTP-compatible, which is friendly to both Node and Edge runtimes

In the AI SDK, the typical backend looks something like this:

- `streamText(...)`
- `return result.toUIMessageStreamResponse()`

The essence of this step isn't "returning text to the frontend," but rather:

- taking the structured events in `fullStream`
- encoding them as `text/event-stream`
- continuously sending them to the frontend following the AI SDK UI data stream protocol

### 8. `toUIMessageStreamResponse()` is the key protocol-conversion point

This step is especially worth noting on its own, because it's the bridge where backend and frontend actually align.

You can think of it as:

> `toUIMessageStreamResponse()` = converting the AI SDK's internal event stream into the standard SSE response that the frontend `useChat()` can consume.

Roughly, what it does includes:

- iterating over `fullStream`
- encoding each event as an SSE `data: ...\n\n`
- setting the response headers automatically
- emitting `finish` / `[DONE]` when it ends

This explains why a lot of people, looking only at `streamText()`, still wonder "where exactly does the streaming come from?"

The answer is actually:

- `streamText()` is responsible for obtaining the unified event stream
- `toUIMessageStreamResponse()` is responsible for standardizing it into SSE
- `useChat()` is responsible for parsing these SSE events on the frontend and updating `UIMessage.parts`

### 9. The complete streaming chain from backend to frontend

Compressed into a more memorable chain, the whole process is roughly:

- `streamText(...)`
- the provider returns raw chunks
- the AI SDK converts them into `TextStreamPart` / `fullStream`
- `toUIMessageStreamResponse()` turns the event stream into an SSE Response
- the frontend `useChat()` or a compatible client parses the SSE
- on receiving `text-delta`, it appends to the current message in real time
- on receiving `finish`, it triggers wrap-up logic such as `onFinish`

To put it in slightly more interview-friendly terms:

> The Vercel AI SDK first normalizes the model output into an internal event stream, then incrementally sends it to the browser via the SSE Data Stream Protocol, and the frontend updates message state and UI according to the event type.

### 10. This shows `UIMessage` isn't a static data structure but a protocol endpoint

This addition made me realize more clearly:

The significance of `UIMessage` isn't just "there's a complex message type in the frontend" — it's that:

- the backend's SSE events ultimately land in `UIMessage.parts`
- all the text / reasoning / tool / source / file events
- eventually converge into a structured message in the frontend state

So it's both:

- the source of truth at persistence time
- and the final state form once the streaming protocol lands on the frontend

### 11. `UIMessage`'s generics are very practical

The discussion also mentioned a very practical point:

- you can give `UIMessage` a custom `metadata`
- you can constrain the `data parts`
- you can derive `UITools` from your toolset

This means that in a TypeScript project, you can bring all of:

- message metadata
- tool rendering types
- custom data parts

into the type system.

If your project is React + TypeScript, this capability is genuinely valuable, because it can significantly reduce:

- message-shape drift
- tool-component prop mismatches
- distortion of the message protocol between frontend and backend

## Current understanding / conclusions

Here's how I currently understand this design:

### 1. `ModelMessage` and `UIMessage` are an "inference layer / application layer" split

This isn't just an SDK refactor — it's a clear layering:

- `ModelMessage` handles model interaction
- `UIMessage` handles product state

### 2. A truly stable chat system can't use one message type to carry every responsibility at once

If a single message structure tries to serve the model, the UI, persistence, and tool state all at the same time, it's very likely to get messier and messier.

What the Vercel AI SDK is really acknowledging with this split is:

> The message the model needs isn't the same as the message the product needs to save.

### 3. For agent / tool-heavy apps, `parts` is closer to the future than plain `content: string`

And this `parts` structure wasn't designed in isolation — it's tied directly to the backend SSE protocol.

In other words:

- what the backend emits isn't a "plain text stream"
- it's a structured event stream
- and the frontend then merges these events into `UIMessage.parts`

This is also why the AI SDK can fairly naturally support:

- the tool-call lifecycle
- reasoning fragments
- source citations
- file / data parts
- multi-step agent workflows

Because the protocol layer and the state layer were designed to be isomorphic from the start.

### 4. If you're asked about SSE in an interview, lead with "event-stream standardization," not just "the typing effect"

A reasonably complete but not roundabout way to put it could be:

- SSE is an HTTP-based, one-way server-push mechanism, typically using `Content-Type: text/event-stream`
- in AI scenarios, it's especially well suited to continuously pushing the model's incremental output to the browser
- in the Vercel AI SDK, `streamText()` first obtains the internal event stream, and `toUIMessageStreamResponse()` then encodes those events as SSE
- the frontend `useChat()` consumes these structured events, not just appending text but also syncing tool, reasoning, and source state
- so it's fundamentally not about "spitting out tokens one by one" but about "standardizing the AI interaction process into an event protocol and syncing it to the UI in real time"

Answering this way is more complete than just saying "because SSE can return tokens in real time."

### 5. When building a custom backend, care about protocol compatibility, not just whether you can stream

If down the line you're not using Vercel's default route but instead:

- writing your own backend
- using Python / FastAPI
- or hooking up a different model gateway

the real key isn't "I can return a stream too," but:

- whether your output conforms to the AI SDK's SSE Data Stream Protocol
- whether the event types can be recognized by the frontend
- whether the headers are aligned
- whether the end signal is emitted correctly

Otherwise, even if the frontend receives the stream, it may not be able to correctly reconstruct it into a `UIMessage`.

This is especially true for:

- tool use
- reasoning
- RAG source
- attachment
- multi-step workflow

All of these scenarios show that a chat system is no longer a linear text stream of "one person says one line" — it's a structured event stream.

## To be added

A few more things still worth filling in later:

1. The concrete `UIMessage -> ModelMessage` conversion path
2. Practical message handling for `useChat()` inside a server-side route handler
3. How to break the `tool-${name}` part into components in a complex tool UI
4. How `pruneMessages` and UI persistence should work together when trimming historical messages
5. How to design the boundary between `UserContent` and `parts` for multimodal input

## Related links / sources

- Grok share page: <https://grok.com/share/c2hhcmQtMw_d99687f4-6a5f-4c97-bf1f-28d2dccb8e4a>
- ModelMessage docs: <https://ai-sdk.dev/docs/reference/ai-sdk-core/model-message>
- UIMessage docs: <https://ai-sdk.dev/docs/reference/ai-sdk-core/ui-message>

import { expect, test } from 'bun:test'

import { generator } from './model'
import corpus from './public-corpus.json'
import { conversationSources } from './retrieval'
import { retrieve } from './safety'

function response(content: string, finish = 'stop', calls?: unknown[]) {
  return new Response(
    'data: ' +
      JSON.stringify({
        choices: [
          { delta: { content, ...(calls ? { tool_calls: calls } : {}) }, finish_reason: finish }
        ]
      }) +
      '\n\ndata: ' +
      JSON.stringify({ choices: [], usage: { prompt_tokens: 42, completion_tokens: 8 } }) +
      '\n\ndata: [DONE]\n\n'
  )
}
test('greeting and thanks are complete one-call no-tool answers with usage and authoritative source events', async () => {
  for (const question of ['你好', '谢谢']) {
    let requests = 0
    const fake = (async () => {
      requests++
      return response('你好，很高兴和你聊聊。')
    }) as typeof fetch
    const events = []
    for await (const part of generator('test-only', fake)(
      question,
      [],
      [],
      new AbortController().signal
    ))
      events.push(part)
    expect(requests).toBe(1)
    expect(events).toContainEqual({ text: '你好，很高兴和你聊聊。' })
    expect(events).toContainEqual({ sources: [] })
    expect(events).toContainEqual({
      usage: { input: 42, output: 8, model_calls: 1, tool_calls: 0 }
    })
    expect(events.at(-1)).toEqual({ done: true })
  }
})
test('direct followup retains supplied retrieved source metadata, never prose URLs', async () => {
  const prior = retrieve('Talks', corpus.sources)
  const history = [{ question: '有哪些 Talks？', answer: 'Earlier answer', sources: prior }]
  const sources = conversationSources('把刚才那篇展开讲讲', history, corpus.sources)
  const events = []
  for await (const e of generator('test-only', (async () =>
    response('根据刚才的来源，这是一场公开分享。')) as typeof fetch)(
    '把刚才那篇展开讲讲',
    history,
    sources,
    new AbortController().signal
  ))
    events.push(e)
  expect(events.find((e) => e.sources)?.sources?.map((s) => s.url)).toEqual([
    ...new Set(sources.map((s) => s.url))
  ])
  expect(events.at(-1)).toEqual({ done: true })
})
test('empty normal stop remains an honest retryable failure, not a fabricated answer', async () => {
  let requests = 0
  const events = []
  const run = async () => {
    for await (const e of generator('test-only', (async () => {
      requests++
      return response('  ')
    }) as typeof fetch)('你好', [], [], new AbortController().signal))
      events.push(e)
  }
  await expect(run()).rejects.toThrow('empty_answer')
  expect(requests).toBe(1)
  expect(events).toContainEqual({ usage: { input: 42, output: 8, model_calls: 1, tool_calls: 0 } })
  expect(events.some((e) => e.done || e.text)).toBe(false)
})
test('plain text cannot disguise malformed or prohibited tool responses', async () => {
  for (const [finish, calls, error] of [
    ['tool_calls', [], 'tool_plan_failed'],
    [
      'stop',
      [{ index: 0, id: 'bad', function: { name: 'bash', arguments: '{}' } }],
      'tool_plan_failed'
    ],
    [
      'tool_calls',
      [{ index: 0, id: 'bad', function: { name: 'bash', arguments: '{}' } }],
      'tool_not_allowed'
    ]
  ] as const) {
    const run = async () => {
      for await (const _ of generator('test-only', (async () =>
        response('Claimed answer', finish, [...calls])) as typeof fetch)(
        'hello',
        [],
        [],
        new AbortController().signal
      )) {
      }
    }
    await expect(run()).rejects.toThrow(error)
  }
})
test('cancelled direct response never emits a successful answer', async () => {
  const abort = new AbortController()
  const run = async () => {
    for await (const _ of generator('test-only', (async () => {
      abort.abort()
      return response('hello')
    }) as typeof fetch)('hello', [], [], abort.signal)) {
    }
  }
  await expect(run()).rejects.toThrow()
})
test('actual published Talks records outrank incidental article mentions for section questions', () => {
  const talks = corpus.sources.filter((s) => new URL(s.url).pathname === '/talks')
  expect(talks).toHaveLength(2)
  for (const question of [
    'Talks',
    'Joye 的 Talks 是做什么的？',
    'Joye 有哪些演讲？',
    'What talks are available?'
  ]) {
    const hits = retrieve(question, corpus.sources)
    expect(new Set(hits.map((s) => s.url))).toEqual(new Set(talks.map((s) => s.url)))
    for (const hit of hits) {
      expect(hit.text.length).toBeGreaterThan(100)
      expect(talks.some((t) => t.title === hit.title && t.text.includes(hit.text))).toBe(true)
    }
  }
})
test('section metadata supports About Projects Curated without hijacking unrelated topics', () => {
  for (const name of ['About', 'Projects', 'Curated'])
    expect(
      retrieve(name, corpus.sources).every(
        (s) => new URL(s.url).pathname === '/' + name.toLowerCase()
      )
    ).toBe(true)
  for (const question of [
    'Tell me about embeddings',
    'Tell me About embeddings',
    'React 项目性能优化',
    'LayerNorm RMSNorm'
  ]) {
    const hits = retrieve(question, corpus.sources)
    expect(hits.length).toBeGreaterThan(0)
    expect(
      hits.some((s) =>
        ['/blog/', '/notes/', '/en/blog/', '/en/notes/'].some((p) =>
          new URL(s.url).pathname.startsWith(p)
        )
      )
    ).toBe(true)
  }
})

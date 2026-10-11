import { describe, expect, test } from 'bun:test'

import { personalItems } from '../../components/workshop/content'
import { runGuide, searchSources, type AgentEvent } from './agent.server'
import type { SpaceDocument } from './content.server'
import { curatedJourneys, validatePlan } from './journey'

const documents: SpaceDocument[] = personalItems.map((item) => ({
  ...item,
  content: item.body.join('\n')
}))
const plan = {
  title: '真实产品与工程选择',
  summary: '从两个实际项目开始。',
  steps: [
    { id: 'playyy', label: '创作工具', reason: '参与品牌感知创作工作区。' },
    { id: 'atypica', label: '研究工具', reason: '参与多智能体研究产品。' }
  ],
  followUps: ['想了解学习过程']
}
const config = { baseUrl: 'https://example.invalid/v1', model: 'test-model', apiKey: 'test-secret' }
const signal = () => new AbortController().signal
const call = (name: string, args: unknown) => ({
  choices: [
    {
      message: {
        role: 'assistant',
        content: null,
        tool_calls: [
          { id: 'tool-1', type: 'function', function: { name, arguments: JSON.stringify(args) } }
        ]
      }
    }
  ]
})
function mockTransport(responses: unknown[]) {
  const requests: Record<string, unknown>[] = []
  const transport = (async (_url: unknown, options: RequestInit) => {
    requests.push(JSON.parse(options.body as string))
    const next = responses.shift()
    if (!next) throw new Error('Unexpected extra request')
    return Response.json(next)
  }) as typeof fetch
  return { transport, requests }
}

describe('grounded journeys', () => {
  test('all curated routes reference existing featured content', () => {
    const ids = new Set([...personalItems.map((item) => item.id), 'context', 'interview', 'memory'])
    for (const value of Object.values(curatedJourneys))
      expect(validatePlan(value, ids).steps).toHaveLength(4)
  })
  test('rejects unknown, duplicated, unread and oversized routes', () => {
    expect(() => validatePlan(plan, new Set(['playyy']))).toThrow()
    expect(() =>
      validatePlan({ ...plan, steps: [plan.steps[0], plan.steps[0]] }, new Set(['playyy']))
    ).toThrow()
    expect(() =>
      validatePlan({ ...plan, title: 'x'.repeat(81) }, new Set(['playyy', 'atypica']))
    ).toThrow()
    expect(() => validatePlan({ ...plan, steps: [] }, new Set())).toThrow()
  })
  test('retrieves Chinese and English terms from actual content', () => {
    expect(searchSources(documents, '品牌创作').map((item) => item.id)).toContain('playyy')
    expect(searchSources(documents, 'MiniMind')[0].id).toBe('minimind')
    expect(searchSources(documents, 'absent-gibberish-83957')).toEqual([])
  })
  test('searches, reads, then emits a route with real source ids', async () => {
    const mock = mockTransport([
      call('search_content', { query: '产品' }),
      call('read_content', { ids: ['playyy', 'atypica'] }),
      call('present_path', plan)
    ])
    const events: AgentEvent[] = []
    const result = await runGuide({
      question: '看实际产品',
      context: [],
      documents,
      config,
      signal: signal(),
      emit: (event) => events.push(event),
      transport: mock.transport
    })
    expect(result.mode).toBe('ai')
    expect(result.steps.map((step) => step.id)).toEqual(['playyy', 'atypica'])
    expect(events.map((event) => (event.type === 'activity' ? event.action : ''))).toEqual([
      'search',
      'read',
      'read'
    ])
    expect(JSON.stringify(events)).not.toContain('test-secret')
    expect(mock.requests).toHaveLength(3)
  })
  test('rejects a model attempt to present unread sources and lets it correct the plan', async () => {
    const mock = mockTransport([
      call('search_content', { query: '产品' }),
      call('present_path', plan),
      call('read_content', { ids: ['playyy', 'atypica'] }),
      call('present_path', plan)
    ])
    const result = await runGuide({
      question: '产品',
      context: [],
      documents,
      config,
      signal: signal(),
      emit: () => {},
      transport: mock.transport
    })
    expect(result.steps).toHaveLength(2)
    expect(JSON.stringify(mock.requests[2])).toContain('Unknown or repeated source')
  })
  test('bounds repeated invalid tool calls instead of looping forever', async () => {
    const mock = mockTransport(
      Array.from({ length: 6 }, () => call('run_shell', { command: 'anything' }))
    )
    await expect(
      runGuide({
        question: '问题',
        context: [],
        documents,
        config,
        signal: signal(),
        emit: () => {},
        transport: mock.transport
      })
    ).rejects.toThrow('没能整理')
    expect(mock.requests).toHaveLength(6)
  })
  test('cancellation prevents further model requests', async () => {
    const abort = new AbortController()
    abort.abort()
    const mock = mockTransport([])
    await expect(
      runGuide({
        question: '问题',
        context: [],
        documents,
        config,
        signal: abort.signal,
        emit: () => {},
        transport: mock.transport
      })
    ).rejects.toThrow()
    expect(mock.requests).toHaveLength(0)
  })
})

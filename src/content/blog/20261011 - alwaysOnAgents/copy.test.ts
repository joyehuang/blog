import { describe, expect, test } from 'bun:test'

import {
  archCopy,
  codingCopy,
  d0Copy,
  ladderCopy,
  ladderLive,
  layersCopy,
  lifeCopy,
  thinCopy
} from './copy'

const cjk = /[\u4e00-\u9fff]/

function walkStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value)
  else if (Array.isArray(value)) value.forEach((item) => walkStrings(item, out))
  else if (value && typeof value === 'object')
    Object.values(value).forEach((item) => walkStrings(item, out))
  return out
}

describe('always-on agent figure copy', () => {
  test('English labels do not fall back to Chinese', () => {
    const ladder = ladderCopy('en')
    const copies = [
      archCopy('en'),
      thinCopy('en'),
      { ...ladder, rungs: ladder.rungs.map(({ en, desc }) => ({ en, desc })) },
      codingCopy('en'),
      lifeCopy('en'),
      d0Copy('en'),
      layersCopy('en')
    ]
    for (const copy of copies) {
      const chinese = walkStrings(copy).filter((text) => cjk.test(text))
      expect(chinese).toEqual([])
    }
  })

  test('Chinese trigger names and ladder stops stay the original ones', () => {
    expect(archCopy('zh').triggers.map((t) => t.name)).toEqual([
      '你直接发消息',
      'Slack / 群聊里 @',
      '收到一封邮件',
      '电话 / 会议',
      '定时任务'
    ])
    expect(ladderCopy('zh').tasks.map((t) => t.stop)).toEqual([1, 2, 3, 4, 5, 6])
    expect(ladderCopy('en').tasks.map((t) => t.stop)).toEqual([1, 2, 3, 4, 5, 6])
    expect(ladderLive('停在第 {n} 级：{name}', 1, '已知上下文')).toBe('停在第 1 级：已知上下文')
    expect(ladderLive('Stops at level {n}: {name}', 3, 'Web search')).toBe(
      'Stops at level 3: Web search'
    )
  })

  test('numbers and structure match across locales', () => {
    expect(codingCopy('zh').stages.map((s) => [s.ui, s.model])).toEqual(
      codingCopy('en').stages.map((s) => [s.ui, s.model])
    )
    expect(d0Copy('zh').metrics.map((m) => m.afterLen)).toEqual(['28.2%', '59.8%', '58.3%'])
    expect(d0Copy('en').metrics.map((m) => m.afterLen)).toEqual(
      d0Copy('zh').metrics.map((m) => m.afterLen)
    )
    expect(d0Copy('zh').metrics.map((m) => m.beforeText)).toEqual([
      '274.8 秒',
      '约 102 k',
      '约 12 步'
    ])
    expect(layersCopy('zh').gens.map((g) => [g.comp, g.iface, g.base])).toEqual(
      layersCopy('en').gens.map((g) => [g.comp, g.iface, g.base])
    )
    expect(lifeCopy('zh').groups[1]?.dot).toEqual(lifeCopy('en').groups[1]?.dot)
    expect(lifeCopy('zh').groups[1]?.labels[0]?.text).toBe('② 交叉点：该删了')
    expect(thinCopy('zh').pill).toBe('SendToUser')
    expect(thinCopy('en').pill).toBe('SendToUser')
  })
})

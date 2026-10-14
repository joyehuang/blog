import { describe, expect, test } from 'bun:test'

import {
  archCopy,
  codingCopy,
  d0Copy,
  ladderCopy,
  ladderLive,
  layerItemHtml,
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
    expect(lifeCopy('zh').groups[1]?.labels[0]).toMatchObject({ x: 318, y: 190 })
    expect(thinCopy('zh').pill).toBe('SendToUser')
    expect(thinCopy('en').pill).toBe('SendToUser')
  })

  test('English captions have a space after the title, Chinese stay flush', () => {
    const copies = [archCopy, thinCopy, ladderCopy, codingCopy, lifeCopy, d0Copy, layersCopy]
    for (const copy of copies) {
      expect(copy('en').captionRest.startsWith(' ')).toBe(true)
      expect(copy('en').captionRest.startsWith('  ')).toBe(false)
      expect(copy('zh').captionRest.startsWith(' ')).toBe(false)
    }
  })

  test('English figure copy has no CJK punctuation or space before a colon', () => {
    const copies = [
      archCopy('en'),
      thinCopy('en'),
      codingCopy('en'),
      lifeCopy('en'),
      d0Copy('en'),
      layersCopy('en'),
      {
        ...ladderCopy('en'),
        rungs: ladderCopy('en').rungs.map(({ en, desc }) => ({ en, desc }))
      }
    ]
    const fullwidth = /[\u3000-\u303f\uff00-\uffef]/
    for (const copy of copies) {
      for (const text of walkStrings(copy)) {
        expect(text).not.toMatch(fullwidth)
        expect(text).not.toMatch(/ :/)
      }
    }
  })

  test('the crossover label sits clear of both curves', () => {
    const label = lifeCopy('en').groups[1]?.labels[0]
    expect(label).toMatchObject({ x: 324, y: 176, text: '② Crossover: delete it' })
    expect(label?.anchor).toBeUndefined()
    // Measured in Satoshi at the English chart size: about 121 user units wide.
    const box = { x0: label!.x, y0: label!.y - 10, x1: label!.x + 126, y1: label!.y + 4 }
    expect(clearance(box)).toBeGreaterThan(8)
  })

  test('load-bearing names stay flush against the colon', () => {
    expect(layerItemHtml('Data and memory', 'profiles', ': ')).toBe(
      '<strong>Data and memory</strong>: profiles'
    )
    expect(layerItemHtml('数据与记忆', '用户画像、日志、可读的知识', '：')).toBe(
      '<strong>数据与记忆</strong>：用户画像、日志、可读的知识'
    )
  })
})

function cubic(
  p0: [number, number],
  p1: [number, number],
  p2: [number, number],
  p3: [number, number]
) {
  const pts: [number, number][] = []
  for (let i = 0; i <= 200; i++) {
    const t = i / 200
    const u = 1 - t
    pts.push([
      u ** 3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t ** 3 * p3[0],
      u ** 3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t ** 3 * p3[1]
    ])
  }
  return pts
}

function clearance(box: { x0: number; y0: number; x1: number; y1: number }) {
  const curves = [
    ...cubic([50, 255], [200, 240], [320, 150], [440, 48]),
    ...cubic([50, 200], [100, 120], [160, 95], [210, 130]),
    ...cubic([210, 130], [260, 165], [330, 230], [440, 262])
  ]
  let nearest = Infinity
  for (const [x, y] of curves) {
    const dx = x < box.x0 ? box.x0 - x : x > box.x1 ? x - box.x1 : 0
    const dy = y < box.y0 ? box.y0 - y : y > box.y1 ? y - box.y1 : 0
    nearest = Math.min(nearest, Math.hypot(dx, dy))
  }
  for (let x = 50; x <= 460; x += 2) {
    const dx = x < box.x0 ? box.x0 - x : x > box.x1 ? x - box.x1 : 0
    const dy = 200 < box.y0 ? box.y0 - 200 : 200 > box.y1 ? 200 - box.y1 : 0
    nearest = Math.min(nearest, Math.hypot(dx, dy))
  }
  return nearest
}

import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'bun:test'

import { activity, competitionStatus, isCompetitionClosed, isSignupClosed } from './agent-teams'

const read = (file: string) => readFileSync(new URL(file, import.meta.url), 'utf8')

describe('SOA QQ registration boundary', () => {
  test('September extension never reopens the July website signup', () => {
    expect(activity.signupClosesAt).toBe('2026-07-11T00:00:00+08:00')
    expect(activity.competitionClosesAt).toBe('2026-10-01T00:00:00+08:00')
    const close = Date.parse(activity.competitionClosesAt)
    for (const now of [close - 1, close, close + 1]) expect(isSignupClosed(now)).toBe(true)
    expect(isCompetitionClosed(close - 1)).toBe(false)
    expect(isCompetitionClosed(close)).toBe(true)
    expect(isCompetitionClosed(close + 1)).toBe(true)
    expect(competitionStatus(close - 1).cta).toContain('报名')
    expect(competitionStatus(close).cta).toBe('进粉丝群查询既有登记')
  })

  test('static page gives timezone, explicit bot syntax and separate historical data', () => {
    const source = read('../components/agent-teams/SoaRegistration.astro').replace(/\s+/g, ' ')
    for (const text of [
      '2026 年 9 月 30 日 23:59',
      '北京时间，UTC+8',
      '我要报名SOA owner/repo',
      '我要报名SOA https://github.com/owner/repo',
      '查询我的SOA报名',
      '更新我的SOA报名 owner/repo',
      '报名编号',
      'QQ 新报名暂不自动出现在此列表',
      '仅分享 repo 不会自动报名',
      'qq-group-contact.jpg',
      'navigator.clipboard.writeText',
      'soa_registration_intent'
    ]) {
      expect(source).toContain(text)
    }
    expect(source).not.toContain('<form')
    expect(source).toContain('setInterval(refresh, 1000)')
    expect(source).toContain('copy.disabled = isCompetitionClosed()')
  })

  test('historical board retains API, roster and repository rendering', () => {
    const source = read('../components/agent-teams/AgentTeamsBoard.astro')
    for (const text of [
      'data-roster',
      'data-github-link',
      'githubUrl',
      "fetch('/api/agent-teams')"
    ]) {
      expect(source).toContain(text)
    }
  })
})

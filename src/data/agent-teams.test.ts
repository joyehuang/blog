// 静态赛道配置的完整性测试。
//
// 重点守护 `id`：它同时是 DB key（agent_team_signups.team_id）和埋点标识，
// 一旦撞车或被改动，报名名单就会串。这些是纯数据断言，`bun test` 直接跑，无需 DB。

import { describe, expect, test } from 'bun:test'
import { activity, isSignupClosed, teams } from './agent-teams'

describe('teams 配置', () => {
  test('至少有一个赛道', () => {
    expect(teams.length).toBeGreaterThan(0)
  })

  test('每个 id 唯一', () => {
    const ids = teams.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test('id 为稳定 slug（小写字母 / 数字 / 连字符）', () => {
    for (const t of teams) {
      expect(t.id).toMatch(/^[a-z0-9-]+$/)
    }
  })

  test('id 不与自命题赛道的 custom- 前缀冲突', () => {
    for (const t of teams) {
      expect(t.id.startsWith('custom-')).toBe(false)
    }
  })

  test('title / summary 非空且经过 trim', () => {
    for (const t of teams) {
      expect(t.title.length).toBeGreaterThan(0)
      expect(t.title).toBe(t.title.trim())
      expect(t.summary.length).toBeGreaterThan(0)
      expect(t.summary).toBe(t.summary.trim())
    }
  })

  test('capacity 省略或为正整数', () => {
    for (const t of teams) {
      if (t.capacity === undefined) continue
      expect(Number.isInteger(t.capacity)).toBe(true)
      expect(t.capacity).toBeGreaterThan(0)
    }
  })

  test('tags 省略或为非空字符串数组', () => {
    for (const t of teams) {
      if (t.tags === undefined) continue
      expect(Array.isArray(t.tags)).toBe(true)
      for (const tag of t.tags) {
        expect(typeof tag).toBe('string')
        expect(tag.length).toBeGreaterThan(0)
      }
    }
  })
})

describe('activity 配置', () => {
  test('deadline 是合法的 YYYY-MM-DD', () => {
    expect(activity.deadline).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(Number.isNaN(Date.parse(activity.deadline))).toBe(false)
  })

  test('title / subtitle / tagline 非空', () => {
    expect(activity.title.length).toBeGreaterThan(0)
    expect(activity.subtitle.length).toBeGreaterThan(0)
    expect(activity.tagline.length).toBeGreaterThan(0)
  })

  test('docHref 是 http(s) 链接', () => {
    expect(activity.docHref).toMatch(/^https?:\/\//)
  })

  test('signupClosesAt 是带时区的合法时刻，且与 deadline 同一天（北京时间晚 12 点）', () => {
    const closes = Date.parse(activity.signupClosesAt)
    expect(Number.isNaN(closes)).toBe(false)
    expect(activity.signupClosesAt).toMatch(/[+-]\d{2}:\d{2}$/)
    // 晚 12 点 = deadline 次日 00:00
    const deadlineMidnight = Date.parse(`${activity.deadline}T00:00:00+08:00`)
    expect(closes - deadlineMidnight).toBe(24 * 60 * 60 * 1000)
  })

  test('isSignupClosed 以 signupClosesAt 为界', () => {
    const closes = Date.parse(activity.signupClosesAt)
    expect(isSignupClosed(closes - 1)).toBe(false)
    expect(isSignupClosed(closes)).toBe(true)
    expect(isSignupClosed(closes + 1)).toBe(true)
  })
})

import { describe, expect, test } from 'bun:test'

import { normalizeTeamSearch, pageSizeForWidth, paginationFor, teamMatchesSearch } from './board'
import {
  normalizeGithubRepoUrl,
  resolveActiveCaptainKey,
  SIGNUP_DELETION_REASONS,
  validateKickTarget
} from './store'

const team = {
  title: '游戏 Agent（杀戮尖塔 2）',
  tags: ['game', 'planning'],
  members: [{ name: 'Joye' }, { name: '摸鱼选手' }]
}

describe('队伍搜索', () => {
  test('统一大小写、全角字符和多余空白', () => {
    expect(normalizeTeamSearch('  ＧＡＭＥ  Agent ')).toBe('game agent')
  })

  test('支持队名、标签和成员昵称', () => {
    expect(teamMatchesSearch(team, '杀戮尖塔')).toBe(true)
    expect(teamMatchesSearch(team, '#PLANNING')).toBe(true)
    expect(teamMatchesSearch(team, 'joye')).toBe(true)
    expect(teamMatchesSearch(team, '摸鱼')).toBe(true)
    expect(teamMatchesSearch(team, '不存在')).toBe(false)
  })
})

describe('响应式分页', () => {
  test('移动端每页 4 支，桌面端每页 8 支', () => {
    expect(pageSizeForWidth(390)).toBe(4)
    expect(pageSizeForWidth(640)).toBe(4)
    expect(pageSizeForWidth(641)).toBe(8)
  })

  test('页码会限制在有效范围', () => {
    expect(paginationFor(41, 99, 8)).toEqual({ page: 5, pageCount: 6, start: 40, end: 41 })
    expect(paginationFor(0, 2, 4)).toEqual({ page: 0, pageCount: 0, start: 0, end: 0 })
  })
})

describe('GitHub 仓库链接', () => {
  test('归一化仓库首页链接', () => {
    expect(normalizeGithubRepoUrl('https://www.github.com/joyehuang/blog.git?tab=readme')).toEqual({
      ok: true,
      value: 'https://github.com/joyehuang/blog'
    })
  })

  test('拒绝非 GitHub 或非仓库首页链接', () => {
    expect(normalizeGithubRepoUrl('https://example.com/a/b').ok).toBe(false)
    expect(normalizeGithubRepoUrl('https://github.com/a/b/issues').ok).toBe(false)
  })
})

describe('队伍管理', () => {
  test('保存的队长已退出时回退到第一位有效成员', () => {
    expect(resolveActiveCaptainKey(['a', 'b'], 'missing')).toBe('a')
    expect(resolveActiveCaptainKey(['a', 'b'], 'b')).toBe('b')
  })

  test('不能踢当前队长，可以踢普通成员', () => {
    expect(validateKickTarget(['captain', 'member'], 'captain', 'captain').ok).toBe(false)
    expect(validateKickTarget(['captain', 'member'], 'captain', 'member')).toEqual({
      ok: true,
      captainKey: 'captain'
    })
  })

  test('软删除原因保持稳定', () => {
    expect(SIGNUP_DELETION_REASONS).toEqual({
      selfLeave: 'self_leave',
      captainKick: 'captain_kick'
    })
  })
})

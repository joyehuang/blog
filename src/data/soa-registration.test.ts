import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'bun:test'

import { activity, isSignupClosed } from './agent-teams'

const read = (file: string) => readFileSync(new URL(file, import.meta.url), 'utf8')

describe('SOA QQ registration boundary', () => {
  test('September extension never reopens the July website signup', () => {
    expect(activity.signupClosesAt).toBe('2026-07-11T00:00:00+08:00')
    expect(activity.competitionClosesAt).toBe('2026-10-01T00:00:00+08:00')
    const close = Date.parse(activity.competitionClosesAt)
    for (const now of [close - 1, close, close + 1]) expect(isSignupClosed(now)).toBe(true)
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

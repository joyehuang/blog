import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'bun:test'

import { activity, isSignupClosed } from './agent-teams'

const read = (file: string) => readFileSync(new URL(file, import.meta.url), 'utf8')

describe('SOA website registration', () => {
  test('signup closes on the 10/4 showcase day', () => {
    expect(activity.signupClosesAt).toBe('2026-10-04T00:00:00+08:00')
    expect(isSignupClosed(Date.parse('2026-10-03T23:59:59+08:00'))).toBe(false)
    for (const now of [Date.parse('2026-10-04T00:00:00+08:00'), Date.now()]) {
      expect(isSignupClosed(now)).toBe(true)
    }
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

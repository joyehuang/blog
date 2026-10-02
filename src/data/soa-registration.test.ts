import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'bun:test'

import { activity, isSignupClosed } from './agent-teams'

const read = (file: string) => readFileSync(new URL(file, import.meta.url), 'utf8')

describe('SOA website registration', () => {
  test('reopened signup has no deadline and stays open', () => {
    expect(activity.signupClosesAt).toBeNull()
    for (const now of [0, Date.now(), Date.parse('2099-01-01T00:00:00+08:00')]) {
      expect(isSignupClosed(now)).toBe(false)
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

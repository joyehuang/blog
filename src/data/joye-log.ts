/**
 * Joye's real shipped work, organized into the same groups the landing
 * page already shows (Blog / Open Source / Experience). The intro cinematic
 * uses this to play a log cascade grouped by domain, then morph each group
 * into the corresponding landing-page section.
 *
 * Update this file when you publish a new post / repo / role — the intro
 * and the landing page will both reflect the change.
 */

export type LogType = 'blog' | 'repo' | 'work' | 'edu'

export type LogEntry = {
  /** Display stamp — left column. */
  stamp: string
  /** Main label — middle column. */
  title: string
  /** Category — drives tag color. */
  type: LogType
  /** Optional tag shown after the title. */
  tag?: string
  /**
   * Importance weight 0..2 — recent / marquee work is 2 (brightest, slightly
   * larger), early work is 0 (dim, small). Drives the visual hierarchy so
   * the cascade doesn't read as a flat list.
   */
  weight?: 0 | 1 | 2
}

export type LogGroup = {
  /** Group label — also matches a landing-page <Section title='...'> for morph. */
  label: string
  /** Same `type` value as the entries inside, drives group-header accent. */
  type: LogType
  entries: LogEntry[]
}

export const JOYE_LOG_GROUPS: LogGroup[] = [
  {
    label: 'Blog',
    type: 'blog',
    entries: [
      // Newest first — the visitor sees the current self before the history.
      {
        stamp: '2026.05.28',
        title: '46-Minute Mock Interview Review',
        type: 'blog',
        tag: 'Agent',
        weight: 2
      },
      {
        stamp: '2026.05.23',
        title: "Interviews Aren't Exams",
        type: 'blog',
        tag: 'Agent',
        weight: 2
      },
      {
        stamp: '2026.05.17',
        title: 'Agent Onboarding Guide v1.0',
        type: 'blog',
        tag: 'Agent',
        weight: 2
      },
      {
        stamp: '2026.05.12',
        title: '1h19m Agent Engineer Mock Interview',
        type: 'blog',
        tag: 'Agent',
        weight: 2
      },
      {
        stamp: '2026.04.10',
        title: 'Reading OpenHarness — 11,733 lines',
        type: 'blog',
        tag: 'Agent',
        weight: 2
      },
      {
        stamp: '2026.03.09',
        title: 'Agent Dev Interview Field Guide',
        type: 'blog',
        tag: 'Agent',
        weight: 1
      },
      {
        stamp: '2025.12.19',
        title: 'FeedForward & Transformer Block',
        type: 'blog',
        tag: 'LLM',
        weight: 1
      },
      {
        stamp: '2025.12.18',
        title: 'Understanding Attention: Q, K, V',
        type: 'blog',
        tag: 'LLM',
        weight: 1
      },
      {
        stamp: '2025.12.17',
        title: 'RoPE Position Encoding',
        type: 'blog',
        tag: 'LLM',
        weight: 1
      },
      {
        stamp: '2025.12.16',
        title: 'Why Transformers Need Normalization',
        type: 'blog',
        tag: 'LLM',
        weight: 1
      },
      {
        stamp: '2025.10.23',
        title: 'Frontend Intern Interviews Prep Guide',
        type: 'blog',
        tag: 'internship',
        weight: 0
      },
      {
        stamp: '2025.07.01',
        title: 'My First Pull Request',
        type: 'blog',
        tag: 'open-source',
        weight: 0
      }
    ]
  },
  {
    label: 'Open Source',
    type: 'repo',
    entries: [
      {
        stamp: '— repo —',
        title: 'Learn-Open-Harness',
        type: 'repo',
        tag: '297 stars',
        weight: 2
      },
      {
        stamp: '— repo —',
        title: 'minimind-notes',
        type: 'repo',
        tag: '93 stars',
        weight: 1
      }
    ]
  },
  {
    label: 'Experience',
    type: 'work',
    entries: [
      {
        stamp: '— now —',
        title: 'Adastra Labs → Playyy.ai',
        type: 'work',
        tag: 'AI full-stack',
        weight: 2
      },
      {
        stamp: '— prev —',
        title: 'Tezign → atypica.ai',
        type: 'work',
        tag: 'multi-agent',
        weight: 1
      },
      {
        stamp: '— prev —',
        title: 'AIXCut → AI video agent',
        type: 'work',
        tag: 'AI editing',
        weight: 1
      },
      {
        stamp: '— prev —',
        title: 'fAIshion.ai → virtual try-on',
        type: 'work',
        tag: 'AI try-on',
        weight: 0
      }
    ]
  }
]

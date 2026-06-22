/**
 * Joye's real shipped work, used by the intro cinematic so the entry
 * animation tells a true story instead of an abstract one.
 *
 * Update this file when you publish a new post / repo / role — the intro
 * will pick up the new line automatically.
 */

export type LogType = 'blog' | 'repo' | 'work' | 'edu'

export type LogEntry = {
  /** Display date — left column. Use '·······' for non-dated rows. */
  stamp: string
  /** Main label — middle column. */
  title: string
  /** Category tag — right column. Also drives the tag's accent color. */
  type: LogType
  /** Optional extra (stars, role, etc.) shown after the tag. */
  meta?: string
}

export const JOYE_LOG: LogEntry[] = [
  {
    stamp: '2025.07.01',
    title: 'My First Pull Request',
    type: 'blog',
    meta: 'open-source'
  },
  {
    stamp: '2025.10.23',
    title: 'Frontend Intern Interviews — A Prep Guide',
    type: 'blog',
    meta: 'internship'
  },
  {
    stamp: '2025.12.16',
    title: 'Why Transformers Need Normalization',
    type: 'blog',
    meta: 'LLM'
  },
  {
    stamp: '2025.12.17',
    title: 'RoPE Position Encoding',
    type: 'blog',
    meta: 'LLM'
  },
  {
    stamp: '2025.12.18',
    title: 'Understanding Attention: Q, K, V',
    type: 'blog',
    meta: 'LLM'
  },
  {
    stamp: '2025.12.19',
    title: 'FeedForward & Transformer Block',
    type: 'blog',
    meta: 'LLM'
  },
  {
    stamp: '2026.03.09',
    title: 'Agent Dev Interview Field Guide',
    type: 'blog',
    meta: 'Agent'
  },
  {
    stamp: '2026.04.10',
    title: 'Reading OpenHarness — 11,733 lines',
    type: 'blog',
    meta: 'Agent'
  },
  {
    stamp: '2026.05.12',
    title: '1h19m Agent Engineer Mock Interview',
    type: 'blog',
    meta: 'Agent'
  },
  {
    stamp: '2026.05.17',
    title: 'Agent Onboarding Guide v1.0',
    type: 'blog',
    meta: 'Agent'
  },
  {
    stamp: '2026.05.23',
    title: "Interviews Aren't Exams",
    type: 'blog',
    meta: 'Agent'
  },
  {
    stamp: '2026.05.28',
    title: '46-Minute Mock Interview Review',
    type: 'blog',
    meta: 'Agent'
  },
  {
    stamp: '— repo —',
    title: 'Learn-Open-Harness',
    type: 'repo',
    meta: '297 stars'
  },
  {
    stamp: '— repo —',
    title: 'minimind-notes',
    type: 'repo',
    meta: '93 stars'
  },
  {
    stamp: '— now —',
    title: 'Adastra Labs → Playyy.ai',
    type: 'work',
    meta: 'AI full-stack'
  },
  {
    stamp: '— prev —',
    title: 'Tezign → atypica.ai',
    type: 'work',
    meta: 'multi-agent'
  },
  {
    stamp: '— prev —',
    title: 'AIXCut → AI video agent',
    type: 'work',
    meta: 'AI editing'
  },
  {
    stamp: '— prev —',
    title: 'fAIshion.ai → virtual try-on',
    type: 'work',
    meta: 'AI try-on'
  }
]

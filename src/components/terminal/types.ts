import type { ReactNode } from 'react'

export type Tone = 'fg' | 'muted' | 'primary' | 'ok' | 'err' | 'warn'

export type OutputLine =
  | { kind: 'text'; tone?: Tone; text: string }
  | { kind: 'node'; node: ReactNode }
  | { kind: 'spacer' }

export type HistoryEntry =
  | { kind: 'input'; raw: string; cwd: string }
  | { kind: 'output'; lines: OutputLine[] }
  | { kind: 'stream'; id: string; lines: OutputLine[]; done: boolean }

export type PostSummary = {
  slug: string
  href: string
  title: string
  date: string
  description?: string
}

export type CommandContext = {
  args: string[]
  raw: string
  posts: PostSummary[]
  push: (lines: OutputLine[]) => void
  startStream: (id: string) => void
  appendStream: (id: string, line: OutputLine) => void
  endStream: (id: string) => void
  clear: () => void
  setTheme: (mode: 'dark' | 'light' | 'toggle') => void
  setMatrix: (on: boolean) => void
  navigate: (path: string) => void
  registry: CommandRegistry
}

export type CommandHandler = (ctx: CommandContext) => void | Promise<void>

export type CommandSpec = {
  name: string
  summary: string
  usage?: string
  hidden?: boolean
  run: CommandHandler
  /** Suggest completions for the given args (last entry is the partial token). */
  complete?: (args: string[], posts: PostSummary[]) => string[]
}

export type CommandRegistry = Record<string, CommandSpec>

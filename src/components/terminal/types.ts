import type { ReactNode } from 'react'

import type { FileNode, FsNode } from './fs/types'

export type Tone = 'fg' | 'muted' | 'primary' | 'ok' | 'err' | 'warn'

export type OutputLine =
  | { kind: 'text'; tone?: Tone; text: string }
  | { kind: 'node'; node: ReactNode }
  | { kind: 'spacer' }

export type HistoryEntry =
  | { kind: 'input'; raw: string; cwd: string }
  | { kind: 'output'; lines: OutputLine[] }
  | { kind: 'stream'; id: string; lines: OutputLine[]; done: boolean }

/** Subset passed to `complete` so suggestions can read FS state. */
export type CompletionContext = {
  fs: FsNode
  cwd: string
}

export type CommandContext = {
  args: string[]
  raw: string
  /** Pseudo-FS root. Built once server-side; treat as immutable. */
  fs: FsNode
  /** Current working directory. Always starts with '/'. */
  cwd: string
  /** Mutate the cwd from a command (used by `cd`). */
  setCwd: (path: string) => void
  push: (lines: OutputLine[]) => void
  startStream: (id: string) => void
  appendStream: (id: string, line: OutputLine) => void
  endStream: (id: string) => void
  clear: () => void
  setTheme: (mode: 'dark' | 'light' | 'toggle') => void
  setMatrix: (on: boolean) => void
  navigate: (path: string) => void
  /**
   * Open a `FileNode` in the inline post viewer. Supplied by DevMode
   * (which renders the overlay); absent in the home-page TerminalShell.
   * Commands should fall back gracefully when undefined.
   */
  openViewer?: (file: FileNode, path: string) => void
  /**
   * Switch the site display mode. Supplied by DevMode host, absent in the
   * Human-Mode terminal. Handlers should `ctx.setMode?.('human')`.
   */
  setMode?: (mode: 'human' | 'dev') => void
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
  complete?: (args: string[], ctx: CompletionContext) => string[]
}

export type CommandRegistry = Record<string, CommandSpec>

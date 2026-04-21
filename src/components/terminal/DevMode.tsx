import { useCallback, useEffect, useRef, useState } from 'react'

import { commands, completeInput } from './commands'
import './terminal.css'
import './devmode.css'
import type { HistoryEntry, OutputLine, PostSummary, Tone } from './types'

type Props = {
  posts?: PostSummary[]
  user?: string
  host?: string
  onExit?: () => void
}

type RenderEntry = HistoryEntry & { id: string }
type BootLine = { t: number; text: string; ok?: boolean }

const PROMPT_CWD = '~'

const toneClass: Record<Tone, string> = {
  fg: 'wt-tone-fg',
  muted: 'wt-tone-muted',
  primary: 'wt-tone-primary',
  ok: 'wt-tone-ok',
  err: 'wt-tone-err',
  warn: 'wt-tone-warn'
}

const JOJO_ASCII = [
  '  ╭──────╮',
  '  │ ●  ● │',
  '  │  ᴗ   │',
  '  ╰─┬──┬─╯',
  '    │  │  ',
  '    ╵  ╵  '
].join('\n')

function formatBootTime(ms: number): string {
  const s = (ms / 1000).toFixed(2)
  return `[${s.padStart(5, '0')}s]`
}

function renderLine(line: OutputLine, key: string) {
  if (line.kind === 'spacer') return <span key={key} className='wt-spacer' />
  if (line.kind === 'node') {
    return (
      <span key={key} className='wt-line'>
        {line.node}
      </span>
    )
  }
  return (
    <span key={key} className={`wt-line ${line.tone ? toneClass[line.tone] : ''}`}>
      {line.text || '\u00A0'}
    </span>
  )
}

function Prompt({ user, host, cwd }: { user: string; host: string; cwd: string }) {
  return (
    <span className='wt-prompt'>
      <span className='wt-prompt-user'>{user}</span>
      <span className='wt-prompt-at'>@</span>
      <span className='wt-prompt-host'>{host}</span>
      <span className='wt-prompt-cwd'> {cwd}</span>
      <span className='wt-prompt-sigil'>$</span>
    </span>
  )
}

export default function DevMode({
  posts = [],
  user = 'joye',
  host = 'blog',
  onExit
}: Props) {
  const [bootLines, setBootLines] = useState<BootLine[]>([])
  const [bootDone, setBootDone] = useState(false)
  const [entries, setEntries] = useState<RenderEntry[]>([])
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [histIdx, setHistIdx] = useState<number>(-1)
  const [focused, setFocused] = useState(true)

  const inputRef = useRef<HTMLInputElement | null>(null)
  const bodyRef = useRef<HTMLDivElement | null>(null)
  const idRef = useRef(0)
  const newId = () => `e${++idRef.current}`

  const appendEntry = useCallback((entry: HistoryEntry) => {
    setEntries((prev) => [...prev, { ...entry, id: newId() }])
  }, [])

  const updateStream = useCallback(
    (id: string, fn: (e: HistoryEntry) => HistoryEntry) => {
      setEntries((prev) => prev.map((e) => (e.id === id ? { ...fn(e), id } : e)))
    },
    []
  )

  const ctxNavigate = useCallback((path: string) => {
    if (typeof window !== 'undefined') window.location.assign(path)
  }, [])

  const ctxSetTheme = useCallback((mode: 'dark' | 'light' | 'toggle') => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    const isDark = root.classList.contains('dark')
    const target = mode === 'toggle' ? (isDark ? 'light' : 'dark') : mode
    root.classList.toggle('dark', target === 'dark')
    try {
      localStorage.setItem('theme', target)
    } catch {
      /* ignore */
    }
  }, [])

  const ctxSetMode = useCallback(
    (mode: 'human' | 'dev') => {
      if (mode === 'human') onExit?.()
    },
    [onExit]
  )

  // boot sequence: roughly "loading" steps, streamed in
  useEffect(() => {
    const steps: Omit<BootLine, 'ok'>[] = [
      { t: 0, text: 'booting joye-shell v0.1 …' },
      { t: 180, text: 'loading /etc/personality.conf' },
      { t: 420, text: `mounting /posts (${posts.length} entries)` },
      { t: 710, text: 'spinning up agent mock on localhost:∞' },
      { t: 1020, text: 'resolving @mascot/jojo → ok' },
      { t: 1260, text: 'ready.' }
    ]
    const timers: ReturnType<typeof setTimeout>[] = []
    steps.forEach((s, i) => {
      timers.push(
        setTimeout(() => {
          setBootLines((prev) => [...prev, { ...s, ok: i !== steps.length - 1 }])
          if (i === steps.length - 1) {
            setBootDone(true)
            // focus shell once boot clears
            setTimeout(() => inputRef.current?.focus(), 60)
          }
        }, s.t)
      )
    })
    return () => timers.forEach(clearTimeout)
  }, [posts.length])

  // first interactive hint — appended once boot is done
  useEffect(() => {
    if (!bootDone) return
    appendEntry({
      kind: 'output',
      lines: [
        {
          kind: 'node',
          node: (
            <span className='wt-tone-muted'>
              type <code className='wt-tone-primary'>help</code> to see commands ·{' '}
              <code className='wt-tone-primary'>exit</code> or <span className='wt-kbd'>Esc</span>{' '}
              to leave dev mode
            </span>
          )
        }
      ]
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bootDone])

  // autoscroll on new entries
  useEffect(() => {
    const body = bodyRef.current
    if (!body) return
    body.scrollTop = body.scrollHeight
  }, [entries, bootLines])

  // Esc exits (but only when input is empty, so esc-to-clear doesn't collide)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !input) {
        e.preventDefault()
        onExit?.()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [input, onExit])

  // lock body scroll while mounted
  useEffect(() => {
    if (typeof document === 'undefined') return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  const runInput = useCallback(
    async (raw: string) => {
      const trimmed = raw.trim()
      appendEntry({ kind: 'input', raw: trimmed, cwd: PROMPT_CWD })
      if (!trimmed) return
      setHistory((h) => [...h, trimmed])
      setHistIdx(-1)

      const parts = trimmed.split(/\s+/)
      const name = parts[0].toLowerCase()
      const args = parts.slice(1)
      const spec = commands[name]
      if (!spec) {
        appendEntry({
          kind: 'output',
          lines: [
            { kind: 'text', tone: 'err', text: `command not found: ${name}` },
            { kind: 'text', tone: 'muted', text: 'try `help` for a list' }
          ]
        })
        return
      }

      const streamId = `s${++idRef.current}`
      const ctx = {
        args,
        raw: trimmed,
        posts,
        registry: commands,
        push: (lines: OutputLine[]) => appendEntry({ kind: 'output', lines }),
        startStream: (id: string) => {
          appendEntry({ kind: 'stream', id, lines: [], done: false })
        },
        appendStream: (id: string, line: OutputLine) => {
          updateStream(id, (e) =>
            e.kind === 'stream' ? { ...e, lines: [...e.lines, line] } : e
          )
        },
        endStream: (id: string) => {
          updateStream(id, (e) => (e.kind === 'stream' ? { ...e, done: true } : e))
        },
        clear: () => setEntries([]),
        setTheme: ctxSetTheme,
        setMatrix: () => {
          /* no matrix overlay inside dev mode */
        },
        navigate: ctxNavigate,
        setMode: ctxSetMode
      }
      void streamId
      try {
        await spec.run(ctx)
      } catch (err) {
        appendEntry({
          kind: 'output',
          lines: [{ kind: 'text', tone: 'err', text: `error: ${(err as Error).message}` }]
        })
      }
    },
    [appendEntry, updateStream, posts, ctxSetTheme, ctxNavigate, ctxSetMode]
  )

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const value = input
      setInput('')
      void runInput(value)
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (history.length === 0) return
      const next = histIdx < 0 ? history.length - 1 : Math.max(0, histIdx - 1)
      setHistIdx(next)
      setInput(history[next])
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (histIdx < 0) return
      const next = histIdx + 1
      if (next >= history.length) {
        setHistIdx(-1)
        setInput('')
      } else {
        setHistIdx(next)
        setInput(history[next])
      }
      return
    }
    if (e.key === 'Tab') {
      e.preventDefault()
      const completion = completeInput(input, posts)
      if (!completion) return
      if (typeof completion === 'string') {
        setInput(completion)
      } else {
        appendEntry({ kind: 'input', raw: input, cwd: PROMPT_CWD })
        appendEntry({
          kind: 'output',
          lines: [{ kind: 'text', tone: 'muted', text: completion.join('  ') }]
        })
      }
      return
    }
    if (e.key === 'l' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      setEntries([])
      return
    }
    if (e.key === 'c' && e.ctrlKey) {
      e.preventDefault()
      appendEntry({ kind: 'input', raw: `${input}^C`, cwd: PROMPT_CWD })
      setInput('')
    }
  }

  const focusInput = () => inputRef.current?.focus()

  return (
    <div className='dev-root' role='dialog' aria-label='dev mode terminal' onClick={focusInput}>
      <div className='dev-chrome'>
        <div className='dev-chrome-left'>
          <div className='dev-chrome-dots' aria-hidden>
            <span />
            <span />
            <span />
          </div>
          <span className='dev-chrome-title'>dev mode</span>
          <span>·</span>
          <span>{user}@{host}</span>
        </div>
        <div className='dev-chrome-hint'>
          press <span className='wt-kbd'>Esc</span> or type <code className='wt-tone-primary'>exit</code> to leave
        </div>
      </div>

      <div className='dev-body' ref={bodyRef}>
        {/* boot sequence */}
        <div className='dev-boot' aria-live='polite'>
          {bootLines.map((l, i) => (
            <span key={i} className='dev-boot-line wt-tone-muted'>
              <span className='dev-boot-time'>{formatBootTime(l.t)}</span>
              <span className='wt-tone-fg'>{l.text}</span>
              {l.ok && <span className='dev-boot-ok'>… ok</span>}
            </span>
          ))}
        </div>

        {/* neofetch */}
        {bootDone && (
          <div className='dev-neofetch'>
            <pre className='dev-neo-ascii' aria-hidden>
              {JOJO_ASCII}
            </pre>
            <div className='dev-neo-facts'>
              <div className='hd'>
                <span className='hd-user'>{user}</span>
                <span className='hd-at'>@</span>
                <span className='hd-host'>{host}</span>
              </div>
              <div className='hd-rule'>─────────────────────</div>
              <span className='key'>os</span>
              <span className='val'>Astro 5 · React 19 · Vercel</span>
              <span className='key'>stack</span>
              <span className='val'>TypeScript · UnoCSS · MDX</span>
              <span className='key'>editor</span>
              <span className='val'>neovim · VS Code · Claude Code</span>
              <span className='key'>posts</span>
              <span className='val'>
                {posts.length} indexed <span className='val-muted'>· `ls posts`</span>
              </span>
              <span className='key'>uptime</span>
              <span className='val'>since Apr 2024</span>
              <span className='key'>locale</span>
              <span className='val'>Melbourne, AU</span>
            </div>
          </div>
        )}

        {/* history */}
        <div className='dev-entries'>
          {entries.map((entry, i) => {
            if (entry.kind === 'input') {
              return (
                <div key={entry.id} className='dev-entry'>
                  <span>
                    <Prompt user={user} host={host} cwd={entry.cwd} />
                    <span className='wt-tone-fg'> {entry.raw}</span>
                  </span>
                </div>
              )
            }
            if (entry.kind === 'output') {
              return (
                <div key={entry.id} className='dev-entry'>
                  {entry.lines.map((l, j) => renderLine(l, `${entry.id}-${j}`))}
                </div>
              )
            }
            return (
              <div key={entry.id} className='dev-entry'>
                {entry.lines.map((l, j) => renderLine(l, `${entry.id}-${j}`))}
                {!entry.done && i === entries.length - 1 && (
                  <span className='wt-thinking'>···</span>
                )}
              </div>
            )
          })}
        </div>

        {/* prompt */}
        {bootDone && (
          <div className='dev-input-row'>
            <Prompt user={user} host={host} cwd={PROMPT_CWD} />
            <span className='dev-input-display'>
              <span className='wt-tone-fg'>{input}</span>
              <span
                className={`dev-caret ${focused ? '' : 'dev-caret--idle'}`}
                aria-hidden
              />
            </span>
            <input
              ref={inputRef}
              className='dev-input-hidden'
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              spellCheck={false}
              autoCapitalize='off'
              autoCorrect='off'
              aria-label='dev mode input'
              autoFocus
            />
          </div>
        )}
      </div>
    </div>
  )
}

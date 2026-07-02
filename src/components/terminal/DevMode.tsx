import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { trackSiteEvent } from '@/lib/analytics'

import { classifyTerminalCommand } from './analytics'
import { commands, completeInput } from './commands'
import { ROOT_LABEL } from './fs/content'
import { displayPath, getNode } from './fs/path'
import type { FileNode, FsNode } from './fs/types'
import PostViewer from './PostViewer'
import JoJo from '../mascot/JoJo'
import './terminal.css'
import './devmode.css'
import type { HistoryEntry, OutputLine, Tone } from './types'

type Props = {
  fs: FsNode
  user?: string
  host?: string
  onExit?: () => void
}

type RenderEntry = HistoryEntry & { id: string }
type BootLine = { t: number; text: string; ok?: boolean }
type ViewerHeading = { depth: number; slug: string; text: string }
type ViewerState = {
  meta: { title?: string; date?: string; slug: string }
  status: 'loading' | 'ready' | 'error'
  /** Pre-rendered HTML from /api/blog/<id> (shiki-colored code blocks). */
  html: string
  headings: ViewerHeading[]
  error?: string
  /** Increments per `cat`, used to ignore stale fetches. */
  reqId: number
}

const toneClass: Record<Tone, string> = {
  fg: 'wt-tone-fg',
  muted: 'wt-tone-muted',
  primary: 'wt-tone-primary',
  ok: 'wt-tone-ok',
  err: 'wt-tone-err',
  warn: 'wt-tone-warn'
}

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
      {line.text || ' '}
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
  fs,
  user = 'joye',
  host = ROOT_LABEL,
  onExit
}: Props) {
  const [bootLines, setBootLines] = useState<BootLine[]>([])
  const [bootDone, setBootDone] = useState(false)
  const [entries, setEntries] = useState<RenderEntry[]>([])
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [histIdx, setHistIdx] = useState<number>(-1)
  const [focused, setFocused] = useState(true)
  const [cwd, setCwd] = useState<string>('/')
  const [viewer, setViewer] = useState<ViewerState | null>(null)

  const inputRef = useRef<HTMLInputElement | null>(null)
  const bodyRef = useRef<HTMLDivElement | null>(null)
  const idRef = useRef(0)
  const viewerReqRef = useRef(0)
  const newId = () => `e${++idRef.current}`

  const blogCount = useMemo(() => {
    const dir = getNode(fs, '/blog')
    return dir && dir.type === 'dir' ? dir.children.length : 0
  }, [fs])

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

  const ctxOpenViewer = useCallback((file: FileNode, _path: string) => {
    if (!file.endpoint) return
    const reqId = ++viewerReqRef.current
    const meta = {
      title: (file.meta?.title as string) ?? file.name,
      date: file.meta?.date as string | undefined,
      slug: (file.meta?.slug as string) ?? file.name
    }
    setViewer({ meta, status: 'loading', html: '', headings: [], reqId })
    void fetch(file.endpoint)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<{ html: string; headings: ViewerHeading[] }>
      })
      .then((payload) => {
        // ignore stale fetches if the user has since opened another post
        if (viewerReqRef.current !== reqId) return
        setViewer({
          meta,
          status: 'ready',
          html: payload.html ?? '',
          headings: payload.headings ?? [],
          reqId
        })
      })
      .catch((err: unknown) => {
        if (viewerReqRef.current !== reqId) return
        setViewer({
          meta,
          status: 'error',
          html: '',
          headings: [],
          reqId,
          error: err instanceof Error ? err.message : 'failed to load'
        })
      })
  }, [])

  const closeViewer = useCallback(() => {
    setViewer(null)
    // return focus to the prompt
    setTimeout(() => inputRef.current?.focus(), 30)
  }, [])

  // boot sequence: roughly "loading" steps, streamed in
  useEffect(() => {
    const steps: Omit<BootLine, 'ok'>[] = [
      { t: 0, text: 'booting joye-shell v0.1 …' },
      { t: 180, text: 'loading /etc/personality.conf' },
      { t: 420, text: `mounting /blog (${blogCount} entries)` },
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
            setTimeout(() => inputRef.current?.focus(), 60)
          }
        }, s.t)
      )
    })
    return () => timers.forEach(clearTimeout)
  }, [blogCount])

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
      appendEntry({ kind: 'input', raw: trimmed, cwd })
      if (!trimmed) return
      setHistory((h) => [...h, trimmed])
      setHistIdx(-1)

      const parts = trimmed.split(/\s+/)
      const name = parts[0].toLowerCase()
      const args = parts.slice(1)
      const spec = commands[name]
      trackSiteEvent('terminal_command', {
        command: name,
        surface: 'terminal',
        target: 'terminal_shell',
        ...classifyTerminalCommand(name, args, fs, cwd, Boolean(spec))
      })
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

      const ctx = {
        args,
        raw: trimmed,
        fs,
        cwd,
        setCwd,
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
        openViewer: ctxOpenViewer,
        setMode: ctxSetMode
      }
      try {
        await spec.run(ctx)
      } catch (err) {
        appendEntry({
          kind: 'output',
          lines: [{ kind: 'text', tone: 'err', text: `error: ${(err as Error).message}` }]
        })
      }
    },
    [appendEntry, updateStream, fs, cwd, ctxSetTheme, ctxNavigate, ctxOpenViewer, ctxSetMode]
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
      const completion = completeInput(input, { fs, cwd })
      if (!completion) return
      if (typeof completion === 'string') {
        setInput(completion)
      } else {
        appendEntry({ kind: 'input', raw: input, cwd })
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
      appendEntry({ kind: 'input', raw: `${input}^C`, cwd })
      setInput('')
      return
    }
    if (e.key === 'Escape' && !input) {
      e.preventDefault()
      onExit?.()
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
            <div className='dev-neo-mascot'>
              <JoJo size='md' quipPool='greet' className='dev-neo-jojo' />
              <span className='dev-neo-mascot-caption'>jojo v0.1 · learning</span>
            </div>
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
              <span className='key'>blog</span>
              <span className='val'>
                {blogCount} indexed <span className='val-muted'>· `ls /blog`</span>
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
                    <Prompt user={user} host={host} cwd={displayPath(entry.cwd)} />
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
            <Prompt user={user} host={host} cwd={displayPath(cwd)} />
            <span className='dev-input-display'>
              <span className='wt-tone-fg'>{input}</span>
              <span
                className={`dev-caret ${focused ? '' : 'dev-caret--idle'}`}
                aria-hidden
              />
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
            </span>
          </div>
        )}
      </div>
      {viewer && (
        <PostViewer
          meta={viewer.meta}
          html={viewer.html}
          headings={viewer.headings}
          status={viewer.status}
          error={viewer.error}
          onClose={closeViewer}
        />
      )}
    </div>
  )
}

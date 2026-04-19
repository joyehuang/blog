import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { commands, completeInput } from './commands'
import './terminal.css'
import type { HistoryEntry, OutputLine, PostSummary, Tone } from './types'

type Props = {
  posts?: PostSummary[]
  user?: string
  host?: string
}

type RenderEntry = HistoryEntry & { id: string }

const PROMPT_CWD = '~'

const toneClass: Record<Tone, string> = {
  fg: 'wt-tone-fg',
  muted: 'wt-tone-muted',
  primary: 'wt-tone-primary',
  ok: 'wt-tone-ok',
  err: 'wt-tone-err',
  warn: 'wt-tone-warn'
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

function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1

    let drops: number[] = []
    let cols = 0
    const fontSize = 16
    const fontPx = fontSize * dpr

    const resize = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      cols = Math.ceil(canvas.width / fontPx)
      drops = Array.from({ length: cols }, () => Math.random() * canvas.height)
      // wipe so old frame doesn't smear at the new size
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
    resize()
    window.addEventListener('resize', resize)

    const chars =
      'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホ0123456789$#%&*+-/<>{}[]'.split('')
    let raf = 0
    const tick = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.font = `${fontPx}px ui-monospace, monospace`
      for (let i = 0; i < cols; i++) {
        const ch = chars[Math.floor(Math.random() * chars.length)]
        const x = i * fontPx
        const y = drops[i]
        // bright head
        ctx.fillStyle = '#d4ffe1'
        ctx.fillText(ch, x, y)
        // green trail body — overpaint slightly above
        ctx.fillStyle = '#34d399'
        ctx.fillText(ch, x, y - fontPx)
        drops[i] = y > canvas.height && Math.random() > 0.975 ? 0 : y + fontPx
      }
      raf = requestAnimationFrame(tick)
    }
    tick()

    // lock body scroll while raining
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      document.body.style.overflow = prevOverflow
    }
  }, [])

  if (typeof document === 'undefined') return null
  return createPortal(
    <div className='wt-matrix-root' aria-hidden>
      <canvas ref={canvasRef} className='wt-matrix-canvas' />
    </div>,
    document.body
  )
}

const COLLAPSE_KEY = 'wt-collapsed'
const PEEK_DEMOS = ['whoami', 'help', 'ls posts', 'chat hire-me', 'theme dark', 'matrix']

export default function Terminal({ posts = [], user = 'joye', host = 'blog' }: Props) {
  const [entries, setEntries] = useState<RenderEntry[]>([])
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [histIdx, setHistIdx] = useState<number>(-1)
  const [matrixOn, setMatrixOn] = useState(false)
  const [focused, setFocused] = useState(false)
  const [collapsed, setCollapsed] = useState<boolean>(true)
  const [peek, setPeek] = useState<string>('')
  const inputRef = useRef<HTMLInputElement | null>(null)
  const bodyRef = useRef<HTMLDivElement | null>(null)
  const idRef = useRef(0)
  const newId = () => `e${++idRef.current}`

  // hydrate collapsed state from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(COLLAPSE_KEY)
      if (stored === 'false') setCollapsed(false)
    } catch {
      /* ignore */
    }
  }, [])

  const persistCollapsed = useCallback((next: boolean) => {
    setCollapsed(next)
    try {
      localStorage.setItem(COLLAPSE_KEY, String(next))
    } catch {
      /* ignore */
    }
  }, [])

  const expand = useCallback(() => {
    persistCollapsed(false)
    // focus input after transition settles
    setTimeout(() => inputRef.current?.focus(), 220)
  }, [persistCollapsed])

  const collapse = useCallback(() => {
    persistCollapsed(true)
    inputRef.current?.blur()
  }, [persistCollapsed])

  // typing-peek demo: cycles through PEEK_DEMOS while collapsed
  useEffect(() => {
    if (!collapsed) {
      setPeek('')
      return
    }
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      setPeek(PEEK_DEMOS[0])
      return
    }
    let cancelled = false
    let demoIdx = 0
    let charIdx = 0
    let timer: ReturnType<typeof setTimeout> | null = null

    const tick = () => {
      if (cancelled) return
      const target = PEEK_DEMOS[demoIdx]
      if (charIdx <= target.length) {
        setPeek(target.slice(0, charIdx))
        charIdx += 1
        timer = setTimeout(tick, 78 + Math.random() * 60)
      } else {
        timer = setTimeout(() => {
          demoIdx = (demoIdx + 1) % PEEK_DEMOS.length
          charIdx = 0
          tick()
        }, 1700)
      }
    }
    tick()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [collapsed])

  const appendEntry = useCallback((entry: HistoryEntry) => {
    setEntries((prev) => [...prev, { ...entry, id: newId() }])
  }, [])

  const updateStream = useCallback((id: string, fn: (e: HistoryEntry) => HistoryEntry) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...fn(e), id } : e)))
  }, [])

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
            e.kind === 'stream'
              ? { ...e, lines: [...e.lines, line] }
              : e
          )
        },
        endStream: (id: string) => {
          updateStream(id, (e) => (e.kind === 'stream' ? { ...e, done: true } : e))
        },
        clear: () => setEntries([]),
        setTheme: ctxSetTheme,
        setMatrix: setMatrixOn,
        navigate: ctxNavigate
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
    [appendEntry, updateStream, posts, ctxSetTheme, ctxNavigate]
  )

  // first-load hint, only client side
  useEffect(() => {
    appendEntry({
      kind: 'output',
      lines: [{ kind: 'text', tone: 'muted', text: "type 'help' to get started · 'whoami' for the short version" }]
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // autoscroll on new entries
  useEffect(() => {
    const body = bodyRef.current
    if (!body) return
    body.scrollTop = body.scrollHeight
  }, [entries])

  // global hotkey: ` to focus / expand · Esc to collapse
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const inField =
        target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      if (e.key === '`' && !inField) {
        e.preventDefault()
        if (collapsed) expand()
        else inputRef.current?.focus()
        bodyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      if (e.key === 'Escape' && !collapsed && document.activeElement === inputRef.current && !input) {
        e.preventDefault()
        collapse()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [collapsed, expand, collapse, input])

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

  const promptUser = useMemo(() => user, [user])
  const promptHost = useMemo(() => host, [host])

  const stopPropagation = (e: React.MouseEvent) => e.stopPropagation()

  return (
    <div
      className={`wt-shell ${collapsed ? 'wt-shell--collapsed' : ''}`}
      onClick={collapsed ? expand : focusInput}
      role={collapsed ? 'button' : undefined}
      aria-expanded={!collapsed}
      tabIndex={collapsed ? 0 : undefined}
      onKeyDown={
        collapsed
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                expand()
              }
            }
          : undefined
      }
    >
      <div className='wt-titlebar'>
        <div className='wt-lights' aria-hidden>
          <button
            type='button'
            className='wt-light wt-light--r'
            onClick={(e) => {
              if (!collapsed) {
                stopPropagation(e)
                collapse()
              }
            }}
            aria-label={collapsed ? 'open terminal' : 'close'}
            tabIndex={-1}
          />
          <button
            type='button'
            className='wt-light wt-light--y'
            onClick={(e) => {
              if (!collapsed) {
                stopPropagation(e)
                collapse()
              }
            }}
            aria-label={collapsed ? 'open terminal' : 'minimize'}
            tabIndex={-1}
          />
          <button
            type='button'
            className='wt-light wt-light--g'
            onClick={(e) => {
              stopPropagation(e)
              if (collapsed) expand()
            }}
            aria-label={collapsed ? 'open terminal' : 'expand'}
            tabIndex={-1}
          />
        </div>
        {collapsed ? (
          <div className='wt-title wt-title--peek'>
            <span className='wt-prompt-sigil'>$</span>
            <span className='wt-tone-fg'>{peek}</span>
            <span className='wt-caret wt-caret--idle' aria-hidden />
          </div>
        ) : (
          <div className='wt-title'>{promptUser}@{promptHost} — terminal</div>
        )}
        <div className='wt-hint'>
          {collapsed ? (
            <>click or <span className='wt-kbd'>`</span> to open</>
          ) : (
            <>press <span className='wt-kbd'>`</span> to focus</>
          )}
        </div>
      </div>

      <div className='wt-body' ref={bodyRef} aria-hidden={collapsed}>
        <div className='wt-banner'>
          <span className='wt-banner-title'>wterm v0.1 · joye.sh</span>
          <span className='wt-banner-sub'>
            an interactive shell into this site — try <code>help</code>, <code>chat</code>, <code>ls posts</code>.
          </span>
        </div>

        {entries.map((entry, i) => {
          if (entry.kind === 'input') {
            return (
              <div key={entry.id} className='wt-entry'>
                <Prompt user={promptUser} host={promptHost} cwd={entry.cwd} />
                <span className='wt-tone-fg'>{entry.raw}</span>
              </div>
            )
          }
          if (entry.kind === 'output') {
            return (
              <div key={entry.id} className='wt-entry'>
                {entry.lines.map((l, j) => renderLine(l, `${entry.id}-${j}`))}
              </div>
            )
          }
          // stream
          return (
            <div key={entry.id} className='wt-entry'>
              {entry.lines.map((l, j) => renderLine(l, `${entry.id}-${j}`))}
              {!entry.done && i === entries.length - 1 && (
                <span className='wt-thinking'>···</span>
              )}
            </div>
          )
        })}

        <div className='wt-input-row'>
          <Prompt user={promptUser} host={promptHost} cwd={PROMPT_CWD} />
          <span className='wt-input-display'>
            <span className='wt-tone-fg'>{input}</span>
            <span className={`wt-caret ${focused ? '' : 'wt-caret--idle'}`} aria-hidden />
            {!input && !focused && (
              <span className='wt-tone-muted wt-input-hint'>
                click or press <span className='wt-kbd'>`</span> then type <span className='wt-tone-primary'>help</span>
              </span>
            )}
          </span>
          <input
            ref={inputRef}
            className='wt-input-hidden'
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            spellCheck={false}
            autoCapitalize='off'
            autoCorrect='off'
            aria-label='terminal input'
          />
        </div>
      </div>

      {matrixOn && <MatrixRain />}
    </div>
  )
}

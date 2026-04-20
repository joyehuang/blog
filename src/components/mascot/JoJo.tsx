import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'

import './jojo.css'

const QUIPS = {
  idle: [
    'learning...',
    'reading rust docs',
    'brewing coffee',
    '01101000 01101001',
    'thinking ✦',
    'sudo be-happy',
    'mounting /thoughts',
    '// TODO: learn haskell',
    'fetching joy...',
    'indexing melbourne'
  ],
  greet: ["hi! i'm jojo", 'welcome :)', 'oh hey there', 'you made it'],
  hover: ['ooh, interested?', 'click it!', "that's a good one", 'fan favorite']
} as const

export type JoJoQuipPool = keyof typeof QUIPS
export type JoJoSize = 'sm' | 'md'

export type JoJoProps = {
  size?: JoJoSize
  /** Force a specific bubble. Overrides `autoQuips`. */
  speak?: string | null
  autoQuips?: boolean
  quipPool?: JoJoQuipPool
  onClick?: () => void
  /** Set false to pin the gaze to neutral. */
  followCursor?: boolean
  /** Override the accent color for the ASCII. Defaults to `hsl(var(--primary))`. */
  accent?: string
  className?: string
  style?: CSSProperties
}

type Gaze = { x: number; y: number }
type EyePair = readonly [string, string]

const NEUTRAL_GAZE: Gaze = { x: 0, y: 0 }
const NEUTRAL_EYES: EyePair = ['●', '●']
const BLINK_EYES: EyePair = ['‾', '‾']

function renderEyes({ x, y }: Gaze): EyePair {
  const ax = Math.abs(x)
  const ay = Math.abs(y)
  if (ay > 0.55 && ay > ax) return y < 0 ? ['⦿', '⦿'] : ['◉', '◉']
  if (ax > 0.3) return x < 0 ? ['◖', '◖'] : ['◗', '◗']
  return NEUTRAL_EYES
}

export default function JoJo({
  size = 'md',
  speak = null,
  autoQuips = true,
  quipPool = 'idle',
  onClick,
  followCursor = true,
  accent,
  className,
  style
}: JoJoProps) {
  const [eyes, setEyes] = useState<EyePair>(NEUTRAL_EYES)
  const [mouth, setMouth] = useState<string>('ᴗ')
  const [bubble, setBubble] = useState<string | null>(speak)
  const gazeRef = useRef<Gaze>(NEUTRAL_GAZE)
  const rootRef = useRef<HTMLDivElement | null>(null)

  // Keep the latest gaze/pool in refs so effect bodies stay stable.
  const poolRef = useRef<JoJoQuipPool>(quipPool)
  useEffect(() => {
    poolRef.current = quipPool
  }, [quipPool])

  // Blink loop — runs forever, interval 2.8–5.4s, 140ms eye-lid.
  useEffect(() => {
    let alive = true
    let restoreTimer: ReturnType<typeof setTimeout> | undefined
    let nextTimer: ReturnType<typeof setTimeout> | undefined

    const tick = () => {
      if (!alive) return
      setEyes(BLINK_EYES)
      restoreTimer = setTimeout(() => {
        if (!alive) return
        setEyes(renderEyes(gazeRef.current))
      }, 140)
      nextTimer = setTimeout(tick, 2800 + Math.random() * 2600)
    }
    nextTimer = setTimeout(tick, 1500)
    return () => {
      alive = false
      if (restoreTimer) clearTimeout(restoreTimer)
      if (nextTimer) clearTimeout(nextTimer)
    }
  }, [])

  // Follow cursor — mousemove updates both gaze ref and eye glyph.
  useEffect(() => {
    if (!followCursor) return
    const onMove = (e: MouseEvent) => {
      const el = rootRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2
      const denomX = Math.max(400, window.innerWidth / 3)
      const denomY = Math.max(400, window.innerHeight / 3)
      const next: Gaze = {
        x: Math.max(-1, Math.min(1, (e.clientX - cx) / denomX)),
        y: Math.max(-1, Math.min(1, (e.clientY - cy) / denomY))
      }
      gazeRef.current = next
      setEyes(renderEyes(next))
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [followCursor])

  // Auto-quips — cycles every 6–10s after a 1.8s warmup. Disabled when `speak` is forced.
  useEffect(() => {
    if (!autoQuips || speak) return
    let alive = true
    let mouthTimer: ReturnType<typeof setTimeout> | undefined
    let dismissTimer: ReturnType<typeof setTimeout> | undefined
    let nextTimer: ReturnType<typeof setTimeout> | undefined

    const pool = QUIPS[poolRef.current] ?? QUIPS.idle
    let i = Math.floor(Math.random() * pool.length)

    const say = () => {
      if (!alive) return
      const currentPool = QUIPS[poolRef.current] ?? QUIPS.idle
      setBubble(currentPool[i % currentPool.length])
      setMouth('o')
      mouthTimer = setTimeout(() => {
        if (alive) setMouth('ᴗ')
      }, 400)
      dismissTimer = setTimeout(() => {
        if (alive) setBubble(null)
      }, 3200)
      i += 1
      nextTimer = setTimeout(say, 6000 + Math.random() * 4000)
    }

    nextTimer = setTimeout(say, 1800)
    return () => {
      alive = false
      if (mouthTimer) clearTimeout(mouthTimer)
      if (dismissTimer) clearTimeout(dismissTimer)
      if (nextTimer) clearTimeout(nextTimer)
    }
  }, [autoQuips, speak])

  // Sync `speak` prop into bubble.
  useEffect(() => {
    if (speak) setBubble(speak)
  }, [speak])

  const rootStyle = useMemo<CSSProperties>(
    () => ({
      fontSize: size === 'sm' ? 12 : 14,
      color: accent,
      cursor: onClick ? 'pointer' : 'default',
      ...style
    }),
    [size, accent, onClick, style]
  )

  const handleClick = useCallback(() => {
    onClick?.()
  }, [onClick])

  const bubbleFontSize = size === 'sm' ? 11 : 12

  return (
    <div
      ref={rootRef}
      onClick={handleClick}
      className={['jojo-root', className].filter(Boolean).join(' ')}
      style={rootStyle}
      aria-label='jojo mascot'
      role={onClick ? 'button' : 'img'}
    >
      <pre className='jojo-pre' aria-hidden='true'>
        {'  ╭──────╮\n'}
        {'  │ '}
        <span>{eyes[0]}</span>
        {'  '}
        <span>{eyes[1]}</span>
        {' │\n'}
        {'  │  '}
        <span>{mouth}</span>
        {'   │\n'}
        {'  ╰─┬──┬─╯\n'}
        {'    │  │  \n'}
        {'    ╵  ╵  \n'}
      </pre>

      {bubble && (
        <div className='jojo-bubble' style={{ fontSize: bubbleFontSize }}>
          {bubble}
          <span className='jojo-bubble-tail' aria-hidden='true' />
        </div>
      )}
    </div>
  )
}

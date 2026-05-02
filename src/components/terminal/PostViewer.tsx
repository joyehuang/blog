import { useEffect, useRef, useState } from 'react'

type Props = {
  meta: { title?: string; date?: string; slug: string }
  /**
   * Full plaintext body. Loaded lazily by the host via the file's
   * `endpoint` and passed in once available; viewer doesn't fetch.
   */
  content: string
  status: 'loading' | 'ready' | 'error'
  error?: string
  onClose: () => void
}

const CHARS_PER_TICK = 32
const TICK_MS = 16

export default function PostViewer({ meta, content, status, error, onClose }: Props) {
  const [shown, setShown] = useState(0)
  const [done, setDone] = useState(false)
  const skipRef = useRef(false)
  const bodyRef = useRef<HTMLDivElement | null>(null)

  // typewriter loop — runs once content arrives
  useEffect(() => {
    if (status !== 'ready' || !content) {
      setShown(0)
      setDone(false)
      return
    }
    skipRef.current = false
    setShown(0)
    setDone(false)
    const target = content.length
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      setShown(target)
      setDone(true)
      return
    }
    let i = 0
    const tick = setInterval(() => {
      if (skipRef.current) {
        i = target
        setShown(target)
        setDone(true)
        clearInterval(tick)
        return
      }
      i = Math.min(target, i + CHARS_PER_TICK)
      setShown(i)
      if (i >= target) {
        setDone(true)
        clearInterval(tick)
      }
    }, TICK_MS)
    return () => clearInterval(tick)
  }, [status, content])

  // autoscroll while typing
  useEffect(() => {
    const el = bodyRef.current
    if (!el || done) return
    el.scrollTop = el.scrollHeight
  }, [shown, done])

  // key handlers — q / Esc close, space / Enter skip
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'q') {
        e.preventDefault()
        onClose()
        return
      }
      if ((e.key === ' ' || e.key === 'Enter') && status === 'ready' && !done) {
        e.preventDefault()
        skipRef.current = true
        setShown(content.length)
        setDone(true)
      }
    }
    window.addEventListener('keydown', onKey, { capture: true })
    return () => window.removeEventListener('keydown', onKey, { capture: true } as never)
  }, [content.length, done, onClose, status])

  const visible = status === 'ready' ? content.slice(0, shown) : ''

  return (
    <div className='dev-viewer-root' role='dialog' aria-modal='true' aria-label='post viewer'>
      <div className='dev-viewer-bar'>
        <span className='dev-viewer-marker'>▌</span>
        <span className='dev-viewer-title'>{meta.title ?? meta.slug}</span>
        {meta.date && <span className='dev-viewer-date'>· {meta.date}</span>}
        <span className='dev-viewer-spacer' />
        <span className='dev-viewer-hint'>
          <span className='wt-kbd'>q</span> / <span className='wt-kbd'>Esc</span> close
          {status === 'ready' && !done && (
            <>
              {' · '}
              <span className='wt-kbd'>space</span> skip
            </>
          )}
        </span>
      </div>
      <div className='dev-viewer-body' ref={bodyRef}>
        {status === 'loading' && (
          <div className='dev-viewer-status wt-tone-muted'>⠋ loading {meta.slug}…</div>
        )}
        {status === 'error' && (
          <div className='dev-viewer-status wt-tone-err'>error: {error ?? 'failed to load'}</div>
        )}
        {status === 'ready' && (
          <pre className='dev-viewer-text'>
            {visible}
            <span className={`dev-viewer-caret ${done ? 'done' : ''}`} aria-hidden />
          </pre>
        )}
      </div>
    </div>
  )
}

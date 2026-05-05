import { useEffect, useMemo, useRef, useState } from 'react'

type Heading = { depth: number; slug: string; text: string }

type Props = {
  meta: { title?: string; date?: string; slug: string }
  html: string
  headings: Heading[]
  status: 'loading' | 'ready' | 'error'
  error?: string
  onClose: () => void
}

const SCROLL_LINE = 64

export default function PostViewer({
  meta,
  html,
  headings,
  status,
  error,
  onClose
}: Props) {
  const bodyRef = useRef<HTMLDivElement | null>(null)
  const [activeSlug, setActiveSlug] = useState<string | null>(null)
  const [tocOpen, setTocOpen] = useState(false)

  // Blur whatever was focused (usually the terminal prompt) so keys
  // like `g`/`j`/`k`/`1` aren't typed into it instead.
  useEffect(() => {
    const active = document.activeElement
    if (active && active instanceof HTMLElement) active.blur()
  }, [])

  // h2-only nav targets — keeps `1`–`9` shortcuts to a meaningful set.
  const navHeadings = useMemo(
    () => headings.filter((h) => h.depth === 2),
    [headings]
  )

  // scroll-spy: track which heading is currently nearest the top.
  useEffect(() => {
    if (status !== 'ready') return
    const body = bodyRef.current
    if (!body) return
    const all = headings
      .map((h) => ({ slug: h.slug, el: body.querySelector(`#${cssEscape(h.slug)}`) as HTMLElement | null }))
      .filter((x): x is { slug: string; el: HTMLElement } => !!x.el)
    if (all.length === 0) return
    const onScroll = () => {
      const top = body.scrollTop + 80
      let current: string | null = null
      for (const { slug, el } of all) {
        if (el.offsetTop <= top) current = slug
        else break
      }
      setActiveSlug(current)
    }
    onScroll()
    body.addEventListener('scroll', onScroll, { passive: true })
    return () => body.removeEventListener('scroll', onScroll)
  }, [status, html, headings])

  // keyboard: q/Esc close, g/G top/bottom, j/k line scroll, 1–9 jump,
  // ? toggle toc.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // The viewer is modal — it owns the keyboard regardless of which
      // DOM element technically has focus (the terminal input below
      // this overlay stays focused, so a tag-based guard would block
      // every key).
      if (e.key === 'Escape') {
        e.preventDefault()
        if (tocOpen) {
          setTocOpen(false)
          return
        }
        onClose()
        return
      }
      if (e.key === 'q' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        onClose()
        return
      }
      if (status !== 'ready') return
      const body = bodyRef.current
      if (!body) return

      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault()
        setTocOpen((v) => !v)
        return
      }
      if (e.key === 'g' && !e.shiftKey) {
        e.preventDefault()
        body.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }
      if (e.key === 'G' || (e.shiftKey && e.key === 'g')) {
        e.preventDefault()
        body.scrollTo({ top: body.scrollHeight, behavior: 'smooth' })
        return
      }
      if (e.key === 'j') {
        e.preventDefault()
        body.scrollBy({ top: SCROLL_LINE, behavior: 'auto' })
        return
      }
      if (e.key === 'k') {
        e.preventDefault()
        body.scrollBy({ top: -SCROLL_LINE, behavior: 'auto' })
        return
      }
      // 1–9 jump to N-th h2
      if (/^[1-9]$/.test(e.key)) {
        const idx = Number(e.key) - 1
        const h = navHeadings[idx]
        if (!h) return
        e.preventDefault()
        const el = body.querySelector(`#${cssEscape(h.slug)}`) as HTMLElement | null
        if (el) body.scrollTo({ top: el.offsetTop - 16, behavior: 'smooth' })
        return
      }
    }
    window.addEventListener('keydown', onKey, { capture: true })
    return () => window.removeEventListener('keydown', onKey, { capture: true } as never)
  }, [onClose, status, navHeadings, tocOpen])

  const jumpTo = (slug: string) => {
    const body = bodyRef.current
    if (!body) return
    const el = body.querySelector(`#${cssEscape(slug)}`) as HTMLElement | null
    if (el) body.scrollTo({ top: el.offsetTop - 16, behavior: 'smooth' })
    setTocOpen(false)
  }

  return (
    <div className='dev-viewer-root' role='dialog' aria-modal='true' aria-label='post viewer'>
      <div className='dev-viewer-bar'>
        <span className='dev-viewer-marker'>▌</span>
        <span className='dev-viewer-title'>{meta.title ?? meta.slug}</span>
        {meta.date && <span className='dev-viewer-date'>· {meta.date}</span>}
        <span className='dev-viewer-spacer' />
        <span className='dev-viewer-hint'>
          <span className='wt-kbd'>?</span> toc · <span className='wt-kbd'>g</span>/<span className='wt-kbd'>G</span> top/end · <span className='wt-kbd'>q</span> close
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
          <article
            className='dev-viewer-article'
            // shiki output is server-rendered, no user input — safe.
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
      </div>

      {tocOpen && status === 'ready' && (
        <div
          className='dev-viewer-toc'
          role='listbox'
          aria-label='table of contents'
          onClick={(e) => {
            // close when clicking the backdrop
            if (e.target === e.currentTarget) setTocOpen(false)
          }}
        >
          <div className='dev-viewer-toc-panel'>
            <div className='dev-viewer-toc-head'>
              <span>contents</span>
              <span className='wt-tone-muted'>
                <span className='wt-kbd'>1-9</span> jump · <span className='wt-kbd'>Esc</span> close
              </span>
            </div>
            {headings.length === 0 && (
              <div className='wt-tone-muted'>(no headings)</div>
            )}
            {headings.map((h, i) => {
              const navIdx = navHeadings.findIndex((nh) => nh.slug === h.slug)
              const numKey = navIdx >= 0 && navIdx < 9 ? String(navIdx + 1) : null
              return (
                <button
                  key={h.slug + i}
                  type='button'
                  className={`dev-viewer-toc-item depth-${Math.min(h.depth, 4)} ${
                    activeSlug === h.slug ? 'active' : ''
                  }`}
                  onClick={() => jumpTo(h.slug)}
                >
                  <span className='dev-viewer-toc-num'>{numKey ?? ''}</span>
                  <span className='dev-viewer-toc-text'>{h.text}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Minimal CSS.escape shim — heading slugs from astro come as kebab-case
 * + Chinese characters; querySelector('#…') needs an escaped string.
 */
function cssEscape(s: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(s)
  return s.replace(/([^a-zA-Z0-9_-])/g, '\\$1')
}

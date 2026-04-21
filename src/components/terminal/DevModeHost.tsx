import { useCallback, useEffect, useState } from 'react'

import DevMode from './DevMode'
import type { PostSummary } from './types'

/**
 * Global host mounted once in BaseLayout. Owns the human/dev mode flag
 * and decides whether to render the fullscreen overlay on top of the
 * current page. Entry points:
 *   - `\`` anywhere (except inside editable controls)
 *   - `joye:toggle-dev` / `joye:enter-dev` / `joye:exit-dev` custom events
 *     (dispatched by the Header toggle button — keeps the Astro side
 *     decoupled from React).
 */

type Mode = 'human' | 'dev'

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (target instanceof HTMLElement && target.isContentEditable) return true
  return false
}

export default function DevModeHost({ posts = [] }: { posts?: PostSummary[] }) {
  const [mode, setMode] = useState<Mode>('human')

  const enter = useCallback(() => setMode('dev'), [])
  const exit = useCallback(() => setMode('human'), [])

  // global `\`` hotkey — only fires when nothing editable is focused
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '`') return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (isEditable(e.target)) return
      // while already in dev mode, the overlay's own input owns the backtick
      if (mode === 'dev') return
      e.preventDefault()
      enter()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode, enter])

  // custom events from non-React callers (Header button, future callers)
  useEffect(() => {
    const onToggle = () => setMode((m) => (m === 'dev' ? 'human' : 'dev'))
    const onEnter = () => setMode('dev')
    const onExit = () => setMode('human')
    window.addEventListener('joye:toggle-dev', onToggle)
    window.addEventListener('joye:enter-dev', onEnter)
    window.addEventListener('joye:exit-dev', onExit)
    return () => {
      window.removeEventListener('joye:toggle-dev', onToggle)
      window.removeEventListener('joye:enter-dev', onEnter)
      window.removeEventListener('joye:exit-dev', onExit)
    }
  }, [])

  // keep the Header's button icon in sync so non-React code can read
  // the current mode without importing this component
  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.dataset.mode = mode
  }, [mode])

  if (mode !== 'dev') return null
  return <DevMode posts={posts} onExit={exit} />
}

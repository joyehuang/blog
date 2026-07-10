import { useCallback, useEffect, useState } from 'react'

import { trackSiteEvent } from '@/lib/analytics'

import DevMode from './DevMode'
import { fetchSiteFs } from './fs/client'
import type { FsNode } from './fs/types'

/**
 * Global host mounted once in BaseLayout. Owns the human/dev mode flag
 * and decides whether to render the fullscreen overlay on top of the
 * current page. Entry points:
 *   - `\`` anywhere (except inside editable controls)
 *   - `joye:toggle-dev` / `joye:enter-dev` / `joye:exit-dev` custom events
 *     (dispatched by the Header toggle button — keeps the Astro side
 *     decoupled from React).
 *
 * The pseudo-FS is fetched on demand when dev mode is entered, rather than
 * shipped as a server-rendered prop — this component mounts on every page,
 * but the manifest is only ever needed by the ~backtick minority of visits.
 */

type Mode = 'human' | 'dev'

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (target instanceof HTMLElement && target.isContentEditable) return true
  return false
}

function DevModeLoading({ failed }: { failed: boolean }) {
  return (
    <div className='dev-root' role='dialog' aria-label='dev mode terminal'>
      <div className='dev-chrome'>
        <div className='dev-chrome-left'>
          <div className='dev-chrome-dots' aria-hidden>
            <span />
            <span />
            <span />
          </div>
          <span className='dev-chrome-title'>dev mode</span>
        </div>
        <div className='dev-chrome-hint'>
          press <span className='wt-kbd'>Esc</span> to leave
        </div>
      </div>
      <div className='dev-body'>
        <div className='dev-boot' aria-live='polite'>
          <span className='dev-boot-line wt-tone-muted'>
            <span className='wt-tone-fg'>
              {failed ? 'failed to load manifest — press Esc to leave' : 'loading manifest…'}
            </span>
          </span>
        </div>
      </div>
    </div>
  )
}

export default function DevModeHost() {
  const [mode, setMode] = useState<Mode>('human')
  const [fs, setFs] = useState<FsNode | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)

  const enter = useCallback((method: string) => {
    trackSiteEvent('terminal_open', {
      method,
      surface: 'dev_mode',
      target: 'terminal_shell'
    })
    setMode('dev')
  }, [])
  const exit = useCallback(() => setMode('human'), [])

  // fetch the pseudo-FS the first time dev mode is entered (shared cache in
  // fs/client — reuses the home-page Terminal's in-flight request if any)
  useEffect(() => {
    if (mode !== 'dev' || fs) return
    let cancelled = false
    setLoadFailed(false)
    fetchSiteFs()
      .then((tree) => {
        if (!cancelled) setFs(tree)
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [mode, fs])

  // Esc to back out while the manifest is still loading/failed — once `fs`
  // resolves, DevMode mounts and its own input owns Esc-to-exit instead.
  useEffect(() => {
    if (mode !== 'dev' || fs) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') exit()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode, fs, exit])

  // global `\`` hotkey — only fires when nothing editable is focused
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '`') return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (isEditable(e.target)) return
      // while already in dev mode, the overlay's own input owns the backtick
      if (mode === 'dev') return
      e.preventDefault()
      enter('keyboard_backtick')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode, enter])

  // custom events from non-React callers (Header button, future callers)
  useEffect(() => {
    const onToggle = () => setMode((m) => (m === 'dev' ? 'human' : 'dev'))
    const onEnter = () => enter('window_control')
    const onExit = () => setMode('human')
    window.addEventListener('joye:toggle-dev', onToggle)
    window.addEventListener('joye:enter-dev', onEnter)
    window.addEventListener('joye:exit-dev', onExit)
    return () => {
      window.removeEventListener('joye:toggle-dev', onToggle)
      window.removeEventListener('joye:enter-dev', onEnter)
      window.removeEventListener('joye:exit-dev', onExit)
    }
  }, [enter])

  // keep the Header's button icon in sync so non-React code can read
  // the current mode without importing this component
  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.dataset.mode = mode
  }, [mode])

  if (mode !== 'dev') return null
  if (!fs) return <DevModeLoading failed={loadFailed} />
  return <DevMode fs={fs} onExit={exit} />
}

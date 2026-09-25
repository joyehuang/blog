import { trackOnce } from '@/lib/jojo/analytics'
import { statusForPhase, type ChatAdapter } from '@/lib/jojo/chat/types'
import { createUnavailableChat } from '@/lib/jojo/chat/unavailable'
import {
  currentMode,
  JOJO_EVENTS,
  JOJO_KEYS,
  modeHas,
  readStored,
  writeStored,
  type IntroEventDetail
} from '@/lib/jojo/keys'
import { initialPoke, poke, type PokeStep } from '@/lib/jojo/poke'
import { dockPresence, isEditable, keyboardLikelyOpen, type Presence } from '@/lib/jojo/presence'
import { Jojo, type EmotionId, type StatusId } from '@jojo-web/runtime'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'

import './jojo.css'
import './dock.css'

export interface DockLinks {
  latest: { title: string; href: string } | null
  /** a pool of real post URLs for "surprise me" */
  pool: string[]
  about: string
}

interface Props {
  lang: 'zh' | 'en'
  links: DockLinks
  /** the page hosts the intro (so "replay" is offered) */
  home: boolean
  /** review builds only: reviewers can preview chat states */
  review?: boolean
}

const COPY = {
  zh: {
    open: '打开 Jojo 小菜单',
    close: '收起 Jojo 小菜单',
    tagline: 'Joye 的小伙伴，在这儿陪你逛。',
    nav: 'Jojo 带路',
    latest: '最新一篇',
    random: '随便翻一篇',
    who: 'Jojo 是谁',
    replay: '再看一次开场',
    chatTitle: '聊天',
    chatState: '还没接上',
    chatNote: '对话功能还在路上，现在不能发消息；等它真的上线，Jojo 会在这里回答。',
    poke: '戳一下',
    tuck: '先躲一下',
    back: '叫 Jojo 回来',
    preview: '状态预览 · 仅演示，未连接任何 Agent'
  },
  en: {
    open: 'Open the Jojo menu',
    close: 'Close the Jojo menu',
    tagline: "Joye's little companion, keeping you company.",
    nav: 'Jojo shortcuts',
    latest: 'Latest post',
    random: 'Surprise me',
    who: 'Who is Jojo?',
    replay: 'Replay the intro',
    chatTitle: 'Chat',
    chatState: 'not connected yet',
    chatNote:
      "Chat isn't live yet, so you can't send messages. When it really ships, Jojo will answer here.",
    poke: 'Poke',
    tuck: 'Hide for now',
    back: 'Bring Jojo back',
    preview: 'State preview · demo only, no agent connected'
  }
} as const

/**
 * Scheme B — the resident dock. A small Jojo in the bottom-right corner that
 * opens into a menu of real shortcuts. It is a companion, not a chat: the chat
 * area is driven by a `ChatAdapter`, and today's adapter is "unavailable", so
 * there is no input box, no fake typing, no fake reply — just a plain "not
 * connected yet". Presence rules (lib/jojo/presence.ts): hidden while the intro
 * runs or an in-flow Jojo is on screen, while typing or with the soft keyboard
 * up, and over the comment box on phones; the visitor can tuck it away.
 */
export default function JojoDock({ lang, links, home, review = false }: Props) {
  const t = COPY[lang]
  const panelId = useId()
  const [enabled, setEnabled] = useState(false)
  const [open, setOpen] = useState(false)
  const [tucked, setTucked] = useState(false)
  const [introRunning, setIntroRunning] = useState(false)
  const [anchorInView, setAnchorInView] = useState(false)
  const [commentsInView, setCommentsInView] = useState(false)
  const [editing, setEditing] = useState(false)
  const [keyboard, setKeyboard] = useState(false)
  const [compact, setCompact] = useState(false)
  const [emotion, setEmotion] = useState<EmotionId>('calm')
  const [previewStatus, setPreviewStatus] = useState<StatusId | null>(null)
  const adapter = useMemo<ChatAdapter>(() => createUnavailableChat(), [])
  const [chat, setChat] = useState(() => adapter.getState())
  const rootRef = useRef<HTMLDivElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const pokeState = useRef(initialPoke())
  const timers = useRef<number[]>([])

  useEffect(() => adapter.subscribe(setChat), [adapter])
  useEffect(() => () => adapter.dispose(), [adapter])

  // mode, tucked state, intro
  useEffect(() => {
    setEnabled(modeHas(currentMode(), 'b'))
    setTucked(readStored(JOJO_KEYS.dock) === 'tucked')
    const html = document.documentElement
    const sync = () =>
      setIntroRunning(['armed', 'running'].includes(html.getAttribute('data-jojo-intro') ?? ''))
    sync()
    const onIntro = (e: Event) => {
      const d = (e as CustomEvent<IntroEventDetail>).detail
      if (d.phase === 'start') setIntroRunning(true)
      if (d.phase === 'end') setIntroRunning(false)
    }
    document.addEventListener(JOJO_EVENTS.intro, onIntro)
    const mo = new MutationObserver(sync)
    mo.observe(html, { attributes: true, attributeFilter: ['data-jojo-intro'] })
    return () => {
      document.removeEventListener(JOJO_EVENTS.intro, onIntro)
      mo.disconnect()
    }
  }, [])

  // what is on screen: in-flow Jojo anchors, the comment box
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return
    const seen = new Set<Element>()
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) seen.add(e.target)
        else seen.delete(e.target)
      }
      setAnchorInView([...seen].some((el) => el.hasAttribute('data-jojo-anchor')))
      setCommentsInView([...seen].some((el) => el.id === 'waline'))
    })
    const watch = () => {
      document.querySelectorAll('[data-jojo-anchor], #waline').forEach((el) => {
        if (!rootRef.current?.contains(el)) io.observe(el)
      })
    }
    watch()
    // islands (the hero seat) may mount after us
    const late = window.setTimeout(watch, 1500)
    return () => {
      window.clearTimeout(late)
      io.disconnect()
    }
  }, [])

  // typing elsewhere, soft keyboard, compact width
  useEffect(() => {
    const onFocus = () => {
      const a = document.activeElement
      setEditing(isEditable(a) && !rootRef.current?.contains(a))
    }
    const onBlur = () => window.setTimeout(onFocus, 0)
    document.addEventListener('focusin', onFocus)
    document.addEventListener('focusout', onBlur)
    const vv = window.visualViewport
    const onVV = () => setKeyboard(keyboardLikelyOpen(window.innerHeight, vv?.height))
    vv?.addEventListener('resize', onVV)
    const mq = window.matchMedia('(max-width: 640px)')
    const onMq = () => setCompact(mq.matches)
    onMq()
    mq.addEventListener('change', onMq)
    return () => {
      document.removeEventListener('focusin', onFocus)
      document.removeEventListener('focusout', onBlur)
      vv?.removeEventListener('resize', onVV)
      mq.removeEventListener('change', onMq)
    }
  }, [])

  // review-only state preview
  useEffect(() => {
    if (!review) return
    const on = (e: Event) =>
      setPreviewStatus((e as CustomEvent<{ status: StatusId | null }>).detail.status)
    document.addEventListener(JOJO_EVENTS.reviewStatus, on)
    return () => document.removeEventListener(JOJO_EVENTS.reviewStatus, on)
  }, [review])

  const presence: Presence = dockPresence({
    enabled,
    tucked,
    introRunning,
    anchorInView,
    editingElsewhere: editing,
    keyboardOpen: keyboard,
    commentsInView,
    compact,
    open
  })

  // tell the page (back-to-top stacks above a shown dock)
  useEffect(() => {
    const html = document.documentElement
    html.setAttribute('data-jojo-dock', presence)
    return () => html.removeAttribute('data-jojo-dock')
  }, [presence])

  // hiding closes the panel (typing, keyboard, intro)
  useEffect(() => {
    if (presence === 'hidden' && open) setOpen(false)
  }, [presence, open])

  const closePanel = useCallback((focusToggle: boolean) => {
    setOpen(false)
    if (focusToggle) toggleRef.current?.focus()
  }, [])

  // Esc and outside clicks close the panel
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePanel(true)
    }
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) closePanel(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [open, closePanel])

  useEffect(
    () => () => {
      for (const id of timers.current) window.clearTimeout(id)
    },
    []
  )

  const playSteps = (steps: PokeStep[]) => {
    for (const id of timers.current) window.clearTimeout(id)
    timers.current = []
    let at = 0
    for (const s of steps) {
      timers.current.push(window.setTimeout(() => setEmotion(s.emotion), at))
      at += s.ms
    }
    timers.current.push(window.setTimeout(() => setEmotion('calm'), at))
  }

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next) {
      playSteps([{ emotion: 'happy', ms: 700 }])
      trackOnce('jojo_dock_action', { surface: 'jojo_dock', action: 'open' })
    }
  }
  const onPoke = () => {
    const r = poke(pokeState.current, performance.now())
    pokeState.current = r.state
    if (r.ignored) return
    playSteps(r.steps)
    trackOnce('jojo_poke', { surface: 'jojo_dock' })
  }
  const onTuck = () => {
    writeStored(JOJO_KEYS.dock, 'tucked')
    setOpen(false)
    setTucked(true)
    trackOnce('jojo_dock_action', { surface: 'jojo_dock', action: 'tuck' })
  }
  const onRestore = () => {
    writeStored(JOJO_KEYS.dock, null)
    setTucked(false)
    trackOnce('jojo_dock_action', { surface: 'jojo_dock', action: 'restore' })
    window.requestAnimationFrame(() => toggleRef.current?.focus())
  }
  const onRandom = () => {
    const pool = links.pool.filter((h) => h !== location.pathname)
    if (!pool.length) return
    location.assign(pool[Math.floor(Math.random() * pool.length)])
  }
  const onReplay = () => {
    setOpen(false)
    trackOnce('intro_replay', {
      surface: 'intro_overlay',
      target: 'jojo_build',
      source: 'replay',
      variant: 'jojo_build',
      trigger: 'replay'
    })
    document.dispatchEvent(new CustomEvent(JOJO_EVENTS.introReplay))
  }

  // Always return an element: Astro's React renderer identifies React
  // components by rendering them, and a bare `null` on the server fails that.
  if (!enabled) return <div className='jojo-dock' data-presence='hidden' hidden />

  const realStatus = statusForPhase(chat.phase)
  const status = previewStatus ?? realStatus
  const canReplay = home && modeHas(currentMode(), 'c')

  return (
    <div
      ref={rootRef}
      className='jojo-dock'
      data-presence={presence}
      data-open={open ? '' : undefined}
      inert={presence === 'hidden' ? true : undefined}
    >
      <button
        type='button'
        className='jojo-dock-tab'
        aria-label={t.back}
        onClick={onRestore}
        tabIndex={presence === 'tucked' ? 0 : -1}
        aria-hidden={presence === 'tucked' ? undefined : true}
      >
        <span className='jojo-dock-tab-dot' aria-hidden='true' />
      </button>

      <button
        ref={toggleRef}
        type='button'
        className='jojo-dock-toggle jojo-poke-target'
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? t.close : t.open}
        onClick={toggle}
        tabIndex={presence === 'tucked' ? -1 : 0}
      >
        <Jojo
          emotion={emotion}
          status={status}
          motion='transitions'
          size={44}
          framing='tight'
          decorative
          idPrefix='dock-'
        />
      </button>

      <section
        id={panelId}
        className='jojo-dock-panel'
        aria-label='Jojo'
        inert={open ? undefined : true}
        aria-hidden={open ? undefined : true}
      >
        <header className='jojo-dock-head'>
          <div>
            <p className='jojo-dock-name'>Jojo</p>
            <p className='jojo-dock-tagline'>{t.tagline}</p>
          </div>
          <button
            type='button'
            className='jojo-dock-icon'
            aria-label={t.close}
            onClick={() => closePanel(true)}
          >
            <svg viewBox='0 0 24 24' width='16' height='16' aria-hidden='true'>
              <path
                d='M18 6 6 18M6 6l12 12'
                stroke='currentColor'
                strokeWidth='2.2'
                strokeLinecap='round'
                fill='none'
              />
            </svg>
          </button>
        </header>

        <nav className='jojo-dock-nav' aria-label={t.nav}>
          {links.latest && (
            <a href={links.latest.href}>
              <span>{t.latest}</span>
              <small>{links.latest.title}</small>
            </a>
          )}
          {links.pool.length > 1 && (
            <button type='button' onClick={onRandom}>
              <span>{t.random}</span>
            </button>
          )}
          <a href={`${links.about}#jojo`}>
            <span>{t.who}</span>
          </a>
          {canReplay && (
            <button type='button' onClick={onReplay}>
              <span>{t.replay}</span>
            </button>
          )}
        </nav>

        <div className='jojo-dock-chat' data-phase={chat.phase}>
          <p className='jojo-dock-chat-line'>
            <span className='jojo-dock-chat-dot' aria-hidden='true' />
            <span>
              {t.chatTitle} · {t.chatState}
            </span>
          </p>
          <p className='jojo-dock-chat-note'>{t.chatNote}</p>
          {/* A composer is rendered only for an adapter that can really send
              (`capabilities.compose`); the unavailable adapter never can. */}
        </div>

        {previewStatus && <p className='jojo-dock-preview'>{t.preview}</p>}

        <footer className='jojo-dock-foot'>
          <button type='button' onClick={onPoke}>
            {t.poke}
          </button>
          <button type='button' onClick={onTuck}>
            {t.tuck}
          </button>
        </footer>
      </section>

    </div>
  )
}

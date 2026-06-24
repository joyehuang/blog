import { useCallback, useEffect, useRef, useState } from 'react'

import JoJo from '@/components/mascot/JoJo'
import './jojo-tour.css'

type Side = 'left' | 'right' | 'top' | 'bottom'

type Step = {
  id: string
  /** Resolve the target element to spotlight. Return null to skip the step. */
  target: () => HTMLElement | null
  /** JoJo's line — supports \n for multi-line bubbles. */
  line: string
  /** Which side of the target JoJo stands on. */
  side: Side
  /** Auto-advance duration in ms (default 2400). */
  duration?: number
}
/** Find the first <section> whose <h2> matches the title exactly. */
function sectionByTitle(title: string): HTMLElement | null {
  const headings = document.querySelectorAll('main section h2')
  for (const h of headings) {
    if (h.textContent?.trim() === title) {
      return (h.closest('section') as HTMLElement | null) ?? null
    }
  }
  return null
}

const STEPS: Step[] = [
  {
    id: 'welcome',
    target: () => document.querySelector('#content-header') as HTMLElement | null,
    line: "hi! 我是 JoJo ✨\n30 秒带你逛完这个博客",
    side: 'right',
    duration: 3200
  },
  {
    id: 'terminal',
    target: () => document.querySelector('.wt-intro') as HTMLElement | null,
    line: "power user?\ntype 'help' 'ls /blog' 'chat'",
    side: 'right',
    duration: 2800
  },
  {
    id: 'about',
    target: () => sectionByTitle('About'),
    line: "Joye — 墨尔本大学\nAdastra / Tezign / AIXCut / fAIshion\n现在在做 Playyy.ai",
    side: 'right'
  },
  {
    id: 'blog',
    target: () => sectionByTitle('Blog'),
    line: "最新文章 — Transformer / Agent\n面试心得,深度+工程",
    side: 'right'
  },
  {
    id: 'notes',
    target: () => sectionByTitle('Notes'),
    line: "碎片笔记 — idea / 草稿 / 研究\n更新得快",
    side: 'right'
  },
  {
    id: 'talks',
    target: () => sectionByTitle('Talks'),
    line: "群里每周一次技术分享\n内容+幻灯片都公开沉淀",
    side: 'right'
  },
  {
    id: 'experience',
    target: () => sectionByTitle('Experience'),
    line: "实习时间线 — 在哪做了什么",
    side: 'right'
  },
  {
    id: 'open-source',
    target: () => sectionByTitle('Open Source'),
    line: "Learn-Open-Harness (297⭐)\nminimind-notes (93⭐)",
    side: 'right'
  },
  {
    id: 'skills',
    target: () => sectionByTitle('Skills'),
    line: "技术栈 — TS/React/Node\n+ Claude Code / Agent / RAG",
    side: 'right'
  },
  {
    id: 'bye',
    target: () => document.querySelector('#content-header') as HTMLElement | null,
    line: "enjoy exploring! ✨\n我在右下角,需要叫我",
    side: 'right',
    duration: 3200
  }
]

const JOJO_BOX_W = 110
const JOJO_BOX_H = 140
const TARGET_PADDING = 10

export default function JoJoTour() {
  // 'idle' = waiting for intro to complete
  // 'playing' = actively touring
  // 'done' = finished or skipped; component renders nothing
  const [phase, setPhase] = useState<'idle' | 'playing' | 'done'>('idle')
  const [stepIndex, setStepIndex] = useState(0)
  const [jojoPos, setJojoPos] = useState<{ x: number; y: number } | null>(null)
  const [spotRect, setSpotRect] = useState<{
    x: number
    y: number
    w: number
    h: number
  } | null>(null)
  const [fadingOut, setFadingOut] = useState(false)
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Decide whether to play at all, then wait for intro:complete.
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const played = sessionStorage.getItem('tour-played')
    if (reduce || played) {
      setPhase('done')
      return
    }

    const launch = () => {
      // Re-check in case another tab finished the tour while we waited.
      if (sessionStorage.getItem('tour-played')) {
        setPhase('done')
        return
      }
      setPhase('playing')
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).__introDone === true) {
      const t = setTimeout(launch, 600)
      return () => clearTimeout(t)
    }
    window.addEventListener('intro:complete', launch, { once: true })
    return () => window.removeEventListener('intro:complete', launch)
  }, [])

  const finish = useCallback(() => {
    setFadingOut(true)
    try {
      sessionStorage.setItem('tour-played', '1')
    } catch {}
    setTimeout(() => setPhase('done'), 400)
  }, [])

  const advance = useCallback(() => {
    setStepIndex((i) => {
      if (i + 1 >= STEPS.length) {
        finish()
        return i
      }
      return i + 1
    })
  }, [finish])

  const step = STEPS[stepIndex]

  // Per-step effect: scroll target into view, compute spotlight + JoJo position.
  useEffect(() => {
    if (phase !== 'playing' || !step) return

    const target = step.target()
    if (!target) {
      const t = setTimeout(advance, 100)
      return () => clearTimeout(t)
    }

    // === Compute the target's "future" rect — i.e. where it will sit on
    // screen once we've scrolled to center it. We use this immediately so
    // the spotlight doesn't lag behind the smooth-scroll for 500ms.
    const rect = target.getBoundingClientRect()
    const currentScrollY = window.scrollY
    const docTop = rect.top + currentScrollY
    const viewportH = window.innerHeight
    const viewportW = window.innerWidth
    // Where the target's top will be in viewport coords after scroll:
    const futureTop = (viewportH - rect.height) / 2

    const targetScrollY = docTop - (viewportH - rect.height) / 2
    // Smooth-scroll the window. Use 'auto' if user prefers reduced motion.
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({
      top: Math.max(0, targetScrollY),
      behavior: reduce ? 'auto' : 'smooth'
    })

    // Set spotlight to the "future" position immediately — CSS transition
    // animates it from the previous spot.
    setSpotRect({
      x: Math.max(0, rect.left - TARGET_PADDING),
      y: Math.max(0, futureTop - TARGET_PADDING),
      w: Math.min(viewportW, rect.width + TARGET_PADDING * 2),
      h: Math.min(viewportH, rect.height + TARGET_PADDING * 2)
    })

    // Position JoJo beside the (future) target rect.
    let x: number
    let y: number
    if (step.side === 'right') {
      x = rect.right + 20
      y = futureTop + rect.height / 2 - JOJO_BOX_H / 2
    } else if (step.side === 'left') {
      x = rect.left - JOJO_BOX_W - 20
      y = futureTop + rect.height / 2 - JOJO_BOX_H / 2
    } else if (step.side === 'top') {
      x = rect.left + rect.width / 2 - JOJO_BOX_W / 2
      y = futureTop - JOJO_BOX_H - 20
    } else {
      x = rect.left + rect.width / 2 - JOJO_BOX_W / 2
      y = futureTop + rect.height + 20
    }
    if (step.side === 'right' && x + JOJO_BOX_W > viewportW - 16) {
      x = Math.max(16, rect.left - JOJO_BOX_W - 20)
    }
    if (step.side === 'left' && x < 16) {
      x = Math.min(viewportW - JOJO_BOX_W - 16, rect.right + 20)
    }
    x = Math.max(16, Math.min(viewportW - JOJO_BOX_W - 16, x))
    y = Math.max(16, Math.min(viewportH - JOJO_BOX_H - 16, y))
    setJojoPos({ x, y })

    // Schedule auto-advance.
    const duration = step.duration ?? 2400
    advanceTimer.current = setTimeout(advance, duration)

    return () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current)
      if (scrollTimer.current) clearTimeout(scrollTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, phase])

  // Lock background scroll while playing.
  useEffect(() => {
    if (phase !== 'playing') return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [phase])

  // Recompute on viewport changes.
  useEffect(() => {
    if (phase !== 'playing' || !step) return
    const onResize = () => {
      const target = step.target()
      if (!target) return
      const rect = target.getBoundingClientRect()
      const vw = window.innerWidth
      const vh = window.innerHeight
      // Target should be centered (we scrolled to center it).
      const futureTop = (vh - rect.height) / 2
      setSpotRect({
        x: Math.max(0, rect.left - TARGET_PADDING),
        y: Math.max(0, futureTop - TARGET_PADDING),
        w: Math.min(vw, rect.width + TARGET_PADDING * 2),
        h: Math.min(vh, rect.height + TARGET_PADDING * 2)
      })
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [phase, step])

  if (phase !== 'playing' || !step) return null

  return (
    <div
      className={['jojo-tour-root', fadingOut ? 'jojo-tour-fading' : '']
        .filter(Boolean)
        .join(' ')}
    >
      {spotRect && (
        <div
          className='jojo-tour-spotlight'
          style={{
            transform: `translate(${spotRect.x}px, ${spotRect.y}px)`,
            width: spotRect.w,
            height: spotRect.h
          }}
          aria-hidden='true'
        />
      )}

      {jojoPos && (
        <div
          className='jojo-tour-mascot'
          style={{
            transform: `translate(${jojoPos.x}px, ${jojoPos.y}px)`
          }}
        >
          <div className='jojo-tour-bubble'>{step.line}</div>
          <JoJo speak={null} autoQuips={false} followCursor={false} size='md' />
        </div>
      )}

      <div className='jojo-tour-controls'>
        <button type='button' className='jojo-tour-skip' onClick={finish}>
          Skip ✕
        </button>
        <div className='jojo-tour-progress' aria-live='polite'>
          <span className='jojo-tour-progress-current'>{stepIndex + 1}</span>
          <span className='jojo-tour-progress-sep'>/</span>
          <span className='jojo-tour-progress-total'>{STEPS.length}</span>
        </div>
        <button type='button' className='jojo-tour-next' onClick={advance}>
          {stepIndex + 1 >= STEPS.length ? 'Done ✓' : 'Next →'}
        </button>
      </div>
    </div>
  )
}

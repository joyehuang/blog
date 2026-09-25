import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import JoJo from '../mascot/JoJo'

import './reading-reward.css'

/**
 * Easter egg for readers who actually finish a long post: JoJo pops into the
 * corner once, says one thing, and leaves.
 *
 * Two gates, so it rewards reading rather than scrolling:
 *   - the end of the article body has to reach the upper 75% of the viewport
 *   - the visitor has to have been on the page for at least `DWELL_MS`
 *
 * Fires at most once per post per session. Short posts never mount it at all —
 * `BlogPost.astro` checks `READING_REWARD_MIN_WORDS` server-side.
 */

/** Below this, finishing the post is not an achievement worth interrupting. */
export const READING_REWARD_MIN_WORDS = 1200

const DWELL_MS = 15_000
const VISIBLE_MS = 7000
const EXIT_MS = 300

// Kept short on purpose — the JoJo bubble is `white-space: nowrap`.
const QUIPS = {
  zh: ['你居然读完了', '读到底了，佩服', '谢谢你读完', '这篇不短，辛苦了'],
  en: ['you actually finished', 'made it to the end', 'thanks for reading it all']
} as const

export type ReadingRewardProps = {
  /** Post id, used to keep the once-per-session flag per article. */
  slug: string
  lang: 'zh' | 'en'
}

function alreadyRewarded(key: string): boolean {
  try {
    return window.sessionStorage.getItem(key) === '1'
  } catch {
    // private mode / storage disabled — just let the egg fire again
    return false
  }
}

function markRewarded(key: string): void {
  try {
    window.sessionStorage.setItem(key, '1')
  } catch {
    // non-fatal: the reward is cosmetic
  }
}

export default function ReadingReward({ slug, lang }: ReadingRewardProps) {
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const [reachedEnd, setReachedEnd] = useState(false)
  const [dwelled, setDwelled] = useState(false)
  const [shown, setShown] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [mounted, setMounted] = useState(false)

  const storageKey = `joye:read-reward:${slug}`
  const quip = useMemo(() => {
    const pool = QUIPS[lang]
    return pool[Math.floor(Math.random() * pool.length)]
  }, [lang])

  // `createPortal` needs a DOM target, so hold off until after hydration.
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    const timer = window.setTimeout(() => setDwelled(true), DWELL_MS)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setReachedEnd(true)
          observer.disconnect()
        }
      },
      // Require the end of the article to clear the lower quarter of the
      // viewport — merely nudging it into view is not "finished".
      { rootMargin: '0px 0px -25% 0px' }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [])

  const dismiss = useCallback(() => {
    setLeaving(true)
    window.setTimeout(() => setShown(false), EXIT_MS)
  }, [])

  useEffect(() => {
    if (!reachedEnd || !dwelled || shown) return
    if (alreadyRewarded(storageKey)) return
    markRewarded(storageKey)
    setShown(true)
  }, [reachedEnd, dwelled, shown, storageKey])

  useEffect(() => {
    if (!shown) return
    const timer = window.setTimeout(dismiss, VISIBLE_MS)
    return () => window.clearTimeout(timer)
  }, [shown, dismiss])

  return (
    <>
      <div ref={sentinelRef} aria-hidden='true' />
      {mounted &&
        shown &&
        createPortal(
          <div className='rr-root' data-leaving={leaving} role='status' aria-live='polite'>
            <JoJo size='md' speak={quip} autoQuips={false} onClick={dismiss} />
          </div>,
          document.body
        )}
    </>
  )
}

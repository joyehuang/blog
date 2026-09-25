import { trackOnce } from '@/lib/jojo/analytics'
import {
  currentMode,
  JOJO_EVENTS,
  JOJO_KEYS,
  modeHas,
  readStored,
  stillReason,
  writeStored,
  type IntroEventDetail
} from '@/lib/jojo/keys'
import { initialPoke, poke } from '@/lib/jojo/poke'
import { createStepPlayer, type Step } from '@/lib/jojo/steps'
import type { EmotionId, GazeInput, MotionPref } from '@jojo-web/runtime'
import { useCallback, useEffect, useRef, useState } from 'react'

import LazyJojo, { loadJojoRuntime, useStill } from './LazyJojo'

import './jojo.css'

interface Props {
  lang: 'zh' | 'en'
  /** build-time SVG of the calm seat Jojo (shown until the engine is needed) */
  staticSvg: string
}

/**
 * Scheme A — the identity slot: Jojo seated at the avatar's bottom-right, in
 * the document flow with the avatar (never fixed, so it cannot cover text,
 * comments or the keyboard). Still by default; it moves only when
 *  - the intro lands here (happy, then calm),
 *  - a first visit had no intro (a one-time greeting, ≤ 1.2 s),
 *  - the visitor pokes it (click / Enter / Space), or hovers the hero with a
 *    fine pointer (eyes follow while the pointer is over the hero).
 * No speech bubble and no live-region announcements: poking is a quiet
 * visual easter egg. Reduced motion or Save-Data: no greeting, no gaze
 * follow, no prefetch; a poke still swaps to a static face (no animation).
 * Face runs go through a step player, so a reaction whose engine download
 * lands after unmount, after a newer reaction, or not at all never plays.
 */
export default function JojoHero({ lang, staticSvg }: Props) {
  const zh = lang === 'zh'
  const [emotion, setEmotion] = useState<EmotionId>('calm')
  const [motion, setMotion] = useState<MotionPref>('transitions')
  const [gaze, setGaze] = useState<GazeInput>('auto')
  const still = useStill()
  // the engine loads only when something is about to move; each intent counts,
  // so a later intent asks again after a failed download
  const [live, setLive] = useState(0)
  const wake = useCallback(() => {
    setLive((n) => n + 1)
    void loadJojoRuntime().catch(() => {})
  }, [])
  const pokeState = useRef(initialPoke())
  const player = useRef<ReturnType<typeof createStepPlayer> | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const p = createStepPlayer({
      load: loadJojoRuntime,
      apply: (s) => {
        setEmotion(s.emotion)
        if (s.gaze !== undefined) setGaze(s.gaze)
      },
      setTimeout: (cb, ms) => window.setTimeout(cb, ms),
      clearTimeout: (id) => window.clearTimeout(id)
    })
    player.current = p
    return () => {
      p.dispose()
      player.current = null
    }
  }, [])
  const playSteps = useCallback((steps: Step[]) => void player.current?.play(steps), [])

  // going still mid-way: stop following the pointer
  useEffect(() => {
    if (!still) return
    setGaze('auto')
    setMotion('transitions')
  }, [still])

  // greeting / intro landing
  useEffect(() => {
    const html = document.documentElement
    const onIntro = (e: Event) => {
      const d = (e as CustomEvent<IntroEventDetail>).detail
      if (d.phase === 'start') wake()
      if (d.phase === 'land') player.current?.set('happy')
      if (d.phase === 'end') {
        writeStored(JOJO_KEYS.hello, '1')
        playSteps([{ emotion: 'happy', ms: d.outcome === 'complete' ? 900 : 500 }])
      }
    }
    document.addEventListener(JOJO_EVENTS.intro, onIntro)
    if (
      html.hasAttribute('data-jojo-intro-landed') &&
      html.getAttribute('data-jojo-intro') === 'running'
    ) {
      setEmotion('happy')
    }
    const introWillRun = ['armed', 'running'].includes(html.getAttribute('data-jojo-intro') ?? '')
    const canGreet =
      modeHas(currentMode(), 'a') &&
      !introWillRun &&
      !stillReason() &&
      readStored(JOJO_KEYS.hello) === null
    let idle = 0
    if (canGreet) {
      const greet = () => {
        if (stillReason() || !writeStored(JOJO_KEYS.hello, '1')) return
        wake()
        // look toward the name, a small happy hop, back to calm (≈1.1 s)
        playSteps([
          { emotion: 'curious', gaze: { x: 0.2, y: 0.9 }, ms: 420 },
          { emotion: 'happy', gaze: 'auto', ms: 680 }
        ])
      }
      const ric = (
        window as Window & {
          requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number
        }
      ).requestIdleCallback
      idle = ric ? ric(greet, { timeout: 1200 }) : window.setTimeout(greet, 300)
    }
    return () => {
      document.removeEventListener(JOJO_EVENTS.intro, onIntro)
      const cic = (window as Window & { cancelIdleCallback?: (id: number) => void })
        .cancelIdleCallback
      if (idle) (cic ?? window.clearTimeout)(idle)
    }
  }, [playSteps, wake])

  // eyes follow a fine pointer while it is over the hero (desktop only)
  useEffect(() => {
    const hero = document.getElementById('content-header')
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)')
    if (!hero || !fine.matches) return
    const enter = () => {
      if (stillReason()) return
      wake()
      setMotion('full')
      setGaze('pointer')
    }
    const leave = () => {
      setGaze('auto')
      setMotion('transitions')
    }
    hero.addEventListener('pointerenter', enter)
    hero.addEventListener('pointerleave', leave)
    return () => {
      hero.removeEventListener('pointerenter', enter)
      hero.removeEventListener('pointerleave', leave)
    }
  }, [wake])

  const onPoke = () => {
    const r = poke(pokeState.current, performance.now())
    pokeState.current = r.state
    if (r.ignored) return
    trackOnce('jojo_poke', { surface: 'home_hero' })
    wake()
    playSteps(r.steps)
  }
  // no prefetch while still: the engine loads only on an explicit poke
  const prefetch = () => {
    if (!stillReason()) wake()
  }

  return (
    <span className='jojo-seat' data-jojo-seat='' data-jojo-anchor=''>
      <button
        ref={buttonRef}
        type='button'
        className='jojo-seat-btn jojo-poke-target'
        aria-label={zh ? '戳一下 Jojo' : 'Poke Jojo'}
        onClick={onPoke}
        onPointerEnter={prefetch}
        onFocus={prefetch}
      >
        <LazyJojo
          staticSvg={staticSvg}
          live={live}
          emotion={emotion}
          motion={still ? 'static' : motion}
          gaze={gaze}
          size={48}
          framing='tight'
          decorative
          idPrefix='hero-'
        />
      </button>
    </span>
  )
}

import { trackOnce } from '@/lib/jojo/analytics'
import { GUIDE_END, type Bubble, type Stop } from '@/lib/jojo/guide'
import { initialPoke, poke } from '@/lib/jojo/poke'
import { isEditable } from '@/lib/jojo/presence'
import { createStepPlayer } from '@/lib/jojo/steps'
import type { EmotionId, GazeInput, JojoHandle, StatusId } from '@jojo-web/runtime'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import LazyJojo, { loadJojoRuntime } from './LazyJojo'

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

interface Props {
  lang: 'zh' | 'en'
  stops: Stop[]
  /** where Jojo takes off from (the corner Jojo's drawn box) */
  from: Rect
  staticSvg: string
  /** reduced motion / Save-Data: no flight, no float, static faces */
  still: boolean
  /** Jojo is about to land where the dock or the seat will show it again */
  onHandoff(): void
  /** the guide is gone */
  onDone(): void
}

const COPY = {
  zh: {
    meta: 'Jojo 带路',
    prev: '上一个',
    next: '下一个',
    finish: '完成',
    top: '回到顶部',
    ok: '好的',
    end: '结束带路',
    poke: '戳一下 Jojo'
  },
  en: {
    meta: 'Tour',
    prev: 'Back',
    next: 'Next',
    finish: 'Finish',
    top: 'Back to top',
    ok: 'Done',
    end: 'End the tour',
    poke: 'Poke Jojo'
  }
} as const

type Phase =
  | { kind: 'stop'; at: number; page: number }
  | { kind: 'end' }
  | { kind: 'home'; to: 'seat' | 'dock' }

/** where Jojo is headed (a new bubble at the same stop is not a trip) */
const placeKey = (p: Phase) =>
  p.kind === 'stop' ? `stop:${p.at}` : p.kind === 'home' ? `home:${p.to}` : 'end'

/** the sticky header's bottom edge — it hides on scroll down and comes back
 *  on scroll up, so always count it as shown */
const headerBottom = () =>
  Math.max(72, document.querySelector('header-component')?.getBoundingClientRect().bottom ?? 0)
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
const pulse = (t: number, t0: number, len: number) =>
  t <= t0 || t >= t0 + len ? 0 : Math.sin((Math.PI * (t - t0)) / len)

/**
 * "带我逛逛" as a character, not a panel. Jojo leaves its corner, flies to each
 * home section (a spring that follows the section while the page scrolls,
 * with a hop arc, a lean into the turn, a stretch in the air and a squash on
 * landing), stands on the section's top edge — left end, then right end, so
 * it criss-crosses the page — and talks it through in a few bubbles, each with
 * its own face (falling back to the mood that section
 * deserves. Eyes follow a fine pointer while it talks; poking it gets a
 * reaction. At the end it flies home: to the seat beside the avatar ("back to
 * top") or back to the dock corner. Every frame is driven by one rAF loop that
 * writes transforms directly (no React render per frame). Reduced motion /
 * Save-Data: Jojo just appears at each stop, static faces, no float.
 */
export default function JojoGuide({
  lang,
  stops,
  from,
  staticSvg,
  still,
  onHandoff,
  onDone
}: Props) {
  const t = COPY[lang]
  const zh = lang === 'zh'
  const [phase, setPhase] = useState<Phase>({ kind: 'stop', at: 0, page: 0 })
  const [arrived, setArrived] = useState(false)
  /** the current line has finished typing (the characters themselves are lit outside React) */
  const [typedAll, setTypedAll] = useState(false)
  const [override, setOverride] = useState<EmotionId | null>(null)
  const [S, setS] = useState(80)
  const phaseRef = useRef(phase)
  const actorRef = useRef<HTMLDivElement>(null)
  const bubbleRef = useRef<HTMLDivElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)
  const jojoRef = useRef<JojoHandle>(null)
  const pokeState = useRef(initialPoke())
  const player = useRef<ReturnType<typeof createStepPlayer> | null>(null)
  const sim = useRef({
    x: from.x + from.w / 2,
    y: from.y + from.h,
    vx: 0,
    vy: 0,
    size: from.w,
    facing: 1 as 1 | -1,
    key: '',
    flight0: 0,
    flightMs: 1,
    hop: 0,
    landedAt: -1,
    arrived: false,
    bubble: { w: 0, h: 0 }
  })
  const fine = useRef(false)

  const stop = phase.kind === 'stop' ? stops[phase.at] : null
  const side: 'left' | 'right' = phase.kind === 'stop' && phase.at % 2 === 1 ? 'right' : 'left'

  // the page knows a guide is on (seat Jojo steps out, stops get scroll room)
  useEffect(() => {
    const html = document.documentElement
    html.setAttribute('data-jojo-guide', '')
    fine.current = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    setS(window.innerWidth <= 640 ? 64 : 80)
    trackOnce('jojo_guide', { surface: 'jojo_dock', action: 'start', steps: stops.length })
    const p = createStepPlayer({
      load: loadJojoRuntime,
      apply: (s) => setOverride(s.emotion),
      setTimeout: (cb, ms) => window.setTimeout(cb, ms),
      clearTimeout: (id) => window.clearTimeout(id)
    })
    player.current = p
    return () => {
      html.removeAttribute('data-jojo-guide')
      p.dispose()
      player.current = null
    }
  }, [stops.length])

  // keep the loop's view of the phase current (every bubble)
  useEffect(() => {
    phaseRef.current = phase
  }, [phase])
  // each new place: scroll the stop into view, outline it, take off
  const place = placeKey(phase)
  useEffect(() => {
    setArrived(false)
    if (phase.kind === 'home') {
      if (phase.to === 'seat') window.scrollTo({ top: 0, behavior: still ? 'auto' : 'smooth' })
      return
    }
    if (phase.kind === 'end') {
      trackOnce('jojo_guide', { surface: 'jojo_dock', action: 'complete', steps: stops.length })
      return
    }
    const el = document.querySelector<HTMLElement>(`[data-jojo-stop="${stops[phase.at].id}"]`)
    if (!el) return
    el.setAttribute('data-jojo-stop-active', '')
    // leave exactly the room this stop's tallest bubble needs above the
    // section (beside Jojo when there is space, else above it), so neither
    // Jojo nor the section ends up under the bubble
    el.style.scrollMarginTop = `${roomAbove(el, stops[phase.at], phase.at % 2 === 1)}px`
    el.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' })
    return () => {
      el.removeAttribute('data-jojo-stop-active')
      el.style.removeProperty('scroll-margin-top')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [place, still, stops])

  /** px between the sticky header and a stop's top edge for this stop's bubbles */
  function roomAbove(el: HTMLElement, st: Stop, rightEnd: boolean) {
    const vw = window.innerWidth
    const vh = window.innerHeight
    const size = vw <= 640 ? 64 : 80
    const header = headerBottom()
    // the tallest of this stop's bubbles, laid out off screen at full length
    let h = 160
    let w = Math.min(340, vw - 24)
    const b = bubbleRef.current
    if (b) {
      const probe = b.cloneNode(true) as HTMLDivElement
      probe.style.cssText = 'position:fixed;left:-9999px;top:0;transform:none;visibility:hidden'
      probe.removeAttribute('data-shown')
      document.body.appendChild(probe)
      const line = probe.querySelector('.jojo-guide-line')
      h = 0
      for (const bb of st.bubbles) {
        if (line) line.textContent = bb.text
        h = Math.max(h, probe.offsetHeight)
      }
      w = probe.offsetWidth
      probe.remove()
    }
    const r = el.getBoundingClientRect()
    const x = rightEnd ? r.right - size * 0.55 : r.left + size * 0.55
    const beside = rightEnd ? x - size / 2 - 12 - w >= 12 : x + size / 2 + 12 + w <= vw - 12
    const need = beside ? header + h + 14 : header + h + 12 + size + 14
    return Math.min(need, vh * 0.62)
  }

  // the bubble types its line once Jojo has landed
  const bubble: Bubble | null = phase.kind === 'stop' ? (stop?.bubbles[phase.page] ?? null) : null
  const line =
    phase.kind === 'end' ? GUIDE_END[lang].line : phase.kind === 'stop' ? (bubble?.text ?? '') : ''
  const chars = Array.from(line)
  const lineRef = useRef<HTMLParagraphElement>(null)
  /** lights the first n characters; each fades in by CSS, so the typing reads smooth */
  const lightChars = (n: number) => {
    const spans = lineRef.current?.children
    if (!spans) return
    for (let i = 0; i < spans.length; i++) spans[i].classList.toggle('is-on', i < n)
  }
  useEffect(() => {
    setTypedAll(false)
    // a new bubble at the same stop: a little hop of emphasis
    if (sim.current.arrived) sim.current.landedAt = performance.now()
  }, [line])
  useEffect(() => {
    // typedAll also stops the clock when Next finishes the line early
    if (!arrived || phase.kind === 'home' || typedAll) return
    if (still) {
      lightChars(chars.length)
      setTypedAll(true)
      return
    }
    // on the frame clock, not a timer: no re-render per character, no uneven steps
    const ms = zh ? 36 : 18
    const t0 = performance.now()
    let raf = 0
    let lit = -1
    const tick = (now: number) => {
      const n = Math.min(chars.length, Math.floor((now - t0) / ms) + 1)
      if (n !== lit) {
        lit = n
        lightChars(n)
      }
      if (n >= chars.length) setTypedAll(true)
      else raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrived, line, typedAll])
  useEffect(() => {
    if (arrived && phase.kind !== 'home') nextRef.current?.focus({ preventScroll: true })
  }, [arrived, phase.kind])

  // the bubble's size, laid out at full length so typing never reflows it
  useLayoutEffect(() => {
    const b = bubbleRef.current
    if (b) sim.current.bubble = { w: b.offsetWidth, h: b.offsetHeight }
  }, [line, phase])

  // one loop drives Jojo and its bubble
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const header = headerBottom()
    const target = (ph: Phase, size: number): { x: number; y: number; size: number } => {
      const vw = window.innerWidth
      const vh = window.innerHeight
      if (ph.kind === 'home') {
        if (ph.to === 'seat') {
          const r = document.querySelector('[data-jojo-seat] svg')?.getBoundingClientRect()
          if (r) return { x: r.left + r.width / 2, y: r.bottom, size: r.width }
        }
        const box = vw <= 640 ? 44 : 48
        const edge = vw <= 640 ? 16 : 32
        const drawn = box * 0.78
        return { x: vw - edge - box / 2, y: vh - edge - (box - drawn) / 2 + 1, size: drawn }
      }
      const i = ph.kind === 'end' ? stops.length - 1 : ph.at
      const el = document.querySelector<HTMLElement>(`[data-jojo-stop="${stops[i].id}"]`)
      const r = el?.getBoundingClientRect()
      if (!r) return { x: vw / 2, y: vh / 2, size }
      const right = ph.kind === 'stop' && ph.at % 2 === 1
      const x = right ? r.right - size * 0.55 : r.left + size * 0.55
      return {
        x: clamp(x, size / 2 + 8, vw - size / 2 - 8),
        // stands on the section's top edge (kept on screen while it scrolls)
        y: clamp(r.top + size * 0.04, header + size + 8, vh - 12),
        size
      }
    }
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const dt = Math.min(0.033, (now - last) / 1000)
      last = now
      const s = sim.current
      const ph = phaseRef.current
      const size = window.innerWidth <= 640 ? 64 : 80
      const tg = target(ph, size)
      const key = placeKey(ph)
      if (key !== s.key) {
        // take off: a hop as high as the trip is long
        const dist = Math.hypot(tg.x - s.x, tg.y - s.y)
        s.key = key
        s.flight0 = now
        s.flightMs = still ? 1 : clamp(dist * 0.85, 420, 950)
        s.hop = still ? 0 : clamp(26 + dist * 0.12, 26, 90)
        s.arrived = false
      }
      if (still) {
        s.x = tg.x
        s.y = tg.y
        s.size = tg.size
        s.vx = s.vy = 0
      } else {
        // a slightly springy follow: it overshoots a touch and settles
        const k = 95
        const c = 2 * Math.sqrt(k) * 0.78
        s.vx += (k * (tg.x - s.x) - c * s.vx) * dt
        s.vy += (k * (tg.y - s.y) - c * s.vy) * dt
        s.x += s.vx * dt
        s.y += s.vy * dt
        s.size += (tg.size - s.size) * Math.min(1, dt * 7)
      }
      const u = clamp((now - s.flight0) / s.flightMs, 0, 1)
      const near = Math.hypot(tg.x - s.x, tg.y - s.y) < 6
      if (!s.arrived && u >= 1 && near) {
        s.arrived = true
        s.landedAt = now
        setArrived(true)
        if (ph.kind === 'home') {
          // the seat / corner Jojo shows up under this one, then this one goes
          document.documentElement.removeAttribute('data-jojo-guide')
          onHandoff()
          window.setTimeout(onDone, 260)
        }
      }
      if (Math.abs(s.vx) > 60) s.facing = s.vx < 0 ? -1 : 1
      else if (s.arrived && ph.kind === 'stop') s.facing = ph.at % 2 === 1 ? -1 : 1
      else if (s.arrived) s.facing = 1
      const air = still ? 0 : Math.sin(Math.PI * u)
      const bob = s.arrived && !still && ph.kind !== 'home' ? 2.5 * Math.sin(now / 480) : 0
      const hopLift = s.hop * air
      const lift = hopLift + bob
      const land = still ? 0 : pulse(now, s.landedAt, 160)
      const sy =
        1 + 0.1 * air - 0.16 * land + (s.arrived && !still ? 0.015 * Math.sin(now / 480) : 0)
      const sx = 1 - 0.06 * air + 0.12 * land
      const rot = still ? 0 : clamp(s.vx * 0.016, -14, 14)
      const scale = s.size / size
      const a = actorRef.current
      if (a) {
        a.style.width = `${size}px`
        a.style.height = `${size}px`
        a.style.transform = `translate3d(${(s.x - size / 2).toFixed(1)}px,${(s.y - lift - size).toFixed(1)}px,0) rotate(${rot.toFixed(2)}deg) scale(${(s.facing * sx * scale).toFixed(4)},${(sy * scale).toFixed(4)})`
      }
      // the bubble: beside Jojo, on the side the page has room for
      const b = bubbleRef.current
      if (b) {
        const vw = window.innerWidth
        const vh = window.innerHeight
        const { w, h } = s.bubble
        const half = (s.size / 2) * 1.02
        // the bubble follows hops but not the idle bob: a slow 2.5px float can only move
        // its text in whole-pixel steps (the compositor snaps it), which reads as stutter
        const top = s.y - hopLift - s.size
        const wantRight = !(ph.kind === 'stop' && ph.at % 2 === 1)
        let bx = wantRight ? s.x + half + 12 : s.x - half - 12 - w
        // sits on the section's top edge too, never over the section it introduces
        let by = clamp(s.y - hopLift - h - 4, header + 6, vh - h - 8)
        let place = wantRight ? 'right' : 'left'
        if (bx < 12 || bx + w > vw - 12) {
          // no room beside: above Jojo
          bx = clamp(s.x - w / 2, 12, vw - 12 - w)
          by = Math.max(header + 6, top - h - 12)
          place = 'above'
        }
        b.dataset.side = place
        b.style.transform = `translate3d(${bx.toFixed(1)}px,${by.toFixed(1)}px,0)`
        const tail =
          place === 'above'
            ? clamp(s.x - bx, 18, w - 18)
            : clamp(top + s.size * 0.45 - by, 16, h - 16)
        b.style.setProperty('--tail', `${tail.toFixed(1)}px`)
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [still, stops, onHandoff, onDone])

  // Next while a line is still typing finishes it first, so nothing is skipped unread
  const typing = useRef(false)
  typing.current = arrived && !typedAll
  const go = (d: 1 | -1) => {
    if (d === 1 && typing.current) {
      lightChars(chars.length)
      setTypedAll(true)
      return
    }
    step(d)
  }
  const step = (d: 1 | -1) =>
    setPhase((p) => {
      if (p.kind === 'stop') {
        const page = p.page + d
        if (page >= 0 && page < stops[p.at].bubbles.length) return { ...p, page }
        const n = p.at + d
        if (n < 0) return p
        return n >= stops.length ? { kind: 'end' } : { kind: 'stop', at: n, page: 0 }
      }
      if (p.kind === 'end' && d === -1) return { kind: 'stop', at: stops.length - 1, page: 0 }
      return p
    })
  const leave = (want: 'seat' | 'dock') =>
    setPhase((p) => {
      // the dock stays away while the seat is on screen: go to the seat then
      const seat = document.querySelector('[data-jojo-seat]')?.getBoundingClientRect()
      const to =
        want === 'dock' && seat && seat.bottom > 0 && seat.top < innerHeight ? 'seat' : want
      if (p.kind === 'home') return p
      if (p.kind === 'stop')
        trackOnce('jojo_guide', {
          surface: 'jojo_dock',
          action: 'exit',
          step: stops[p.at].id,
          steps_seen: p.at + 1
        })
      return { kind: 'home', to }
    })

  // keys: ← / → walk, Esc sends Jojo home
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isEditable(document.activeElement)) return
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
      if (e.key === 'Escape') leave('dock')
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onPoke = () => {
    const r = poke(pokeState.current, performance.now())
    pokeState.current = r.state
    if (r.ignored) return
    jojoRef.current?.poke()
    void player.current?.play(r.steps).then(() => setOverride(null))
    trackOnce('jojo_poke', { surface: 'jojo_guide' })
  }

  // faces: excited in the air, the stop's mood on landing, proud at the end
  const emotion: EmotionId =
    override ??
    (phase.kind === 'home'
      ? 'happy'
      : !arrived
        ? 'happy'
        : phase.kind === 'end'
          ? 'celebrate'
          : (bubble?.mood ?? stop?.mood ?? 'happy'))
  const status: StatusId =
    phase.kind === 'end' && arrived ? 'success' : arrived ? (bubble?.status ?? 'idle') : 'idle'
  const gaze: GazeInput =
    !arrived || phase.kind === 'home'
      ? 'auto'
      : !typedAll
        ? { x: side === 'left' ? 0.8 : -0.8, y: -0.1 }
        : fine.current
          ? 'pointer'
          : 'auto'
  const showBubble = arrived && phase.kind !== 'home'
  const last =
    phase.kind === 'stop' &&
    phase.at === stops.length - 1 &&
    phase.page === stops[phase.at].bubbles.length - 1

  return createPortal(
    <div className='jojo-guide-layer' aria-live='polite'>
      <div ref={actorRef} className='jojo-guide-actor'>
        <button
          type='button'
          className='jojo-guide-poke jojo-poke-target'
          aria-label={t.poke}
          onClick={onPoke}
          tabIndex={-1}
        >
          <LazyJojo
            ref={jojoRef}
            staticSvg={staticSvg}
            live
            emotion={emotion}
            status={status}
            gaze={gaze}
            motion={still ? 'static' : 'full'}
            size={S}
            framing='tight'
            decorative
            idPrefix='guide-'
          />
        </button>
      </div>
      <div
        ref={bubbleRef}
        className='jojo-guide-bubble'
        data-shown={showBubble ? '' : undefined}
        role='dialog'
        aria-label={t.meta}
      >
        <div className='jojo-guide-bubble-head'>
          <span className='jojo-guide-meta'>
            {phase.kind === 'stop' ? `${t.meta} · ${phase.at + 1} / ${stops.length}` : t.meta}
          </span>
          <button
            type='button'
            className='jojo-guide-x'
            aria-label={t.end}
            onClick={() => leave('dock')}
          >
            <svg viewBox='0 0 24 24' width='14' height='14' aria-hidden='true'>
              <path
                d='M18 6 6 18M6 6l12 12'
                stroke='currentColor'
                strokeWidth='2.4'
                strokeLinecap='round'
                fill='none'
              />
            </svg>
          </button>
        </div>
        {stop && (
          <p className='jojo-guide-title'>
            {stop.title}
            {phase.kind === 'stop' && stop.bubbles.length > 1 && (
              <span className='jojo-guide-pages' aria-hidden='true'>
                {stop.bubbles.map((_, i) => (
                  <i key={i} data-on={i === phase.page ? '' : undefined} />
                ))}
              </span>
            )}
          </p>
        )}
        <p key={line} ref={lineRef} className='jojo-guide-line'>
          {chars.map((c, i) => (
            <span key={i} className='jojo-guide-char'>
              {c}
            </span>
          ))}
        </p>
        <div className='jojo-guide-actions'>
          {phase.kind === 'end' ? (
            <>
              <a className='jojo-guide-link' href={GUIDE_END[lang].links.href}>
                {GUIDE_END[lang].links.label}
              </a>
              <button type='button' onClick={() => leave('seat')}>
                {t.top}
              </button>
              <button
                ref={nextRef}
                type='button'
                className='is-primary'
                onClick={() => leave('dock')}
              >
                {t.ok}
              </button>
            </>
          ) : (
            <>
              {bubble?.link && (
                <a
                  className='jojo-guide-link'
                  href={bubble.link.href}
                  {...(bubble.link.external
                    ? { target: '_blank', rel: 'noopener noreferrer' }
                    : {})}
                >
                  {bubble.link.label}
                </a>
              )}
              <button
                type='button'
                onClick={() => go(-1)}
                disabled={phase.kind === 'stop' && phase.at === 0 && phase.page === 0}
              >
                {t.prev}
              </button>
              <button ref={nextRef} type='button' className='is-primary' onClick={() => go(1)}>
                {last ? t.finish : t.next}
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

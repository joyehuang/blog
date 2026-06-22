/**
 * joye.log — Cinematic Entry Animation
 *
 * A typewriter opens a log file, the visitor watches Joye's real work
 * (12 posts / 2 repos / 4 roles) cascade in by date, the whole log
 * coalesces into a glow, and the overlay dissolves to reveal the real
 * landing page with a zoom-in.
 *
 * Pure DOM + CSS transitions — no WebGL, no canvas, no gsap. The whole
 * thing weighs ~5KB and runs at 60fps on any device.
 *
 * Timeline (~9s):
 *   0.0 ~ 1.6s   TYPEWRITER  `> cat joye.log` typed one char at a time
 *   1.6 ~ 5.0s   CASCADE     log lines reveal top-to-bottom, 110ms stagger
 *   5.0 ~ 5.8s   FOOTER      the "18 entries · 12 posts · ..." summary fades in
 *   5.8 ~ 7.4s   COALESCE    log scales down + blurs + lifts toward hero
 *   6.6 ~ 7.8s   REVEAL      overlay dissolves, hero zooms from scale(.96)+blur
 */

const SKIP =
  document.documentElement.classList.contains('intro-skip') ||
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

if (!SKIP) {
  void runIntro().catch((err) => {
    console.warn('[intro] aborted:', err)
    revealImmediately()
  })
}

async function runIntro() {
  // Defensive: lock scroll to top so the hero <img> ends up at the right
  // screen position. Inline script also does this, but we re-do it here in
  // case anything moved between then and now.
  window.scrollTo(0, 0)

  const overlay = document.getElementById('intro-overlay')
  const bootText = document.querySelector<HTMLSpanElement>('.intro-boot-text')
  const logLines = Array.from(
    document.querySelectorAll<HTMLElement>('.intro-log-line')
  )
  const footer = document.querySelector<HTMLElement>('.intro-log-footer')
  const logEl = document.getElementById('intro-log')

  if (!overlay || !bootText || !logLines.length || !logEl) {
    revealImmediately()
    return
  }

  // Mark the last 6 (Agent era) lines as emphasis so they get a slightly
  // brighter title color — a subtle visual "this is where I am now" beat.
  logLines.slice(-6).forEach((el) => el.setAttribute('data-emphasis', '1'))

  // === Phase 1: TYPEWRITER ===
  const typed = bootText.dataset.typewriter || 'cat joye.log'
  bootText.textContent = ''
  await typewriter(bootText, typed, 65)
  // small beat so the cursor blink reads as "ok, running the command"
  await sleep(280)

  // === Phase 2: CASCADE ===
  // Reveal lines from top to bottom with a 110ms stagger. Use 2-line chunks
  // for the first 4 so the eye gets going faster, then settle to 1-line.
  for (let i = 0; i < logLines.length; i++) {
    logLines[i].classList.add('intro-visible')
    // Faster stagger for the first cluster (early work), normal after.
    const stagger = i < 6 ? 90 : 130
    await sleep(stagger)
  }

  // === Phase 3: FOOTER ===
  await sleep(220)
  footer?.classList.add('intro-visible')
  await sleep(900)

  // === Phase 4: COALESCE ===
  // The whole log scales down + blurs + lifts up toward the hero avatar.
  // The hero <img> lives at the top of the page; collapsing the log
  // "into" that area creates the metaphor of "this body of work IS Joye".
  logEl.classList.add('coalescing')
  // also fade the scanline pattern
  overlay.classList.add('coalescing')

  // === Phase 5: REVEAL ===
  // After the log has shrunk enough that the eye loses it, drop the overlay
  // and zoom the hero back in. The two transitions overlap by ~600ms so
  // there's never a hard cut.
  await sleep(700)
  overlay.classList.add('intro-hidden')
  document.documentElement.classList.remove('intro-active')
  document.documentElement.classList.add('intro-hidden')

  // Drive the hero zoom-in directly via inline style + transition end.
  const header = document.getElementById('content-header')
  const content = document.getElementById('content')
  const targets = [header, content].filter(Boolean) as HTMLElement[]
  for (const el of targets) {
    el.style.transition =
      'opacity 1s cubic-bezier(0.2, 0.6, 0.2, 1), transform 1s cubic-bezier(0.2, 0.6, 0.2, 1), filter 1s cubic-bezier(0.2, 0.6, 0.2, 1)'
    el.style.opacity = '1'
    el.style.transform = 'scale(1)'
    el.style.filter = 'blur(0px)'
  }

  // Wait for reveal to settle, then tear down.
  await sleep(1200)
  overlay.classList.add('intro-done')
  // clearProps so future renders aren't affected by inline overrides.
  for (const el of targets) {
    el.style.transition = ''
    el.style.opacity = ''
    el.style.transform = ''
    el.style.filter = ''
  }
  document.documentElement.classList.remove('intro-hidden')

  // Notify the JoJo tour (and any other listeners) that the intro is done.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).__introDone = true
  window.dispatchEvent(new CustomEvent('intro:complete'))
}

/** Type a string into an element one character at a time. */
function typewriter(el: HTMLElement, text: string, msPerChar: number): Promise<void> {
  return new Promise((resolve) => {
    let i = 0
    const tick = () => {
      el.textContent = text.slice(0, i + 1)
      i++
      if (i >= text.length) {
        resolve()
      } else {
        // Slight randomization so it feels like typing, not metronome.
        const jitter = (Math.random() - 0.5) * 30
        setTimeout(tick, Math.max(20, msPerChar + jitter))
      }
    }
    setTimeout(tick, msPerChar)
  })
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/** Safety net — if anything fails, just reveal the page. */
function revealImmediately() {
  const overlay = document.getElementById('intro-overlay')
  const doc = document.documentElement
  doc.classList.remove('intro-active')
  doc.classList.remove('intro-hidden')
  doc.classList.add('intro-skip')
  if (overlay) overlay.classList.add('intro-done')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).__introDone = true
  window.dispatchEvent(new CustomEvent('intro:complete'))
}

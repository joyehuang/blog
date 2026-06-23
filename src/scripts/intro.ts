/**
 * joye.log — Cinematic Entry (holographic deck edition)
 *
 * A GSAP-orchestrated timeline (~9s):
 *
 *   CRT power-on  →  typewriter boot  →  3D materialize from depth
 *      →  hold (parallax + flicker)  →  particle shatter to landing sections
 *
 * Cards fly in from deep Z with rotation + bloom, assemble into a tilted
 * holographic deck, then on handoff each card bursts into particles that
 * streak toward the matching landing section (work→Experience,
 * repo→Open Source, blog→Blog) as the page materializes beneath.
 */

import gsap from 'gsap'

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
  window.scrollTo(0, 0)

  const overlay = document.getElementById('intro-overlay')
  const stage = document.getElementById('intro-stage')
  const grid = document.getElementById('intro-grid')
  const bootLines = Array.from(
    document.querySelectorAll<HTMLElement>('.intro-boot-text[data-typewriter]')
  )
  const cards = Array.from(document.querySelectorAll<HTMLElement>('.intro-card'))

  if (!overlay || !stage || !grid || !bootLines.length || !cards.length) {
    revealImmediately()
    return
  }

  // Pre-hide landing sections so they don't flash when intro-active lifts.
  const allSections = Array.from(
    document.querySelectorAll<HTMLElement>('main #content section')
  )
  gsap.set(allSections, { opacity: 0, y: 16 })

  // === Phase 1: CRT power-on ===
  await crtPowerOn()
  await sleep(120)

  // === Phase 2: typewriter boot ===
  for (let i = 0; i < bootLines.length; i++) {
    const line = bootLines[i]
    const text = line.dataset.typewriter || ''
    line.textContent = ''
    const ms = i === 1 ? 30 : 56
    await typewriter(line, text, ms)
    await sleep(i === bootLines.length - 1 ? 260 : 150)
  }
  await sleep(180)

  // === Phase 3: 3D materialize from depth ===
  grid.classList.add('grid-active')
  await new Promise<void>((resolve) => {
    const tl = gsap.timeline({ onComplete: resolve })
    // Deck tilts from a steep angle down to a gentle resting tilt.
    tl.fromTo(
      grid,
      { rotationX: 24, rotationY: -8 },
      { rotationX: 7, rotationY: 0, duration: 1.4, ease: 'power3.out' },
      0
    )
    // Cards fly in from deep Z, rotated + blurred, and slam into place.
    tl.fromTo(
      cards,
      {
        opacity: 0,
        z: -780,
        y: 60,
        rotationX: 34,
        rotationY: 30,
        rotationZ: () => gsap.utils.random(-10, 10),
        scale: 0.58,
        filter: 'blur(14px)'
      },
      {
        opacity: 1,
        z: 0,
        y: 0,
        rotationX: 0,
        rotationY: 0,
        rotationZ: 0,
        scale: 1,
        filter: 'blur(0px)',
        duration: 1.05,
        ease: 'expo.out',
        stagger: { each: 0.085, from: 'start' }
      },
      0
    )
  })

  // === Phase 4: hold — parallax + holographic flicker ===
  grid.classList.add('grid-settled')
  showFooter()
  const stopParallax = startParallax(grid)
  await sleep(1700)
  stopParallax()

  // === Phase 5: shatter into particles → reveal the page ===
  await shatterToPage(cards)

  // === Cleanup ===
  overlay.classList.add('intro-done')
  document.documentElement.classList.remove('intro-hidden')
  clearParticles()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).__introDone = true
  window.dispatchEvent(new CustomEvent('intro:complete'))
}

/** Classic CRT power-on: a bright horizontal line snaps to full screen. */
function crtPowerOn(): Promise<void> {
  const el = document.getElementById('intro-crt-power')
  if (!el) return Promise.resolve()
  return new Promise((resolve) => {
    const tl = gsap.timeline({ onComplete: resolve })
    tl.set(el, { opacity: 0, scaleY: 0.004 })
    tl.to(el, { opacity: 1, scaleY: 0.05, duration: 0.07, ease: 'power2.in' })
    tl.to(el, { scaleY: 1, duration: 0.34, ease: 'power3.out' })
    tl.to(el, { opacity: 0, duration: 0.28, ease: 'power2.out' })
  })
}

/** Mouse parallax — the deck nudges toward the cursor in 3D. */
function startParallax(grid: HTMLElement): () => void {
  const rotY = gsap.quickTo(grid, 'rotationY', { duration: 0.9, ease: 'power3' })
  const rotX = gsap.quickTo(grid, 'rotationX', { duration: 0.9, ease: 'power3' })
  const onMove = (e: MouseEvent) => {
    const px = (e.clientX / window.innerWidth - 0.5) * 2
    const py = (e.clientY / window.innerHeight - 0.5) * 2
    rotY(px * 6)
    rotX(7 - py * 4)
  }
  window.addEventListener('mousemove', onMove)
  return () => window.removeEventListener('mousemove', onMove)
}

/** Shatter every card into particles that streak to the matching landing
 *  section, while the landing sections materialize beneath the dissolving
 *  overlay. */
function shatterToPage(cards: HTMLElement[]): Promise<void> {
  const layer = document.getElementById('intro-particles')
  const KIND_TO_SECTION: Record<string, string> = {
    work: 'Experience',
    repo: 'Open Source',
    blog: 'Blog'
  }
  const ACCENT: Record<string, string> = {
    work: '205 80% 68%',
    repo: '168 70% 60%',
    blog: '38 90% 64%'
  }

  // Resolve each kind's target landing-section center (viewport coords).
  const targets: Record<string, { x: number; y: number }> = {}
  for (const kind of ['work', 'repo', 'blog']) {
    const sec = findLandingSection(KIND_TO_SECTION[kind])
    if (sec) {
      const r = sec.getBoundingClientRect()
      targets[kind] = { x: r.left + r.width / 2, y: r.top + r.height / 2 }
    }
  }
  const fallback = { x: window.innerWidth / 2, y: window.innerHeight / 2 }

  const tl = gsap.timeline()
  const PER_CARD = 28

  cards.forEach((card, ci) => {
    const kind = card.dataset.kind || 'work'
    const rect = card.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const tgt = targets[kind] || fallback
    const accent = ACCENT[kind] || '195 60% 65%'
    const base = ci * 0.022

    // Collapse the card itself.
    tl.to(
      card,
      {
        opacity: 0,
        scale: 0.88,
        filter: 'blur(8px)',
        duration: 0.4,
        ease: 'power2.in'
      },
      base
    )

    if (!layer) return
    // Emit particles.
    for (let p = 0; p < PER_CARD; p++) {
      const dot = document.createElement('div')
      dot.className = 'intro-particle'
      dot.style.setProperty('--p-accent', accent)
      const size = 2 + Math.random() * 3
      dot.style.width = `${size}px`
      dot.style.height = `${size}px`
      layer.appendChild(dot)

      // Burst outward, then curve toward the section.
      const ang = Math.random() * Math.PI * 2
      const burst = 22 + Math.random() * 80
      const sx = cx + Math.cos(ang) * burst
      const sy = cy + Math.sin(ang) * burst
      const tx = tgt.x + (Math.random() - 0.5) * rect.width * 0.85
      const ty = tgt.y + (Math.random() - 0.5) * rect.height * 0.85

      gsap.set(dot, { x: cx, y: cy, opacity: 0, scale: 0.4 })
      tl.to(
        dot,
        {
          keyframes: [
            { x: sx, y: sy, opacity: 1, scale: 1, duration: 0.18, ease: 'power2.out' },
            { x: tx, y: ty, opacity: 0, scale: 0.25, duration: 0.95, ease: 'power1.in' }
          ],
          duration: 1.13
        },
        base + p * 0.003
      )
    }
  })

  // Landing sections materialize beneath as particles arrive.
  const allSections = Array.from(
    document.querySelectorAll<HTMLElement>('main #content section')
  )
  allSections.forEach((s, i) => {
    tl.to(
      s,
      { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' },
      0.25 + i * 0.05
    )
  })
  revealHero()

  // Overlay dissolves while the page emerges through it.
  document.getElementById('intro-overlay')?.classList.add('intro-hidden')

  return new Promise((resolve) => {
    tl.eventCallback('onComplete', () => resolve())
  })
}

function clearParticles() {
  const layer = document.getElementById('intro-particles')
  if (layer) layer.innerHTML = ''
}

/** Fade + stagger the footer status line. */
function showFooter(): void {
  const footer = document.querySelector<HTMLElement>('.intro-log-footer')
  if (!footer) return
  gsap.to(footer, { opacity: 0.85, duration: 0.5, ease: 'power2.out' })
  const chars = Array.from(footer.querySelectorAll<HTMLElement>('.footer-char'))
  gsap.set(chars, { opacity: 0, y: 8, filter: 'blur(2px)' })
  gsap.to(chars, {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    duration: 0.34,
    ease: 'power2.out',
    stagger: { each: 0.012 }
  })
}

/** Reveal the hero (#content-header + #content container). */
function revealHero(): void {
  const header = document.getElementById('content-header')
  const content = document.getElementById('content')
  for (const el of [header, content]) {
    if (!el) continue
    gsap.to(el, {
      opacity: 1,
      scale: 1,
      filter: 'blur(0px)',
      duration: 1,
      ease: 'power2.out'
    })
  }
}

/** Find the first <section> in <main> whose <h2> text matches the label. */
function findLandingSection(label: string): HTMLElement | null {
  const headings = document.querySelectorAll<HTMLElement>('main section h2')
  for (const h of headings) {
    if (h.textContent?.trim() === label) {
      return (h.closest('section') as HTMLElement | null) ?? null
    }
  }
  return null
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
        const jitter = (Math.random() - 0.5) * 24
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

  // Clear any inline transforms/styles so CSS takes over.
  const clear = document.querySelectorAll<HTMLElement>(
    'main #content section, #content, #content-header'
  )
  clear.forEach((s) => {
    s.style.opacity = ''
    s.style.transform = ''
    s.style.filter = ''
    s.style.transition = ''
  })
  if (typeof gsap !== 'undefined') {
    gsap.set?.('main #content section', { clearProps: 'all' })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).__introDone = true
  window.dispatchEvent(new CustomEvent('intro:complete'))
}

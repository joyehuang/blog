/**
 * joye.log — Cinematic Entry Animation (card-grid edition)
 *
 * Timeline (~11s):
 *
 *   0.0 ~ 3.1s   TYPEWRITER  boot sequence — `ssh joye@mind` / status /
 *                `open portfolio`
 *   3.1 ~ 4.7s   GRID POP-IN  portfolio cards rise one-by-one in a diagonal
 *                            wave (experiences → repos → writing)
 *   4.7 ~ 6.2s   HOLD        the deck settles; footer stamps in
 *   6.2 ~ 8.0s   DISSOLVE    cards lift away in reverse while the overlay
 *                            opens up and the landing sections stagger in
 *                            beneath, emerging through the dissipating veil
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
  window.scrollTo(0, 0)

  const overlay = document.getElementById('intro-overlay')
  const bootLines = Array.from(
    document.querySelectorAll<HTMLElement>('.intro-boot-text[data-typewriter]')
  )
  const grid = document.getElementById('intro-grid')
  const cards = Array.from(document.querySelectorAll<HTMLElement>('.intro-card'))
  const footer = document.querySelector<HTMLElement>('.intro-log-footer')

  if (!overlay || !bootLines.length || !grid || !cards.length) {
    revealImmediately()
    return
  }

  // === Phase 1: TYPEWRITER (boot sequence) ===
  for (let i = 0; i < bootLines.length; i++) {
    const line = bootLines[i]
    const text = line.dataset.typewriter || ''
    line.textContent = ''
    // Faster per-char on the longer output line so the boot doesn't drag.
    const ms = i === 1 ? 30 : 58
    await typewriter(line, text, ms)
    await sleep(i === bootLines.length - 1 ? 300 : 160)
  }
  await sleep(280)

  // === Phase 2: GRID POP-IN ===
  // Pre-hide every landing section so lifting `intro-active` doesn't flash
  // them all at once — they'll stagger back in during the dissolve.
  const allSections = Array.from(
    document.querySelectorAll<HTMLElement>('main #content section')
  )
  for (const s of allSections) {
    s.style.opacity = '0'
    s.style.transform = 'translateY(16px)'
    s.style.transition =
      'opacity 0.9s cubic-bezier(0.2, 0.6, 0.2, 1), transform 0.9s cubic-bezier(0.2, 0.6, 0.2, 1)'
  }

  wireCardClicks(cards)

  // Kick off the pop-in wave. The last card finishes at:
  //   (its transition-delay) + (its transform duration).
  grid.classList.add('grid-active')
  const lastIdx = cards.length - 1
  const popInDone = 75 * lastIdx + 700 + 120
  await sleep(popInDone)

  // === Phase 3: HOLD — let the deck breathe ===
  footer?.classList.add('intro-visible')
  await sleep(1500)

  // === Phase 4: DISSOLVE + REVEAL (all in parallel) ===
  // Cards lift away (reverse stagger), overlay opens up, and the landing
  // sections stagger in beneath — the page emerges through the veil.
  document.documentElement.classList.remove('intro-active')
  grid.classList.add('grid-dissolving')

  revealHero()

  // Schedule the landing sections to stagger in as the overlay thins.
  setTimeout(() => {
    allSections.forEach((s, i) => {
      setTimeout(() => {
        s.style.opacity = '1'
        s.style.transform = 'translateY(0)'
      }, i * 55)
    })
  }, 280)

  // Overlay dissolves on top of the emerging page.
  setTimeout(() => {
    overlay.classList.add('intro-hidden')
  }, 520)

  // Let the dissolve + reveal finish, then tear down.
  await sleep(1500)
  overlay.classList.add('intro-done')
  document.documentElement.classList.remove('intro-hidden')

  unwireCardClicks(cards)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).__introDone = true
  window.dispatchEvent(new CustomEvent('intro:complete'))
}

/** Make work/repo cards click-through-able to their product / repo URL. */
function wireCardClicks(cards: HTMLElement[]): void {
  for (const card of cards) {
    const url = card.dataset.url
    if (!url) continue
    card.addEventListener('click', onCardClick)
  }
}
function unwireCardClicks(cards: HTMLElement[]): void {
  for (const card of cards) {
    card.removeEventListener('click', onCardClick)
  }
}
function onCardClick(e: MouseEvent): void {
  const card = e.currentTarget as HTMLElement
  const url = card.dataset.url
  if (url) window.open(url, '_blank', 'noopener,noreferrer')
}

/** Reveal the hero (#content-header + #content container). */
function revealHero(): void {
  const header = document.getElementById('content-header')
  const content = document.getElementById('content')
  for (const el of [header, content]) {
    if (!el) continue
    el.style.transition =
      'opacity 1s cubic-bezier(0.2, 0.6, 0.2, 1), transform 1s cubic-bezier(0.2, 0.6, 0.2, 1), filter 1s cubic-bezier(0.2, 0.6, 0.2, 1)'
    el.style.opacity = '1'
    el.style.transform = 'scale(1)'
    el.style.filter = 'blur(0px)'
  }
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
        const jitter = (Math.random() - 0.5) * 26
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

  // If runIntro aborted after hiding landing sections, clear those inline
  // styles so CSS takes over and nothing stays stuck at opacity 0.
  document
    .querySelectorAll<HTMLElement>('main #content section')
    .forEach((s) => {
      s.style.opacity = ''
      s.style.transform = ''
      s.style.transition = ''
    })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).__introDone = true
  window.dispatchEvent(new CustomEvent('intro:complete'))
}

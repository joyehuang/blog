/**
 * Intro — "The Generation"
 *
 * The site streams its own intro the way an LLM would generate it.
 *
 *   wrap fades in  →  bio streams token-by-token (entities light up)
 *     →  status: done  →  text lifts away, landing page rises beneath
 *
 * ~7s total. GSAP handles the wrap-in and the handoff; the streaming itself
 * is a plain async loop so each character can carry its own punctuation
 * pause and "thinking" hesitation — reads like real token sampling.
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
  const wrap = document.getElementById('intro-gen-wrap')
  const gen = document.getElementById('intro-gen')
  const status = document.getElementById('intro-gen-status')
  const statusText = status?.querySelector<HTMLElement>('.status-text')
  const foot = document.getElementById('intro-gen-foot')

  if (!overlay || !wrap || !gen) {
    revealImmediately()
    return
  }

  // Pre-hide landing sections so they don't flash when intro-active lifts.
  const allSections = Array.from(
    document.querySelectorAll<HTMLElement>('main #content section')
  )
  gsap.set(allSections, { opacity: 0, y: 16 })

  // === 1. Wrap fades in ===
  await new Promise<void>((resolve) => {
    gsap.fromTo(
      wrap,
      { opacity: 0, y: 14, filter: 'blur(6px)' },
      {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        duration: 0.7,
        ease: 'power2.out',
        onComplete: resolve
      }
    )
  })
  await sleep(300)

  // === 2. Stream the bio ===
  const elapsed = await streamGeneration(gen)

  // === 3. Status: done ===
  status?.classList.add('gen-done')
  if (statusText) statusText.textContent = `done · ${elapsed.toFixed(1)}s`
  if (foot) {
    gsap.to(foot, { opacity: 0.75, duration: 0.6, ease: 'power2.out' })
  }
  await sleep(1000)

  // === 4. Handoff — text lifts away, page rises beneath ===
  document.documentElement.classList.remove('intro-active')
  await new Promise<void>((resolve) => {
    const tl = gsap.timeline({ onComplete: resolve })
    tl.to(
      wrap,
      { y: -56, opacity: 0, filter: 'blur(14px)', duration: 0.9, ease: 'power2.in' },
      0
    )
    allSections.forEach((s, i) => {
      tl.to(
        s,
        { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' },
        0.12 + i * 0.06
      )
    })
    tl.add(() => revealHero(), 0)
    tl.add(() => overlay.classList.add('intro-hidden'), 0.18)
  })

  overlay.classList.add('intro-done')
  document.documentElement.classList.remove('intro-hidden')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).__introDone = true
  window.dispatchEvent(new CustomEvent('intro:complete'))
}

/**
 * Stream `#intro-gen` char-by-char. The full bio is already in the DOM (SSR);
 * we split every text node into `.gen-char` spans (hidden by CSS), then emit
 * them in small "token" batches with punctuation-aware pacing. Each `.gen-entity`
 * lights up the moment its final character is emitted.
 *
 * Returns the elapsed stream time in seconds (shown in the status line).
 */
function streamGeneration(gen: HTMLElement): Promise<number> {
  const start = performance.now()

  // Split text nodes into per-char spans.
  const walker = document.createTreeWalker(gen, NodeFilter.SHOW_TEXT)
  const textNodes: Text[] = []
  let node: Node | null
  while ((node = walker.nextNode())) textNodes.push(node as Text)
  for (const t of textNodes) {
    const text = t.textContent ?? ''
    const frag = document.createDocumentFragment()
    for (const ch of text) {
      const span = document.createElement('span')
      span.className = 'gen-char'
      span.textContent = ch === ' ' ? '\u00A0' : ch
      frag.appendChild(span)
    }
    t.replaceWith(frag)
  }

  const chars = Array.from(gen.querySelectorAll<HTMLElement>('.gen-char'))
  // Map each entity to the index of its last char so we know when to light it.
  const entityLast = new Map<HTMLElement, number>()
  chars.forEach((c, i) => {
    const ent = c.closest<HTMLElement>('.gen-entity')
    if (ent) entityLast.set(ent, i)
  })

  const cursor = document.createElement('span')
  cursor.className = 'gen-cursor'
  gen.appendChild(cursor)

  return new Promise<number>((resolve) => {
    let i = 0
    const tick = async () => {
      if (i >= chars.length) {
        resolve((performance.now() - start) / 1000)
        return
      }
      // Emit a small "token" (1–3 chars) per tick.
      const tokLen = 1 + Math.floor(Math.random() * 3)
      for (let k = 0; k < tokLen && i < chars.length; k++, i++) {
        const c = chars[i]
        c.after(cursor)
        c.style.opacity = '1'
        c.style.filter = 'blur(0px)'
        const ent = c.closest<HTMLElement>('.gen-entity')
        if (ent && entityLast.get(ent) === i) {
          ent.classList.add('entity-active')
        }
      }
      // Punctuation-aware pacing — reads like real sampling.
      const last = chars[i - 1]?.textContent || ''
      let delay = 26 + Math.random() * 24
      if (last === '.') delay += 240
      else if (last === ',') delay += 90
      if (Math.random() < 0.05) delay += 130 // occasional "thinking" pause
      await sleep(delay)
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
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

  document
    .querySelectorAll<HTMLElement>('main #content section, #content, #content-header')
    .forEach((s) => {
      s.style.opacity = ''
      s.style.transform = ''
      s.style.filter = ''
      s.style.transition = ''
    })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).__introDone = true
  window.dispatchEvent(new CustomEvent('intro:complete'))
}

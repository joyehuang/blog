/**
 * joye.log — Cinematic Entry Animation (grouped + morph)
 *
 * Tells Joye's story by grouping real shipped work into the same domains
 * the landing page already shows (Blog / Open Source / Experience), then
 * morphing each group into the corresponding landing-page section so the
 * entry animation and the page itself read as one continuous experience.
 *
 * Timeline (~10s):
 *   0.0 ~ 1.6s   TYPEWRITER  `> cat joye.log` typed one char at a time
 *   1.6 ~ 6.0s   CASCADE     groups reveal top → bottom; inside each group,
 *                            the header slides in, then entries cascade with
 *                            per-char title stagger. Weight drives brightness.
 *   6.0 ~ 6.8s   FOOTER      the "18 entries · 12 posts · ..." summary
 *   6.8 ~ 8.6s   MORPH       each group flies to the landing-page <section>
 *                            with the same title (Blog / Open Source /
 *                            Experience) and dissolves into it
 *   7.6 ~ 9.0s   REVEAL      overlay fades, hero zooms in, residual sections
 *                            (Talks / Notes / Skills / Education) stagger in
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
  const groups = Array.from(
    document.querySelectorAll<HTMLElement>('.intro-log-group')
  )
  const footer = document.querySelector<HTMLElement>('.intro-log-footer')
  const logEl = document.getElementById('intro-log')

  if (!overlay || !bootText || !groups.length || !logEl) {
    revealImmediately()
    return
  }

  // === Phase 1: TYPEWRITER ===
  const typed = bootText.dataset.typewriter || 'cat joye.log'
  bootText.textContent = ''
  await typewriter(bootText, typed, 65)
  await sleep(280)

  // === Phase 2: CASCADE (group by group, with intra-group line stagger) ===
  for (const group of groups) {
    group.classList.add('intro-group-visible')
    const lines = Array.from(group.querySelectorAll<HTMLElement>('.intro-log-line'))
    // Stagger inside the group — weight 2 (newest) reveals first, weight 0 last,
    // so the eye lands on the marquee work before the history.
    lines.sort(
      (a, b) =>
        Number(b.dataset.weight || 1) - Number(a.dataset.weight || 1)
    )
    for (let i = 0; i < lines.length; i++) {
      lines[i].classList.add('intro-visible')
      // Faster stagger for short groups (repos / experience).
      const stagger = lines.length <= 4 ? 110 : 95
      await sleep(stagger)
    }
    // small breath between groups
    await sleep(180)
  }

  // === Phase 3: FOOTER ===
  await sleep(220)
  footer?.classList.add('intro-visible')
  await sleep(900)

  // === Phase 4: MORPH ===
  // For each group, find the landing-page <section> whose <h2> matches the
  // group label, then transform the group onto the section's rectangle.
  // The section itself fades in in parallel — so the eye reads it as
  // "the log line became the section", not as two separate things.

  // Pre-hide every landing section so removing .intro-active (which would
  // otherwise unhide #content wholesale) doesn't flash fully-visible
  // sections before the morph / reveal choreography runs.
  const allSections = Array.from(
    document.querySelectorAll<HTMLElement>('main #content section')
  )
  for (const s of allSections) {
    s.style.opacity = '0'
    s.style.transform = 'translateY(16px)'
    s.style.transition =
      'opacity 0.9s cubic-bezier(0.2, 0.6, 0.2, 1), transform 0.9s cubic-bezier(0.2, 0.6, 0.2, 1)'
  }
  // Now safe to drop the lock — sections stay hidden via inline style above.
  document.documentElement.classList.remove('intro-active')

  const morphs: Array<Promise<void>> = []
  for (const group of groups) {
    const label = group.dataset.morphLabel
    if (!label) continue
    const section = findLandingSection(label)
    if (!section) continue
    morphs.push(morphGroupIntoSection(group, section))
  }
  // Reveal hero (header) right as the morphs start — it's the visual anchor.
  revealHero()
  await Promise.all(morphs)

  // === Phase 5: REVEAL remaining sections ===
  // The non-morphed sections (Talks / Notes / Education / Skills / SiteStats)
  // never had a corresponding log group; stagger them in now, top → bottom.
  await revealRemainingSections(allSections)

  // Drop the overlay.
  overlay.classList.add('intro-hidden')
  await sleep(500)
  overlay.classList.add('intro-done')
  document.documentElement.classList.remove('intro-hidden')

  // Notify the JoJo tour (and any other listeners) that the intro is done.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).__introDone = true
  window.dispatchEvent(new CustomEvent('intro:complete'))
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

/** Morph a log group onto a landing section. Returns when the morph completes. */
function morphGroupIntoSection(
  group: HTMLElement,
  section: HTMLElement
): Promise<void> {
  return new Promise((resolve) => {
    const groupRect = group.getBoundingClientRect()
    const sectionRect = section.getBoundingClientRect()

    // FLIP-style transform: translate + scale the group onto the section rect.
    const dx = sectionRect.left - groupRect.left
    const dy = sectionRect.top - groupRect.top
    const sx = sectionRect.width / Math.max(1, groupRect.width)
    const sy = sectionRect.height / Math.max(1, groupRect.height)

    group.style.transformOrigin = 'top left'
    group.style.transition =
      'transform 1.1s cubic-bezier(0.55, 0, 0.2, 1), opacity 0.9s cubic-bezier(0.4, 0, 0.2, 1) 0.5s, filter 1.1s cubic-bezier(0.55, 0, 0.2, 1)'

    // rAF so the transition picks up the change.
    requestAnimationFrame(() => {
      group.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`
      group.style.opacity = '0'
      group.style.filter = 'blur(6px)'
      // Fade the section in partway through the morph so the eye reads it
      // as a handoff, not two parallel motions.
      setTimeout(() => {
        section.style.opacity = '1'
        section.style.transform = 'translateY(0)'
      }, 350)
    })

    setTimeout(resolve, 1200)
  })
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

/** Stagger-reveal any sections that didn't participate in the morph. */
async function revealRemainingSections(allSections: HTMLElement[]): Promise<void> {
  const morphedLabels = new Set(
    Array.from(document.querySelectorAll<HTMLElement>('.intro-log-group')).map(
      (g) => g.dataset.morphLabel
    )
  )
  const remaining = allSections.filter((s) => {
    const h = s.querySelector('h2')
    return h && !morphedLabels.has(h.textContent?.trim() || '')
  })

  // Reveal them with a soft stagger.
  for (const section of remaining) {
    section.style.opacity = '1'
    section.style.transform = 'translateY(0)'
    await sleep(90)
  }
  // Let the last one finish.
  await sleep(500)
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

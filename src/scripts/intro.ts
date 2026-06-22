/**
 * joye.log — Cinematic Entry Animation
 *
 * Timeline (~14s — extended so the new Experience showcase and the
 * particle-dispersion morph both have room to breathe):
 *
 *   0.0 ~ 1.5s   TYPEWRITER  `> cat joye.log`
 *   1.5 ~ 2.7s   EXPERIENCE CASCADE  the 4 work entries appear as a log
 *   2.7 ~ 8.5s   EXPERIENCE SHOWCASE  full-viewport terminal "company tour"
 *                                       — 4 homepage screenshots in a CRT
 *                                       frame, dolly-in on each, ~1.4s each
 *   8.5 ~ 10.7s  BLOG + OPENSOURCE CASCADE  the remaining groups stream in
 *   10.7 ~ 11.4s FOOTER  the summary line
 *   11.4 ~ 14.0s MORPH  Blog + Open-Source groups particle-disperse into
 *                       their landing sections; Experience section fades
 *                       in directly (it was already showcased)
 *   13.2 ~ 14.0s REVEAL REMAINING  About / Notes / Talks / Edu / Skills
 *                                  stagger in
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
  const bootText = document.querySelector<HTMLSpanElement>('.intro-boot-text')
  const groups = Array.from(
    document.querySelectorAll<HTMLElement>('.intro-log-group')
  )
  const footer = document.querySelector<HTMLElement>('.intro-log-footer')
  const showcase = document.getElementById('intro-showcase')

  if (!overlay || !bootText || !groups.length) {
    revealImmediately()
    return
  }

  const experienceGroup = groups.find(
    (g) => g.dataset.morphLabel === 'Experience'
  )
  const otherGroups = groups.filter((g) => g !== experienceGroup)

  // === Phase 1: TYPEWRITER ===
  const typed = bootText.dataset.typewriter || 'cat joye.log'
  bootText.textContent = ''
  await typewriter(bootText, typed, 65)
  await sleep(280)

  // === Phase 2: EXPERIENCE CASCADE (first — sets up the showcase) ===
  if (experienceGroup) {
    await cascadeGroup(experienceGroup)
    await sleep(380)
  }

  // === Phase 3: EXPERIENCE SHOWCASE ===
  // The Experience log collapses away and a full-viewport terminal "tour"
  // takes over, showing each company's homepage screenshot in a CRT frame.
  if (showcase && experienceGroup) {
    // Slide the Experience log group away (it'll be replaced visually).
    experienceGroup.style.transition =
      'opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1), transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), filter 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
    experienceGroup.style.opacity = '0'
    experienceGroup.style.transform = 'translateY(-20px) scale(0.94)'
    experienceGroup.style.filter = 'blur(6px)'

    await sleep(220)
    await runShowcase(showcase)

    // After the showcase, slide it away — the Experience landing section
    // will fade in to replace it during Phase 5 morph.
    showcase.classList.remove('showcase-active')
    await sleep(380)
  }

  // === Phase 4: BLOG + OPENSOURCE CASCADE ===
  for (const g of otherGroups) {
    await cascadeGroup(g)
    await sleep(180)
  }
  await sleep(200)
  footer?.classList.add('intro-visible')
  await sleep(700)

  // === Phase 5: MORPH ===
  // Pre-hide every landing section so removing .intro-active doesn't flash
  // them all at once.
  const allSections = Array.from(
    document.querySelectorAll<HTMLElement>('main #content section')
  )
  for (const s of allSections) {
    s.style.opacity = '0'
    s.style.transform = 'translateY(16px)'
    s.style.transition =
      'opacity 0.9s cubic-bezier(0.2, 0.6, 0.2, 1), transform 0.9s cubic-bezier(0.2, 0.6, 0.2, 1)'
  }
  document.documentElement.classList.remove('intro-active')

  // Morph Blog + Open Source groups (particle dispersion).
  const morphs: Array<Promise<void>> = []
  for (const g of otherGroups) {
    const label = g.dataset.morphLabel
    if (!label) continue
    const section = findLandingSection(label)
    if (!section) continue
    morphs.push(morphGroupIntoSection(g, section))
  }

  // Experience section fades in directly — it was just showcased so a
  // second particle morph would be redundant.
  const expSection = findLandingSection('Experience')
  if (expSection) {
    setTimeout(() => {
      expSection.style.opacity = '1'
      expSection.style.transform = 'translateY(0)'
    }, 350)
  }

  revealHero()
  await Promise.all(morphs)

  // === Phase 6: REVEAL REMAINING SECTIONS ===
  await revealRemainingSections(allSections)

  overlay.classList.add('intro-hidden')
  await sleep(500)
  overlay.classList.add('intro-done')
  document.documentElement.classList.remove('intro-hidden')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).__introDone = true
  window.dispatchEvent(new CustomEvent('intro:complete'))
}

/** Cascade a single group's entries — header first, then lines stagger
 *  in weight-descending order so the marquee work shows first. */
async function cascadeGroup(group: HTMLElement): Promise<void> {
  group.classList.add('intro-group-visible')
  const lines = Array.from(
    group.querySelectorAll<HTMLElement>('.intro-log-line')
  )
  lines.sort(
    (a, b) => Number(b.dataset.weight || 1) - Number(a.dataset.weight || 1)
  )
  for (const line of lines) {
    line.classList.add('intro-visible')
    const stagger = lines.length <= 4 ? 110 : 95
    await sleep(stagger)
  }
}

/** Run the Experience showcase — cycle through each panel in turn. */
async function runShowcase(showcase: HTMLElement): Promise<void> {
  const panels = Array.from(
    showcase.querySelectorAll<HTMLElement>('.showcase-panel')
  )
  const counterCurrent = showcase.querySelector<HTMLElement>(
    '.showcase-counter-current'
  )
  if (!panels.length) return

  // Format: "01" .. "04"
  const fmt = (n: number) => String(n + 1).padStart(2, '0')

  showcase.classList.add('showcase-active')
  // small delay so the frame scales in before panels start cycling
  await sleep(500)

  for (let i = 0; i < panels.length; i++) {
    // Activate this panel (deactivate others).
    for (const p of panels) p.classList.remove('panel-active')
    panels[i].classList.add('panel-active')
    if (counterCurrent) counterCurrent.textContent = fmt(i)

    // Hold each company for ~1.4s. Last one gets an extra beat so the
    // visitor can register the "current role" before we move on.
    await sleep(i === panels.length - 1 ? 1900 : 1400)
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

/** Particle-dispersion morph — softer, more organic.
 *
 * Each character now follows a 7-keyframe trajectory with swift-out
 * easing, arrives at the section, then keeps drifting past it while
 * slowly dissolving. Arrivals are staggered so the cloud feels alive
 * instead of robotic.
 */
function morphGroupIntoSection(
  group: HTMLElement,
  section: HTMLElement
): Promise<void> {
  return new Promise((resolve) => {
    const chars = Array.from(
      group.querySelectorAll<HTMLElement>('.char, .stamp-char')
    )
    const sectionRect = section.getBoundingClientRect()
    const sCx = sectionRect.left + sectionRect.width / 2
    const sCy = sectionRect.top + sectionRect.height / 2

    const groupRect = group.getBoundingClientRect()
    const groupCx = groupRect.left + groupRect.width / 2
    const groupCy = groupRect.top + groupRect.height / 2
    const baseAngle = Math.atan2(sCy - groupCy, sCx - groupCx)

    // === A. JITTER (0.45s) — destabilize before shatter ===
    for (const ch of chars) {
      ch.animate(
        [
          { transform: 'translate(0, 0)' },
          {
            transform: `translate(${(Math.random() - 0.5) * 3}px, ${
              (Math.random() - 0.5) * 3
            }px)`,
            offset: 0.25
          },
          { transform: 'translate(0, 0)', offset: 0.5 },
          {
            transform: `translate(${(Math.random() - 0.5) * 4}px, ${
              (Math.random() - 0.5) * 4
            }px)`,
            offset: 0.75
          },
          { transform: 'translate(0, 0)' }
        ],
        { duration: 450, easing: 'ease-in-out', fill: 'forwards' }
      )
    }

    // === B. SCATTER → FLY → DRIFT (per char, swift-out) ===
    setTimeout(() => {
      for (const ch of chars) {
        const chRect = ch.getBoundingClientRect()
        const cx = chRect.left + chRect.width / 2
        const cy = chRect.top + chRect.height / 2

        // Scatter: explode away from the section first.
        const scatterAngle =
          baseAngle + Math.PI + (Math.random() - 0.5) * Math.PI * 0.85
        const scatterDist = 50 + Math.random() * 110
        const sx = Math.cos(scatterAngle) * scatterDist
        const sy = Math.sin(scatterAngle) * scatterDist

        // Target: a random point inside the section rect.
        const tx = sCx - cx + (Math.random() - 0.5) * sectionRect.width * 0.85
        const ty = sCy - cy + (Math.random() - 0.5) * sectionRect.height * 0.85

        // Drift: where the char keeps going after arriving — past the
        // section, fading out. This is the key change that removes the
        // 'hard cut' feeling at the end of the morph.
        const driftAngle = Math.atan2(sCy - groupCy, sCx - groupCx)
        const driftDist = 80 + Math.random() * 120
        const dx = tx + Math.cos(driftAngle) * driftDist
        const dy = ty + Math.sin(driftAngle) * driftDist

        const rot = (Math.random() - 0.5) * 120

        ch.animate(
          [
            // 0% — at rest
            {
              transform: 'translate(0, 0) rotate(0deg) scale(1)',
              opacity: 1,
              filter: 'blur(0px)',
              offset: 0
            },
            // 14% — starting to scatter
            {
              transform: `translate(${sx * 0.55}px, ${sy * 0.55}px) rotate(${
                rot * 0.18
              }deg) scale(0.96)`,
              opacity: 0.92,
              filter: 'blur(1px)',
              offset: 0.14
            },
            // 28% — scattered (peak outward displacement)
            {
              transform: `translate(${sx}px, ${sy}px) rotate(${
                rot * 0.38
              }deg) scale(0.86)`,
              opacity: 0.82,
              filter: 'blur(3px)',
              offset: 0.28
            },
            // 52% — mid-flight, curving back toward the section
            {
              transform: `translate(${(sx + tx) * 0.5}px, ${
                (sy + ty) * 0.5
              }px) rotate(${rot * 0.65}deg) scale(0.68)`,
              opacity: 0.62,
              filter: 'blur(5px)',
              offset: 0.52
            },
            // 76% — approaching the section
            {
              transform: `translate(${tx * 0.88 + sx * 0.12}px, ${
                ty * 0.88 + sy * 0.12
              }px) rotate(${rot * 0.88}deg) scale(0.48)`,
              opacity: 0.42,
              filter: 'blur(8px)',
              offset: 0.76
            },
            // 88% — arrived on the section, still glowing faintly
            {
              transform: `translate(${tx}px, ${ty}px) rotate(${rot}deg) scale(0.32)`,
              opacity: 0.22,
              filter: 'blur(11px)',
              offset: 0.88
            },
            // 95% — drifting past, dissolving
            {
              transform: `translate(${dx * 0.6 + tx * 0.4}px, ${
                dy * 0.6 + ty * 0.4
              }px) rotate(${rot * 1.15}deg) scale(0.2)`,
              opacity: 0.08,
              filter: 'blur(16px)',
              offset: 0.95
            },
            // 100% — gone
            {
              transform: `translate(${dx}px, ${dy}px) rotate(${
                rot * 1.3
              }deg) scale(0.12)`,
              opacity: 0,
              filter: 'blur(22px)',
              offset: 1
            }
          ],
          {
            duration: 2200 + Math.random() * 600,
            delay: Math.random() * 320,
            // swift-out — feels physical, like the char has inertia and
            // decelerates naturally rather than moving at constant speed.
            easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
            fill: 'forwards'
          }
        )
      }

      // Group chrome (header / stamp / meta not animated above) fades in
      // sync, but slower than before so it doesn't vanish before the chars.
      group.animate(
        [
          { opacity: 1 },
          { opacity: 0.7, offset: 0.35 },
          { opacity: 0.3, offset: 0.7 },
          { opacity: 0 }
        ],
        {
          duration: 2200,
          easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
          fill: 'forwards',
          delay: 300
        }
      )
    }, 430)

    // === C. MATERIALIZE section content (chars are mid-flight) ===
    setTimeout(() => {
      section.style.opacity = '1'
      section.style.transform = 'translateY(0)'
    }, 1100)

    // Resolve after the slowest char has had time to drift out.
    setTimeout(resolve, 3200)
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
  // Experience was showcased (not morphed) — treat it as already revealed.
  const remaining = allSections.filter((s) => {
    const h = s.querySelector('h2')
    const label = h?.textContent?.trim() || ''
    return (
      h &&
      !morphedLabels.has(label) &&
      label !== 'Experience' &&
      getComputedStyle(s).opacity !== '1'
    )
  })

  for (const section of remaining) {
    section.style.opacity = '1'
    section.style.transform = 'translateY(0)'
    await sleep(90)
  }
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

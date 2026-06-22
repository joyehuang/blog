/**
 * Intro Cinematic — ASCII-particle entry animation (Canvas 2D).
 *
 * Runs only when the early inline script in IntroOverlay.astro set
 * `intro-active` on <html>.
 *
 * Timeline (≈ 9s):
 *   Phase 1  ENTER     0.0 ~ 1.5s   chars fly in from off-screen
 *   Phase 2  CHAOS     1.5 ~ 4.0s   chars drift, randomize (data-stream feel)
 *   Phase 3  ASSEMBLE  4.0 ~ 6.5s   chars lerp to avatar silhouette targets
 *   Phase 4  HOLD      6.5 ~ 7.5s   avatar complete, micro-flicker
 *   Phase 5  REVEAL    7.5 ~ 9.0s   chars burst outward, overlay dissolves,
 *                                    hero zooms from scale(.94)+blur(8px)
 */

import gsap from 'gsap'

// Trace checkpoints into localStorage so we can diagnose failures across reloads.
// Only writes in dev to avoid leaking storage in production.
const trace = import.meta.env.DEV
  ? (msg: string) => {
      try {
        localStorage.setItem('intro-trace', `[${new Date().toISOString()}] ${msg}`)
      } catch {}
    }
  : (_msg: string) => {}

const SKIP =
  document.documentElement.classList.contains('intro-skip') ||
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

if (!SKIP) {
  void runIntro().catch((err) => {
    const msg = err instanceof Error ? err.stack || err.message : String(err)
    if (import.meta.env.DEV) {
      try {
        localStorage.setItem('intro-last-error', `[${new Date().toISOString()}] ${msg}`)
      } catch {}
    }
    console.warn('[intro] aborted:', err)
    revealImmediately()
  })
}

type Phase = 'enter' | 'chaos' | 'assemble' | 'hold' | 'reveal'

type Particle = {
  // current screen position
  x: number
  y: number
  // start position (for enter animation)
  sx: number
  sy: number
  // drift seed (for chaos phase)
  dx: number
  dy: number
  // target position (avatar silhouette point), centered around canvas midpoint
  tx: number
  ty: number
  // burst velocity (for reveal phase)
  bx: number
  by: number
  // current character + how long until next switch
  char: string
  switchIn: number
  // per-particle alpha
  alpha: number
  // per-particle size factor (0.7..1.3)
  size: number
  // whether this particle is on the avatar silhouette
  hasTarget: boolean
}

// Character palette — strictly monochrome, terminal-native.
const CHARS = {
  // solid blocks for the silhouette outline (high density)
  dense: ['█', '▓', '▒', '░'],
  // light glyphs for fill / scatter
  light: ['*', '·', ':', '.', ' '],
  // "decoding" glyphs for chaos + reveal (tech feel)
  decode: ['0', '1', '/', '>', '<', '#', '_', '-', '+']
} as const

const PRIMARY_HUE = 200
const PRIMARY_SAT = 29

async function runIntro() {
  const overlay = document.getElementById('intro-overlay')
  const canvas = document.getElementById('intro-canvas') as HTMLCanvasElement | null
  trace(`runIntro: overlay=${!!overlay}, canvas=${!!canvas}`)
  if (!overlay || !canvas) {
    revealImmediately()
    return
  }

  trace('runIntro started')

  const targetPoints = await loadSilhouettePoints(overlay.dataset.avatar || '')
  trace(`loaded: ${targetPoints.length} target points`)

  const ctx = canvas.getContext('2d', { alpha: true })
  if (!ctx) {
    revealImmediately()
    return
  }

  const isMobile = window.matchMedia('(max-width: 768px)').matches
  const dpr = Math.min(window.devicePixelRatio || 1, 2)

  // Resize canvas to viewport
  const resize = () => {
    canvas.width = Math.floor(window.innerWidth * dpr)
    canvas.height = Math.floor(window.innerHeight * dpr)
    canvas.style.width = window.innerWidth + 'px'
    canvas.style.height = window.innerHeight + 'px'
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }
  resize()
  window.addEventListener('resize', resize)

  const W = () => window.innerWidth
  const H = () => window.innerHeight

  // === Particle init ===
  // Each silhouette target maps to one "anchor" particle; extra ambient
  // particles fill out the chaos phase.
  const TARGET_COUNT = targetPoints.length
  const AMBIENT_COUNT = isMobile ? 220 : 480
  const TOTAL = TARGET_COUNT + AMBIENT_COUNT

  // === Anchor the silhouette to where the real hero avatar lives on the page,
  // so when the overlay dissolves the assembled char-avatar sits exactly on
  // top of the real <img>. Falls back to viewport center if the element
  // can't be found (defensive — should always exist on the landing page).
  const realAvatar =
    document.querySelector('#content-header img') ||
    document.querySelector('main img[alt="profile"]') as HTMLImageElement | null
  const avatarRect = realAvatar?.getBoundingClientRect()
  // hero is scaled to 0.94 during intro; the unscaled rect center is what we want
  const cx = avatarRect ? avatarRect.left + avatarRect.width / 2 : W() / 2
  const cy = avatarRect ? avatarRect.top + avatarRect.height / 2 : H() / 2

  // Scale the avatar sample points so the assembled silhouette matches the
  // real avatar's rendered size. Sample grid is 220x220; the real avatar is
  // ~112px in hero, but the avatar PNG is square-cropped so the head occupies
  // most of it. We size the silhouette to ~1.6x the visible avatar so the
  // char-cloud extends a bit past the edges (more dramatic reveal).
  const targetRenderSize = avatarRect
    ? Math.max(avatarRect.width, avatarRect.height) * 1.6
    : Math.min(W(), H()) * 0.38
  const scaleFactor = targetRenderSize / 220

  const particles: Particle[] = []
  for (let i = 0; i < TOTAL; i++) {
    const isAmbient = i >= TARGET_COUNT
    const target = isAmbient ? null : targetPoints[i]
    // Off-screen start: random direction, 1.2x viewport out
    const angle = Math.random() * Math.PI * 2
    const radius = Math.max(W(), H()) * (0.7 + Math.random() * 0.5)
    const sx = cx + Math.cos(angle) * radius
    const sy = cy + Math.sin(angle) * radius

    // For ambient particles, the "target" is a random point inside viewport
    // so chaos phase has them scattered across the screen.
    const tx = target
      ? cx + target.x * scaleFactor
      : Math.random() * W()
    const ty = target
      ? cy + target.y * scaleFactor
      : Math.random() * H()

    particles.push({
      x: sx,
      y: sy,
      sx,
      sy,
      dx: (Math.random() - 0.5) * 0.5,
      dy: (Math.random() - 0.5) * 0.5,
      tx,
      ty,
      bx: 0,
      by: 0,
      char: pickChar('decode'),
      switchIn: Math.floor(Math.random() * 400),
      alpha: 0,
      size: 0.75 + Math.random() * 0.55,
      hasTarget: !!target
    })
  }

  // === Render loop ===
  let raf = 0
  let frameCount = 0
  let lastTickAt = 0
  let mouseX = 0
  let mouseY = 0
  const camX = { value: 0 }
  const camY = { value: 0 }
  const zoom = { value: 1 }

  const onPointerMove = (e: PointerEvent) => {
    mouseX = (e.clientX / W()) * 2 - 1
    mouseY = -((e.clientY / H()) * 2 - 1)
  }
  if (!isMobile) {
    window.addEventListener('pointermove', onPointerMove, { passive: true })
  }

  // Current phase, advanced by the GSAP timeline.
  let phase: Phase = 'enter'
  // Progress of the assemble phase (0..1), drives lerp factor.
  let assembleProgress = 0
  // Progress of reveal burst (0..1).
  let revealProgress = 0

  const tick = () => {
    raf = requestAnimationFrame(tick)
    frameCount++
    lastTickAt = performance.now()

    // smooth camera parallax
    camX.value += (mouseX * 16 - camX.value) * 0.05
    camY.value += (mouseY * 10 - camY.value) * 0.05

    ctx.clearRect(0, 0, W(), H())

    // soft global alpha for the whole particle field — fades in/out per phase
    let globalAlpha = 1
    if (phase === 'enter') globalAlpha = Math.min(1, frameCount / 60)
    else if (phase === 'reveal') globalAlpha = 1 - revealProgress

    ctx.save()
    ctx.translate(W() / 2 + camX.value, H() / 2 + camY.value)
    ctx.scale(zoom.value, zoom.value)
    ctx.translate(-W() / 2, -H() / 2)

    const fontSize = isMobile ? 12 : 14
    ctx.font = `${fontSize}px "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i]

      // === Per-phase position update ===
      if (phase === 'enter') {
        // gsap is animating p.x / p.y directly via the timeline
      } else if (phase === 'chaos') {
        // drift
        p.x += p.dx + Math.sin((frameCount + i * 7) * 0.02) * 0.35
        p.y += p.dy + Math.cos((frameCount + i * 11) * 0.018) * 0.35
        // bounce softly inside viewport
        if (p.x < 0 || p.x > W()) p.dx *= -1
        if (p.y < 0 || p.y > H()) p.dy *= -1
      } else if (phase === 'assemble') {
        // lerp toward target — easeout via assembleProgress
        // stagger by index so the avatar forms organically
        const stagger = Math.max(0, Math.min(1, (assembleProgress * 1.6) - (i / particles.length) * 0.5))
        const e = easeInOutCubic(stagger)
        // chaotic home position during assemble
        const hx = p.tx + Math.sin((frameCount + i) * 0.04) * 6 * (1 - e)
        const hy = p.ty + Math.cos((frameCount + i) * 0.035) * 6 * (1 - e)
        p.x += (hx - p.x) * 0.12
        p.y += (hy - p.y) * 0.12
      } else if (phase === 'hold') {
        // tiny breathing
        p.x += (p.tx - p.x) * 0.2
        p.y += (p.ty - p.y) * 0.2
      } else if (phase === 'reveal') {
        // burst outward
        p.x += p.bx * (1 + revealProgress * 1.6)
        p.y += p.by * (1 + revealProgress * 1.6)
      }

      // === Character switching (decode flicker) ===
      p.switchIn -= 16
      if (p.switchIn <= 0) {
        if (phase === 'enter' || phase === 'chaos' || phase === 'reveal') {
          p.char = pickChar('decode')
          p.switchIn = 80 + Math.floor(Math.random() * 280)
        } else if (phase === 'assemble') {
          // shift from decode → dense as we approach the target
          const density = assembleProgress
          p.char = Math.random() < density
            ? pickChar('dense')
            : pickChar(Math.random() < 0.4 ? 'decode' : 'light')
          p.switchIn = 120 + Math.floor(Math.random() * 240)
        } else if (phase === 'hold') {
          // rare flicker: mostly locked dense, occasional decode
          p.char = Math.random() < 0.85
            ? pickChar('dense')
            : pickChar('decode')
          p.switchIn = 220 + Math.floor(Math.random() * 480)
        }
      }

      // === Render ===
      const a = p.alpha * globalAlpha
      if (a <= 0.01) continue
      // Per-particle brightness — outline gets full white, fill stays primary.
      const isOutline = phase !== 'enter' && phase !== 'reveal' && p.hasTarget && assembleProgress > 0.6
      const lightness = isOutline ? 88 : 62
      ctx.fillStyle = `hsla(${PRIMARY_HUE}, ${PRIMARY_SAT}%, ${lightness}%, ${a})`
      ctx.fillText(p.char, p.x, p.y)
    }

    ctx.restore()
  }
  raf = requestAnimationFrame(tick)

  // Debug surface — dev only.
  if (import.meta.env.DEV) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).__intro = {
      get state() {
        return {
          phase,
          frameCount,
          assembleProgress: assembleProgress.toFixed(3),
          revealProgress: revealProgress.toFixed(3),
          lastTickAgoMs: Math.round(performance.now() - lastTickAt),
          particleCount: particles.length,
          targetCount: TARGET_COUNT
        }
      },
      setPhase: (p: Phase) => {
        phase = p
      }
    }
  }

  // === GSAP timeline ===
  const tl = gsap.timeline({
    onComplete: cleanup,
    onUpdate: () => {
      // debug log
    }
  })

  // Phase 1: ENTER — particles fly from off-screen to a scattered position.
  // Tiny stagger so they trickle in (≈ 0.5s) without stretching the phase.
  tl.to(particles, {
    x: (_i: number, p: Particle) => p.tx + (Math.random() - 0.5) * W() * 0.8,
    y: (_i: number, p: Particle) => p.ty + (Math.random() - 0.5) * H() * 0.8,
    alpha: 1,
    duration: 1.3,
    ease: 'power3.out',
    stagger: { each: 0.0002, from: 'random' }
  })
  tl.add(() => {
    phase = 'chaos'
    // remember chaos home positions
    for (const p of particles) {
      p.dx = (Math.random() - 0.5) * 0.7
      p.dy = (Math.random() - 0.5) * 0.7
    }
  })

  // Phase 2: CHAOS — let it breathe for ~2s
  tl.to({}, { duration: 2.0 })

  // Phase 3: ASSEMBLE — drive assembleProgress 0 → 1, then settle.
  tl.add(() => {
    phase = 'assemble'
  })
  tl.to(
    { v: 0 },
    {
      v: 1,
      duration: 2.5,
      ease: 'power2.inOut',
      onUpdate: function () {
        assembleProgress = this.targets()[0].v
      }
    }
  )
  // gentle zoom-in during the last 30% of assemble
  tl.to(zoom, { value: 1.08, duration: 1.0, ease: 'power2.out' }, '-=1.0')

  // Phase 4: HOLD — let the avatar breathe for 1s
  tl.add(() => {
    phase = 'hold'
  })
  tl.to({}, { duration: 1.0 })

  // Phase 5: REVEAL — chars burst, overlay dissolves, hero zooms in.
  tl.add(() => {
    phase = 'reveal'
    // assign burst velocities (radial from canvas center, scaled by distance)
    for (const p of particles) {
      const dx = p.x - cx
      const dy = p.y - cy
      const len = Math.hypot(dx, dy) || 1
      const speed = 1.5 + Math.random() * 3.5
      p.bx = (dx / len) * speed
      p.by = (dy / len) * speed
    }
  })
  tl.to(
    { v: 0 },
    {
      v: 1,
      duration: 1.2,
      ease: 'power2.in',
      onUpdate: function () {
        revealProgress = this.targets()[0].v
      }
    }
  )

  // overlay dissolves during the last 0.6s of reveal
  tl.to(overlay, {
    opacity: 0,
    duration: 0.6,
    ease: 'power2.inOut',
    onComplete: () => overlay.classList.add('intro-hidden')
  }, '-=0.6')

  // unlock page so GSAP can drive hero transitions
  tl.add(() => {
    document.documentElement.classList.remove('intro-active')
    document.documentElement.classList.add('intro-hidden')
  }, '<+0.05')

  tl.to('#content-header', {
    scale: 1,
    opacity: 1,
    filter: 'blur(0px)',
    duration: 1.0,
    ease: 'power3.out'
  }, '<+0.02')

  tl.to('#content', {
    scale: 1,
    opacity: 1,
    filter: 'blur(0px)',
    duration: 1.0,
    ease: 'power3.out'
  }, '<+0.1')

  // === Cleanup ===
  let cleaned = false
  function cleanup() {
    if (cleaned) return
    cleaned = true
    clearTimeout(fallback)
    cancelAnimationFrame(raf)
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('resize', resize)
    if (overlay) overlay.classList.add('intro-done')
    document.documentElement.classList.remove('intro-active')
    document.documentElement.classList.remove('intro-hidden')
    gsap.set(['#content-header', '#content'], { clearProps: 'all' })

    // Notify the JoJo tour (and any other listeners) that the intro is done.
    // Set the flag first so listeners attaching after the event still see it.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).__introDone = true
    window.dispatchEvent(new CustomEvent('intro:complete'))
  }

  const fallback = setTimeout(() => {
    console.warn('[intro] hard timeout, forcing reveal')
    cleanup()
  }, 12000)
}

/** Pick a random character from one of the palette buckets. */
function pickChar(kind: 'dense' | 'light' | 'decode'): string {
  const set = CHARS[kind]
  return set[Math.floor(Math.random() * set.length)]
}

/** Cubic ease-in-out, for manual lerp curves. */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

/**
 * Load the avatar PNG, draw it onto a small hidden canvas, and sample
 * the alpha channel to extract silhouette points. Returns an array of
 * { x, y } in the [-110, 110] range (i.e. centered around 0,0).
 */
async function loadSilhouettePoints(src: string): Promise<{ x: number; y: number }[]> {
  if (!src) return []
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.src = src
  try {
    await img.decode()
  } catch {
    return []
  }

  const SIZE = 220
  const c = document.createElement('canvas')
  c.width = SIZE
  c.height = SIZE
  const cx = c.getContext('2d', { willReadFrequently: true })
  if (!cx) return []

  // Fill black background, then draw the avatar on top. We sample on alpha
  // since the source PNG has transparency around the head.
  cx.drawImage(img, 0, 0, SIZE, SIZE)
  const data = cx.getImageData(0, 0, SIZE, SIZE).data

  const points: { x: number; y: number }[] = []
  const STEP = 6
  for (let y = 0; y < SIZE; y += STEP) {
    for (let x = 0; x < SIZE; x += STEP) {
      const i = (y * SIZE + x) * 4
      const alpha = data[i + 3]
      // also require some brightness so we don't sample fully-transparent edges
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3
      if (alpha > 100 && brightness > 60) {
        points.push({ x: x - SIZE / 2, y: y - SIZE / 2 })
      }
    }
  }
  return points
}

/** Safety net — if anything fails to boot, just reveal the page. */
function revealImmediately() {
  const overlay = document.getElementById('intro-overlay')
  const doc = document.documentElement
  doc.classList.remove('intro-active')
  doc.classList.remove('intro-hidden')
  doc.classList.add('intro-skip')
  if (overlay) overlay.classList.add('intro-done')
}

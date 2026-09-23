/**
 * Render intro (prototype) — the page arrives as its source (see source-layer).
 * JoJo rappels down the right edge on a rope of `│`, and everything above his
 * feet is rendered as he passes. He stops under each block to check the result
 * (act → verify), lands in his corner, drops the rope and becomes the resident
 * mascot. Gate + styles: RenderIntro.astro.
 */
import { rasterize, type SourceLayer } from './source-layer'

type Pose = { eyes: readonly [string, string]; mouth: string; rope: boolean; squash: number }
type Seg = { t0: number; t1: number; y0: number; y1: number; hold: boolean }

const SKIP =
  'script,style,noscript,[hidden],#intro-overlay,#intro-replay,#render-ctl,#home-jojo,.render-veil,astro-dev-toolbar'
const MONO = '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace'
const SCRAMBLE = '░▒▓/\\|-+*#<>{}=_01'
const PRINT_MS = 320 // the source prints in, top → bottom
const HOLD_MS = 230 // JoJo checks each block before moving on
const LAND_MS = 160
const RETRACT_MS = 240
const DUST_MS = 420
const BAND = 30 // px of source being "decoded" just below the front
const GLOW = 40 // the render front's light, falling onto the source
const ROPE_COL = 5 // the rope ties to this column of JoJo's head

export function initRenderIntro() {
  const root = document.documentElement
  if (!root.classList.contains('intro-render')) return

  const params = new URLSearchParams(location.search)
  let speed = Math.min(2, Math.max(0.1, parseFloat(params.get('speed') ?? '1') || 1))

  const veil = document.createElement('canvas')
  veil.className = 'render-veil'
  document.body.append(veil)
  const ctx = veil.getContext('2d')!
  const homeEl = document.querySelector<HTMLElement>('#home-jojo .jojo-pre')

  let raf = 0
  let running = false
  let firstRun = true
  let scene: ReturnType<typeof buildScene> | null = null

  function buildScene() {
    const W = window.innerWidth
    const H = window.innerHeight
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    veil.width = Math.round(W * dpr)
    veil.height = Math.round(H * dpr)
    veil.style.width = `${W}px`
    veil.style.height = `${H}px`

    const source = rasterize(SKIP)

    // JoJo's sprite metrics match the real <pre> so the hand-over is seamless;
    // with no corner JoJo to hand over to (mobile) he's drawn a size smaller
    const pre = homeEl?.offsetParent ? getComputedStyle(homeEl) : null
    const fontSize = pre ? parseFloat(pre.fontSize) : W < 768 ? 11 : 14
    const letter = pre ? parseFloat(pre.letterSpacing) || 0 : 0.5
    const lineH = pre ? parseFloat(pre.lineHeight) || fontSize * 1.15 : fontSize * 1.15
    ctx.font = `400 ${fontSize}px ${MONO}`
    const cell = ctx.measureText('─').width + letter
    const spriteW = cell * 10
    const spriteH = lineH * 6
    const homeRect = homeEl?.getBoundingClientRect()
    const homeShown = !!homeRect && homeRect.width > 0
    const home = homeShown
      ? { x: homeRect.left, y: homeRect.top }
      : { x: W - 24 - spriteW, y: H - 24 - spriteH }

    // stops: JoJo's feet settle just under each hero block, then home
    const homeFeet = home.y + spriteH
    const blocks = [
      '[data-intro-target="avatar"]',
      '#content-header h1 + div',
      '#content-header a[href="/contact"]',
      '#content > :first-child'
    ]
    const stops: number[] = []
    for (const sel of blocks) {
      const r = document.querySelector(sel)?.getBoundingClientRect()
      if (!r || !r.height) continue
      const y = r.bottom + 10
      if (y < spriteH * 0.6 || y > homeFeet - 70) continue
      if (stops.length && y - stops[stops.length - 1] < 56) continue
      stops.push(y)
    }

    // timeline, in ms at 1×
    const segs: Seg[] = []
    let t = PRINT_MS - 40 // he's already on his way down while the last lines print
    let y = -10 // feet, starting above the viewport
    for (const target of [...stops, homeFeet]) {
      const dur = Math.min(380, Math.max(200, 140 + (target - y) * 0.6))
      segs.push({ t0: t, t1: t + dur, y0: y, y1: target, hold: false })
      t += dur
      y = target
      if (target !== homeFeet) {
        segs.push({ t0: t, t1: t + HOLD_MS, y0: y, y1: y, hold: true })
        t += HOLD_MS
      }
    }
    const landAt = t
    // no corner to land in (mobile hides JoJo): he says hi from the bottom edge, then fades out
    const end = landAt + (homeShown ? Math.max(LAND_MS, RETRACT_MS, DUST_MS) : 760)
    const dust = Array.from({ length: 7 }, (_, i) => ({
      dx: (i % 2 ? 1 : -1) * (14 + Math.random() * 34),
      dy: -(2 + Math.random() * 12),
      ch: '·˙∙'[i % 3]
    }))
    return {
      W,
      H,
      dpr,
      source,
      fontSize,
      letter,
      lineH,
      cell,
      spriteH,
      home,
      homeShown,
      segs,
      landAt,
      end,
      dust
    }
  }

  function feetAt(t: number) {
    const s = scene!
    if (t < s.segs[0].t0) return s.segs[0].y0
    for (const seg of s.segs) {
      if (t > seg.t1) continue
      const u = (t - seg.t0) / (seg.t1 - seg.t0)
      if (seg.hold) return { y: seg.y0, bounce: Math.sin(u * Math.PI * 2) * 3.5 * (1 - u) }
      return seg.y0 + (seg.y1 - seg.y0) * easeInOutCubic(u)
    }
    return s.segs[s.segs.length - 1].y1
  }

  function poseAt(t: number): Pose {
    const s = scene!
    if (t >= s.landAt) {
      const u = Math.min(1, (t - s.landAt) / LAND_MS)
      return { eyes: ['●', '●'], mouth: 'ᴗ', rope: false, squash: Math.sin(u * Math.PI) * 0.1 }
    }
    const seg = s.segs.find((g) => t >= g.t0 && t <= g.t1)
    if (seg?.hold) return { eyes: ['◖', '◖'], mouth: 'ᴗ', rope: true, squash: 0 } // checking the block he just rendered
    return { eyes: ['●', '●'], mouth: 'o', rope: true, squash: 0 }
  }

  function draw(t: number) {
    const s = scene!
    const { W, H, dpr, source } = s
    const f = feetAt(t)
    const feet = typeof f === 'number' ? f : f.y
    const bounce = typeof f === 'number' ? 0 : f.bounce
    const done = t >= s.end
    // after landing the rest of the viewport renders quickly from his feet down
    const tail = t > s.landAt ? Math.min(1, (t - s.landAt) / RETRACT_MS) : 0
    const front = Math.max(0, feet + (H - feet) * easeOutCubic(tail))

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, W, H)
    if (done) return

    if (front < H) {
      ctx.fillStyle = source.bg
      ctx.fillRect(0, front, W, H - front)
      const printed = t < PRINT_MS ? H * easeOutCubic(t / PRINT_MS) : H
      if (printed > front) {
        ctx.drawImage(
          source.canvas,
          0,
          front * dpr,
          W * dpr,
          (printed - front) * dpr,
          0,
          front,
          W,
          printed - front
        )
      }
      if (front > 0) {
        decodeBand(source, front, Math.min(printed, front + BAND))
        drawFrontLight(front)
      }
    }
    drawJoJo(t, feet + bounce)
  }

  // the glyphs right under the front are mid-decode: scrambled near the line, themselves (lit) further down
  function decodeBand(source: SourceLayer, top: number, bottom: number) {
    if (bottom <= top) return
    const { W } = scene!
    ctx.fillStyle = source.bg
    ctx.fillRect(0, top, W, bottom - top)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const accent = accentTone()
    for (const g of source.glyphs) {
      if (g.y < top) continue
      if (g.y > bottom) break
      const k = 1 - (g.y - top) / BAND
      const scrambled = Math.random() < k * 0.85
      ctx.font = g.font
      ctx.fillStyle = `hsl(${accent} / ${(0.35 + 0.6 * k * (scrambled ? Math.random() : 1)).toFixed(2)})`
      ctx.fillText(scrambled ? SCRAMBLE[(Math.random() * SCRAMBLE.length) | 0] : g.ch, g.x, g.y)
    }
  }

  // a thin scanline with its light falling a little way onto the source below
  function drawFrontLight(front: number) {
    const { W } = scene!
    const accent = accentTone()
    const glow = ctx.createLinearGradient(0, front, 0, front + GLOW)
    glow.addColorStop(0, `hsl(${accent} / 0.16)`)
    glow.addColorStop(1, `hsl(${accent} / 0)`)
    ctx.fillStyle = glow
    ctx.fillRect(0, front, W, GLOW)
    ctx.fillStyle = `hsl(${accent} / 0.55)`
    ctx.fillRect(0, front, W, 1)
  }

  function accentTone() {
    return getComputedStyle(root).getPropertyValue('--primary').trim()
  }

  function drawJoJo(t: number, feet: number) {
    const s = scene!
    const pose = poseAt(t)
    const top = feet - s.spriteH
    const head = pose.rope ? '  ╭──┴───╮' : '  ╭──────╮'
    const lines = [
      head,
      `  │ ${pose.eyes[0]}  ${pose.eyes[1]} │`,
      `  │  ${pose.mouth}   │`,
      '  ╰─┬──┬─╯',
      '    │  │  ',
      '    ╵  ╵  '
    ]
    const accent = `hsl(${accentTone()})`
    ctx.font = `400 ${s.fontSize}px ${MONO}`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillStyle = accent

    // rope: from the top edge down to his head; after landing it snaps back up
    const ropeX = s.home.x + s.cell * ROPE_COL
    const retract = t > s.landAt ? Math.min(1, (t - s.landAt) / RETRACT_MS) : 0
    const ropeEnd = (pose.rope ? top : top * (1 - easeInCubic(retract))) + s.lineH * 0.2
    const step = s.fontSize * 0.9
    ctx.globalAlpha = 0.5
    for (let y = ropeEnd - step; y > -step; y -= step) ctx.fillText('│', ropeX, y)
    ctx.globalAlpha = 1

    // a puff of dust where he lands
    const since = t - s.landAt
    if (since > 0 && since < DUST_MS) {
      const u = since / DUST_MS
      const cx = s.home.x + s.cell * 5
      ctx.globalAlpha = 0.7 * (1 - u)
      for (const d of s.dust)
        ctx.fillText(d.ch, cx + d.dx * easeOutCubic(u), feet - 8 + d.dy * easeOutCubic(u))
      ctx.globalAlpha = 1
    }
    if (!s.homeShown && since > 300) ctx.globalAlpha = Math.max(0, 1 - (since - 300) / 420)

    ctx.save()
    ctx.translate(s.home.x + s.cell * 5, feet)
    ctx.scale(1 + pose.squash * 0.6, 1 - pose.squash)
    ctx.translate(-(s.home.x + s.cell * 5), -feet)
    lines.forEach((line, row) => {
      for (let i = 0; i < line.length; i++) {
        if (line[i] !== ' ') ctx.fillText(line[i], s.home.x + i * s.cell, top + row * s.lineH)
      }
    })
    ctx.restore()
    ctx.globalAlpha = 1
  }

  function finish() {
    cancelAnimationFrame(raf)
    running = false
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, veil.width, veil.height)
    veil.style.display = 'none'
    root.classList.remove('intro-render-active', 'intro-render-cover')
    window.dispatchEvent(new CustomEvent('joye:jojo-say', { detail: { text: 'welcome :)' } }))
    if (firstRun) {
      firstRun = false
      // lets the legacy overlay's watchers (the interview promo) know the entrance settled
      document.getElementById('intro-overlay')?.classList.add('intro-idle')
    }
  }

  function play() {
    cancelAnimationFrame(raf)
    window.scrollTo({ top: 0, behavior: 'instant' })
    root.classList.add('intro-render-active')
    veil.style.display = 'block'
    // all synchronous: uncover → sample the live page → paint the opaque first frame, before the browser paints
    root.classList.remove('intro-render-cover')
    scene = buildScene()
    running = true
    const start = performance.now()
    draw(0)
    const tick = (now: number) => {
      const t = (now - start) * speed
      if (t >= scene!.end) return finish()
      draw(t)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
  }

  // any intent to use the page skips straight to the rendered state
  const skip = (e: Event) => {
    if (!running) return
    if ((e.target as Element | null)?.closest?.('#render-ctl')) return
    finish()
  }
  for (const type of ['wheel', 'touchstart', 'keydown', 'pointerdown']) {
    window.addEventListener(type, skip, { passive: true })
  }

  // prototype review controls
  const ctl = document.getElementById('render-ctl')
  const sync = () =>
    ctl?.querySelectorAll<HTMLButtonElement>('[data-speed]').forEach((b) => {
      b.setAttribute('aria-pressed', String(Number(b.dataset.speed) === speed))
    })
  ctl?.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('button')
    if (!btn) return
    if (btn.dataset.speed) speed = Number(btn.dataset.speed)
    sync()
    play()
  })
  sync()

  // ?debug: deterministic frames for review captures
  if (params.has('debug')) {
    Object.assign(window, {
      __renderIntro: {
        seek(t: number) {
          cancelAnimationFrame(raf)
          running = false
          veil.style.display = 'block'
          root.classList.add('intro-render-active')
          root.classList.remove('intro-render-cover')
          scene ??= buildScene()
          draw(t)
          return scene.end
        },
        play
      }
    })
  }

  const fonts = document.fonts?.ready ?? Promise.resolve()
  Promise.race([fonts, new Promise((r) => setTimeout(r, 500))]).then(() => {
    if (params.has('hold')) {
      window.dispatchEvent(new Event('render-intro:ready'))
      return
    }
    play()
  })
}

function easeInOutCubic(u: number) {
  return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2
}
function easeOutCubic(u: number) {
  return 1 - Math.pow(1 - u, 3)
}
function easeInCubic(u: number) {
  return u * u * u
}

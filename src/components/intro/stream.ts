/**
 * Streaming intro (prototype) — the home hero is generated in place, the way a
 * model answers: the avatar denoises out of noise in discrete steps, then the
 * name / labels / CTA stream in token by token behind a moving caret. There is
 * no overlay; the last frame is the real page. Gate + styles: StreamIntro.astro.
 */

type Step = { r: number; s: number }
type Unit = { el: HTMLElement; items: HTMLElement[]; rate: number }

// coarse → fine; `r` is the image's resolution (px across), `s` the signal weight.
// Noise always lives on a fine grid, so it reads as grain over a blurry-then-sharp face.
const STEPS: Step[] = [
  { r: 4, s: 0.26 },
  { r: 7, s: 0.45 },
  { r: 12, s: 0.62 },
  { r: 22, s: 0.78 },
  { r: 40, s: 0.89 },
  { r: 102, s: 0.97 }
]
const GRID = 72 // noise grain resolution across the avatar
const THINK_MIN = 280 // noise-only "time to first token"
const STEP_MS = 115
const NAME_AT_STEP = 2 // the name starts streaming while the avatar is still resolving
const UNIT_GAP = 70
const NOISE_AMP = 0.55

const CANCELLED = Symbol('cancelled')

export function initStreamIntro() {
  const root = document.documentElement
  if (!root.classList.contains('intro-stream')) return

  const hero = document.getElementById('content-header')
  const avatarEl = hero?.querySelector<HTMLImageElement>('[data-intro-target="avatar"]')
  const units = collectUnits(hero)
  if (!hero || !avatarEl || !units.length) {
    root.classList.remove('intro-stream')
    return
  }
  // astro check doesn't carry the guard's narrowing into closures
  const stage = hero
  const avatar = avatarEl

  const params = new URLSearchParams(location.search)
  let speed = clamp(parseFloat(params.get('speed') ?? '1') || 1, 0.1, 2)

  const caret = document.createElement('span')
  caret.className = 'stream-caret'
  const meta = document.createElement('div')
  meta.className = 'stream-meta'
  const canvas = document.createElement('canvas')
  canvas.className = 'stream-canvas'
  stage.append(canvas, caret, meta)

  const ctx = canvas.getContext('2d')
  const scratch = document.createElement('canvas')
  const sctx = scratch.getContext('2d', { willReadFrequently: true })
  const tiny = document.createElement('canvas')
  const tctx = tiny.getContext('2d')
  if (!ctx || !sctx || !tctx) return

  const dot = units.at(-1)?.el.querySelector<HTMLElement>(':scope > span') ?? null
  dot?.classList.add('stream-dot')
  const tokenCount = units.reduce((n, u) => n + u.items.filter((i) => i.tagName === 'SPAN').length, 0)

  let runId = 0
  let firstRun = true
  let dpr = 1
  let inner = { x: 0, w: 0 }
  let bg: [number, number, number] = [0, 0, 0]
  let sources = new Map<number, Uint8ClampedArray>()

  const sleep = (ms: number, id: number) =>
    new Promise<void>((resolve, reject) =>
      setTimeout(() => (id === runId ? resolve() : reject(CANCELLED)), ms / speed)
    )

  function placeCanvas() {
    const h = stage.getBoundingClientRect()
    const a = avatar.getBoundingClientRect()
    const cs = getComputedStyle(avatar)
    const bw = parseFloat(cs.borderTopWidth) || 0
    const pad = parseFloat(cs.paddingTop) || 0
    const size = a.width - bw * 2
    dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.style.left = `${a.left - h.left + bw}px`
    canvas.style.top = `${a.top - h.top + bw}px`
    canvas.style.width = canvas.style.height = `${size}px`
    canvas.width = canvas.height = Math.round(size * dpr)
    inner = { x: pad * dpr, w: (size - pad * 2) * dpr }
    bg = parseRgb(getComputedStyle(document.body).backgroundColor)
    sources = new Map()
  }

  // the avatar at resolution r (on the page background), smoothed back up to the grain grid
  function source(r: number, grid: number) {
    const key = r * 1000 + grid
    let px = sources.get(key)
    if (px) return px
    tiny.width = tiny.height = r
    tctx!.fillStyle = `rgb(${bg.join(',')})`
    tctx!.fillRect(0, 0, r, r)
    tctx!.imageSmoothingQuality = 'high'
    tctx!.drawImage(avatar, 0, 0, r, r)
    scratch.width = scratch.height = grid
    sctx!.imageSmoothingEnabled = true
    sctx!.imageSmoothingQuality = 'high'
    sctx!.drawImage(tiny, 0, 0, grid, grid)
    px = sctx!.getImageData(0, 0, grid, grid).data
    sources.set(key, px)
    return px
  }

  // x_t = s·x0 + (1−s)·μ + √(1−s²)·ε — noise is centred near the page background
  // so the disc reads as grain on this theme rather than a grey blob
  function render({ r, s }: Step) {
    const grid = r > GRID ? r : GRID
    const src = s > 0 ? source(r, grid) : null
    scratch.width = scratch.height = grid
    const out = sctx!.createImageData(grid, grid)
    const d = out.data
    const n = Math.sqrt(1 - s * s) * NOISE_AMP
    const mu = bg.map((c) => (c / 127.5 - 1) * 0.6)
    for (let i = 0; i < d.length; i += 4) {
      const g = gauss()
      for (let c = 0; c < 3; c++) {
        const x0 = src ? src[i + c] / 127.5 - 1 : 0
        const x = s * x0 + (1 - s) * mu[c] + n * (0.82 * g + 0.32 * gauss())
        d[i + c] = (x + 1) * 127.5
      }
      d[i + 3] = 255
    }
    sctx!.putImageData(out, 0, 0)
    ctx!.clearRect(0, 0, canvas.width, canvas.height)
    ctx!.imageSmoothingEnabled = true
    ctx!.drawImage(scratch, 0, 0, grid, grid, inner.x, inner.x, inner.w, inner.w)
  }

  // the receipt sits just after the last streamed line, like a chat message's timestamp
  function placeMeta() {
    const h = stage.getBoundingClientRect()
    const last = units.at(-1)!.el.getBoundingClientRect()
    meta.style.left = `${last.right - h.left + 12}px`
    meta.style.top = `${last.top - h.top + last.height / 2}px`
  }

  function moveCaret(item: HTMLElement, edge: 'left' | 'right') {
    const h = stage.getBoundingClientRect()
    const r = item.getBoundingClientRect()
    const height = Math.max(12, r.height * 0.8)
    const x = (edge === 'right' ? r.right + 3 : r.left - 4) - h.left
    const y = r.top - h.top + (r.height - height) / 2
    caret.style.height = `${height}px`
    caret.style.transform = `translate(${x}px, ${y}px)`
  }

  async function streamUnits(id: number) {
    caret.classList.add('show')
    for (const [i, unit] of units.entries()) {
      moveCaret(unit.items[0], 'left')
      if (i > 0) await sleep(UNIT_GAP, id)
      unit.el.classList.add('stream-live')
      if (i === units.length - 1) {
        root.classList.add('stream-content') // the rest of the page follows the last line
        await sleep(120, id) // the pill forms before its label streams in
      }
      for (const item of unit.items) {
        item.classList.add('on')
        moveCaret(item, 'right')
        await sleep(unit.rate * (0.55 + Math.random() * 0.95), id)
      }
    }
  }

  function reset() {
    root.classList.remove('stream-avatar-done', 'stream-content', 'stream-done')
    for (const u of units) {
      u.el.classList.remove('stream-live')
      for (const item of u.items) item.classList.remove('on')
    }
    dot?.classList.remove('on')
    caret.classList.remove('show', 'idle')
    meta.classList.remove('show')
    canvas.classList.remove('out')
  }

  async function play() {
    const id = ++runId
    reset()
    root.style.setProperty('--stream-k', String(1 / speed))
    placeCanvas()
    const t0 = performance.now()

    // think: resample pure noise until the avatar is decoded (real time-to-first-token)
    let thinking = true
    let last = 0
    const think = (ts: number) => {
      if (!thinking || id !== runId) return
      if (ts - last > 55 / speed) {
        render({ r: GRID, s: 0 })
        last = ts
      }
      requestAnimationFrame(think)
    }
    requestAnimationFrame(think)

    try {
      await Promise.all([avatar.decode().catch(() => {}), sleep(THINK_MIN, id)])
      thinking = false

      let streaming: Promise<void> = Promise.resolve()
      for (const [k, step] of STEPS.entries()) {
        render(step)
        if (k === NAME_AT_STEP) streaming = streamUnits(id)
        await sleep(STEP_MS, id)
      }
      root.classList.add('stream-avatar-done')
      canvas.classList.add('out')

      await streaming
      dot?.classList.add('on')
      caret.classList.add('idle')
      const secs = ((performance.now() - t0) / 1000).toFixed(2)
      meta.innerHTML = `<b>✓</b> ${secs}s · ${tokenCount} tokens`
      placeMeta()
      meta.classList.add('show')
      root.classList.add('stream-done')
      if (firstRun) {
        firstRun = false
        // lets the legacy overlay's watchers (e.g. the interview promo) know the intro settled
        document.getElementById('intro-overlay')?.classList.add('intro-idle')
      }

      await sleep(1100, id)
      caret.classList.remove('show')
      await sleep(1800, id)
      meta.classList.remove('show')
    } catch (err) {
      thinking = false
      if (err !== CANCELLED) throw err
    }
  }

  // prototype review controls
  const ctl = document.getElementById('stream-ctl')
  const syncSpeed = () =>
    ctl?.querySelectorAll<HTMLButtonElement>('[data-speed]').forEach((b) => {
      b.setAttribute('aria-pressed', String(Number(b.dataset.speed) === speed))
    })
  ctl?.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('button')
    if (!btn) return
    if (btn.dataset.speed) speed = Number(btn.dataset.speed)
    syncSpeed()
    window.scrollTo({ top: 0 })
    void play()
  })
  syncSpeed()

  // ?debug: frame-by-frame handle for inspecting the denoise steps
  if (params.has('debug')) {
    Object.assign(window, {
      __streamIntro: { canvas, steps: STEPS, render: (k: number) => render(k < 0 ? { r: GRID, s: 0 } : STEPS[k]) }
    })
  }

  void play()
}

function collectUnits(hero: HTMLElement | null | undefined): Unit[] {
  if (!hero) return []
  return Array.from(hero.querySelectorAll<HTMLElement>('[data-stream]')).map((el) => {
    const kind = el.dataset.stream
    const icon = el.querySelector<SVGElement>(':scope > svg')
    icon?.classList.add('stream-tok', 'stream-icon')
    const items = tokenize(el, kind === 'name' ? 'char' : 'word')
    return {
      el,
      items: icon ? [icon as unknown as HTMLElement, ...items] : items,
      rate: kind === 'name' ? 65 : 40
    }
  })
}

// wraps each text chunk in a span; whitespace stays as plain text between them
function tokenize(el: HTMLElement, mode: 'char' | 'word') {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  while (walker.nextNode()) nodes.push(walker.currentNode as Text)
  const tokens: HTMLElement[] = []
  for (const node of nodes) {
    if (!node.data.trim()) continue
    const frag = document.createDocumentFragment()
    for (const part of node.data.split(/(\s+)/)) {
      if (!part) continue
      if (!part.trim()) {
        frag.append(part)
        continue
      }
      for (const piece of mode === 'char' ? Array.from(part) : subwords(part)) {
        const span = document.createElement('span')
        span.className = 'stream-tok'
        span.textContent = piece
        frag.append(span)
        tokens.push(span)
      }
    }
    node.replaceWith(frag)
  }
  return tokens
}

// crude BPE stand-in: split CamelCase + trailing punctuation, then halve long words
function subwords(word: string) {
  const [, core = word, punct = ''] = word.match(/^(.*?)([,.!?:;]*)$/) ?? []
  const out: string[] = []
  for (const part of core.match(/[A-Z]?[^A-Z]+|[A-Z]+/g) ?? [core]) {
    if (part.length > 6) out.push(part.slice(0, 3), part.slice(3))
    else out.push(part)
  }
  if (punct) out.push(punct)
  return out
}

function gauss() {
  const u = 1 - Math.random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * Math.random())
}

function parseRgb(color: string): [number, number, number] {
  const [r = 0, g = 0, b = 0] = (color.match(/\d+(\.\d+)?/g) ?? []).map(Number)
  return [r, g, b]
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n))
}

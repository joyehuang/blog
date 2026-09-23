/**
 * Rasterizes whatever is in the viewport into its "source" form: the same
 * layout drawn in monospace — text at its real positions, headings with their
 * markdown `#`, links in the accent, bordered boxes as box-drawing frames,
 * images as ASCII. It reads the live DOM, so any page can be un-rendered.
 */

export type Glyph = { x: number; y: number; ch: string }

export type SourceLayer = {
  canvas: HTMLCanvasElement
  /** every drawn glyph centre, sorted by y — used to "decode" along the render front */
  glyphs: Glyph[]
  bg: string
}

const MONO = '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace'
const RAMP = ' .·:-=+*%#@'

export function rasterize(skip: string): SourceLayer {
  const W = window.innerWidth
  const H = window.innerHeight
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(W * dpr)
  canvas.height = Math.round(H * dpr)
  const ctx = canvas.getContext('2d')!
  ctx.scale(dpr, dpr)

  const rootStyle = getComputedStyle(document.documentElement)
  const tone = (name: string, a = 1) => `hsl(${rootStyle.getPropertyValue(name).trim()} / ${a})`
  const bg = getComputedStyle(document.body).backgroundColor
  const dark = document.documentElement.classList.contains('dark')
  const inView = (r: DOMRect) =>
    r.width > 0 && r.bottom > 0 && r.top < H && r.right > 0 && r.left < W

  // what the user can actually see of an element: ancestors that clip (overflow) or hide (opacity 0)
  const clips = new Map<Element, DOMRect | null>()
  const clipOf = (el: Element | null): DOMRect | null => {
    if (!el || el === document.body) return new DOMRect(0, 0, W, H)
    if (clips.has(el)) return clips.get(el)!
    let clip = clipOf(el.parentElement)
    const cs = getComputedStyle(el)
    if (clip && Number(cs.opacity) === 0) clip = null
    if (clip && cs.overflow !== 'visible') {
      const r = el.getBoundingClientRect()
      const x = Math.max(clip.left, r.left)
      const y = Math.max(clip.top, r.top)
      const w = Math.min(clip.right, r.right) - x
      const h = Math.min(clip.bottom, r.bottom) - y
      clip = w > 0 && h > 0 ? new DOMRect(x, y, w, h) : null
    }
    clips.set(el, clip)
    return clip
  }
  const visibleAt = (el: Element, x: number, y: number) => {
    const c = clipOf(el)
    return !!c && x >= c.left && x <= c.right && y >= c.top && y <= c.bottom
  }

  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)
  ctx.textBaseline = 'middle'
  const glyphs: Glyph[] = []
  const put = (
    x: number,
    y: number,
    ch: string,
    font: string,
    color: string,
    align: CanvasTextAlign = 'center'
  ) => {
    ctx.font = font
    ctx.fillStyle = color
    ctx.textAlign = align
    ctx.fillText(ch, x, y)
    glyphs.push({ x, y, ch })
  }

  // images → ASCII (density from luminance, tinted by the pixel; the photo's own backdrop is dropped)
  for (const img of Array.from(document.images)) {
    if (img.closest(skip) || !img.complete || !img.naturalWidth) continue
    const r = img.getBoundingClientRect()
    if (!inView(r) || !visibleAt(img, r.left + r.width / 2, r.top + r.height / 2)) continue
    const size = 4.6
    const cw = size * 0.62
    const cols = Math.floor(r.width / cw)
    const rows = Math.floor(r.height / size)
    const oc = document.createElement('canvas')
    oc.width = cols
    oc.height = rows
    const o = oc.getContext('2d', { willReadFrequently: true })!
    o.imageSmoothingQuality = 'high'
    o.drawImage(img, 0, 0, cols, rows)
    const d = o.getImageData(0, 0, cols, rows).data
    const ref = [d[0], d[1], d[2]]
    const round = parseFloat(getComputedStyle(img).borderTopLeftRadius) >= r.width / 2 - 1
    const font = `500 ${size}px ${MONO}`
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const nx = (x + 0.5) / cols - 0.5
        const ny = (y + 0.5) / rows - 0.5
        if (round && nx * nx + ny * ny > 0.2) continue
        const i = (y * cols + x) * 4
        if (Math.hypot(d[i] - ref[0], d[i + 1] - ref[1], d[i + 2] - ref[2]) < 38) continue
        const lum = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255
        const k = 0.18 + (dark ? lum : 1 - lum) * 0.82
        const lift = dark ? 0.35 * (1 - lum) : 0
        const rgb = [d[i], d[i + 1], d[i + 2]].map((c) => Math.round(c + (255 - c) * lift))
        const ch = RAMP[Math.max(1, Math.round(k * (RAMP.length - 1)))]
        put(r.left + (x + 0.5) * cw, r.top + (y + 0.5) * size, ch, font, `rgb(${rgb.join(',')})`)
      }
    }
    if (round) {
      // the avatar ring, dotted
      const R = r.width / 2
      const cx = r.left + R
      const cy = r.top + R
      const n = Math.round((Math.PI * 2 * R) / 7)
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2
        put(
          cx + Math.cos(a) * (R - 1),
          cy + Math.sin(a) * (R - 1),
          '·',
          `400 9px ${MONO}`,
          tone('--muted-foreground', 0.55)
        )
      }
    }
  }

  // text → monospace glyphs centred on each real character
  const range = document.createRange()
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  const headings = new Set<Element>()
  while (walker.nextNode()) {
    const node = walker.currentNode as Text
    if (!node.data.trim()) continue
    const el = node.parentElement
    if (!el || el.closest(skip) || el.closest('.sr-only')) continue
    const cs = getComputedStyle(el)
    if (cs.visibility === 'hidden' || Number(cs.opacity) === 0) continue
    const box = el.getBoundingClientRect()
    if (box.width < 3 || box.height < 3) continue
    const heading = el.closest('h1,h2,h3,h4')
    const link = el.closest('a,button')
    const color = heading
      ? tone('--foreground', 0.92)
      : link
        ? tone('--primary', 0.9)
        : tone('--muted-foreground', 0.72)
    const size = Math.max(9, Math.round(parseFloat(cs.fontSize) * 0.8))
    const font = `${heading ? 600 : 400} ${size}px ${MONO}`
    for (let i = 0; i < node.data.length; i++) {
      if (/\s/.test(node.data[i])) continue
      range.setStart(node, i)
      range.setEnd(node, i + 1)
      const r = range.getBoundingClientRect()
      if (!inView(r)) continue
      const y = r.top + r.height / 2
      if (!visibleAt(el, r.left + r.width / 2, y)) continue
      if (heading && !headings.has(heading)) {
        headings.add(heading)
        const hashes = '#'.repeat(Number(heading.tagName[1]))
        put(
          r.left - size * 0.9,
          y,
          hashes,
          `400 ${size}px ${MONO}`,
          tone('--primary', 0.75),
          'right'
        )
      }
      put(r.left + r.width / 2, y, node.data[i], font, color)
    }
  }

  // icons → one glyph each
  for (const svg of Array.from(document.querySelectorAll('svg'))) {
    if (svg.closest(skip)) continue
    const r = svg.getBoundingClientRect()
    if (
      r.width < 10 ||
      r.width > 40 ||
      !inView(r) ||
      !visibleAt(svg, r.left + r.width / 2, r.top + r.height / 2)
    )
      continue
    put(r.left + r.width / 2, r.top + r.height / 2, '◇', `400 12px ${MONO}`, tone('--primary', 0.8))
  }

  // bordered boxes → box-drawing frames; pill-sized ones → [ brackets ]
  const frameFont = `400 11px ${MONO}`
  ctx.font = frameFont
  const cw = ctx.measureText('─').width
  for (const el of Array.from(document.querySelectorAll<HTMLElement>('body *'))) {
    if (el.closest(skip) || el.tagName === 'IMG' || el.tagName === 'CANVAS') continue
    const cs = getComputedStyle(el)
    if (
      !parseFloat(cs.borderTopWidth) ||
      cs.borderTopStyle === 'none' ||
      /, 0\)$/.test(cs.borderTopColor)
    )
      continue
    const r = el.getBoundingClientRect()
    if (
      r.width < 40 ||
      r.height < 24 ||
      !inView(r) ||
      !visibleAt(el, r.left + r.width / 2, r.top + r.height / 2)
    )
      continue
    const cy = r.top + r.height / 2
    if (r.height < 48) {
      const font = `300 ${Math.min(20, Math.round(r.height * 0.62))}px ${MONO}`
      put(r.left + 6, cy, '[', font, tone('--primary', 0.7))
      put(r.right - 6, cy, ']', font, tone('--primary', 0.7))
      continue
    }
    const color = tone('--muted-foreground', 0.45)
    const n = Math.max(2, Math.round(r.width / cw))
    const step = (r.width - cw) / (n - 1)
    for (let i = 0; i < n; i++) {
      const x = r.left + cw / 2 + i * step
      put(x, r.top + 4, i === 0 ? '╭' : i === n - 1 ? '╮' : '─', frameFont, color)
      put(x, r.bottom - 4, i === 0 ? '╰' : i === n - 1 ? '╯' : '─', frameFont, color)
    }
    const m = Math.max(1, Math.round(r.height / 13))
    for (let j = 1; j < m; j++) {
      const y = r.top + 4 + (j * (r.height - 8)) / m
      put(r.left + cw / 2, y, '│', frameFont, color)
      put(r.left + cw / 2 + (n - 1) * step, y, '│', frameFont, color)
    }
  }

  glyphs.sort((a, b) => a.y - b.y)
  return { canvas, glyphs, bg }
}

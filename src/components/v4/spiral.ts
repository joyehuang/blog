/**
 * Deterministic Archimedean spiral with a hand-drawn wobble.
 *
 * The v4 landing page uses one continuous outward-expanding line as its central
 * image: a loop that never closes, which is the shape of both the growth loop
 * and the "工程的对象一直在向外扩" diagram. Generated at build time so the hero
 * renders and animates without any client JavaScript.
 */

export type SpiralNode = {
  /** Position along the spiral, 0 (centre) → 1 (outer end). */
  t: number
  x: number
  y: number
  /** Angle of the outward normal in degrees, for radiating labels. */
  angle: number
}

export type Spiral = {
  /** SVG path data for the main line. */
  d: string
  /** Approximate path length, used to drive the stroke-dashoffset draw-in. */
  length: number
  size: number
  center: number
  nodes: SpiralNode[]
}

/** Small seeded PRNG so the wobble is identical on every build. */
const mulberry32 = (seed: number) => () => {
  seed |= 0
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

type BuildOptions = {
  size?: number
  turns?: number
  innerRadius?: number
  outerRadius?: number
  steps?: number
  /** Positions (0–1) along the spiral where milestone dots sit. */
  nodeAt?: number[]
  seed?: number
}

export function buildSpiral({
  size = 720,
  turns = 3.35,
  innerRadius = 16,
  outerRadius = 322,
  steps = 620,
  nodeAt = [],
  seed = 20250701
}: BuildOptions = {}): Spiral {
  const center = size / 2
  const thetaMax = turns * Math.PI * 2
  const growth = (outerRadius - innerRadius) / thetaMax

  // Three offset sine waves give the line an inked, slightly unsteady edge
  // without ever crossing itself.
  const rand = mulberry32(seed)
  const waves = [
    { amp: 2.6, freq: 1.7, phase: rand() * Math.PI * 2 },
    { amp: 1.4, freq: 4.3, phase: rand() * Math.PI * 2 },
    { amp: 0.7, freq: 9.1, phase: rand() * Math.PI * 2 }
  ]

  const pointAt = (t: number) => {
    const theta = t * thetaMax
    const wobble = waves.reduce((sum, w) => sum + w.amp * Math.sin(theta * w.freq + w.phase), 0)
    // Taper the wobble in from the centre so the core stays tight.
    const r = innerRadius + growth * theta + wobble * Math.min(1, t * 4)
    // Rotate the start so the outer end finishes at the upper right.
    const a = theta - Math.PI * 0.62
    return {
      x: center + Math.cos(a) * r,
      y: center + Math.sin(a) * r,
      angle: (a * 180) / Math.PI
    }
  }

  const round = (n: number) => Math.round(n * 10) / 10

  let d = ''
  let length = 0
  let prev: { x: number; y: number } | null = null

  for (let i = 0; i <= steps; i++) {
    const p = pointAt(i / steps)
    d += `${i === 0 ? 'M' : 'L'}${round(p.x)} ${round(p.y)}`
    if (prev) length += Math.hypot(p.x - prev.x, p.y - prev.y)
    prev = p
  }

  const nodes = nodeAt.map((t) => ({ t, ...pointAt(t) }))

  return { d, length: Math.round(length), size, center, nodes }
}

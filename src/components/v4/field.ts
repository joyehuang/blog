/**
 * The signal field — a hand-written WebGL fragment shader that sits behind the
 * whole v4 page. No 3D library: one full-screen triangle, one program.
 *
 * Three wave sources (one of them the pointer) interfere across a domain-warped
 * fBm field. Where the waves reinforce, fringes light up in `--primary`; where
 * they cancel, the page background shows through. It reads the live theme
 * tokens, so it recolours itself with the site's light/dark switch.
 */

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`

const FRAG = `
precision highp float;

uniform vec2  uRes;
uniform float uTime;
uniform vec2  uPointer;   // -1..1, y up
uniform float uEnergy;    // 0..1, rises on pointer movement
uniform float uScroll;    // 0..1 through the page
uniform vec3  uBase;      // --background
uniform vec3  uInk;       // --foreground
uniform vec3  uAccent;    // --primary
uniform float uDark;      // 1.0 in dark mode

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float t = uTime * 0.055;

  // Two rounds of domain warping give the field its slow, liquid drift.
  vec2 q = vec2(fbm(uv * 1.35 + t), fbm(uv * 1.35 + vec2(4.2, 1.3) - t));
  vec2 r = vec2(
    fbm(uv * 1.35 + 2.6 * q + vec2(1.7, 9.2) + 0.14 * t),
    fbm(uv * 1.35 + 2.6 * q + vec2(8.3, 2.8) - 0.11 * t)
  );
  float warp = fbm(uv * 1.35 + 3.0 * r);

  // Three coherent sources. The third one tracks the pointer, so moving the
  // mouse literally adds a wave to the field.
  vec2 s1 = vec2(-0.86, 0.34);
  vec2 s2 = vec2(0.88, -0.28);
  float w =
      sin(length(uv - s1) * 17.0 - uTime * 0.85)
    + sin(length(uv - s2) * 14.0 + uTime * 0.70)
    + sin(length(uv - uPointer) * 21.0 - uTime * 1.35) * (0.65 + uEnergy * 0.85);
  w /= 3.0;

  // Interference fringes riding on the warped field.
  float field = w * 0.62 + (warp - 0.5) * 2.1 - uScroll * 0.55;
  float fringe = abs(fract(field * 2.2) - 0.5) * 2.0;
  fringe = smoothstep(0.42, 1.0, fringe);
  fringe = pow(fringe, 1.7);

  // A broad, soft glow so the fringes sit inside something rather than floating.
  float bloom = smoothstep(0.25, 0.95, warp + w * 0.25);

  float pointerGlow = exp(-length(uv - uPointer) * 3.2) * (0.25 + uEnergy * 0.55);

  // Light mode needs a stronger push: its accent is a muted mid-tone against an
  // almost-white base, so the same coefficients that glow in dark mode vanish.
  vec3 col = uBase;
  col = mix(col, mix(uBase, uAccent, 0.62), bloom * (0.46 + uDark * 0.12));
  col = mix(col, uAccent, fringe * (0.34 + uDark * 0.16));
  col += uAccent * pointerGlow * (0.12 + uDark * 0.20);

  // Keep the very fine detail from clipping to pure accent in light mode.
  col = mix(col, uInk, fringe * bloom * 0.05 * (1.0 - uDark));

  // Vignette, plus a little dithering so wide gradients do not band.
  float vig = 1.0 - smoothstep(0.55, 1.45, length(uv * vec2(0.85, 1.0)));
  col = mix(uBase, col, 0.28 + 0.72 * vig);
  col += (hash(gl_FragCoord.xy + fract(uTime)) - 0.5) * 0.012;

  gl_FragColor = vec4(col, 1.0);
}
`

type Uniforms = Record<string, WebGLUniformLocation | null>

const compile = (gl: WebGLRenderingContext, type: number, source: string) => {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader)
    return null
  }
  return shader
}

/** `rgb(12, 34, 56)` → `[0.047, 0.133, 0.219]` */
const parseRgb = (value: string): [number, number, number] => {
  const parts = value.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0]
  return [(parts[0] ?? 0) / 255, (parts[1] ?? 0) / 255, (parts[2] ?? 0) / 255]
}

export type SignalField = {
  /** 0 pauses the render loop entirely. */
  setOpacity: (value: number) => void
  setScroll: (value: number) => void
  destroy: () => void
}

export function createSignalField(canvas: HTMLCanvasElement, reduced: boolean): SignalField | null {
  const gl = (canvas.getContext('webgl', {
    alpha: false,
    antialias: false,
    powerPreference: 'high-performance'
  }) ?? canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null
  if (!gl) return null

  const vert = compile(gl, gl.VERTEX_SHADER, VERT)
  const frag = compile(gl, gl.FRAGMENT_SHADER, FRAG)
  if (!vert || !frag) return null

  const program = gl.createProgram()
  if (!program) return null
  gl.attachShader(program, vert)
  gl.attachShader(program, frag)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null
  gl.useProgram(program)

  // One oversized triangle covers the viewport with no index buffer.
  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const aPos = gl.getAttribLocation(program, 'aPos')
  gl.enableVertexAttribArray(aPos)
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

  const u: Uniforms = {}
  for (const name of [
    'uRes',
    'uTime',
    'uPointer',
    'uEnergy',
    'uScroll',
    'uBase',
    'uInk',
    'uAccent',
    'uDark'
  ]) {
    u[name] = gl.getUniformLocation(program, name)
  }

  /* --- theme colours, read straight off the live tokens --- */

  const probe = document.createElement('span')
  probe.style.cssText = 'position:absolute;opacity:0;pointer-events:none'
  document.body.appendChild(probe)

  const readToken = (token: string): [number, number, number] => {
    probe.style.color = `hsl(var(${token}))`
    return parseRgb(getComputedStyle(probe).color)
  }

  let theme = {
    base: [0, 0, 0] as [number, number, number],
    ink: [1, 1, 1] as [number, number, number],
    accent: [0, 0.5, 0.6] as [number, number, number],
    dark: 0
  }

  const syncTheme = () => {
    theme = {
      base: readToken('--background'),
      ink: readToken('--foreground'),
      accent: readToken('--primary'),
      dark: document.documentElement.classList.contains('dark') ? 1 : 0
    }
  }
  syncTheme()

  /* --- pointer --- */

  const pointer = { x: 0.35, y: 0.15, tx: 0.35, ty: 0.15, energy: 0 }

  const onPointerMove = (event: PointerEvent) => {
    pointer.tx = (event.clientX / window.innerWidth) * 2 - 1
    pointer.ty = -((event.clientY / window.innerHeight) * 2 - 1)
    pointer.ty *= window.innerHeight / window.innerWidth < 1 ? 1 : 1
    pointer.energy = 1
  }
  window.addEventListener('pointermove', onPointerMove, { passive: true })

  /* --- sizing --- */

  // Full-screen noise is fill-rate bound, so cap the pixel ratio hard.
  const dpr = () => Math.min(window.devicePixelRatio || 1, 1.5)

  const resize = () => {
    const w = Math.floor(window.innerWidth * dpr())
    const h = Math.floor(window.innerHeight * dpr())
    if (canvas.width === w && canvas.height === h) return
    canvas.width = w
    canvas.height = h
    gl.viewport(0, 0, w, h)
  }
  resize()
  window.addEventListener('resize', resize, { passive: true })

  /* --- loop --- */

  let raf = 0
  let running = false
  let scroll = 0
  const start = performance.now()

  const draw = (now: number) => {
    // Reduced motion renders a single frame from a fixed point on the timeline.
    const time = reduced ? 12 : (now - start) / 1000

    // Ease the pointer so the wave source trails the cursor instead of snapping.
    pointer.x += (pointer.tx - pointer.x) * 0.06
    pointer.y += (pointer.ty - pointer.y) * 0.06
    pointer.energy *= 0.94

    gl.uniform2f(u.uRes, canvas.width, canvas.height)
    gl.uniform1f(u.uTime, time)
    gl.uniform2f(u.uPointer, pointer.x * (canvas.width / canvas.height), pointer.y)
    gl.uniform1f(u.uEnergy, reduced ? 0 : pointer.energy)
    gl.uniform1f(u.uScroll, scroll)
    gl.uniform3fv(u.uBase, theme.base)
    gl.uniform3fv(u.uInk, theme.ink)
    gl.uniform3fv(u.uAccent, theme.accent)
    gl.uniform1f(u.uDark, theme.dark)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  const loop = (now: number) => {
    draw(now)
    raf = requestAnimationFrame(loop)
  }

  const play = () => {
    if (running || reduced) return
    running = true
    raf = requestAnimationFrame(loop)
  }

  const stop = () => {
    running = false
    cancelAnimationFrame(raf)
  }

  // Paint one frame synchronously: the canvas composites as cleared black until
  // the first rAF, which flashes on a light background — and never resolves at
  // all if the tab starts hidden.
  draw(performance.now())
  play()

  // A theme flip while paused still needs a repaint.
  const repaintingWatcher = new MutationObserver(() => {
    syncTheme()
    if (!running) draw(performance.now())
  })
  repaintingWatcher.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class']
  })

  return {
    setOpacity(value) {
      canvas.style.opacity = String(value)
      if (value <= 0.01) stop()
      else play()
    },
    setScroll(value) {
      scroll = value
      if (!running) draw(performance.now())
    },
    destroy() {
      stop()
      repaintingWatcher.disconnect()
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('resize', resize)
      probe.remove()
    }
  }
}

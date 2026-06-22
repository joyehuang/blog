/**
 * Intro Cinematic — "Embedding Space Dive"
 *
 * A 3D journey through a concept-space (Agent / LLM / Code / RAG clusters)
 * connected by attention lines, culminating in the tokens converging into
 * the author's avatar silhouette.
 *
 * Phases (~11s total):
 *   1  BOOT         0   ~ 1.5s   "initializing joye@mind..." terminal line
 *   2  DIVE         1.5 ~ 5.0s   camera dives into the cluster cloud,
 *                                 tokens light up, attention pulses flow
 *   3  CONVERGE     5.0 ~ 8.0s   tokens fall toward the global center,
 *                                 clusters dissolve
 *   4  MATERIALIZE  8.0 ~ 9.5s   tokens lerp onto the avatar silhouette
 *   5  REVEAL       9.5 ~ 11s    overlay dissolves, hero zooms in
 */

import gsap from 'gsap'
import * as THREE from 'three'

const SKIP =
  document.documentElement.classList.contains('intro-skip') ||
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

if (!SKIP) {
  void runIntro().catch((err) => {
    if (import.meta.env.DEV) {
      try {
        localStorage.setItem(
          'intro-last-error',
          `[${new Date().toISOString()}] ${err instanceof Error ? err.stack || err.message : String(err)}`
        )
      } catch {}
    }
    console.warn('[intro] aborted:', err)
    revealImmediately()
  })
}

// === Concept clusters — each represents a domain of the author's work ===
type Cluster = {
  name: string
  center: [number, number, number]
  color: THREE.Color
  /** Number of tokens in this cluster (rest are ambient). */
  tokenCount: number
}

const PRIMARY = new THREE.Color('#7BB8D4') // lightened primary blue (good on dark)
const ACCENT_AGENT = new THREE.Color('#9CCADD')
const ACCENT_LLM = new THREE.Color('#B8D4E2')
const ACCENT_CODE = new THREE.Color('#8FB3C7')
const ACCENT_RAG = new THREE.Color('#6E96B0')

const CLUSTERS: Cluster[] = [
  {
    name: 'Agent',
    center: [-9, 3, -2],
    color: ACCENT_AGENT,
    tokenCount: 22
  },
  {
    name: 'LLM',
    center: [7, 4, -4],
    color: ACCENT_LLM,
    tokenCount: 22
  },
  {
    name: 'Code',
    center: [-5, -5, 4],
    color: ACCENT_CODE,
    tokenCount: 22
  },
  {
    name: 'RAG',
    center: [8, -3, 2],
    color: ACCENT_RAG,
    tokenCount: 22
  }
]

const AMBIENT_COUNT = 220 // free-floating points scattered across the scene

async function runIntro() {
  const overlay = document.getElementById('intro-overlay')
  const canvas = document.getElementById('intro-canvas') as HTMLCanvasElement | null
  if (!overlay || !canvas) {
    revealImmediately()
    return
  }

  // === Renderer ===
  const isMobile = window.matchMedia('(max-width: 768px)').matches
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: !isMobile
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))

  const resize = () => {
    renderer.setSize(window.innerWidth, window.innerHeight, false)
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
  }

  // === Scene + Camera ===
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(
    62,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  )
  // far away initially — dive begins from here
  camera.position.set(0, 1.5, 26)
  camera.lookAt(0, 0, 0)
  resize()
  window.addEventListener('resize', resize)

  // === Resolve avatar silhouette target points ===
  const targetPoints = await loadSilhouettePoints(overlay.dataset.avatar || '')
  const realAvatar =
    (document.querySelector('#content-header img') as HTMLImageElement | null) ??
    (document.querySelector('main img[alt="profile"]') as HTMLImageElement | null)
  const avatarRect = realAvatar?.getBoundingClientRect()

  // Map silhouette sample coords ([-110, 110]) into NDC, then into the 3D
  // plane at z=0 such that the assembled silhouette lands exactly over the
  // real hero <img> when the camera is at its reveal position.
  const revealCamZ = 11
  const revealFov = camera.fov
  const revealHalfH = Math.tan((revealFov * Math.PI) / 360) * revealCamZ
  const revealHalfW = revealHalfH * camera.aspect
  // Map viewport pixel → world unit at z=0 from reveal camera.
  const pxToNdcX = (pxX: number) => (pxX / window.innerWidth) * 2 - 1
  const pxToNdcY = (pxY: number) =>
    -((pxY / window.innerHeight) * 2 - 1) // flip Y (WebGL Y up)
  const avatarCenterNdcX = avatarRect
    ? pxToNdcX(avatarRect.left + avatarRect.width / 2)
    : 0
  const avatarCenterNdcY = avatarRect
    ? pxToNdcY(avatarRect.top + avatarRect.height / 2)
    : 0
  const avatarCenterWorldX = avatarCenterNdcX * revealHalfW
  const avatarCenterWorldY = avatarCenterNdcY * revealHalfH
  // Fixed silhouette size in world units — independent of how much of the
  // 220x220 sample grid the avatar actually fills. The particle avatar is
  // intentionally larger than the real <img> (collapses/hands off on reveal).
  // At z=0 viewed from z=11 with fov=62, the viewport is ~20 world units wide,
  // so 6.5 gives a silhouette that fills ~33% of the viewport width.
  const silhouetteWorldSize = Math.min(revealHalfW, revealHalfH) * 1.3
  const scaleFactor = silhouetteWorldSize / 220

  // === Build per-token data ===
  type TokenData = {
    // initial cluster-relative position (used during DIVE)
    home: THREE.Vector3
    // target on the avatar silhouette (used during MATERIALIZE)
    target: THREE.Vector3
    hasTarget: boolean
    clusterIdx: number
    // phase weights (0..1) used by shader to fade in / converge
    fadeIn: number
    converge: number
    materialize: number
  }

  const tokenData: TokenData[] = []

  // Cluster tokens
  CLUSTERS.forEach((cluster, ci) => {
    for (let i = 0; i < cluster.tokenCount; i++) {
      // distribute within a sphere of radius 2.6 around cluster center
      const r = 0.4 + Math.random() * 2.2
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const home = new THREE.Vector3(
        cluster.center[0] + r * Math.sin(phi) * Math.cos(theta),
        cluster.center[1] + r * Math.sin(phi) * Math.sin(theta),
        cluster.center[2] + r * Math.cos(phi) * 0.7
      )
      tokenData.push({
        home: home,
        target: new THREE.Vector3(),
        hasTarget: false,
        clusterIdx: ci,
        fadeIn: 0,
        converge: 0,
        materialize: 0
      })
    }
  })
  // Ambient tokens scattered across the whole scene
  for (let i = 0; i < AMBIENT_COUNT; i++) {
    const home = new THREE.Vector3(
      (Math.random() - 0.5) * 30,
      (Math.random() - 0.5) * 18,
      (Math.random() - 0.5) * 14 - 2
    )
    tokenData.push({
      home,
      target: new THREE.Vector3(),
      hasTarget: false,
      clusterIdx: -1,
      fadeIn: 0,
      converge: 0,
      materialize: 0
    })
  }

  // Assign avatar silhouette targets to the first N tokens (cluster ones
  // preferred so the silhouette feels meaningful, not random).
  // Spread targets across all clusters proportionally so each contributes.
  const targetAssignmentOrder: number[] = []
  // round-robin across clusters
  const perCluster = Math.min(
    Math.ceil(targetPoints.length / CLUSTERS.length),
    CLUSTERS[0].tokenCount
  )
  for (let i = 0; i < perCluster; i++) {
    CLUSTERS.forEach((_c, ci) => {
      const tokenIdx = ci * CLUSTERS[0].tokenCount + i
      if (tokenIdx < tokenData.length) targetAssignmentOrder.push(tokenIdx)
    })
  }
  targetPoints.forEach((pt, i) => {
    const tokenIdx = targetAssignmentOrder[i] ?? i
    const t = tokenData[tokenIdx]
    if (!t) return
    t.hasTarget = true
    t.target.set(
      avatarCenterWorldX + pt.x * scaleFactor,
      avatarCenterWorldY + pt.y * scaleFactor,
      0
    )
  })

  // === Token points — BufferGeometry + Points with custom shader ===
  // Each token is one vertex; the vertex shader computes its position from
  // home/converge/materialize states, and the fragment shader paints a soft
  // glowing dot (much more reliable than InstancedMesh + InstancedBufferAttribute).
  const TOKEN_COUNT = tokenData.length
  const tokenPositions = new Float32Array(TOKEN_COUNT * 3) // placeholder — shader ignores via position
  const tokenHomes = new Float32Array(TOKEN_COUNT * 3)
  const tokenTargets = new Float32Array(TOKEN_COUNT * 3)
  const tokenColors = new Float32Array(TOKEN_COUNT * 3)
  const tokenFadeIns = new Float32Array(TOKEN_COUNT)
  const tokenConverges = new Float32Array(TOKEN_COUNT)
  const tokenMaterializes = new Float32Array(TOKEN_COUNT)

  for (let i = 0; i < TOKEN_COUNT; i++) {
    const t = tokenData[i]
    // position attribute is required by THREE.Points but the vertex shader
    // overrides gl_Position from custom attributes, so we just use home.
    tokenPositions[i * 3] = t.home.x
    tokenPositions[i * 3 + 1] = t.home.y
    tokenPositions[i * 3 + 2] = t.home.z
    tokenHomes[i * 3] = t.home.x
    tokenHomes[i * 3 + 1] = t.home.y
    tokenHomes[i * 3 + 2] = t.home.z
    tokenTargets[i * 3] = t.target.x
    tokenTargets[i * 3 + 1] = t.target.y
    tokenTargets[i * 3 + 2] = t.target.z
    const col = t.clusterIdx >= 0 ? CLUSTERS[t.clusterIdx].color : PRIMARY
    tokenColors[i * 3] = col.r
    tokenColors[i * 3 + 1] = col.g
    tokenColors[i * 3 + 2] = col.b
    tokenFadeIns[i] = 0
    tokenConverges[i] = 0
    tokenMaterializes[i] = 0
  }

  const tokenGeo = new THREE.BufferGeometry()
  tokenGeo.setAttribute('position', new THREE.BufferAttribute(tokenPositions, 3))
  tokenGeo.setAttribute('aHome', new THREE.BufferAttribute(tokenHomes, 3))
  tokenGeo.setAttribute('aTarget', new THREE.BufferAttribute(tokenTargets, 3))
  tokenGeo.setAttribute('aColor', new THREE.BufferAttribute(tokenColors, 3))
  tokenGeo.setAttribute('aFadeIn', new THREE.BufferAttribute(tokenFadeIns, 1))
  tokenGeo.setAttribute('aConverge', new THREE.BufferAttribute(tokenConverges, 1))
  tokenGeo.setAttribute('aMaterialize', new THREE.BufferAttribute(tokenMaterializes, 1))

  const tokenMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
      uDiveCamZ: { value: 26 },
      uRevealCamZ: { value: revealCamZ }
    },
    vertexShader: /* glsl */ `
      attribute vec3 aHome;
      attribute vec3 aTarget;
      attribute vec3 aColor;
      attribute float aFadeIn;
      attribute float aConverge;
      attribute float aMaterialize;
      uniform float uTime;
      uniform float uPixelRatio;
      varying vec3 vColor;
      varying float vGlow;

      void main() {
        // 3 states: home -> converge center -> avatar target.
        vec3 convergePos = vec3(0.0) + 0.5 * normalize(aHome);
        vec3 afterConverge = mix(aHome, convergePos, aConverge);
        vec3 finalPos = mix(afterConverge, aTarget, aMaterialize);

        // gentle breathing
        finalPos += 0.05 * vec3(
          sin(uTime * 0.6 + finalPos.y * 0.7),
          cos(uTime * 0.5 + finalPos.x * 0.6),
          sin(uTime * 0.4 + finalPos.z * 0.5)
        );

        vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
        gl_Position = projectionMatrix * mvPosition;

        // size attenuates with distance — bigger when closer.
        float size = 5.5 + 4.0 * aFadeIn;
        gl_PointSize = size * uPixelRatio * (24.0 / max(1.0, -mvPosition.z));
        vColor = aColor;
        vGlow = clamp(aFadeIn, 0.0, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      varying float vGlow;
      void main() {
        vec2 uv = gl_PointCoord - vec2(0.5);
        float d = length(uv);
        if (d > 0.5) discard;
        // soft round dot with a hot core
        float core = smoothstep(0.5, 0.0, d);
        float glow = smoothstep(0.5, 0.15, d);
        float intensity = core * core + glow * 0.4;
        gl_FragColor = vec4(vColor * (1.4 + vGlow * 0.7), intensity * vGlow);
      }
    `
  })

  const tokenMesh = new THREE.Points(tokenGeo, tokenMat)
  scene.add(tokenMesh)

  // Keep references to the per-vertex attributes so we can drive them via GSAP.
  const fadeInAttr = tokenGeo.getAttribute('aFadeIn') as THREE.BufferAttribute
  const convergeAttr = tokenGeo.getAttribute('aConverge') as THREE.BufferAttribute
  const materializeAttr = tokenGeo.getAttribute('aMaterialize') as THREE.BufferAttribute

  // === Attention lines (intra-cluster + a few cross-cluster) ===
  const linePositions: number[] = []
  const lineColors: number[] = []
  const lineProgress: number[] = [] // for pulse: progress along the line 0..1 of "head" of pulse
  const lineLen = (a: THREE.Vector3, b: THREE.Vector3) => a.distanceTo(b)
  type Line = { a: number; b: number; pulseOffset: number }
  const lines: Line[] = []

  // Intra-cluster: each token connects to its 2 nearest cluster-mates.
  CLUSTERS.forEach((_cluster, ci) => {
    const clusterTokenIndices: number[] = []
    tokenData.forEach((t, i) => {
      if (t.clusterIdx === ci) clusterTokenIndices.push(i)
    })
    clusterTokenIndices.forEach((i) => {
      const ti = tokenData[i].home
      const distances = clusterTokenIndices
        .filter((j) => j !== i)
        .map((j) => ({ j, d: lineLen(ti, tokenData[j].home) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 2)
      distances.forEach(({ j }) => {
        if (i < j) {
          lines.push({ a: i, b: j, pulseOffset: Math.random() })
        }
      })
    })
  })
  // Cross-cluster: 2 lines between consecutive cluster centers (via their nearest tokens).
  for (let ci = 0; ci < CLUSTERS.length; ci++) {
    const cj = (ci + 1) % CLUSTERS.length
    const ai = tokenData.findIndex((t) => t.clusterIdx === ci)
    const bi = tokenData.findIndex((t) => t.clusterIdx === cj)
    if (ai >= 0 && bi >= 0) {
      lines.push({ a: ai, b: bi, pulseOffset: Math.random() })
      // one more cross link
      const ai2 =
        tokenData.findIndex((t, idx) => t.clusterIdx === ci && idx > ai) ?? ai
      if (ai2 >= 0) lines.push({ a: ai2, b: bi, pulseOffset: Math.random() })
    }
  }

  // Each line is 2 vertices; we'll update positions every frame because
  // token positions are computed in shader (CPU can't easily read them).
  // Trick: we re-evaluate the line endpoints on the CPU side using the
  // same home/converge/target logic as the shader.
  lines.forEach(() => {
    linePositions.push(0, 0, 0, 0, 0, 0)
    lineColors.push(0, 0, 0, 0, 0, 0)
    lineProgress.push(0)
  })
  const lineGeo = new THREE.BufferGeometry()
  lineGeo.setAttribute(
    'position',
    new THREE.BufferAttribute(new Float32Array(linePositions), 3)
  )
  lineGeo.setAttribute(
    'color',
    new THREE.BufferAttribute(new Float32Array(lineColors), 3)
  )
  const lineMat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.45,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })
  const lineSegments = new THREE.LineSegments(lineGeo, lineMat)
  scene.add(lineSegments)

  // State shared between render loop and GSAP.
  const state = {
    fadeInGlobal: 0, // 0..1 drives token fade-in
    convergeGlobal: 0, // 0..1 drives home -> center
    materializeGlobal: 0, // 0..1 drives center -> avatar target
    pulse: 0, // time accumulator for line pulse
    linesActive: 0 // 0..1 drives line opacity
  }

  // Helper to evaluate a token's position based on the current state.
  // Mirrors the vertex-shader math so we can place line endpoints consistently.
  function evalTokenPos(idx: number, out: THREE.Vector3) {
    const t = tokenData[idx]
    const convergePos = new THREE.Vector3(0, 0, 0).add(t.home.clone().normalize().multiplyScalar(0.4))
    const afterConverge = t.home.clone().lerp(convergePos, state.convergeGlobal)
    const finalPos = afterConverge.lerp(t.target, state.materializeGlobal)
    out.copy(finalPos)
  }

  // === Mouse parallax ===
  let mouseX = 0
  let mouseY = 0
  let camOffsetX = 0
  let camOffsetY = 0
  const onPointerMove = (e: PointerEvent) => {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1
    mouseY = -((e.clientY / window.innerHeight) * 2 - 1)
  }
  if (!isMobile) {
    window.addEventListener('pointermove', onPointerMove, { passive: true })
  }

  // === Boot text overlay (Phase 1) ===
  const bootEl = document.createElement('div')
  bootEl.className = 'intro-boot-text'
  bootEl.innerHTML = `<span class="intro-boot-prompt">&gt;</span> <span class="intro-boot-cmd">initializing</span> <span class="intro-boot-arg">joye@mind</span><span class="intro-boot-cursor">▌</span>`
  overlay.appendChild(bootEl)

  // === Render loop ===
  let raf = 0
  const tick = (time: number) => {
    raf = requestAnimationFrame(tick)
    const t = time * 0.001
    tokenMat.uniforms.uTime.value = t

    // smooth camera parallax
    camOffsetX += (mouseX * 0.6 - camOffsetX) * 0.05
    camOffsetY += (mouseY * 0.4 - camOffsetY) * 0.05
    // (parallax applied as small offset on top of GSAP-controlled camera)

    // Update token attributes
    for (let i = 0; i < TOKEN_COUNT; i++) {
      ;(fadeInAttr.array as Float32Array)[i] = state.fadeInGlobal
    }
    fadeInAttr.needsUpdate = true
    for (let i = 0; i < TOKEN_COUNT; i++) {
      ;(convergeAttr.array as Float32Array)[i] = state.convergeGlobal
      ;(materializeAttr.array as Float32Array)[i] = td_hasTarget(tokenData[i])
        ? state.materializeGlobal
        : 0
    }
    convergeAttr.needsUpdate = true
    materializeAttr.needsUpdate = true

    // Update line endpoints + colors
    const linePosAttr = lineGeo.getAttribute('position') as THREE.BufferAttribute
    const lineColAttr = lineGeo.getAttribute('color') as THREE.BufferAttribute
    const tmpA = new THREE.Vector3()
    const tmpB = new THREE.Vector3()
    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i]
      evalTokenPos(ln.a, tmpA)
      evalTokenPos(ln.b, tmpB)
      linePosAttr.array[i * 6] = tmpA.x
      linePosAttr.array[i * 6 + 1] = tmpA.y
      linePosAttr.array[i * 6 + 2] = tmpA.z
      linePosAttr.array[i * 6 + 3] = tmpB.x
      linePosAttr.array[i * 6 + 4] = tmpB.y
      linePosAttr.array[i * 6 + 5] = tmpB.z

      const brightness = 0.4 + 0.6 * state.linesActive
      // simple flicker — both endpoints get same color for now
      const flicker = 0.7 + 0.3 * Math.sin(t * 2 + i)
      const ca = tokenData[ln.a].clusterIdx >= 0
        ? CLUSTERS[tokenData[ln.a].clusterIdx].color
        : PRIMARY
      const cb = tokenData[ln.b].clusterIdx >= 0
        ? CLUSTERS[tokenData[ln.b].clusterIdx].color
        : PRIMARY
      lineColAttr.array[i * 6] = ca.r * brightness * flicker
      lineColAttr.array[i * 6 + 1] = ca.g * brightness * flicker
      lineColAttr.array[i * 6 + 2] = ca.b * brightness * flicker
      lineColAttr.array[i * 6 + 3] = cb.r * brightness * flicker
      lineColAttr.array[i * 6 + 4] = cb.g * brightness * flicker
      lineColAttr.array[i * 6 + 5] = cb.b * brightness * flicker
    }
    linePosAttr.needsUpdate = true
    lineColAttr.needsUpdate = true

    renderer.render(scene, camera)
  }
  raf = requestAnimationFrame(tick)

  function td_hasTarget(t: TokenData) {
    return t.hasTarget
  }

  // === GSAP Timeline ===
  const tl = gsap.timeline({
    onComplete: cleanup,
    onUpdate: () => {}
  })

  // Phase 1: BOOT — boot text fades in and out.
  tl.fromTo(
    bootEl,
    { opacity: 0, y: 8 },
    { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }
  )
  tl.to({}, { duration: 0.6 })
  tl.to(bootEl, { opacity: 0, y: -8, duration: 0.4, ease: 'power2.in' })

  // Phase 2: DIVE — camera swoops into the cluster cloud.
  // First appear tokens (fade in), then attention lines.
  tl.to(state, { fadeInGlobal: 1, duration: 1.4, ease: 'power2.out' }, '<+0.1')
  tl.to(state, { linesActive: 1, duration: 0.8, ease: 'power2.out' }, '<+0.6')
  tl.to(
    camera.position,
    {
      x: 0,
      y: 0,
      z: revealCamZ,
      duration: 3.3,
      ease: 'power3.inOut',
      onUpdate: () => {
        // Keep the camera looking at the scene origin so the avatar silhouette
        // (positioned at avatarCenterWorldX/Y) ends up at the same screen
        // location as the real hero <img>.
        camera.lookAt(0, 0, 0)
      }
    },
    '<'
  )

  // Phase 3: CONVERGE — tokens fall toward the global center.
  tl.to(state, {
    convergeGlobal: 1,
    duration: 2.5,
    ease: 'power2.inOut'
  })
  tl.to(state, { linesActive: 0.35, duration: 1.5, ease: 'power2.out' }, '<')

  // Phase 4: MATERIALIZE — tokens lerp onto avatar silhouette targets.
  tl.to(state, {
    materializeGlobal: 1,
    duration: 1.4,
    ease: 'power3.inOut'
  })
  tl.to(state, { linesActive: 0, duration: 0.6, ease: 'power2.out' }, '<')

  // Phase 5: REVEAL — overlay dissolves, hero zooms in.
  tl.to(overlay, {
    opacity: 0,
    duration: 0.6,
    ease: 'power2.inOut',
    onComplete: () => overlay.classList.add('intro-hidden')
  }, '+=0.2')

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
  }, '<+0.08')

  // === Cleanup ===
  let cleaned = false
  function cleanup() {
    if (cleaned) return
    cleaned = true
    clearTimeout(fallback)
    cancelAnimationFrame(raf)
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('resize', resize)
    if (bootEl.parentNode) bootEl.parentNode.removeChild(bootEl)
    renderer.dispose()
    tokenGeo.dispose()
    tokenMat.dispose()
    lineGeo.dispose()
    lineMat.dispose()
    if (overlay) overlay.classList.add('intro-done')
    document.documentElement.classList.remove('intro-active')
    document.documentElement.classList.remove('intro-hidden')
    gsap.set(['#content-header', '#content'], { clearProps: 'all' })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).__introDone = true
    window.dispatchEvent(new CustomEvent('intro:complete'))
  }

  const fallback = setTimeout(() => {
    console.warn('[intro] hard timeout, forcing reveal')
    cleanup()
  }, 16000)

  // Dev hook.
  if (import.meta.env.DEV) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).__intro = {
      state,
      camera,
      scene,
      tl
    }
  }
}

/** Load avatar PNG and sample alpha-channel silhouette points (in [-110, 110]). */
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
  cx.drawImage(img, 0, 0, SIZE, SIZE)
  const data = cx.getImageData(0, 0, SIZE, SIZE).data

  const points: { x: number; y: number }[] = []
  const STEP = 6
  for (let y = 0; y < SIZE; y += STEP) {
    for (let x = 0; x < SIZE; x += STEP) {
      const i = (y * SIZE + x) * 4
      const alpha = data[i + 3]
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3
      if (alpha > 100 && brightness > 60) {
        points.push({ x: x - SIZE / 2, y: y - SIZE / 2 })
      }
    }
  }
  return points
}

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

/**
 * Intro Cinematic — Three.js 3D particle cloud + GSAP reveal.
 *
 * Runs only when:
 *   - the early inline script in IntroOverlay.astro set `intro-active` on <html>
 *   - prefers-reduced-motion is not set
 *
 * Heavy deps (three, gsap) are imported dynamically here so they never enter
 * the first-paint critical path.
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
  const canvas = document.getElementById('intro-canvas') as HTMLCanvasElement | null
  const overlay = document.getElementById('intro-overlay')
  if (!canvas || !overlay) {
    revealImmediately()
    return
  }

  const [THREE, { gsap }] = await Promise.all([
    import('three'),
    import('gsap')
  ])

  const isMobile = window.matchMedia('(max-width: 768px)').matches
  const COUNT = isMobile ? 2200 : 5000
  const PRIMARY = new THREE.Color('#527D94')
  const WARM = new THREE.Color('#D88D72')
  const MINT = new THREE.Color('#86B9A7')
  const BRIGHT = new THREE.Color('#E8EEF2')

  // === Scene setup ===
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: !isMobile
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setClearColor(0x000000, 0)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  )
  camera.position.set(0, 0, 11)

  // === Particle geometry: spherical shell, weighted color palette ===
  const positions = new Float32Array(COUNT * 3)
  const sizes = new Float32Array(COUNT)
  const colors = new Float32Array(COUNT * 3)

  for (let i = 0; i < COUNT; i++) {
    const r = 4 + Math.random() * 5
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
    positions[i * 3 + 2] = r * Math.cos(phi)

    sizes[i] = 0.6 + Math.random() * 1.2

    const rnd = Math.random()
    const c =
      rnd < 0.7 ? PRIMARY : rnd < 0.88 ? WARM : rnd < 0.96 ? MINT : BRIGHT
    colors[i * 3] = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
  geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3))

  // === Shader material: soft round particles with drift + glow ===
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
    },
    vertexShader: /* glsl */ `
      attribute float aSize;
      attribute vec3 aColor;
      uniform float uTime;
      uniform float uPixelRatio;
      varying vec3 vColor;
      void main() {
        vColor = aColor;
        vec3 pos = position;
        // gentle drift — each particle sways based on its own position
        pos.x += sin(uTime * 0.4 + position.y * 0.5) * 0.18;
        pos.y += cos(uTime * 0.3 + position.x * 0.4) * 0.18;
        pos.z += sin(uTime * 0.25 + position.x * 0.3) * 0.10;
        vec4 mv = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aSize * uPixelRatio * (200.0 / -mv.z);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      varying vec3 vColor;
      void main() {
        vec2 uv = gl_PointCoord - vec2(0.5);
        float d = length(uv);
        if (d > 0.5) discard;
        float a = smoothstep(0.5, 0.0, d);
        a *= a;
        gl_FragColor = vec4(vColor, a * uOpacity);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  })

  const particles = new THREE.Points(geometry, material)
  scene.add(particles)

  // === Pointer parallax (desktop only) ===
  let targetX = 0
  let targetY = 0
  let mouseX = 0
  let mouseY = 0
  const onPointerMove = (e: PointerEvent) => {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1
    mouseY = -((e.clientY / window.innerHeight) * 2 - 1)
  }
  if (!isMobile) {
    window.addEventListener('pointermove', onPointerMove, { passive: true })
  }

  const onResize = () => {
    renderer.setSize(window.innerWidth, window.innerHeight)
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
  }
  window.addEventListener('resize', onResize)

  // === Render loop ===
  let raf = 0
  const state = { opacity: 0 }
  let frameCount = 0
  let lastTickAt = 0
  const tick = (time: number) => {
    raf = requestAnimationFrame(tick)
    frameCount++
    lastTickAt = performance.now()
    targetX += (mouseX * 1.4 - targetX) * 0.04
    targetY += (mouseY * 0.9 - targetY) * 0.04
    camera.position.x = targetX
    camera.position.y = targetY
    camera.lookAt(0, 0, 0)

    particles.rotation.y += 0.0016
    particles.rotation.x += 0.0004

    material.uniforms.uTime.value = time * 0.001
    material.uniforms.uOpacity.value = state.opacity
    renderer.render(scene, camera)
  }
  raf = requestAnimationFrame(tick)

  // Debug surface — only in dev, handy for tuning from the console.
  if (import.meta.env.DEV) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).__intro = {
      get state() {
        return {
          frameCount,
          lastTickAgoMs: Math.round(performance.now() - lastTickAt),
          opacity: state.opacity,
          canvasSize: canvas.width + 'x' + canvas.height,
          particlesRotY: particles.rotation.y.toFixed(3),
          camPos: camera.position.toArray().map((n: number) => n.toFixed(2)).join(',')
        }
      },
      renderer,
      scene,
      camera,
      particles
    }
  }

  // === Cleanup ===
  let cleaned = false
  const cleanup = () => {
    if (cleaned) return
    cleaned = true
    clearTimeout(fallback)
    cancelAnimationFrame(raf)
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('resize', onResize)
    renderer.dispose()
    geometry.dispose()
    material.dispose()
    overlay.classList.add('intro-done')
    document.documentElement.classList.remove('intro-active')
    gsap.set(['#content-header', '#content'], { clearProps: 'all' })
  }

  // Hard fallback — never let the overlay get stuck.
  const fallback = setTimeout(() => {
    console.warn('[intro] hard timeout, forcing reveal')
    cleanup()
  }, 4500)

  // === Timeline ===
  const tl = gsap.timeline({ onComplete: cleanup })

  // Phase 1: particle cloud fades in (0 ~ 0.9s)
  tl.to(state, { opacity: 1, duration: 0.9, ease: 'power2.out' })

  // Phase 2: hold (0.9 ~ 1.4s) — let the cloud breathe
  tl.to({}, { duration: 0.5 })

  // Phase 3: cloud expands + dissipates (1.4 ~ 2.3s)
  tl.to(particles.scale, { x: 1.8, y: 1.8, z: 1.8, duration: 0.9, ease: 'power2.in' })
  tl.to(camera.position, { z: 7.5, duration: 0.9, ease: 'power2.in' }, '<')
  tl.to(state, { opacity: 0, duration: 0.7, ease: 'power2.in' }, '<+0.2')

  // Phase 4: overlay dissolves (2.0 ~ 2.6s) + hero zoom-in runs in parallel
  tl.to(overlay, {
    opacity: 0,
    duration: 0.6,
    ease: 'power2.inOut',
    onComplete: () => overlay.classList.add('intro-hidden')
  }, '-=0.4')

  // Unlock the page so GSAP can take over hero transitions
  tl.add(() => {
    document.documentElement.classList.remove('intro-active')
    document.documentElement.classList.add('intro-hidden')
  }, '<+0.05')

  tl.to('#content-header', {
    scale: 1,
    opacity: 1,
    filter: 'blur(0px)',
    duration: 0.9,
    ease: 'power3.out'
  }, '<+0.02')

  tl.to('#content', {
    scale: 1,
    opacity: 1,
    filter: 'blur(0px)',
    duration: 0.9,
    ease: 'power3.out'
  }, '<+0.08')
}

/** Safety net — if three.js fails to boot, just reveal the page. */
function revealImmediately() {
  const overlay = document.getElementById('intro-overlay')
  const doc = document.documentElement
  doc.classList.remove('intro-active')
  doc.classList.add('intro-skip')
  if (overlay) overlay.classList.add('intro-done')
}

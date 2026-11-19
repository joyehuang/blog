import gsap from 'gsap'
import * as THREE from 'three'
import { CSS3DObject, CSS3DRenderer } from 'three/addons/renderers/CSS3DRenderer.js'

import { initAgentNavigator } from './agent-navigator'
import type { SpaceItem } from './content'

type Target = { position: THREE.Vector3; rotation: THREE.Euler; scale: number; opacity: number }
const chapterIds = [
  ['playyy', 'context', 'community', 'harness', 'lab'],
  ['playyy', 'atypica', 'aixcut', 'harness', 'minimind'],
  ['context', 'product-form', 'lab', 'memory', 'interview'],
  ['community', 'talks', 'about', 'interview']
]
const chapterCopy = [
  null,
  {
    label: '01 / MAKING',
    title: '想法，要能<br /><em>真的跑起来。</em>',
    description: '从 AI 创作工具到开源教程，<br />这是我做过、参与过的东西。',
    href: '/projects',
    link: '查看全部项目'
  },
  {
    label: '02 / THINKING',
    title: '有自己的<br /><em>判断。</em>',
    description: '读源码、做实验、复盘，也修正自己。<br />把理解留下来，让思考继续发生。',
    href: '/blog',
    link: '进入文章与笔记'
  },
  {
    label: '03 / CONNECTING',
    title: '一个人开始，<br /><em>一起往前。</em>',
    description: '聊技术、交换观点，或者一起做点东西。<br />公开的过程里，也会遇见同路人。',
    href: '/contact',
    link: '来找我聊聊'
  }
]

export function initWorkshop() {
  const candidate = document.getElementById('personal-space')
  if (!candidate || candidate.dataset.ready) return
  const root: HTMLElement = candidate
  const query = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector)!
  const { items } = JSON.parse(query('#space-data').textContent!) as {
    items: SpaceItem[]
  }
  const itemMap = new Map(items.map((item) => [item.id, item]))
  const viewport = query('.space-viewport')
  const host = query('#space-scene')
  const journey = query('#scroll-journey')
  const identity = query('#identity')
  const chapter = query('#chapter-copy')
  const media = matchMedia('(prefers-reduced-motion: reduce)')
  let reduced = media.matches
  let paused = reduced
  let width = viewport.clientWidth
  let height = viewport.clientHeight
  let mobile = width < 700
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(42, width / height, 1, 8000)
  const renderer = new CSS3DRenderer()
  renderer.setSize(width, height)
  host.append(renderer.domElement)
  renderer.domElement.classList.add('css-space-renderer')
  const objects = new Map<
    string,
    { object: CSS3DObject; element: HTMLElement; opacity: number; scale: number }
  >()
  root.querySelectorAll<HTMLElement>('[data-artifact]').forEach((element) => {
    const object = new CSS3DObject(element)
    scene.add(object)
    objects.set(element.dataset.artifact!, { object, element, opacity: 0, scale: 1 })
  })
  let stage = 0
  let progress = 0
  let scrollProgress = 0
  let pointerX = 0
  let pointerY = 0
  let dragX = 0
  let dragY = 0
  let animationTime = 0
  let lastFrame = performance.now()
  let disposed = false
  let raf = 0
  let drag: { x: number; y: number; startX: number; startY: number } | null = null
  const dialog = query<HTMLDialogElement>('#detail-dialog')
  const sheet = query('#detail-sheet')
  let origin: HTMLElement | null = null
  let focusBeforeDialog: HTMLElement | null = null
  let closing = false
  const duration = () => (reduced ? 0 : 0.65)

  function targetFor(id: string, chapterIndex: number): Target {
    if (navigator.state.busy && navigator.state.readingId === id)
      return {
        position: new THREE.Vector3(width * 0.28, height * 0.2, 65),
        rotation: new THREE.Euler(0, -0.1, -0.025),
        scale: mobile ? 0.5 : 0.93,
        opacity: 1
      }
    const plan = navigator.state.plan
    if (plan) {
      const index = plan.steps.findIndex((step) => step.id === id)
      const offset = index - navigator.state.step
      if (index < 0)
        return {
          position: new THREE.Vector3(-width, 0, -1000),
          rotation: new THREE.Euler(),
          scale: 0.3,
          opacity: 0
        }
      const active = offset === 0
      return {
        position: new THREE.Vector3(
          mobile ? offset * width * 0.62 : width * (0.16 + offset * 0.24),
          height * (mobile ? (height < 750 ? 0 : -0.025) : height < 850 ? 0.12 : 0.04) +
            Math.abs(offset) * 25,
          active ? 60 : -220 - Math.abs(offset) * 100
        ),
        rotation: new THREE.Euler(
          0,
          active ? -0.05 : -offset * 0.22,
          active ? 0.025 : -offset * 0.08
        ),
        scale: mobile
          ? active
            ? height < 750
              ? 0.64
              : 0.82
            : 0.55
          : active
            ? height < 850
              ? 0.95
              : 1.15
            : 0.78,
        opacity: active ? 1 : mobile ? 0.18 : Math.abs(offset) > 1 ? 0.15 : 0.42
      }
    }
    const index = chapterIds[chapterIndex].indexOf(id)
    const hidden: Target = {
      position: new THREE.Vector3((id.length % 2 ? 1 : -1) * width * 0.85, -height * 0.05, -650),
      rotation: new THREE.Euler(0, 0.2, 0),
      scale: 0.5,
      opacity: 0
    }
    if (index < 0) return hidden
    if (chapterIndex === 0) {
      const positions = mobile
        ? [
            [-0.25, 0.32, -35, -0.08, 0.1],
            [0.26, 0.32, -80, 0.07, -0.1],
            [-0.29, -0.075, -45, 0.08, 0.05],
            [0.29, -0.075, -60, -0.07, -0.08],
            [0, 0.4, -450, 0, 0]
          ]
        : [
            [-0.31, 0.19, 20, 0.06, 0.15],
            [0.3, 0.22, -20, -0.07, -0.15],
            [-0.31, height < 850 ? -0.2 : -0.23, -35, -0.1, 0.12],
            [0.31, height < 850 ? -0.19 : -0.21, 10, 0.09, -0.15],
            [-0.04, 0.4, -280, -0.07, -0.06]
          ]
      const [x, y, z, rz, ry] = positions[index]
      return {
        position: new THREE.Vector3(x * width, y * height, z),
        rotation: new THREE.Euler(-0.035, ry, rz),
        scale: mobile
          ? index === 4
            ? 0.32
            : index > 1
              ? 0.37
              : 0.52
          : index === 4
            ? 0.59
            : width < 1100
              ? 0.77
              : height < 850
                ? 0.9 * (height / 1000)
                : 0.9,
        opacity: (mobile || height < 850) && index === 4 ? 0 : 1
      }
    }
    const positions = mobile
      ? [
          [-0.24, -0.015, 0, -0.06, 0.1],
          [0.23, -0.08, -20, 0.06, -0.1],
          [0.1, -0.26, -150, -0.06, 0.05],
          [-0.4, -0.35, -600, 0, 0],
          [0.4, -0.35, -600, 0, 0]
        ]
      : [
          [0.015, 0.22, 15, -0.035, 0.12],
          [0.285, 0.22, -75, 0.07, -0.14],
          [0.04, -0.18, -45, 0.055, 0.08],
          [0.32, -0.19, 15, -0.06, -0.12],
          [0.47, 0.015, -380, 0.08, -0.3]
        ]
    const [x, y, z, rz, ry] = positions[index]
    return {
      position: new THREE.Vector3(x * width, y * height, z),
      rotation: new THREE.Euler(-0.02, ry, rz),
      scale: mobile ? (index === 2 ? 0.43 : 0.66) : index === 4 ? 0.6 : width < 1100 ? 0.73 : 0.86,
      opacity: mobile && index > 2 ? 0 : index === 4 ? 0.75 : 1
    }
  }

  function resize() {
    width = viewport.clientWidth
    height = viewport.clientHeight
    mobile = width < 700
    camera.aspect = width / height
    camera.position.z = height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)))
    camera.updateProjectionMatrix()
    renderer.setSize(width, height)
    query<SVGElement & HTMLElement>('#space-connections').setAttribute(
      'viewBox',
      `0 0 ${width} ${height}`
    )
    onScroll()
  }
  function onScroll() {
    const distance = journey.offsetHeight - viewport.offsetHeight
    scrollProgress = Math.max(
      0,
      Math.min(3, (-journey.getBoundingClientRect().top / Math.max(1, distance)) * 3)
    )
    if (reduced) progress = scrollProgress
  }
  function goTo(index: number) {
    navigator.reset()
    const top = window.scrollY + journey.getBoundingClientRect().top
    const distance = journey.offsetHeight - viewport.offsetHeight
    window.scrollTo({ top: top + (distance * index) / 3, behavior: reduced ? 'instant' : 'smooth' })
  }
  root
    .querySelectorAll<HTMLElement>('[data-go]')
    .forEach((button) => button.addEventListener('click', () => goTo(Number(button.dataset.go))))
  query('#index-toggle').addEventListener('click', () =>
    query('#space-index').scrollIntoView({ behavior: reduced ? 'instant' : 'smooth' })
  )
  query('#reset-space').addEventListener('click', () => {
    dragX = 0
    dragY = 0
    pointerX = 0
    pointerY = 0
  })
  host.addEventListener('pointerdown', (event) => {
    if ((event.target as HTMLElement).closest('button,a')) return
    drag = { x: event.clientX, y: event.clientY, startX: dragX, startY: dragY }
    host.setPointerCapture(event.pointerId)
    host.classList.add('dragging')
  })
  host.addEventListener('pointermove', (event) => {
    if (drag) {
      dragX = THREE.MathUtils.clamp(
        drag.startX + (event.clientX - drag.x) * 0.35,
        -width * 0.1,
        width * 0.1
      )
      dragY = THREE.MathUtils.clamp(
        drag.startY - (event.clientY - drag.y) * 0.2,
        -height * 0.07,
        height * 0.07
      )
    } else if (!mobile) {
      pointerX = (event.clientX / width - 0.5) * 2
      pointerY = (event.clientY / height - 0.5) * 2
    }
  })
  const stopDrag = () => {
    drag = null
    host.classList.remove('dragging')
  }
  host.addEventListener('pointerup', stopDrag)
  host.addEventListener('pointercancel', stopDrag)
  host.addEventListener('pointerleave', () => {
    if (!drag) {
      pointerX = 0
      pointerY = 0
    }
  })
  function updateMotion() {
    const button = query('#motion-toggle')
    button.setAttribute('aria-pressed', String(paused))
    button.setAttribute('aria-label', paused ? '播放环境动效' : '暂停环境动效')
    button.textContent = paused ? '▷' : 'Ⅱ'
  }
  query('#motion-toggle').addEventListener('click', () => {
    paused = !paused
    updateMotion()
  })
  const onReduced = () => {
    reduced = media.matches
    paused = reduced
    updateMotion()
  }
  media.addEventListener('change', onReduced)
  updateMotion()

  function renderDetail(id: string) {
    const item = itemMap.get(id)
    if (!item) return
    query('#detail-label').textContent = item.label
    query('#detail-title').textContent = item.title
    query('#detail-subtitle').textContent = item.subtitle
    const image = query<HTMLImageElement>('#detail-image')
    image.hidden = !item.image
    if (item.image) {
      image.src = item.image
      image.alt = `${item.title} 产品公开界面`
    }
    const body = query('#detail-body')
    body.replaceChildren(
      ...item.body.map((text) => {
        const p = document.createElement('p')
        p.textContent = text
        return p
      })
    )
    const visit = query<HTMLAnchorElement>('#detail-visit')
    visit.href = item.href
    visit.textContent =
      item.kind === 'work'
        ? '打开项目 ↗'
        : item.kind === 'people'
          ? '参与 / 查看详情 ↗'
          : item.kind === 'self'
            ? '更多关于我 ↗'
            : '阅读全文 ↗'
    visit.target = item.href.startsWith('http') ? '_blank' : '_self'
    visit.rel = 'noreferrer'
    const related = query('#detail-related')
    related.replaceChildren(
      ...item.related.flatMap((relatedId) => {
        const other = itemMap.get(relatedId)
        if (!other) return []
        const button = document.createElement('button')
        button.textContent = other.title.replace('\n', '') + ' ↗'
        button.addEventListener('click', () => {
          renderDetail(relatedId)
          sheet.scrollTop = 0
        })
        return [button]
      })
    )
  }
  function openDetail(id: string, from?: HTMLElement) {
    if (!itemMap.has(id)) return
    origin = from?.closest<HTMLElement>('[data-artifact]') ?? null
    focusBeforeDialog = document.activeElement as HTMLElement
    renderDetail(id)
    dialog.showModal()
    sheet.scrollTop = 0
    const rect = origin?.getBoundingClientRect()
    const destination = sheet.getBoundingClientRect()
    if (origin) origin.style.visibility = 'hidden'
    gsap.fromTo(
      sheet,
      {
        x: rect ? rect.left + rect.width / 2 - (destination.left + destination.width / 2) : 0,
        y: rect ? rect.top + rect.height / 2 - (destination.top + destination.height / 2) : 25,
        scaleX: rect ? rect.width / destination.width : 0.97,
        scaleY: rect ? rect.height / destination.height : 0.97,
        opacity: rect ? 0.9 : 0
      },
      { x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1, duration: duration(), ease: 'power3.inOut' }
    )
  }
  function closeDetail() {
    if (closing || !dialog.open) return
    closing = true
    const rect = origin?.getBoundingClientRect()
    const destination = sheet.getBoundingClientRect()
    gsap.to(sheet, {
      x: rect ? rect.left + rect.width / 2 - (destination.left + destination.width / 2) : 0,
      y: rect ? rect.top + rect.height / 2 - (destination.top + destination.height / 2) : 20,
      scaleX: rect ? rect.width / destination.width : 0.97,
      scaleY: rect ? rect.height / destination.height : 0.97,
      opacity: 0,
      duration: reduced ? 0 : 0.4,
      ease: 'power3.inOut',
      onComplete: () => {
        dialog.close()
        if (origin) origin.style.visibility = ''
        origin = null
        closing = false
        gsap.set(sheet, { clearProps: 'transform,opacity' })
        focusBeforeDialog?.focus({ preventScroll: true })
      }
    })
  }
  root.querySelectorAll<HTMLElement>('[data-open]').forEach((button) =>
    button.addEventListener('click', () => {
      if (button.closest('[data-artifact]') && navigator.selectSource(button.dataset.open!)) return
      openDetail(button.dataset.open!, button)
    })
  )
  // CSS3DRenderer owns the cards now; bind through its scene container as well.
  query('#detail-close').addEventListener('click', closeDetail)
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault()
    closeDetail()
  })
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) closeDetail()
  })

  const navigator = initAgentNavigator(root, items, (id) => {
    const source = [...root.querySelectorAll<HTMLElement>('[data-artifact]')].find(
      (element) => element.dataset.artifact === id
    )
    openDetail(id, source)
  })

  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(viewport)
  window.addEventListener('scroll', onScroll, { passive: true })
  const time = query<HTMLTimeElement>('#melbourne-time')
  const updateTime = () => {
    time.textContent = new Intl.DateTimeFormat('en-AU', {
      timeZone: 'Australia/Melbourne',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(new Date())
  }
  updateTime()
  const timeInterval = window.setInterval(updateTime, 60000)
  const position = new THREE.Vector3()
  const quaternion = new THREE.Quaternion()
  const qA = new THREE.Quaternion()
  const qB = new THREE.Quaternion()
  const projected = new THREE.Vector3()
  const connectionGroup = query('#connection-paths')
  const svgNamespace = 'http://www.w3.org/2000/svg'
  const connectionLines = items.map((item) => {
    const path = document.createElementNS(svgNamespace, 'path')
    connectionGroup.append(path)
    return { id: item.id, path }
  })
  let copiedStage = -1
  function tick(now: number) {
    if (disposed) return
    const dt = THREE.MathUtils.clamp((now - lastFrame) / 1000, 0, 0.05)
    lastFrame = now
    if (!paused) animationTime += dt
    progress = THREE.MathUtils.lerp(progress, scrollProgress, reduced ? 1 : 1 - Math.exp(-7 * dt))
    if (Math.abs(progress - scrollProgress) < 0.001) progress = scrollProgress
    const start = Math.floor(progress)
    const end = Math.min(3, start + 1)
    const fraction = THREE.MathUtils.smoothstep(progress - start, 0.1, 0.9)
    stage = Math.round(progress)
    if (stage !== copiedStage) {
      copiedStage = stage
      root.dataset.view = String(stage)
      root.querySelectorAll<HTMLElement>('.journey-nav [data-go]').forEach((button) => {
        const active = Number(button.dataset.go) === stage
        button.classList.toggle('active', active)
        if (active) button.setAttribute('aria-current', 'true')
        else button.removeAttribute('aria-current')
      })
      const copy = chapterCopy[stage]
      if (copy) {
        query('#chapter-label').textContent = copy.label
        query('#chapter-title').innerHTML = copy.title
        query('#chapter-description').innerHTML = copy.description
        const link = query<HTMLAnchorElement>('#chapter-link')
        link.href = copy.href
        link.innerHTML = `${copy.link} <span>↗</span>`
      }
    }
    const identityOpacity = 1 - THREE.MathUtils.smoothstep(progress, 0, 0.7)
    identity.style.opacity = String(identityOpacity)
    identity.style.transform = `translate(-50%,-50%) scale(${1 - progress * 0.08})`
    const chapterOpacity = THREE.MathUtils.smoothstep(progress, 0.35, 0.9)
    chapter.style.opacity = String(chapterOpacity)
    chapter.style.transform = `translateY(${(1 - chapterOpacity) * 20}px)`
    chapter.style.visibility = chapterOpacity < 0.01 ? 'hidden' : 'visible'
    query('#scene-caption').style.opacity = String(identityOpacity)
    query('#explore-cue').style.opacity = String(identityOpacity)
    const motionX = paused ? 0 : pointerX * (mobile ? 0 : 9)
    const motionY = paused ? 0 : pointerY * (mobile ? 0 : 5)
    objects.forEach((entry, id) => {
      const { object, element } = entry
      const a = targetFor(id, start)
      const b = targetFor(id, end)
      position.copy(a.position).lerp(b.position, fraction)
      const index = items.findIndex((item) => item.id === id)
      const bob =
        paused || navigator.state.plan ? 0 : Math.sin(animationTime * 0.5 + index * 1.3) * 4
      position.x += dragX + motionX * (position.z / 150 + 1)
      position.y += dragY + bob - motionY
      object.position.lerp(position, reduced ? 1 : 1 - Math.exp(-6 * dt))
      qA.setFromEuler(a.rotation)
      qB.setFromEuler(b.rotation)
      quaternion.copy(qA).slerp(qB, fraction)
      object.quaternion.slerp(quaternion, reduced ? 1 : 1 - Math.exp(-6 * dt))
      const scale = THREE.MathUtils.lerp(a.scale, b.scale, fraction)
      object.scale.setScalar(
        THREE.MathUtils.lerp(object.scale.x, scale, reduced ? 1 : 1 - Math.exp(-6 * dt))
      )
      const targetOpacity = THREE.MathUtils.lerp(a.opacity, b.opacity, fraction)
      entry.opacity = THREE.MathUtils.lerp(
        entry.opacity,
        targetOpacity,
        reduced ? 1 : 1 - Math.exp(-8 * dt)
      )
      const opacity = entry.opacity
      element.dataset.selected = String(
        navigator.state.plan?.steps[navigator.state.step]?.id === id ||
          navigator.state.readingId === id
      )
      element.style.opacity = String(opacity)
      const interactive = opacity > (navigator.state.plan ? 0.3 : 0.55)
      element.style.pointerEvents = interactive ? 'auto' : 'none'
      element.inert = !interactive
      element.setAttribute('aria-hidden', String(!interactive))
      object.visible = opacity >= 0.005
    })
    renderer.render(scene, camera)
    const cx = width * 0.5,
      cy = height * 0.48
    query('#orbit-path').setAttribute(
      'd',
      `M ${width * 0.13} ${height * 0.68} C ${width * 0.03} ${height * 0.14}, ${width * 0.87} ${height * 0.07}, ${width * 0.88} ${height * 0.4} S ${width * 0.23} ${height * 0.99}, ${width * 0.13} ${height * 0.68}`
    )
    query('#orbit-path').style.opacity = String(identityOpacity)
    connectionLines.forEach(({ id, path }) => {
      const entry = objects.get(id)!
      const visible = Number(entry.element.style.opacity) > 0.55
      if (!visible) {
        path.style.opacity = '0'
        return
      }
      projected.copy(entry.object.position).project(camera)
      const x = (projected.x * 0.5 + 0.5) * width,
        y = (-projected.y * 0.5 + 0.5) * height
      path.setAttribute('d', `M ${cx} ${cy} Q ${cx + (x - cx) * 0.7} ${cy} ${x} ${y}`)
      path.style.opacity = String(identityOpacity * 0.5)
    })
    const plan = navigator.state.plan
    const focusId = navigator.state.readingId ?? plan?.steps[navigator.state.step]?.id
    const cursor = query('#agent-cursor')
    const journeyPath = query<SVGElement & HTMLElement>('#journey-path')
    cursor.style.opacity = focusId ? '1' : '0'
    if (focusId && objects.has(focusId)) {
      const entry = objects.get(focusId)!
      projected.copy(entry.object.position).project(camera)
      const x = (projected.x * 0.5 + 0.5) * width
      const y = (-projected.y * 0.5 + 0.5) * height
      const card = entry.element.getBoundingClientRect()
      cursor.style.transform = mobile
        ? `translate(${x + card.width / 2 + 3}px, ${y - 23}px)`
        : `translate(${x - 23}px, ${y - card.height / 2 - 54}px)`
    }
    if (plan) {
      const points = plan.steps.map((step) => {
        projected.copy(objects.get(step.id)!.object.position).project(camera)
        return [(projected.x * 0.5 + 0.5) * width, (-projected.y * 0.5 + 0.5) * height]
      })
      const path = points.map(([x, y], i) => (i ? `L ${x} ${y}` : `M ${x} ${y}`)).join(' ')
      journeyPath.setAttribute('d', path)
      journeyPath.style.opacity = '1'
    } else journeyPath.style.opacity = '0'
    raf = requestAnimationFrame(tick)
  }
  resize()
  progress = scrollProgress
  root.dataset.ready = 'true'
  raf = requestAnimationFrame(tick)
  const visibility = () => {
    cancelAnimationFrame(raf)
    if (!document.hidden && !disposed) {
      lastFrame = performance.now()
      raf = requestAnimationFrame(tick)
    }
  }
  document.addEventListener('visibilitychange', visibility)
  const dispose = () => {
    disposed = true
    cancelAnimationFrame(raf)
    clearInterval(timeInterval)
    resizeObserver.disconnect()
    window.removeEventListener('scroll', onScroll)
    navigator.dispose()
    document.removeEventListener('visibilitychange', visibility)
    media.removeEventListener('change', onReduced)
    gsap.killTweensOf(sheet)
  }
  document.addEventListener('astro:before-swap', dispose, { once: true })
  window.addEventListener(
    'pagehide',
    (event) => {
      if (!event.persisted) dispose()
    },
    { once: true }
  )
}

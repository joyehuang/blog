type Project = { name: string; description: string; href: string }
let dispose: (() => void) | undefined

function initializeOrbit() {
  dispose?.()
  const root = document.querySelector<HTMLElement>('[data-orbit-home]')
  if (!root) return
  const abort = new AbortController()
  const { signal } = abort
  const stage = root.querySelector<HTMLElement>('.orbit-stage')!
  const cards = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-project]'))
  const projects: Project[] = JSON.parse(root.querySelector('#orbit-projects')!.textContent || '[]')
  const play = root.querySelector<HTMLButtonElement>('[data-play]')!
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  let index = 0
  let startX = 0
  let startY = 0
  let drag = 0
  let pointer: number | null = null
  let dragged = false
  let horizontal = false
  let timer: ReturnType<typeof setInterval> | undefined

  function paint(fraction = 0) {
    cards.forEach((card, i) => {
      let offset = (i - index + cards.length) % cards.length
      if (offset > cards.length / 2) offset -= cards.length
      const angle = (offset - fraction) * 1.03
      const x = Math.sin(angle) * 500
      const z = (Math.cos(angle) - 1) * 390
      card.style.transform = `translate3d(${x}px, ${Math.abs(offset - fraction) * 13}px, ${z}px) rotateY(${-angle * 24}deg)`
      card.style.zIndex = String(10 - Math.abs(offset))
      card.classList.toggle('is-active', i === index)
      card.setAttribute('aria-pressed', String(i === index))
    })
  }
  function select(next: number) {
    index = (next + cards.length) % cards.length
    paint()
    const project = projects[index]
    root!.querySelector('.selected-name')!.textContent = project.name
    root!.querySelector('.selected-description')!.textContent = project.description
    root!.querySelector('.selected-count')!.textContent =
      `${String(index + 1).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}`
    const link = root!.querySelector<HTMLAnchorElement>('.visit-project')!
    link.href = project.href
    link.dataset.analyticsProject = project.name
  }
  function stop() {
    if (timer) clearInterval(timer)
    timer = undefined
    play.setAttribute('aria-pressed', 'false')
    play.textContent = '▷'
  }
  root.querySelector('[data-prev]')!.addEventListener(
    'click',
    () => {
      stop()
      select(index - 1)
    },
    { signal }
  )
  root.querySelector('[data-next]')!.addEventListener(
    'click',
    () => {
      stop()
      select(index + 1)
    },
    { signal }
  )
  play.addEventListener(
    'click',
    () => {
      if (timer) {
        stop()
        return
      }
      play.setAttribute('aria-pressed', 'true')
      play.textContent = 'Ⅱ'
      timer = setInterval(() => select(index + 1), 4500)
    },
    { signal }
  )
  cards.forEach((card, i) =>
    card.addEventListener(
      'click',
      (event) => {
        if (dragged && event.detail !== 0) {
          event.preventDefault()
          return
        }
        stop()
        select(i)
      },
      { signal }
    )
  )
  stage.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault()
        stop()
        select(index + (event.key === 'ArrowRight' ? 1 : -1))
      } else if (event.key === 'Home') {
        event.preventDefault()
        stop()
        select(0)
      } else if (event.key === 'Escape') stop()
    },
    { signal }
  )
  stage.addEventListener(
    'pointerdown',
    (event) => {
      if (!event.isPrimary || event.button !== 0) return
      stop()
      pointer = event.pointerId
      startX = event.clientX
      startY = event.clientY
      drag = 0
      dragged = false
      horizontal = false
    },
    { signal }
  )
  stage.addEventListener(
    'pointermove',
    (event) => {
      if (pointer !== event.pointerId) return
      const dx = event.clientX - startX
      const dy = event.clientY - startY
      if (!horizontal && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) {
        pointer = null
        return
      }
      if (!horizontal && Math.abs(dx) > 8) {
        horizontal = true
        dragged = true
        stage.setPointerCapture(event.pointerId)
        stage.classList.add('is-dragging')
        cards.forEach((card) => {
          card.style.transition = 'none'
        })
      }
      if (!horizontal) return
      drag = dx
      paint(-Math.max(-0.95, Math.min(0.95, drag / 250)))
    },
    { signal }
  )
  function endDrag(event: PointerEvent) {
    if (pointer !== event.pointerId) return
    pointer = null
    stage.classList.remove('is-dragging')
    cards.forEach((card) => {
      card.style.transition = ''
    })
    if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId)
    if (event.type === 'pointerup' && Math.abs(drag) > 45) select(index + (drag < 0 ? 1 : -1))
    else paint()
  }
  stage.addEventListener('pointerup', endDrag, { signal })
  stage.addEventListener('pointercancel', endDrag, { signal })
  window.addEventListener('pointerup', endDrag, { signal })
  stage.addEventListener('focusin', stop, { signal })
  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.hidden) stop()
    },
    { signal }
  )
  reducedMotion.addEventListener('change', stop, { signal })
  const observer = new IntersectionObserver((entries) => {
    if (!entries[0]?.isIntersecting) stop()
  })
  observer.observe(stage)

  function setPalette(value: string) {
    if (!['acid', 'ice', 'rose'].includes(value)) return
    root!.dataset.palette = value
    root!
      .querySelectorAll<HTMLButtonElement>('[data-color]')
      .forEach((button) =>
        button.setAttribute('aria-pressed', String(button.dataset.color === value))
      )
  }
  try {
    setPalette(localStorage.getItem('joye-orbit-palette') || 'acid')
  } catch {
    /* Storage is optional. */
  }
  root.querySelectorAll<HTMLButtonElement>('[data-color]').forEach((button) =>
    button.addEventListener(
      'click',
      () => {
        const value = button.dataset.color!
        setPalette(value)
        try {
          localStorage.setItem('joye-orbit-palette', value)
        } catch {
          /* Storage is optional. */
        }
      },
      { signal }
    )
  )
  const clock = root.querySelector('.local-time')!
  function updateTime() {
    clock.textContent = new Intl.DateTimeFormat('en-AU', {
      timeZone: 'Australia/Melbourne',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(new Date())
  }
  updateTime()
  const clockTimer = setInterval(updateTime, 60000)
  select(0)
  dispose = () => {
    stop()
    clearInterval(clockTimer)
    observer.disconnect()
    abort.abort()
  }
}
initializeOrbit()
document.addEventListener('astro:page-load', initializeOrbit)
document.addEventListener('astro:before-swap', () => dispose?.())

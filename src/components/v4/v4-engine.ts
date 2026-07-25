/**
 * v4 landing page behaviour.
 *
 * Everything visual has a CSS-only resting state — this file only adds the
 * parts that need to know about scroll position or user intent: section
 * reveals, the four-station loop, the ring relay, and the ledger count-up.
 */

const REDUCED = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

const LOOP_INTERVAL = 5200
const RING_INTERVAL = 2800

class V4Home extends HTMLElement {
  private cleanups: Array<() => void> = []

  connectedCallback() {
    const reduced = REDUCED()
    if (reduced) this.stripMotion()

    this.setupReveal(reduced)
    this.setupLoop(reduced)
    this.setupRings(reduced)
    this.setupLedger(reduced)
  }

  disconnectedCallback() {
    this.cleanups.forEach((fn) => fn())
    this.cleanups = []
  }

  private on<K extends keyof HTMLElementEventMap>(
    target: EventTarget,
    type: K | string,
    handler: EventListenerOrEventListenerObject,
    options?: AddEventListenerOptions
  ) {
    target.addEventListener(type, handler, options)
    this.cleanups.push(() => target.removeEventListener(type, handler, options))
  }

  /** SMIL ignores prefers-reduced-motion, so drop those nodes outright. */
  private stripMotion() {
    this.querySelectorAll('[data-motion]').forEach((node) => node.remove())
  }

  /* ------------------------------------------------------------------ */
  /* reveal on scroll                                                    */
  /* ------------------------------------------------------------------ */

  private setupReveal(reduced: boolean) {
    const targets = Array.from(this.querySelectorAll<HTMLElement>('[data-reveal]'))
    if (!targets.length) return

    if (reduced || !('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add('is-in'))
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          entry.target.classList.add('is-in')
          observer.unobserve(entry.target)
        })
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.08 }
    )

    targets.forEach((el) => observer.observe(el))

    // Failsafe: reveal-on-scroll starts at opacity 0, so anything that stops the
    // observer from delivering would leave the page looking empty. After a beat,
    // show whatever is already on screen regardless.
    const failsafe = window.setTimeout(() => {
      targets.forEach((el) => {
        const rect = el.getBoundingClientRect()
        if (rect.top < window.innerHeight && rect.bottom > 0) el.classList.add('is-in')
      })
    }, 2500)

    this.cleanups.push(() => {
      window.clearTimeout(failsafe)
      observer.disconnect()
    })
  }

  /** Run `tick` on an interval, but only while `el` is on screen. */
  private whileVisible(el: Element, tick: () => void, interval: number) {
    let timer: number | undefined
    let visible = false
    let paused = false

    const sync = () => {
      const shouldRun = visible && !paused
      if (shouldRun && timer === undefined) timer = window.setInterval(tick, interval)
      if (!shouldRun && timer !== undefined) {
        window.clearInterval(timer)
        timer = undefined
      }
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting
        sync()
      },
      { threshold: 0.25 }
    )
    observer.observe(el)

    this.cleanups.push(() => {
      observer.disconnect()
      if (timer !== undefined) window.clearInterval(timer)
    })

    return {
      pause: () => {
        paused = true
        sync()
      },
      resume: () => {
        paused = false
        sync()
      },
      stop: () => {
        paused = true
        sync()
        observer.disconnect()
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /* the loop — four stations, tabs + dial stay in sync                  */
  /* ------------------------------------------------------------------ */

  private setupLoop(reduced: boolean) {
    const root = this.querySelector<HTMLElement>('[data-loop]')
    if (!root) return

    const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-tab]'))
    const panels = Array.from(root.querySelectorAll<HTMLElement>('[data-panel]'))
    const nodes = Array.from(root.querySelectorAll<SVGGElement>('[data-node]'))
    if (!tabs.length) return

    let current = 0

    const select = (next: number) => {
      current = (next + tabs.length) % tabs.length
      const key = tabs[current].dataset.tab
      tabs.forEach((tab, i) => {
        const on = i === current
        tab.setAttribute('aria-selected', on ? 'true' : 'false')
        tab.tabIndex = on ? 0 : -1
      })
      panels.forEach((panel) => {
        panel.hidden = panel.dataset.panel !== key
      })
      nodes.forEach((node) => node.classList.toggle('is-active', node.dataset.node === key))
    }

    select(0)

    const cycle = this.whileVisible(root, () => select(current + 1), LOOP_INTERVAL)
    if (reduced) cycle.stop()

    tabs.forEach((tab, i) => {
      // A click is a deliberate choice — stop rotating and leave it there.
      this.on(tab, 'click', () => {
        select(i)
        cycle.stop()
      })
      this.on(tab, 'keydown', (event) => {
        const key = (event as KeyboardEvent).key
        const delta = key === 'ArrowRight' ? 1 : key === 'ArrowLeft' ? -1 : 0
        if (!delta) return
        event.preventDefault()
        cycle.stop()
        select(current + delta)
        tabs[current].focus()
      })
    })

    nodes.forEach((node) => {
      const index = tabs.findIndex((tab) => tab.dataset.tab === node.dataset.node)
      if (index < 0) return
      this.on(node, 'click', () => {
        select(index)
        cycle.stop()
      })
      this.on(node, 'pointerenter', () => select(index))
    })

    this.on(root, 'pointerenter', () => cycle.pause())
    this.on(root, 'pointerleave', () => cycle.resume())
  }

  /* ------------------------------------------------------------------ */
  /* the rings — list item and ring highlight together                   */
  /* ------------------------------------------------------------------ */

  private setupRings(reduced: boolean) {
    const root = this.querySelector<HTMLElement>('[data-rings]')
    if (!root) return

    const items = Array.from(root.querySelectorAll<HTMLElement>('[data-ring-item]'))
    const circles = Array.from(root.querySelectorAll<SVGCircleElement>('[data-ring]'))
    const ticks = Array.from(root.querySelectorAll<SVGGElement>('[data-tick]'))
    if (!items.length) return

    let current = 0

    const select = (next: number) => {
      current = (next + items.length) % items.length
      const key = String(current)
      items.forEach((item, i) => item.classList.toggle('is-active', i === current))
      circles.forEach((circle) => circle.classList.toggle('is-active', circle.dataset.ring === key))
      ticks.forEach((tick) => tick.classList.toggle('is-active', tick.dataset.tick === key))
    }

    select(0)

    const cycle = this.whileVisible(root, () => select(current + 1), RING_INTERVAL)
    if (reduced) cycle.stop()

    items.forEach((item, i) => {
      this.on(item, 'pointerenter', () => {
        cycle.pause()
        select(i)
      })
      this.on(item, 'pointerleave', () => cycle.resume())
    })
  }

  /* ------------------------------------------------------------------ */
  /* the ledger — numbers tick up the first time they are seen           */
  /* ------------------------------------------------------------------ */

  private setupLedger(reduced: boolean) {
    if (reduced || !('IntersectionObserver' in window)) return

    const values = Array.from(this.querySelectorAll<HTMLElement>('.ledger__value'))
    if (!values.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          observer.unobserve(entry.target)
          this.countUp(entry.target as HTMLElement)
        })
      },
      { threshold: 0.5 }
    )

    values.forEach((el) => observer.observe(el))
    this.cleanups.push(() => observer.disconnect())
  }

  private countUp(el: HTMLElement) {
    // Only the leading text node holds the figure; the <i> suffix stays put.
    const node = el.firstChild
    if (!node || node.nodeType !== Node.TEXT_NODE) return

    const raw = (node.textContent ?? '').trim()
    const match = raw.match(/^(\d+)(.*)$/)
    if (!match) return

    const target = Number(match[1])
    const suffix = match[2]
    if (!Number.isFinite(target) || target <= 0) return

    const duration = 900
    const start = performance.now()

    const step = (now: number) => {
      const p = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      node.textContent = `${Math.round(target * eased)}${p === 1 ? suffix : ''}`
      if (p < 1) requestAnimationFrame(step)
    }

    node.textContent = `0`
    requestAnimationFrame(step)
  }
}

if (!customElements.get('v4-home')) customElements.define('v4-home', V4Home)

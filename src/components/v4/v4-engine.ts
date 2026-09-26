/**
 * v4 motion. GSAP drives everything; the WebGL field lives in `field.ts`.
 *
 * Set pieces, in scroll order:
 *   hero    — letters flip in on a 3D axis, the thesis line descrambles
 *   ticker  — infinite marquee whose speed and direction follow scroll velocity
 *   stats   — counters tick up, cards tilt under the pointer
 *   reel    — the year pinned and scrubbed sideways, cards entering in 3D
 *   rest    — masked line reveals, magnetic links, a trailing cursor
 *
 * Everything has a reduced-motion resting state: the page renders complete and
 * static, and no timeline is created.
 */

import { gsap } from 'gsap'
import { CustomEase } from 'gsap/CustomEase'
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'

import { createSignalField, type SignalField } from './field'

gsap.registerPlugin(CustomEase, ScrambleTextPlugin, ScrollTrigger, SplitText)

// One signature ease for the whole page — a long, soft expo settle.
CustomEase.create('v4', '0.16, 1, 0.3, 1')

const FIELD_HERO = 1
const FIELD_MID = 0.12
const FIELD_END = 0.6

class V4Home extends HTMLElement {
  private ctx?: gsap.Context
  private field?: SignalField | null
  private cleanups: Array<() => void> = []

  connectedCallback() {
    if (this.ctx) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const fine = window.matchMedia('(pointer: fine)').matches

    this.setupField(reduced)

    const ctx = gsap.context(() => {}, this)
    this.ctx = ctx

    if (reduced) {
      this.restingState()
      return
    }

    // `gsap.from()` applies its start state the moment it is created, so a throw
    // part-way through setup would leave the page half-invisible. Roll back to
    // the finished layout rather than ship a blank screen.
    try {
      ctx.add(() => {
        if (fine) {
          this.setupCursor()
          this.setupMagnetic()
        }
        this.setupTilt(fine)

        this.setupHero()
        this.setupSplits()
        this.setupReveals()
        this.setupTicker()
        this.setupCounters()
        this.setupReel()
      })
    } catch (error) {
      console.error('[v4] motion setup failed — falling back to a static page', error)
      ctx.revert()
      this.ctx = undefined
      this.restingState()
    }

    // Layout settles after webfonts and the avatar land.
    const refresh = () => ScrollTrigger.refresh()
    document.fonts?.ready.then(refresh).catch(() => {})
    window.addEventListener('load', refresh, { once: true })
    this.cleanups.push(() => window.removeEventListener('load', refresh))
  }

  disconnectedCallback() {
    this.cleanups.forEach((fn) => fn())
    this.cleanups = []
    this.field?.destroy()
    this.ctx?.revert()
    this.ctx = undefined
  }

  private on(
    target: EventTarget,
    type: string,
    handler: EventListener,
    opts?: AddEventListenerOptions
  ) {
    target.addEventListener(type, handler, opts)
    this.cleanups.push(() => target.removeEventListener(type, handler, opts))
  }

  /** Reduced motion: show the finished page, animate nothing. */
  private restingState() {
    gsap.set(this.querySelectorAll('[data-reveal]'), { opacity: 1, y: 0 })
    this.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => {
      el.textContent = Number(el.dataset.count ?? 0).toLocaleString()
    })
    this.field?.setOpacity(FIELD_MID)
  }

  /* ------------------------------------------------------------------ */
  /* the WebGL backdrop                                                  */
  /* ------------------------------------------------------------------ */

  private setupField(reduced: boolean) {
    const canvas = this.querySelector<HTMLCanvasElement>('[data-field]')
    if (!canvas) return

    this.field = createSignalField(canvas, reduced)
    if (!this.field) {
      // No WebGL: the CSS gradient fallback takes over.
      canvas.setAttribute('data-fallback', '')
      return
    }
    if (reduced) return

    const field = this.field
    const hero = this.querySelector<HTMLElement>('[data-hero]')
    const end = this.querySelector<HTMLElement>('.end')

    // The field is loud behind the hero, recedes while you read, and comes
    // back up for the closing frame.
    if (hero) {
      ScrollTrigger.create({
        trigger: hero,
        start: 'top top',
        end: 'bottom top',
        scrub: true,
        onUpdate: (self) =>
          field.setOpacity(gsap.utils.interpolate(FIELD_HERO, FIELD_MID, self.progress))
      })
    }

    if (end) {
      ScrollTrigger.create({
        trigger: end,
        start: 'top bottom',
        end: 'top 30%',
        scrub: true,
        onUpdate: (self) =>
          field.setOpacity(gsap.utils.interpolate(FIELD_MID, FIELD_END, self.progress))
      })
    }

    ScrollTrigger.create({
      trigger: document.documentElement,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => field.setScroll(self.progress)
    })
  }

  /* ------------------------------------------------------------------ */
  /* hero                                                                */
  /* ------------------------------------------------------------------ */

  private setupHero() {
    const hero = this.querySelector<HTMLElement>('[data-hero]')
    const inner = this.querySelector<HTMLElement>('[data-hero-inner]')
    if (!hero || !inner) return

    const letters = hero.querySelectorAll('.hero__letter i')
    const eyebrow = hero.querySelector<HTMLElement>('[data-split="chars"]')
    const lede = hero.querySelector<HTMLElement>('[data-split="lines"]')
    const fades = hero.querySelectorAll('[data-hero-fade]')
    const signal = hero.querySelector<HTMLElement>('[data-scramble]')

    const eyebrowChars = eyebrow
      ? new SplitText(eyebrow, { type: 'chars', charsClass: 'v4-split-char' }).chars
      : []
    const ledeLines = lede
      ? new SplitText(lede, { type: 'lines', mask: 'lines', linesClass: 'v4-split-line' }).lines
      : []

    const tl = gsap.timeline({ defaults: { ease: 'v4' }, delay: 0.15 })

    tl.from(eyebrowChars, { opacity: 0, y: 14, duration: 0.7, stagger: 0.012 })
      .from(
        letters,
        { yPercent: 120, rotateX: -82, opacity: 0, duration: 1.25, stagger: 0.08 },
        '-=0.45'
      )
      .from(ledeLines, { yPercent: 110, duration: 1, stagger: 0.09 }, '-=0.7')
      .from(fades, { opacity: 0, y: 20, duration: 0.9, stagger: 0.09 }, '-=0.85')

    // Noise resolving into signal, stated literally.
    if (signal) {
      tl.to(
        signal,
        {
          duration: 1.5,
          ease: 'none',
          scrambleText: {
            text: signal.dataset.scramble ?? signal.textContent ?? '',
            chars: '01<>/\\{}[]#*+=~',
            speed: 0.6,
            revealDelay: 0.35
          }
        },
        '-=1.1'
      )
    }

    // Parallax exit — the hero sinks and defocuses as the ticker arrives.
    gsap.to(inner, {
      yPercent: -14,
      scale: 0.93,
      opacity: 0,
      filter: 'blur(12px)',
      ease: 'none',
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.6 }
    })
  }

  /* ------------------------------------------------------------------ */
  /* masked line reveals outside the hero                                */
  /* ------------------------------------------------------------------ */

  private setupSplits() {
    this.querySelectorAll<HTMLElement>('[data-split]').forEach((el) => {
      if (el.closest('[data-hero]')) return

      const type = el.dataset.split === 'chars' ? 'chars' : 'lines'
      const split = new SplitText(el, {
        type,
        mask: type,
        linesClass: 'v4-split-line',
        charsClass: 'v4-split-char'
      })
      const targets = type === 'chars' ? split.chars : split.lines

      gsap.from(targets, {
        yPercent: 115,
        duration: type === 'chars' ? 0.9 : 1.05,
        ease: 'v4',
        stagger: type === 'chars' ? 0.018 : 0.1,
        scrollTrigger: { trigger: el, start: 'top 88%', once: true }
      })
    })
  }

  private setupReveals() {
    ScrollTrigger.batch(this.querySelectorAll('[data-reveal]'), {
      start: 'top 90%',
      once: true,
      onEnter: (batch) =>
        gsap.to(batch, {
          opacity: 1,
          y: 0,
          duration: 0.95,
          ease: 'v4',
          stagger: 0.08,
          overwrite: true
        })
    })
  }

  /* ------------------------------------------------------------------ */
  /* ticker — speed and direction follow the scroll                      */
  /* ------------------------------------------------------------------ */

  private setupTicker() {
    const rows = this.querySelectorAll<HTMLElement>('[data-ticker-row]')
    if (!rows.length) return

    const loops: gsap.core.Tween[] = []

    rows.forEach((row) => {
      const set = row.querySelector<HTMLElement>('.ticker__set')
      if (!set) return
      const width = set.offsetWidth
      if (!width) return

      const forward = Number(row.dataset.dir ?? 1) > 0
      const loop = gsap.fromTo(
        row,
        { x: forward ? 0 : -width },
        {
          x: forward ? -width : 0,
          duration: width / 70,
          ease: 'none',
          repeat: -1
        }
      )
      loops.push(loop)
    })

    if (!loops.length) return

    // A single proxy so all rows share one eased speed value.
    const speed = { value: 1 }
    let direction = 1

    ScrollTrigger.create({
      trigger: document.documentElement,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        direction = self.direction
        const boost = gsap.utils.clamp(0, 7, Math.abs(self.getVelocity()) / 420)
        gsap.to(speed, {
          value: 1 + boost,
          duration: 0.45,
          overwrite: true,
          ease: 'power2.out',
          onUpdate: () => loops.forEach((loop) => loop.timeScale(speed.value * direction))
        })
      }
    })
  }

  /* ------------------------------------------------------------------ */
  /* counters                                                            */
  /* ------------------------------------------------------------------ */

  private setupCounters() {
    this.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => {
      const target = Number(el.dataset.count ?? 0)
      if (!Number.isFinite(target)) return
      const proxy = { value: 0 }

      gsap.to(proxy, {
        value: target,
        duration: 1.8,
        ease: 'power3.out',
        onUpdate: () => {
          el.textContent = Math.round(proxy.value).toLocaleString()
        },
        scrollTrigger: { trigger: el, start: 'top 92%', once: true }
      })
    })
  }

  /* ------------------------------------------------------------------ */
  /* the reel — a pinned, horizontally scrubbed year                     */
  /* ------------------------------------------------------------------ */

  private setupReel() {
    const reel = this.querySelector<HTMLElement>('[data-reel]')
    const track = this.querySelector<HTMLElement>('[data-reel-track]')
    const progress = this.querySelector<HTMLElement>('[data-reel-progress]')
    if (!reel || !track) return

    const distance = () => Math.max(0, track.scrollWidth - window.innerWidth)

    const drive = gsap.to(track, {
      x: () => -distance(),
      ease: 'none',
      scrollTrigger: {
        trigger: reel,
        start: 'top top',
        end: () => `+=${distance()}`,
        pin: true,
        scrub: 0.7,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          if (progress) gsap.set(progress, { scaleX: self.progress })
        }
      }
    })

    // Cards enter in 3D as they cross into view — driven by the horizontal
    // tween rather than the page scrollbar.
    this.querySelectorAll<HTMLElement>('[data-reel-card]').forEach((card) => {
      gsap.from(card, {
        opacity: 0,
        yPercent: 12,
        rotateY: -14,
        scale: 0.9,
        transformPerspective: 900,
        duration: 1,
        ease: 'v4',
        scrollTrigger: {
          trigger: card,
          containerAnimation: drive,
          start: 'left 92%',
          toggleActions: 'play none none reverse'
        }
      })
    })
  }

  /* ------------------------------------------------------------------ */
  /* pointer flourishes                                                  */
  /* ------------------------------------------------------------------ */

  private setupTilt(fine: boolean) {
    if (!fine) return

    this.querySelectorAll<HTMLElement>('[data-tilt]').forEach((el) => {
      gsap.set(el, { transformPerspective: 900, transformOrigin: 'center' })
      const rx = gsap.quickTo(el, 'rotateX', { duration: 0.6, ease: 'power3' })
      const ry = gsap.quickTo(el, 'rotateY', { duration: 0.6, ease: 'power3' })

      this.on(el, 'pointermove', (event) => {
        const e = event as PointerEvent
        const rect = el.getBoundingClientRect()
        const px = (e.clientX - rect.left) / rect.width
        const py = (e.clientY - rect.top) / rect.height
        rx(gsap.utils.interpolate(7, -7, py))
        ry(gsap.utils.interpolate(-9, 9, px))
        el.style.setProperty('--mx', `${px * 100}%`)
        el.style.setProperty('--my', `${py * 100}%`)
      })

      this.on(el, 'pointerleave', () => {
        rx(0)
        ry(0)
      })
    })
  }

  private setupMagnetic() {
    this.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((el) => {
      const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3' })
      const yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3' })

      this.on(el, 'pointermove', (event) => {
        const e = event as PointerEvent
        const rect = el.getBoundingClientRect()
        xTo((e.clientX - (rect.left + rect.width / 2)) * 0.32)
        yTo((e.clientY - (rect.top + rect.height / 2)) * 0.32)
      })

      this.on(el, 'pointerleave', () => {
        xTo(0)
        yTo(0)
      })
    })
  }

  private setupCursor() {
    const cursor = this.querySelector<HTMLElement>('[data-cursor]')
    if (!cursor) return

    gsap.set(cursor, { opacity: 1 })
    const xTo = gsap.quickTo(cursor, 'x', { duration: 0.4, ease: 'power3' })
    const yTo = gsap.quickTo(cursor, 'y', { duration: 0.4, ease: 'power3' })

    this.on(
      window,
      'pointermove',
      (event) => {
        const e = event as PointerEvent
        xTo(e.clientX)
        yTo(e.clientY)
      },
      { passive: true }
    )

    this.on(this, 'pointerover', (event) => {
      const target = event.target
      const hot =
        target instanceof Element ? target.closest('a, button, [data-tilt], [data-magnetic]') : null
      cursor.classList.toggle('is-hot', Boolean(hot))
    })
  }
}

if (!customElements.get('v4-home')) customElements.define('v4-home', V4Home)

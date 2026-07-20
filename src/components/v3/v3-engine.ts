import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const BLOCK_ORDER = ['identity', 'numbers', 'work', 'writing', 'handoff']

class V3Session extends HTMLElement {
  private context?: gsap.Context
  private cleanups: Array<() => void> = []

  connectedCallback() {
    if (this.context) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    this.context = gsap.context(() => {
      this.setupLivePrompt()
      this.setupPlanRail(reduced)
      if (reduced) return
      this.setupThread()
      this.setupCue()
    })

    requestAnimationFrame(() => ScrollTrigger.refresh())
  }

  disconnectedCallback() {
    this.cleanups.forEach((cleanup) => cleanup())
    this.cleanups = []
    this.context?.revert()
    this.context = undefined
  }

  /* ------------------------------------------------------------------ */
  /* utilities                                                           */
  /* ------------------------------------------------------------------ */

  /** Type text into an element, char by char. */
  private typeIn(el: HTMLElement, charsPerSecond = 46, text?: string) {
    const content = text ?? el.textContent ?? ''
    el.textContent = ''
    el.classList.add('is-typing')
    const state = { i: 0 }
    return gsap.to(state, {
      i: content.length,
      duration: content.length / charsPerSecond,
      ease: 'none',
      onUpdate: () => {
        el.textContent = content.slice(0, Math.round(state.i))
      },
      onComplete: () => el.classList.remove('is-typing')
    })
  }

  /** Run a block's entrance sequence the first time it enters the viewport. */
  private onceOnEnter(target: Element, fn: () => void, start = 'top 72%') {
    ScrollTrigger.create({ trigger: target, start, once: true, onEnter: fn })
  }

  /* ------------------------------------------------------------------ */
  /* the thread — every block is generated live                          */
  /* ------------------------------------------------------------------ */

  private setupThread() {
    const compact = window.matchMedia('(max-width: 768px)').matches

    /* 0 · the user's prompt types itself on load, then identity follows */
    const prompt = this.querySelector<HTMLElement>('[data-user-prompt]')
    const identity = this.querySelector<HTMLElement>('[data-block="identity"]')
    if (prompt && identity) {
      // Pre-hide the answer so the session writes it live.
      const thought = identity.querySelector<HTMLElement>('[data-thought]')
      const lines = gsap.utils.toArray<HTMLElement>('[data-answer-line]', identity)
      const photo = identity.querySelector<HTMLElement>('[data-photo]')
      if (thought) gsap.set(thought, { autoAlpha: 0 })
      gsap.set(lines, { autoAlpha: 0, y: 26, filter: 'blur(6px)' })
      if (photo) {
        gsap.set(photo, { autoAlpha: 0, y: 30 })
        const img = photo.querySelector('img')
        if (img) gsap.set(img, { filter: 'blur(16px) grayscale(1)', scale: 1.08 })
      }
      const tl = gsap.timeline()
      tl.add(this.typeIn(prompt, 34, prompt.dataset.text), 0.55)
      tl.add(() => this.runIdentity(), '+=0.25')
    }

    /* 1 · identity is kicked off by the prompt sequence (see runIdentity) */

    /* 2 · numbers */
    const numbers = this.querySelector<HTMLElement>('[data-block="numbers"]')
    if (numbers) {
      this.onceOnEnter(numbers, () => {
        const thought = numbers.querySelector<HTMLElement>('[data-thought]')
        const rows = gsap.utils.toArray<HTMLElement>('[data-readout-row]', numbers)
        const commentary = numbers.querySelector<HTMLElement>('[data-commentary]')
        const tl = gsap.timeline()
        if (thought) tl.add(this.typeIn(thought, 60))
        tl.from(
          rows,
          { autoAlpha: 0, x: -18, duration: 0.5, stagger: 0.12, ease: 'power3.out' },
          '+=0.15'
        )
        rows.forEach((row) => this.rollCounter(row))
        if (commentary)
          tl.add(() => {
            this.typeIn(commentary, 40)
          }, '+=0.35')
      })
    }

    /* 3 · work artifacts */
    const work = this.querySelector<HTMLElement>('[data-block="work"]')
    if (work) {
      this.onceOnEnter(work, () => {
        const thought = work.querySelector<HTMLElement>('[data-thought]')
        if (thought) this.typeIn(thought, 60)
      })
      gsap.utils.toArray<HTMLElement>('[data-artifact]', work).forEach((card, index) => {
        this.onceOnEnter(
          card,
          () => {
            const tl = gsap.timeline()
            tl.fromTo(
              card,
              { autoAlpha: 0, y: 42, clipPath: 'inset(12% 0% 12% 0% round 14px)' },
              {
                autoAlpha: 1,
                y: 0,
                clipPath: 'inset(0% 0% 0% 0% round 14px)',
                duration: 0.85,
                ease: 'power3.out'
              }
            )
            const stamp = card.querySelector('[data-artifact-stamp]')
            if (stamp) {
              tl.add(() => stamp.classList.add('is-generated'), '-=0.2')
            }
            const media = card.querySelector<HTMLElement>('[data-artifact-media]')
            if (media && !compact) {
              tl.fromTo(
                media,
                { filter: 'blur(10px) saturate(0.6)', scale: 1.04 },
                { filter: 'blur(0px) saturate(1)', scale: 1, duration: 0.9, ease: 'power2.out' },
                0.15
              )
            }
          },
          'top 78%'
        )
        card.style.zIndex = String(10 + index)
      })
    }

    /* 4 · writing — log-style index, then the summary quote */
    const writing = this.querySelector<HTMLElement>('[data-block="writing"]')
    if (writing) {
      this.onceOnEnter(writing, () => {
        const thought = writing.querySelector<HTMLElement>('[data-thought]')
        const lines = gsap.utils.toArray<HTMLElement>('[data-log-line]', writing)
        const tl = gsap.timeline()
        if (thought) tl.add(this.typeIn(thought, 60))
        tl.from(
          lines,
          { autoAlpha: 0, y: 10, duration: 0.32, stagger: 0.06, ease: 'power2.out' },
          '+=0.1'
        )
      })
      const quote = writing.querySelector<HTMLElement>('[data-quote]')
      if (quote) {
        this.onceOnEnter(
          quote,
          () => {
            gsap.from(gsap.utils.toArray<HTMLElement>('[data-quote-word]', quote), {
              yPercent: 112,
              duration: 0.9,
              stagger: 0.06,
              ease: 'power4.out'
            })
            gsap.from(quote.querySelector('cite'), {
              autoAlpha: 0,
              y: 12,
              duration: 0.7,
              delay: 0.5
            })
          },
          'top 80%'
        )
      }
    }

    /* 5 · handoff — closing lines, then the prompt takes focus visually */
    const handoff = this.querySelector<HTMLElement>('[data-block="handoff"]')
    if (handoff) {
      this.onceOnEnter(
        handoff,
        () => {
          const lines = gsap.utils.toArray<HTMLElement>('[data-answer-line]', handoff)
          const box = handoff.querySelector<HTMLElement>('[data-live-prompt]')
          const chips = gsap.utils.toArray<HTMLElement>('[data-chip]', handoff)
          const tl = gsap.timeline()
          tl.from(lines, { autoAlpha: 0, y: 22, duration: 0.7, stagger: 0.35, ease: 'power3.out' })
          if (box) {
            tl.fromTo(
              box,
              { autoAlpha: 0, y: 18 },
              { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power3.out' },
              '+=0.2'
            )
            tl.add(() => box.classList.add('is-armed'))
          }
          tl.from(chips, { autoAlpha: 0, y: 12, duration: 0.45, stagger: 0.07 }, '+=0.15')
        },
        'top 68%'
      )
    }
  }

  /** identity runs right after the opening prompt finishes typing. */
  private runIdentity() {
    const block = this.querySelector<HTMLElement>('[data-block="identity"]')
    if (!block) return
    // Like any good agent UI, the session scrolls itself to the fresh answer.
    block.scrollIntoView({ behavior: 'smooth', block: 'start' })
    const thought = block.querySelector<HTMLElement>('[data-thought]')
    const answerLines = gsap.utils.toArray<HTMLElement>('[data-answer-line]', block)
    const photo = block.querySelector<HTMLElement>('[data-photo]')
    const tl = gsap.timeline()
    if (thought) {
      tl.set(thought, { autoAlpha: 1 })
      tl.add(this.typeIn(thought, 60))
    }
    tl.to(
      answerLines,
      {
        autoAlpha: 1,
        y: 0,
        filter: 'blur(0px)',
        duration: 0.8,
        stagger: 0.14,
        ease: 'power3.out'
      },
      '+=0.2'
    )
    if (photo) {
      tl.to(photo, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power3.out' }, '-=0.35')
      const img = photo.querySelector('img')
      if (img) {
        tl.to(
          img,
          { filter: 'blur(0px) grayscale(0)', scale: 1, duration: 1.1, ease: 'power2.out' },
          '-=0.45'
        )
      }
      const stamp = photo.querySelector('[data-artifact-stamp]')
      if (stamp) tl.add(() => stamp.classList.add('is-generated'))
    }
  }

  private rollCounter(scope: ParentNode) {
    scope.querySelectorAll<HTMLElement>('[data-count-to]').forEach((el) => {
      const target = Number(el.dataset.countTo ?? '0')
      const suffix = el.dataset.countSuffix ?? ''
      const state = { value: 0 }
      gsap.to(state, {
        value: target,
        duration: 1.5,
        ease: 'power3.out',
        onUpdate: () => {
          el.textContent = `${Math.round(state.value)}${suffix}`
        }
      })
    })
  }

  /* ------------------------------------------------------------------ */
  /* plan rail — the agent's plan, checked off as you scroll             */
  /* ------------------------------------------------------------------ */

  private setupPlanRail(reduced: boolean) {
    const rail = this.querySelector<HTMLElement>('[data-plan]')
    if (!rail) return
    const steps = BLOCK_ORDER.map((id) => rail.querySelector<HTMLElement>(`[data-step='${id}']`))

    const setActive = (id: string) => {
      const index = BLOCK_ORDER.indexOf(id)
      steps.forEach((step, i) => {
        step?.classList.toggle('is-done', i < index)
        step?.classList.toggle('is-active', i === index)
      })
    }

    BLOCK_ORDER.forEach((id) => {
      const section = this.querySelector(`[data-block='${id}']`)
      if (!section) return
      ScrollTrigger.create({
        trigger: section,
        start: 'top 55%',
        end: 'bottom 55%',
        onToggle: (self) => {
          if (self.isActive) setActive(id)
        }
      })
    })

    if (!reduced) {
      // The plan "gets written" once the session is underway.
      this.onceOnEnter(
        this.querySelector('[data-block="numbers"]') ?? rail,
        () => rail.classList.add('is-visible'),
        'top 80%'
      )
    } else {
      rail.classList.add('is-visible')
    }

    rail.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((link) => {
      const onClick = (event: MouseEvent) => {
        const target = this.querySelector(link.getAttribute('href') ?? '')
        if (!target) return
        event.preventDefault()
        target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
      }
      link.addEventListener('click', onClick)
      this.cleanups.push(() => link.removeEventListener('click', onClick))
    })
  }

  /* ------------------------------------------------------------------ */
  /* the handoff — a prompt that actually works                          */
  /* ------------------------------------------------------------------ */

  private setupLivePrompt() {
    const input = this.querySelector<HTMLInputElement>('[data-prompt-input]')
    const echo = this.querySelector<HTMLElement>('[data-prompt-echo]')
    if (!input || !echo) return
    const isEn = this.dataset.locale === 'en'
    const prefix = isEn ? '/en' : ''

    const routes: Record<string, string> = {
      blog: `${prefix}/blog`,
      notes: `${prefix}/notes`,
      about: `${prefix}/about`,
      contact: `${prefix}/contact`,
      github: 'https://github.com/joyehuang'
    }
    if (!isEn) routes.talks = '/talks'

    const say = (line: string, ok: boolean) => {
      echo.textContent = line
      echo.classList.toggle('is-ok', ok)
      echo.classList.add('is-visible')
    }

    const onKeydown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter') return
      const raw = input.value.trim().toLowerCase().replace(/^\/+/, '')
      if (!raw) return
      const href = routes[raw]
      if (href) {
        say(isEn ? `→ opening ${raw} …` : `→ 正在打开 ${raw} …`, true)
        window.setTimeout(() => {
          window.location.href = href
        }, 420)
      } else if (raw === 'sudo' || raw === 'sudo rm -rf /') {
        say(isEn ? 'nice try.' : '想得美。', false)
      } else {
        say(
          isEn
            ? `command not found: ${raw} — try 'blog', 'notes', 'about', 'contact' or 'github'`
            : `command not found: ${raw} — 试试 'blog'、'notes'、'about'、'contact' 或 'github'`,
          false
        )
      }
      input.value = ''
    }
    input.addEventListener('keydown', onKeydown)
    this.cleanups.push(() => input.removeEventListener('keydown', onKeydown))
  }

  /* ------------------------------------------------------------------ */
  /* scroll cue — fades away after the first scroll                      */
  /* ------------------------------------------------------------------ */

  private setupCue() {
    const cue = this.querySelector<HTMLElement>('[data-cue]')
    if (!cue) return
    const onScroll = () => {
      if (window.scrollY > 60) {
        cue.classList.add('is-hidden')
        window.removeEventListener('scroll', onScroll)
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    this.cleanups.push(() => window.removeEventListener('scroll', onScroll))
  }
}

if (!customElements.get('v3-home')) customElements.define('v3-home', V3Session)

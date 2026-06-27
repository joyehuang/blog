const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

function clearWillChange(elements: HTMLElement[]) {
  elements.forEach((element) => {
    element.style.willChange = ''
  })
}

async function initHomeAnimations() {
  const root = document.querySelector<HTMLElement>('[data-home-page]')
  if (!root) return

  if (reduceMotion.matches) {
    return
  }

  const [{ default: gsap }, { ScrollTrigger }] = await Promise.all([
    import('gsap'),
    import('gsap/ScrollTrigger')
  ])

  gsap.registerPlugin(ScrollTrigger)

  const ctx = gsap.context(() => {
    const heroItems = gsap.utils.toArray<HTMLElement>('[data-home-hero-item]')
    const content = document.querySelector<HTMLElement>('[data-home-content]')
    const heroTargets = content ? [...heroItems, content] : heroItems

    gsap.set(heroItems, { autoAlpha: 0, y: 14, willChange: 'transform, opacity' })

    if (content) {
      gsap.set(content, { autoAlpha: 0, y: 10, willChange: 'transform, opacity' })
    }

    gsap
      .timeline({
        defaults: { duration: 0.42, ease: 'power2.out' },
        onComplete: () => clearWillChange(heroTargets)
      })
      .to(heroItems, { autoAlpha: 1, y: 0, stagger: 0.055 }, 0)
      .to(content, { autoAlpha: 1, y: 0 }, 0.22)

    const sections = gsap.utils.toArray<HTMLElement>('[data-home-section]')

    gsap.set(sections, {
      autoAlpha: 0,
      y: 22,
      willChange: 'transform, opacity'
    })

    ScrollTrigger.batch(sections, {
      start: 'top 86%',
      once: true,
      interval: 0.08,
      batchMax: 4,
      onEnter: (batch) => {
        gsap.to(batch, {
          autoAlpha: 1,
          y: 0,
          duration: 0.48,
          ease: 'power2.out',
          stagger: 0.07,
          overwrite: 'auto',
          onComplete: () => clearWillChange(batch as HTMLElement[])
        })
      }
    })

    requestAnimationFrame(() => ScrollTrigger.refresh())
  }, root)

  const onMotionPreferenceChange = () => {
    ctx.revert()
    void initHomeAnimations()
  }

  reduceMotion.addEventListener('change', onMotionPreferenceChange, { once: true })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => void initHomeAnimations(), { once: true })
} else {
  void initHomeAnimations()
}

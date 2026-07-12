import type { IntroAnimation, IntroBuilder, IntroTrigger, IntroVariant } from './types'

const SEEN_KEY = 'joye:intro:v4:seen'
const VARIANT_KEY = 'joye:intro:v4:variant'
const VARIANTS: IntroVariant[] = ['focus', 'line', 'jojo']
const BUILDER_LOADERS: Record<IntroVariant, () => Promise<IntroBuilder>> = {
  focus: () => import('./variants/focus').then(({ buildFocusIntro }) => buildFocusIntro),
  line: () => import('./variants/line').then(({ buildLineIntro }) => buildLineIntro),
  jojo: () => import('./variants/jojo').then(({ buildJoJoIntro }) => buildJoJoIntro)
}

type ReplayTrigger = Extract<IntroTrigger, 'event' | 'replay'>
type IntroEventDetail = { variant?: IntroVariant; trigger?: ReplayTrigger }

type IntroWindow = Window & {
  __introWatchdog?: number
  __joyeIntro?: {
    play(variant: IntroVariant, trigger?: ReplayTrigger): void
  }
  __siteAnalyticsQueue?: Array<{
    eventName: string
    properties: Record<string, string | number | boolean | null>
  }>
  __trackSiteAnalytics?: (detail: {
    eventName: string
    properties: Record<string, string | number | boolean | null>
  }) => void
}

function isVariant(value: unknown): value is IntroVariant {
  return typeof value === 'string' && VARIANTS.includes(value as IntroVariant)
}

function storedVariant(): IntroVariant {
  try {
    const value = localStorage.getItem(VARIANT_KEY)
    return isVariant(value) ? value : 'jojo'
  } catch {
    return 'jojo'
  }
}

function prepareVariantAssets(root: HTMLElement) {
  root.querySelectorAll<HTMLImageElement>('img[data-intro-src]').forEach((image) => {
    const source = image.dataset.introSrc
    if (source && !image.hasAttribute('src')) image.src = source
  })
}

function markIntroSeen(variant: IntroVariant) {
  try {
    localStorage.setItem(SEEN_KEY, `${variant}:${Date.now()}`)
  } catch {
    // Playback remains available when storage is unavailable.
  }
}

function trackIntro(
  eventName: string,
  variant: IntroVariant,
  trigger: IntroTrigger,
  source: 'first_visit' | 'replay',
  properties: Record<string, string | number | boolean | null> = {}
) {
  const detail = {
    eventName,
    properties: {
      surface: 'intro_overlay',
      variant,
      trigger,
      source,
      ...properties
    }
  }
  const analyticsWindow = window as IntroWindow
  if (analyticsWindow.__trackSiteAnalytics) {
    analyticsWindow.__trackSiteAnalytics(detail)
    return
  }
  analyticsWindow.__siteAnalyticsQueue ??= []
  analyticsWindow.__siteAnalyticsQueue.push(detail)
  document.dispatchEvent(new CustomEvent('site:analytics', { detail }))
}

function initIntro() {
  if (/^(?:www\.)?joyehuang\.me$/i.test(location.hostname)) return

  const overlayQuery = document.getElementById('intro-overlay')
  const skipButtonQuery = document.getElementById('intro-skip') as HTMLButtonElement | null
  const triggerDockQuery = document.getElementById('intro-trigger-dock')
  const triggerToggleQuery = document.getElementById(
    'intro-trigger-toggle'
  ) as HTMLButtonElement | null
  const triggerMenuQuery = document.getElementById('intro-trigger-menu')
  if (
    !overlayQuery ||
    !skipButtonQuery ||
    !triggerDockQuery ||
    !triggerToggleQuery ||
    !triggerMenuQuery
  )
    return

  const overlay = overlayQuery
  const skipButton = skipButtonQuery
  const triggerDock = triggerDockQuery
  const triggerToggle = triggerToggleQuery
  const triggerMenu = triggerMenuQuery
  const introWindow = window as IntroWindow

  const variantElements = new Map<IntroVariant, HTMLElement>()
  overlay.querySelectorAll<HTMLElement>('[data-intro-variant]').forEach((element) => {
    const variant = element.dataset.introVariant
    if (isVariant(variant)) variantElements.set(variant, element)
  })

  const reduceQuery = matchMedia('(prefers-reduced-motion: reduce)')
  const compactQuery = matchMedia('(max-width: 640px), (pointer: coarse)')
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection

  let animation: IntroAnimation | null = null
  let currentVariant: IntroVariant = storedVariant()
  let currentTrigger: IntroTrigger = 'first_visit'
  let currentSource: 'first_visit' | 'replay' = 'first_visit'
  let startedAt = 0
  let active = false
  let exiting = false
  let exitTimer = 0
  let safetyTimer = 0
  let playRequest = 0
  let restoreFocus: HTMLElement | null = null
  const inerted = new Set<HTMLElement>()

  function setMenu(open: boolean) {
    triggerDock.dataset.open = String(open)
    triggerToggle.setAttribute('aria-expanded', String(open))
    triggerMenu.setAttribute('aria-hidden', String(!open))
    triggerMenu.toggleAttribute('inert', !open)
    triggerMenu.querySelectorAll<HTMLButtonElement>('button').forEach((button) => {
      button.tabIndex = open ? 0 : -1
    })
    if (open) {
      requestAnimationFrame(() => triggerMenu.querySelector<HTMLButtonElement>('button')?.focus())
    } else if (triggerMenu.contains(document.activeElement)) {
      triggerToggle.focus({ preventScroll: true })
    }
  }

  function setPageInert(inert: boolean) {
    if (!inert) {
      inerted.forEach((element) => element.removeAttribute('inert'))
      inerted.clear()
      document.documentElement.classList.remove('intro-scroll-lock')
      return
    }

    const container = overlay.parentElement
    if (container) {
      Array.from(container.children).forEach((child) => {
        if (!(child instanceof HTMLElement) || child === overlay) return
        if (!child.hasAttribute('inert')) {
          child.setAttribute('inert', '')
          inerted.add(child)
        }
      })
    }
    Array.from(document.body.children).forEach((child) => {
      if (!(child instanceof HTMLElement) || child === container || child.tagName === 'SCRIPT')
        return
      if (!child.hasAttribute('inert')) {
        child.setAttribute('inert', '')
        inerted.add(child)
      }
    })
    document.documentElement.classList.add('intro-scroll-lock')
  }

  function selectVariant(variant: IntroVariant) {
    variantElements.forEach((element, id) => {
      const selected = id === variant
      element.hidden = !selected
      element.setAttribute('aria-hidden', 'true')
    })
    overlay.dataset.variant = variant
  }

  function releaseOverlay(skipped: boolean) {
    if (!active || exiting) return
    exiting = true
    playRequest += 1
    const duration = Math.max(0, Math.round(performance.now() - startedAt))
    window.clearTimeout(safetyTimer)

    overlay.classList.add('intro-exit')
    overlay.classList.remove('intro-active', 'intro-pending', 'intro-loading')
    overlay.setAttribute('aria-hidden', 'true')
    setPageInert(false)
    window.dispatchEvent(
      new CustomEvent('joye:intro:complete', {
        detail: { variant: currentVariant, skipped }
      })
    )
    const focusTarget = restoreFocus
    restoreFocus = null
    requestAnimationFrame(() => {
      if (focusTarget?.isConnected && !focusTarget.closest('[inert]')) {
        focusTarget.focus({ preventScroll: true })
      } else {
        skipButton.blur()
      }
    })

    if (skipped) {
      trackIntro('intro_skip', currentVariant, currentTrigger, currentSource, {
        target: 'skip',
        duration_ms: duration
      })
    } else {
      trackIntro('intro_complete', currentVariant, currentTrigger, currentSource, {
        target: 'content',
        duration_ms: duration
      })
    }

    window.clearTimeout(exitTimer)
    exitTimer = window.setTimeout(
      () => {
        animation?.timeline.kill()
        animation?.cleanup()
        animation = null
        variantElements.forEach((element) => {
          element.hidden = true
        })
        overlay.classList.add('intro-idle')
        overlay.classList.remove('intro-exit')
        active = false
        exiting = false
      },
      skipped ? 180 : 120
    )
  }

  async function play(variant: IntroVariant, trigger: IntroTrigger) {
    const request = ++playRequest
    if (reduceQuery.matches || connection?.saveData) {
      window.clearTimeout(safetyTimer)
      setMenu(false)
      animation?.timeline.kill()
      animation?.cleanup()
      animation = null
      overlay.classList.add('intro-idle')
      overlay.classList.remove('intro-pending', 'intro-active', 'intro-exit', 'intro-loading')
      overlay.setAttribute('aria-hidden', 'true')
      setPageInert(false)
      triggerDock.hidden = true
      active = false
      exiting = false
      return
    }

    window.clearTimeout(exitTimer)
    window.clearTimeout(safetyTimer)
    animation?.timeline.kill()
    animation?.cleanup()
    animation = null
    active = true
    exiting = false
    currentVariant = variant
    currentTrigger = trigger
    currentSource = trigger === 'first_visit' ? 'first_visit' : 'replay'
    startedAt = performance.now()
    const activeElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    restoreFocus =
      activeElement &&
      document.activeElement !== document.body &&
      document.activeElement !== document.documentElement &&
      !overlay.contains(document.activeElement)
        ? triggerMenu.contains(activeElement)
          ? triggerToggle
          : activeElement
        : null

    try {
      localStorage.setItem(VARIANT_KEY, variant)
    } catch {
      // Storage is an enhancement; private browsing must not block the entrance.
    }
    markIntroSeen(variant)

    setMenu(false)
    selectVariant(variant)
    overlay.classList.remove('intro-idle', 'intro-exit')
    overlay.classList.add('intro-active', 'intro-loading', 'intro-pending')
    overlay.setAttribute('aria-hidden', 'false')
    setPageInert(true)

    const root = variantElements.get(variant)
    if (!root) {
      releaseOverlay(true)
      return
    }
    prepareVariantAssets(root)

    trackIntro('intro_start', variant, trigger, currentSource, { target: 'animation' })
    if (trigger === 'picker' || trigger === 'event' || trigger === 'replay') {
      trackIntro('intro_replay', variant, trigger, 'replay', { target: variant })
    }
    safetyTimer = window.setTimeout(() => releaseOverlay(false), 9000)

    try {
      const builder = await BUILDER_LOADERS[variant]()
      if (request !== playRequest || !active || exiting) return
      animation = builder({
        root,
        compact: compactQuery.matches,
        targets: {
          avatar: document.querySelector<HTMLElement>(
            '[data-intro-target="avatar"], #content-header img'
          ),
          contentHeader: document.getElementById('content-header'),
          header: document.querySelector<HTMLElement>('header-component'),
          jojo: document.getElementById('home-jojo')
        }
      })
      overlay.classList.remove('intro-loading', 'intro-pending')
    } catch {
      if (request !== playRequest || !active || exiting) return
      window.clearTimeout(safetyTimer)
      overlay.classList.add('intro-idle')
      overlay.classList.remove('intro-active', 'intro-pending', 'intro-exit', 'intro-loading')
      overlay.setAttribute('aria-hidden', 'true')
      root.hidden = true
      setPageInert(false)
      active = false
      return
    }
    animation.timeline.eventCallback('onComplete', () => releaseOverlay(false))

    requestAnimationFrame(() => {
      if (!animation || !active) return
      skipButton.focus({ preventScroll: true })
      animation.timeline.play(0)
    })
  }

  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null
    if (!target) return
    if (target.closest('#intro-skip')) {
      releaseOverlay(true)
      return
    }
    if (target.closest('#intro-trigger-toggle')) {
      setMenu(triggerDock.dataset.open !== 'true')
      return
    }
    const choice = target.closest<HTMLElement>('[data-intro-trigger]')
    if (choice && triggerMenu.contains(choice)) {
      const variant = choice.dataset.introTrigger
      if (isVariant(variant)) void play(variant, 'picker')
      return
    }
    if (triggerDock.dataset.open === 'true' && !triggerDock.contains(target)) setMenu(false)
  })

  window.addEventListener('joye:intro', (event) => {
    const detail = event instanceof CustomEvent ? (event.detail as IntroEventDetail | null) : null
    if (detail?.variant && isVariant(detail.variant)) {
      void play(detail.variant, detail.trigger === 'replay' ? 'replay' : 'event')
    }
  })
  introWindow.__joyeIntro = {
    play: (variant, trigger = 'event') => void play(variant, trigger)
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (active) releaseOverlay(true)
      else setMenu(false)
      return
    }
    if (active && event.key === 'Tab') {
      event.preventDefault()
      skipButton.focus({ preventScroll: true })
    }
  })

  reduceQuery.addEventListener('change', (event) => {
    if (event.matches && active) releaseOverlay(true)
  })
  window.addEventListener('pagehide', () => {
    if (!active || exiting) return
    trackIntro('intro_abandon', currentVariant, currentTrigger, currentSource, {
      target: 'pagehide',
      duration_ms: Math.max(0, Math.round(performance.now() - startedAt))
    })
    window.clearTimeout(exitTimer)
    window.clearTimeout(safetyTimer)
    animation?.timeline.kill()
    animation?.cleanup()
    animation = null
    variantElements.forEach((element) => {
      element.hidden = true
    })
    overlay.classList.add('intro-idle')
    overlay.classList.remove('intro-active', 'intro-exit', 'intro-pending', 'intro-loading')
    overlay.setAttribute('aria-hidden', 'true')
    setPageInert(false)
    active = false
    exiting = false
  })

  setMenu(false)
  if (introWindow.__introWatchdog) {
    window.clearTimeout(introWindow.__introWatchdog)
    introWindow.__introWatchdog = undefined
  }
  const introParam = new URLSearchParams(location.search).get('intro')
  const forcedVariant = isVariant(introParam) ? introParam : null
  if (introParam === 'picker') {
    overlay.classList.add('intro-idle')
    overlay.classList.remove('intro-pending')
    setMenu(true)
    return
  }
  if (introParam === 'off') {
    overlay.classList.add('intro-idle')
    overlay.classList.remove('intro-pending')
    return
  }

  if (!overlay.classList.contains('intro-idle')) {
    void play(forcedVariant ?? storedVariant(), forcedVariant ? 'url' : 'first_visit')
  }
}

initIntro()

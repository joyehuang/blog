import { gsap } from 'gsap'

import type { IntroBuilder } from '../types'

const query = <T extends Element>(root: HTMLElement, selector: string) =>
  root.querySelector<T>(selector)

const queryAll = <T extends Element>(root: HTMLElement, selector: string) =>
  Array.from(root.querySelectorAll<T>(selector))

export const buildFocusIntro: IntroBuilder = ({ root, targets, compact }) => {
  const veil = query<HTMLElement>(root, '.focus-veil')
  const stage = query<HTMLElement>(root, '.focus-stage')
  const optic = query<HTMLElement>(root, '.focus-optic')
  const proxy = query<HTMLElement>(root, '.focus-proxy')
  const avatar = query<HTMLImageElement>(root, '.focus-avatar-proxy')
  const blades = query<SVGGElement>(root, '.focus-blades')
  const bladeParts = queryAll<SVGPathElement>(root, '.focus-blade')
  const majorTicks = query<HTMLElement>(root, '.focus-ticks--major')
  const minorTicks = query<HTMLElement>(root, '.focus-ticks--minor')
  const reticle = query<HTMLElement>(root, '.focus-reticle')
  const lockRing = query<HTMLElement>(root, '.focus-lock-ring')
  const marks = queryAll<HTMLElement>(root, '.focus-mark')
  const exposure = query<HTMLElement>(root, '.focus-exposure')
  const readout = query<HTMLElement>(root, '.focus-readout')
  const manualState = query<HTMLElement>(root, '.focus-state--manual')
  const lockedState = query<HTMLElement>(root, '.focus-state--locked')
  const orbits = queryAll<HTMLElement>(root, '.focus-orbit')
  const lensRings = queryAll<HTMLElement>(root, '.focus-lens-ring')
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  let timeline!: gsap.core.Timeline
  let cleaned = false

  const animationContext = gsap.context(() => {
    timeline = gsap.timeline({ paused: true })

    if (
      !veil ||
      !stage ||
      !optic ||
      !proxy ||
      !avatar ||
      !blades ||
      !majorTicks ||
      !minorTicks ||
      !reticle ||
      !lockRing ||
      !exposure ||
      !readout ||
      !manualState ||
      !lockedState
    ) {
      return
    }

    const proxyRect = proxy.getBoundingClientRect()
    const proxyCenterX = proxyRect.left + proxyRect.width / 2
    const proxyCenterY = proxyRect.top + proxyRect.height / 2
    const resolveDestination = () => {
      const targetRect = targets.avatar?.getBoundingClientRect()
      const targetCenterX = targetRect?.width
        ? targetRect.left + targetRect.width / 2
        : proxyCenterX
      const targetCenterY = targetRect?.height
        ? targetRect.top + targetRect.height / 2
        : proxyCenterY
      const scaleX = targetRect?.width ? targetRect.width / Math.max(proxyRect.width, 1) : 0.72

      return {
        x: targetCenterX - proxyCenterX,
        y: targetCenterY - proxyCenterY,
        scaleX,
        scaleY: targetRect?.height ? targetRect.height / Math.max(proxyRect.height, 1) : scaleX
      }
    }
    const apertureRadius =
      Math.hypot(
        Math.max(proxyCenterX, innerWidth - proxyCenterX),
        Math.max(proxyCenterY, innerHeight - proxyCenterY)
      ) + 96
    const firstAperture = Math.max(58, proxyRect.width * 0.54)
    const initialBlur = compact ? 7 : 16
    const intermediateBlur = compact ? 2 : 5

    gsap.set(root, { opacity: 1 })
    gsap.set(veil, { '--focus-hole': '0px', opacity: 1 })
    gsap.set(stage, { opacity: 0, scale: 0.94 })
    gsap.set(optic, { opacity: 1, rotation: -7, scale: 0.88 })
    gsap.set(orbits, { opacity: 0, rotation: compact ? -5 : -12, scale: 0.94 })
    gsap.set(majorTicks, { opacity: 0, rotation: -22 })
    gsap.set(minorTicks, { opacity: 0, rotation: 17 })
    gsap.set(lensRings, { opacity: 0, scale: 0.9 })
    gsap.set(blades, { opacity: 0, rotation: -28, scale: 0.86, transformOrigin: '50% 50%' })
    gsap.set(bladeParts, { opacity: 0.28 })
    gsap.set(proxy, {
      opacity: 0.38,
      x: 0,
      y: 0,
      scale: compact ? 1.07 : 1.13,
      transformOrigin: '50% 50%'
    })
    gsap.set(avatar, {
      filter: `blur(${initialBlur}px) saturate(0.68) contrast(0.9)`
    })
    gsap.set(reticle, { opacity: 0, scale: 1.28 })
    gsap.set(lockRing, { opacity: 0, scale: 0.68 })
    gsap.set(marks, { opacity: 0, y: compact ? 4 : 8 })
    gsap.set([exposure, readout], { opacity: 0, y: compact ? 3 : 6 })
    gsap.set(manualState, { opacity: 1 })
    gsap.set(lockedState, { opacity: 0 })

    if (reducedMotion) {
      gsap.set(stage, { opacity: 1, scale: 1 })
      gsap.set(optic, { opacity: 1, rotation: 0, scale: 1 })
      gsap.set(proxy, { opacity: 1, scale: 1 })
      gsap.set(avatar, { filter: 'none' })
      gsap.set([exposure, readout], { opacity: 1, y: 0 })
      timeline
        .set(veil, { '--focus-hole': `${apertureRadius}px` }, 0)
        .to([stage, root], { opacity: 0, duration: 0.16, ease: 'none' }, 0.12)
      return
    }

    timeline
      .to(stage, { opacity: 1, scale: 1, duration: 0.34, ease: 'power2.out' }, 0)
      .to(optic, { rotation: 0, scale: 1, duration: 0.58, ease: 'power3.out' }, 0.04)
      .to(orbits, { opacity: 1, scale: 1, duration: 0.44, ease: 'power2.out' }, 0.06)
      .to(orbits[0], { rotation: compact ? 4 : 9, duration: 1.1, ease: 'power1.out' }, 0.12)
      .to(orbits[1], { rotation: compact ? -3 : -6, duration: 1, ease: 'power1.out' }, 0.12)
      .to(majorTicks, { opacity: 0.82, rotation: 2, duration: 0.68, ease: 'power3.out' }, 0.08)
      .to(
        minorTicks,
        { opacity: compact ? 0.22 : 0.5, rotation: -3, duration: 0.72, ease: 'power3.out' },
        0.08
      )
      .to(
        lensRings,
        { opacity: 1, scale: 1, duration: 0.5, stagger: 0.05, ease: 'power2.out' },
        0.08
      )
      .to(
        blades,
        {
          opacity: compact ? 0.68 : 0.9,
          rotation: 18,
          scale: 1,
          duration: 0.74,
          ease: 'power3.inOut'
        },
        0.12
      )
      .to(bladeParts, { opacity: 1, duration: 0.3, stagger: 0.045, ease: 'power1.out' }, 0.18)
      .to(proxy, { opacity: 1, scale: 1.025, duration: 0.62, ease: 'power2.out' }, 0.18)
      .to(
        avatar,
        {
          filter: `blur(${intermediateBlur}px) saturate(0.9) contrast(0.97)`,
          duration: 0.58,
          ease: 'power2.out'
        },
        0.2
      )
      .to(
        marks,
        {
          opacity: compact ? 0.62 : 0.86,
          y: 0,
          duration: 0.32,
          stagger: 0.055,
          ease: 'power2.out'
        },
        0.28
      )
      .to(
        [exposure, readout],
        { opacity: 1, y: 0, duration: 0.32, stagger: 0.06, ease: 'power2.out' },
        0.34
      )
      .to(reticle, { opacity: 0.82, scale: 1, duration: 0.3, ease: 'back.out(1.7)' }, 0.72)
      .to(
        avatar,
        { filter: 'blur(0px) saturate(1) contrast(1)', duration: 0.3, ease: 'power3.out' },
        0.78
      )
      .to(proxy, { scale: 1, duration: 0.32, ease: 'power3.out' }, 0.78)
      .to(manualState, { opacity: 0, duration: 0.12, ease: 'none' }, 0.86)
      .to(lockedState, { opacity: 1, duration: 0.16, ease: 'power1.out' }, 0.9)
      .fromTo(
        lockRing,
        { opacity: 0, scale: 0.68 },
        { opacity: 0.96, scale: 1, duration: 0.16, ease: 'power3.out' },
        0.84
      )
      .to(lockRing, { opacity: 0, scale: 1.38, duration: 0.28, ease: 'power2.out' }, 1)
      .to(veil, { '--focus-hole': `${firstAperture}px`, duration: 0.28, ease: 'power2.out' }, 1.08)
      .to(blades, { opacity: 0, rotation: 62, scale: 1.1, duration: 0.56, ease: 'power3.in' }, 1.12)
      .to(reticle, { opacity: 0, scale: 0.86, duration: 0.34, ease: 'power2.in' }, 1.16)
      .to(veil, { '--focus-hole': `${apertureRadius}px`, duration: 0.8, ease: 'expo.inOut' }, 1.32)
      .to(
        proxy,
        {
          x: () => resolveDestination().x,
          y: () => resolveDestination().y,
          scaleX: () => resolveDestination().scaleX,
          scaleY: () => resolveDestination().scaleY,
          duration: 0.7,
          ease: 'power4.inOut'
        },
        1.25
      )
      .to(
        [majorTicks, minorTicks, ...lensRings],
        { opacity: 0, scale: 1.08, duration: 0.54, ease: 'power2.in' },
        1.3
      )
      .to(orbits, { opacity: 0, scale: 1.04, duration: 0.46, ease: 'power2.in' }, 1.32)
      .to(
        marks,
        { opacity: 0, y: compact ? -2 : -5, duration: 0.26, stagger: 0.025, ease: 'power1.in' },
        1.42
      )
      .to([exposure, readout], { opacity: 0, y: -4, duration: 0.28, ease: 'power1.in' }, 1.48)
      .to(optic, { opacity: 0, scale: 1.08, duration: 0.48, ease: 'power2.in' }, 1.48)
      .to(proxy, { opacity: 0, duration: 0.18, ease: 'none' }, 1.94)
      .to(stage, { opacity: 0, duration: 0.18, ease: 'none' }, 1.98)
      .to(root, { opacity: 0, duration: 0.18, ease: 'none' }, 2.12)
  }, root)

  if (!reducedMotion) timeline.timeScale(compact ? 0.5 : 0.44)

  return {
    timeline,
    cleanup() {
      if (cleaned) return
      cleaned = true
      animationContext.revert()
      timeline.kill()
    }
  }
}

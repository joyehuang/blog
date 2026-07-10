import { gsap } from 'gsap'

import type { IntroAnimation, IntroBuilder } from '../types'

type LandingGeometry = {
  x: number
  y: number
  scaleX: number
  scaleY: number
}

const prepareStroke = (shape: SVGGeometryElement) => {
  const length = Math.max(shape.getTotalLength(), 1)
  gsap.set(shape, {
    strokeDasharray: `${length} ${length}`,
    strokeDashoffset: length
  })
  return length
}

export const buildLineIntro: IntroBuilder = ({ root, targets, compact }) => {
  root.classList.toggle('is-compact', compact)

  const activeLayout = root.querySelector<SVGSVGElement>(
    `[data-line-layout="${compact ? 'compact' : 'wide'}"]`
  )
  const inactiveLayout = root.querySelector<SVGSVGElement>(
    `[data-line-layout="${compact ? 'wide' : 'compact'}"]`
  )
  const thought = activeLayout?.querySelector<SVGGeometryElement>('[data-line-path]') ?? null
  const resonance = activeLayout?.querySelector<SVGGeometryElement>('[data-line-resonance]') ?? null
  const anchor = activeLayout?.querySelector<SVGGraphicsElement>('[data-line-anchor]') ?? null
  const structures = Array.from(
    activeLayout?.querySelectorAll<SVGGeometryElement>('[data-line-structure]') ?? []
  )
  const nodes = Array.from(activeLayout?.querySelectorAll<SVGElement>('[data-line-node]') ?? [])
  const labels = Array.from(
    activeLayout?.querySelectorAll<SVGTextElement>('[data-line-label]') ?? []
  )
  const stage = root.querySelector<HTMLElement>('[data-line-stage]')
  const curtains = Array.from(root.querySelectorAll<HTMLElement>('[data-line-curtain]'))
  const topCurtain = root.querySelector<HTMLElement>('[data-line-curtain="top"]')
  const bottomCurtain = root.querySelector<HTMLElement>('[data-line-curtain="bottom"]')
  const proxy = root.querySelector<HTMLElement>('[data-line-proxy]')
  const proxyRing = root.querySelector<SVGGeometryElement>('[data-line-proxy-ring]')
  const proxyCore = root.querySelector<HTMLElement>('[data-line-proxy-core]')
  const caption = root.querySelector<HTMLElement>('[data-line-caption]')

  let timeline!: gsap.core.Timeline
  let landing: LandingGeometry = { x: 0, y: 0, scaleX: 1, scaleY: 1 }
  let originWidth = compact ? 124 : 148
  let originHeight = originWidth
  let disposed = false

  const syncGeometry = () => {
    if (!proxy || !anchor) return

    const rootRect = root.getBoundingClientRect()
    const anchorRect = anchor.getBoundingClientRect()
    const fallbackSize = compact ? Math.min(rootRect.width * 0.318, 124) : 148
    const usableAnchor = anchorRect.width > 1 && anchorRect.height > 1
    const originLeft = usableAnchor
      ? anchorRect.left - rootRect.left
      : rootRect.width * (compact ? 0.5 : 0.7222) - fallbackSize / 2
    const originTop = usableAnchor
      ? anchorRect.top - rootRect.top
      : rootRect.height * (compact ? 0.675 : 0.5) - fallbackSize / 2

    originWidth = usableAnchor ? anchorRect.width : fallbackSize
    originHeight = usableAnchor ? anchorRect.height : fallbackSize

    gsap.set(proxy, {
      left: originLeft,
      top: originTop,
      width: originWidth,
      height: originHeight,
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      transformOrigin: '50% 50%'
    })

    const targetRect = targets.avatar?.getBoundingClientRect()
    if (!targetRect || targetRect.width < 1 || targetRect.height < 1) {
      landing = { x: 0, y: 0, scaleX: 1, scaleY: 1 }
      return
    }

    const originCenterX = rootRect.left + originLeft + originWidth / 2
    const originCenterY = rootRect.top + originTop + originHeight / 2
    landing = {
      x: targetRect.left + targetRect.width / 2 - originCenterX,
      y: targetRect.top + targetRect.height / 2 - originCenterY,
      scaleX: targetRect.width / originWidth,
      scaleY: targetRect.height / originHeight
    }
  }

  const animationContext = gsap.context(() => {
    if (inactiveLayout) gsap.set(inactiveLayout, { display: 'none' })
    if (activeLayout) gsap.set(activeLayout, { display: 'block' })

    const thoughtLength = thought ? prepareStroke(thought) : 1
    const resonanceLength = resonance ? prepareStroke(resonance) : 1
    const structureLengths = structures.map(prepareStroke)
    const proxyRingLength = proxyRing ? prepareStroke(proxyRing) : 1
    const reducedMotion =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

    timeline = gsap.timeline({ paused: true })
    timeline.call(syncGeometry, [], 0)

    if (reducedMotion) {
      if (activeLayout) timeline.set(activeLayout, { opacity: 0 }, 0)
      if (proxy) timeline.set(proxy, { opacity: 0 }, 0)
      timeline.fromTo(
        curtains,
        { opacity: 1 },
        { opacity: 0, duration: 0.14, ease: 'none', immediateRender: false },
        0
      )
      timeline.fromTo(
        root,
        { opacity: 1 },
        { opacity: 0, duration: 0.14, ease: 'none', immediateRender: false },
        0
      )
      return
    }

    timeline.fromTo(
      root,
      { opacity: 1 },
      { opacity: 1, duration: 0.01, ease: 'none', immediateRender: false },
      0
    )
    timeline.fromTo(
      curtains,
      { opacity: 1, yPercent: 0 },
      { opacity: 1, yPercent: 0, duration: 0.01, ease: 'none', immediateRender: false },
      0
    )

    if (targets.avatar) {
      timeline.fromTo(
        targets.avatar,
        { opacity: 0 },
        { opacity: 0, duration: 0.01, ease: 'none', immediateRender: false },
        1.62
      )
    }

    if (activeLayout) {
      timeline.fromTo(
        activeLayout,
        { opacity: 0 },
        { opacity: 1, duration: 0.16, ease: 'power2.out', immediateRender: false },
        0.02
      )
    }

    if (caption) {
      timeline.fromTo(
        caption,
        { opacity: 0, x: -14 },
        { opacity: 1, x: 0, duration: 0.28, ease: 'power3.out', immediateRender: false },
        0.06
      )
    }

    if (resonance) {
      timeline.fromTo(
        resonance,
        {
          opacity: 0,
          scaleY: 0.18,
          strokeDashoffset: resonanceLength
        },
        {
          opacity: 0.38,
          scaleY: 1.4,
          strokeDashoffset: 0,
          duration: 0.24,
          repeat: 1,
          yoyo: true,
          ease: 'sine.inOut',
          immediateRender: false
        },
        0.04
      )
      timeline.to(resonance, { opacity: 0, duration: 0.18, ease: 'power2.out' }, 0.38)
    }

    if (thought) {
      timeline.fromTo(
        thought,
        { strokeDashoffset: thoughtLength, opacity: 0.74 },
        {
          strokeDashoffset: 0,
          opacity: 1,
          duration: 1.46,
          ease: 'power2.inOut',
          immediateRender: false
        },
        0.08
      )
    }

    labels.forEach((label, index) => {
      const labelStarts = compact
        ? [0.16, 0.44, 0.69, 0.9, 1.12, 1.32]
        : [0.14, 0.4, 0.66, 0.88, 1.08, 1.3]
      timeline.fromTo(
        label,
        { opacity: 0, y: 8 },
        {
          opacity: 0.58,
          y: 0,
          duration: 0.22,
          ease: 'power2.out',
          immediateRender: false
        },
        labelStarts[index] ?? 1.2
      )
    })

    nodes.forEach((node, index) => {
      timeline.fromTo(
        node,
        { opacity: 0, scale: 0.2 },
        {
          opacity: 1,
          scale: 1,
          duration: 0.2,
          ease: 'back.out(2.2)',
          immediateRender: false
        },
        0.76 + index * 0.07
      )
    })

    structures.forEach((structure, index) => {
      timeline.fromTo(
        structure,
        { strokeDashoffset: structureLengths[index], opacity: 0 },
        {
          strokeDashoffset: 0,
          opacity: 0.34,
          duration: 0.34,
          ease: 'power2.out',
          immediateRender: false
        },
        0.96 + index * 0.035
      )
    })

    if (proxy) {
      timeline.fromTo(
        proxy,
        { opacity: 0, scale: 0.84 },
        {
          opacity: 1,
          scale: 1,
          duration: 0.23,
          ease: 'power3.out',
          immediateRender: false
        },
        1.24
      )
      timeline.fromTo(
        proxy,
        { x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 },
        {
          x: () => landing.x,
          y: () => landing.y,
          scaleX: () => landing.scaleX,
          scaleY: () => landing.scaleY,
          opacity: 1,
          duration: 0.58,
          ease: 'power4.inOut',
          immediateRender: false
        },
        1.48
      )
      timeline.to(proxy, { opacity: 0, duration: 0.14, ease: 'power2.out' }, 2.04)
    }

    if (proxyRing) {
      timeline.fromTo(
        proxyRing,
        { strokeDashoffset: proxyRingLength },
        {
          strokeDashoffset: 0,
          duration: 0.28,
          ease: 'power2.inOut',
          immediateRender: false
        },
        1.22
      )
    }

    if (proxyCore) {
      timeline.fromTo(
        proxyCore,
        { opacity: 0, scale: 0.7 },
        {
          opacity: 0.72,
          scale: 1,
          duration: 0.2,
          ease: 'power3.out',
          immediateRender: false
        },
        1.25
      )
      timeline.to(proxyCore, { opacity: 0, scale: 0.86, duration: 0.16 }, 1.43)
    }

    if (caption) {
      timeline.to(caption, { opacity: 0, x: 12, duration: 0.2, ease: 'power2.in' }, 1.43)
    }

    if (stage) {
      timeline.fromTo(
        stage,
        { opacity: 1, scale: 1 },
        {
          opacity: 0,
          scale: 0.985,
          duration: 0.42,
          ease: 'power3.in',
          immediateRender: false
        },
        1.55
      )
    }

    if (topCurtain) {
      timeline.fromTo(
        topCurtain,
        { yPercent: 0 },
        { yPercent: -102, duration: 0.5, ease: 'power4.inOut', immediateRender: false },
        1.64
      )
    }
    if (bottomCurtain) {
      timeline.fromTo(
        bottomCurtain,
        { yPercent: 0 },
        { yPercent: 102, duration: 0.5, ease: 'power4.inOut', immediateRender: false },
        1.64
      )
    }

    if (targets.avatar) {
      timeline.fromTo(
        targets.avatar,
        { opacity: 0 },
        { opacity: 1, duration: 0.14, ease: 'power2.out', immediateRender: false },
        2.04
      )
    }

    timeline.fromTo(
      root,
      { opacity: 1 },
      { opacity: 0, duration: 0.1, ease: 'none', immediateRender: false },
      2.16
    )
  }, root)

  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    timeline.timeScale(compact ? 0.5 : 0.43)
  }

  const handleResize = () => {
    if (disposed) return
    syncGeometry()
    timeline?.invalidate()
  }
  window.addEventListener('resize', handleResize, { passive: true })

  const cleanup = () => {
    if (disposed) return
    disposed = true
    window.removeEventListener('resize', handleResize)
    timeline.kill()
    animationContext.revert()
    if (proxy) gsap.set(proxy, { clearProps: 'left,top,width,height,transform,opacity' })
    root.classList.remove('is-compact')
  }

  return {
    timeline: timeline as unknown as IntroAnimation['timeline'],
    cleanup
  }
}

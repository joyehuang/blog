import { gsap } from 'gsap'

import type { IntroBuilder } from '../types'

const query = <T extends Element>(root: HTMLElement, selector: string) =>
  root.querySelector<T>(selector)

const queryAll = <T extends Element>(root: HTMLElement, selector: string) =>
  Array.from(root.querySelectorAll<T>(selector))

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const mix = (from: number, to: number, progress: number) => from + (to - from) * progress

export const buildJoJoIntro: IntroBuilder = ({ root, targets, compact }) => {
  const paper = query<HTMLElement>(root, '[data-jojo-paper]')
  const paperLayers = queryAll<HTMLElement>(root, '[data-jojo-paper-layer]')
  const folds = queryAll<HTMLElement>(root, '[data-jojo-fold]')
  const agent = query<HTMLElement>(root, '[data-jojo-agent]')
  const agentLabel = query<HTMLElement>(root, '[data-jojo-label]')
  const eyes = query<HTMLElement>(root, '[data-jojo-eyes]')
  const parts = queryAll<HTMLElement>(root, '[data-jojo-part]')
  const arm = query<HTMLElement>(root, '[data-jojo-arm]')
  const grip = query<HTMLElement>(root, '[data-jojo-grip]')
  const tension = query<HTMLElement>(root, '[data-jojo-tension]')
  const snap = query<HTMLElement>(root, '[data-jojo-snap]')
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  let timeline!: gsap.core.Timeline
  let cleaned = false

  const animatedElements = [
    root,
    paper,
    ...paperLayers,
    ...folds,
    agent,
    agentLabel,
    eyes,
    ...parts,
    arm,
    grip,
    tension,
    snap,
    targets.jojo
  ].filter((element): element is HTMLElement => Boolean(element))
  const originalStyles = new Map(
    animatedElements.map((element) => [element, element.getAttribute('style')] as const)
  )

  const animationContext = gsap.context(() => {
    timeline = gsap.timeline({ paused: true })

    if (!paper || !agent || !eyes || !arm) {
      timeline.fromTo(root, { opacity: 1 }, { opacity: 0, duration: 0.01, ease: 'none' }, 0)
      return
    }

    const viewportWidth = Math.max(window.innerWidth, document.documentElement.clientWidth, 320)
    const viewportHeight = Math.max(window.innerHeight, document.documentElement.clientHeight, 480)
    const timingScale = compact ? 0.84 : 1
    const at = (seconds: number) => seconds * timingScale
    const duration = (seconds: number) => seconds * timingScale

    // Layout is sampled once. Every later frame is derived from these constants.
    const peek = compact ? 23 : clamp(viewportWidth * 0.032, 24, 52)
    const paperEdgeX = viewportWidth - peek
    const paperTravel = viewportWidth + peek + (compact ? 18 : 34)
    const startX = viewportWidth * (compact ? 0.48 : 0.5)
    const startY = viewportHeight * (compact ? 0.48 : 0.47)
    const grabY = viewportHeight * (compact ? 0.5 : 0.52)
    const reach = compact
      ? clamp(viewportWidth * 0.3, 112, 126)
      : clamp(viewportWidth * 0.112, 136, 164)
    const grabX = paperEdgeX - reach

    const proxyWidth = compact ? 138 : 118
    const proxyHeight = compact ? 118 : 104
    const resolveTarget = () => {
      const currentViewportWidth = Math.max(
        window.innerWidth,
        document.documentElement.clientWidth,
        320
      )
      const currentViewportHeight = Math.max(
        window.innerHeight,
        document.documentElement.clientHeight,
        480
      )
      const targetRect = targets.jojo?.getBoundingClientRect()
      const hasTarget = Boolean(targetRect && targetRect.width > 2 && targetRect.height > 2)

      return {
        x:
          hasTarget && targetRect
            ? targetRect.left + targetRect.width / 2
            : currentViewportWidth - (compact ? 34 : 62),
        y:
          hasTarget && targetRect
            ? targetRect.top + targetRect.height / 2
            : currentViewportHeight - (compact ? 38 : 64),
        scale:
          hasTarget && targetRect
            ? clamp(
                Math.min(targetRect.width / proxyWidth, targetRect.height / proxyHeight),
                0.56,
                1.02
              )
            : compact
              ? 0.58
              : 0.72
      }
    }
    const initialTarget = resolveTarget()

    const APPROACH_END = 0.12
    const LATCH_END = 0.78
    const STUCK_PAPER_PROGRESS = 0.76
    const driver = { value: 0 }

    const paperProgressFor = (value: number) => {
      if (value <= APPROACH_END) return 0
      if (value <= LATCH_END) {
        return ((value - APPROACH_END) / (LATCH_END - APPROACH_END)) * STUCK_PAPER_PROGRESS
      }
      return (
        STUCK_PAPER_PROGRESS + ((value - LATCH_END) / (1 - LATCH_END)) * (1 - STUCK_PAPER_PROGRESS)
      )
    }

    const edgePinchFor = (paperProgress: number) => {
      if (paperProgress <= STUCK_PAPER_PROGRESS) {
        return (paperProgress / STUCK_PAPER_PROGRESS) * (compact ? 1.45 : 2.25)
      }
      return (
        Math.max(0, 1 - (paperProgress - STUCK_PAPER_PROGRESS) / (1 - STUCK_PAPER_PROGRESS)) *
        (compact ? 1.45 : 2.25)
      )
    }

    const renderDriver = () => {
      const value = driver.value
      const paperProgress = paperProgressFor(value)
      const clampedPaperProgress = clamp(paperProgress, 0, 1)
      const overshoot = Math.max(0, paperProgress - 1)
      const pinch = edgePinchFor(clampedPaperProgress)
      const edgeTuck = viewportWidth * (pinch / 100)
      const compression = Math.sin(clampedPaperProgress * Math.PI) * 0.012
      const paperX = -paperTravel * paperProgress
      const paperY = Math.sin(clampedPaperProgress * Math.PI * 1.35) * (compact ? 1.5 : 3)
      const paperRotation = -clampedPaperProgress * (compact ? 0.22 : 0.42) - overshoot * 2.5

      paper.style.transform =
        `translate3d(${paperX}px, ${paperY}px, 0) ` +
        `rotate(${paperRotation}deg) skewY(${compression * -28}deg) scaleX(${1 - compression})`
      paper.style.clipPath = `polygon(0 0, 100% 0, ${100 - pinch}% 52%, 100% 100%, 0 100%)`

      paperLayers.forEach((layer, index) => {
        const depth = index + 1
        const laggedProgress = Math.pow(clampedPaperProgress, 1 + depth * 0.055)
        const restOffset = (paperLayers.length - index) * (compact ? 4 : 6)
        const layerX = -paperTravel * laggedProgress + restOffset - overshoot * paperTravel
        const layerY = paperY * (1 + depth * 0.28)
        layer.style.transform =
          `translate3d(${layerX}px, ${layerY}px, 0) ` +
          `rotate(${paperRotation * (0.72 + depth * 0.08)}deg)`
      })

      const foldEnergy =
        Math.sin(clampedPaperProgress * Math.PI) * 0.52 +
        Math.min(1, clampedPaperProgress / STUCK_PAPER_PROGRESS) * 0.48
      folds.forEach((fold, index) => {
        const direction = index % 2 === 0 ? -1 : 1
        fold.style.opacity = String(0.08 + foldEnergy * (0.18 - index * 0.025))
        fold.style.transform =
          `translateX(${direction * foldEnergy * (index + 1) * 3}px) ` +
          `skewY(${direction * foldEnergy * 0.7}deg) scaleX(${1 + foldEnergy * 0.1})`
      })

      if (value <= APPROACH_END) {
        const approach = clamp(value / APPROACH_END, 0, 1)
        gsap.set(agent, {
          x: mix(startX, grabX, approach),
          y: mix(startY, grabY, approach),
          rotation: mix(0, 1.8, approach)
        })
      } else if (value <= LATCH_END + 0.0001) {
        const attachedX = grabX - paperTravel * paperProgress - edgeTuck
        const attachedY =
          grabY + Math.sin(clampedPaperProgress * Math.PI * 2.1) * (compact ? 1 : 2.2)
        gsap.set(agent, {
          x: attachedX,
          y: attachedY,
          rotation: 1.8 - clampedPaperProgress * (compact ? 4 : 6.5)
        })
      }
    }

    const releasePaperProgress = paperProgressFor(LATCH_END)
    const releasePinch = edgePinchFor(releasePaperProgress)
    const releaseX =
      grabX - paperTravel * releasePaperProgress - viewportWidth * (releasePinch / 100)
    const releaseY = grabY + Math.sin(releasePaperProgress * Math.PI * 2.1) * (compact ? 1 : 2.2)
    gsap.set(root, { opacity: 1 })
    gsap.set(paper, { opacity: 1, transformOrigin: '0% 50%', clipPath: 'inset(0 0 0 0)' })
    gsap.set(paperLayers, { opacity: 1, transformOrigin: '0% 50%' })
    gsap.set(agent, {
      x: startX,
      y: startY,
      xPercent: -50,
      yPercent: -50,
      opacity: 1,
      scale: 1,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      transformOrigin: '50% 70%'
    })
    gsap.set(parts, { opacity: 0 })
    gsap.set(eyes, { opacity: 0, scaleY: 0.05, x: 0, transformOrigin: '50% 50%' })
    if (agentLabel) gsap.set(agentLabel, { opacity: 0, y: 5 })
    gsap.set(arm, { opacity: 0, scaleX: 0, transformOrigin: '0% 50%' })
    if (grip) gsap.set(grip, { opacity: 0, scale: 0.75 })
    if (tension) gsap.set(tension, { opacity: 0, scale: 0.55, rotation: 45 })
    if (snap) {
      gsap.set(snap, {
        x: initialTarget.x,
        y: initialTarget.y,
        xPercent: -50,
        yPercent: -50,
        opacity: 0,
        scale: 0.35
      })
    }

    if (reducedMotion) {
      gsap.set(agent, { opacity: 0 })
      timeline
        .fromTo(
          [paper, ...paperLayers],
          { opacity: 1 },
          { opacity: 0, duration: 0.16, ease: 'none' },
          0
        )
        .fromTo(root, { opacity: 1 }, { opacity: 0, duration: 0.12, ease: 'none' }, 0.08)
      return
    }

    if (targets.jojo) gsap.set(targets.jojo, { opacity: 0 })

    const visibleParts = compact
      ? parts.filter((part) => !part.hasAttribute('data-jojo-detail'))
      : parts
    const goldenAngle = Math.PI * (3 - Math.sqrt(5))

    timeline
      .addLabel('wake', 0)
      .fromTo(
        eyes,
        { opacity: 0, scaleY: 0.05, y: 1 },
        { opacity: 1, scaleY: 1, y: 0, duration: duration(0.12), ease: 'power3.out' },
        at(0.02)
      )
      .to(eyes, { scaleY: 0.08, duration: duration(0.045), ease: 'power2.in' }, at(0.16))
      .to(eyes, { scaleY: 1, duration: duration(0.065), ease: 'power3.out' }, at(0.205))

    visibleParts.forEach((part, index) => {
      const angle = index * goldenAngle
      const radius = compact ? 8 + index * 0.8 : 13 + index * 1.15
      timeline.fromTo(
        part,
        {
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
          z: compact ? 0 : 18 - index * 7,
          rotationX: compact ? 0 : Math.sin(angle) * 22,
          rotationY: compact ? 0 : Math.cos(angle) * 28,
          rotation: Math.sin(angle) * 7,
          scale: 0.74,
          opacity: 0
        },
        {
          x: 0,
          y: 0,
          z: 0,
          rotationX: 0,
          rotationY: 0,
          rotation: 0,
          scale: 1,
          opacity: 1,
          duration: duration(0.25),
          ease: 'expo.out',
          immediateRender: false
        },
        at(0.22 + index * 0.032)
      )
    })

    if (agentLabel) {
      timeline.fromTo(
        agentLabel,
        { opacity: 0, y: 5 },
        { opacity: compact ? 0.9 : 0.82, y: 0, duration: duration(0.2), ease: 'power2.out' },
        at(0.34)
      )
    }

    timeline
      .addLabel('notice', at(0.48))
      .to(
        driver,
        {
          value: APPROACH_END,
          duration: duration(0.32),
          ease: 'power3.inOut',
          onUpdate: renderDriver
        },
        'notice'
      )
      .to(eyes, { x: compact ? 1.5 : 2.5, duration: duration(0.16), ease: 'power2.out' }, at(0.52))
      .fromTo(
        arm,
        { opacity: 0, scaleX: 0 },
        { opacity: 1, scaleX: 1, duration: duration(0.17), ease: 'power3.out' },
        at(0.64)
      )

    if (grip) {
      timeline.fromTo(
        grip,
        { opacity: 0, scale: 0.75 },
        { opacity: 1, scale: 1, duration: duration(0.1), ease: 'back.out(1.6)' },
        at(0.72)
      )
    }

    if (tension) {
      timeline.fromTo(
        tension,
        { opacity: 0, scale: 0.55, rotation: 45 },
        { opacity: 1, scale: 1, rotation: 45, duration: duration(0.12), ease: 'back.out(1.5)' },
        at(0.73)
      )
    }

    timeline.addLabel('pull', at(0.8)).to(
      driver,
      {
        value: LATCH_END,
        duration: duration(0.62),
        ease: 'power3.inOut',
        onUpdate: renderDriver
      },
      'pull'
    )

    if (agentLabel) {
      timeline.to(
        agentLabel,
        { opacity: 0, y: -3, duration: duration(0.18), ease: 'power1.in' },
        at(0.94)
      )
    }

    // The only comic beat: the paper sticks, JoJo compresses, then glances back at us.
    timeline
      .to(
        agent,
        {
          x: releaseX + (compact ? 2 : 5),
          scaleY: 0.95,
          duration: duration(0.065),
          ease: 'power2.out'
        },
        at(1.44)
      )
      .to(
        agent,
        { x: releaseX, scaleY: 1, duration: duration(0.075), ease: 'back.out(1.8)' },
        at(1.505)
      )
      .to(eyes, { x: compact ? -1 : -2.5, duration: duration(0.055), ease: 'power2.out' }, at(1.47))
      .to(eyes, { scaleY: 0.12, duration: duration(0.04), ease: 'power2.in' }, at(1.525))
      .to(
        eyes,
        { x: compact ? 1.5 : 2.5, scaleY: 1, duration: duration(0.065), ease: 'power3.out' },
        at(1.565)
      )

    if (tension) {
      timeline
        .to(
          tension,
          { scale: 1.55, opacity: 0.42, duration: duration(0.08), ease: 'power2.out' },
          at(1.47)
        )
        .to(
          tension,
          { scale: 1, opacity: 1, duration: duration(0.08), ease: 'power2.in' },
          at(1.55)
        )
    }

    timeline
      .addLabel('release', at(1.63))
      .to(
        driver,
        {
          value: 1.045,
          duration: duration(0.26),
          ease: 'power4.in',
          onUpdate: renderDriver
        },
        'release'
      )
      .to(arm, { opacity: 0, scaleX: 0.28, duration: duration(0.11), ease: 'power2.in' }, 'release')
      .fromTo(
        agent,
        {
          x: releaseX,
          y: releaseY,
          rotation: compact ? -2 : -4,
          scale: 1,
          scaleY: 1,
          opacity: 1
        },
        {
          x: () => mix(releaseX, resolveTarget().x, compact ? 0.62 : 0.56),
          y: () =>
            Math.min(releaseY, resolveTarget().y) -
            Math.min(compact ? 54 : 104, window.innerHeight * 0.12),
          rotation: compact ? 108 : 190,
          scale: compact ? 0.82 : 0.88,
          duration: duration(0.25),
          ease: 'power2.out',
          immediateRender: false
        },
        'release'
      )
      .to(
        agent,
        {
          x: () => resolveTarget().x,
          y: () => resolveTarget().y,
          rotation: compact ? 180 : 360,
          scale: () => resolveTarget().scale,
          duration: duration(0.31),
          ease: 'back.out(1.45)'
        },
        at(1.88)
      )
      .to(
        driver,
        {
          value: 1,
          duration: duration(0.15),
          ease: 'back.out(1.7)',
          onUpdate: renderDriver
        },
        at(1.89)
      )

    if (snap) {
      timeline
        .set(snap, { x: () => resolveTarget().x, y: () => resolveTarget().y }, at(1.99))
        .fromTo(
          snap,
          { opacity: 0, scale: 0.35 },
          { opacity: 0.72, scale: 1, duration: duration(0.12), ease: 'power3.out' },
          at(2)
        )
        .to(
          snap,
          { opacity: 0, scale: 1.72, duration: duration(0.24), ease: 'power2.out' },
          at(2.12)
        )
    }

    if (targets.jojo) {
      timeline.fromTo(
        targets.jojo,
        { opacity: 0 },
        { opacity: 1, duration: duration(0.18), ease: 'power2.out' },
        at(2.01)
      )
    }

    timeline
      .to(
        agent,
        {
          opacity: 0,
          scale: () => resolveTarget().scale * 0.96,
          duration: duration(0.16),
          ease: 'power2.in'
        },
        at(2.06)
      )
      .fromTo(
        root,
        { opacity: 1 },
        { opacity: 0, duration: duration(0.18), ease: 'none' },
        at(2.16)
      )
  }, root)

  if (!reducedMotion) timeline.timeScale(compact ? 0.46 : 0.44)

  return {
    timeline,
    cleanup() {
      if (cleaned) return
      cleaned = true
      animationContext.revert()
      timeline.kill()
      originalStyles.forEach((style, element) => {
        if (style === null) element.removeAttribute('style')
        else element.setAttribute('style', style)
      })
    }
  }
}

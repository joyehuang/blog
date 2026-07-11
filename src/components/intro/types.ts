export type IntroVariant = 'focus' | 'line' | 'jojo'

export type IntroTrigger = 'first_visit' | 'url' | 'picker' | 'event' | 'replay'

export type IntroTargets = {
  avatar: HTMLElement | null
  contentHeader: HTMLElement | null
  header: HTMLElement | null
  jojo: HTMLElement | null
}

export type IntroBuildContext = {
  root: HTMLElement
  targets: IntroTargets
  compact: boolean
}

/**
 * A deliberately small structural type so variants do not depend on one
 * another's GSAP imports. The controller owns playback and lifecycle.
 */
export type IntroTimeline = {
  eventCallback(type: string, callback: (() => void) | null): IntroTimeline
  kill(): void
  pause(): IntroTimeline
  play(from?: number | string): IntroTimeline
  progress(value: number): IntroTimeline
  timeScale(value: number): IntroTimeline
}

export type IntroAnimation = {
  timeline: IntroTimeline
  cleanup(): void
}

export type IntroBuilder = (context: IntroBuildContext) => IntroAnimation

/* eslint-disable @typescript-eslint/no-unused-vars -- signatures mirror the private package */
// Stand-in for `@jojo-web/runtime` when the private package is not installed
// (forks, unreviewed PRs, `PUBLIC_JOJO=0`). It mirrors the package's types so
// `astro check` passes everywhere, and renders nothing: with `__JOJO__` false
// no Jojo surface is mounted in the first place.
import type { CSSProperties, Ref } from 'react'

export type EmotionId =
  | 'calm'
  | 'focus'
  | 'think'
  | 'puzzled'
  | 'curious'
  | 'happy'
  | 'laugh'
  | 'smug'
  | 'shy'
  | 'celebrate'
  | 'surprised'
  | 'angry'
  | 'sleepy'
  | 'aggrieved'
  | 'cry'
  | 'sob'
export type StatusId = 'idle' | 'working' | 'needs-input' | 'success' | 'error' | 'offline'
export type MotionPref = 'auto' | 'full' | 'transitions' | 'static'
export type GazeInput = 'auto' | 'pointer' | 'center' | { x: number; y: number }
export interface JojoHandle {
  poke(): void
  replayStatus(): void
}
export interface JojoProps {
  emotion?: EmotionId
  status?: StatusId
  intensity?: number
  motion?: MotionPref
  gaze?: GazeInput
  size?: number | string
  shadow?: boolean | 'auto'
  brows?: boolean | 'auto'
  framing?: 'full' | 'tight' | 'auto'
  flat?: boolean | 'auto'
  idPrefix?: string
  decorative?: boolean
  title?: string
  className?: string
  style?: CSSProperties
  ref?: Ref<JojoHandle>
}

export function Jojo(_props: JojoProps): null {
  return null
}
export function usePrefersReducedMotion() {
  return false
}
export const EMOTION_IDS: readonly EmotionId[] = []
export const STATUS_IDS: readonly StatusId[] = []
export const ticker = {
  subscribers: 0,
  running: false,
  stats: () => ({ frames: 0, busyMs: 0, subscribers: 0 }),
  resetStats() {}
}
type Box = { x: number; y: number; w: number; h: number }
export const JOJO_GEOMETRY: {
  viewBox: { full: Box; tight: Box }
  dot: { cx: number; cy: number; r: number }
  pivot: { x: number; y: number }
} = {
  viewBox: { full: { x: 0, y: 0, w: 1, h: 1 }, tight: { x: 0, y: 0, w: 1, h: 1 } },
  dot: { cx: 0, cy: 0, r: 0 },
  pivot: { x: 0, y: 0 }
}

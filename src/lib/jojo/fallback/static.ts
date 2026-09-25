/* eslint-disable @typescript-eslint/no-unused-vars -- signatures mirror the private package */
// Stand-in for `@jojo-web/static` without the private package: same types,
// empty output. Callers only reach it when `__JOJO__` is false.
import type { EmotionId, GazeInput, StatusId } from './runtime'

export type { EmotionId }
export const EMOTION_IDS: readonly EmotionId[] = []
export interface StaticJojoOptions {
  idPrefix: string
  emotion?: EmotionId
  status?: StatusId
  intensity?: number
  gaze?: GazeInput
  size?: number | string
  shadow?: boolean | 'auto'
  brows?: boolean | 'auto'
  framing?: 'full' | 'tight' | 'auto'
  flat?: boolean | 'auto'
  decorative?: boolean
  title?: string
  className?: string
}
export function renderJojoSvg(_options: StaticJojoOptions): string {
  return ''
}
export type FriendId = 'h02' | 'o02' | 'h06'
export const FRIENDS: readonly {
  id: FriendId
  name: { en: string; zh: string }
  persona: { en: string; zh: string }
}[] = []
export const FRIEND_RENDER_SIZE = 56
export function renderFriendSvg(
  _id: FriendId,
  _options: { idPrefix: string; title?: string; decorative?: boolean }
): string {
  return ''
}

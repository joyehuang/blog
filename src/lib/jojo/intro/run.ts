import { stillReason, type IntroTrigger } from '../keys'
import type { IntroController } from './controller'
import { layoutNow, makeSkip } from './stage'
import { runStory } from './story/run'

/**
 * The intro's chunk, loaded by the entry (intro/entry.ts) only once the intro
 * may play: measure the settled first screen, then run Jojo's night tour.
 */

let active: IntroController | null = null

export type RunResult = { started: boolean; reason?: string; controller?: IntroController }

export function runIntro(trigger: IntroTrigger): RunResult {
  const html = document.documentElement
  // the entry (JojoIntro.astro) already refused before loading this chunk;
  // checked again here so no caller can start a run while Jojo must stay still
  const still = stillReason()
  if (still) return { started: false, reason: still }
  if (active?.state === 'running') return { started: false, reason: 'running' }
  const zh = html.lang !== 'en'
  if (window.scrollY > 40) return { started: false, reason: 'scrolled' }
  const measured = layoutNow()
  if (!measured) return { started: false, reason: 'layout' }
  const { el: skipEl, rect: skipRect } = makeSkip(zh)
  if (skipRect) measured.layout.keepOut = [skipRect]
  const r = runStory(trigger, { zh, measured, skipEl })
  if (r.controller) active = r.controller
  return r
}

/** the running intro, if any (review tools / tests) */
export function activeIntro() {
  return active
}

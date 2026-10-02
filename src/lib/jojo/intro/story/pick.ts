import { JOJO_KEYS, readStored, writeStored } from '../../keys'
import { STORY_IDS, type StoryId } from './kit'

export type IntroChoice = 'build' | StoryId

/** the intro first visits get */
export const DEFAULT_INTRO: IntroChoice = 'build'

const valid = (v: string | null | undefined): v is IntroChoice =>
  v === 'build' || (STORY_IDS as readonly string[]).includes(v ?? '')

/**
 * `?jojo-story=host|whoami|night|build` picks the intro (and is remembered for
 * the session, so the dock's replay plays the same one); otherwise the default.
 */
export function pickStory(
  href: string = location.href,
  session: Storage | undefined = globalThis.sessionStorage
): IntroChoice {
  let q: string | null = null
  try {
    q = new URL(href).searchParams.get('jojo-story')
  } catch {
    // not a URL: fall through
  }
  if (valid(q)) {
    if (session) writeStored(JOJO_KEYS.story, q, session)
    return q
  }
  const s = session ? readStored(JOJO_KEYS.story, session) : null
  return valid(s) ? s : DEFAULT_INTRO
}

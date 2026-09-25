import { stillReason, watchStill, type StillReason } from '@/lib/jojo/keys'
import { createLoader } from '@/lib/jojo/steps'
import type { JojoProps } from '@jojo-web/runtime'
import { useEffect, useState, type ComponentType } from 'react'

/**
 * Jojo, static first and live on demand. The server renders the build-time
 * SVG (`staticSvg`, same first frame as the live component) so an idle Jojo
 * costs no engine JavaScript at all. `live` (or any interaction the parent
 * turns into `live`) fetches the engine chunk once per page and swaps in the
 * animated component — visually seamless, since both start on the same frame.
 * A failed fetch is forgotten, so a later intent retries it.
 */
export const loadJojoRuntime: () => Promise<ComponentType<JojoProps>> = createLoader(() =>
  import('@jojo-web/runtime').then((m) => m.Jojo)
)

interface Props extends JojoProps {
  staticSvg: string
  /** truthy: go live. A new value (the parent counts intents) retries a failed fetch. */
  live: boolean | number
  className?: string
}

export default function LazyJojo({ staticSvg, live, className, ...props }: Props) {
  const [Live, setLive] = useState<ComponentType<JojoProps> | null>(null)
  useEffect(() => {
    if (!live || Live) return
    let alive = true
    loadJojoRuntime()
      .then((C) => alive && setLive(() => C))
      .catch(() => {
        // engine failed to load: the static frame stays, nothing else breaks
      })
    return () => {
      alive = false
    }
  }, [live, Live])
  if (Live) return <Live {...props} />
  return (
    <span className={className ?? 'jojo-static'} dangerouslySetInnerHTML={{ __html: staticSvg }} />
  )
}

/** reduced motion / Save-Data, kept current (null on the server and before hydration) */
export function useStill(): StillReason | null {
  const [still, setStill] = useState<StillReason | null>(null)
  useEffect(() => {
    const sync = () => setStill(stillReason())
    sync()
    return watchStill(sync)
  }, [])
  return still
}

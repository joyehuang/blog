import { useCallback } from 'react'

import DevMode from './DevMode'
import type { PostSummary } from './types'

/**
 * Thin wrapper used by the `/dev` preview route. Astro can't pass
 * function props across the SSR boundary, so the exit handler is
 * owned here and just navigates home.
 */
export default function DevModeRoute({ posts = [] }: { posts?: PostSummary[] }) {
  const onExit = useCallback(() => {
    if (typeof window !== 'undefined') window.location.assign('/')
  }, [])
  return <DevMode posts={posts} onExit={onExit} />
}

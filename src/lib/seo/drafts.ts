/** Preview availability is compiled by Astro config, never read from SSR process state. */
export function detailAvailable(draft: boolean | undefined, preview: boolean, dev: boolean) {
  return !draft || preview || dev
}

export function published<T extends { data: { draft?: boolean } }>(entry: T) {
  return !entry.data.draft
}

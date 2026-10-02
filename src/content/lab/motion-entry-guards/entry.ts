// Check before requesting a chunk, and again after the asynchronous boundary.
export async function guardedEntry<T>(
  blocked: () => boolean,
  load: () => Promise<T>,
  start: (module: T) => void
) {
  if (blocked()) return false
  const module = await load()
  if (blocked()) return false
  start(module)
  return true
}

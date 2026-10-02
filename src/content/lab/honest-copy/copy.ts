export type CopyResult = 'clipboard' | 'fallback' | 'failed'
export async function copyWithFallback(
  write: () => Promise<void>,
  fallback: () => boolean
): Promise<CopyResult> {
  try {
    await write()
    return 'clipboard'
  } catch {
    try {
      return fallback() ? 'fallback' : 'failed'
    } catch {
      return 'failed'
    }
  }
}

export function legacyCopy(text: string) {
  const active = document.activeElement as HTMLElement | null
  const selection = document.getSelection()
  const ranges = selection
    ? Array.from({ length: selection.rangeCount }, (_, i) => selection.getRangeAt(i).cloneRange())
    : []
  const area = document.createElement('textarea')
  area.value = text
  area.readOnly = true
  area.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0'
  document.body.append(area)
  try {
    area.select()
    return document.execCommand('copy')
  } finally {
    area.remove()
    active?.focus({ preventScroll: true })
    selection?.removeAllRanges()
    ranges.forEach((range) => selection?.addRange(range))
  }
}

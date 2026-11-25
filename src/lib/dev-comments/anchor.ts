import type { DevComment } from './types'

export interface SelectionAnchor {
  quote: string
  prefix: string
  suffix: string
  heading: string
  rect: DOMRect
}

const SKIP_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'NOSCRIPT',
  'TEXTAREA',
  'INPUT',
  'SELECT',
  'OPTION',
  'BUTTON'
])

export function getAnnotationRoot(): HTMLElement {
  return (
    document.querySelector<HTMLElement>('#content') ??
    document.querySelector<HTMLElement>('article') ??
    document.querySelector<HTMLElement>('main') ??
    document.body
  )
}

function isSkippedElement(el: Element | null): boolean {
  let curr = el
  while (curr) {
    if (SKIP_TAGS.has(curr.tagName)) return true
    if (curr.hasAttribute('data-dev-comments-ui')) return true
    curr = curr.parentElement
  }
  return false
}

interface TextSegment {
  node: Text
  start: number
  end: number
}

function collectTextSegments(root: HTMLElement): { text: string; segments: TextSegment[] } {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue || node.nodeValue.length === 0) return NodeFilter.FILTER_REJECT
      if (isSkippedElement(node.parentElement)) return NodeFilter.FILTER_REJECT
      return NodeFilter.FILTER_ACCEPT
    }
  })

  const segments: TextSegment[] = []
  let text = ''
  let current = walker.nextNode() as Text | null
  while (current) {
    const val = current.nodeValue ?? ''
    const start = text.length
    text += val
    segments.push({ node: current, start, end: text.length })
    current = walker.nextNode() as Text | null
  }
  return { text, segments }
}

function findNearestHeading(root: HTMLElement, targetNode: Node): string {
  const headings = Array.from(root.querySelectorAll<HTMLElement>('h1, h2, h3, h4'))
  let latest = ''
  for (const h of headings) {
    const pos = h.compareDocumentPosition(targetNode)
    const isBeforeOrContains =
      Boolean(pos & Node.DOCUMENT_POSITION_FOLLOWING) ||
      Boolean(pos & Node.DOCUMENT_POSITION_CONTAINED_BY)
    if (isBeforeOrContains) {
      latest = (h.textContent ?? '').replace(/#\s*$/, '').trim()
    } else {
      break
    }
  }
  if (!latest) {
    const pageTitle = document.querySelector<HTMLElement>('#content-header h1, h1')
    latest = (pageTitle?.textContent ?? '').replace(/#\s*$/, '').trim()
  }
  return latest
}

export function captureSelectionAnchor(
  root: HTMLElement,
  selection: Selection | null
): SelectionAnchor | null {
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null
  const range = selection.getRangeAt(0)

  const anchorEl =
    range.startContainer.nodeType === Node.ELEMENT_NODE
      ? (range.startContainer as Element)
      : range.startContainer.parentElement
  const focusEl =
    range.endContainer.nodeType === Node.ELEMENT_NODE
      ? (range.endContainer as Element)
      : range.endContainer.parentElement

  if (isSkippedElement(anchorEl) || isSkippedElement(focusEl)) return null
  if (!root.contains(range.commonAncestorContainer)) return null

  const quote = selection.toString().trim()
  if (quote.length < 2) return null

  const rect = range.getBoundingClientRect()
  if (rect.width === 0 && rect.height === 0) return null

  const { text } = collectTextSegments(root)
  const rawSelected = range.toString()
  let prefix = ''
  let suffix = ''

  // Compute prefix/suffix using a range from root start to selection start
  try {
    const beforeRange = document.createRange()
    beforeRange.setStart(root, 0)
    beforeRange.setEnd(range.startContainer, range.startOffset)
    const beforeText = beforeRange.toString()
    prefix = beforeText.slice(-48).trimStart()
    const afterStart = beforeText.length + rawSelected.length
    suffix = text.slice(afterStart, afterStart + 48).trimEnd()
  } catch {
    const idx = text.indexOf(quote)
    if (idx !== -1) {
      prefix = text.slice(Math.max(0, idx - 48), idx).trimStart()
      suffix = text.slice(idx + quote.length, idx + quote.length + 48).trimEnd()
    }
  }

  const heading = findNearestHeading(root, range.startContainer)
  return { quote, prefix, suffix, heading, rect }
}

function findBestMatchIndex(
  fullText: string,
  quote: string,
  prefix: string,
  suffix: string
): number {
  if (!quote) return -1
  const positions: number[] = []
  let from = 0
  while (from <= fullText.length - quote.length) {
    const idx = fullText.indexOf(quote, from)
    if (idx === -1) break
    positions.push(idx)
    from = idx + 1
  }
  if (positions.length === 0) return -1
  if (positions.length === 1) return positions[0]!

  let bestIdx = positions[0]!
  let bestScore = -1
  for (const idx of positions) {
    let score = 0
    if (prefix) {
      const before = fullText.slice(Math.max(0, idx - prefix.length - 8), idx)
      if (before.endsWith(prefix)) score += 4
      else if (before.includes(prefix.slice(-16))) score += 2
    }
    if (suffix) {
      const after = fullText.slice(idx + quote.length, idx + quote.length + suffix.length + 8)
      if (after.startsWith(suffix)) score += 4
      else if (after.includes(suffix.slice(0, 16))) score += 2
    }
    if (score > bestScore) {
      bestScore = score
      bestIdx = idx
    }
  }
  return bestIdx
}

export function clearHighlights(root: HTMLElement): void {
  const marks = root.querySelectorAll<HTMLElement>('mark[data-devc-id]')
  const parents = new Set<Node>()
  marks.forEach((mark) => {
    const parent = mark.parentNode
    if (!parent) return
    parents.add(parent)
    while (mark.firstChild) {
      parent.insertBefore(mark.firstChild, mark)
    }
    parent.removeChild(mark)
  })
  parents.forEach((p) => {
    if (p instanceof Element) p.normalize()
  })
}

export function applyHighlights(
  root: HTMLElement,
  comments: DevComment[],
  activeId: string | null,
  onSelect: (id: string) => void
): void {
  clearHighlights(root)

  const quotedComments = comments.filter((c) => c.quote.length >= 2)
  if (quotedComments.length === 0) return

  // Apply one by one; re-collecting segments keeps offsets exact even when
  // earlier marks split text nodes inside the same paragraph.
  for (const comment of quotedComments) {
    const { text, segments } = collectTextSegments(root)
    const matchStart = findBestMatchIndex(text, comment.quote, comment.prefix, comment.suffix)
    if (matchStart === -1) continue
    const matchEnd = matchStart + comment.quote.length

    // Collect overlapping segments and wrap in reverse order so earlier splits stay valid
    const overlapping = segments.filter((seg) => seg.end > matchStart && seg.start < matchEnd)
    for (let i = overlapping.length - 1; i >= 0; i--) {
      const seg = overlapping[i]!
      // Skip if already wrapped by another mark
      if (seg.node.parentElement?.closest('mark[data-devc-id]')) continue
      const localStart = Math.max(0, matchStart - seg.start)
      const localEnd = Math.min(seg.node.length, matchEnd - seg.start)
      if (localEnd <= localStart) continue

      try {
        let targetNode = seg.node
        if (localEnd < targetNode.length) {
          targetNode.splitText(localEnd)
        }
        if (localStart > 0) {
          targetNode = targetNode.splitText(localStart)
        }
        const mark = document.createElement('mark')
        mark.className = 'devc-mark'
        mark.dataset.devcId = comment.id
        mark.dataset.devcKind = comment.kind
        mark.dataset.devcStatus = comment.status
        if (activeId === comment.id) {
          mark.dataset.devcActive = 'true'
        }
        mark.title = comment.body
        mark.addEventListener('click', (event) => {
          event.stopPropagation()
          onSelect(comment.id)
        })
        targetNode.parentNode?.insertBefore(mark, targetNode)
        mark.appendChild(targetNode)
      } catch {
        // Ignore non-wrappable DOM boundary cases
      }
    }
  }
}

export function scrollToHighlight(root: HTMLElement, id: string): boolean {
  const first = root.querySelector<HTMLElement>(`mark[data-devc-id="${CSS.escape(id)}"]`)
  if (!first) return false
  first.scrollIntoView({ behavior: 'smooth', block: 'center' })
  const all = root.querySelectorAll<HTMLElement>(`mark[data-devc-id="${CSS.escape(id)}"]`)
  all.forEach((el) => {
    el.classList.remove('devc-flash')
    void el.offsetWidth
    el.classList.add('devc-flash')
  })
  return true
}

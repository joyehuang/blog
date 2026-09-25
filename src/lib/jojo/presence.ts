/**
 * When the dock shows. One Jojo per viewport: an in-flow Jojo (identity slot,
 * article end, 404, About) that is on screen wins over the dock, and the intro
 * wins over both. The dock also steps aside for text entry (focused editable,
 * soft keyboard) and, on phones, for the comment box.
 */
export interface PresenceInput {
  enabled: boolean
  /** the visitor sent Jojo to the edge */
  tucked: boolean
  introRunning: boolean
  /** an in-flow Jojo anchor intersects the viewport */
  anchorInView: boolean
  /** an input/textarea/contenteditable outside the dock has focus */
  editingElsewhere: boolean
  /** visualViewport says a soft keyboard is covering the page */
  keyboardOpen: boolean
  /** the comment area intersects the viewport */
  commentsInView: boolean
  /** narrow viewport (≤ 640px) */
  compact: boolean
  /** the panel is open (the visitor is using the dock) */
  open: boolean
}

export type Presence = 'hidden' | 'shown' | 'tucked'

export function dockPresence(p: PresenceInput): Presence {
  if (!p.enabled || p.introRunning) return 'hidden'
  if (p.editingElsewhere || p.keyboardOpen) return 'hidden'
  if (p.tucked) return 'tucked'
  // an open panel stays until the visitor closes it
  if (p.open) return 'shown'
  if (p.anchorInView) return 'hidden'
  if (p.compact && p.commentsInView) return 'hidden'
  return 'shown'
}

/** Soft keyboard heuristic: the visual viewport lost a big slice of the layout viewport. */
export function keyboardLikelyOpen(layoutHeight: number, visualHeight: number | undefined) {
  if (!visualHeight || !layoutHeight) return false
  return layoutHeight - visualHeight > Math.max(150, layoutHeight * 0.25)
}

export function isEditable(el: Element | null | undefined): boolean {
  if (!el) return false
  const tag = el.tagName
  if (tag === 'TEXTAREA') return true
  if (tag === 'INPUT') {
    const type = (el as HTMLInputElement).type
    return ![
      'button',
      'submit',
      'reset',
      'checkbox',
      'radio',
      'range',
      'color',
      'file',
      'image'
    ].includes(type)
  }
  return (el as HTMLElement).isContentEditable === true
}

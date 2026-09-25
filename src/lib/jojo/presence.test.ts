import { describe, expect, it } from 'bun:test'

import { dockPresence, isEditable, keyboardLikelyOpen, type PresenceInput } from './presence'

const base: PresenceInput = {
  enabled: true,
  tucked: false,
  introRunning: false,
  anchorInView: false,
  editingElsewhere: false,
  keyboardOpen: false,
  commentsInView: false,
  compact: false,
  open: false
}

describe('dock presence', () => {
  it('shows by default and hides while the intro runs', () => {
    expect(dockPresence(base)).toBe('shown')
    expect(dockPresence({ ...base, introRunning: true })).toBe('hidden')
    expect(dockPresence({ ...base, enabled: false })).toBe('hidden')
  })

  it('yields to an in-flow Jojo on screen (one Jojo per viewport)', () => {
    expect(dockPresence({ ...base, anchorInView: true })).toBe('hidden')
    // but not while the visitor is using the open panel
    expect(dockPresence({ ...base, anchorInView: true, open: true })).toBe('shown')
  })

  it('always steps aside for typing and the soft keyboard, even when open', () => {
    expect(dockPresence({ ...base, editingElsewhere: true, open: true })).toBe('hidden')
    expect(dockPresence({ ...base, keyboardOpen: true })).toBe('hidden')
  })

  it('never covers the comment box on phones; desktop keeps the corner', () => {
    expect(dockPresence({ ...base, compact: true, commentsInView: true })).toBe('hidden')
    expect(dockPresence({ ...base, compact: false, commentsInView: true })).toBe('shown')
  })

  it('tucked stays tucked', () => {
    expect(dockPresence({ ...base, tucked: true })).toBe('tucked')
    expect(dockPresence({ ...base, tucked: true, anchorInView: true })).toBe('tucked')
  })

  it('keyboard heuristic and editable detection', () => {
    expect(keyboardLikelyOpen(844, 844)).toBe(false)
    expect(keyboardLikelyOpen(844, 500)).toBe(true)
    expect(keyboardLikelyOpen(844, undefined)).toBe(false)
    expect(isEditable({ tagName: 'TEXTAREA' } as Element)).toBe(true)
    expect(isEditable({ tagName: 'INPUT', type: 'text' } as unknown as Element)).toBe(true)
    expect(isEditable({ tagName: 'INPUT', type: 'checkbox' } as unknown as Element)).toBe(false)
    expect(isEditable({ tagName: 'DIV', isContentEditable: true } as unknown as Element)).toBe(true)
    expect(isEditable(null)).toBe(false)
  })
})

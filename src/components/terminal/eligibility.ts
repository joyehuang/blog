// Single policy for hydration, rendering and every terminal activation path.
// A wide touch viewport (e.g. a phone in landscape) is not a desktop terminal.
export const TERMINAL_MEDIA = '(min-width: 641px) and (hover: hover) and (pointer: fine)'

export function terminalEligible(
  match: Pick<Window, 'matchMedia'> | undefined = typeof window === 'undefined' ? undefined : window
): boolean {
  return match?.matchMedia(TERMINAL_MEDIA).matches === true
}

export function observeTerminalEligibility(onChange: (eligible: boolean) => void): () => void {
  const media = window.matchMedia(TERMINAL_MEDIA)
  const update = () => onChange(terminalEligible())
  media.addEventListener('change', update)
  update()
  return () => media.removeEventListener('change', update)
}

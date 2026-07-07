# Design Conventions

This file collects small UI/motion philosophies for this site. Check it before
adding or reviewing interactive UI so new components stay consistent with
existing ones instead of reinventing a pattern.

## Motion

### No instant state swaps

When a control has more than one visual state (an icon, a label, an
expanded/collapsed panel), do not swap between states with `display:none` /
`display:block` or a hard content replace. An instant swap reads as a glitch,
not a change. Prefer a short transition that make the change feel intentional.

### Blurred Icon Transition

The default crossfade for a control that swaps between a small set of icons
or labels (theme toggle, language switch, any future "cycle through options"
button):

- Stack every state in the same position (`position: absolute; inset: 0;
margin: auto;` inside a `position: relative` container), instead of only
  rendering the active one.
- The outgoing state animates to `opacity: 0`, `filter: blur(4px)`,
  `transform: scale(0.6)`.
- The incoming state animates to `opacity: 1`, `filter: blur(0)`,
  `transform: scale(1)`.
- Both transition over `0.25s ease` on `opacity`, `filter`, and `transform`.
- Always add a `prefers-reduced-motion: reduce` override that removes the
  transition (state still changes, just without the animation).

Reference implementations:

- [`Header.astro`](src/components/Header.astro) — theme toggle button
  (system/light/dark icons), swap is in-place via a `data-theme` attribute.
- [`LanguageSwitcher.astro`](src/components/LanguageSwitcher.astro) — the
  language switch navigates to a different page (no in-place state), so the
  same blur+scale motion is played as a ~250ms exit animation before the
  navigation fires, instead of navigating instantly on click.

Use this same recipe for any new control that has this shape, rather than
inventing a different transition style per component.

## Motion always respects reduced motion

Every animation/transition added to the site must have a
`@media (prefers-reduced-motion: reduce)` override. Look at existing
components (`Header.astro`, `LanguageSwitcher.astro`, `IntroOverlay.astro`,
`BackToTop.astro`, `TableOfContents.astro`) for the pattern before adding a
new one.

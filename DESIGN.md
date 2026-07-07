# Design Conventions

This file collects the small UI conventions for this site — color, type,
spacing, radius, shadow, breakpoints, and motion. Check it before adding or
reviewing UI so new components reuse existing tokens/patterns instead of
inventing new ones. It documents what the codebase actually does, not an
aspirational spec — if you change a convention, update this file in the same
commit.

## Colors

All color is driven by HSL-triplet CSS variables in
[`app.css`](src/assets/styles/app.css), set in `:root` and overridden in
`.dark` (toggled as a class on `<html>`, see `ThemeProvider.astro`). Variables
store a raw `H S% L%` triplet (no `hsl()` wrapper) so they can be consumed
with an alpha channel: `hsl(var(--primary) / 0.25)`.

Pairs, shadcn/ui-style (`app.css:19-71`):

- `--background` / `--foreground`
- `--card` / `--card-foreground`, `--popover` / `--popover-foreground`
- `--primary` / `--primary-foreground`
- `--secondary` / `--secondary-foreground`
- `--muted` / `--muted-foreground`
- `--accent` / `--accent-foreground`
- `--destructive` / `--destructive-foreground`
- Structural: `--border`, `--input`, `--ring`
- Site-specific: `--term-surface` / `--term-chrome` / `--term-ok` (terminal
  sub-theme), `--code-bg` / `--code-fg` (code blocks)

`--primary` is not held constant across themes: light mode uses a muted
teal-blue (`200 29% 45%`), dark mode flips to a bright near-foreground cyan
(`195 95% 85%`) rather than keeping the same hue/lightness. Match that
intent — a color that reads as an "accent" in light mode should still read
as one in dark mode, even if the exact HSL differs.

`uno.config.ts` maps every pair into `theme.colors` (`uno.config.ts:128-162`)
so components use the semantic name, never the raw variable or a generic
Tailwind palette color: `bg-muted`, `text-muted-foreground`, `border-input`,
`hover:text-primary`. `presetWind3` (full Tailwind palette) is intentionally
disabled — only `presetMini` + `presetTypography` run — so classes like
`text-red-500` don't exist here; if a new color is needed, add a token to
`app.css` + `uno.config.ts` rather than reaching for a raw Tailwind shade.

Don't hardcode colors in component CSS. The one deliberate exception is the
terminal's macOS-style traffic-light buttons
(`terminal.css:156-158`, `#ff6058`/`#ffbd2e`/`#28c93f`) — those are chrome
skeuomorphism, not theme content, so they're pinned regardless of light/dark.

## Typography

- Body font: **Satoshi**, self-hosted variable font
  (`app.css:1-16`, `/fonts/Satoshi-Variable.ttf`), set once on `html` — don't
  re-declare `font-family` per component.
- Monospace: **JetBrains Mono** (Google Fonts, `BaseHead.astro:48-57`),
  fallback stack `'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, Consolas,
  monospace`. This is scoped to the terminal / dev-mode / mascot sub-theme —
  general UI stays on Satoshi; don't add `font-mono` to ordinary components.
- Prose (blog/notes body copy) uses `presetTypography`, applied via the
  `prose text-base text-muted-foreground` class combo
  (`site.config.ts:140`, safelisted in `uno.config.ts:198-199` since it's
  injected dynamically). Headings inside prose are `font-weight: 500`, not
  bold (`uno.config.ts:12-13`); `strong` is `600`, links are `500`
  (`uno.config.ts:114,118`) — these override the typography preset's
  defaults, so don't fight them with inline weight utilities.
- Compact UI text (icon-button labels, dev-mode chrome) pairs
  `font-mono text-xs leading-5 tracking-tight` (`Header.astro:79`); nav/brand
  text uses `font-semibold`/`font-medium` at `text-xl`/default size
  (`Header.astro:41,58`) — there's no larger custom type scale beyond default
  Tailwind sizes (`text-xs` … `text-xl` cover nearly everything observed).

## Spacing

No custom spacing scale — default 0.25rem-increment scale from `presetMini`.
Two idioms recur enough to be conventions:

- Icon buttons: `size-5` content box with `p-1.5` padding
  (`Header.astro:79,87,96`) — use this pairing for any new icon-only button
  rather than picking arbitrary padding.
- Horizontal flex spacing in nav/header contexts: `gap-x-*` (2/3/4/5), not
  bare `gap-*` — keeps vertical rhythm untouched when a row wraps.
- Card padding: `p-4`/`p-5 sm:p-6` for content cards (`pages/index.astro:171`).

## Border radius

`--radius: 0.5rem` (`app.css:39`) is the canonical system radius, but it's
mostly consumed as a raw CSS value (prose images/blockquotes,
`uno.config.ts:39,101`) rather than a class — the practical convention lives
in which Tailwind radius utility each layer uses:

- **`rounded-md`** — compact controls: icon buttons, small badges
  (`Header.astro:79,87,96`).
- **`rounded-lg`** — the default for cards and list items; the single most
  common radius in the codebase.
- **`rounded-xl` / `rounded-2xl`** — hero-level containers: the header shell
  (`Header.astro:38`, `rounded-xl` → `sm:rounded-2xl`), homepage/about cards
  (`pages/index.astro:171,218,454,456`), popout panels.
- **`rounded-full`** — avatars, status dots, pill badges.

Rule of thumb: control → `md`, card → `lg`, hero container → `xl`/`2xl`,
avatar/pill/dot → `full`. The terminal sub-theme uses its own
`--wt-radius: 0.85rem` (`terminal.css:33`) instead of the global token —
that's intentional (see Sub-themes below), don't "fix" it to match.

## Shadows

No shadow token/CSS var — always a Tailwind `shadow-*` utility or a
hand-authored `box-shadow`. Two idioms, pick based on context:

- **Interactive card hover**: `hover:shadow-sm` (or `hover:shadow-md` for
  pills) combined with `hover:-translate-y-0.5` or
  `hover:border-foreground/25` (`pages/about/index.astro:38`,
  `pages/index.astro:134,171`, `home/ProjectCard.astro:29`,
  `home/LinkCard.astro:31`).
- **Ambient elevation on static surfaces**: a soft shadow tied to the
  foreground token so it stays correct across themes, e.g.
  `box-shadow: 0 14px 38px hsl(var(--foreground) / 0.06)`
  (`FeatureCalloutCard.astro:72`). Prefer this pattern for new elevated
  surfaces over hardcoded rgba — it's the theme-aware idiom.

The header's "scrolled" chrome shadow (`Header.astro:205-209,239-243`) is a
hardcoded 4-layer rgba stack predating the foreground-token idiom above.
It's left as-is for now, but don't copy it into new components — use the
`hsl(var(--foreground) / …)` pattern instead.

## Breakpoints

Utility classes use default Tailwind/UnoCSS breakpoints (`sm:`, `md:`, etc.)
throughout — that part is standard. The exception is **scoped `<style>`
blocks**, where UnoCSS doesn't generate responsive variants for hand-rolled
CSS, so components fall back to raw `@media` queries. These don't always
match the Tailwind px values exactly:

- `max-width: 640px` is the de facto mobile breakpoint in scoped styles
  (mirrors Tailwind `sm`) — used in `Header.astro:225`,
  `ContentLayout.astro:183`, `FeatureCalloutCard.astro:199`,
  `FriendConstellation.astro:434`, `GitHubContributions.astro:476`,
  `devmode.css:349`, `TalksSeries.astro:992`.
- `min-width`/`max-width: 768px`–`800px` is the de facto tablet breakpoint
  (mirrors Tailwind `md`, loosely) — `Header.astro:215` uses `800px`,
  `ContentLayout.astro:138,143` uses `769px`, `PostPreviewEn.astro:153` uses
  `768px`.

When adding a scoped media query, use `640px` for the mobile cutoff. For the
tablet cutoff, `768px` matches Tailwind `md` exactly — prefer that over
`769px`/`800px` unless you have a specific reason to diverge (as
`Header.astro:215` does, to clear the sticky header's own horizontal margin).

## Sub-themes

The terminal / dev-mode / mascot surfaces (`terminal.css`, `devmode.css`,
`mascot/jojo.css`) are a deliberate visual layer on top of the base tokens,
not a bug to normalize away:

- Own radius (`--wt-radius: 0.85rem`) and mono-first typography throughout.
- Glassy chrome: `backdrop-filter: blur(18px) saturate(140%)`, layered
  gradient/mask grid texture (`terminal.css:86-98`).
- `devmode.css` explicitly switches `mix-blend-mode` between `multiply`
  (light) and `screen` (dark) for its scanline effect (`devmode.css:41-46`)
  — a rare case where light/dark need different *blend modes*, not just
  different colors.
- `jojo.css`'s speech bubble uses theme tokens (`--card`/`--foreground`/
  `--border`) for color but its own literal `10px` radius / `6px 10px`
  padding — color follows the system, geometry doesn't.

When extending one of these surfaces, stay inside its local token set
(`--wt-*`, `--term-*`) rather than pulling in the global `--radius`/spacing
scale — the whole point is that it reads as a distinct "device" (terminal
window, mascot bubble) rather than another card in the site's design system.

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

### Always respect reduced motion

Every animation/transition added to the site must have a
`@media (prefers-reduced-motion: reduce)` override. Look at existing
components (`Header.astro`, `LanguageSwitcher.astro`, `IntroOverlay.astro`,
`BackToTop.astro`, `TableOfContents.astro`) for the pattern before adding a
new one.

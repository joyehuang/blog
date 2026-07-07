---
version: alpha
name: Joye Personal Blog
description: A solo engineer's blog and portfolio (Astro). Calm, editorial, technical on the main reading surfaces — chrome stays quiet so writing and project work are the subject. A separate, deliberately playful terminal/dev-mode/mascot layer exists as an easter egg and does not follow these tokens (see Sub-themes).
colors:
  background: "hsl(210 33% 99%)"
  foreground: "hsl(240 10% 3.9%)"
  card: "hsl(0 0% 100%)"
  card-foreground: "hsl(240 10% 3.9%)"
  popover: "hsl(0 0% 100%)"
  popover-foreground: "hsl(240 10% 3.9%)"
  primary: "hsl(200 29% 45%)"
  primary-foreground: "hsl(0 0% 92.5%)"
  secondary: "hsl(240 4.8% 95.9%)"
  secondary-foreground: "hsl(240 5.9% 10%)"
  muted: "hsl(240 4.8% 95%)"
  muted-foreground: "hsl(240 3.8% 28.1%)"
  accent: "hsl(240 4.8% 95.9%)"
  accent-foreground: "hsl(240 5.9% 10%)"
  destructive: "hsl(0 72.22% 50.59%)"
  destructive-foreground: "hsl(0 0% 98%)"
  border: "hsl(240 5.9% 88%)"
  input: "hsl(240 5.9% 90%)"
  ring: "hsl(240 5.9% 10%)"
  term-surface: "hsl(210 20% 97%)"
  term-chrome: "hsl(210 20% 95%)"
  term-ok: "hsl(142 50% 40%)"
  code-bg: "hsl(220 14% 93%)"
  code-fg: "hsl(220 13% 18%)"
# colorsDark is a non-normative extension (not part of the base design.md
# spec): the site is dual-theme, and we keep both themes in one file rather
# than splitting into a second design.dark.md. Same keys as `colors` above,
# values applied when `.dark` is set on <html>.
colorsDark:
  background: "hsl(240 20.54% 5.2%)"
  foreground: "hsl(0 0% 98%)"
  card: "hsl(240 10% 3.9%)"
  card-foreground: "hsl(0 0% 98%)"
  popover: "hsl(240 10% 3.9%)"
  popover-foreground: "hsl(0 0% 98%)"
  primary: "hsl(195 95% 85%)"
  primary-foreground: "hsl(240 3.7% 15.9%)"
  secondary: "hsl(240 3.7% 15.9%)"
  secondary-foreground: "hsl(0 0% 98%)"
  muted: "hsl(240 5.9% 12%)"
  muted-foreground: "hsl(240 5% 74.9%)"
  accent: "hsl(240 3.7% 15.9%)"
  accent-foreground: "hsl(0 0% 98%)"
  destructive: "hsl(0 62.8% 30.6%)"
  destructive-foreground: "hsl(0 0% 98%)"
  border: "hsl(240 3.7% 19.9%)"
  input: "hsl(240 3.7% 15.9%)"
  ring: "hsl(240 4.9% 83.9%)"
  term-surface: "hsl(240 18% 7%)"
  term-chrome: "hsl(240 18% 4%)"
  term-ok: "hsl(142 60% 65%)"
  code-bg: "hsl(240 5.9% 12%)"
  code-fg: "hsl(0 0% 92%)"
typography:
  body:
    fontFamily: Satoshi
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
  brand:
    fontFamily: Satoshi
    fontSize: 20px
    fontWeight: 600
  prose-heading:
    fontFamily: Satoshi
    fontWeight: 500
  ui-label:
    fontFamily: "JetBrains Mono"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 20px
    letterSpacing: -0.025em
rounded:
  md: 6px
  lg: 8px
  xl: 12px
  2xl: 16px
  full: 9999px
spacing:
  icon-button: 6px
  nav-gap: 16px
  card-sm: 16px
  card-md: 20px
  card-lg: 24px
---

# Design Conventions

This documents what the codebase actually does, not an aspirational spec.

## Overview

A solo engineering blog/portfolio. The primary reading surfaces (blog, notes,
projects, about) should feel calm, editorial, and technical — quiet chrome,
generous whitespace, nothing competing with the writing. The terminal /
dev-mode / mascot layer is the one deliberate exception: it's meant to feel
playful and a little skeuomorphic (macOS window chrome, scanlines, a mascot
speech bubble), clearly a different "device" from the rest of the site rather
than another themed card. See [Sub-themes](#sub-themes).

## Colors

All color is driven by HSL-triplet CSS variables in
[`app.css`](src/assets/styles/app.css:19-71), set in `:root` and overridden in
`.dark` (toggled as a class on `<html>`, see
[`ThemeProvider.astro`](src/components/ThemeProvider.astro:24)). Variables
store a raw `H S% L%` triplet (no `hsl()` wrapper) so they can be consumed
with an alpha channel: `hsl(var(--primary) / 0.25)`.

| Token | Light | Dark | Used for |
| --- | --- | --- | --- |
| `background` / `foreground` | `210 33% 99%` / `240 10% 3.9%` | `240 20.54% 5.2%` / `0 0% 98%` | Page base |
| `card` / `card-foreground` | `0 0% 100%` / `240 10% 3.9%` | `240 10% 3.9%` / `0 0% 98%` | Cards, popovers |
| `primary` / `primary-foreground` | `200 29% 45%` (muted teal-blue) | `195 95% 85%` (bright cyan) | Links, accents, active state |
| `secondary` / `muted` / `accent` | `240 4.8% 95.9%` / `95%` / `95.9%` | `240 3.7% 15.9%` / `5.9% 12%` / `3.7% 15.9%` | Low-emphasis fills |
| `muted-foreground` | `240 3.8% 28.1%` | `240 5% 74.9%` | Secondary text |
| `destructive` / `destructive-foreground` | `0 72.22% 50.59%` / `0 0% 98%` | `0 62.8% 30.6%` / `0 0% 98%` | Errors |
| `border` / `input` / `ring` | `240 5.9% 88%` / `90%` / `10%` | `240 3.7% 19.9%` / `15.9%` / `4.9% 83.9%` | Structural lines, focus |
| `term-surface` / `term-chrome` / `term-ok` | terminal sub-theme (see below) | | Terminal widget |
| `code-bg` / `code-fg` | `220 14% 93%` / `220 13% 18%` | `240 5.9% 12%` / `0 0% 92%` | Code blocks |

`--primary` is not held constant across themes — it flips from a muted
mid-tone in light mode to a bright near-foreground tone in dark mode, rather
than keeping the same hue/lightness. Match that intent: a color that reads as
an "accent" in light mode should still read as one in dark mode, even if the
exact HSL differs.

[`uno.config.ts:128-162`](uno.config.ts) maps every pair into `theme.colors`
so components use the semantic name, never the raw variable or a generic
Tailwind shade: `bg-muted`, `text-muted-foreground`, `border-input`,
`hover:text-primary`. `presetWind3` (full Tailwind palette) is intentionally
disabled — only `presetMini` + `presetTypography` run
([`uno.config.ts:184-187`](uno.config.ts)) — so classes like `text-red-500`
don't exist here; if a new color is needed, add a token to `app.css` +
`uno.config.ts` rather than reaching for a raw Tailwind shade.

The one deliberate hardcoded-color exception is the terminal's macOS-style
traffic-light buttons (`#ff6058`/`#ffbd2e`/`#28c93f`,
[`terminal.css:156-158`](src/components/terminal/terminal.css)) — chrome
skeuomorphism, not theme content, so it's pinned regardless of light/dark.

## Typography

- Body font: **Satoshi**, self-hosted variable font
  ([`app.css:1-16`](src/assets/styles/app.css), `/fonts/Satoshi-Variable.ttf`),
  set once on `html` — don't re-declare `font-family` per component.
- Monospace: **JetBrains Mono**
  ([`BaseHead.astro:48-57`](src/components/BaseHead.astro)), fallback stack
  `'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace`.
  Scoped to the terminal / dev-mode / mascot sub-theme — general UI stays on
  Satoshi; don't add `font-mono` to ordinary components.
- Prose (blog/notes body copy) uses `presetTypography` via the
  `prose text-base text-muted-foreground` class combo
  ([`site.config.ts:140`](src/site.config.ts)). Headings inside prose are
  `font-weight: 500`, not bold
  ([`uno.config.ts:12-13`](uno.config.ts)); `strong` is `600`, links are `500`
  ([`uno.config.ts:114,118`](uno.config.ts)) — don't fight these with inline
  weight utilities.
- Compact UI text (icon-button labels, dev-mode chrome) pairs
  `font-mono text-xs leading-5 tracking-tight`
  ([`Header.astro:79`](src/components/Header.astro)); nav/brand text uses
  `font-semibold`/`font-medium` at `text-xl`/default size
  ([`Header.astro:41,58`](src/components/Header.astro)) — there's no larger
  custom type scale beyond default Tailwind sizes (`text-xs` … `text-xl`
  cover nearly everything observed).

## Layout

No custom spacing scale — default 0.25rem-increment scale from
`presetMini`. Two idioms recur enough to be conventions:

- Icon buttons: `size-5` content box with `p-1.5` (6px) padding
  ([`Header.astro:79,87,96`](src/components/Header.astro)) — use this
  pairing for any new icon-only button rather than picking arbitrary padding.
- Horizontal flex spacing in nav/header contexts: `gap-x-*` (2/3/4/5), not
  bare `gap-*` — keeps vertical rhythm untouched when a row wraps.
- Card padding: `p-4`/`p-5 sm:p-6`
  ([`pages/index.astro:171`](src/pages/index.astro)).

### Breakpoints

Utility classes use default Tailwind/UnoCSS breakpoints (`sm:`, `md:`, etc.)
throughout — that part is standard. The exception is **scoped `<style>`
blocks**, where UnoCSS doesn't generate responsive variants for hand-rolled
CSS, so components fall back to raw `@media` queries that don't always match
the Tailwind px values exactly:

- `max-width: 640px` is the de facto mobile breakpoint (mirrors Tailwind
  `sm`) — [`Header.astro:225`](src/components/Header.astro),
  `ContentLayout.astro:183`, `FeatureCalloutCard.astro:199`,
  `FriendConstellation.astro:434`, `GitHubContributions.astro:476`,
  `devmode.css:349`, `TalksSeries.astro:992`.
- `min-width`/`max-width: 768px`–`800px` is the de facto tablet breakpoint
  (mirrors Tailwind `md`, loosely) —
  [`Header.astro:215`](src/components/Header.astro) uses `800px`,
  `ContentLayout.astro:138,143` uses `769px`, `PostPreviewEn.astro:153` uses
  `768px`.

When adding a scoped media query, use `640px` for the mobile cutoff and
`768px` (exact Tailwind `md`) for the tablet cutoff, unless you have a
specific reason to diverge (as `Header.astro:215` does, to clear the sticky
header's own horizontal margin).

## Elevation & Depth

No shadow token/CSS var — always a Tailwind `shadow-*` utility or a
hand-authored `box-shadow`. Two idioms, pick based on context:

- **Interactive card hover**: `hover:shadow-sm` (or `hover:shadow-md` for
  pills) combined with `hover:-translate-y-0.5` or
  `hover:border-foreground/25`
  ([`pages/about/index.astro:38`](src/pages/about/index.astro),
  `pages/index.astro:134,171`, `home/ProjectCard.astro:29`,
  `home/LinkCard.astro:31`).
- **Ambient elevation on static surfaces**: a soft shadow tied to the
  foreground token so it stays correct across themes, e.g.
  `box-shadow: 0 14px 38px hsl(var(--foreground) / 0.06)`
  ([`FeatureCalloutCard.astro:72`](src/components/blog/FeatureCalloutCard.astro)).
  Prefer this pattern for new elevated surfaces over hardcoded rgba.

The header's "scrolled" chrome shadow
([`Header.astro:205-209,239-243`](src/components/Header.astro)) is a
hardcoded 4-layer rgba stack predating the foreground-token idiom above. It's
left as-is, but don't copy it into new components.

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

## Shapes

`--radius: 0.5rem` (8px, [`app.css:39`](src/assets/styles/app.css)) is the
canonical system radius, consumed as a raw CSS value in a couple of prose
elements ([`uno.config.ts:39,101`](uno.config.ts)) rather than a class — the
practical convention lives in which Tailwind radius utility each layer uses:

- **`rounded-md`** (6px) — compact controls: icon buttons, small badges
  ([`Header.astro:79,87,96`](src/components/Header.astro)).
- **`rounded-lg`** (8px) — the default for cards and list items; the single
  most common radius in the codebase. Numerically equal to `--radius`.
- **`rounded-xl`/`rounded-2xl`** (12px/16px) — hero-level containers: the
  header shell ([`Header.astro:38`](src/components/Header.astro),
  `rounded-xl` → `sm:rounded-2xl`), homepage/about cards, popout panels.
- **`rounded-full`** — avatars, status dots, pill badges.

Rule of thumb: control → `md`, card → `lg`, hero container → `xl`/`2xl`,
avatar/pill/dot → `full`. The terminal sub-theme uses its own
`--wt-radius: 0.85rem` ([`terminal.css:33`](src/components/terminal/terminal.css))
instead of the global token — intentional, see Sub-themes.

## Components

No component token library — patterns are established by precedent, reused
by copying the class combo rather than a shared component prop API:

- **Icon button**: `size-5` box, `p-1.5` padding, `rounded-md`,
  `hover:bg-border` (or `hover:bg-muted`), `transition-colors`
  ([`Header.astro:77-93`](src/components/Header.astro)).
- **Interactive card**: `rounded-lg`/`rounded-2xl`, `border`,
  `hover:shadow-sm` + `hover:-translate-y-0.5` or `hover:border-foreground/25`
  ([`home/ProjectCard.astro`](src/components/home/ProjectCard.astro),
  `home/LinkCard.astro`).
- **Icon/label swap control** (theme toggle, language switch): see
  [Blurred Icon Transition](#blurred-icon-transition) below — this is a
  motion pattern, not a static style, but any new "cycle through options"
  button should reuse it rather than a plain state swap.

## Do's and Don'ts

- Do use the semantic token classes (`bg-muted`, `text-primary`, …), never a
  raw Tailwind palette color or a literal hex/rgb in a component.
- Don't add `font-mono` outside the terminal/dev-mode/mascot layer — it's a
  sub-theme marker, not a general emphasis utility.
- Do use the `hsl(var(--foreground) / <alpha>)` shadow idiom for new elevated
  surfaces; don't hand-roll another hardcoded rgba shadow stack.
- Don't invent a new scoped `@media` breakpoint — reuse `640px`/`768px`.
- Don't swap a control's icon/label with `display:none`/`display:block` —
  use the Blurred Icon Transition instead (see Motion).
- Do keep the terminal/dev-mode/mascot sub-theme inside its own token set
  (`--wt-*`, `--term-*`) rather than pulling in global tokens — it's meant to
  read as a distinct "device," not another themed card.

## Sub-themes

The terminal / dev-mode / mascot surfaces (`terminal.css`, `devmode.css`,
`mascot/jojo.css`) are a deliberate visual layer on top of the base tokens,
not a bug to normalize away:

- Own radius (`--wt-radius: 0.85rem`) and mono-first typography throughout.
- Glassy chrome: `backdrop-filter: blur(18px) saturate(140%)`, layered
  gradient/mask grid texture
  ([`terminal.css:86-98`](src/components/terminal/terminal.css)).
- `devmode.css` explicitly switches `mix-blend-mode` between `multiply`
  (light) and `screen` (dark) for its scanline effect
  ([`devmode.css:41-46`](src/components/terminal/devmode.css)) — a rare case
  where light/dark need different *blend modes*, not just different colors.
- `jojo.css`'s speech bubble uses theme tokens (`--card`/`--foreground`/
  `--border`) for color but its own literal `10px` radius / `6px 10px`
  padding — color follows the system, geometry doesn't.

When extending one of these surfaces, stay inside its local token set
(`--wt-*`, `--term-*`) rather than pulling in the global `--radius`/spacing
scale.

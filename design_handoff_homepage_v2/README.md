# Handoff: Homepage v2 — Dual-mode Homepage + JoJo Mascot

## Overview

This package redesigns the **joye.sh** blog homepage (currently an Astro site using the `astro-pure` theme) around two core ideas:

1. **Dual-mode homepage** — the default "Human mode" (a faithful, better-composed version of the current homepage) and a full-viewport "Dev mode" (an interactive CLI that takes over the page; triggered by pressing `` ` `` or clicking `dev mode` in the header, dismissed with `Esc`).
2. **JoJo** — a persistent ASCII mascot character (7-line rounded-corner cube) that breathes, blinks, follows the cursor with its eyes, and occasionally speaks idle quips. Currently shown in Dev-mode's neofetch; intended to also appear as a page-wide companion in Human mode.

The existing Astro blog already has a terminal modal (triggered separately); Dev mode in this design is a fuller-screen, site-replacing experience that feels native instead of bolted-on. The homepage's visual language — Satoshi + JetBrains Mono, primary `hsl(200 29% 45%)` / dark `hsl(194 29% 63%)`, dark bg `hsl(240 20.54% 5.2%)` — comes directly from the existing repo's `src/assets/styles/app.css`.

## About the Design Files

The files in this bundle are **design references created in HTML** — prototypes showing intended look and behavior, not production code to copy directly. Your task is to **recreate these designs inside the existing Astro blog codebase** using its established patterns:

- `.astro` components in `src/components/`
- CSS custom properties already defined in `src/assets/styles/app.css` (light + dark variables) — **do not hardcode colors, always use `hsl(var(--primary))` etc.**
- UnoCSS utilities (see `uno.config.ts`) where they help; raw CSS via scoped `<style>` blocks is fine for anything novel
- React integration: the repo does **not** currently use React. JoJo and the two modes here are prototyped in React purely for prototype speed. **Re-implement them as Astro components + a small amount of vanilla JS** (or add `@astrojs/react` if you prefer; talk to the user first). The state needed is minimal — mode toggle, JoJo animations — all doable without a framework.

## Fidelity

**High fidelity.** Colors, typography, spacing, and the mascot ASCII are final. Animation timings (JoJo's 3.2s breathe, 2.8–5.4s blink interval, 6–10s quip interval) are deliberate and should be preserved.

## Screens / Views

### 1. Human mode (default)

This replaces `src/pages/index.astro`. Structure (top-to-bottom):

- **Header** — site title `joye.sh`, nav links (Blog / Archive / Projects / Links / About), theme toggle, `dev mode` pill button (top-right; keyboard hint `` ` ``).
- **Hero** — big serif-ish headline stating "I build AI agents & full-stack apps," a two-line subtitle mentioning atypica @ Tezign · fAIshion.ai · AIXCut, and "University of Melbourne · CS, 2nd year". Avatar at right.
- **Collapsed terminal teaser** — a single-line CTA: `$ chat hire-me ▍  click or ` to open`. Clicking expands to the inline terminal (same command set as Dev mode but embedded, not full-screen). Above it, a muted one-liner: `// power user? Skip the scroll — try the interactive CLI. Type [help], [chat], or [ls posts].`
- **Recent posts** — 5 most recent, list style.
- **Experience / Projects / Skills / Links** — faithful to current homepage.

Layout width: `max-width: 768px`, horizontally centered, `padding: 0 24px`.

**Dark mode** — the existing `highlightColor` radial gradient behind the hero is **hidden** in dark by default (it's too loud against the dark blue-black). Expose a tweak to re-enable if wanted.

### 2. Dev mode (overlay)

Full-viewport replacement (`position: fixed; inset: 0; z-index: 100`). Structure:

- **Top chrome bar** — traffic lights (red/yellow/green dots), `guest@joye.sh · ~` hostname label, `human mode [esc]` button on the right.
- **Terminal body** — scrollable. Boot sequence plays once:
  ```
  [ OK ] Loading joye.sh (dev mode)
  [ OK ] Mounting /posts … 5 files
  [ OK ] Connecting agent@joye.sh …
  ```
  Then a **neofetch block** (JoJo mascot on the left, system-info rows on the right), then the help hint `Type `help` to see commands. Press ` or Esc to return.`, then the live prompt.
- **Prompt** — `guest@joye.sh $ ` with a blinking block cursor. Typed input is invisible (hidden `<input>`) but displayed inline.

Commands (see `v2/dev-mode.jsx` for full list):
`help`, `whoami`, `ls [posts|notes|projects|skills]`, `cat <slug>`, `chat <msg>`, `connect`, `theme`, `exit`, `clear`.

### 3. JoJo mascot

7-line ASCII figure with cursor-tracking eyes, breathing, blinking, and speech bubbles. See **JoJo Component** section below for full spec.

## Interactions & Behavior

- **`` ` `` key (not inside an input/textarea)** → enter Dev mode.
- **`Esc` in Dev mode** → return to Human mode.
- **Click `dev mode` button in header** → enter Dev mode.
- **Click the collapsed terminal teaser** → expand inline terminal.
- **Mousemove anywhere** → JoJo's eyes rotate toward the cursor (`●` → `◖`/`◗`/`⦿`/`◉` depending on direction).
- **Idle ~2–3s then every 6–10s** → JoJo speaks a random quip; bubble auto-dismisses after 3.2s.
- **Every 2.8–5.4s** → JoJo blinks (eyes → `‾` for 140ms).
- **Theme toggle** — toggles `.dark` class on `<html>`; persists in localStorage (match existing site's behavior).
- **Boot sequence** — uses `setTimeout` queue (not `setInterval`) because React 18 StrictMode double-invokes cleanups and can drop interval ticks. Each line lands 110ms after the previous.

## State Management

Minimal. In the prototype it's:
- `mode: 'human' | 'dev'`
- `theme: 'light' | 'dark'` (sync with `<html class="dark">`)
- `termOpen` (Human mode's inline terminal: collapsed vs open)
- `output[]` and `input` inside each terminal
- `gaze: {x, y}` inside JoJo

In Astro, implement as:
- Mode toggle: small vanilla-JS module that listens for `keydown`, toggles a `<div id="dev-mode-root">` visibility and mounts the terminal. No global store needed.
- Theme: already handled by `astro-pure` — don't fight it.
- JoJo: self-contained Astro component with a `<script>` block for the cursor/blink/quip loops.

## Design Tokens

Pull from `src/assets/styles/app.css` — **do not duplicate**. Key tokens used:

### Light
- `--background: 210 33% 99%`
- `--foreground: 240 10% 3.9%`
- `--primary: 200 29% 45%`
- `--muted: 240 4.8% 95%`
- `--muted-foreground: 240 3.8% 46.1%`
- `--border: 240 5.9% 90%`
- `--card: 0 0% 100%`

### Dark
- `--background: 240 20.54% 5.2%` (deep blue-black)
- `--foreground: 0 0% 98%`
- `--primary: 194 29% 63%` (pale cyan)
- `--muted: 240 3.7% 15.9%`
- `--border: 240 3.7% 15.9%`
- `--card: 240 10% 8%`

### Tokens to add

These are new for the terminal chrome. Add to `app.css`:

```css
:root {
  --term-surface: 210 20% 97%;    /* slightly darker than --background in light */
  --term-chrome:  210 20% 95%;    /* header bar of terminal */
  --term-ok:      142 50% 40%;    /* boot "[ OK ]" green */
}
.dark {
  --term-surface: 240 18% 7%;     /* slightly lighter than --background in dark */
  --term-chrome:  240 18% 4%;
  --term-ok:      142 60% 65%;
}
```

### Typography
- **Display/body**: Satoshi (already loaded from `public/fonts/Satoshi-Variable.ttf`)
- **Mono**: JetBrains Mono (not yet in repo — add via `<link>` in `BaseLayout.astro` or self-host)

### Spacing / radii
- Container: `max-width: 768px`
- Card radius: `12px`
- Terminal body radius: `10px`
- Pill button radius: `999px`

## JoJo Component

The source of truth is `v2/jojo.jsx`. Re-implement as `src/components/mascot/JoJo.astro` + `jojo.ts`.

### ASCII shape (exact)

```
  ╭──────╮
  │ ● ● │
  │  ᴗ   │
  ╰─┬──┬─╯
    │  │
    ╵  ╵
```

- Font: `JetBrains Mono, ui-monospace, monospace`
- Color: `hsl(var(--primary))`
- Font-size: 14px (md), 12px (sm)
- `letter-spacing: 0.5px`
- `line-height: 1.15`

### Eyes glyph-switching (cursor tracking)

Given gaze vector `(x, y)` where each ∈ [-1, 1]:

```
if |y| > 0.55 and |y| > |x|:
    y < 0 → ['⦿', '⦿']   // looking up
    else  → ['◉', '◉']   // looking down
elif |x| > 0.3:
    x < 0 → ['◖', '◖']   // left
    else  → ['◗', '◗']   // right
else:
    ['●', '●']           // center
```

### Blink

Every 2.8–5.4s (random): eyes → `['‾', '‾']` for 140ms, then restore by gaze.

### Breathe

CSS keyframe, 3.2s ease-in-out infinite:
```css
@keyframes jojo-breathe {
  0%, 100% { transform: translateY(0) scaleY(1); }
  50%      { transform: translateY(-1px) scaleY(1.015); }
}
```
`transform-origin: 50% 100%`.

### Quips

Three pools — `idle`, `greet`, `hover` (full lists in `v2/jojo.jsx` line ~5–22). Default is `idle`. Pick a prop `quipPool` at component use site. Cycle: first quip at 1.8s, then every 6–10s (random).

When speaking, mouth `ᴗ` → `o` for 400ms.

### Speech bubble

Anchored to JoJo's top-right (outside the ASCII). Tail points left toward JoJo.
- Bg: `hsl(var(--card))`, border: `1px solid hsl(var(--border))`, radius 10, padding `6px 10px`
- Same mono font, 12px
- Enter animation: `opacity 0 → 1` + `translateX(-4px → 0)`, 250ms ease-out
- Auto-dismiss 3.2s after appearing

### Props

```ts
interface JoJoProps {
  size?: 'sm' | 'md';              // default 'md'
  speak?: string | null;            // force a specific bubble
  autoQuips?: boolean;              // default true
  quipPool?: 'idle' | 'greet' | 'hover';
  onClick?: () => void;
  followCursor?: boolean;           // default true
  accent?: string;                  // default 'hsl(var(--primary))'
}
```

## Assets

- **Fonts**: Satoshi is already in `public/fonts/`. Add **JetBrains Mono** (self-host or Google Fonts link in `BaseLayout.astro`).
- **Avatar**: `src/assets/avatar.png` (existing).
- No other new assets.

## Files

- `Homepage v2.html` — the full working prototype. Open it to see everything live. Press `` ` `` for Dev mode.
- `v2/app.jsx` — top-level React component, mode switching, tweaks wiring.
- `v2/human-mode.jsx` — Human-mode homepage (hero, collapsed terminal, sections).
- `v2/dev-mode.jsx` — Dev-mode full-screen terminal, command handlers, neofetch with JoJo.
- `v2/jojo.jsx` — **primary reference for the JoJo mascot**.
- `v2/data.jsx` — content (posts, experience, profile). You'll replace this with the real Astro content collections.
- `v2/tweaks.jsx` — prototype-only tweak panel; do not port.
- `v2/mascot-lab.html` — the exploration that led to JoJo (6 mascot directions). Reference only.

## Suggested implementation order

1. Add `JetBrains Mono` font loading to `BaseLayout.astro`.
2. Add the three `--term-*` tokens to `app.css`.
3. Build `JoJo.astro` first (self-contained, testable in isolation).
4. Build Dev-mode overlay (`components/dev-mode/DevMode.astro` + command registry). Reuse the existing terminal command logic in `src/components/terminal/commands.tsx` where possible — the prototype's command list is intentionally aligned with it.
5. Rebuild `src/pages/index.astro` for Human mode. Keep the existing `Section`/`LinkCard`/etc. components; only restructure the hero + add the collapsed-terminal teaser.
6. Wire the `` ` `` / `Esc` handlers + header `dev mode` button.
7. (Later) Add JoJo as a page-wide companion in Human mode — the user wants this eventually but we haven't designed the exact behavior/placement yet.

## Things to ask the user before shipping

- Should the existing `TerminalShell` component be replaced entirely by Dev mode, or kept as a separate modal?
- Should Human-mode JoJo peek from a corner, walk across, or be anchored somewhere?
- Does the prototype's command set (`help`, `whoami`, `ls`, `cat`, `chat`, `connect`, `theme`, `exit`, `clear`) match what the existing terminal registers? If not, reconcile.

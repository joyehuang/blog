# Storyboard

**Format:** 1920x1080 landscape
**Audio:** HyperFrames TTS voiceover + minimal electronic underscore + small terminal SFX
**VO direction:** calm, precise, young technical founder energy; short pauses are part of the rhythm
**Style basis:** `DESIGN.md` using the captured dark portfolio system, Satoshi, JetBrains Mono, thin borders, terminal UI, and compact cards

## Asset Audit

| Asset | Type | Assign to Beat | Role |
| --- | --- | --- | --- |
| `capture/screenshots/scroll-000.png` | Website screenshot | Beat 1, Beat 2 | Hero/source material, terminal and identity reference |
| `capture/screenshots/scroll-041.png` | Website screenshot | Beat 3 | Blog, notes, and experience surface reference |
| `capture/screenshots/scroll-082.png` | Website screenshot | Beat 3 | Open-source and skills surface reference |
| `capture/screenshots/scroll-100.png` | Website screenshot | Beat 4 | Stats and footer proof reference |
| `../src/assets/avatar.png` copied to `assets/avatar.png` | Avatar image | Beat 1, Beat 5 | Primary identity mark |
| `capture/assets/svgs/svg-e7bc1e29.svg` | Location icon | Beat 1 | Melbourne label |
| `capture/assets/svgs/svg-9f37aa29.svg` | GitHub icon | Beat 1, Beat 5 | Proof/social link |
| `capture/assets/svgs/svg-458d186c.svg` | Search icon | SKIP | Too generic for promo |
| `capture/assets/svgs/svg-c1102ba5.svg` | Desktop/theme icon | Beat 2 | Terminal utility motif |
| `capture/assets/svgs/svg-8cc4a162*.svg` | Arrow icons | Beat 3 | Row motion and navigation cues |
| `capture/assets/svgs/svg-aa3fc4bf*.svg` | Arrow icons | Beat 3 | Alternate row arrow treatment |
| `capture/assets/svgs/svg-762651f6.svg` | Astro mark | SKIP | Framework credit, not core product message |
| `capture/assets/fonts/*.ttf` | Fonts | All beats | JetBrains Mono captured from site |

## BEAT 1 - COLD OPEN: THE SITE TALKS BACK (0.00-3.20s)

**VO cue:** "Joye's site doesn't ask you to scroll. It lets you talk to it."

**Concept:** The viewer opens on the actual identity system: avatar, Joye name, Melbourne/GitHub labels, and a live green status dot. The page is quiet, then the terminal prompt wakes up, implying the site is not a static portfolio but an interface.

**Visual description:** Near-black canvas with faint blue ambient glow. Avatar lands center-top inside a circular border. "Joye" types in as a crisp Satoshi wordmark. Location and GitHub labels draw in as tiny icon rows. A terminal strip slides up under the identity and the command `help` types itself. A green dot pulses once beside "Connect Me!".

**Techniques:** character-by-character typing, SVG/icon draw-in, localized glow pulse, velocity transition.

**Assets:** `assets/avatar.png`; `capture/assets/svgs/svg-e7bc1e29.svg`; `capture/assets/svgs/svg-9f37aa29.svg`.

**Transition:** Blur-through into Beat 2. Terminal strip expands while the identity softens behind it.

**Depth layers:** BG dark canvas + soft blue glow; MG avatar/name/labels; FG terminal strip + cursor.

**SFX:** soft terminal key taps, single green status tick.

## BEAT 2 - INTERACTIVE CLI (2.94-5.60s)

**VO cue:** "Explore AI agent work, product builds,"

**Concept:** The terminal becomes the camera. Instead of scrolling, commands reveal the site's structure like a product surface.

**Visual description:** The terminal grows into a wide, dark rounded shell. `ls /blog`, `chat`, and `whoami` appear in separate command lanes. Each command emits a small row of results: "Agent interviews", "OpenHarness", "Playyy.ai", and "atypica.ai". Thin connector paths draw between command tokens and content rows. The cursor moves with deliberate speed rather than chaotic typing.

**Techniques:** terminal typing, SVG path drawing, card cascade, small counter flashes.

**Assets:** terminal motif recreated from `scroll-000.png`; `capture/assets/svgs/svg-c1102ba5.svg`.

**Transition:** Velocity-matched upward push. Rows rise into a larger content board.

**Depth layers:** BG faint grid and terminal glow; MG command lanes; FG cursor and command pills.

**SFX:** tighter typing taps, soft command-return chime.

## BEAT 3 - WORK SURFACE (5.11-9.15s)

**VO cue:** "research notes, and open-source projects from a Melbourne full-stack builder."

**Concept:** The site turns into a compact map of Joye's work. Blog rows, research notes, experience cards, and open-source tiles stack in a modular dashboard.

**Visual description:** Three columns settle into place: AI Agent, Product Builds, and Open Source. Under them, cards cascade from the captured page content: "I Grilled Another Agent Candidate", "Hermes Agent Memory", "Building Playyy.ai", "atypica.ai", "Learn-Open-Harness", and "minimind-notes". Arrow icons trace across rows. Skill chips drift at the bottom as a quiet substrate.

**Techniques:** staggered card cascade, per-word kinetic labels, SVG arrow drawing, CSS 3D card tilt.

**Assets:** `capture/screenshots/scroll-041.png`, `capture/screenshots/scroll-082.png`, arrow SVGs.

**Transition:** Staggered block cover into Beat 4. Cards compress into four proof tiles.

**Depth layers:** BG dark canvas with low-opacity screenshot slices; MG content cards; FG section labels and arrows.

**SFX:** soft card taps, subtle paper-stack shuffle.

## BEAT 4 - PROOF NUMBERS (8.90-13.45s)

**VO cue:** "Twelve posts. Eleven notes. Twelve projects. And an interactive CLI."

**Concept:** The page's footer stats become the proof moment. The numbers should feel measured, not hype-heavy.

**Visual description:** Four stat tiles appear in a row: `12` Posts, `11` Notes, `12` Projects, and `CLI` Interactive. The numbers count up quickly with tabular alignment. Behind them, muted miniature rows from the blog and notes sections drift vertically. The green live dot travels from tile to tile on a drawn path and lands on CLI.

**Techniques:** counter animation, MotionPath-style dot movement, SVG path drawing, tabular-number typography.

**Assets:** `capture/screenshots/scroll-100.png`; stat text from `visible-text.txt`.

**Transition:** Gentle focus pull to Beat 5. Stats blur back as the URL sharpens.

**Depth layers:** BG muted page screenshot strip; MG stat tiles; FG green dot and route line.

**SFX:** four restrained counter ticks, final CLI ready beep.

## BEAT 5 - CTA: OPEN THE WORKSPACE (13.22-20.00s)

**VO cue:** "Start at joyehuang dot me."

**Concept:** The ending returns to the personal identity and gives one clear action. It should feel like opening a shell, not clicking an ad.

**Visual description:** Avatar and Joye wordmark return, smaller and calm. A terminal prompt types `open joyehuang.me`. The URL resolves into a bright pill with a green online dot. Three small chips orbit below: `AI Agent`, `Full-Stack`, `Open Source`. The frame holds long enough to read.

**Techniques:** character typing, per-word chip reveal, localized glow pulse, final fade to black.

**Assets:** `assets/avatar.png`; GitHub SVG; recreated terminal shell.

**Transition:** Final color dip to black in the last half-second.

**Depth layers:** BG near-black canvas; MG avatar/wordmark; FG URL terminal and chips.

**SFX:** final enter key, short clean resolve tone.

## Production Architecture

```text
joye-product-promo/
├── index.html
├── DESIGN.md
├── SCRIPT.md
├── STORYBOARD.md
├── narration.wav
├── transcript.json
├── assets/
│   └── avatar.png
├── capture/
│   ├── screenshots/
│   ├── assets/
│   └── extracted/
└── compositions/
    └── optional sub-compositions from starter scaffold, replaced if not needed
```

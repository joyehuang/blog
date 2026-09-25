# Jojo on joyehuang.me

Jojo is Joye's character (the approved lead of the private _Jojo & Friends_
family). This site shows it in three ways that are designed to work together:

|                   | what                                                                                                                                                                                                                                                  | where                                                                                                                 | JS                                                                           |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **A · signature** | Jojo seated beside the home avatar (pokeable), a card at the end of every post, 404, an About section with the short film and three friends                                                                                                           | `src/components/jojo/JojoHero.tsx`, `JojoArticleEnd.astro`, `JojoNotFound.astro`, `JojoAbout.astro`, `JojoMark.astro` | seat: React island (`client:idle`); the rest is build-time SVG + a few lines |
| **B · dock**      | a resident companion in the bottom-right corner with real shortcuts, poke/tuck, and a chat area that honestly says chat is not connected                                                                                                              | `JojoDock.tsx`, `dock.css`, `src/lib/jojo/chat/*`, `presence.ts`                                                      | React island (`client:idle`) on every page                                   |
| **C · intro**     | "Jojo builds the site": a ≈ 3.4 s first-visit intro compressed from the 29 s film — Jojo pops out, knocks the hero apart, pulls the header back on its signal-dot tether, rolls the avatar home, yanks the terminal card back, and hops into its seat | `JojoHead.astro` (gate), `JojoIntro.astro`, `src/lib/jojo/intro/*`                                                    | loaded only when it plays                                                    |

**How they combine (default):** first visit to `/` or `/en` → C plays and ends
by landing in A's seat → while the seat is on screen the dock stays away; once
the hero scrolls off, B slides in. On posts, the dock keeps you company and
steps aside when the end-of-post Jojo (A) or, on phones, the comment box comes
into view. One Jojo per viewport, always. Return visits: no intro, everything
still unless poked. Reduced motion or Save-Data: no intro, no greeting, static
art everywhere.

## The private package boundary

The character engine and artwork are **not** in this repository (Apache-2.0).
They come from the private `@joyehuang/jojo-web` package, built from a private
branch of `joyehuang/jojo-friends` (see that repo's `docs/WEB-PACKAGE.md`).
This repo contains only integration code, a loader and a sha256 pin.

`scripts/jojo/jojo-web.mjs` runs from `astro.config.ts` and puts the package in
gitignored `vendor/jojo-web/`, first match wins:

| source                                  | use                                                                                                                                                                                      |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `JOJO_WEB_DIR=/path/to/dist-web`        | local work against a private checkout                                                                                                                                                    |
| `JOJO_WEB_TGZ=/path/to/pkg.tgz`         | a packed tarball; must match the pin                                                                                                                                                     |
| `vendor/jojo-web` at the pinned version | already installed                                                                                                                                                                        |
| `JOJO_WEB_TOKEN=<read-only token>`      | CI/Vercel: downloads the release asset named in `scripts/jojo/jojo-web.lock.json` through the GitHub API (token in a header — never in a URL, lockfile or log), verifies sha256, unpacks |
| none of the above                       | **Jojo off**: the site builds exactly as before (particle intro, ASCII mascot, promo modal)                                                                                              |

`PUBLIC_JOJO=0` also switches Jojo off with the package present — that is the
rollback switch. `@jojo-web/runtime` / `@jojo-web/static` resolve (Vite alias)
to the vendor files or to typed stand-ins in `src/lib/jojo/fallback/`, so
`astro check` passes with or without the package.

### Credentials and trust

- The token is a GitHub fine-grained token limited to `joyehuang/jojo-friends`,
  **Contents: Read-only**. Keep it in `~/.config/…` (0600) locally or as the
  Vercel env var `JOJO_WEB_TOKEN`.
- Scope that env var to **Production** and to explicitly trusted Preview
  branches only. A Preview build executes the branch's code, so any branch that
  can see the token can exfiltrate the package. Fork PRs and unreviewed branches
  must build without it (they then get the Jojo-off site, which is fine).
- Status on 2026-09-25: no such token exists yet (creating one needs the owner
  in the GitHub UI). Until then Git-triggered Vercel builds are Jojo-off, and a
  Jojo Preview is produced manually: build locally with the package, then
  `vercel deploy --prebuilt` (Preview, never `--prod`).

### What visitors can extract

Browsers receive the runtime JS (≈ 18 KB gzip) and rendered SVG; a determined
visitor can save them. That is the unavoidable cost of showing a character on
the web and does not grant any rights. No obfuscation or right-click blocking
is used. The runtime chunk contains Jojo only — no other family member's data;
About ships three friends as finished static SVG.

## Review builds

`PUBLIC_JOJO_REVIEW=1` (manual Preview only) adds a "Jojo · Review" pill:
switch scheme (`?jojo=abc|a|b|c|off`, kept for the session), replay or re-arm
the intro without clearing storage by hand, and preview chat _states_ on the
dock, labelled as a demo. `?jojo-intro=play` replays the intro in any build
(reduced motion still wins). In review builds `window.__jojoIntro.seek(ms)`
freezes the intro at a frame for inspection.

## Decisions to review

- **Promo:** in Jojo mode the first-visit promo modal is not rendered (it would
  stack a second mask right after the intro); the in-page promo card stays and
  the bottom-left popout waits for the intro to finish. Production promo
  behaviour is unchanged while Jojo is off.
- **Film hosting:** About links the published film on Cloudflare's `r2.dev`
  host (rate-limited dev hostname). Move it to a production host before launch.
- **Copy:** the few Jojo lines (About, 404, end card, dock) are placeholders in
  the site's voice; final wording is Joye's call.
- **Coral dot at 24–32 px** may read as a notification badge.

## Tests

- `bun test src/lib/jojo` — gate, timeline (fits 2–4 s, starts and ends exactly
  on the real page, actually scatters/rebuilds), controller (complete, skip by
  key/pointer/wheel/touch/scroll, hidden tab, pagehide, watchdog, render error,
  mount failure, seek), poke, presence, chat adapter, analytics once-per-view.
- Private repo: `tests/web-package.test.tsx` — the built package draws the
  approved Jojo byte-for-byte (16 emotions × 6 statuses × 3 sizes) and never
  shares SVG ids across instances.
- `node scripts/jojo/measure-pages.mjs dist/client / /en /404 …` — per-page
  HTML/JS inventory (initial vs on-demand chunks), duplicate ids.

## Files

```
scripts/jojo/jojo-web.mjs, jojo-web.lock.json   package loader + pin
scripts/jojo/measure-pages.mjs                   page weight inventory
src/components/jojo/                             A/B/C components, css
src/lib/jojo/                                    gate, timeline, controller, runner, presence, poke, chat seam
src/lib/jojo/fallback/                           typed stand-ins (package absent)
```

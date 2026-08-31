# Lab entries (frontend demos & tips)

`/lab` is a gallery of small self-contained frontend demos. Collection `lab` is defined in `src/content.config.ts`; index + detail pages live in `src/pages/lab/`; shared chrome (`DemoFrame`, `LabCard`) and helpers (`src/lib/lab.ts`) already exist — **adding an entry should not touch any of that scaffolding.**

To add one, create a folder under `src/content/lab/<slug>/` with:

- `index.mdx` — frontmatter (`title`, `blurb` one-line 观点, `date`, `category` from the `lib/lab.ts` enum, `tags`, optional `source` URL) + the write-up. Embed the demo with:
  ```mdx
  import DemoFrame from '@/components/lab/DemoFrame.astro'
  import Demo from './Demo.tsx'

  <DemoFrame bleed>
    <Demo client:visible />
  </DemoFrame>
  ```
- `Demo.tsx` — the demo component, co-located (the md/mdx loader ignores it).

Conventions:

- A demo is a deliberate self-contained "artifact" (like the terminal sub-theme): it keeps its **own** palette via local CSS variables rather than the global semantic tokens. Make it theme-aware by defining a dark override keyed on `.dark` (e.g. `.dark .demo-root { --bg: … }`) — the demo's inline `<style>` is global CSS, so use `.dark <sel>`, not `:global()`. `DemoFrame`'s chrome (border/shadow) already follows the site light/dark tokens.
- Keep every animation behind a `prefers-reduced-motion: reduce` override (see `DESIGN.md`).
- Run `bun run check` before committing (the `.tsx`/`.mdx` are type-checked by Vercel's build).

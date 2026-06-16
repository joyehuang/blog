# Project conventions

## Git workflow

Commit at natural checkpoints — even small changes. Don't batch unrelated work; create the commit promptly. No need to ask before committing.

**Preview-first — do NOT push straight to `main`.** `main` is the production branch and auto-deploys to Vercel, so anything pushed there is immediately live. Instead push to a feature branch so Vercel builds a preview, share it, and only merge/push to `main` after the user has seen the preview and approved. (This rule exists because a blog post was once auto-pushed to `main` and went to production before review.)

Guidelines:
- One logical change per commit. Bundle together if the pieces are coupled (e.g. a page + the component it requires); split if the concerns are independent (e.g. a bug fix and a new feature).
- Write commit messages in English. Imperative present tense, lowercase after the type. Keep the subject ≤ 70 chars.
- Before committing, run `bun run check` if the change touches `.astro`/`.ts`/`.tsx` — Vercel's build runs `astro check` and will fail on type errors.

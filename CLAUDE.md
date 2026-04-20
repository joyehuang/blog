# Project conventions

## Git workflow

After every code change — even small ones — create a commit and `git push origin main`. Don't batch unrelated work; commit at natural checkpoints and push immediately. No need to ask before pushing.

Guidelines:
- One logical change per commit. Bundle together if the pieces are coupled (e.g. a page + the component it requires); split if the concerns are independent (e.g. a bug fix and a new feature).
- Write commit messages in English. Imperative present tense, lowercase after the type. Keep the subject ≤ 70 chars.
- Before committing, run `bun run check` if the change touches `.astro`/`.ts`/`.tsx` — Vercel's build runs `astro check` and will fail on type errors.

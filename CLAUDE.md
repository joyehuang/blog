# Project conventions

## Project references

- Analytics tracking contract: `ANALYTICS.md`. Check this before adding, renaming, or changing Vercel Analytics events.
- UI/motion conventions: `DESIGN.md`. Check this before adding new interactive UI or transitions, so components reuse existing patterns (e.g. the Blurred Icon Transition) instead of inventing new ones.

## Git workflow

Commit at natural checkpoints — even small changes. Don't batch unrelated work; create the commit promptly. No need to ask before committing.

**Preview-first — do NOT push straight to `main`.** `main` is the production branch and auto-deploys to Vercel, so anything pushed there is immediately live. Instead create a feature branch and push there so Vercel builds a preview, share it, and only merge/push to `main` after the user has seen the preview and approved. (This rule exists because a blog post was once auto-pushed to `main` and went to production before review.)

Name feature branches with a conventional type prefix: `feat/`, `fix/`, `chore/`, `docs/`, `refactor/` followed by a short kebab-case description (e.g. `feat/talks-week3-preview`).

Guidelines:

- One logical change per commit. Bundle together if the pieces are coupled (e.g. a page + the component it requires); split if the concerns are independent (e.g. a bug fix and a new feature).
- Write commit messages in English. Imperative present tense, lowercase after the type. Keep the subject ≤ 70 chars.
- Before committing, run `bun run check` if the change touches `.astro`/`.ts`/`.tsx` — Vercel's build runs `astro check` and will fail on type errors.

## Pull requests

Keep descriptions short — say what changed and why in as few words as the change needs. Do not restate the diff or pad with filler.

- **Title**: `type(scope): imperative summary`, ≤ 70 chars (same style as commits).
- **Body**: default to 1–3 sentences. Use a short bullet list only when the PR bundles several distinct changes. Add a `Notes:` line only for a real gotcha a reviewer would otherwise miss (migration, config, non-obvious tradeoff).
- Link issues with `Closes #12` / `Refs #12` when there is one.
- Cut filler: no "This PR…", no restating each file, no marketing adjectives, no empty sections. A one-line body is fine for a small PR.

Small fix:

> Closes #41. Popout close now writes sessionStorage, so it reappears next visit instead of being dismissed forever.

Multi-change PR:

> Tidy the agent-teams entry points.
> - Throttle the intro animation to once per 24h (was per-session).
> - Popout dismissal is per-session, not permanent.
> - Add a Summer of Agents section to the About page.
>
> Notes: storage-gate changes are client-only; no API changes.

## Branch cleanup

The repo auto-deletes head branches on merge (GitHub → Settings → General → "Automatically delete head branches"), so a merged PR's remote branch disappears on its own. Clear the matching local branch too — after a merge, prune the locals whose remote is now gone:

```
git fetch --prune
git branch -vv | awk '/: gone]/{print $1}' | xargs -r git branch -D
```

`-D` (not `-d`) because squash-merged branches look "unmerged" to git; deletions are recoverable via `git reflog`.

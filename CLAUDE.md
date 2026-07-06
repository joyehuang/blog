# Project conventions

## Project references

- Analytics tracking contract: `ANALYTICS.md`. Check this before adding, renaming, or changing Vercel Analytics events.
- Roadmap data source: `src/data/roadmap.ts`. Rendered at `/roadmap`. `ROADMAP.md` is a GitHub-browsing mirror, hand-synced.
- Changelog data source: `src/data/changelog.ts`. Rendered at `/changelog`. `CHANGELOG.md` is a GitHub-browsing mirror, hand-synced.
- GitHub Issues are the discussion and triage layer. Link issues from roadmap and changelog entries when applicable.

## Maintenance workflow

Three layers, each with one job:

- **Discussion & triage** → GitHub Issues (bug / feature / site-feedback templates).
- **Planning** → `src/data/roadmap.ts` (`status`: now / next / later / done). Each item has a stable `id` — never rename it after it ships.
- **Shipped history** → `src/data/changelog.ts` (grouped by release). `Unreleased` collects in-progress work; move entries into a dated release once merged/deployed.

When you change roadmap or changelog content:

1. Edit the TS data source (`src/data/roadmap.ts` or `src/data/changelog.ts`) — this is what the site renders.
2. Hand-sync the corresponding `.md` mirror (`ROADMAP.md` / `CHANGELOG.md`) so GitHub browsing stays accurate. The md files are not the source of truth.
3. After a meaningful site change, check whether the PR checklist, roadmap, changelog, and analytics contract need updates.

Review roadmap and changelog at least monthly, or after a cluster of related issues is closed.

## Git workflow

After every code change — even small ones — create a commit and `git push origin main`. Don't batch unrelated work; commit at natural checkpoints and push immediately. No need to ask before pushing.

Guidelines:

- One logical change per commit. Bundle together if the pieces are coupled (e.g. a page + the component it requires); split if the concerns are independent (e.g. a bug fix and a new feature).
- Write commit messages in English. Imperative present tense, lowercase after the type. Keep the subject ≤ 70 chars.
- Bump `package.json` `version` when shipping user-visible changes, and add a matching dated release in `src/data/changelog.ts` (+ mirror).
- Before committing, run `bun run check` if the change touches `.astro`/`.ts`/`.tsx` — Vercel's build runs `astro check` and will fail on type errors.

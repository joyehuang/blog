# Project conventions

## Project references

- Analytics tracking contract: `ANALYTICS.md`. Check this before adding, renaming, or changing Vercel Analytics events.
- Roadmap: `ROADMAP.md`. Check this before starting feature, workflow, or content-system work.
- Changelog: `CHANGELOG.md`. Add an `Unreleased` entry for shipped site, content-system, analytics, or maintenance changes.
- GitHub Issues are the discussion and triage layer. Link issues from roadmap and changelog entries when applicable.

## Maintenance workflow

- Use issues for proposals, bugs, and reader feedback.
- Use `ROADMAP.md` for planned or deferred work.
- Use `CHANGELOG.md` for completed work, with `Refs #...` or `Closes #...` when an issue exists.
- After a meaningful site change, check whether the PR checklist, roadmap, changelog, and analytics contract need updates.
- Review `ROADMAP.md` and `CHANGELOG.md` at least monthly or after a cluster of related issues is closed.

## Git workflow

After every code change — even small ones — create a commit and `git push origin main`. Don't batch unrelated work; commit at natural checkpoints and push immediately. No need to ask before pushing.

Guidelines:

- One logical change per commit. Bundle together if the pieces are coupled (e.g. a page + the component it requires); split if the concerns are independent (e.g. a bug fix and a new feature).
- Write commit messages in English. Imperative present tense, lowercase after the type. Keep the subject ≤ 70 chars.
- Before committing, run `bun run check` if the change touches `.astro`/`.ts`/`.tsx` — Vercel's build runs `astro check` and will fail on type errors.

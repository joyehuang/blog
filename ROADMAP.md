# Roadmap

This roadmap keeps the blog's product and maintenance direction visible without
turning GitHub Issues into long-term memory. Issues hold discussion and concrete
tasks. This file holds priorities, decisions, and review cadence.

## Working Rules

- Every roadmap item should have a stable short id, for example
  `maintenance-loop`.
- Link related issues as soon as they exist: `Refs #12`, `Closes #18`.
- When an item ships, move the outcome to `CHANGELOG.md` and either remove the
  item from `Now` or move follow-up work to `Next`.
- Review this file at least monthly, and after any cluster of related issues is
  opened or closed.

## Now

### `maintenance-loop`

Build a lightweight repo-native maintenance system so site direction, shipped
changes, reader feedback, and agent instructions do not depend on human memory.

Status: in progress

Related files:

- `ROADMAP.md`
- `CHANGELOG.md`
- `CLAUDE.md`
- `ANALYTICS.md`
- `.github/ISSUE_TEMPLATE/*`
- `.github/PULL_REQUEST_TEMPLATE.md`

Definition of done:

- Feedback from article pages can open a GitHub issue.
- Issues are the discussion and triage layer.
- `ROADMAP.md` tracks planned work.
- `CHANGELOG.md` tracks shipped work.
- `CLAUDE.md` tells coding agents which maintenance files to check and update.

## Next

### `public-feedback-loop`

Improve how reader suggestions flow from the public site into GitHub Issues.

Possible work:

- Add feedback entry points to selected non-article pages such as Talks and
  Curated.
- Add issue labels for `feedback`, `content`, `site`, and `analytics`.
- Periodically review open feedback issues and promote accepted work to this
  roadmap.

### `content-maintenance`

Make content status easier to audit.

Possible work:

- Add a lightweight review checklist for old notes and posts.
- Surface stale or incomplete content in a private report.
- Decide which content changes belong in `CHANGELOG.md`.

## Later

### `automation-review`

Explore scheduled maintenance prompts or GitHub automation for stale issues,
roadmap review, and changelog reminders. Keep this manual until the workflow is
stable enough to automate.

## Done

Nothing yet.

# Changelog

This file records shipped site, content-system, analytics, and maintenance changes.
It is not a task board. Use GitHub Issues for discussion and `ROADMAP.md` for
planned work.

## How To Maintain

- Add entries under `Unreleased` while work is in progress.
- Move entries into a dated section after the change is merged or deployed.
- Link the issue when there is one: `Closes #12`, `Refs #18`, or `See #21`.
- Record user-facing or future-maintenance changes. Skip pure formatting,
  typo-only fixes, and routine dependency noise unless they explain a real
  behavior change.

## Unreleased

### Added

- Add the repository maintenance loop: `ROADMAP.md`, `CHANGELOG.md`, issue
  feedback forms, PR checklist, and an article feedback entry point. Refs
  roadmap item `maintenance-loop`.

### Changed

- Point issue templates and agent guidance at the blog's own maintenance flow
  instead of upstream theme support.

### Fixed

- None yet.

### Notes

- `ANALYTICS.md` remains the source of truth for tracking events.
- GitHub Issues are the discussion layer; this changelog is the shipped-history
  layer.

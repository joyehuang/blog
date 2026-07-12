# Repository Guidelines

## Project Structure & Module Organization

This Astro 5 blog uses TypeScript and Bun. Routes live in `src/pages/`; reusable layouts and UI belong in `src/layouts/` and `src/components/`. Put shared logic in `src/lib/`, structured data in `src/data/`, and global configuration in `src/site.config.ts`. Articles, notes, and talks are stored under `src/content/`; bilingual posts use `post.mdx` and `post.en.mdx` in the same dated folder. Static files go in `public/`, imported assets in `src/assets/`, and visual experiments in `demos/`.

## Build, Test, and Development Commands

- `bun install` installs the locked dependencies from `bun.lock`.
- `bun dev` starts the local Astro development server.
- `bun test` runs the Bun test suite under `src/`.
- `bun run check` runs Astro Pure checks and Astro type/content validation.
- `bun run lint` applies ESLint fixes to source files.
- `bun run format` formats JavaScript, TypeScript, Markdown, MDX, and Astro files.
- `bun run build:checked` validates the project and creates a production build.
- `bun preview` serves the production build locally for final review.

## Coding Style & Naming Conventions

Use TypeScript for application logic and Astro for page-oriented UI. Prettier enforces two-space indentation, single quotes, no semicolons, a 100-character print width, and sorted imports. Use `PascalCase` for components, `camelCase` for functions and variables, and lowercase kebab-case for IDs and route slugs. Keep page-specific code near its route; move reusable behavior into `src/lib/` or a focused component.

## Testing Guidelines

Tests use Bun's `bun:test` API. Name files `*.test.ts` and place them beside the code they cover, as in `src/lib/agent-teams/board.test.ts`. Test parsing, validation, state transitions, and regressions. There is no fixed coverage threshold; new behavior should cover meaningful happy paths and edge cases. Run `bun test` and `bun run check` before opening a pull request.

## Commit & Pull Request Guidelines

All new commits must follow Conventional Commits: `type(optional-scope): imperative summary`. Prefer `feat`, `fix`, `docs`, `refactor`, `test`, `style`, `perf`, `build`, `ci`, and `chore`; for example, `fix(i18n): route unknown English pages to 404`. Keep each commit focused and mark breaking changes with `!` or a `BREAKING CHANGE:` footer.

Pull requests should explain the problem and solution, link relevant issues, list validation commands, and include screenshots or recordings for visible UI changes. Note content, configuration, analytics, or deployment implications explicitly. Keep unrelated refactors out of the same PR.

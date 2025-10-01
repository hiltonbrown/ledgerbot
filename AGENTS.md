# Repository Guidelines

## Project Structure & Module Organization
- `app/` holds Next.js route groups; `(auth)` manages Clerk flows and `(chat)` renders the workspace UI.
- `components/`, `hooks/`, and `lib/` provide shared UI, custom React hooks, and domain logic (including `lib/db` migrations and AI helpers under `lib/ai`).
- `public/` serves static assets, while `artifacts/` stores generated chat exports and other persisted outputs.
- Playwright fixtures, helper utilities, and e2e specs live under `tests/`; keep new suites alongside existing folders for discoverability.

## Build, Test, and Development Commands
- `pnpm dev` starts the local Next.js server with Turbo mode at `http://localhost:3000`.
- `pnpm build` runs database migrations via `tsx lib/db/migrate` and then compiles the production bundle.
- `pnpm start` launches the compiled app; use after `pnpm build` for smoke checks.
- `pnpm lint` and `pnpm format` invoke Ultracite/Biome for static analysis and auto-fixes; run both before opening a PR.
- Database helpers (`pnpm db:generate`, `pnpm db:migrate`, `pnpm db:studio`) wrap Drizzle Kit; keep schema changes deterministic and checked in.
- `pnpm test` sets `PLAYWRIGHT=True` and executes the Playwright suite in `tests/e2e`.

## Development Guidelines
⚠️ Do not modify node_modules or installed dependencies directly.
All changes should be made via configuration, wrappers, or extension logic. Direct edits to third-party packages will be overwritten during updates and complicate maintenance. This ensures smoother upgrades, better reproducibility, and avoids breaking changes during dependency updates.

## Coding Style & Naming Conventions
- TypeScript + React 19 throughout; prefer async/await and server components where feasible.
- Follow the Ultracite style profile (see `biome.jsonc`): two-space indentation, single quotes avoided, no enforced console bans, and allowances for Tailwind directives.
- Name React components in `PascalCase`, hooks in `useCamelCase`, and utility modules in `kebab-case.ts` or `snake_case` only when mirroring external APIs.
- Re-export shared items via `index.ts` barrels judiciously; honor the existing `@/` path aliases defined in `tsconfig.json`.

## Testing Guidelines
- Co-locate selectors in `tests/pages` and route helpers in `tests/routes` to keep specs declarative.
- Name new specs `*.test.ts`; group related expectations inside `test.describe` blocks for parallel-friendly isolation.
- Prefer Playwright fixtures in `tests/fixtures.ts` over ad-hoc setup, and document any required seed data in the spec header.
- Aim for deterministic tests that survive CI retries; if test data depends on migrations, update `lib/db/migrate.ts` accordingly.

## Commit & Pull Request Guidelines
- Mirror the existing history (`Revise README for Intellisync Chatbot`) with short, imperative subject lines under 72 characters; elaborate in the body when needed.
- Keep changes scoped per commit, reference issue IDs in the body, and avoid merging unrelated formatting churn.
- For PRs, include a concise summary, links to related issues, screenshots or recordings for UI tweaks, and a checklist of `pnpm lint`, `pnpm build`, and `pnpm test` results.
- Highlight any schema or environment changes up front so reviewers can apply migrations and rotate secrets without surprises.

## Environment & Configuration Tips
- Duplicate `.env.example` into `.env.local` for local work; populate Clerk, Postgres, and Vercel tokens before running migrations.
- Use `pnpm db:pull` or `pnpm db:push` when syncing with shared databases, and never commit production secrets or raw exports inside `artifacts/`.

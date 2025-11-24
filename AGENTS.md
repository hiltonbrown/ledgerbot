# Repository Guidelines

## Project Structure & Module Organization
- Next.js app routes live in `app/` (`(auth)`, `(chat)`, `(settings)`, `api/`); shared UI and layouts sit in `components/` (Radix/Tailwind-based) and `hooks/`.
- Core logic and integrations live in `lib/` (agents, AI orchestration, Xero, Redis, Drizzle schema under `lib/db/{schema,queries}` and migrations in `lib/db/migrations/`).
- Configuration and tooling: `drizzle.config.ts`, `playwright.config.ts`, `biome.jsonc`, `next.config.ts`. Prompts and docs are in `prompts/` and `docs/`.

## Build, Test, and Development Commands
```bash
pnpm dev            # Start Next.js with Turbo; requires `.env.local` and a reachable Postgres URL
pnpm build          # Run DB migrations via tsx then build Next.js
pnpm start          # Serve the production build
pnpm lint           # Ultracite (Biome) lint against repo rules
pnpm format         # Ultracite auto-fix/format
pnpm test           # Playwright E2E (uses `tests/**` projects, spins up dev server)
pnpm db:migrate     # Apply Drizzle migrations defined in `lib/db/migrations`
pnpm db:generate    # Generate a new Drizzle migration from schema changes
pnpm db:studio      # Drizzle Studio for inspecting the DB
```

## Coding Style & Naming Conventions
- TypeScript/TSX throughout; favor functional React components and server actions where possible. Kebab-case file names, PascalCase components, camelCase variables/functions.
- Keep UI stateful logic in hooks, data access in `lib/db/queries`, and agent logic in `lib/agents`.
- Formatting is enforced by Ultracite/Biome (2-space indent, single quotes per defaults); avoid disabling rules unless justified.
- Prefer `async/await`, early returns, and narrow types; colocate small helpers near usage or in `lib/utils.ts`.

## Testing Guidelines
- Primary E2E coverage via Playwright; place specs under `tests/e2e/*.test.ts` or `tests/routes/*.test.ts` to match `playwright.config.ts`.
- Use descriptive test names (`should render ledger summary`) and keep fixtures in `tests/fixtures/` if added.
- For domain-level checks, add lightweight `*.test.ts` near the module (e.g., `lib/ai/models.test.ts`) and run via `pnpm test` or `tsx path/to/test`.

## Commit & Pull Request Guidelines
- Follow the existing conventional style: `feat: ...`, `fix: ...`, `chore: ...`, `docs: ...`; keep the subject in imperative voice.
- PRs should describe scope, risks, and how to verify. Link issues or tickets; include screenshots/GIFs for UI changes and note DB or env impacts.
- Run `pnpm lint`, `pnpm format`, relevant tests, and `pnpm db:migrate` (if schema changed) before requesting review. Highlight any follow-ups or known gaps.

## Security & Configuration Tips
- Copy `.env.example` to `.env.local` and fill required keys (`POSTGRES_URL`, Clerk keys, `AI_GATEWAY_API_KEY`; add Xero/Blob/Redis for full features). Do not commit secrets.
- Migrations run automatically during `pnpm build`; ensure your local Postgres is reachable or override with a test database.
- Prefer Vercel AI Gateway keys over direct provider keys; rotate credentials in `.env.local` rather than in code.

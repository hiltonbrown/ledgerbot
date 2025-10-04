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

# Using Gemini CLI for LedgerBot Codebase Analysis

When analyzing your LedgerBot codebase or multiple files that might exceed context limits, use the Gemini CLI with its massive context window. Use `gemini -p` to leverage Google Gemini's large context capacity for your Next.js TypeScript AI application.

## File and Directory Inclusion Syntax for LedgerBot

Use the `@` syntax to include files and directories in your Gemini prompts. The paths should be relative to your LedgerBot project root:

### LedgerBot-Specific Examples:

**Single file analysis:**
```bash
gemini -p "@package.json Explain the dependencies and project configuration for this AI chatbot"

gemini -p "@next.config.ts Analyze the Next.js configuration and any AI-specific settings"

gemini -p "@middleware.ts Review the middleware implementation for authentication and routing"
```

**Multiple configuration files:**
```bash
gemini -p "@package.json @tsconfig.json @next.config.ts Analyze the complete TypeScript and Next.js setup"

gemini -p "@drizzle.config.ts @lib/ Review the database configuration and schema implementation"
```

**Core application directories:**
```bash
gemini -p "@app/ Summarize the Next.js app router structure and API routes"

gemini -p "@components/ Analyze the React component architecture and UI patterns"

gemini -p "@lib/ Review the utility functions, database connections, and AI integrations"

gemini -p "@hooks/ Examine the custom React hooks and state management"
```

**Full project analysis:**
```bash
gemini -p "@./ Give me a complete overview of this AI chatbot project structure"

# Or use --all_files flag:
gemini --all_files -p "Analyze the entire LedgerBot project architecture and AI integrations"
```

## LedgerBot Feature Verification Examples

**Check AI/Chat implementation:**
```bash
gemini -p "@app/ @components/ @lib/ Is the AI chat functionality fully implemented? Show me the chat components and API routes"

gemini -p "@app/api/ @lib/ Are the AI SDK integrations properly configured? List all AI provider connections"
```

**Verify authentication system:**
```bash
gemini -p "@middleware.ts @app/ @lib/ Is NextAuth authentication implemented? Show all auth-related middleware and API routes"

gemini -p "@app/ @components/ Are protected routes and user sessions properly handled throughout the application?"
```

**Database and ORM verification:**
```bash
gemini -p "@lib/db/ @drizzle.config.ts Is the Drizzle ORM setup complete? Show the database schema and migration files"

gemini -p "@lib/ @app/api/ Are database queries properly implemented with error handling?"
```

**UI/UX component analysis:**
```bash
gemini -p "@components/ @app/ Are Radix UI components properly integrated? Show the component library usage"

gemini -p "@components/ @lib/ Is dark mode and theming implemented consistently across the application?"
```

**Development workflow verification:**
```bash
gemini -p "@tests/ @playwright.config.ts Is end-to-end testing properly set up with Playwright?"

gemini -p "@biome.jsonc @package.json Are linting and formatting tools (Biome) configured correctly?"
```

**Security and middleware checks:**
```bash
gemini -p "@middleware.ts @app/api/ Are proper security headers and CORS policies implemented?"

gemini -p "@lib/ @app/ Is input validation and sanitization implemented for user inputs and file uploads?"
```

**Performance and optimization:**
```bash
gemini -p "@app/ @components/ @lib/ Are Next.js performance optimizations (caching, streaming) properly implemented?"

gemini -p "@package.json @next.config.ts Are bundle size optimizations and tree-shaking configured?"
```

## LedgerBot-Specific Use Cases

Use gemini -p when:
- Analyzing the complete AI chatbot architecture across app/, components/, and lib/
- Reviewing Next.js 15 app router implementation and API routes
- Understanding the Drizzle ORM database integration and schema
- Checking Vercel AI SDK and provider configurations
- Verifying TypeScript types and configurations across the project
- Analyzing the React component hierarchy and state management
- Reviewing authentication flows and middleware implementation
- Checking test coverage and Playwright e2e test setup

## Important Notes for LedgerBot

- Paths in @ syntax are relative to your LedgerBot project root directory
- The CLI will include file contents directly in the context for analysis
- Perfect for analyzing the complex Next.js/TypeScript/AI SDK integration
- Gemini's context window can handle your entire codebase including large files like pnpm-lock.yaml
- Ideal for understanding the interaction between AI providers, database, and UI components
- When checking implementations, reference the specific LedgerBot features like chat functionality, file uploads, or usage accounting

# Using MCP Servers for Updated Documentation

When working with external libraries or needing up-to-date documentation, leverage Model Context Protocol (MCP) servers to access current information beyond static docs.

## Context7 MCP Server

Use the Context7 server to retrieve up-to-date documentation and code examples for libraries:

- **resolve-library-id**: Find the correct Context7-compatible library ID for a given package name.
- **get-library-docs**: Fetch documentation, including code snippets and examples, for a resolved library ID.

Example workflow:
1. When implementing a feature requiring a new library, use `resolve-library-id` to get the library ID.
2. Then use `get-library-docs` to obtain the latest documentation with practical examples.

This ensures you have current, accurate information rather than relying on potentially outdated cached docs.

## GitHub MCP Server

For accessing GitHub repositories, issues, pull requests, and code:

- Use GitHub MCP server tools to search repositories, view issues, browse code, or check recent commits.
- Particularly useful for:
  - Staying updated on dependency repositories
  - Researching implementation patterns from open-source projects
  - Checking for recent bug fixes or feature additions

Note: Ensure MCP servers are properly configured and connected in your development environment. If GitHub MCP server is not available, consider setting it up for enhanced documentation access.

# Engineering Practices
⚠️ Preserve integrity of external dependencies.
Do not alter files inside node_modules or any installed packages. Instead, use wrappers, patching tools, or configuration hooks. This practice supports clean upgrades, auditability, and prevents regressions when dependencies are updated.

# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Project-Specific Patterns

- **Custom UUID Generation**: Use `generateUUID()` from `lib/utils.ts` instead of standard UUID libraries (uses bitwise operators, disabled in Biome linter)
- **Reasoning Middleware**: Reasoning models use `extractReasoningMiddleware({ tagName: "think" })` for `<think>` tag extraction
- **Database Migration Execution**: Build command runs `tsx lib/db/migrate` before Next.js compilation (not standard Next.js build)
- **Test Environment Setup**: Tests set `PLAYWRIGHT=True` environment variable automatically via test script
- **Ultracite Linting**: Extends Biome with project-specific rule overrides (excludes `components/ui`, `lib/utils.ts`, `hooks/use-mobile.ts`)
- **Turbo Dev Server**: Development uses `--turbo` flag for Next.js with live agent routing

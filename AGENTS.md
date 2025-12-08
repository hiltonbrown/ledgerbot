# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Build/Lint/Test Commands

- **Development**: `pnpm dev` - Runs Next.js in development mode with Turbo
- **Build**: `pnpm build` - Runs database migrations then builds Next.js app
- **Lint**: `pnpm lint` - Uses Ultracite for code quality checks
- **Format**: `pnpm format` - Uses Ultracite for code formatting
- **Test**: `pnpm test` - Runs Playwright tests (requires PLAYWRIGHT environment variable)
- **Unit Tests**: `pnpm test:unit` - Runs Vitest unit tests

## Code Style Guidelines

- **Biome Configuration**: Uses Ultracite preset with custom overrides in `biome.jsonc`
- **Key Linting Rules**:
  - `noExplicitAny: off` - Allows explicit `any` types
  - `noConsole: off` - Allows console statements for debugging
  - `noMagicNumbers: off` - Allows magic numbers
  - `noNestedTernary: off` - Allows nested ternary operators
- **File Exclusions**: `components/ui`, `lib/utils.ts`, `hooks/use-mobile.ts` are excluded from linting

## Critical Patterns

- **Error Handling**: Uses custom `ChatSDKError` class with structured error codes (`type:surface`)
- **Agent Logging**: Uses `AgentLogger` class for tool execution tracking with PII redaction
- **AI Providers**: Uses custom provider system with test environment detection
- **Database**: Uses Drizzle ORM with PostgreSQL, includes deprecated schema tables
- **Xero Integration**: Comprehensive Xero API integration with connection management

## Architecture

- **Next.js 16** with Turbopack
- **AI SDK** integration with custom providers
- **Drizzle ORM** for database operations
- **Clerk** for authentication
- **Vercel** ecosystem (Analytics, Blob, Functions, OTEL)
- **Multi-agent system** with specialized agents (AP, AR, Q&A, etc.)

## Non-Obvious Discoveries

- **Test Environment Detection**: Uses `isTestEnvironment` constant from `lib/constants.ts`
- **Agent Trace System**: Comprehensive logging for agent tool execution
- **Regulatory Document System**: Structured regulatory document management
- **Xero Connection Management**: Detailed Xero integration with rate limiting

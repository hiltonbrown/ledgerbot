# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Intellisync Chatbot is an AI-powered workspace application built on Next.js 15, featuring chat, document management, and collaborative AI tools. The app uses the Vercel AI SDK with multiple AI providers (Anthropic Claude, OpenAI GPT-5, Google Gemini) and provides both conversational AI and artifact-based content creation.

## Key Technologies

- **Framework**: Next.js 15 with experimental PPR (Partial Prerendering)
- **AI SDK**: Vercel AI SDK with multiple providers (Anthropic Claude, OpenAI GPT-5, Google Gemini) via AI Gateway
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: NextAuth.js 5.0 (beta) with support for both regular and guest users
- **Storage**: Vercel Blob for file uploads
- **Caching**: Redis for resumable streams (optional)
- **Linting/Formatting**: Ultracite (Biome-based)
- **Testing**: Playwright
- **Monitoring**: TokenLens for token usage tracking

## Setup & Maintenance Notes
⚠️ Avoid editing node_modules or dependency source files.
Any required changes should be handled through configuration overrides or adapter layers. Direct modification of installed packages will be lost on update and may introduce hard-to-trace bugs. Keeping dependencies untouched ensures long-term maintainability and compatibility.

## Development Commands

```bash
# Development
pnpm dev                 # Start dev server with Turbo

# Building & Production
pnpm build              # Run migrations and build for production
pnpm start              # Start production server

# Code Quality
pnpm lint               # Run Ultracite linter/checker
pnpm format             # Auto-fix with Ultracite

# Database
pnpm db:generate        # Generate Drizzle migrations
pnpm db:migrate         # Run migrations
pnpm db:studio          # Launch Drizzle Studio
pnpm db:push            # Push schema to database
pnpm db:pull            # Pull schema from database

# Testing
pnpm test               # Run Playwright tests
```

## Environment Setup

Copy `.env.example` to `.env.local` and configure:
- `AUTH_SECRET`: Random secret for NextAuth (use `openssl rand -base64 32`)
- `POSTGRES_URL`: PostgreSQL connection string
- `BLOB_READ_WRITE_TOKEN`: Vercel Blob storage token
- `AI_GATEWAY_API_KEY`: Required for non-Vercel deployments (OIDC used on Vercel)
- `AI_GATEWAY_URL`: Optional, override when using a custom Gateway domain
- `REDIS_URL`: Optional, enables resumable streams

## Architecture

### Route Structure

- `app/(auth)/`: Authentication routes (login, register) and NextAuth configuration
  - `api/auth/guest/route.ts`: Guest user creation endpoint
- `app/(chat)/`: Main chat interface and API routes
  - `api/chat/route.ts`: Primary chat endpoint with streaming
  - `api/chat/[id]/stream/route.ts`: Stream resumption endpoint
  - `api/document/route.ts`: Document CRUD operations
  - `api/files/upload/route.ts`: File upload handler
  - `api/history/route.ts`: Chat history retrieval
  - `api/suggestions/route.ts`: Document suggestion system
  - `api/vote/route.ts`: Message voting
- `app/(settings)/`: User settings and management
  - `settings/user/`: User profile settings
  - `settings/usage/`: Usage tracking and analytics
  - `settings/integrations/`: Third-party integrations
  - `settings/files/`: File management interface

### Core AI Implementation

**AI Provider Configuration** (`lib/ai/providers.ts`):
- Uses `@ai-sdk/gateway` to route requests through Vercel AI Gateway
- Test environment uses mock models from `models.mock.ts`
- Available chat models (defined in `lib/ai/models.ts`):
  - `anthropic-claude-sonnet-4-5`: Claude Sonnet 4.5 (default, balanced general-purpose)
  - `openai-gpt-5`: GPT-5 (flagship OpenAI model)
  - `openai-gpt-5-mini`: GPT-5 Mini (fast, cost-efficient)
  - `google-gemini-2-5-flash`: Gemini 2.5 Flash (speed-optimized with reasoning)
- Reasoning models use `extractReasoningMiddleware` with `<think>` tags
- Additional specialized models:
  - `title-model`: For chat title generation
  - `artifact-model`: For document generation

**System Prompts** (`lib/ai/prompts.ts`):
- Reasoning models use regular prompt only
- Non-reasoning models include artifacts system prompt for document creation
- All prompts include geolocation hints from Vercel Functions (latitude, longitude, city, country)
- Additional prompts: `codePrompt` (Python code generation), `sheetPrompt` (spreadsheet creation), `updateDocumentPrompt` (document improvement)

**AI Tools** (`lib/ai/tools/`):
- `createDocument`: Creates text, code, image, or sheet artifacts
- `updateDocument`: Updates existing documents
- `getWeather`: Fetches weather data based on location
- `requestSuggestions`: Generates document improvement suggestions

### Artifact System

Artifacts are special UI components that render AI-generated content in a side panel:
- **Types**: text, code, image, sheet
- **Location**: `artifacts/` directory contains server/client components
- **Behavior**: Real-time updates visible to user during AI generation
- **Important**: Never update documents immediately after creation - wait for user feedback

### Database Schema

**Core Tables** (`lib/db/schema.ts`):
- `User`: User accounts with email/password
- `Chat`: Conversations with visibility settings (public/private) and usage tracking
- `Message_v2`: Multi-part messages (new format) with attachments
- `Document`: Artifacts (text, code, image, sheet) linked to users
- `Suggestion`: Document edit suggestions with resolution tracking
- `Vote_v2`: Message voting system
- `Stream`: Stream ID tracking for resumable streams

**Migration Strategy**:
- Old message/vote tables are deprecated but retained
- Migration guide at chat-sdk.dev/docs/migration-guides/message-parts

### Authentication

**User Types**:
- `regular`: Standard authenticated users
- `guest`: Temporary users created on demand (no password required)

**Rate Limiting**:
- Entitlements defined in `lib/ai/entitlements.ts`
- Enforced per user type (messages per day limit)

### Message Streaming

Chat API (`app/(chat)/api/chat/route.ts`):
1. Validates request schema, checks authentication and rate limits
2. Creates/validates chat ownership
3. Loads message history and converts to UI format
4. Streams AI response with tools enabled (except for reasoning models)
5. Saves messages to database on completion
6. Tracks token usage via TokenLens integration with cached model catalog
7. Optional resumable streams via Redis (available when REDIS_URL is configured)

**Stream Configuration**:
- Max duration: 60 seconds
- Smooth streaming with word-level chunking
- Step limit: 5 turns
- Reasoning extraction displayed to user when using reasoning models
- UI message stream with `createUIMessageStream` for real-time updates

## Code Standards (Ultracite)

This project uses Ultracite, which enforces strict Biome-based rules. Key principles from `.cursor/rules/ultracite.mdc`:

- **TypeScript**: No enums, no namespaces, no non-null assertions (!), use `export type` and `import type`
- **React/Next.js**: Hooks must be at top level, no array index keys, use fragments `<>`, no `<img>` or `<head>` in Next.js
- **Accessibility**: Proper ARIA attributes, semantic HTML, keyboard navigation support
- **Code Quality**: No `any` type, no console (except errors), use `const` by default, no unused variables
- **Async**: No await in loops, handle promises properly
- **Modern JS**: Use optional chaining, `for-of` over forEach, arrow functions, `??` operator

Run `pnpm lint` before committing. Most issues auto-fix with `pnpm format`.

## Testing

Playwright tests in `tests/`:
- `e2e/`: End-to-end tests for chat, artifacts, reasoning, sessions
- `routes/`: API route tests (chat, document)
- `pages/`: Page object models for test organization (auth, chat, artifact)
- `prompts/`: Test prompts and utilities
- `helpers.ts`: Test utilities
- `fixtures.ts`: Shared test fixtures

Environment variable `PLAYWRIGHT=True` is set automatically by test script.

**Test Configuration**:
- Run with `pnpm test`
- Test timeout: 240 seconds
- 8 workers (local), 2 workers (CI)
- HTML reporter for results
- Trace retention on failure for debugging

## Common Workflows

### Adding a New AI Tool

1. Create tool definition in `lib/ai/tools/your-tool.ts`
2. Import and add to tools object in `app/(chat)/api/chat/route.ts`
3. Add tool name to `experimental_activeTools` array (if needed)
4. Update system prompt in `lib/ai/prompts.ts` if tool requires context

### Adding a New Artifact Type

1. Define schema in `lib/db/schema.ts` (if DB changes needed)
2. Create server component in `artifacts/your-type/server.ts`
3. Create client component in `artifacts/your-type/client.tsx`
4. Update `ArtifactKind` type in `components/artifact.tsx`
5. Add rendering logic to artifact renderer

### Database Schema Changes

1. Modify schema in `lib/db/schema.ts`
2. Run `pnpm db:generate` to create migration
3. Review migration in `lib/db/migrations/`
4. Run `pnpm db:migrate` to apply locally
5. Build handles migrations in production (`tsx lib/db/migrate && next build`)

### Adding a New AI Model

1. Add model configuration to `chatModels` array in `lib/ai/models.ts`
2. Include `id`, `name`, `description`, `vercelId`, and optional `isReasoning` flag
3. Ensure model is available through AI Gateway
4. Update entitlements in `lib/ai/entitlements.ts` if model access is restricted
5. Test with mock models in test environment

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

This customized guide leverages your project's specific structure with directories like `app/`, `components/`, `lib/`, `hooks/`, and key configuration files to help you efficiently analyze your AI chatbot implementation using Gemini CLI.

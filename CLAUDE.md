# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Intellisync Chatbot is an AI-powered workspace application built on Next.js 15, featuring chat, document management, and collaborative AI tools. The app uses the Vercel AI SDK with xAI's Grok models and provides both conversational AI and artifact-based content creation.

## Key Technologies

- **Framework**: Next.js 15 (canary) with experimental PPR (Partial Prerendering)
- **AI SDK**: Vercel AI SDK with xAI Grok models via AI Gateway
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: NextAuth.js 5.0 (beta)
- **Storage**: Vercel Blob for file uploads
- **Caching**: Redis for resumable streams
- **Linting/Formatting**: Ultracite (Biome-based)
- **Testing**: Playwright

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
- `app/(chat)/`: Main chat interface and API routes
  - `api/chat/route.ts`: Primary chat endpoint with streaming
  - `api/document/route.ts`: Document CRUD operations
  - `api/files/upload/route.ts`: File upload handler
  - `api/history/route.ts`: Chat history retrieval
  - `api/suggestions/route.ts`: Document suggestion system
  - `api/vote/route.ts`: Message voting

### Core AI Implementation

**AI Provider Configuration** (`lib/ai/providers.ts`):
- Uses `@ai-sdk/gateway` to route requests through Vercel AI Gateway
- Test environment uses mock models from `models.mock.ts`
- Production models:
  - `chat-model`: xai/grok-2-vision-1212 (multimodal with vision)
  - `chat-model-reasoning`: xai/grok-3-mini with reasoning extraction
  - `title-model`: xai/grok-2-1212 (for chat title generation)
  - `artifact-model`: xai/grok-2-1212 (for document generation)

**System Prompts** (`lib/ai/prompts.ts`):
- Reasoning model uses regular prompt only
- Vision model includes artifacts system prompt for document creation
- Prompts include geolocation hints from Vercel Functions

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
1. Validates request, checks authentication and rate limits
2. Creates/validates chat ownership
3. Loads message history and converts to UI format
4. Streams AI response with tools enabled (except for reasoning model)
5. Saves messages to database on completion
6. Tracks token usage via TokenLens integration
7. Optional resumable streams via Redis (currently commented out)

**Stream Configuration**:
- Max duration: 60 seconds
- Smooth streaming with word-level chunking
- Step limit: 5 turns
- Reasoning displayed to user when enabled

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
- `routes/`: API route tests
- `pages/`: Page object models for test organization
- `helpers.ts`: Test utilities

Environment variable `PLAYWRIGHT=True` is set automatically by test script.

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

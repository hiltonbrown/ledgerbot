# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LedgerBot is an AI-powered accounting workspace built for Australian businesses using Next.js 15, React 19, TypeScript, and the Vercel AI SDK. It provides specialized AI agents for accounting workflows with native Xero integration and multi-model AI support (Claude, GPT-5, Gemini, Grok).

## Development Commands

```bash
# Development
pnpm dev                 # Start dev server with Turbo
pnpm build              # Run migrations and production build
pnpm start              # Start production server

# Code Quality
pnpm lint               # Run Ultracite linter (Biome-based)
pnpm format             # Auto-fix with Ultracite

# Database
pnpm db:generate        # Generate Drizzle migrations from schema changes
pnpm db:migrate         # Run pending migrations
pnpm db:studio          # Launch Drizzle Studio (DB GUI)
pnpm db:push            # Push schema changes directly
pnpm db:pull            # Pull schema from database

# Testing
pnpm test               # Run Playwright E2E tests (sets PLAYWRIGHT=True)
```

## Architecture

### Directory Structure

```
app/
├── (auth)/              # Clerk authentication routes
├── (chat)/              # Main chat interface with streaming API
│   └── api/chat/        # Core chat endpoint (route.ts)
├── (settings)/          # User settings (personalisation, usage, integrations)
├── agents/              # 8 specialized agent workspaces (analytics, ar, ap, etc.)
└── api/                 # API routes (xero, context-files, regulatory, user)

lib/
├── ai/                  # AI configuration and tools
│   ├── providers.ts     # AI Gateway config (multi-provider)
│   ├── models.ts        # Available chat models
│   ├── prompts.ts       # System prompt management
│   ├── context-manager.ts  # Context file selection logic
│   ├── xero-mcp-client.ts  # Xero MCP integration
│   └── tools/           # AI tool implementations (create-document, xero-tools, etc.)
├── agents/              # Agent business logic (docmanagement, ar, ap, etc.)
├── db/                  # Database schema, queries, migrations
├── xero/                # Xero OAuth, encryption, error handling
├── files/               # File processing utilities
└── clerk/               # Clerk authentication helpers

components/
├── agents/              # Agent-specific UI components
├── ui/                  # Reusable UI components (Radix-based)
└── [chat components]    # chat.tsx, artifact.tsx, multimodal-input.tsx, etc.

artifacts/               # Artifact renderers (text, code, sheet, image)
prompts/                 # System prompt templates
```

### Key Architecture Patterns

1. **Server-First with RSC**: Next.js 15 App Router with React Server Components for initial loads, Client Components for interactivity
2. **Streaming AI Responses**: `app/(chat)/api/chat/route.ts` handles streaming responses with tool execution
3. **Multi-Model Support**: AI Gateway (`lib/ai/providers.ts`) routes requests to different AI providers
4. **Database Schema**: PostgreSQL with Drizzle ORM (`lib/db/schema.ts`)
   - `User`, `Chat`, `Message_v2` (new format), `Message` (deprecated), `Document`, `ContextFile`, `XeroConnection`, etc.
   - Foreign keys with cascade deletes for user data cleanup
5. **Authentication Flow**: Clerk → webhook → user sync in database
6. **Artifact System**: AI-generated content (documents, code, spreadsheets, images) displayed in side panel with real-time updates, state scoped by chat ID
7. **Xero Integration**: OAuth2 with encrypted token storage (AES-256-GCM), MCP client for tool execution

## Database

### Schema Changes

1. Modify `lib/db/schema.ts`
2. Generate migration: `pnpm db:generate`
3. Review migration in `lib/db/migrations/`
4. Apply locally: `pnpm db:migrate`
5. Production migrations run automatically during build (`build` script runs `tsx lib/db/migrate`)

### Key Tables

- `User`: User accounts (synced from Clerk via `clerkId`)
- `Chat`: Chat sessions with title, visibility, and last context
- `Message_v2`: Chat messages with parts, attachments, confidence, citations (for Q&A agent)
- `Document`: AI-generated artifacts (text, code, sheet, image)
- `ContextFile`: User-uploaded files for AI context
- `XeroConnection`: Encrypted Xero OAuth tokens per user
- `Vote_v2`: Message upvotes/downvotes

## AI Integration

### Adding a New AI Tool

1. Create tool definition in `lib/ai/tools/your-tool.ts`:
   ```typescript
   import { tool } from 'ai';
   import { z } from 'zod';

   export const yourTool = tool({
     description: 'Describe what this tool does',
     parameters: z.object({
       param1: z.string().describe('Parameter description'),
     }),
     execute: async ({ param1 }) => {
       // Tool implementation
       return { result: 'success' };
     },
   });
   ```

2. Export in `lib/ai/tools/index.ts`
3. Import and add to `tools` object in `app/(chat)/api/chat/route.ts`
4. Add to `experimental_activeTools` array if needed (for proactive tool calling)

### System Prompts

- Default system prompt: `prompts/default-system-prompt.md`
- Supports variable interpolation: `{{FIRST_NAME}}`, `{{COMPANY_NAME}}`, `{{BASE_CURRENCY}}`, etc.
- Template engine: `lib/ai/template-engine.ts`
- Users can customize in settings → personalisation

## Xero Integration

### Key Files

- `lib/xero/connection-manager.ts`: OAuth flow, token management
- `lib/xero/encryption.ts`: AES-256-GCM encryption for tokens
- `lib/xero/error-handler.ts`: Xero API error handling
- `lib/xero/rate-limit-handler.ts`: Rate limit management
- `lib/xero/tenant-context.ts`: Multi-tenant context management
- `lib/ai/xero-mcp-client.ts`: MCP client for AI tool execution
- `lib/ai/tools/xero-tools.ts`: AI SDK tool wrappers for Xero operations

### OAuth Flow

1. User clicks "Connect Xero" in `/settings/integrations`
2. Redirects to `/api/xero/auth/initiate` → Xero authorization
3. Xero redirects to `/api/xero/callback` with code
4. Tokens encrypted and stored in `XeroConnection` table
5. Tokens automatically refreshed when expiring within 5 minutes

### Available Xero Tools

- `xero_list_invoices`, `xero_get_invoice`
- `xero_list_contacts`, `xero_get_contact`
- `xero_list_accounts`, `xero_list_journal_entries`
- `xero_get_bank_transactions`, `xero_get_organisation`

## Specialized Agents

Located in `app/agents/` (UI) and `lib/agents/` (business logic):

1. **Document Processing** (`/agents/docmanagement`): OCR, invoice validation, auto-categorization
2. **Analytics** (`/agents/analytics`): KPI narratives, drill-down tables, exports
3. **Accounts Payable** (`/agents/ap`): Bill management, supplier payments
4. **Accounts Receivable** (`/agents/ar`): Invoice dunning, late payment risk, email generation (COMMS_ENABLED=false by default)
5. **Forecasting** (`/agents/forecasting`): Scenario modeling, cash flow projections
6. **Q&A** (`/agents/qanda`): Regulatory questions with citations and confidence scores
7. **Workflow Supervisor** (`/agents/workflow`): Multi-agent orchestration

### Adding a New Agent

1. Create directory: `app/agents/your-agent/page.tsx`
2. Add business logic: `lib/agents/your-agent/` (if needed)
3. Add entry to `app/agents/page.tsx` (`agentSnapshots` array)
4. Create settings section in `app/(settings)/settings/agents/page.tsx`
5. Add API route: `app/api/agents/your-agent/route.ts` (if streaming is needed)

## Code Standards (Ultracite/Biome)

Configuration: `biome.jsonc` (extends "ultracite")

### DO:
- Use `const` by default
- Use `export type` and `import type` for types
- Use arrow functions
- Handle async/await properly (no `await` in loops)
- Use optional chaining (`?.`) and nullish coalescing (`??`)

### DON'T:
- Use `any` type (use `unknown` instead)
- Use enums (use const objects or union types)
- Use non-null assertions (`!`) unless necessary
- Use array index as React keys
- Use `<img>` or `<head>` in Next.js (use `next/image`, `next/head`)

### Exceptions Configured:
- `noExplicitAny`: off (needs cleanup)
- `noConsole`: off (debugging allowed)
- `noMagicNumbers`: off
- `noNestedTernary`: off (needs cleanup)

Run `pnpm lint` before committing. Most issues auto-fix with `pnpm format`.

## Testing

- Framework: Playwright
- Run: `pnpm test` (automatically sets `PLAYWRIGHT=True`)
- Enables mock AI providers and test database when `PLAYWRIGHT=True`
- Tests located in `tests/` directory

## Context File Management

- Upload: `app/api/context-files/upload/route.ts`
- Processing: `lib/files/` (PDF, DOCX, XLSX extraction)
- Storage: Vercel Blob (10MB max per file)
- Selection: `lib/ai/context-manager.ts` selects relevant files for each chat
- Pinning: Users can pin important files (chart of accounts, policies)

## Environment Variables

Required:
- `POSTGRES_URL`: PostgreSQL connection string
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`: Clerk auth
- `AI_GATEWAY_API_KEY`: Vercel AI Gateway (auto-configured on Vercel)

Optional:
- `XERO_CLIENT_ID`, `XERO_CLIENT_SECRET`, `XERO_ENCRYPTION_KEY`: Xero integration
- `BLOB_READ_WRITE_TOKEN`: Vercel Blob storage
- `REDIS_URL`: Resumable chat streams (optional in dev)
- `FIRECRAWL_API_KEY`: Web scraping for regulatory sources
- `COMMS_ENABLED`: AR agent communications (must be 'false')
- `AR_DEFAULT_TONE`: AR reminder tone (polite, firm, final)

See `.env.example` for complete list.

## Australian Compliance Features

- **GST-Aware**: Automatic GST calculations and validation
- **BAS Lodgment**: Automated reminders and preparation assistance
- **Fair Work Awards**: Minimum wage calculations
- **ATO Terminology**: Uses Australian accounting standards (e.g., "creditor" not "accounts payable")
- **Currency**: Base currency from Xero organisation (defaults to AUD)
- **Date Format**: DD/MM/YYYY (Australian standard)

## Deployment

- **Preferred Platform**: Vercel (optimized for Next.js 15)
- **Build Process**: `pnpm build` runs migrations then builds
- **Database Migrations**: Automatically run during build via `tsx lib/db/migrate`
- **Edge Runtime**: Configured for Vercel Edge where applicable

## Common Patterns

### Streaming AI Responses

```typescript
// In route.ts
import { streamText } from 'ai';

const result = streamText({
  model: getModel(modelId),
  system: systemPrompt,
  messages: convertedMessages,
  tools: { ...tools },
  onFinish: async (event) => {
    // Save to database
  },
});

return result.toDataStreamResponse();
```

### Database Queries

```typescript
// Use Drizzle ORM with type safety
import { db } from '@/lib/db/db';
import { chat, message } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const chats = await db
  .select()
  .from(chat)
  .where(eq(chat.userId, userId));
```

### Authentication

```typescript
// In Server Components or Server Actions
import { auth } from '@clerk/nextjs/server';

const { userId } = await auth();
if (!userId) throw new Error('Unauthorized');
```

### Xero API Calls

```typescript
// Use connection manager for authenticated requests
import { XeroConnectionManager } from '@/lib/xero/connection-manager';

const xero = new XeroConnectionManager(userId);
const invoices = await xero.accounting.invoices.get({
  where: 'Status=="UNPAID"'
});
```

## Important Notes

- **Message Format Migration**: `Message` table is deprecated, use `Message_v2` for new code
- **Vote Format Migration**: `Vote` table is deprecated, use `Vote_v2` for new code
- **Artifact State**: Scoped by chat ID via `useArtifact(chatId)` and `useArtifactSelector(chatId, selector)`
- **PPR Support**: Partial Prerendering enabled via `NEXT_EXPERIMENTAL_PPR=true`
- **Token Encryption**: Xero tokens encrypted with AES-256-GCM, key must be 32 bytes (64 hex chars)
- **AR Communications**: Always disabled (`COMMS_ENABLED=false`), generates copy-ready artifacts only

## Debugging Tips

1. **Xero OAuth Issues**: Check redirect URI exact match, encryption key length (64 hex chars), scopes in Xero app
2. **Database Connection**: Ensure `POSTGRES_URL` is correct and accessible
3. **AI Streaming**: Check browser console for stream errors, verify AI Gateway API key
4. **Build Failures**: Check migration files, ensure `tsx` is installed for build script
5. **Context Files**: Check Blob token and 10MB size limit

## References

- Main README: `README.md` (comprehensive feature documentation)
- Xero Guide: `docs/xero-authentication-guide.md`
- Prompt Maintenance: `prompts/README.md`

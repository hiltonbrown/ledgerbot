# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**LedgerBot** is an AI-powered accounting workspace built specifically for Australian businesses. It automates bookkeeping tasks, ensures GST/BAS compliance, and provides instant answers to tax questions through specialized agents and native Xero integration.

## Development Commands

### Core Commands

```bash
# Development
pnpm dev                    # Start dev server with Turbopack
pnpm build                  # Run migrations + production build
pnpm start                  # Start production server

# Code Quality
pnpm lint                   # Run Ultracite linter/checker (Biome-based)
pnpm format                 # Auto-fix with Ultracite

# Database
pnpm db:generate            # Generate Drizzle migrations from schema changes
pnpm db:migrate             # Run pending migrations
pnpm db:studio              # Launch Drizzle Studio (visual DB GUI)
pnpm db:push                # Push schema changes directly (dev only)
pnpm db:pull                # Pull schema from database

# Testing
pnpm test                   # Run Playwright E2E tests
pnpm test:unit              # Run Vitest unit tests
```

### Running a Single Test

```bash
# Run specific Playwright test file
pnpm exec playwright test tests/example.spec.ts

# Run specific test by name
pnpm exec playwright test -g "should validate ABN"

# Run in headed mode for debugging
pnpm exec playwright test --headed

# Run specific Vitest test
pnpm test:unit lib/utils.test.ts
```

## High-Level Architecture

### Multi-Model AI System

LedgerBot uses **Vercel AI SDK** with **AI Gateway** for multi-provider routing:
- **Claude Sonnet 4.5**: Default balanced reasoning model
- **Claude Haiku 4.5**: Fast lightweight responses
- **GPT-5 / GPT-5 Mini**: OpenAI models for comparison
- **Gemini 2.5 Flash**: Speed-optimized with extended reasoning

The AI provider configuration is centralized in `lib/ai/providers.ts`, and models are defined in `lib/ai/models.ts`. The chat API route (`app/(chat)/api/chat/route.ts`) handles model selection with fallbacks to user preferences or system defaults.

### System Prompt Architecture (Template-Based)

The system prompt follows a **template-based architecture** with variable substitution:

1. **Template File**: `prompts/ledgerbot-system-prompt.md` contains the master template with `{{VARIABLE}}` placeholders
2. **Builder Function**: `lib/ai/prompts.ts:buildLedgerbotSystemPrompt()` renders the template with actual data
3. **Variable Sources**:
   - User settings (`UserSettings.personalisation` table)
   - Xero connection metadata (`XeroConnection` table)
   - Request context (location, timezone)
4. **Sanitization**: `sanitisePromptFragment()` prevents injection attacks and truncates long fields

**Key Template Variables:**
- `{{FIRST_NAME}}`, `{{LAST_NAME}}`, `{{COMPANY_NAME}}` - User/org identity
- `{{TODAY_DATE}}`, `{{TIMEZONE}}` - Temporal context
- `{{BASE_CURRENCY}}`, `{{ORGANISATION_TYPE}}` - Xero org details
- `{{INDUSTRY_CONTEXT}}`, `{{CHART_OF_ACCOUNTS}}` - Business context
- `{{CUSTOM_SYSTEM_INSTRUCTIONS}}` - User-defined instructions
- `{{TONE_AND_GRAMMAR}}` - Communication style presets

**IMPORTANT**: Never modify the old `systemPrompt()` function. Always use `buildLedgerbotSystemPrompt()` for new features.

### AI Tools System

Tools are defined in `lib/ai/tools/` and registered in the chat API route. The tool system has two types:

1. **Core Tools** (always available):
   - `createDocument` / `updateDocument` - Artifact creation (text, code, spreadsheets, images)
   - `requestSuggestions` - Generate document suggestions
   - `getWeather` - Weather data
   - ABN lookup tools (see below)

2. **Conditional Tools** (Xero-connected users only):
   - Dynamically created via `createXeroTools(userId)` in `lib/ai/tools/xero-tools.ts`
   - Tool names tracked in `xeroToolNames` array
   - Injected into `experimental_activeTools` when Xero connection exists

**Tool Registration Flow:**
1. Check for active Xero connection: `getActiveXeroConnection(userId)`
2. If exists: Create Xero tools with `createXeroTools(userId)`
3. Merge tool names: `[...defaultSelectedTools, ...xeroToolNames]`
4. Pass to `streamText()` with both `tools` object and `experimental_activeTools` array

### ABN Lookup Subsystem (NEW)

The Australian Business Register (ABR) integration provides ABN/ACN validation and entity lookups via a robust `AbrService`.

**Core Components:**
- `lib/abr/service.ts` - High-level business logic and caching
- `lib/abr/client.ts` - Low-level HTTP client for ABR JSONP API
- `lib/abr/utils.ts` - Validation and normalization utilities
- `lib/abr/config.ts` - Environment-based configuration
- `types/abr.ts` - Domain types

**AI Tools (always enabled):**
- `abn_search_entity` - Search by business name
- `abn_get_details` - Get full details by ABN/ACN
- `abn_validate_xero_contact` - Validate Xero contact ABN
- `abn_verify_xero_invoice` - Verify invoice customer ABN

**Environment Variables Required:**
```bash
ABR_ENABLED=true
ABR_GUID=your_guid_from_abr_website
# ABN_LOOKUP_BASE_URL=https://abr.business.gov.au/json  # Optional override
```

**JSONP Response Handling:**
The ABR API returns JSONP (not pure JSON). The `AbrClient` handles unwrapping automatically.

### Xero Integration

**OAuth2 Flow:**
- Authorization Code Flow with client secret (server-side)
- Tokens stored encrypted (AES-256-GCM) in `XeroConnection` table
- Automatic refresh when expiring within 5 minutes
- CSRF protection with Base64-encoded state parameter

**Key Files:**
- `lib/xero/oauth.ts` - OAuth flow implementation
- `lib/xero/encryption.ts` - Token encryption/decryption
- `app/api/xero/auth/route.ts` - Initiate OAuth
- `app/api/xero/callback/route.ts` - Handle OAuth callback
- `lib/ai/tools/xero-tools.ts` - AI tool wrappers

**Chart of Accounts Caching:**
The Xero chart of accounts is synced and cached in the `XeroConnection.chartOfAccounts` JSONB field. This reduces API calls and provides fast access to account structures. Cache invalidation uses SHA-256 hash comparison.

**Rate Limiting:**
Xero enforces per-minute and per-day rate limits. The system tracks these in `XeroConnection` table fields:
- `rateLimitMinuteRemaining` / `rateLimitDayRemaining` - Current limits
- `rateLimitResetAt` - When limits reset
- `rateLimitProblem` - Which limit was hit ("minute" or "day")

### Database Architecture

**Drizzle ORM** with PostgreSQL:
- Schema: `lib/db/schema.ts` (main) + `lib/db/schema/ap.ts` (accounts payable) + `lib/db/schema/ar.ts` (accounts receivable)
- Queries: `lib/db/queries.ts` - Reusable query functions
- Migrations: Auto-generated in `lib/db/migrations/`, applied in `lib/build/migrate.ts` during build

**Key Tables:**
- `User` - Clerk-synced user records
- `Chat` / `Message_v2` - Conversation storage with parts-based messages
- `Document` - Artifacts (text, code, sheets, images)
- `ContextFile` - User-uploaded files for context
- `UserSettings` - Personalization preferences
- `XeroConnection` - Encrypted OAuth tokens + org metadata
- `RegulatoryDocument` - Scraped ATO/Fair Work content (future)

**Migration Workflow:**
1. Edit schema in `lib/db/schema.ts`
2. Run `pnpm db:generate` to create migration SQL
3. Review generated SQL in `lib/db/migrations/`
4. Run `pnpm db:migrate` to apply locally
5. Migrations run automatically during `pnpm build` for production

### Resumable Streams (Redis-Backed)

**Optional Redis Support:**
- If `REDIS_URL` environment variable is set, resumable streams are enabled
- If Redis is unavailable, system gracefully falls back to direct streaming
- Implementation: `lib/redis/config.ts` + `resumable-stream` package
- Stream context initialized lazily in `app/(chat)/api/chat/route.ts`

**Benefits:**
- Clients can reconnect and resume interrupted AI responses
- Reduces wasted token usage on network failures
- TTL-based cleanup (configurable via `streamBufferTtlSeconds`)

### Agent Architecture

LedgerBot has **7 specialized agents** with dedicated workspaces:

1. **Document Processing** (`app/agents/docmanagement/`) - Invoice/receipt intake
2. **Reconciliations** (`app/agents/reconciliations/`) - Bank feed matching
3. **Compliance Assistant** (`app/agents/compliance/`) - ATO obligations
4. **Analytics** (`app/agents/analytics/`) - Financial reporting
5. **Forecasting** (`app/agents/forecasting/`) - Cash flow modeling
6. **Regulatory Q&A** (`app/agents/qanda/`) - Tax & employment law
7. **Workflow Supervisor** (`app/agents/workflow/`) - Multi-agent orchestration

**Agent Structure:**
- Each has a `page.tsx` (UI) in `app/agents/[agent-name]/`
- Agent-specific components in `components/agents/[agent-name]/`
- Settings UI in `app/(settings)/settings/agents/page.tsx`
- Database schema extensions for agent-specific data (e.g., `QaReviewRequest`, `AgentTrace`)

**Accounts Receivable (AR) Agent:**
The AR agent is the most developed, featuring:
- Customer account statements
- Overdue invoice tracking
- Payment reminders and correspondence
- Risk scoring algorithm (see `docs/risk-algorithm.md`)
- Bulk action workflows

### Code Quality Standards

**Ultracite (Biome-based) Linting:**
The project enforces strict TypeScript and React best practices via `.cursor/rules/ultracite.mdc`. Key rules:

- **Accessibility**: ARIA attributes, semantic HTML, keyboard navigation
- **TypeScript**: No `any`, no enums, no namespaces, prefer `type` imports
- **React**: Hook dependencies, no index keys, no nested components
- **Code Quality**: No console.log, no unused vars, no var keyword
- **Async**: No await in loops, proper Promise handling
- **Next.js**: Use `<Image>` not `<img>`, use `<Link>` not `<a>` for routing

**IMPORTANT**: Run `pnpm lint` before committing. CI will fail on linting errors.

### Authentication

**Clerk Integration:**
- User auth handled by Clerk (`@clerk/nextjs`)
- User records synced to database on first login via webhook
- Helper: `lib/auth/clerk-helpers.ts:getAuthUser()`
- User metadata stored in `User` table with `clerkId` reference

**Authorization Patterns:**
```typescript
// Route protection
const user = await getAuthUser();
if (!user) {
  return new ChatSDKError("unauthorized:chat").toResponse();
}

// Resource ownership check
const chat = await getChatById({ id });
if (chat?.userId !== user.id) {
  return new ChatSDKError("forbidden:chat").toResponse();
}
```

### File Upload and Context System

**Context Files:**
Users can upload PDFs, DOCX, XLSX, images to provide business context to AI.

**Upload Flow:**
1. Client sends file to `app/(chat)/api/files/upload/route.ts`
2. Server uploads to Vercel Blob (`@vercel/blob`)
3. Extracts text via file-specific parsers (PDF.js, xlsx, etc.)
4. Counts tokens using `tiktoken` library
5. Saves metadata to `ContextFile` table
6. AI context manager (`lib/ai/context-manager.ts`) selects relevant files per chat

**Token Management:**
- Max 10MB per file
- Per-user storage quotas enforced via entitlements
- Token counts tracked for context window management
- Pinned files always included in context

### Error Handling

**ChatSDKError System:**
Centralized error handling via `lib/errors.ts`:

```typescript
// Usage in route handlers
return new ChatSDKError("unauthorized:chat").toResponse();
return new ChatSDKError("rate_limit:chat").toResponse();
return new ChatSDKError("bad_request:api").toResponse();
```

**Error Categories:**
- `unauthorized` - Authentication failure
- `forbidden` - Authorization failure (user lacks permission)
- `rate_limit` - User exceeded message limits
- `bad_request` - Invalid request data
- `offline` - Network/server errors

**User-Facing Errors:**
- Return descriptive error messages in API responses
- Log technical details server-side with correlation IDs
- Include `x-vercel-id` header in logs for Vercel support

### Testing

**Playwright E2E Tests:**
- Located in `tests/` directory
- Run with `pnpm test` or `pnpm exec playwright test`
- Set `PLAYWRIGHT=True` environment variable when running
- Test database isolation via separate test users

**Vitest Unit Tests:**
- Located alongside source files (e.g., `lib/abr/validate.test.ts`)
- Run with `pnpm test:unit`
- Mock external APIs and services

**Test Coverage Priority:**
1. Critical user flows (login, chat, file upload, Xero connect)
2. AI tool execution (ABN lookup, Xero queries)
3. Financial calculations (GST, BAS, account balances)
4. Data validation (ABN/ACN, currency, dates)
5. Authorization boundaries (cross-user access prevention)

## Important Gotchas

### 1. Message Parts vs Content

**DEPRECATED**: The old `Message` table uses `content` field (JSON array). **DO NOT USE**.

**CURRENT**: `Message_v2` table uses `parts` field with structured part types:
- `text` - Plain text
- `file` - File attachments with extracted text
- `image` - Images (URLs or data URIs)
- `tool-call` - AI tool invocations
- `tool-result` - Tool execution results

When building new features, always use `Message_v2` and handle parts correctly.

### 2. Xero Tool Dynamic Loading

Xero tools are **dynamically created** per-request, not statically exported. This is because:
- Tools need `userId` for connection lookup
- Connection status can change between requests
- Prevents leaked connections between users

**WRONG:**
```typescript
// ❌ Don't import and use directly
import { xero_list_invoices } from '@/lib/ai/tools/xero-tools';
```

**CORRECT:**
```typescript
// ✅ Create tools dynamically
const xeroConnection = await getActiveXeroConnection(user.id);
const xeroTools = xeroConnection ? createXeroTools(user.id) : {};
// Register tools in streamText()
```

### 3. ABN Lookup JSONP Response Format

The ABR API returns **JSONP**, not pure JSON. Always use the `AbnLookupClient` class which handles unwrapping automatically. If parsing responses manually, strip the callback wrapper first:

```typescript
// Response might be: callback({"Abn":"12345678901",...})
// Or: ({"Abn":"12345678901",...})
// The client strips both formats to pure JSON
```

### 4. Database Schema Naming

The project uses **v2 tables** for newer architecture:
- `Message` → `Message_v2`
- `Vote` → `Vote_v2`

Always use v2 tables in new code. The v1 tables are deprecated but retained for backward compatibility during migration.

### 5. Environment Variables for AI Gateway

**CRITICAL**: Vercel AI Gateway requires a **valid credit card** on the Vercel account. If you see errors about "AI Gateway requires a valid credit card", this is not a code issue—the Vercel account needs payment setup.

### 6. System Prompt Variable Escaping

When adding user-provided content to system prompts, **always sanitize**:
- Strip template characters (`{{`, `}}`, `<`, `>`)
- Check for injection patterns ("ignore previous instructions", etc.)
- Truncate to reasonable length (400-1000 chars depending on field)
- Use `sanitisePromptFragment()` helper in `lib/ai/prompts.ts`

### 7. Next.js 16 and React 19

This project uses **Next.js 16** (with Turbopack) and **React 19**:
- Server Components are default
- Client Components need `"use client"` directive
- Server Actions for mutations (no explicit API routes needed for many cases)
- Partial Prerendering (PPR) is optional via `NEXT_EXPERIMENTAL_PPR=true`

**Type Imports:**
Always use `import type` for types to enable proper tree-shaking:
```typescript
import type { User } from '@/lib/db/schema';  // ✅
import { User } from '@/lib/db/schema';       // ❌ (unless you need runtime code)
```

## Common Patterns

### Adding a New AI Tool

1. Create tool file in `lib/ai/tools/your-tool.ts`:
```typescript
import { tool } from 'ai';
import { z } from 'zod';

export const yourTool = tool({
  description: 'Clear description for AI',
  parameters: z.object({
    param: z.string().describe('Parameter purpose'),
  }),
  execute: async ({ param }) => {
    // Implementation
    return { success: true, data: result };
  },
});
```

2. Export in `lib/ai/tools/index.ts`:
```typescript
export type ToolId = "yourTool" | ...;
export const defaultSelectedTools: ToolId[] = ["yourTool", ...];
```

3. Register in `app/(chat)/api/chat/route.ts`:
```typescript
import { yourTool } from '@/lib/ai/tools/your-tool';

// Inside streamText() call:
tools: {
  yourTool,
  // ... other tools
}
```

### Adding a Database Table

1. Add table definition to `lib/db/schema.ts`:
```typescript
export const yourTable = pgTable('YourTable', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  data: jsonb('data').$type<YourDataType>(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
});

export type YourTable = InferSelectModel<typeof yourTable>;
```

2. Generate migration:
```bash
pnpm db:generate
```

3. Review migration SQL in `lib/db/migrations/XXXXXX_migration_name.sql`

4. Apply migration:
```bash
pnpm db:migrate
```

### Querying Xero Data

Use the `xero-tools.ts` wrappers in AI tools. For direct API access:

```typescript
import { XeroClient } from '@/lib/xero/api-client';

const client = new XeroClient(userId);
const invoices = await client.accounting.getInvoices({
  where: 'Status=="UNPAID"',
  order: 'DueDate DESC',
});
```

The `XeroClient` automatically handles:
- Connection lookup
- Token refresh if expiring soon
- Rate limit tracking
- Error handling and logging

### Australian Business Validation

Use the ABR utils for ABN/ACN validation:

```typescript
import { validateAbnChecksum, normaliseAbn } from '@/lib/abr/utils';

// Validate ABN
if (!validateAbnChecksum('53 004 085 616')) {
  throw new Error('Invalid ABN');
}

// Normalise to digits only
const digits = normaliseAbn('53 004 085 616');
// digits: '53004085616'
```

ABN validation uses the modulus 89 algorithm (official ATO method).

## Key Files Reference

- **AI Core**: `lib/ai/providers.ts`, `lib/ai/models.ts`, `lib/ai/prompts.ts`
- **Chat API**: `app/(chat)/api/chat/route.ts` (main streaming endpoint)
- **Database Schema**: `lib/db/schema.ts`, `lib/db/schema/ap.ts`, `lib/db/schema/ar.ts`
- **Database Queries**: `lib/db/queries.ts`
- **Xero Integration**: `lib/xero/oauth.ts`, `lib/xero/api-client.ts`, `lib/ai/tools/xero-tools.ts`
- **ABN Lookup**: `lib/abr/abnLookupClient.ts`, `lib/ai/tools/abn-*.ts`
- **Error Handling**: `lib/errors.ts`
- **Auth**: `lib/auth/clerk-helpers.ts`
- **Config**: `next.config.ts`, `.env.example`
- **Linting**: `.cursor/rules/ultracite.mdc`, `biome.jsonc`

## Documentation

Additional documentation in `docs/`:
- `AR_AGENT.md` - Accounts Receivable agent architecture
- `risk-algorithm.md` - Customer risk scoring
- `system-prompt-*.md` - System prompt migration notes
- `ui-component-guidelines.md` - Component design standards

For Xero OAuth setup, see README.md section "Xero Integration".

## Australian Compliance Notes

When building features that handle financial data:

1. **GST Rate**: Always 10% in Australia (hardcoded constant)
2. **Date Format**: DD/MM/YYYY (Australian standard)
3. **Currency**: AUD symbol ($), comma thousands separator
4. **Terminology**: Use "creditor/debtor" not "accounts payable/receivable" in user-facing text
5. **Financial Year**: July 1 - June 30 (not calendar year)
6. **BAS Lodgement**: Quarterly (28 days after quarter end) or monthly (21st of following month)
7. **ABN Format**: 11 digits grouped as XX XXX XXX XXX
8. **ACN Format**: 9 digits grouped as XXX XXX XXX

## Performance Considerations

- **Token Usage**: Use `tokenlens` package for accurate token counting and cost tracking
- **Context Management**: Limit file attachments to avoid exceeding model context windows
- **Xero API**: Cache chart of accounts and entity data; avoid real-time API calls in tight loops
- **Database Indexes**: All foreign keys, date fields, and status fields are indexed
- **Streaming**: Always use streaming for AI responses to improve perceived performance
- **Redis**: Optional but recommended for resumable streams in production

## Deployment Notes

- **Platform**: Vercel (Edge Runtime)
- **Database**: PostgreSQL (Vercel Postgres or external)
- **Blob Storage**: Vercel Blob (file uploads)
- **Build Command**: `pnpm build` (includes migration step)
- **Node Version**: 20.x LTS (defined in `.nvmrc` if present)
- **Environment Variables**: See `.env.example` for complete list

**Production Checklist:**
1. Set all required environment variables (Xero, Clerk, database, blob storage)
2. Enable AI Gateway on Vercel account with valid payment method
3. Configure ABN Lookup GUID if using ABN features
4. Set up Redis for resumable streams (optional)
5. Configure monitoring and error tracking
6. Set `NODE_ENV=production` for production builds

---

**Last Updated**: December 2025
**For Questions**: See project README.md or GitHub issues

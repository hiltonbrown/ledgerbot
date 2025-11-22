# CLAUDE.md

LedgerBot is an AI-powered accounting workspace built on Next.js 16 with Vercel AI SDK, PostgreSQL, Clerk auth, and Xero integration.

## Key Technologies
- **Framework**: Next.js 16 (PPR), Vercel AI SDK (Anthropic Claude, OpenAI GPT-5, Google Gemini, xAI Grok)
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: Clerk | **Storage**: Vercel Blob | **Lint**: Ultracite (Biome) | **Test**: Playwright
- **Monitoring**: TokenLens | **Integration**: MCP SDK

⚠️ Never edit node_modules. Use configuration overrides or adapter layers.

## Commands
`pnpm dev` | `pnpm build` | `pnpm start` | `pnpm lint` | `pnpm format` | `pnpm test`
`pnpm db:generate` | `pnpm db:migrate` | `pnpm db:studio`

## Environment
Required: `CLERK_*`, `POSTGRES_URL`, `BLOB_READ_WRITE_TOKEN`, `AI_GATEWAY_API_KEY`, `FIRECRAWL_API_KEY`, `CRON_SECRET`
Optional: `REDIS_URL`, `AI_GATEWAY_URL`

## Architecture

### Routes
**Chat**: `(chat)/api/chat`, `api/document`, `api/files/upload`, `api/history`, `api/suggestions`, `api/vote`
**Agents**: `agents/{analytics,ap,ar,docmanagement,forecasting,qanda,workflow}` - See agent sections
**Settings**: `settings/{personalisation,usage,integrations,chartofaccounts,files,agents}`
**API**: `api/context-files`, `api/regulatory/{stats,search,scrape}`, `api/xero/{auth,callback,disconnect,status,switch,connections,chart-of-accounts}`, `api/agents/*`

### AI Stack
**Models**: Claude Sonnet 4.5 (default), Haiku 4.5, GPT-5, GPT-5 Mini, Gemini 2.5 Flash
**Prompts**: `prompts/{default-system-prompt.md, ap-system-prompt.md, ar-system-prompt.md}` with template vars `{{INDUSTRY_CONTEXT}}`, `{{CHART_OF_ACCOUNTS}}`
**Tools**: `createDocument`, `updateDocument`, `getWeather`, `requestSuggestions` + Xero tools when connected
**Xero Tools**: `xero_list_invoices`, `xero_get_invoice`, `xero_list_contacts`, `xero_get_contact`, `xero_list_accounts` (cached), `xero_list_journal_entries`, `xero_get_bank_transactions`, `xero_get_organisation`

### Xero Integration
**OAuth2**: Authorization Code Flow + PKCE, AES-256-GCM encrypted tokens, proactive token refresh (20-min threshold)
**Security**: CSRF protection (nonce + timestamp), state expiry (10 min), correlation ID tracking, optimistic locking
**Token Management**: Refresh token rotation (60-day window reset), concurrency protection (lock map), 5-sec refresh throttle
**Tenant Context**: Explicit context passing (no globals/thread-locals), immutable context objects, per-request validation
**API Best Practices**: Pagination (100-1000/page), If-Modified-Since headers, rate limit tracking, exponential backoff retry
**Architecture**: Multi-org support, connection health monitoring, chart of accounts caching (DB-first), conditional tool integration
**Error Handling**: 7 error types (validation, authorization, token, rate_limit, server, network, unknown), user-friendly messages, auto-retry
**Connection Management**: Proactive refresh cron (15-min), cleanup cron (daily), health checks, staleness tracking
**Files**: `lib/xero/{connection-manager,encryption,error-handler,connection-health,tenant-context,rate-limit-handler,chart-of-accounts-sync}.ts`, `lib/ai/xero-mcp-client.ts`
**Cron**: `api/cron/xero-token-refresh` (15-min), `api/cron/xero-connection-cleanup` (daily)
**Env**: `XERO_CLIENT_ID`, `XERO_CLIENT_SECRET`, `XERO_REDIRECT_URI`, `XERO_ENCRYPTION_KEY`
**Scopes**: `offline_access`, `accounting.{transactions,contacts,settings,reports.read,journals.read,attachments}`, `payroll.*`

### Artifacts
Types: text, code, image, sheet | Location: `lib/artifacts/` | Real-time updates, never auto-update after creation

### Agents (AI SDK)
All agents use `streamText()` with `tool()`, conditional Xero integration, `.toTextStreamResponse()` streaming

**Implemented** (7): Q&A ✅ | Forecasting ✅ | Analytics ✅ | Workflow ✅ | AP ✅ | AR ✅ | DocManagement ⚠️(legacy)
**Planned** (2): Reconciliations ❌ | Compliance ❌

**Q&A**: Regulatory RAG (Fair Work/ATO/State tax), confidence scoring, citations, human review | DB: regulatoryDocument
**Forecasting**: Base/Upside/Downside scenarios, Xero P&L/Balance Sheet | Memory system, 4 models
**Analytics**: KPI calculation (margin, burn, runway), narrative generation, Xero integration
**Workflow**: Month-End Close, Investor Update, ATO Audit Pack orchestration
**AP**: ABN validation, bill coding, duplicate detection, payment proposals, risk assessment | DB: 6 tables | API: 8 routes | Prompt: `prompts/ap-system-prompt.md`
**AR**: Late risk prediction, reminders (email/SMS), payment reconciliation, DSO tracking | DB: 6 tables | API: 5 routes | Prompt: `prompts/ar-system-prompt.md`
**DocManagement**: OCR, RAG search, citation (legacy standalone agent)

**API Pattern**: `streamText()` with conditional Xero tools, system prompt from markdown (AP/AR), `.toTextStreamResponse()`
**Structure**: `lib/agents/[name]/{agent,tools,types}.ts`

### Database
**Core**: User (Clerk sync), Chat, Message_v2, Document, Suggestion, Vote_v2, Stream, ContextFile (OCR, tokens), UserSettings, XeroConnection (encrypted tokens, multi-org)
**AP** (6): apContact (ABN, risk), apBill (approval workflow, line items), apPayment, apApprovalLog, apBankAccountChange, apPaymentRun
**AR** (6): arContact, arInvoice (status, Xero sync), arPayment, arReminder (email/SMS), arNote, arCommsArtefact
**Regulatory** (3): regulatoryDocument (full-text search, GIN index), regulatoryScrapeJob, qaReviewRequest

### Auth & Files
**Auth**: Clerk with auto-sync | Helpers: `getAuthUser()`, `requireAuth()`, `isAuthenticated()` | Entitlements per user type
**Context Files**: RAG uploads (images, PDF, DOCX, XLSX) | 10MB max | OCR extraction | Status: processing → ready/failed

### Lib Structure
`agents/{qanda,forecasting,analytics,ap,ar,workflow,docmanagement}` | `ai/{providers,models,prompts,entitlements,context-manager,tools,xero-mcp-client}` | `db/{schema,queries,migrate}` (+ `schema/{ap,ar}`, `queries/{ap,ar}`) | `xero/{connection-manager,encryption,rate-limit-handler,chart-of-accounts-sync}` | `regulatory/{confidence,scraper,search,config-parser}` | `files/{context-processor,pdf-ocr,parsers}` | `artifacts/` | `auth/clerk-helpers.ts`

### Components
`components/agents/` | `components/ui/` (Radix) | Chat: `{chat,chat-header,artifact,message,multimodal-input}.tsx` | Data: `{data-stream-handler,data-stream-provider}.tsx` | Editor: `{code-editor,document-preview,diffview}.tsx`

### Streaming
Chat API flow: Validate → Load history → Stream with tools → Save → Track tokens (TokenLens)
Config: 60s max, word-level chunks, 5-step limit | Redis resumable streams: disabled (optional via `REDIS_URL`)

## Code Standards
**Ultracite** (Biome-based): No enums/namespaces/!, hooks at top level, no array keys, ARIA support, no `any`, optional chaining, arrow functions
`pnpm lint` | `pnpm format` (auto-fix) | Excludes: `components/ui`, `lib/utils.ts`, `hooks/use-mobile.ts`

## Testing
Playwright (`tests/`): `e2e/`, `routes/`, `pages/`, `prompts/` | `pnpm test` | 240s timeout, HTML reporter

## Workflows
**AI Tool**: Create in `lib/ai/tools/`, add to chat route tools object, update system prompt
**Artifact**: Schema → server/client components → update `ArtifactKind` → renderer
**Agent**: See below for full pattern

### Adding Agent
1. Create `lib/agents/[name]/{agent,tools,types}.ts` with `tool()` from 'ai'
2. Create system prompt in `prompts/[name]-system-prompt.md`
3. Create API route: `streamText()` with conditional Xero tools, `.toTextStreamResponse()`
4. Create DB schema in `lib/db/schema/[name].ts` if needed
5. Create UI page in `app/agents/[name]/page.tsx`
6. Add to `app/agents/page.tsx` agent snapshots

**DB Schema**: Modify → `pnpm db:generate` → Review migration → `pnpm db:migrate` (prod: auto in build)
**AI Model**: Add to `lib/ai/models.ts` with `isReasoning` flag + entitlements
**Context Files**: POST `/api/context-files` (multipart) → Async OCR → GET with status filter

### Adding Integration (OAuth)
1. DB: Connection table with encrypted tokens (AES-256-GCM) + migration
2. Lib: `lib/[service]/{connection-manager,encryption,types}.ts` with OAuth client + token refresh
3. API: `app/api/[service]/{auth,callback,disconnect}/route.ts` with state verification
4. MCP: `lib/ai/[service]-mcp-client.ts` with tool interfaces + execution
5. Tools: `lib/ai/tools/[service]-tools.ts` using `tool()` with Zod schemas
6. Chat: Conditional tool inclusion based on connection status
7. UI: Integration card in settings with OAuth flow
8. Queries: getActiveConnection, createConnection, updateTokens, deactivateConnection

## MCP & Practices
**Context7 MCP**: `resolve-library-id` → `get-library-docs` for current library documentation
⚠️ Never edit `node_modules` - use wrappers/patches

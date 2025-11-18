# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LedgerBot (officially "intellisync-chatbot" in package.json) is an AI-powered accounting and bookkeeping workspace application built on Next.js 16. The app features intelligent chat, document management, specialized accounting agents, and collaborative AI tools. It uses the Vercel AI SDK with multiple AI providers (Anthropic Claude, OpenAI GPT-5, Google Gemini) and provides both conversational AI and artifact-based content creation, with specialized agent workspaces for bookkeeping automation.

## Key Technologies

- **Framework**: Next.js 16 with experimental PPR (Partial Prerendering)
- **AI SDK**: Vercel AI SDK with multiple providers (Anthropic Claude, OpenAI GPT-5, Google Gemini, xAI Grok) via AI Gateway
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Clerk (clerk.com) - Modern authentication and user management
- **Storage**: Vercel Blob for file uploads
- **Caching**: Redis for resumable streams (optional, currently disabled)
- **Linting/Formatting**: Ultracite (Biome-based)
- **Testing**: Playwright
- **Monitoring**: TokenLens for token usage tracking with cached model catalog
- **Integration**: Model Context Protocol (MCP) SDK for third-party service integrations
- **Web Scraping**: Mastra ingestion pipeline for regulatory document scraping

## Setup & Maintenance Notes
⚠️ Avoid editing node_modules or dependency source files.
Any required changes should be handled through configuration overrides or adapter layers. Direct modification of installed packages will be lost on update and may introduce hard-to-trace bugs. Keeping dependencies untouched ensures long-term maintainability and compatibility.

## Development Commands

```bash
# Development
pnpm dev                 # Start dev server with Turbo
pnpm studio              # Start Mastra Studio (agent testing UI)
pnpm studio:https        # Start Mastra Studio with HTTPS

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
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Clerk publishable key (get from https://dashboard.clerk.com/)
- `CLERK_SECRET_KEY`: Clerk secret key (server-side only)
- `POSTGRES_URL`: PostgreSQL connection string
- `BLOB_READ_WRITE_TOKEN`: Vercel Blob storage token
- `AI_GATEWAY_API_KEY`: Required for non-Vercel deployments (OIDC used on Vercel)
- `AI_GATEWAY_URL`: Optional, override when using a custom Gateway domain
- `REDIS_URL`: Optional, enables resumable streams
- `FIRECRAWL_API_KEY`: Required for regulatory document scraping (get from https://firecrawl.dev/)
- `CRON_SECRET`: Required for securing cron job endpoints (generate with: `openssl rand -base64 32`)

## Architecture

### Route Structure

- `app/(auth)/`: Authentication routes (login, register) using Clerk components
- `app/(chat)/`: Main chat interface and API routes
  - `api/chat/route.ts`: Primary chat endpoint with streaming
  - `api/chat/[id]/stream/route.ts`: Stream resumption endpoint
  - `api/document/route.ts`: Document CRUD operations
  - `api/files/upload/route.ts`: File upload handler
  - `api/history/route.ts`: Chat history retrieval
  - `api/suggestions/route.ts`: Document suggestion system
  - `api/vote/route.ts`: Message voting
- `app/agents/`: Specialized AI agent workspaces for accounting automation
  - `analytics/`: Narrative-rich reporting with KPI annotations and exports
  - `ap/`: Accounts Payable agent for supplier bill management and payment automation
  - `ar/`: Accounts Receivable agent for customer invoice management and payment reminders
  - `docmanagement/`: AI-assisted intake for invoices, receipts, and bank statements
  - `forecasting/`: Scenario modeling and runway projections with Mastra workflows
  - `qanda/`: Advisory Q&A assistant for policies and ledger context
  - `workflow/`: Graph orchestrations across document and agent workflows
  - `page.tsx`: Agent overview dashboard with automation metrics and health signals
- `app/(settings)/`: User settings and management
  - `settings/personalisation/`: User preferences including default model and reasoning settings
  - `personalisation/`: Alternative personalisation route (duplicate path exists)
  - `settings/usage/`: Usage tracking and analytics
  - `settings/integrations/`: Third-party integrations
  - `settings/files/`: File management interface
  - `settings/agents/`: Agent configuration management
  - `api/user/route.ts`: User settings API
  - `api/usage/route.ts`: Usage data API
  - `api/files/route.ts`: File management API
- `app/api/context-files/`: Context file management for RAG and document processing
  - Supports images (JPEG, PNG, GIF, WebP), PDFs, DOCX, and XLSX
  - 10MB max file size with storage quota enforcement
- `app/api/regulatory/`: Regulatory knowledge base management
  - `stats/route.ts`: Returns regulatory document counts and last updated timestamp
  - Future: Scraping job management, document CRUD operations
- `app/account/`: Clerk account management integration
- `app/privacy/` and `app/terms/`: Legal pages

### Core AI Implementation

**AI Provider Configuration** (`lib/ai/providers.ts`):
- Uses `@ai-sdk/gateway` to route requests through Vercel AI Gateway
- Test environment uses mock models from `models.mock.ts`
- Available chat models (defined in `lib/ai/models.ts`):
  - `anthropic-claude-sonnet-4-5`: Claude Sonnet 4.5 (default, balanced general-purpose)
  - `anthropic-claude-haiku-4-5`: Claude Haiku 4.5 (lightweight, fast general-purpose)
  - `openai-gpt-5-chat`: GPT-5.1 (flagship OpenAI model)
  - `openai-gpt-5-mini`: GPT-5 Mini (fast, cost-efficient)
  - `google-gemini-2-5-flash`: Gemini 2.5 Flash (speed-optimized with reasoning)
- Reasoning models use `extractReasoningMiddleware` with `<think>` tags
- Title generation and artifact creation use the user's selected chat model (passed dynamically)
- **TokenLens Integration**: Uses cached model catalog (`unstable_cache`) with 24h revalidation
  - `getTokenlensCatalog()` fetches model pricing and capabilities from TokenLens API
  - Falls back to default catalog if fetch fails
  - Enriches token usage data with cost calculations in `onFinish` callback

**System Prompts** (`lib/ai/prompts.ts`, `prompts/`):
- Reasoning models use regular prompt only
- Non-reasoning models include artifacts system prompt for document creation
- All prompts include geolocation hints from Vercel Functions (latitude, longitude, city, country)
- Additional prompts: `codePrompt` (Python code generation), `sheetPrompt` (spreadsheet creation), `updateDocumentPrompt` (document improvement)
- **Default System Prompt**: Stored as markdown file in `prompts/default-system-prompt.md`
  - Loaded at runtime by `app/(settings)/api/user/data.ts`
  - Defines LedgerBot's role as Australian business accounting assistant
  - Includes comprehensive accounting capabilities, GST/BAS compliance, Australian terminology
  - Template placeholders for industry-specific customization: `{{INDUSTRY_CONTEXT}}`, `{{CHART_OF_ACCOUNTS}}`
  - Users can override in personalisation settings (`/settings/personalisation`)
  - See `prompts/README.md` for maintenance documentation
- **Agent-Specific Prompts**: Specialized instructions for accounting agents
  - `ap-system-prompt.md`: Accounts Payable agent instructions (vendor validation, bill coding, payment workflows)
  - `ar/system.md`: Accounts Receivable agent instructions (invoice tracking, reminder generation, DSO management)

**AI Tools** (`lib/ai/tools/`):
- `createDocument`: Creates text, code, image, or sheet artifacts
- `updateDocument`: Updates existing documents
- `getWeather`: Fetches weather data based on location
- `requestSuggestions`: Generates document improvement suggestions
- Xero accounting tools (when connected):
  - `xero_list_invoices`: Get invoices with status, date range, and contact filters
  - `xero_get_invoice`: Get detailed invoice information by ID
  - `xero_list_contacts`: Search contacts (customers/suppliers) by name or email
  - `xero_get_contact`: Get detailed contact information by ID
  - `xero_list_accounts`: Get chart of accounts from **database cache** (synced on connection and manual refresh) with optional type filtering - **no API calls**
  - `xero_list_journal_entries`: Get manual journal entries with date filtering
  - `xero_get_bank_transactions`: Get bank transactions with account and date filters
  - `xero_get_organisation`: Get connected Xero organisation information

### Xero Integration

LedgerBot includes built-in Xero accounting integration using Model Context Protocol (MCP) for real-time access to financial data.

**OAuth2 Flow**: Uses **Authorization Code Flow** (standard flow with client secret)
- Recommended by Xero for web server applications that can securely store client secrets
- LedgerBot is a Next.js server-side application with secure environment variable storage
- Client secret provides stronger authentication than PKCE (designed for native apps)
- See `/docs/xero-oauth-flow-comparison.md` for detailed comparison with PKCE flow
- See `/docs/xero-authentication-guide.md` for complete OAuth implementation details

**Xero API Best Practices** (implemented following official Xero developer guidelines):

1. **Pagination** (`lib/ai/xero-mcp-client.ts:268-410`):
   - Uses `page` and `pageSize` parameters (page starts at 1)
   - Default pageSize: 100, maximum: 1000 (per Xero limits)
   - Detects last page when receiving fewer records than pageSize
   - Supports both single-page requests and automatic multi-page iteration
   - Applied to: invoices, contacts, bank transactions, journal entries, payments, quotes, credit notes
   - Reference: https://developer.xero.com/documentation/best-practices/integration-health/paging

2. **If-Modified-Since** (`lib/ai/xero-mcp-client.ts:49-77`):
   - Retrieves only records modified since a specific date/time
   - Reduces API calls and improves performance for incremental syncing
   - Format: ISO 8601 (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)
   - Recommended for endpoints with large datasets (invoices, contacts, etc.)
   - Supported on: invoices, contacts, items, journals, manual journals, bank transactions, credit notes, employees, payments, purchase orders, overpayments, prepayments, quotes, users
   - Example: `ifModifiedSince: "2025-01-01T00:00:00"` retrieves only records modified since that timestamp
   - Reference: https://developer.xero.com/documentation/best-practices/integration-health/if-modified-since

3. **Rate Limit Handling** (`lib/xero/rate-limit-handler.ts`):
   - Tracks X-MinLimit-Remaining and X-DayLimit-Remaining headers
   - Limits: 60 calls/minute per tenant, 5000 calls/day per tenant
   - Implements exponential backoff with jitter for 429 errors
   - Proactive throttling when approaching limits (2 calls/minute, 50 calls/day)
   - Database tracking of rate limit status per connection
   - Reference: https://developer.xero.com/documentation/best-practices/integration-health/rate-limits

**Architecture** (`lib/xero/`, `lib/ai/xero-*`):
- **OAuth2 Authorization Code Flow** with client secret (not PKCE)
- State parameter CSRF protection (Base64-encoded userId + timestamp)
- AES-256-GCM encrypted token storage in database
- Automatic token refresh when expiring within 5 minutes
- MCP-compatible tool interfaces for Xero API operations
- AI SDK tool wrappers for seamless chat integration
- Support for multiple Xero organisations (one active connection per user)

**Database Schema** (`XeroConnection` table):
- User ID, tenant ID, and organisation name
- Encrypted OAuth tokens (access and refresh)
- Token expiry tracking and scope storage
- Active connection status flag
- **Chart of Accounts Cache**:
  - `chartOfAccounts`: JSONB storage for account data (complete account list per tenant)
  - `chartOfAccountsSyncedAt`: Timestamp tracking last sync
  - `chartOfAccountsVersion`: Xero API version used for sync
  - `chartOfAccountsHash`: SHA-256 hash for change detection

**OAuth Flow** (`app/api/xero/`):
- `/api/xero/auth`: Initialize OAuth flow with state verification
- `/api/xero/callback`: Handle OAuth callback, exchange tokens, store encrypted connection
- `/api/xero/disconnect`: Deactivate active Xero connection

**Environment Variables**:
```bash
XERO_CLIENT_ID=your_xero_client_id
XERO_CLIENT_SECRET=your_xero_client_secret
XERO_REDIRECT_URI=http://localhost:3000/api/xero/callback
XERO_ENCRYPTION_KEY=32_byte_hex_key_for_aes256
```

**Xero Scopes**:
- `offline_access`: Refresh token support
- `accounting.transactions`: Invoice and transaction access
- `accounting.contacts`: Customer and supplier access
- `accounting.settings`: Organisation settings and chart of accounts
- `accounting.reports.read`: Financial reports
- `accounting.journals.read`: Journal entries
- `accounting.attachments`: File attachments
- `payroll.employees`, `payroll.payruns`, `payroll.timesheets`: Payroll data

**Chart of Accounts Caching Architecture**:
- **Auto-sync on connection**: Chart synced automatically when OAuth connection is established (non-blocking background task)
- **Database-first approach**: `xero_list_accounts` AI tool retrieves from database cache, **not** live Xero API
- **Manual refresh**: Users can sync via Settings > Chart of Accounts > "Sync Now" button
- **Multi-tenant support**: Each Xero organisation has its own cached chart of accounts
- **Performance benefit**: Database queries are ~10x faster than Xero API calls, eliminates rate limit concerns
- **Implementation**: `lib/xero/chart-of-accounts-sync.ts` handles sync logic and formatting

**Company Name Integration**:
- **Auto-populated from Xero**: Company name (`COMPANY_NAME` template variable) uses `XeroConnection.tenantName` when connected
- **Fallback to manual entry**: If no Xero connection, uses manual entry from user settings
- **Priority**: Xero tenant name > manual user entry
- **UI behavior**: Company name field is read-only when Xero is connected (shown in `/settings/personalisation`)
- **Implementation**: `app/(settings)/api/user/data.ts` prioritizes Xero connection's tenant name

**Integration with Chat** (`app/(chat)/api/chat/route.ts`):
- Checks for active Xero connection before each chat request
- Conditionally includes Xero tools in available tools list
- Tools are automatically available when user has connected Xero
- No configuration needed - tools are added dynamically
- Chart of accounts and company name included in system prompt via template variables (both loaded from database cache)

**Settings UI** (`app/(settings)/settings/integrations/page.tsx`):
- Server-rendered Xero connection status
- Connect/disconnect functionality with OAuth flow
- Displays organisation name and token expiry
- Success/error messages for connection status

**Key Implementation Files**:
- `lib/xero/connection-manager.ts`: OAuth client, token refresh, connection retrieval
- `lib/xero/encryption.ts`: AES-256-GCM encryption for OAuth tokens
- `lib/xero/types.ts`: TypeScript type definitions
- `lib/ai/xero-mcp-client.ts`: MCP tool definitions and execution
- `lib/ai/tools/xero-tools.ts`: AI SDK tool wrappers with Zod schemas
- `components/settings/xero-integration-card.tsx`: React component for connection UI

**Usage in Chat**:
Users can query their Xero data naturally in chat:
- "Show me all unpaid invoices from last month"
- "Get the details for invoice INV-001"
- "List all my customers"
- "What's my organisation name and address?"

The AI automatically uses the appropriate Xero tools based on user intent when a connection is active.

### Artifact System

Artifacts are special UI components that render AI-generated content in a side panel:
- **Types**: text, code, image, sheet
- **Location**: `lib/artifacts/` directory contains server/client components
- **Behavior**: Real-time updates visible to user during AI generation
- **Important**: Never update documents immediately after creation - wait for user feedback

### Agent Workspaces (Mastra Framework)

LedgerBot features specialized AI agent workspaces for accounting automation built on **Mastra** (`app/agents/`).

**Framework**: All agents use [Mastra](https://mastra.ai) for unified architecture, tool integration, and workflow orchestration.

**Shared Mastra Instance** (`lib/mastra/index.ts`):
- Centralized agent registration and configuration
- Type-safe agent access via `mastra.getAgent(name)`
- Shared tools and integrations
- Built-in observability and monitoring
- **Currently registered**: 6 agents (qanda, forecasting, analytics, workflow, ap, ar)

**Mastra Studio**: For local development and debugging, use [Mastra Studio](https://mastra.ai/docs/getting-started/studio) - an interactive UI for testing agents, workflows, and tools. See `/docs/mastra-studio-integration-guide.md` for complete setup instructions. Quick start: `pnpm studio` (opens at http://localhost:4111).

## Agent Implementation Status Matrix

| Agent | Mastra | API Route | UI Page | Tools | DB Schema | Status |
|-------|--------|-----------|---------|-------|-----------|--------|
| Q&A | ✅ | ✅ | ✅ | ✅ | ✅ | **Complete** |
| Forecasting | ✅ | ✅ | ✅ | ✅ | ❌ | **Complete** |
| Analytics | ✅ | ✅ | ✅ | ✅ | ❌ | **Complete** |
| Workflow | ✅ | ✅ | ✅ | ✅ | ❌ | **Complete** |
| AP | ✅ | ✅ | ✅ | ✅ | ❌ | **Complete** |
| AR | ✅ | ✅ | ✅ | ✅ | ✅ | **Complete** |
| DocManagement | ⚠️ Hybrid | ✅ | ✅ | ✅ | ❌ | **Partial Mastra** |
| Reconciliations | ❌ | ❌ | ❌ | ❌ | ❌ | **Planned** |
| Compliance | ❌ | ❌ | ❌ | ❌ | ❌ | **Planned** |

**Implemented Agents** (using Mastra):

1. **Advisory Q&A** (`/agents/qanda`): Regulatory-aware conversational assistant for Australian tax law and compliance
   - **Status**: ✅ Fully implemented with Mastra
   - **Tools**: `regulatorySearch`, conditional Xero tools
   - **Features**: Confidence scoring, citation system, human review escalation, regulatory knowledge base with full-text search
   - **API**: `POST /api/agents/qanda`

2. **Forecasting** (`/agents/forecasting`): Scenario modeling and runway projections with multiple financial models
   - **Status**: ✅ Fully implemented with Mastra
   - **Tools**: Xero P&L and Balance Sheet integration
   - **Features**: Base/Upside/Downside scenarios, memory system, 4 model types
   - **API**: `POST /api/agents/forecasting`

3. **Analytics** (`/agents/analytics`): Narrative-rich reporting with KPI annotations and presentation-ready insights
   - **Status**: ✅ Fully implemented with Mastra
   - **Tools**: `calculateKpis`, `generateNarrative`, Xero P&L/Balance Sheet
   - **Features**: Gross margin, burn rate, runway calculation, executive summaries
   - **API**: `POST /api/agents/analytics`

4. **Workflow Supervisor** (`/agents/workflow`): Multi-agent workflow orchestration with Mastra workflows
   - **Status**: ✅ Fully implemented with Mastra workflows
   - **Tools**: `executeMonthEndClose`, `executeInvestorUpdate`, `executeAtoAuditPack`
   - **Workflows**:
     - Month-End Close: Documents → Analytics (Reconciliations and Compliance planned)
     - Investor Update: Analytics → Forecasting → Q&A
     - ATO Audit Pack: Documents → Workflow (Compliance planned)
   - **API**: `POST /api/agents/workflow`

5. **Accounts Payable (AP)** (`/agents/ap`): Supplier bill management with vendor validation, coding suggestions, and payment automation
   - **Status**: ✅ Fully implemented with Mastra
   - **Tools**: `validateABN`, `suggestBillCoding`, `checkDuplicateBills`, `generatePaymentProposal`, `assessPaymentRisk`, `generateEmailDraft`, conditional Xero tools
   - **Features**: Australian ABN validation, GST-aware bill coding, duplicate detection, approval workflow tracking, payment run proposals with risk assessment, vendor communication drafts
   - **API**: `POST /api/agents/ap`

6. **Accounts Receivable (AR)** (`/agents/ar`): Customer invoice management with payment reminders, late risk prediction, and DSO reduction
   - **Status**: ✅ Fully implemented with Mastra
   - **Tools**: `getInvoicesDue`, `predictLateRisk`, `buildEmailReminder`, `buildSmsReminder`, `reconcilePayment`, `postNote`, `syncXero`
   - **Features**: Overdue invoice tracking, late payment risk prediction, customizable payment reminder generation (email/SMS), payment reconciliation, customer note management, Xero synchronization
   - **Note**: AR tools are located in `lib/tools/ar/messaging.ts` (separate from agent directory pattern)
   - **API**: `POST /api/agents/ar`

7. **Document Processing** (`/agents/docmanagement`): AI-assisted intake for invoices, receipts, and bank statements with automated OCR and validation queues
   - **Status**: ⚠️ Hybrid implementation (legacy standalone + Mastra workflow)
   - **Implementation**: Legacy agent in `lib/agents/docmanagement.ts` (not registered in Mastra)
   - **Tools**: PDF load, RAG search, citation extraction, optional Xero query
   - **Features**: Document caching, chunk-based search, citation scoring
   - **API**: `POST /api/agents/docmanagement`

**Planned Agents** (not yet implemented):

8. **Reconciliations** (`/agents/reconciliations`): Continuous bank feed matching with fuzzy logic and ledger adjustment proposals
   - **Status**: ❌ Planned (not implemented)
   - **Planned Tools**: `matchTransactions`, `proposeAdjustment`, `identifyExceptions`, Xero bank transactions
   - **Planned Features**: Levenshtein distance matching, auto-approval (≥80% score), severity classification
   - **Note**: Referenced in workflow supervisor but not implemented as standalone agent

9. **Compliance** (`/agents/compliance`): ATO-aware co-pilot for BAS, payroll, and super obligations with automatic reminders
   - **Status**: ❌ Planned (not implemented)
   - **Planned Tools**: `checkDeadlines`, `getAtoReferences`, Xero GST report
   - **Planned Features**: Deadline tracking, ATO ruling search, professional disclaimer management
   - **Note**: Referenced in workflow supervisor but not implemented as standalone agent

**Agent Architecture Pattern**:
```
lib/agents/[agent-name]/
├── agent.ts          # Mastra Agent definition with instructions and tools
├── tools.ts          # Agent-specific tools using createTool()
├── types.ts          # TypeScript type definitions
└── utils.ts          # Helper functions (optional)
```

**API Route Pattern** (consistent across all agents):
```typescript
export async function POST(req: Request) {
  const user = await getAuthUser();
  const { messages, settings } = await req.json();

  // Conditional Xero integration
  const xeroConnection = await getActiveXeroConnection(user.id);
  const agent = xeroConnection
    ? createAgentWithXero(user.id, settings?.model)
    : baseAgent;

  const stream = createUIMessageStream({
    execute: ({ writer: dataStream }) => {
      const result = agent.stream({
        messages,
        maxSteps: 5,
        onStepFinish: ({ text, toolCalls }) => { /* logging */ },
        onFinish: async ({ text, toolCalls, usage }) => { /* save messages */ },
      });
      dataStream.merge(result.toUIMessageStream());
    },
  });

  return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
}
```

**Key Features Across All Agents**:
- ✅ Streaming responses with real-time updates
- ✅ Conditional Xero tool integration
- ✅ Step-by-step execution tracking
- ✅ Token usage monitoring
- ✅ Database message persistence
- ✅ Comprehensive error handling
- ✅ Type-safe Zod schemas

**Agent Overview Dashboard** (`/agents`):
- Displays 7 agent cards (DocManagement, Analytics, Forecasting, AP, AR, Q&A, Workflow)
- Links to individual agent workspace pages
- Shows agent-specific metrics and health signals
- Future: Automation coverage metrics, human review queue, change management tracking

**Agent Components** (`components/agents/`):
- `agent-summary-card.tsx`: Displays agent status and metrics on overview page
- `agents-header.tsx`: Navigation header for agent workspaces

### Q&A Agent - Regulatory RAG System

The Q&A agent provides regulatory-aware assistance for Australian tax law, employment law, and compliance obligations.

**Implementation Status**: **FULLY IMPLEMENTED** ✅

**Key Features** (`/agents/qanda/page.tsx`):
- **Interactive Chat Interface**: Full conversation history with real-time messaging
- **Regulatory Knowledge Base Stats**: Displays counts for Modern Awards, Tax Rulings, and State Payroll Tax documents
- **Citation System**: Shows regulatory sources with clickable links to Fair Work and ATO documents
- **Confidence Scoring**: Visual badges indicating response confidence (color-coded: green ≥80%, yellow 60-79%, red <60%)
- **Human Review Escalation**: Flagging and escalation for low-confidence responses
- **Suggested Questions**: Common Australian regulatory queries (minimum wage, super, payroll tax, BAS)
- **Stream Controls**: Toggles for streaming responses and showing/hiding citations

**Backend Implementation** (completed with Mastra):
- **Mastra Agent**: `lib/agents/qanda/agent.ts` - Full Mastra Agent with regulatory and Xero tools
- **Mastra Tools**: `lib/agents/qanda/tools.ts` - `regulatorySearchTool` and conditional Xero tools
- **Database schema**: `regulatoryDocument`, `regulatoryScrapeJob`, and `qaReviewRequest` tables with full-text search
- **Configuration system**: Markdown-based source management (`config/regulatory-sources.md`) with 10 Australian sources
- **Scraping infrastructure**: Mastra ingestion agents with rate limiting, summarisation, and job orchestration
- **Full-text search**: PostgreSQL tsvector with GIN indexes, relevance ranking, and context excerpts
- **AI tool**: `regulatorySearch` tool for RAG retrieval with category filtering
- **Confidence scoring**: Multi-factor algorithm analyzing citations, relevance, hedging language, and Xero integration
- **API endpoints**:
  - `/api/agents/qanda` - Streaming chat with Mastra Agent (regulatory + Xero tools)
  - `/api/regulatory/search` - Full-text search
  - `/api/regulatory/scrape` - Manual scraping trigger
  - `/api/regulatory/stats` - Knowledge base statistics
  - `/api/agents/qanda/review` - Review request management
  - `/api/cron/regulatory-sync` - Scheduled daily sync
- **Cron job**: Daily scheduled sync via Vercel Cron (2:00 AM UTC) for high-priority sources
- **Human review**: Review request system for low-confidence responses with database tracking

**Settings Integration** (`/settings/agents`):
- Response confidence threshold (0-100%)
- Hallucination prevention level (conservative/balanced/aggressive)
- Knowledge base source selection:
  - All regulatory sources (default)
  - ATO tax rulings only
  - Fair Work awards only
  - State payroll tax only
  - Custom documents
- Regulatory source category toggles (Fair Work, ATO, State payroll tax)
- Citation display toggle
- Human escalation toggle for low-confidence queries

**Usage**:
Users can now ask regulatory questions directly in the Q&A agent at `/agents/qanda`:
- "What is the current minimum wage in Australia?"
- "What are my superannuation obligations?"
- "What is the payroll tax threshold in NSW?"
- "When are BAS lodgements due for quarterly reporters?"
- "What Fair Work awards apply to hospitality workers?"

The agent searches the regulatory knowledge base using PostgreSQL full-text search and provides answers with citations to official government sources (Fair Work, ATO, state revenue offices). Responses include confidence scores and automatic review request creation for low-confidence answers.

See `/docs/regulatory-system-summary.md` for complete implementation details and `/docs/qanda-agent-ui-update.md` for UI implementation notes.

### Database Schema

**Core Tables** (`lib/db/schema.ts`):
- `User`: User accounts synced with Clerk
  - `clerkId`: Unique Clerk user ID (synced on first login)
  - `clerkSynced`: Track sync status
  - `email`: User email from Clerk
  - Legacy `password` field kept for migration period
- `Chat`: Conversations with visibility settings (public/private) and usage tracking
  - `lastContext`: JSONB field storing last app usage context
- `Message_v2`: Multi-part messages (new format) with attachments
- `Document`: Artifacts (text, code, image, sheet) linked to users
- `Suggestion`: Document edit suggestions with resolution tracking
- `Vote_v2`: Message voting system
- `Stream`: Stream ID tracking for resumable streams
- `ContextFile`: File storage for RAG and document processing
  - Supports OCR extraction with `extractedText` and `tokenCount`
  - Status tracking: processing, ready, failed
  - Metadata: `description`, `tags`, `isPinned`
  - Usage timestamps: `createdAt`, `lastUsedAt`, `processedAt`
- `UserSettings`: User preferences and customization
  - Profile: `country`, `state` (firstName/lastName removed - now managed by Clerk)
  - AI preferences: `defaultModel`, `defaultReasoning`
  - Custom prompts: `systemPrompt`, `codePrompt`, `sheetPrompt`
  - Customizable chat suggestions with enable/disable and ordering
- `XeroConnection`: Xero OAuth connections and token storage
  - User ID and tenant (organisation) information
  - Encrypted access and refresh tokens (AES-256-GCM)
  - Token expiry tracking and automatic refresh
  - OAuth scopes and active connection status
  - Multi-organisation support (one active connection per user)

**Accounts Receivable Tables** (`lib/db/schema/ar.ts`):
- `ArContact`: Customer/contact records for AR operations
  - Customer details: name, email, phone
  - Xero integration via `externalRef` field
  - User-scoped with cascade deletion
- `ArInvoice`: Customer invoices with payment tracking
  - Invoice details: number, dates, amounts (subtotal, tax, total)
  - Payment tracking: `amountPaid`, `status`
  - Status values: awaiting_payment, paid, overdue
  - Xero synchronization support
  - Indexed by user, contact, status, due date
- `ArPayment`: Payment records linked to invoices
  - Payment details: amount, date, method, reference
  - Supports partial payments
  - Automatic invoice reconciliation
- `ArReminder`: Payment reminder tracking
  - Reminder history with type, channel, content
  - Send status tracking
  - Links to invoice and contact
- `ArNote`: Customer notes and communication history
  - User-authored notes about customers/invoices
  - Timestamp tracking
- `ArCommsArtefact`: Communication templates and drafts
  - Email and SMS templates
  - Generated reminder content for copy-paste
  - Type field: email, sms

**Migration Strategy**:
- Old message/vote tables are deprecated but retained (Message, Vote)
- Migration guide at chat-sdk.dev/docs/migration-guides/message-parts

### Authentication

**Authentication Provider**: Clerk (clerk.com)

**User Management**:
- All users are authenticated via Clerk
- Database automatically syncs Clerk users on first login
- Helper functions in `lib/auth/clerk-helpers.ts`:
  - `getAuthUser()`: Get authenticated user and sync with database
  - `requireAuth()`: Require authentication or throw error
  - `isAuthenticated()`: Check if user is authenticated

**Rate Limiting & Entitlements**:
- Entitlements defined in `lib/ai/entitlements.ts`
- Enforced per user type (messages per day limit)
- Storage quotas and context file limits per user type
- Currently all users have `regular` type

### Context File Management

**Context Files System** (`app/api/context-files/`, `lib/files/`):
- Enables RAG (Retrieval Augmented Generation) for chat
- Users can upload documents to provide context to AI conversations
- Processing pipeline extracts text and counts tokens for context management

**Supported File Types**:
- Images: JPEG, PNG, GIF, WebP
- Documents: PDF, DOCX (Word), XLSX (Excel)
- Maximum file size: 10MB per file
- Storage quotas enforced per user entitlement

**File Processing** (`lib/files/context-processor.ts`):
- Asynchronous processing after upload
- OCR and text extraction from images and PDFs
- Token counting for context window management
- Status tracking: processing → ready/failed

**Context Integration**:
- Files can be pinned for persistent context
- Metadata includes description, tags, usage timestamps
- Integration with chat system for contextual responses
- Context manager (`lib/ai/context-manager.ts`) handles selection and formatting

### Library Structure

**`lib/` Directory Organization**:
- `mastra/`: **Mastra framework configuration** (unified agent system)
  - `index.ts`: Shared Mastra instance with 6 agents registered (qanda, forecasting, analytics, ap, ar, workflow)
- `agents/`: **Agent implementations using Mastra**
  - `qanda/`: Q&A agent (regulatory RAG, confidence scoring) ✅
    - `agent.ts`: Mastra Agent with regulatory and Xero tools
    - `tools.ts`: Regulatory search and Xero tool wrappers
    - `types.ts`: Type definitions
  - `forecasting/`: Forecasting agent (scenario modeling) ✅
    - `agent.ts`: Mastra Agent + legacy function
    - `tools.ts`: Xero P&L and balance sheet tools
    - `config.ts`, `memory.ts`, `utils.ts`: Supporting modules
  - `analytics/`: Analytics agent (KPI calculation) ✅
    - `agent.ts`: Mastra Agent with KPI and narrative tools
  - `ap/`: Accounts Payable agent (supplier bill management) ✅
    - `agent.ts`: Mastra Agent with bill coding and payment tools
    - `tools.ts`: ABN validation, bill coding, payment proposals, email drafts
    - `types.ts`: Type definitions for bills and payments
  - `ar/`: Accounts Receivable agent (invoice management) ✅
    - `agent.ts`: Mastra Agent with reminder and risk tools (imports from lib/tools/ar)
    - `workflow.ts`: AR workflow definitions
    - Note: AR tools are in `lib/tools/ar/messaging.ts` (separate location - architectural inconsistency)
  - `workflow/`: Workflow supervisor ✅
    - `supervisor.ts`: Mastra Agent for orchestration
    - `workflows.ts`: Mastra workflow definitions (Month-End Close, Investor Update, ATO Audit Pack)
  - `docmanagement/`: Document management agent ⚠️ Hybrid
    - `docmanagement.ts`: Legacy standalone agent (19,992 bytes) - NOT registered in Mastra
    - `workflow.ts`, `types.ts`: Mastra workflow modules
    - Note: Hybrid architecture - legacy file exists alongside Mastra workflow
  - **Missing**: `reconciliations/` and `compliance/` directories do not exist
- `ai/`: AI provider configuration, models, prompts, tools, and context management
  - `providers.ts`: AI Gateway configuration
  - `models.ts`: Available chat models with reasoning flags
  - `prompts.ts`: System prompts (regular, artifacts, code, sheet, update)
  - `entitlements.ts`: User entitlements and rate limits
  - `context-manager.ts`: Context file selection and formatting
  - `tools/`: AI tool implementations (createDocument, updateDocument, getWeather, requestSuggestions, regulatory, Xero)
  - `xero-mcp-client.ts`: Xero MCP integration for tools
- `tools/`: Additional specialized tools for agents
  - `ar/`: Accounts Receivable tool implementations
    - `messaging.ts`: Invoice tracking, reminders, payment reconciliation, Xero sync
- `artifacts/`: Artifact rendering logic (text, code, image, sheet)
- `auth/`: Clerk authentication helpers and user management
  - `clerk-helpers.ts`: getAuthUser, requireAuth, isAuthenticated
- `db/`: Database configuration and queries
  - `schema.ts`: Drizzle ORM schema definitions
  - `queries.ts`: Database query functions
  - `migrate.ts`: Migration runner
  - `utils.ts`: Database utilities
- `files/`: File processing and context management
  - `context-processor.ts`: File upload processing pipeline
  - `pdf-ocr.ts`: OCR extraction for scanned PDFs
  - `parsers.ts`: File parsers
- `regulatory/`: Regulatory knowledge base system
  - `confidence.ts`: Confidence scoring algorithm
  - `scraper.ts`: Mastra-based scraping
  - `search.ts`: PostgreSQL full-text search
  - `config-parser.ts`: Source configuration parser
- `xero/`: Xero OAuth integration
  - `connection-manager.ts`: OAuth client and token refresh
  - `encryption.ts`: AES-256-GCM token encryption
  - `types.ts`: TypeScript types
- `editor/`: Editor-related utilities
- `types/`: TypeScript type definitions
- `constants.ts`: Application constants
- `errors.ts`: Error handling utilities
- `types.ts`: Core TypeScript types
- `usage.ts`: Usage tracking types
- `utils.ts`: General utility functions

### Component Structure

**Key Component Categories** (`components/`):
- `agents/`: Agent workspace components
  - `agent-summary-card.tsx`: Agent metrics display
- `ui/`: Reusable UI components (buttons, cards, forms, etc.) based on Radix UI
- Core chat components:
  - `chat.tsx`: Main chat interface
  - `chat-header.tsx`: Chat header with model selection
  - `artifact.tsx`: Artifact rendering container
  - `artifact-*.tsx`: Artifact-specific components
  - `message.tsx`: Message display
  - `multimodal-input.tsx`: Chat input with file attachments
- Navigation:
  - `app-sidebar.tsx`: Main application sidebar
- Theme management:
  - `clerk-theme-provider.tsx`: Clerk theming integration
  - Theme switching via next-themes
- Data handling:
  - `data-stream-handler.tsx`: Real-time stream processing
  - `data-stream-provider.tsx`: Stream context provider
- Editor components:
  - `code-editor.tsx`: CodeMirror integration
  - `document-preview.tsx`: Document preview rendering
  - `diffview.tsx`: Document diff visualization

### Message Streaming

Chat API (`app/(chat)/api/chat/route.ts`):
1. Validates request schema, checks authentication and rate limits
2. Creates/validates chat ownership
3. Loads message history and converts to UI format
4. Streams AI response with tools enabled (except for reasoning models)
5. Saves messages to database on completion
6. Tracks token usage via TokenLens integration with cached model catalog
7. Resumable streams via Redis: **Currently disabled** (code commented out in lines 353-361)
   - Feature can be enabled by uncommenting code when `REDIS_URL` is configured
   - Requires `resumable-stream` package and Redis connection
   - When disabled, uses direct SSE streaming without resumability

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

**Biome Configuration** (`biome.jsonc`):
- Extends Ultracite base configuration
- **File Exclusions**: `components/ui`, `lib/utils.ts`, `hooks/use-mobile.ts` are excluded from linting
- **Rule Overrides** (disabled for project needs):
  - `suspicious.noExplicitAny`: Disabled (needs more work to fix)
  - `suspicious.noConsole`: Disabled (allowing console for debugging)
  - `suspicious.noBitwiseOperators`: Disabled (needed for generateUUID)
  - `style.noMagicNumbers`: Disabled (allowing magic numbers)
  - `style.noNestedTernary`: Disabled (needs more work to fix)
  - `nursery.noUnnecessaryConditions`: Disabled (too many false positives)
  - `complexity.noExcessiveCognitiveComplexity`: Disabled (needs more work)
  - `a11y.noSvgWithoutTitle`: Disabled (needs more work)

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
2. Create server component in `lib/artifacts/your-type/server.ts`
3. Create client component in `lib/artifacts/your-type/client.tsx`
4. Update `ArtifactKind` type in `components/artifact.tsx`
5. Add rendering logic to artifact renderer

### Adding a New Mastra Agent

**Step 1: Create Agent Directory Structure**
```bash
mkdir -p lib/agents/your-agent
```

**Step 2: Define Agent with Mastra** (`lib/agents/your-agent/agent.ts`)
```typescript
import { Agent } from "@mastra/core/agent";
import { myProvider } from "@/lib/ai/providers";

const INSTRUCTIONS = `You are [agent description]...`;

export const yourAgent = new Agent({
  name: "your-agent",
  instructions: INSTRUCTIONS,
  model: myProvider.languageModel("anthropic-claude-sonnet-4-5"),
  tools: {
    // Register your tools here
  },
});

// Optional: Agent with conditional tools (e.g., Xero)
export function createYourAgentWithXero(userId: string) {
  const xeroTools = createYourAgentXeroTools(userId);

  return new Agent({
    name: "your-agent-with-xero",
    instructions: INSTRUCTIONS,
    model: myProvider.languageModel("anthropic-claude-sonnet-4-5"),
    tools: {
      // Base tools
      ...xeroTools, // Conditional tools
    },
  });
}
```

**Step 3: Create Tools** (`lib/agents/your-agent/tools.ts`)
```typescript
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const yourToolName = createTool({
  id: "yourToolName",
  description: "Clear description of what this tool does",
  inputSchema: z.object({
    param: z.string().describe("Parameter description"),
  }),
  outputSchema: z.object({
    result: z.string(),
  }),
  execute: async ({ context, inputData }) => {
    // Tool logic here
    return { result: "..." };
  },
});
```

**Step 4: Register Agent** (`lib/mastra/index.ts`)
```typescript
import { yourAgent } from "@/lib/agents/your-agent/agent";

export const mastra = new Mastra({
  agents: {
    // ... existing agents
    yourAgent: yourAgent,
  },
});
```

**Step 5: Create API Route** (`app/api/agents/your-agent/route.ts`)
```typescript
import { createUIMessageStream, JsonToSseTransformStream } from "ai";
import { NextResponse } from "next/server";
import type { CoreMessage } from "ai";
import { yourAgent, createYourAgentWithXero } from "@/lib/agents/your-agent/agent";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { getActiveXeroConnection, getChatById, saveChat, saveMessages } from "@/lib/db/queries";

export const maxDuration = 60;

export async function POST(req: Request) {
  const user = await getAuthUser();
  if (!user) return new NextResponse("Not authenticated", { status: 401 });

  const { messages, settings } = await req.json();

  // Conditional Xero integration
  const xeroConnection = await getActiveXeroConnection(user.id);
  const agent = xeroConnection ? createYourAgentWithXero(user.id) : yourAgent;

  const stream = createUIMessageStream({
    execute: ({ writer: dataStream }) => {
      const result = agent.stream({
        messages,
        maxSteps: 5,
        onFinish: async ({ text, toolCalls, usage }) => {
          // Save messages to database
        },
      });
      dataStream.merge(result.toUIMessageStream());
    },
  });

  return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
}
```

**Step 6: Create UI Page** (`app/agents/your-agent/page.tsx`)
1. Create agent-specific UI with metrics and chat interface
2. Add agent entry to `agentSnapshots` in `app/agents/page.tsx`
3. Create agent-specific components in `components/agents/` if needed

**Step 7: Add Agent Settings** (optional)
- Add configuration section in `app/(settings)/settings/agents/page.tsx`

### Adding a New Mastra Workflow

**Step 1: Define Workflow Steps** (`lib/agents/workflow/workflows.ts`)
```typescript
import { createWorkflow, createStep } from "@mastra/core";
import { z } from "zod";

const step1 = createStep({
  id: "step-1",
  inputSchema: z.object({ input: z.string() }),
  outputSchema: z.object({ output: z.string() }),
  execute: async ({ inputData }) => {
    // Step logic
    return { output: "result" };
  },
});

export const yourWorkflow = createWorkflow({
  id: "your-workflow",
  inputSchema: z.object({ userId: z.string(), data: z.string() }),
  outputSchema: z.object({ success: z.boolean() }),
})
  .then(step1)
  .then(step2)  // Sequential
  .commit();
```

**Step 2: Create Workflow Tool** (`lib/agents/workflow/supervisor.ts`)
```typescript
import { createTool } from "@mastra/core/tools";
import { yourWorkflow } from "./workflows";

const executeYourWorkflowTool = createTool({
  id: "executeYourWorkflow",
  description: "Execute your workflow",
  inputSchema: z.object({ userId: z.string(), data: z.string() }),
  outputSchema: z.object({ success: z.boolean() }),
  execute: async ({ inputData }) => {
    const result = await yourWorkflow.start(inputData);
    return result;
  },
});

// Register in workflowSupervisorAgent tools
```

**Step 3: Update Supervisor Instructions**
Add workflow description to supervisor agent instructions

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

### Working with Context Files

**Uploading Context Files**:
- POST to `/api/context-files` with multipart form data
- Include `file` (required) and `description` (optional) fields
- Respects storage quotas and file count limits per user entitlement

**Processing Context Files**:
- Files are processed asynchronously using Next.js `after()` hook
- Processing extracts text content and counts tokens
- Status updates: `processing` → `ready` or `failed`
- Implement processing logic in `lib/files/context-processor.ts`

**Querying Context Files**:
- GET from `/api/context-files` optionally filtered by status
- Returns files array plus usage statistics (used, fileCount, capacity)

**Using Context in Chat**:
- Context files can be referenced in chat prompts
- System passes relevant context via `userContext` in request hints
- Context manager (`lib/ai/context-manager.ts`) handles selection and formatting

### Adding a Third-Party Integration (Xero Example)

Follow these steps to add a new third-party API integration with OAuth:

**1. Database Schema and Environment**:
- Add connection table to `lib/db/schema.ts` with encrypted tokens
- Generate migration with `pnpm db:generate`
- Add OAuth credentials to `.env.example`
- Create encryption utilities if storing sensitive tokens

**2. Connection Management Layer** (`lib/your-service/`):
- Create `connection-manager.ts` with OAuth client initialization
- Implement token refresh logic for expired tokens
- Create `encryption.ts` for secure token storage (AES-256-GCM)
- Define TypeScript types in `types.ts`

**3. OAuth Flow Routes** (`app/api/your-service/`):
- `auth/route.ts`: Initialize OAuth with state verification
- `callback/route.ts`: Handle callback, exchange tokens, store connection
- `disconnect/route.ts`: Deactivate or delete connection

**4. MCP Client Wrapper** (`lib/ai/your-service-mcp-client.ts`):
- Define MCP-compatible tool interfaces
- Implement tool execution functions
- Use authenticated API client with decrypted tokens
- Handle errors and connection validation

**5. AI SDK Tool Wrappers** (`lib/ai/tools/your-service-tools.ts`):
- Create tool definitions using `tool()` from `ai` package
- Define Zod schemas for tool parameters
- Export tool names array for active tools

**6. Chat Integration** (`app/(chat)/api/chat/route.ts`):
- Check for active connection in chat route
- Conditionally import and include tools in tools object
- Add tool names to `experimental_activeTools` when connected

**7. Settings UI**:
- Create integration card component (`components/settings/your-service-integration-card.tsx`)
- Handle OAuth redirect flow with success/error messages
- Display connection status, organisation info, token expiry
- Update integrations page to use server-side data fetching

**8. Database Queries** (`lib/db/queries.ts`):
- Add queries: getActiveConnection, createConnection, updateTokens, deactivateConnection
- Ensure single active connection per user if needed

**9. Documentation**:
- Update CLAUDE.md with integration details
- Document environment variables and OAuth flow
- Add tool usage examples for chat interface

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

# Engineering Practices
⚠️ Preserve integrity of external dependencies.
Do not alter files inside node_modules or any installed packages. Instead, use wrappers, patching tools, or configuration hooks. This practice supports clean upgrades, auditability, and prevents regressions when dependencies are updated.

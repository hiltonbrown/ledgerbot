# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LedgerBot (officially "intellisync-chatbot" in package.json) is an AI-powered accounting and bookkeeping workspace application built on Next.js 15. The app features intelligent chat, document management, specialized accounting agents, and collaborative AI tools. It uses the Vercel AI SDK with multiple AI providers (Anthropic Claude, OpenAI GPT-5, Google Gemini) and provides both conversational AI and artifact-based content creation, with specialized agent workspaces for bookkeeping automation.

## Key Technologies

- **Framework**: Next.js 15 with experimental PPR (Partial Prerendering)
- **AI SDK**: Vercel AI SDK with multiple providers (Anthropic Claude, OpenAI GPT-5, Google Gemini, xAI Grok) via AI Gateway
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Clerk (clerk.com) - Modern authentication and user management
- **Storage**: Vercel Blob for file uploads
- **Caching**: Redis for resumable streams (optional, currently disabled)
- **Linting/Formatting**: Ultracite (Biome-based)
- **Testing**: Playwright
- **Monitoring**: TokenLens for token usage tracking with cached model catalog
- **Integration**: Model Context Protocol (MCP) SDK for third-party service integrations

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
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Clerk publishable key (get from https://dashboard.clerk.com/)
- `CLERK_SECRET_KEY`: Clerk secret key (server-side only)
- `POSTGRES_URL`: PostgreSQL connection string
- `BLOB_READ_WRITE_TOKEN`: Vercel Blob storage token
- `AI_GATEWAY_API_KEY`: Required for non-Vercel deployments (OIDC used on Vercel)
- `AI_GATEWAY_URL`: Optional, override when using a custom Gateway domain
- `REDIS_URL`: Optional, enables resumable streams

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
  - `compliance/`: ATO-aware co-pilot for BAS, payroll, and super obligations
  - `docmanagement/`: AI-assisted intake for invoices, receipts, and bank statements
  - `forecasting/`: Scenario modeling and runway projections with LangGraph workflows
  - `qanda/`: Advisory Q&A assistant for policies and ledger context
  - `reconciliations/`: Continuous bank feed matching and ledger adjustment proposals
  - `workflow/`: Graph orchestrations across document, reconciliation, and compliance agents
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
  - `openai-gpt-5`: GPT-5 (flagship OpenAI model)
  - `openai-gpt-5-mini`: GPT-5 Mini (fast, cost-efficient)
  - `google-gemini-2-5-flash`: Gemini 2.5 Flash (speed-optimized with reasoning)
- Reasoning models use `extractReasoningMiddleware` with `<think>` tags
- Additional specialized models:
  - `title-model`: xAI Grok 2 (`xai/grok-2-1212`) for chat title generation
  - `artifact-model`: xAI Grok 2 (`xai/grok-2-1212`) for document generation
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
  - `xero_list_accounts`: Get chart of accounts with optional type filtering
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

**Integration with Chat** (`app/(chat)/api/chat/route.ts`):
- Checks for active Xero connection before each chat request
- Conditionally includes Xero tools in available tools list
- Tools are automatically available when user has connected Xero
- No configuration needed - tools are added dynamically

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

### Agent Workspaces

LedgerBot features specialized AI agent workspaces for accounting automation (`app/agents/`):

**Available Agents**:
1. **Document Processing** (`/agents/docmanagement`): AI-assisted intake for invoices, receipts, and bank statements with automated OCR and validation queues
2. **Reconciliations** (`/agents/reconciliations`): Continuous bank feed matching with fuzzy logic suggestions and ledger adjustment proposals
3. **Compliance** (`/agents/compliance`): ATO-aware co-pilot for BAS, payroll, and super obligations with automatic reminders
4. **Analytics** (`/agents/analytics`): Narrative-rich reporting with KPI annotations, drill-down tables, and presentation-ready exports
5. **Forecasting** (`/agents/forecasting`): Scenario modeling and runway projections with LangGraph workflows
6. **Advisory Q&A** (`/agents/qanda`): Regulatory-aware conversational assistant for Australian tax law, Fair Work awards, and compliance queries with citations and confidence scoring
7. **Workflow Supervisor** (`/agents/workflow`): Graph orchestrations across document, reconciliation, and compliance agents with traceability

**Agent Overview Dashboard** (`/agents`):
- Displays automation coverage metrics (76% of workflows delegated)
- Shows human review queue with escalations (28 items across validation, mismatches, clarifications)
- Provides agent-specific metrics (docs processed, match rates, upcoming lodgments, etc.)
- Includes change management tracking (releases, risk register, recommended actions)
- Links to individual agent workspace pages

**Agent Components** (`components/agents/`):
- `agent-summary-card.tsx`: Displays agent status and metrics on overview page

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

**Backend Implementation** (completed):
- **Database schema**: `regulatoryDocument`, `regulatoryScrapeJob`, and `qaReviewRequest` tables with full-text search
- **Configuration system**: Markdown-based source management (`config/regulatory-sources.md`) with 10 Australian sources
- **Scraping infrastructure**: Firecrawl integration with rate limiting (1 req/2s) and job orchestration
- **Full-text search**: PostgreSQL tsvector with GIN indexes, relevance ranking, and context excerpts
- **AI tool**: `regulatorySearch` tool for RAG retrieval with category filtering
- **Confidence scoring**: Multi-factor algorithm analyzing citations, relevance, hedging language, and Xero integration
- **API endpoints**:
  - `/api/agents/qanda` - Streaming chat with regulatory + Xero tools
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
  - Profile: `firstName`, `lastName`, `country`, `state`
  - AI preferences: `defaultModel`, `defaultReasoning`
  - Custom prompts: `systemPrompt`, `codePrompt`, `sheetPrompt`
  - Customizable chat suggestions with enable/disable and ordering
- `XeroConnection`: Xero OAuth connections and token storage
  - User ID and tenant (organisation) information
  - Encrypted access and refresh tokens (AES-256-GCM)
  - Token expiry tracking and automatic refresh
  - OAuth scopes and active connection status
  - Multi-organisation support (one active connection per user)

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
- `ai/`: AI provider configuration, models, prompts, tools, and context management
  - `providers.ts`: AI Gateway configuration
  - `models.ts`: Available chat models with reasoning flags
  - `prompts.ts`: System prompts (regular, artifacts, code, sheet, update)
  - `entitlements.ts`: User entitlements and rate limits
  - `context-manager.ts`: Context file selection and formatting
  - `tools/`: AI tool implementations (createDocument, updateDocument, getWeather, requestSuggestions)
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

### Adding a New Agent Workspace

1. Create new directory in `app/agents/your-agent/`
2. Create `page.tsx` with agent-specific UI and metrics
3. Add agent entry to `agentSnapshots` array in `app/agents/page.tsx`:
   - Include title, description, href, icon, and metrics
4. Create agent-specific components in `components/agents/` if needed
5. Add agent settings page section in `app/(settings)/settings/agents/page.tsx`
6. Update agent configuration management as needed

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

**Verify agent workspaces:**
```bash
gemini -p "@app/agents/ Show me all the agent workspaces and their purposes"

gemini -p "@app/agents/ @components/agents/ Are agent dashboards properly implemented with metrics and navigation?"
```

**Verify authentication system:**
```bash
gemini -p "@middleware.ts @app/ @lib/ Is Clerk authentication implemented? Show all auth-related middleware and API routes"

gemini -p "@app/ @components/ Are protected routes and user sessions properly handled throughout the application?"

gemini -p "@lib/auth/ @lib/db/schema.ts Review Clerk integration and user synchronization logic"
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
- Analyzing the complete AI accounting application architecture across app/, components/, and lib/
- Reviewing specialized agent workspaces and their bookkeeping automation features
- Understanding Next.js 15 app router implementation and API routes
- Checking the Drizzle ORM database integration and schema (including ContextFile and UserSettings)
- Verifying Vercel AI SDK and provider configurations
- Analyzing TypeScript types and configurations across the project
- Reviewing the React component hierarchy and state management
- Understanding Clerk authentication flows and user synchronization
- Checking context file processing and RAG implementation
- Reviewing test coverage and Playwright e2e test setup

## Important Notes for LedgerBot

- Paths in @ syntax are relative to your LedgerBot project root directory
- The CLI will include file contents directly in the context for analysis
- Perfect for analyzing the complex Next.js/TypeScript/AI SDK integration
- Gemini's context window can handle your entire codebase including large files like pnpm-lock.yaml
- Ideal for understanding the interaction between AI providers, database, UI components, and agent workspaces
- When checking implementations, reference the specific LedgerBot features like:
  - Chat functionality with multi-model support and reasoning
  - Agent workspaces for accounting automation (document processing, reconciliations, compliance, etc.)
  - Context file uploads and RAG implementation
  - User settings and personalization (default model, reasoning preferences, custom prompts)
  - Usage accounting and entitlement enforcement

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

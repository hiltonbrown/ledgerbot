# LedgerBot

**Accounting workspace built for Australian businesses**

Automate bookkeeping tasks, ensure GST/BAS compliance, and get instant answers to tax questions with specialized agents and Xero integration.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Powered by Vercel AI SDK](https://img.shields.io/badge/Powered%20by-Vercel%20AI%20SDK-black)](https://sdk.vercel.ai/)

---

## Table of Contents

* [The Problem](#the-problem)
* [Why LedgerBot?](#why-ledgerbot)
* [Quick Start](#quick-start)
* [Technology Stack](#technology-stack)
* [Features](#features)
* [Specialized Agents](#specialized-ai-agents)
* [Xero Integration](#xero-integration)
* [Usage Examples](#usage-examples)
* [For Developers](#for-developers)
* [Architecture](#architecture)
* [Security & Compliance](#security--compliance)
* [Contributing](#contributing)
* [Roadmap](#roadmap)
* [FAQ](#faq--troubleshooting)
* [License](#license)

---

## The Problem

Bookkeepers and accountants in Australia spend significant time on repetitive tasks:

- **Manual bank reconciliations** that take hours each week
- **Chasing down missing receipts** and invoices
- **Researching ATO rulings** and Fair Work compliance
- **Preparing BAS and IAS statements** with data entry
- **Context-switching** between different accounting tools

**LedgerBot automates these workflows** with specialized agents that understand Australian tax law, GST compliance, and accounting practices.

---

## Why LedgerBot?

### 8 Generalized Agents

Each agent is designed for specific accounting workflows:

| Agent | Purpose | Key Features |
|-------|---------|--------------|
| **Document Processing** | Invoice/receipt intake | OCR extraction, validation queues, auto-categorization |
| **Reconciliations** | Bank feed matching | Fuzzy logic suggestions, ledger adjustment proposals |
| **Compliance Assistant** | ATO obligations | BAS reminders, payroll compliance, super lodgments |
| **Analytics** | Financial reporting | KPI narratives, drill-down tables, export-ready reports |
| **Forecasting** | Cash flow modeling | Scenario planning, runway projections, workflows |
| **Regulatory Q&A** | Tax & employment law | ATO rulings, Fair Work awards, confidence-scored answers |
| **Workflow Supervisor** | Multi-agent orchestration | Cross-agent automation, traceability, error handling |

### Native Xero Integration

- **OAuth2 Connection**: Secure, encrypted token storage with automatic refresh
- **Real-Time Data**: Access invoices, contacts, accounts, bank transactions, journal entries
- **Natural Language Queries**:
  - "Show me all unpaid invoices from last month"
  - "List customers with overdue balances over $1,000"
  - "What's my organisation's current GST liability?"

### Built for Australian Compliance

- **GST-Aware Calculations**: Automatic GST treatment for transactions
- **BAS Lodgment Tracking**: Automated reminders and preparation assistance
- **Fair Work Awards**: Minimum wage calculations and entitlement guidance
- **State Payroll Tax**: Multi-state compliance support (NSW, VIC, QLD, etc.)
- **ATO Terminology**: Uses Australian accounting standards (e.g., "creditor" not "accounts payable")

### Multi-Model Support

Choose the appropriate model for each task:

- **Claude Sonnet 4.5**: Balanced general-purpose reasoning (default)
- **Claude Haiku 4.5**: Fast, lightweight responses
- **GPT-5**: OpenAI's flagship model
- **GPT-5 Mini**: Cost-efficient for simple queries
- **Gemini 2.5 Flash**: Speed-optimized with extended reasoning

### Development Environment

- **Next.js 15** with Partial Prerendering (PPR)
- **Vercel AI SDK** with AI Gateway for multi-provider routing
- **PostgreSQL + Drizzle ORM** for type-safe database queries
- **Clerk Authentication** with automatic user sync
- **Playwright Testing** with comprehensive E2E coverage
- **Ultracite Linting** (Biome-based) for strict code quality

---

## Quick Start

### For End Users

1. **Visit the hosted app**: [ledgerbot.co](https://ledgerbot.co) *(hosted version coming soon)*
2. **Sign up** with your email, Google, or Microsoft account
3. **Connect Xero** (optional but recommended for full features)
4. **Start chatting**:
   - "Show me all unpaid invoices from last month"
   - "What's the minimum wage for a Level 3 retail worker?"
   - "Help me prepare my BAS for Q2 2025"

## Technology Stack

| Category | Technology | Purpose |
|----------|-----------|---------|
| **Framework** | Next.js 16, React 19, TypeScript 5 | App framework with server actions |
| **AI Providers** | Anthropic Claude, OpenAI GPT-5, Google Gemini | Multi-model AI responses |
| **AI SDK** | Vercel AI SDK with AI Gateway | Unified AI provider interface |
| **Database** | PostgreSQL + Drizzle ORM | Type-safe database operations |
| **Authentication** | Clerk | Secure user management with OAuth |
| **Storage** | Vercel Blob | File uploads (invoices, receipts) |
| **Integrations** | Xero OAuth2, Model Context Protocol (MCP) | Accounting software connections |
| **Monitoring** | TokenLens | AI token usage tracking & cost analysis |
| **Testing** | Playwright | End-to-end browser testing |
| **Code Quality** | Ultracite (Biome) | Fast linting and formatting |
| **Deployment** | Vercel | Edge runtime with global CDN |

---

## Features

### Intelligent Chat Interface

- **Persistent History**: All conversations stored with full context
- **Multi-Part Messages**: Rich attachments, code blocks, images
- **Streaming Responses**: Real-time AI output with token tracking
- **Message Voting**: Upvote/downvote for response quality
- **Model Selection**: Switch between Claude, GPT-5, Gemini mid-conversation
- **Reasoning Mode**: Complex query processing for accounting problems

### Artifact System

AI-generated content appears in a side panel with real-time updates:

- **Text Documents**: Meeting notes, policy docs, client summaries
- **Code Artifacts**: Python scripts for data analysis, financial models
- **Spreadsheets**: Budget templates, expense trackers, cashflow projections
- **Image Generation**: Charts, diagrams, invoice mockups

### Context File Management

Upload documents to provide AI with business-specific context:

- **Supported Formats**: PDF, DOCX, XLSX, images (JPEG, PNG, GIF, WebP)
- **OCR Extraction**: Automatic text extraction from scanned documents
- **Token Tracking**: Smart context window management
- **Pin Files**: Keep important docs (chart of accounts, policies) always available
- **Storage Quotas**: Per-user limits with usage tracking

### User Personalization

Customize LedgerBot to match your workflow:

- **Default AI Model**: Choose preferred model for new chats
- **Reasoning Preferences**: Auto-enable for complex queries
- **Custom System Prompts**: Tailor AI personality and expertise
- **Industry Templates**: Pre-built prompts for retail, professional services, construction, etc.
- **Chat Suggestions**: Configure quick-start questions

### Usage Analytics

Track AI consumption and costs:

- **Token Metrics**: Input/output tokens per chat, per model
- **Cost Breakdown**: Real-time spending by provider (Claude, GPT, Gemini)
- **Model Catalog**: Cached pricing data with 24h revalidation
- **Usage History**: Daily/weekly/monthly consumption trends

---
- **Agent-Specific Metrics**:
  - Docs processed this week
  - Reconciliation match rate
  - Upcoming compliance lodgments
  - Forecasting accuracy
- **Change Management**: Release tracking, risk register, recommended actions

---

## 🔌 Xero Integration

LedgerBot uses **OAuth2 Authorization Code Flow** (with client secret) for secure Xero connections.

### Setup

1. Create a Xero app at [developer.xero.com](https://developer.xero.com)
2. Add environment variables:
   ```bash
   XERO_CLIENT_ID=your_xero_client_id
   XERO_CLIENT_SECRET=your_xero_client_secret
   XERO_REDIRECT_URI=http://localhost:3000/api/xero/callback
   XERO_ENCRYPTION_KEY=32_byte_hex_key_for_aes256
   ```
3. Visit `/settings/integrations` in the app
4. Click "Connect Xero" and authorize

### Available API Endpoints

Once connected, the AI can call these Xero operations via chat:

| Tool | Description | Example Query |
|------|-------------|---------------|
| `xero_list_invoices` | Get invoices with filters | *"Show unpaid invoices from last month"* |
| `xero_get_invoice` | Detailed invoice by ID | *"Get details for invoice INV-001"* |
| `xero_list_contacts` | Search customers/suppliers | *"List all customers in Sydney"* |
| `xero_get_contact` | Detailed contact info | *"Show me details for ACME Corp"* |
| `xero_list_accounts` | Chart of accounts | *"What expense accounts do I have?"* |
| `xero_list_journal_entries` | Manual journals | *"Show journals posted this week"* |
| `xero_get_bank_transactions` | Bank transactions | *"Get all deposits from last month"* |
| `xero_get_organisation` | Organisation details | *"What's my Xero organisation name?"* |

### Security

- **Token Encryption**: AES-256-GCM encryption for OAuth tokens at rest
- **Automatic Refresh**: Tokens refreshed automatically when expiring within 5 minutes
- **State Verification**: CSRF protection with Base64-encoded state parameter
- **Scope Management**: Request only necessary permissions (no write access by default)

### OAuth Scopes

```
offline_access               # Refresh token support
accounting.transactions      # Read invoices, bills, payments
accounting.contacts          # Read customers, suppliers
accounting.settings          # Organisation settings, chart of accounts
accounting.reports.read      # Financial reports
accounting.journals.read     # Journal entries
accounting.attachments       # File attachments
payroll.employees           # Employee records
payroll.payruns             # Pay run data
payroll.timesheets          # Timesheet records
```

See [`docs/xero-authentication-guide.md`](docs/xero-authentication-guide.md) for detailed implementation notes.

---

## Usage Examples

### Example 1: Query Xero Invoices

```typescript
// User asks in chat: "Show me all unpaid invoices from September 2025"

// LedgerBot automatically calls:
const response = await xeroMcpClient.executeTool('xero_list_invoices', {
  status: 'UNPAID',
  dateFrom: '2025-09-01',
  dateTo: '2025-09-30'
});

// Returns formatted table with invoice numbers, amounts, due dates
```

### Example 2: Ask Regulatory Question

```typescript
// User asks in Q&A agent: "What's the minimum wage for a Level 3 retail worker?"

// LedgerBot searches Fair Work awards and returns:
{
  answer: "$25.41 per hour as of July 1, 2024",
  citation: "Retail Industry Award 2020 [MA000004], Schedule B",
  confidence: 95,
  source_url: "https://www.fairwork.gov.au/pay/minimum-wages"
}
```

### Example 3: Create Financial Forecast

```typescript
// In forecasting agent workspace
const forecast = await createDocument({
  kind: 'sheet',
  title: 'Q4 2025 Cash Flow Forecast',
  content: [
    ['Month', 'Revenue', 'Expenses', 'Net Cash Flow', 'Cumulative'],
    ['October', 125000, 98000, 27000, 27000],
    ['November', 142000, 102000, 40000, 67000],
    ['December', 168000, 115000, 53000, 120000]
  ]
});
```

### Example 4: Chat with Context Files

```typescript
// Upload chart of accounts PDF → Ask questions

// User: "Which GL code should I use for software subscriptions?"
// AI reads uploaded chart of accounts → Returns: "Use 6420 - Software Subscriptions"
```

---

## For Developers

### Project Structure

```
ledgerbot/
├── app/
│   ├── (auth)/              # Authentication routes (Clerk)
│   ├── (chat)/              # Main chat interface & API
│   │   └── api/
│   │       ├── chat/        # Chat endpoint with streaming
│   │       ├── document/    # Document CRUD
│   │       ├── files/       # File upload handler
│   │       ├── history/     # Chat history
│   │       └── suggestions/ # Document suggestions
│   ├── (settings)/          # User settings & management
│   │   └── settings/
│   │       ├── personalisation/  # AI model preferences
│   │       ├── usage/            # Usage analytics
│   │       ├── integrations/     # Xero, MCP connections
│   │       ├── files/            # Context file management
│   │       └── agents/           # Agent configuration
│   ├── agents/              # Specialized agent workspaces
│   │   ├── analytics/
│   │   ├── compliance/
│   │   ├── docmanagement/
│   │   ├── forecasting/
│   │   ├── qanda/
│   │   ├── reconciliations/
│   │   └── workflow/
│   └── api/
│       ├── context-files/   # Context file upload/processing
│       ├── regulatory/      # Regulatory knowledge base
│       ├── user/            # User settings API
│       └── xero/            # Xero OAuth flow
├── components/
│   ├── agents/              # Agent-specific components
│   ├── ui/                  # Reusable UI components (Radix)
│   ├── chat.tsx
│   ├── artifact.tsx
│   └── multimodal-input.tsx
├── lib/
│   ├── ai/
│   │   ├── providers.ts     # AI Gateway config
│   │   ├── models.ts        # Available chat models
│   │   ├── prompts.ts       # System prompts
│   │   ├── context-manager.ts  # Context file selection
│   │   ├── tools/           # AI tool implementations
│   │   ├── xero-mcp-client.ts  # Xero MCP integration
│   │   └── xero-tools.ts    # Xero AI SDK wrappers
│   ├── auth/                # Clerk helpers
│   ├── db/                  # Database schema & queries
│   ├── files/               # File processing
│   └── xero/                # Xero OAuth & encryption
├── prompts/
│   ├── default-system-prompt.md  # Main AI personality
│   └── README.md                 # Prompt maintenance guide
├── tests/                   # Playwright E2E tests
├── public/                  # Static assets
├── .env.example             # Environment template
├── biome.jsonc              # Ultracite linting config
├── drizzle.config.ts        # Database config
├── next.config.ts           # Next.js config
├── playwright.config.ts     # Test config
└── package.json
```

### Development Commands

```bash
# Development
pnpm dev                 # Start dev server with Turbo
pnpm build              # Run migrations and production build
pnpm start              # Start production server

# Code Quality
pnpm lint               # Run Ultracite linter/checker
pnpm format             # Auto-fix with Ultracite

# Database
pnpm db:generate        # Generate Drizzle migrations
pnpm db:migrate         # Run migrations
pnpm db:studio          # Launch Drizzle Studio (DB GUI)
pnpm db:push            # Push schema changes
pnpm db:pull            # Pull schema from database

# Testing
pnpm test               # Run Playwright E2E tests
```

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
4. Add to `experimental_activeTools` array if needed

### Adding a New Agent Workspace

1. Create directory: `app/agents/your-agent/`
2. Create `page.tsx` with agent UI:

```typescript
export default async function YourAgentPage() {
  return (
    <div>
      <h1>Your Agent Name</h1>
      {/* Agent-specific UI */}
    </div>
  );
}
```

3. Add entry to `agentSnapshots` in `app/agents/page.tsx`:

```typescript
{
  title: 'Your Agent',
  description: 'Brief description',
  href: '/agents/your-agent',
  icon: IconName,
  metrics: { /* agent-specific metrics */ }
}
```

4. Create settings section in `app/(settings)/settings/agents/page.tsx`

### Database Schema Changes

1. Modify `lib/db/schema.ts`:

```typescript
export const yourTable = pgTable('your_table', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => User.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
```

2. Generate migration: `pnpm db:generate`
3. Review migration in `lib/db/migrations/`
4. Apply locally: `pnpm db:migrate`
5. Production migrations run automatically during build

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    LedgerBot Architecture                │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Frontend: Next.js 15 App Router + React 19 + Tailwind │
│  ├── Server Components (RSC) for fast initial loads    │
│  ├── Client Components for interactive UI              │
│  └── Server Actions for mutations                      │
│                          ↓                               │
│  API Layer: Next.js Route Handlers                     │
│  ├── /api/chat - Streaming AI responses                │
│  ├── /api/xero/* - OAuth flow & API proxy              │
│  ├── /api/context-files - Document upload/processing   │
│  └── /api/regulatory - Knowledge base (planned)        │
│                          ↓                               │
│  AI Gateway: Vercel AI SDK with AI Gateway             │
│  ├── Multi-provider routing (Claude, GPT-5, Gemini)    │
│  ├── TokenLens integration (usage tracking)            │
│  ├── Streaming with tool execution                     │
│  └── Model catalog caching (24h revalidation)          │
│                          ↓                               │
│  Specialized Agents: 7 Accounting Workspaces           │
│  ├── Document Processing (OCR, validation)             │
│  ├── Reconciliations (fuzzy matching)                  │
│  ├── Compliance (BAS, payroll, super)                  │
│  ├── Analytics (KPI narratives, exports)               │
│  ├── Forecasting (scenario modeling)                   │
│  ├── Regulatory Q&A (citations, confidence)            │
│  └── Workflow Supervisor (orchestration)               │
│                          ↓                               │
│  Integrations                                           │
│  ├── Xero OAuth2 (encrypted token storage)             │
│  ├── Model Context Protocol (MCP) servers              │
│  └── Vercel Blob (file uploads)                        │
│                          ↓                               │
│  Data Layer                                             │
│  ├── PostgreSQL (user data, chats, documents)          │
│  ├── Drizzle ORM (type-safe queries)                   │
│  ├── Clerk (authentication, user management)           │
│  └── Redis (optional, resumable streams)               │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

1. **Server-First Rendering**: Next.js 15 with PPR for instant page loads
2. **Multi-Model Support**: No vendor lock-in, users choose preferred AI
3. **Agent Specialization**: Each agent has dedicated UI and workflows
4. **Encrypted Token Storage**: AES-256-GCM for OAuth tokens at rest
5. **Type-Safe Database**: Drizzle ORM with full TypeScript inference
6. **Edge-Ready**: Deployed to Vercel Edge runtime for global performance

---

## Security & Compliance

### Authentication
- **Clerk Integration**: Secure JWT-based authentication
- **OAuth2 Tokens**: Encrypted with AES-256-GCM at rest
- **CSRF Protection**: State parameter validation in OAuth flows
- **User Sync**: Automatic database sync on first Clerk login

### Data Security
- **Database Encryption**: PostgreSQL with encryption at rest
- **Blob Storage**: Vercel Blob with signed URLs (10MB max per file)
- **Token Refresh**: Automatic refresh when expiring within 5 minutes
- **Rate Limiting**: Per-user entitlement enforcement

### Compliance
- **Data Residency**: PostgreSQL can be hosted in Australia (configurable)
- **Audit Trail**: Full chat, document, and agent action history
- **Usage Tracking**: Token consumption and cost breakdown per user
- **ATO Awareness**: Built-in GST, BAS, and compliance rule validation

### Privacy
- **No Training on User Data**: AI providers don't train on LedgerBot conversations
- **Data Deletion**: Users can delete chats and documents anytime
- **Transparent Logging**: All AI tool calls visible in chat history

### Priority Areas for Contribution

🐛 **Bug Fixes**
- Agent workspace errors
- Xero API edge cases
- UI/UX polish

📚 **Documentation**
- Usage guides for new users
- API documentation
- Video tutorials

🧪 **Testing**
- E2E tests for agent workflows
- Xero integration test coverage
- Edge case handling

🎨 **UI/UX**
- Accessibility improvements
- Mobile responsiveness
- Dark mode enhancements

🤖 **New Agents**
- Budgeting agent
- Payroll agent
- Inventory tracking

---

## Support & Contact

- **Bug Reports**: [GitHub Issues](https://github.com/hiltonbrown/ledgerbot/issues)
- **Feature Requests**: [GitHub Discussions](https://github.com/hiltonbrown/ledgerbot/discussions)

---

**Built in Australia for accountants and bookkeepers everywhere**

*Last updated: 7 December 2025*

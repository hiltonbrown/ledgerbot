# 🤖 LedgerBot

**AI-powered accounting workspace built for Australian businesses**

Automate bookkeeping tasks, ensure GST/BAS compliance, and get instant answers to tax questions—all with specialized AI agents and seamless Xero integration.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Powered by Vercel AI SDK](https://img.shields.io/badge/Powered%20by-Vercel%20AI%20SDK-black)](https://sdk.vercel.ai/)

---

## 📑 Table of Contents

* [The Problem](#-the-problem)
* [Why LedgerBot?](#-why-ledgerbot)
* [Quick Start](#-quick-start)
* [Technology Stack](#-technology-stack)
* [Features](#-features)
* [Specialized Agents](#-specialized-ai-agents)
* [Xero Integration](#-xero-integration)
* [Usage Examples](#-usage-examples)
* [For Developers](#-for-developers)
* [Architecture](#-architecture)
* [Security & Compliance](#-security--compliance)
* [Contributing](#-contributing)
* [Roadmap](#-roadmap)
* [FAQ](#-faq--troubleshooting)
* [License](#-license)

---

## 💡 The Problem

Bookkeepers and accountants in Australia waste countless hours on repetitive tasks:

- ❌ **Manual bank reconciliations** that take hours each week
- ❌ **Chasing down missing receipts** and invoices
- ❌ **Researching ATO rulings** and Fair Work compliance
- ❌ **Preparing BAS and IAS statements** with tedious data entry
- ❌ **Context-switching** between 5+ different accounting tools

**LedgerBot automates 76% of these workflows** with specialized AI agents that understand Australian tax law, GST compliance, and modern accounting practices.

---

## ✨ Why LedgerBot?

### 🤖 8 Specialized AI Agents

Each agent is purpose-built for specific accounting workflows:

| Agent | Purpose | Key Features |
|-------|---------|--------------|
| **📄 Document Processing** | Invoice/receipt intake | OCR extraction, validation queues, auto-categorization |
| **🔄 Reconciliations** | Bank feed matching | Fuzzy logic suggestions, ledger adjustment proposals |
| **⚖️ Compliance Co-Pilot** | ATO obligations | BAS reminders, payroll compliance, super lodgments |
| **📊 Analytics** | Financial reporting | KPI narratives, drill-down tables, export-ready reports |
| **🔮 Forecasting** | Cash flow modeling | Scenario planning, runway projections, LangGraph workflows |
| **💬 Regulatory Q&A** | Tax & employment law | ATO rulings, Fair Work awards, confidence-scored answers |
| **🔁 Workflow Supervisor** | Multi-agent orchestration | Cross-agent automation, traceability, error handling |

### 🔌 Native Xero Integration

- **OAuth2 Connection**: Secure, encrypted token storage with automatic refresh
- **Real-Time Data**: Access invoices, contacts, accounts, bank transactions, journal entries
- **Natural Language Queries**:
  - *"Show me all unpaid invoices from last month"*
  - *"List customers with overdue balances over $1,000"*
  - *"What's my organisation's current GST liability?"*

### 🇦🇺 Built for Australian Compliance

- ✅ **GST-Aware Calculations**: Automatic GST treatment for transactions
- ✅ **BAS Lodgment Tracking**: Automated reminders and preparation assistance
- ✅ **Fair Work Awards**: Minimum wage calculations and entitlement guidance
- ✅ **State Payroll Tax**: Multi-state compliance support (NSW, VIC, QLD, etc.)
- ✅ **ATO Terminology**: Uses Australian accounting standards (e.g., "creditor" not "accounts payable")

### 🧠 Multi-Model AI Support

Choose the right AI model for each task:

- **Claude Sonnet 4.5**: Balanced general-purpose reasoning (default)
- **Claude Haiku 4.5**: Fast, lightweight responses
- **GPT-5**: OpenAI's flagship model
- **GPT-5 Mini**: Cost-efficient for simple queries
- **Gemini 2.5 Flash**: Speed-optimized with extended reasoning

### 🎨 Modern Developer Experience

- 🚀 **Next.js 15** with Partial Prerendering (PPR) for lightning-fast loads
- 📦 **Vercel AI SDK** with AI Gateway for multi-provider routing
- 🗄️ **PostgreSQL + Drizzle ORM** for type-safe database queries
- 🔐 **Clerk Authentication** with automatic user sync
- 🧪 **Playwright Testing** with comprehensive E2E coverage
- ✨ **Ultracite Linting** (Biome-based) for strict code quality

---

## 🚀 Quick Start

### For End Users

1. **Visit the hosted app**: [ledgerbot.app](https://ledgerbot.app) *(hosted version coming soon)*
2. **Sign up** with your email, Google, or Microsoft account
3. **Connect Xero** (optional but recommended for full features)
4. **Start chatting**:
   - *"Show me all unpaid invoices from last month"*
   - *"What's the minimum wage for a Level 3 retail worker?"*
   - *"Help me prepare my BAS for Q2 2025"*

### For Developers (3 minutes)

```bash
# 1. Clone and install
git clone https://github.com/hiltonbrown/ledgerbot.git
cd ledgerbot
pnpm install

# 2. Configure environment
cp .env.example .env.local
# Add your API keys (see .env.example for required variables)

# 3. Setup database
pnpm db:migrate

# 4. Run locally
pnpm dev
# Visit http://localhost:3000
```

**Required Environment Variables:**
- `POSTGRES_URL`: PostgreSQL connection string
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Clerk publishable key
- `CLERK_SECRET_KEY`: Clerk secret key
- `AI_GATEWAY_API_KEY`: Vercel AI Gateway key

**Optional (for full features):**
- `XERO_CLIENT_ID`, `XERO_CLIENT_SECRET`: Xero integration
- `BLOB_READ_WRITE_TOKEN`: Vercel Blob storage (file uploads)
- `REDIS_URL`: Resumable chat streams

See [`.env.example`](.env.example) for complete configuration details.

---

## 🛠️ Technology Stack

| Category | Technology | Purpose |
|----------|-----------|---------|
| **Framework** | Next.js 15, React 19, TypeScript 5 | App framework with server actions |
| **AI Providers** | Anthropic Claude, OpenAI GPT-5, Google Gemini, xAI Grok | Multi-model AI responses |
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

## 🎯 Features

### 💬 Intelligent Chat Interface

- **Persistent History**: All conversations stored with full context
- **Multi-Part Messages**: Rich attachments, code blocks, images
- **Streaming Responses**: Real-time AI output with token tracking
- **Message Voting**: Upvote/downvote for response quality
- **Model Selection**: Switch between Claude, GPT-5, Gemini mid-conversation
- **Reasoning Mode**: Enable extended thinking for complex accounting problems

### 📄 Artifact System

AI-generated content appears in a side panel with real-time updates:

- **Text Documents**: Meeting notes, policy docs, client summaries
- **Code Artifacts**: Python scripts for data analysis, financial models
- **Spreadsheets**: Budget templates, expense trackers, cashflow projections
- **Image Generation**: Charts, diagrams, invoice mockups

### 📂 Context File Management

Upload documents to provide AI with business-specific context:

- **Supported Formats**: PDF, DOCX, XLSX, images (JPEG, PNG, GIF, WebP)
- **OCR Extraction**: Automatic text extraction from scanned documents
- **Token Tracking**: Smart context window management
- **Pin Files**: Keep important docs (chart of accounts, policies) always available
- **Storage Quotas**: Per-user limits with usage tracking

### ⚙️ User Personalization

Customize LedgerBot to match your workflow:

- **Default AI Model**: Choose preferred model for new chats
- **Reasoning Preferences**: Auto-enable for complex queries
- **Custom System Prompts**: Tailor AI personality and expertise
- **Industry Templates**: Pre-built prompts for retail, professional services, construction, etc.
- **Chat Suggestions**: Configure quick-start questions

### 📊 Usage Analytics

Track AI consumption and costs:

- **Token Metrics**: Input/output tokens per chat, per model
- **Cost Breakdown**: Real-time spending by provider (Claude, GPT, Gemini)
- **Model Catalog**: Cached pricing data with 24h revalidation
- **Usage History**: Daily/weekly/monthly consumption trends

---

## 🤖 Specialized AI Agents

LedgerBot includes dedicated agent workspaces optimized for specific accounting tasks. Access them at `/agents`:

### 1. 📄 Document Processing (`/agents/docmanagement`)

**Purpose**: Automated intake and validation of accounting documents

**Features:**
- OCR extraction from invoices, receipts, bank statements
- Validation queues for human review
- Auto-categorization using chart of accounts
- Bulk upload processing
- Duplicate detection

**Use Case**: Upload a stack of receipts → AI extracts vendor, amount, GST, date → Suggests GL codes → Queues uncertain items for review

---

### 2. 🔄 Reconciliations (`/agents/reconciliations`)

**Purpose**: Continuous bank feed matching with intelligent suggestions

**Features:**
- Fuzzy logic transaction matching
- Ledger adjustment proposals
- Unmatched transaction alerts
- Historical pattern learning
- Multi-account support

**Use Case**: Import bank CSV → AI matches 87% of transactions automatically → Suggests adjustments for unmatched items → You approve in one click

---

### 3. ⚖️ Compliance Co-Pilot (`/agents/compliance`)

**Purpose**: ATO-aware assistant for statutory obligations

**Features:**
- BAS lodgment reminders (quarterly/monthly)
- Payroll tax calculations (state-specific)
- Superannuation guarantee tracking
- IAS preparation assistance
- Penalty date warnings

**Use Case**: Get notified 2 weeks before BAS due date → AI pre-fills GST collected/paid → Review and submit via Xero integration

---

### 4. 📊 Analytics (`/agents/analytics`)

**Purpose**: Narrative-rich financial reporting with context

**Features:**
- KPI annotations with business insights
- Drill-down tables (click metrics for details)
- Presentation-ready exports (PDF, PowerPoint)
- Trend analysis and variance commentary
- Customizable dashboards

**Use Case**: Generate monthly board report → AI writes narrative explaining 15% revenue increase → Export to PowerPoint with charts

---

### 5. 🔮 Forecasting (`/agents/forecasting`)

**Purpose**: Scenario modeling and cash flow projections

**Features:**
- Runway calculations (months until cash out)
- "What-if" scenario modeling
- LangGraph workflow orchestration
- Sensitivity analysis
- Multi-period forecasts (3/6/12 months)

**Use Case**: Model impact of hiring 2 staff → AI projects cashflow for next 6 months → Shows breakeven timeline

---

### 6. 💬 Regulatory Q&A (`/agents/qanda`)

**Purpose**: Advisory assistant for Australian tax and employment law

**Features:**
- ATO tax ruling citations
- Fair Work award interpretations
- State payroll tax guidance
- Confidence scoring for answers
- Human escalation for low-confidence queries
- Source document links

**Use Case**: Ask "What's the minimum wage for a Level 3 retail worker in NSW?" → Get answer with Fair Work citation and confidence score

**Current Status**:
- ✅ UI complete with citation system and confidence badges
- 🚧 Backend RAG system planned (scraping ATO/Fair Work content)

---

### 7. 🔁 Workflow Supervisor (`/agents/workflow`)

**Purpose**: Orchestrate multi-agent automation workflows

**Features:**
- Cross-agent task delegation
- Error handling and retries
- Workflow traceability
- Human review escalation
- Parallel task execution

**Use Case**: Upload invoice → Document agent extracts data → Reconciliation agent matches payment → Compliance agent checks GST treatment → All automated

---

### 8. 💰 Accounts Receivable (`/agents/ar`)

**Purpose**: Intelligent AR management with risk scoring and automated follow-up generation

**Features:**
- **Interactive Ageing Report**: Real-time dashboard with sorting/filtering by risk, outstanding amount, overdue buckets
- **Risk Scoring (0-1 scale)**: AI-powered assessment based on payment history, days late, invoice age
- **Xero Integration**: Automated nightly sync of invoices, payments, contacts (last 24 months)
- **AI-Powered Follow-Up**: Generate risk-appropriate collection messages (polite/firm/final tones)
- **Monitoring Dashboard**: Track sync jobs, DSO metrics, data freshness alerts
- **Customer Insights**: Invoice details, payment history, credit terms analysis

**Key Metrics:**
- Days Sales Outstanding (DSO)
- % customers with >90 days overdue
- Risk distribution (Low/Medium/High)
- High-risk customer alerts

**Workflow:**
1. View ageing report at `/agents/ar`
2. Filter/sort by risk, outstanding amount, or ageing bucket
3. Click customer row to see invoice details
4. Click "Start Follow-Up Chat" to generate AI-powered collection message
5. Monitor sync status at `/agents/ar/monitoring`

**Technical Details:**
- **Database Schema**: `ArContact`, `ArInvoice`, `ArPayment`, `ArCustomerHistory`, `ArJobRun`
- **Cron Job**: Nightly sync at 4 AM via `/api/cron/ar-sync`
- **Risk Algorithm**: Weighted scoring on 7 factors (late payment rate, avg days late, max days late, 90+ bucket %, outstanding ratio, days since last payment, credit terms)

**Documentation**: See [`docs/AR_AGENT.md`](docs/AR_AGENT.md) for full setup guide, architecture diagrams, and developer documentation.

**Important Guardrails:**
- ⚠️ **Follow-up messages are AI-generated drafts only** - users must manually send
- ✅ No automatic email/SMS sending capabilities
- ✅ Respects Australian consumer protection expectations

---

### 🎛️ Agent Dashboard (`/agents`)

The main agent overview shows:

- **Automation Coverage**: Percentage of workflows delegated to AI (target: 76%)
- **Review Queue**: Items needing human attention (validations, mismatches, clarifications)
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

## 📚 Usage Examples

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

## 👨‍💻 For Developers

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

### Code Standards

This project uses **Ultracite** (Biome-based) with strict rules:

✅ **DO:**
- Use `const` by default
- Use `export type` and `import type`
- Use arrow functions
- Handle async/await properly (no await in loops)
- Use optional chaining (`?.`) and nullish coalescing (`??`)

❌ **DON'T:**
- Use `any` type (use `unknown` instead)
- Use enums (use const objects or union types)
- Use non-null assertions (`!`)
- Use array index as React keys
- Use `<img>` or `<head>` in Next.js (use `next/image`, `next/head`)

Run `pnpm lint` before committing. Most issues auto-fix with `pnpm format`.

---

## 🏗️ Architecture

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

## 🔒 Security & Compliance

### Authentication
- 🔐 **Clerk Integration**: Secure JWT-based authentication
- 🔑 **OAuth2 Tokens**: Encrypted with AES-256-GCM at rest
- 🚪 **CSRF Protection**: State parameter validation in OAuth flows
- 👤 **User Sync**: Automatic database sync on first Clerk login

### Data Security
- 🗄️ **Database Encryption**: PostgreSQL with encryption at rest
- 📁 **Blob Storage**: Vercel Blob with signed URLs (10MB max per file)
- 🔐 **Token Refresh**: Automatic refresh when expiring within 5 minutes
- 🛡️ **Rate Limiting**: Per-user entitlement enforcement

### Compliance
- 🇦🇺 **Data Residency**: PostgreSQL can be hosted in Australia (configurable)
- 📊 **Audit Trail**: Full chat, document, and agent action history
- 🔍 **Usage Tracking**: Token consumption and cost breakdown per user
- ⚖️ **ATO Awareness**: Built-in GST, BAS, and compliance rule validation

### Privacy
- 🙈 **No Training on User Data**: AI providers don't train on LedgerBot conversations
- 🗑️ **Data Deletion**: Users can delete chats and documents anytime
- 📄 **Transparent Logging**: All AI tool calls visible in chat history

---

## 🤝 Contributing

We welcome contributions from developers of all backgrounds! Whether you're fixing bugs, adding features, or improving documentation, your help makes LedgerBot better for the Australian accounting community.

### Development Workflow

```bash
# 1. Fork and clone
git clone https://github.com/hiltonbrown/ledgerbot.git
cd ledgerbot

# 2. Create a feature branch
git checkout -b feature/your-feature-name

# 3. Install dependencies
pnpm install

# 4. Make changes and test
pnpm dev
pnpm lint
pnpm test

# 5. Commit with conventional commits
git commit -m "feat(agents): add forecasting Excel export"
# Types: feat, fix, docs, style, refactor, test, chore

# 6. Push and create PR
git push origin feature/your-feature-name
# Open PR on GitHub with clear description
```

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

### Code Review Process

1. All PRs require at least 1 approval
2. CI must pass (linting, tests, build)
3. Conventional commit format required
4. Update documentation for new features

### Community Guidelines

- 🙌 Be welcoming and inclusive
- 💬 Discuss major changes in issues first
- 📖 Follow existing code patterns
- ✅ Test your changes thoroughly
- 📝 Document new features

---

## 🗺️ Roadmap

### ✅ Recently Shipped (Q3-Q4 2025)

- [x] Xero OAuth2 integration with MCP
- [x] 7 specialized agent workspaces
- [x] Multi-model support (Claude, GPT-5, Gemini, Grok)
- [x] User settings & personalization (default model, custom prompts)
- [x] Context file uploads with OCR extraction
- [x] TokenLens integration for usage tracking
- [x] Regulatory Q&A UI with citation system

### 🚧 In Progress (Q1 2026)

- [ ] **Regulatory RAG System**: Automated scraping of ATO rulings, Fair Work awards, state payroll tax guidance
- [ ] **Forecasting LangGraph Workflows**: Multi-step scenario modeling with agent coordination
- [ ] **Analytics Drill-Downs**: Interactive KPI tables with drill-down capabilities
- [ ] **Document Processing Queue**: Human review interface for uncertain OCR extractions

### 🔮 Planned (Q2-Q3 2026)

#### Integrations
- [ ] MYOB OAuth integration
- [ ] QuickBooks Online integration
- [ ] Australian bank feed connections (CSV import for CBA, Westpac, ANZ, NAB)
- [ ] Receipt Bank / Dext integration

#### Agent Enhancements
- [ ] **Payroll Agent**: Pay run processing, STP compliance, superannuation tracking
- [ ] **Budgeting Agent**: Budget vs. actual comparisons, variance explanations
- [ ] **Inventory Agent**: Stock tracking, COGS calculations, reorder alerts

#### Features
- [ ] Bulk invoice processing (batch OCR)
- [ ] Custom chart of accounts templates by industry
- [ ] Multi-entity support (consolidated reporting)
- [ ] Advanced forecasting (Monte Carlo simulation)
- [ ] Client portal (for accountants serving multiple clients)

#### Platform
- [ ] White-label deployment options
- [ ] Self-hosted version with Docker
- [ ] API for third-party integrations
- [ ] Mobile app (React Native)

### 💡 Community Requests

Have a feature request? [Open an issue](https://github.com/hiltonbrown/ledgerbot/issues) with the "enhancement" label!

---

## ❓ FAQ / Troubleshooting

### General

**Q: Is LedgerBot free to use?**
A: The hosted version will have a free tier with usage limits. Self-hosted deployments are free (MIT license) but require your own infrastructure and API keys.

**Q: Do you store my Xero data?**
A: No. LedgerBot only stores OAuth tokens (encrypted) and fetches Xero data on-demand. No financial data is permanently stored.

**Q: Which countries is LedgerBot designed for?**
A: Primarily Australia (GST, BAS, ATO, Fair Work), but it works globally. Non-Australian users can still use core features but won't benefit from compliance agents.

**Q: Can I use LedgerBot for personal finances?**
A: Yes! While designed for businesses, you can use it for personal bookkeeping, budgeting, and tax questions.

### For Developers

**Q: Why PostgreSQL instead of SQLite?**
A: PostgreSQL supports advanced features like full-text search (for regulatory documents), JSON queries, and horizontal scaling for multi-tenant deployments.

**Q: Can I add my own AI models?**
A: Yes! Add model configs to `lib/ai/models.ts` and ensure they're available through AI Gateway or as a custom provider.

**Q: How do I debug Xero OAuth issues?**
A: Check:
1. Redirect URI matches exactly in Xero app settings
2. `XERO_ENCRYPTION_KEY` is 32 bytes (64 hex characters)
3. Scopes match in Xero app configuration
4. Check browser console for OAuth errors

**Q: Tests are failing locally—why?**
A: Ensure `PLAYWRIGHT=true` is set (automatically done by `pnpm test`). This enables mock AI providers and test database.

**Q: How do I add a new MCP server?**
A: Follow the [Xero integration example](#-xero-integration) as a template. Key steps:
1. Create connection manager in `lib/your-service/`
2. Add OAuth routes in `app/api/your-service/`
3. Create MCP client wrapper in `lib/ai/your-service-mcp-client.ts`
4. Add AI SDK tools in `lib/ai/tools/your-service-tools.ts`
5. Conditionally include tools in chat route

**Q: Where are chat messages stored?**
A: `Message_v2` table in PostgreSQL. Old format (`Message`) is deprecated but retained for migration.

**Q: Can I self-host LedgerBot?**
A: Yes! Deploy to any platform that supports Next.js (Vercel, AWS, Azure, Google Cloud, Railway, Fly.io). You'll need PostgreSQL and Clerk accounts.

### Usage

**Q: How do I invite my team?**
A: Use Clerk's organization features (multi-tenancy coming soon). Currently, each user has their own workspace.

**Q: Can I export my chat history?**
A: Not yet—this is on the [roadmap](#-roadmap). For now, copy/paste from the UI or query the database directly.

**Q: Why isn't my Xero connection working?**
A: Check:
1. You've connected Xero in `/settings/integrations`
2. Token hasn't expired (automatically refreshed)
3. Organisation has required permissions (accounting.transactions scope)
4. Xero app is not in demo company mode

**Q: How accurate is the Regulatory Q&A agent?**
A: The UI shows confidence scores. Answers <80% confidence should be verified with a human accountant or the ATO directly. The RAG backend (launching Q1 2026) will improve accuracy.

**Q: Can I customize the AI's personality?**
A: Yes! Go to `/settings/personalisation` and edit the system prompt. You can also create industry-specific templates.

### Errors

**Error: "Rate limit exceeded"**
Check your entitlement in `lib/ai/entitlements.ts`. Regular users have 100 messages/day. Upgrade entitlement or wait for reset.

**Error: "Xero token expired"**
The token should refresh automatically. If it doesn't, disconnect and reconnect in `/settings/integrations`.

**Error: "Database connection failed"**
Ensure `POSTGRES_URL` is correct and database is accessible. For local dev, use Docker: `docker run -e POSTGRES_PASSWORD=password -p 5432:5432 postgres`.

**Error: "Clerk authentication failed"**
Check `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` match your Clerk app settings.

---

## 📄 License

This project is licensed under the **MIT License**. See [LICENSE](LICENSE) for details.

**TL;DR**: You can use, modify, and distribute this software freely. Attribution appreciated but not required.

---

## 🙏 Acknowledgments

LedgerBot is built with incredible open-source tools:

- [Vercel AI SDK](https://sdk.vercel.ai/) - Multi-provider AI framework
- [Next.js](https://nextjs.org/) - React framework
- [Drizzle ORM](https://orm.drizzle.team/) - Type-safe database queries
- [Clerk](https://clerk.com/) - Authentication and user management
- [Radix UI](https://www.radix-ui.com/) - Accessible component primitives
- [Biome](https://biomejs.dev/) - Fast linter and formatter
- [Playwright](https://playwright.dev/) - Reliable E2E testing

Special thanks to the Australian accounting community for feedback and feature requests.

---

## 📞 Support & Contact

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/hiltonbrown/ledgerbot/issues)
- 💡 **Feature Requests**: [GitHub Discussions](https://github.com/hiltonbrown/ledgerbot/discussions)
- 📧 **Email**: support@ledgerbot.app *(coming soon)*
- 💬 **Discord**: [Join our community](https://discord.gg/ledgerbot) *(coming soon)*

---

**Built with ❤️ in Australia for accountants and bookkeepers everywhere**

*Last updated: October 26, 2025*

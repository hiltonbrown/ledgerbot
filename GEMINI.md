# LedgerBot Context for Gemini

## Project Overview

**LedgerBot** is an AI-powered accounting workspace tailored for Australian businesses. It automates bookkeeping tasks, ensures GST/BAS compliance, and integrates directly with **Xero**.

The application uses specialized AI agents for different domains (Accounts Payable, Accounts Receivable, Analytics, etc.) and allows users to interact via a chat interface that supports text, code, and spreadsheet artifacts.

**Key Features:**
-   **Multi-Tenancy:** Supports managing multiple Xero organizations (tenants) from a single account.
-   **Agentic AI:** Specialized agents for AP, AR, Data Validation, Forecasting, and more.
-   **Real-time Sync:** Efficient bi-directional synchronization with Xero using Drizzle ORM and Postgres.
-   **ABN/GST Lookup:** Integrated tools for verifying Australian Business Numbers and GST status.

## Technology Stack

-   **Framework:** Next.js 16 (App Router, Server Actions, PPR)
-   **Language:** TypeScript 5
-   **AI SDK:** Vercel AI SDK (with AI Gateway for Multi-LLM support: Claude, OpenAI, Gemini)
-   **Database:** PostgreSQL with **Drizzle ORM**
-   **Authentication:** Clerk
-   **Integration:** Xero OAuth2 (Multi-tenant support)
-   **Styling:** Tailwind CSS (v4), Radix UI, Lucide Icons
-   **Testing:** Playwright (E2E), Vitest (Unit)
-   **Linting/Formatting:** Ultracite (Biome wrapper)
-   **Package Manager:** pnpm

## Project Structure

```text
/
├── app/                  # Next.js App Router
│   ├── (auth)/           # Login/Register routes (Clerk)
│   ├── (chat)/           # Main chat interface & API
│   ├── (settings)/       # Settings pages (Personalisation, Usage, Integrations)
│   ├── agents/           # Specialized Agent Workspaces (UI)
│   │   ├── ap/           # Accounts Payable Agent
│   │   ├── ar/           # Accounts Receivable Agent
│   │   ├── analytics/    # Analytics Agent
│   │   ├── datavalidation/ # Data Integrity & Validation Agent
│   │   ├── docmanagement/  # Document Management Agent
│   │   ├── forecasting/    # Cash Flow Forecasting Agent
│   │   ├── qanda/          # Q&A / Regulatory Agent
│   │   └── workflow/       # Workflow Automation Agent
│   └── api/              # API Routes (Xero, Webhooks, etc.)
├── components/           # React Components
│   ├── ui/               # Reusable UI elements (Radix)
│   ├── agents/           # Agent-specific components
│   └── ...
├── lib/                  # Shared Utilities & Business Logic
│   ├── ai/               # AI Providers, Tools, Prompts
│   │   ├── tools/        # MCP & Standard Tools (ABN, Xero, etc.)
│   ├── db/               # Drizzle Schema & Migrations
│   ├── agents/           # Agent Logic (Backend)
│   └── xero/             # Xero Integration Logic (Sync, Rate Limits, Tenants)
├── prompts/              # System Prompts (Markdown)
│   ├── ledgerbot-system-prompt.md # Core persona
│   ├── ap-system-prompt.md        # AP Agent persona
│   └── ...
├── tests/                # Playwright E2E Tests
└── drizzle.config.ts     # Drizzle Config
```

## Key Development Commands

| Command | Description |
| :--- | :--- |
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm lint` | Run linter (Ultracite/Biome) |
| `pnpm format` | Fix linting/formatting issues |
| `pnpm test` | Run Playwright E2E tests |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:migrate` | Apply migrations to DB |
| `pnpm db:studio` | Open Drizzle Studio (DB GUI) |

## Database Schema (`lib/db/schema.ts`)

The database is managed via Drizzle ORM. Key tables include:

-   **User:** User identity (synced with Clerk).
-   **Chat / Message:** Chat history and message content (supports v2 multi-part messages).
-   **AgentTrace:** Logs of agent tool usage and performance.
-   **Document:** AI-generated artifacts (Text, Code, Sheets).
-   **ContextFile:** User-uploaded files for RAG.
-   **RegulatoryDocument:** Scraped regulatory content for QA agent.
-   **QaReviewRequest:** Tracking for human review of low-confidence answers.
-   **XeroConnection:** OAuth tokens, tenant IDs, and sync metadata.
-   **Xero* Tables:** Cached Xero data for performance and search:
    -   `XeroInvoice`, `XeroContact`, `XeroPayment`, `XeroCreditNote`.
    -   All synced by `tenantId`.
-   **UserSettings:** User preferences, including custom prompts and agent settings.

## AI & Agents

-   **Agents:** Defined in `app/agents/` (frontend) and `lib/agents/` (backend logic).
    -   **AP:** Accounts Payable (Bill processing, payment scheduling).
    -   **AR:** Accounts Receivable (Invoicing, follow-ups).
    -   **Analytics:** Financial reporting and insights.
    -   **Data Validation:** Anomaly detection and integrity checks.
    -   **Forecasting:** Cash flow prediction.
    -   **Q&A:** Regulatory compliance and general accounting questions.
-   **Prompts:** Stored as Markdown files in `prompts/`.
-   **Tools:** Located in `lib/ai/tools/`.
    -   **Xero Tools:** `xero-tools.ts` (CRUD operations).
    -   **ABN Tools:** `abn-*.ts` (Lookup, Tax status verification).
    -   **Regulatory Tools:** `regulatory-tools.ts` (Search regulatory knowledge base).

## Conventions

-   **Linting:** Strict adherence to Biome rules. Always run `pnpm format`.
-   **Database:** Always use Drizzle ORM. No raw SQL.
-   **Styling:** Tailwind CSS v4.
-   **Async/Await:** Heavy use of async/await for database and API calls.
-   **Server Actions:** Used for mutations and form handling.

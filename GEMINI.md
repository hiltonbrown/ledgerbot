# LedgerBot Context for Gemini

## Project Overview

**LedgerBot** is an AI-powered accounting workspace tailored for Australian businesses. It automates bookkeeping tasks, ensures GST/BAS compliance, and integrates directly with **Xero**.

The application uses specialized AI agents for different domains (Accounts Payable, Accounts Receivable, Analytics, etc.) and allows users to interact via a chat interface that supports text, code, and spreadsheet artifacts.

## Technology Stack

-   **Framework:** Next.js 16 (App Router, Server Actions, PPR)
-   **Language:** TypeScript 5
-   **AI SDK:** Vercel AI SDK (with AI Gateway for Multi-LLM support: Claude, OpenAI, Gemini)
-   **Database:** PostgreSQL with **Drizzle ORM**
-   **Authentication:** Clerk
-   **Integration:** Xero OAuth2
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
│   │   └── ...
│   └── api/              # API Routes (Xero, Webhooks, etc.)
├── components/           # React Components
│   ├── ui/               # Reusable UI elements (Radix)
│   ├── agents/           # Agent-specific components
│   └── ...
├── lib/                  # Shared Utilities & Business Logic
│   ├── ai/               # AI Providers, Tools, Prompts
│   ├── db/               # Drizzle Schema & Migrations
│   ├── agents/           # Agent Logic (Backend)
│   └── xero/             # Xero Integration Logic
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
-   **Chat / Message:** Chat history and message content.
-   **Document:** AI-generated artifacts (Text, Code, Sheets).
-   **ContextFile:** User-uploaded files for RAG.
-   **XeroConnection:** OAuth tokens and metadata for Xero integration.
-   **Xero* Tables:** Cached Xero data (`XeroInvoice`, `XeroContact`, etc.) for search and performance.
-   **UserSettings:** User preferences, including custom prompts.

## AI & Agents

-   **Agents:** defined in `app/agents/` (frontend) and `lib/agents/` (backend logic).
-   **Prompts:** Stored as Markdown files in `prompts/`.
    -   `ledgerbot-system-prompt.md`: The main instructional prompt for the general chat.
    -   `default-code-prompt.md` / `default-spreadsheet-prompt.md`: Instructions for generating artifacts.
-   **Tools:** AI tools are defined in `lib/ai/tools/` and used by the chat API to perform actions (e.g., querying Xero, creating documents).

## Conventions

-   **Linting:** Strict adherence to Biome rules. Always run `pnpm format` or check for lint errors before finishing a task.
-   **Database:** Always use Drizzle ORM for DB interactions. Do not write raw SQL unless absolutely necessary.
-   **Styling:** Use Tailwind CSS utility classes.
-   **Async/Await:** Heavy use of async/await for database and API calls.
-   **Server Actions:** Used for mutations and form handling in the App Router.

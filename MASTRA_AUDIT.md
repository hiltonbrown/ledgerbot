# Mastra Codebase Audit & Inventory

**Date:** 2025-11-22
**Scope:** Analysis of Mastra AI agent framework usage in Ledgerbot.

## 1. Dependencies & Configuration

### Package Versions
- **@mastra/core**: `^0.23.3` (Runtime framework)
- **mastra**: `^0.17.7` (CLI and Studio)
- **next.config.ts**: Configures `serverExternalPackages: ["@mastra/*"]` to ensure proper server-side bundling.

### Configuration Files
- **`lib/mastra/index.ts`**: The central registry for the application's Mastra instance.
  - Exports a singleton `mastra` instance initialized with all agents.
  - Exports individual agent instances (`qandaAgent`, `forecastingAgent`, etc.).
  - Provides a type-safe `getAgent()` helper.
- **`mastra.config.ts`**: Configuration for **Mastra Studio** (local development UI).
  - Imports agents from `lib/mastra/index.ts` to ensure parity between the app and the Studio.
  - Configures the Studio server (Port 4111).

## 2. Agent Inventory

All agents are located in `lib/agents/` and follow a consistent pattern of exporting a base agent and often a factory function to create a user-specific agent (e.g., with Xero tools).

| Agent Name | File Path | Primary Model | Key Tools | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Analytics** | `lib/agents/analytics/agent.ts` | Claude Sonnet 4.5 | `calculateKpis`, `generateNarrative`, `xero_get_profit_and_loss`, `xero_get_balance_sheet` | Generates financial reports, calculates KPIs, and provides narrative insights. |
| **Accounts Payable (AP)** | `lib/agents/ap/agent.ts` | Claude Sonnet 4.5 | `extractInvoiceData`, `matchVendor`, `validateABN`, `suggestBillCoding`, `checkDuplicateBills`, `generatePaymentProposal`, `assessPaymentRisk`, `generateEmailDraft` | Manages supplier bills, validation, coding, and payment proposals. |
| **Accounts Receivable (AR)** | `lib/agents/ar/agent.ts` | Claude Sonnet 4.5 | `getInvoicesDue`, `predictLateRisk`, `buildEmailReminder`, `buildSmsReminder`, `buildCallScript`, `reconcilePayment`, `postNote`, `saveNoteToXero`, `syncXero` | Manages receivables, dunning cycles, and payment reminders. |
| **Forecasting** | `lib/agents/forecasting/agent.ts` | GPT-5 Chat | Xero Tools (dynamic) | Creates financial forecasts and scenarios (Base, Upside, Downside). |
| **Q&A Advisory** | `lib/agents/qanda/agent.ts` | Claude Sonnet 4.5 | `regulatorySearch`, Xero Tools (dynamic) | Answers regulatory questions (ATO, Fair Work) with citations and confidence scoring. |
| **Workflow Supervisor** | `lib/agents/workflow/supervisor.ts` | Claude Sonnet 4.5 | `executeMonthEndClose`, `executeInvestorUpdate`, `executeAtoAuditPack` | Orchestrates complex multi-step workflows. |
| **Regulatory Scraper** | `lib/regulatory/mastra-scraper.ts` | Claude Haiku 4.5 | N/A (Pure generation) | Summarizes scraped regulatory text and extracts obligations. |

## 3. Workflow Inventory

Workflows are defined using `createWorkflow` and `createStep` from `@mastra/core`.

| Workflow ID | File Path | Steps | Description |
| :--- | :--- | :--- | :--- |
| **month-end-close** | `lib/agents/workflow/workflows.ts` | `process-documents` → `reconcile-transactions` → `generate-analytics` | Orchestrates the month-end closing process. |
| **investor-update** | `lib/agents/workflow/workflows.ts` | `fetch-financial-data` → `create-forecast` → `prepare-investor-qa` | Prepares investor updates with forecasts and Q&A. |
| **ato-audit-pack** | `lib/agents/workflow/workflows.ts` | `collect-audit-documents` → `generate-audit-pack` | Compiles documents for ATO audits. |
| **ar-dunning-cycle** | `lib/agents/ar/workflow.ts` | `ar-triage` → `ar-fetch` → `ar-assess` → `ar-propose` → `ar-act` | Automates the AR dunning process (reminders, risk assessment). |

## 4. Specialized Integrations

### Deep Research (`lib/mastra/deep-research.ts`)
While not a standard `Agent` class, this module heavily utilizes Mastra patterns and AI SDK integration.
- **Functionality**: Implements a recursive research loop (Plan → Search → Evaluate → Summarize).
- **Key Functions**: `runMastraDeepResearchSummary`, `runMastraDeepResearchReport`.
- **Data Flow**: Manages its own history and state, returning `DeepResearchSummaryAttachment` objects that are rendered in the chat UI.

### Regulatory Scraper (`lib/regulatory/mastra-scraper.ts`)
- **Usage**: Used by the ingestion pipeline (`lib/regulatory/scraper.ts`) to process raw HTML.
- **Pattern**: Uses a lightweight `Agent` instance (`regulatoryScraperAgent`) to generate structured JSON summaries (`MastraScrapeSummary`) from unstructured text.

## 5. Data Flow & API Routes

### Chat Integration
- **`app/(chat)/api/chat/route.ts`**:
  - The primary entry point for user interaction.
  - Integrates **Deep Research** by detecting intent or explicit "deepResearch" flags.
  - Dynamically injects **Xero Tools** into the AI SDK stream if a user has an active Xero connection.
  - Uses `streamText` from the AI SDK, which is compatible with Mastra's tool definitions.

### Agent-Specific Routes
- **`app/api/agents/ap/route.ts`**:
  - Dedicated endpoint for the AP Agent.
  - Uses `agent.stream()` from Mastra to handle the conversation.
  - Demonstrates the pattern of swapping the base `apAgent` for `createAPAgentWithXero(userId)` based on connection status.

### Database Interactions
- **Regulatory Data**: The `regulatoryScraperAgent` output is directly stored in the `RegulatoryDocument` table (`lib/db/schema.ts`).
- **Redis**: Used for resumable streams (`lib/redis/config.ts`), but currently, Mastra's internal agent memory is not explicitly persisted to Redis in the analyzed files (it relies on the request context or ephemeral execution).

## 6. Findings & Observations

1.  **Hybrid Architecture**: The codebase mixes direct AI SDK usage (in `app/(chat)/api/chat/route.ts`) with Mastra Agent usage (in `app/api/agents/ap/route.ts` and `lib/agents/*`). This allows for flexibility but requires careful management of tool definitions to ensure they work in both contexts.
2.  **Dynamic Tooling**: A key pattern is the dynamic injection of Xero tools (`createXeroTools`, `createAPAgentWithXero`). This ensures agents only have access to sensitive financial tools when an authenticated user connection exists.
3.  **Workflow Orchestration**: The `Workflow Supervisor` agent uses tools (`executeMonthEndClose`) that trigger Mastra workflows. This is a powerful pattern where an LLM acts as the router/trigger for deterministic code workflows.
4.  **Type Safety**: Extensive use of Zod schemas for tool inputs/outputs and workflow steps ensures high reliability and type safety throughout the agent interactions.
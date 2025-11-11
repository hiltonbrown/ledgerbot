# Mastra Studio Integration Guide for LedgerBot

## Overview

This guide explains how to connect [Mastra Studio](https://mastra.ai/docs/getting-started/studio) to the LedgerBot project for local development, debugging, and testing of AI agents.

**Mastra Studio** is an interactive development environment that provides:
- **Agent Testing Interface**: Test conversational flows and tool executions
- **Workflow Visualization**: Debug multi-step workflows and agent orchestrations
- **Tool Inspector**: Inspect and manually trigger individual agent tools
- **Observability Dashboard**: Trace AI operations, token usage, and response quality
- **Real-time Debugging**: Monitor agent execution with step-by-step breakdowns

## Current State

LedgerBot already uses Mastra extensively:
- **Framework**: `@mastra/core@0.23.3` (installed)
- **CLI Package**: `mastra@0.17.7` (installed)
- **Centralized Instance**: `lib/mastra/index.ts` exports shared Mastra instance
- **Registered Agents**: 6 agents (Q&A, Forecasting, Analytics, Workflow Supervisor, AP, AR)
- **Architecture Pattern**: All agents use Mastra Agent class with tools and instructions

**What's Missing**: Mastra Studio configuration and dev server setup

---

## Installation & Setup

### Step 1: Verify Mastra Packages

LedgerBot already has the required packages installed. Verify with:

```bash
pnpm list mastra @mastra/core
```

Expected output should show:
- `mastra@0.17.7` (or higher)
- `@mastra/core@0.23.3` (or higher)

If not installed, add them:

```bash
pnpm add mastra @mastra/core
```

### Step 2: Create Mastra Configuration File

Create `mastra.config.ts` in the project root (same level as `package.json`):

```typescript
import { Mastra } from "@mastra/core";
import { mastra as ledgerbotMastra } from "@/lib/mastra";

/**
 * Mastra Studio Configuration
 *
 * This file extends the main LedgerBot Mastra instance with
 * Studio-specific server settings for local development.
 */
export const mastra = new Mastra({
  // Import all registered agents from the main instance
  agents: ledgerbotMastra.agents,

  // Studio server configuration
  server: {
    port: 4111, // Default Studio port
    host: "localhost", // Bind to localhost for local dev
  },
});
```

**Alternative Configuration** (if you want custom port/host):

```typescript
export const mastra = new Mastra({
  agents: ledgerbotMastra.agents,
  server: {
    port: 8080, // Custom port
    host: "0.0.0.0", // Bind to all interfaces
  },
});
```

**HTTPS Configuration** (for local HTTPS development):

```typescript
import fs from "node:fs";

export const mastra = new Mastra({
  agents: ledgerbotMastra.agents,
  server: {
    port: 4111,
    host: "localhost",
    https: {
      key: fs.readFileSync("./certs/localhost-key.pem"),
      cert: fs.readFileSync("./certs/localhost-cert.pem"),
    },
  },
});
```

### Step 3: Add Studio Dev Script

Update `package.json` to add a Mastra Studio development script:

```json
{
  "scripts": {
    "dev": "next dev --turbo",
    "studio": "mastra dev",
    "studio:https": "mastra dev --https",
    "dev:all": "concurrently \"pnpm dev\" \"pnpm studio\"",
    // ... other scripts
  }
}
```

**Optional**: Install `concurrently` to run Next.js and Studio together:

```bash
pnpm add -D concurrently
```

### Step 4: Update TypeScript Configuration (if needed)

If you encounter module resolution issues, ensure `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["mastra.config.ts", "lib/**/*", "app/**/*"]
}
```

---

## Running Mastra Studio

### Start Studio Development Server

```bash
# Option 1: Studio only
pnpm studio

# Option 2: Studio with HTTPS
pnpm studio:https

# Option 3: Next.js + Studio together (requires concurrently)
pnpm dev:all
```

### Access Studio UI

Once running, access:
- **Studio Interface**: http://localhost:4111/
- **API Documentation**: http://localhost:4111/swagger-ui

**Expected Console Output**:
```
[Mastra] Starting development server...
[Mastra] Studio available at http://localhost:4111
[Mastra] Loaded 6 agents: qanda, forecasting, analytics, workflow, ap, ar
```

---

## Testing Agents in Studio

### Available Agents

LedgerBot has 6 registered agents you can test:

| Agent ID | Name | Description | Key Tools |
|----------|------|-------------|-----------|
| `qanda` | Q&A Advisory | Regulatory compliance assistant | `regulatorySearch`, Xero tools (conditional) |
| `forecasting` | Forecasting | Scenario modeling & runway projections | Xero P&L, balance sheet |
| `analytics` | Analytics | KPI calculation & narrative reporting | `calculateKpis`, `generateNarrative` |
| `workflow` | Workflow Supervisor | Multi-agent orchestration | `executeMonthEndClose`, `executeInvestorUpdate` |
| `ap` | Accounts Payable | Supplier bill management | `validateABN`, `suggestBillCoding`, `generatePaymentProposal` |
| `ar` | Accounts Receivable | Invoice management & reminders | `getInvoicesDue`, `buildEmailReminder`, `reconcilePayment` |

### How Agents Are Connected

All LedgerBot agents are **already registered** in the centralized Mastra instance (`lib/mastra/index.ts`):

```typescript
export const mastra = new Mastra({
  agents: {
    qanda: qandaAgent,              // From lib/agents/qanda/agent.ts
    forecasting: forecastingAgent,  // From lib/agents/forecasting/agent.ts
    analytics: analyticsAgent,      // From lib/agents/analytics/agent.ts
    workflow: workflowSupervisorAgent, // From lib/agents/workflow/supervisor.ts
    ap: apAgent,                    // From lib/agents/ap/agent.ts
    ar: arAgent,                    // From lib/agents/ar/agent.ts
  },
});
```

**Connection Flow**:
1. **Agent Definition** → Each agent is defined in `lib/agents/[agent-name]/agent.ts` using `new Agent()`
2. **Registration** → Agent is added to `mastra.agents` object in `lib/mastra/index.ts`
3. **Studio Access** → `mastra.config.ts` imports the Mastra instance, making agents available in Studio
4. **Production Use** → API routes import agents from `lib/agents/` and use them directly

**Key Insight**: There's no separate "connection" step needed. All agents are available immediately when Studio starts because they share the same Mastra instance as production.

### Test Agent in Studio UI

1. **Navigate to Agents Tab**: Click "Agents" in the sidebar
2. **Select Agent**: Click on agent name (e.g., "qanda-agent")
3. **Start Conversation**: Enter a test prompt in the chat interface
4. **Observe Execution**:
   - See tool calls in real-time
   - View intermediate steps
   - Inspect tool inputs/outputs
   - Check token usage

### Example Test Prompts

**Q&A Agent** (`qanda`):
```
What is the current minimum wage in Australia for casual workers?
```

**Analytics Agent** (`analytics`):
```
Calculate key financial KPIs including gross margin and burn rate
```

**AP Agent** (`ap`):
```
Validate this ABN: 51 824 753 556 and check if it's a valid supplier
```

**Forecasting Agent** (`forecasting`):
```
Create a 12-month revenue forecast with base, upside, and downside scenarios
```

---

## Agent-by-Agent Testing Guide

This section provides detailed testing instructions for each LedgerBot agent, including required environment variables, available tools, and expected behaviors.

### 1. Q&A Advisory Agent (`qanda`)

**Purpose**: Regulatory-aware assistant for Australian tax law, employment law, and compliance obligations.

**Agent File**: `lib/agents/qanda/agent.ts`

**Model**: Claude Sonnet 4.5 (default)

**Required Environment Variables**:
```bash
AI_GATEWAY_API_KEY=****    # Required for AI model access
POSTGRES_URL=****          # Required for regulatory database search
FIRECRAWL_API_KEY=****     # Optional (for regulatory scraping)
XERO_CLIENT_ID=****        # Optional (for Xero-connected queries)
XERO_CLIENT_SECRET=****    # Optional
XERO_ENCRYPTION_KEY=****   # Optional
```

**Available Tools**:
- `regulatorySearch`: Full-text search of Australian regulatory documents (Fair Work, ATO, state payroll tax)
- Xero tools (conditional - only if user has active Xero connection):
  - `xero_list_invoices`
  - `xero_get_invoice`
  - `xero_list_contacts`
  - `xero_get_organisation`

**Testing Scenarios**:

1. **Regulatory Query (No Xero)**:
```
What is the current minimum wage for casual hospitality workers in Australia?
```
**Expected Behavior**:
- Agent calls `regulatorySearch` tool
- Returns answer with citations to Fair Work documents
- Provides confidence score in response
- No Xero tools called

2. **Tax Compliance Query**:
```
When are BAS lodgements due for quarterly reporters?
```
**Expected Behavior**:
- Agent searches ATO tax rulings
- Returns deadline information with official references
- Includes effective dates

3. **Combined Query (with Xero)**:
```
What are my superannuation obligations for my current employees?
```
**Expected Behavior** (if Xero connected):
- Agent calls `xero_get_organisation` to get business details
- Calls `regulatorySearch` for super guarantee rules
- Provides personalized answer based on actual organisation data

**Studio Testing Steps**:
1. Navigate to Agents → `qanda-agent`
2. Enter one of the test queries above
3. Observe tool calls in execution trace
4. Verify citations are included in response
5. Check that confidence score is mentioned

**Debug Checks**:
- Tool Call: `regulatorySearch` should execute successfully
- Database: Check POSTGRES_URL is valid and `regulatoryDocument` table exists
- Response Quality: Answer should include specific regulatory references (e.g., "Fair Work Act 2009")

---

### 2. Forecasting Agent (`forecasting`)

**Purpose**: Scenario modeling and financial runway projections with multiple scenarios (base, upside, downside).

**Agent File**: `lib/agents/forecasting/agent.ts`

**Model**: GPT-5 (OpenAI)

**Required Environment Variables**:
```bash
AI_GATEWAY_API_KEY=****    # Required for AI model access
POSTGRES_URL=****          # Required for memory storage
XERO_CLIENT_ID=****        # Optional (for historical data)
XERO_CLIENT_SECRET=****    # Optional
XERO_ENCRYPTION_KEY=****   # Optional
```

**Available Tools**:
- Xero tools (conditional - only if user has active Xero connection):
  - `xero_get_profit_and_loss`: Fetch P&L report for historical analysis
  - `xero_get_balance_sheet`: Fetch balance sheet for cash position

**Testing Scenarios**:

1. **Basic Forecast (No Xero)**:
```
Create a 12-month revenue forecast for a SaaS startup with $50k MRR growing at 10% monthly.
```
**Expected Behavior**:
- Agent generates forecast without tool calls (uses heuristics)
- Returns base scenario with conservative assumptions
- Includes executive summary and clarifying questions
- No Xero tools called

2. **Multi-Scenario Forecast**:
```
Generate base, upside, and downside scenarios for 6 months with opening cash of $100k.
```
**Expected Behavior**:
- Agent returns 3 scenarios (base, upside, downside)
- Each scenario has monthly projections
- Includes rationale and assumptions per scenario
- Outputs CSV-formatted data

3. **Xero-Informed Forecast** (if Xero connected):
```
Use my historical P&L data to create a 12-month forecast.
```
**Expected Behavior**:
- Agent calls `xero_get_profit_and_loss` to fetch historical data
- Analyzes trends from actual data
- Generates forecast based on historical patterns
- References Xero data in assumptions

**Studio Testing Steps**:
1. Navigate to Agents → `forecasting-agent`
2. Enter one of the test queries above
3. Check if Xero tools are called (depends on connection)
4. Verify response includes scenarios with monthly data
5. Check for executive summary and clarifying questions

**Debug Checks**:
- Tool Call: `xero_get_profit_and_loss` should return JSON report (if Xero connected)
- Response Format: Should include `executiveSummary`, `scenarios`, `clarifyingQuestions`
- Model: Verify GPT-5 is being used (check Studio logs)

---

### 3. Analytics Agent (`analytics`)

**Purpose**: KPI calculation and narrative financial reporting with executive insights.

**Agent File**: `lib/agents/analytics/agent.ts`

**Model**: Claude Sonnet 4.5

**Required Environment Variables**:
```bash
AI_GATEWAY_API_KEY=****    # Required
XERO_CLIENT_ID=****        # Optional (for live data)
XERO_CLIENT_SECRET=****    # Optional
XERO_ENCRYPTION_KEY=****   # Optional
```

**Available Tools**:
- `calculateKpis`: Calculate gross margin, burn rate, runway, revenue growth from financial data
- `generateNarrative`: Generate executive narrative commentary for financial reports
- Xero tools (conditional):
  - `xero_get_profit_and_loss`
  - `xero_get_balance_sheet`

**Testing Scenarios**:

1. **KPI Calculation (Manual Data)**:
```
Calculate KPIs for the following: Revenue: $100k, COGS: $30k, Expenses: $80k, Cash: $500k
```
**Expected Behavior**:
- Agent calls `calculateKpis` tool
- Returns:
  - Gross Margin: 70%
  - Net Burn: -$10k (profitable)
  - Runway: Infinite (positive cash flow)
  - Revenue Growth: 0% (no prior period)
- Includes insights and recommendations

2. **Narrative Report Generation**:
```
Generate an executive narrative for October 2025 with these KPIs: Gross Margin 65%, Net Burn $20k, Runway 25 months, Revenue Growth 15%
```
**Expected Behavior**:
- Agent calls `generateNarrative` tool
- Returns formatted narrative with:
  - Period summary
  - Trend analysis
  - Risk assessment
  - Action recommendations

3. **Xero-Based Analytics** (if Xero connected):
```
Pull my latest P&L and calculate KPIs for this month
```
**Expected Behavior**:
- Agent calls `xero_get_profit_and_loss` to fetch data
- Parses P&L to extract revenue, COGS, expenses
- Calls `calculateKpis` with extracted data
- Calls `generateNarrative` with calculated KPIs
- Returns comprehensive report

**Studio Testing Steps**:
1. Navigate to Agents → `analytics-agent`
2. Test with manual data first (Scenario 1)
3. Verify tool execution: `calculateKpis` → returns object with KPIs
4. Test narrative generation (Scenario 2)
5. If Xero connected, test data fetch (Scenario 3)

**Debug Checks**:
- Tool Output: `calculateKpis` should return `{ kpis: {...}, insights: [...] }`
- Narrative Format: Should include markdown headers and recommendations
- Xero Integration: P&L should return structured financial data

---

### 4. Accounts Payable Agent (`ap`)

**Purpose**: Supplier bill management, ABN validation, payment automation, and vendor communication.

**Agent File**: `lib/agents/ap/agent.ts`

**Model**: Claude Sonnet 4.5

**Required Environment Variables**:
```bash
AI_GATEWAY_API_KEY=****    # Required
POSTGRES_URL=****          # Required for bill storage
XERO_CLIENT_ID=****        # Optional (for vendor sync)
XERO_CLIENT_SECRET=****    # Optional
XERO_ENCRYPTION_KEY=****   # Optional
```

**Available Tools**:
- `extractInvoiceData`: Extract data from invoice PDFs/images
- `matchVendor`: Match extracted vendor to existing database records
- `validateABN`: Validate Australian Business Number (ABN)
- `suggestBillCoding`: Suggest GST-aware account coding
- `checkDuplicateBills`: Check for duplicate bill submissions
- `generatePaymentProposal`: Generate payment run proposals
- `assessPaymentRisk`: Assess risk of payment delays
- `generateEmailDraft`: Generate vendor communication drafts
- Xero tools (conditional): vendor queries, bill sync

**Testing Scenarios**:

1. **ABN Validation**:
```
Validate this ABN: 51 824 753 556
```
**Expected Behavior**:
- Agent calls `validateABN` tool
- Returns validation result with:
  - Valid/invalid status
  - Entity name
  - GST registration status
  - ABN status (active/cancelled)

2. **Bill Coding Suggestion**:
```
Suggest account coding for a $500 + GST office supplies invoice
```
**Expected Behavior**:
- Agent calls `suggestBillCoding` tool
- Returns suggested GL account (e.g., "6300 - Office Supplies")
- Includes GST treatment (GST on Expenses)
- Explains reasoning

3. **Payment Proposal**:
```
Generate a payment proposal for bills due in the next 7 days
```
**Expected Behavior**:
- Agent calls `generatePaymentProposal` tool
- Returns list of bills to pay
- Prioritizes by due date and payment terms
- Includes cash flow impact

**Studio Testing Steps**:
1. Navigate to Agents → `ap-agent`
2. Start with ABN validation (simplest tool)
3. Test bill coding suggestions
4. Test payment proposal generation
5. Verify email draft generation

**Debug Checks**:
- ABN Validation: Should integrate with ABR lookup service
- Bill Coding: Should suggest appropriate Australian GL accounts
- GST Awareness: All responses should consider GST implications

---

### 5. Accounts Receivable Agent (`ar`)

**Purpose**: Invoice management, payment reminders, late risk prediction, and DSO reduction.

**Agent File**: `lib/agents/ar/agent.ts`

**Model**: Claude Sonnet 4.5

**Required Environment Variables**:
```bash
AI_GATEWAY_API_KEY=****    # Required
POSTGRES_URL=****          # Required for invoice storage
COMMS_ENABLED=false        # MUST be false (safety - no external sends)
AR_DEFAULT_TONE=polite     # Optional (default tone)
```

**Available Tools**:
- `getInvoicesDue`: Get overdue and upcoming invoices
- `predictLateRisk`: Predict late payment risk for invoices
- `buildEmailReminder`: Generate email payment reminders
- `buildSmsReminder`: Generate SMS payment reminders
- `buildCallScript`: Generate call scripts for collections
- `reconcilePayment`: Reconcile received payments
- `postNote`: Save notes about customer interactions
- `saveNoteToXero`: Sync notes to Xero (if connected)
- `syncXero`: Sync invoice data from Xero

**Testing Scenarios**:

1. **Overdue Invoice Check**:
```
Show me all overdue invoices
```
**Expected Behavior**:
- Agent calls `getInvoicesDue` tool
- Returns list of overdue invoices with:
  - Invoice number
  - Customer name
  - Amount
  - Days overdue
  - Payment terms

2. **Payment Reminder Generation**:
```
Generate a polite email reminder for invoice INV-001 that's 15 days overdue
```
**Expected Behavior**:
- Agent calls `buildEmailReminder` tool with:
  - Invoice ID
  - Tone: "polite"
  - Days overdue: 15
- Returns copy-ready email with:
  - Subject line
  - Body text
  - Call-to-action
  - Professional tone

3. **Late Risk Prediction**:
```
Predict late payment risk for customer ABC Corp
```
**Expected Behavior**:
- Agent calls `predictLateRisk` tool
- Returns risk score (0-100)
- Provides reasoning (payment history, industry, amount)
- Suggests proactive actions

**Studio Testing Steps**:
1. Navigate to Agents → `ar-agent`
2. Test invoice retrieval
3. Test reminder generation (email and SMS)
4. Verify reminders are copy-ready (not sent automatically)
5. Test payment reconciliation

**Debug Checks**:
- Communications: Verify `COMMS_ENABLED=false` - agent should ONLY generate drafts, never send
- Tone: Check that reminder tone matches request (polite/firm/final)
- Xero Sync: If connected, verify invoice data syncs correctly

---

### 6. Workflow Supervisor Agent (`workflow`)

**Purpose**: Multi-agent orchestration with complex workflows (month-end close, investor updates, ATO audits).

**Agent File**: `lib/agents/workflow/supervisor.ts`

**Model**: Claude Sonnet 4.5

**Required Environment Variables**:
```bash
AI_GATEWAY_API_KEY=****    # Required
POSTGRES_URL=****          # Required (workflows access database)
```

**Available Tools**:
- `executeMonthEndClose`: Execute month-end close workflow (Documents → Reconciliations → Analytics)
- `executeInvestorUpdate`: Execute investor update workflow (Analytics → Forecasting → Q&A)
- `executeAtoAuditPack`: Execute ATO audit pack workflow (Documents → Compliance)

**Workflow Definitions**: `lib/agents/workflow/workflows.ts`

**Testing Scenarios**:

1. **Month-End Close Workflow**:
```
Execute month-end close for October 2025
```
**Expected Behavior**:
- Agent calls `executeMonthEndClose` tool
- Workflow executes 3 steps sequentially:
  1. **Process Documents**: Validate invoices, receipts, bank statements
  2. **Reconcile Transactions**: Match bank feeds to ledger entries
  3. **Generate Analytics**: Calculate KPIs and create report
- Returns workflow status with:
  - Steps completed
  - Success/failure per step
  - Generated report ID

2. **Investor Update Workflow**:
```
Prepare investor update for Q4 2025
```
**Expected Behavior**:
- Agent calls `executeInvestorUpdate` tool
- Workflow executes 3 steps:
  1. **Analytics**: Pull financial data and calculate KPIs
  2. **Forecasting**: Generate forward projections
  3. **Q&A Prep**: Anticipate investor questions with regulatory context
- Returns update package with:
  - Financial summary
  - Forecast scenarios
  - Q&A briefing doc

3. **ATO Audit Pack**:
```
Generate ATO audit pack for FY 2024-25
```
**Expected Behavior**:
- Agent calls `executeAtoAuditPack` tool
- Workflow compiles:
  - All source documents
  - Compliance checklists
  - Regulatory references
- Returns audit-ready package

**Studio Testing Steps**:
1. Navigate to Workflows tab (not Agents - workflows have their own UI)
2. Select workflow from dropdown (e.g., "month-end-close")
3. Fill in required parameters (month, userId)
4. Click "Execute Workflow"
5. Monitor step-by-step execution in real-time
6. View visual graph of workflow progression
7. Check logs for step outputs

**Debug Checks**:
- Workflow Graph: Should visualize all steps and their connections
- Step Outputs: Each step should pass data to next step
- Error Handling: Failed steps should stop workflow and report errors
- Status: Final status should indicate success/failure

**Advanced Testing**:
- Test workflow interruption (manually stop mid-execution)
- Test with missing parameters (should fail gracefully)
- Test workflow resume (if supported)

### Testing Tools Independently

1. Navigate to **Tools** tab in Studio
2. Select a tool from the dropdown (e.g., `regulatorySearch`)
3. Fill in required parameters
4. Click "Execute Tool"
5. View raw output and execution logs

---

## Observability & Debugging

### Agent Execution Traces

Studio provides detailed execution traces showing:
- **Message Flow**: User → Agent → Tools → Response
- **Step-by-Step Breakdown**: Each tool call and reasoning step
- **Token Metrics**: Input tokens, output tokens, total cost
- **Latency**: Time spent per step and total duration

### Workflow Visualization

For the Workflow Supervisor agent:
1. Navigate to **Workflows** tab
2. Select a workflow (e.g., "month-end-close")
3. View visual graph of agent orchestration
4. Trigger workflow execution
5. Monitor progress through each step

### Error Debugging

When an agent fails:
1. Check **Logs** tab for error stack traces
2. Review **Tool Execution History** for failed tools
3. Inspect **Message History** for context
4. Use **Replay** feature to re-run with same inputs

---

## Integration with Next.js App

### Shared Mastra Instance

LedgerBot uses a **centralized Mastra instance** (`lib/mastra/index.ts`) that both the Next.js app and Studio reference:

```typescript
// lib/mastra/index.ts
export const mastra = new Mastra({
  agents: {
    qanda: qandaAgent,
    forecasting: forecastingAgent,
    analytics: analyticsAgent,
    workflow: workflowSupervisorAgent,
    ap: apAgent,
    ar: arAgent,
  },
});
```

**Studio imports this instance** in `mastra.config.ts`, ensuring:
- ✅ Same agent definitions
- ✅ Same tool configurations
- ✅ Consistent behavior between Studio and production
- ✅ No code duplication

### API Routes Use Same Agents

All agent API routes (`app/api/agents/*/route.ts`) use the shared instance:

```typescript
// Example: app/api/agents/qanda/route.ts
import { qandaAgent, createQandaAgentWithXero } from "@/lib/agents/qanda/agent";

export async function POST(req: Request) {
  const xeroConnection = await getActiveXeroConnection(user.id);
  const agent = xeroConnection ? createQandaAgentWithXero(user.id) : qandaAgent;

  // Stream agent response...
}
```

**Benefit**: Testing in Studio = Testing production agents

---

## Environment Variables for Studio

### Required Variables

Studio needs the same environment variables as the Next.js app:

```bash
# .env.local

# AI Gateway (required for agents to access AI models)
AI_GATEWAY_API_KEY=****

# Database (required for agents that query user data)
POSTGRES_URL=****

# Xero Integration (optional - for testing Xero-connected agents)
XERO_CLIENT_ID=****
XERO_CLIENT_SECRET=****
XERO_ENCRYPTION_KEY=****

# Firecrawl (optional - for Q&A agent regulatory scraping)
FIRECRAWL_API_KEY=****
```

### Loading Environment Variables

Studio automatically loads `.env.local` when using:

```bash
pnpm studio  # Loads .env.local automatically
```

**Manual loading** (if needed):

```bash
# Using dotenv-cli (install first: pnpm add -D dotenv-cli)
dotenv -e .env.local -- mastra dev
```

---

## Troubleshooting

### Issue: "Mastra CLI not found"

**Solution**: Ensure `mastra` package is installed globally or use via pnpm:

```bash
# Install globally
pnpm add -g mastra

# Or use via pnpm exec
pnpm exec mastra dev
```

### Issue: "Cannot find module '@/lib/mastra'"

**Solution**: Ensure TypeScript path aliases are configured:

1. Check `tsconfig.json` has `"@/*": ["./*"]` in `paths`
2. Ensure `mastra.config.ts` is in project root
3. Try using relative imports:

```typescript
// mastra.config.ts
import { mastra as ledgerbotMastra } from "./lib/mastra";
```

### Issue: "Port 4111 already in use"

**Solution**: Change port in `mastra.config.ts`:

```typescript
export const mastra = new Mastra({
  agents: ledgerbotMastra.agents,
  server: {
    port: 8080, // Use different port
    host: "localhost",
  },
});
```

### Issue: "Agent tools not working"

**Possible causes**:
1. **Missing environment variables**: Check AI_GATEWAY_API_KEY is set
2. **Database connection**: Ensure POSTGRES_URL is valid
3. **Xero not connected**: Some tools require active Xero connection

**Debug steps**:
1. Check Studio logs for specific error messages
2. Test tool independently in Tools tab
3. Verify environment variables are loaded
4. Check database connectivity

### Issue: "Studio shows old agent code"

**Solution**: Restart Studio to reload agent definitions:

```bash
# Stop Studio (Ctrl+C)
# Restart
pnpm studio
```

**Tip**: Use `nodemon` for auto-reload during development:

```bash
pnpm add -D nodemon
# Add script: "studio:watch": "nodemon --exec mastra dev"
```

---

## Advanced Configuration

### Custom Studio Host/Port

For team development or remote access:

```typescript
// mastra.config.ts
export const mastra = new Mastra({
  agents: ledgerbotMastra.agents,
  server: {
    port: 4111,
    host: "0.0.0.0", // Bind to all network interfaces
  },
});
```

**Warning**: Only use `0.0.0.0` in trusted networks. Studio has no authentication.

### HTTPS for Secure Local Development

Generate self-signed certificates:

```bash
# Using mkcert (install from: https://github.com/FiloSottile/mkcert)
mkcert -install
mkcert localhost 127.0.0.1 ::1

# Certificates saved to:
# - localhost+2.pem (cert)
# - localhost+2-key.pem (key)
```

Update `mastra.config.ts`:

```typescript
import fs from "node:fs";

export const mastra = new Mastra({
  agents: ledgerbotMastra.agents,
  server: {
    port: 4111,
    host: "localhost",
    https: {
      key: fs.readFileSync("./localhost+2-key.pem"),
      cert: fs.readFileSync("./localhost+2.pem"),
    },
  },
});
```

Run with:

```bash
pnpm studio  # HTTPS auto-detected from config
# Access at: https://localhost:4111
```

### Memory & Storage Configuration

If agents need persistent memory across Studio sessions:

```typescript
export const mastra = new Mastra({
  agents: ledgerbotMastra.agents,
  memory: {
    provider: "postgres", // Use PostgreSQL for persistence
    config: {
      connectionString: process.env.POSTGRES_URL,
    },
  },
  server: { port: 4111, host: "localhost" },
});
```

---

## Development Workflow

### Recommended Setup

**Terminal 1**: Next.js dev server
```bash
pnpm dev
```

**Terminal 2**: Mastra Studio
```bash
pnpm studio
```

### Typical Development Cycle

1. **Develop Agent**: Edit agent code in `lib/agents/[agent-name]/agent.ts`
2. **Restart Studio**: Stop and restart `pnpm studio` to reload
3. **Test in Studio**: Use Studio UI to test new functionality
4. **Verify in App**: Test in Next.js app at http://localhost:3000
5. **Iterate**: Repeat until satisfied

### Testing Workflow Changes

For the Workflow Supervisor agent:

1. Edit workflow in `lib/agents/workflow/workflows.ts`
2. Restart Studio
3. Navigate to **Workflows** tab
4. Select workflow and click "Execute"
5. Monitor step-by-step execution
6. Check logs for errors or unexpected behavior

---

## Studio Features Reference

### Agent Testing
- **Chat Interface**: Test conversational flows
- **Message History**: Review past interactions
- **Token Metrics**: Monitor usage and costs
- **Tool Call Inspector**: View tool inputs/outputs

### Workflow Debugging
- **Visual Graph**: See workflow structure
- **Step Execution**: Monitor progress through steps
- **Error Handling**: Identify failed steps
- **Retry Mechanism**: Re-run workflows

### Tool Management
- **Tool Registry**: List all available tools
- **Manual Execution**: Trigger tools with custom inputs
- **Schema Validation**: Ensure inputs match Zod schemas
- **Output Inspection**: View raw tool responses

### Observability
- **Execution Traces**: End-to-end request tracking
- **Performance Metrics**: Latency per step
- **Error Logs**: Stack traces and debugging info
- **Token Analytics**: Cost breakdown by model

---

## Additional Resources

### Official Documentation
- [Mastra Studio Docs](https://mastra.ai/docs/getting-started/studio)
- [Mastra GitHub](https://github.com/mastra-ai/mastra)
- [AI SDK Integration](https://mastra.ai/docs/frameworks/agentic-uis/ai-sdk)
- [Next.js Quickstart](https://mastra.ai/guides/quickstarts/nextjs)

### LedgerBot-Specific Docs
- [CLAUDE.md](../CLAUDE.md): Full project documentation
- [Agent Architecture](../CLAUDE.md#agent-workspaces-mastra-framework): Agent design patterns
- [Regulatory System](./regulatory-system-summary.md): Q&A agent implementation
- [Xero Integration](../CLAUDE.md#xero-integration): Xero OAuth setup

### Community
- [Mastra Discord](https://discord.gg/mastra)
- [Mastra Twitter](https://twitter.com/mastra_ai)

---

## Next Steps

After setting up Mastra Studio:

1. **Test All Agents**: Verify each agent works in Studio
2. **Create Test Scenarios**: Build a suite of test prompts for regression testing
3. **Monitor Performance**: Use observability features to identify bottlenecks
4. **Document Findings**: Add agent-specific testing notes to this guide
5. **Share with Team**: Train team members on Studio usage

**Happy Debugging! 🚀**

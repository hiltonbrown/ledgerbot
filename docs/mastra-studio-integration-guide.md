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

# Mastra Studio Quick Start

**Mastra Studio** is now configured for LedgerBot! 🚀

## What is Mastra Studio?

An interactive development environment for testing, debugging, and monitoring AI agents and workflows. Think of it as a GUI for your Mastra agents.

## Quick Start

```bash
# Start Mastra Studio
pnpm studio

# Access at: http://localhost:4111
```

## What You Can Do

- ✅ **Test All 6 Agents**: Q&A, Forecasting, Analytics, Workflow, AP, AR
- ✅ **Debug Tool Calls**: See inputs/outputs in real-time
- ✅ **Monitor Performance**: Token usage, latency, costs
- ✅ **Visualize Workflows**: See multi-step agent orchestrations
- ✅ **Manual Tool Testing**: Execute individual tools with custom inputs

## Available Agents

| Agent | Model | Test Prompt Example |
|-------|-------|-------------------|
| **qanda** | Claude Sonnet 4.5 | "What is the minimum wage in Australia?" |
| **forecasting** | GPT-5 | "Create a 12-month revenue forecast" |
| **analytics** | Claude Sonnet 4.5 | "Calculate our gross margin and burn rate" |
| **workflow** | Claude Sonnet 4.5 | "Execute month-end close workflow" |
| **ap** | Claude Sonnet 4.5 | "Validate ABN: 51 824 753 556" |
| **ar** | Claude Sonnet 4.5 | "Show all overdue invoices" |

### How Agents Connect

All agents are **pre-registered** in `lib/mastra/index.ts` and automatically available in Studio. No manual connection needed!

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

**Connection Flow**:
Agent Definition → Registration → Studio Access → Production Use

**Key Benefit**: Testing in Studio = Testing production agents (same code, same config)

## Files Created

- ✅ `mastra.config.ts` - Studio configuration
- ✅ `package.json` - Added `pnpm studio` script
- ✅ `docs/mastra-studio-integration-guide.md` - Complete setup guide

## Need Help?

See the complete integration guide: `/docs/mastra-studio-integration-guide.md`

## Architecture

LedgerBot uses a **centralized Mastra instance** (`lib/mastra/index.ts`) that both the Next.js app and Studio share. This ensures:
- Same agent definitions
- Same tool configurations
- Testing Studio = Testing production

**Happy testing! 🎉**

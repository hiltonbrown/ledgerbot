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

| Agent | Test Prompt Example |
|-------|-------------------|
| **qanda** | "What is the minimum wage in Australia?" |
| **forecasting** | "Create a 12-month revenue forecast" |
| **analytics** | "Calculate our gross margin and burn rate" |
| **workflow** | "Execute month-end close workflow" |
| **ap** | "Validate ABN: 51 824 753 556" |
| **ar** | "Show all overdue invoices" |

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

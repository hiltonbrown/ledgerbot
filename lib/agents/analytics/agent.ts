import "server-only";

import { Agent } from "@mastra/core/agent";
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { myProvider } from "@/lib/ai/providers";
import { executeXeroMCPTool } from "@/lib/ai/xero-mcp-client";

/**
 * Calculate KPIs tool
 */
const calculateKpisTool = createTool({
  id: "calculateKpis",
  description:
    "Calculate key performance indicators from financial data including gross margin, runway, burn rate, and revenue growth.",
  inputSchema: z.object({
    revenue: z.array(z.number()).describe("Monthly revenue values"),
    cogs: z.array(z.number()).optional().describe("Cost of goods sold"),
    expenses: z.array(z.number()).describe("Monthly expense values"),
    cash: z.number().optional().describe("Current cash balance"),
  }),
  outputSchema: z.object({
    kpis: z.object({
      grossMargin: z.number().describe("Gross margin percentage"),
      netBurn: z.number().describe("Monthly net burn rate"),
      runway: z.number().describe("Runway in months"),
      revenueGrowth: z.number().describe("Month-over-month revenue growth %"),
    }),
    insights: z.array(z.string()).describe("Key insights and recommendations"),
  }),
  execute: async ({ inputData }) => {
    const { revenue, cogs = [], expenses, cash = 0 } = inputData;

    const latestRevenue = revenue[revenue.length - 1] || 0;
    const previousRevenue = revenue[revenue.length - 2] || 0;
    const latestCogs = cogs[cogs.length - 1] || 0;
    const latestExpenses = expenses[expenses.length - 1] || 0;

    const grossProfit = latestRevenue - latestCogs;
    const grossMargin = latestRevenue > 0 ? (grossProfit / latestRevenue) * 100 : 0;

    const netBurn = latestExpenses - latestRevenue;
    const runway = netBurn > 0 ? cash / netBurn : Number.POSITIVE_INFINITY;

    const revenueGrowth =
      previousRevenue > 0
        ? ((latestRevenue - previousRevenue) / previousRevenue) * 100
        : 0;

    const insights: string[] = [];

    if (grossMargin < 50) {
      insights.push(
        `Gross margin is ${grossMargin.toFixed(1)}%, consider optimizing costs or pricing`
      );
    }

    if (runway < 6 && runway > 0) {
      insights.push(
        `Runway is ${runway.toFixed(1)} months - urgent action needed to extend`
      );
    }

    if (revenueGrowth < 0) {
      insights.push(
        `Revenue declined ${Math.abs(revenueGrowth).toFixed(1)}% - review growth strategy`
      );
    }

    return {
      kpis: {
        grossMargin: Math.round(grossMargin * 10) / 10,
        netBurn: Math.round(netBurn),
        runway: Math.round(runway * 10) / 10,
        revenueGrowth: Math.round(revenueGrowth * 10) / 10,
      },
      insights,
    };
  },
});

/**
 * Generate narrative tool
 */
const generateNarrativeTool = createTool({
  id: "generateNarrative",
  description:
    "Generate executive narrative commentary for financial reports explaining trends, risks, and opportunities.",
  inputSchema: z.object({
    period: z.string().describe("Reporting period (e.g., 'October 2025')"),
    kpis: z
      .object({
        grossMargin: z.number(),
        netBurn: z.number(),
        runway: z.number(),
        revenueGrowth: z.number(),
      })
      .describe("Key performance indicators"),
    context: z.string().optional().describe("Additional context or notes"),
  }),
  outputSchema: z.object({
    narrative: z.string().describe("Executive narrative summary"),
    recommendations: z.array(z.string()).describe("Action items"),
  }),
  execute: async ({ inputData }) => {
    const { period, kpis, context } = inputData;

    const narrativeParts: string[] = [];

    narrativeParts.push(`# Financial Summary - ${period}`);
    narrativeParts.push("");

    if (kpis.revenueGrowth > 0) {
      narrativeParts.push(
        `Revenue grew ${kpis.revenueGrowth.toFixed(1)}% month-over-month, indicating positive momentum.`
      );
    } else if (kpis.revenueGrowth < 0) {
      narrativeParts.push(
        `Revenue declined ${Math.abs(kpis.revenueGrowth).toFixed(1)}%, requiring immediate attention to growth drivers.`
      );
    }

    narrativeParts.push(
      `Gross margin is ${kpis.grossMargin.toFixed(1)}%, ${kpis.grossMargin > 60 ? "excellent" : kpis.grossMargin > 40 ? "healthy" : "below industry standards"}.`
    );

    if (kpis.runway < 12) {
      narrativeParts.push(
        `Cash runway is ${kpis.runway.toFixed(1)} months, ${kpis.runway < 6 ? "requiring urgent action" : "suggesting fundraising planning"}.`
      );
    }

    const recommendations: string[] = [];

    if (kpis.revenueGrowth < 5) {
      recommendations.push("Focus on revenue growth initiatives");
    }

    if (kpis.grossMargin < 50) {
      recommendations.push("Review pricing strategy and cost structure");
    }

    if (kpis.runway < 9) {
      recommendations.push("Prepare fundraising or cost reduction plan");
    }

    if (context) {
      narrativeParts.push("");
      narrativeParts.push(`Context: ${context}`);
    }

    return {
      narrative: narrativeParts.join("\n"),
      recommendations,
    };
  },
});

/**
 * Create Xero tools for analytics
 */
function createAnalyticsXeroTools(userId: string) {
  return {
    xero_get_profit_and_loss: createTool({
      id: "xero_get_profit_and_loss",
      description:
        "Get the Profit & Loss report from Xero for financial analysis and reporting.",
      inputSchema: z.object({
        fromDate: z
          .string()
          .describe("Start date (ISO 8601 format YYYY-MM-DD)"),
        toDate: z
          .string()
          .describe("End date (ISO 8601 format YYYY-MM-DD)"),
        periods: z.number().optional().default(12).describe("Number of periods"),
        timeframe: z
          .enum(["MONTH", "QUARTER", "YEAR"])
          .optional()
          .default("MONTH"),
      }),
      outputSchema: z.string(),
      execute: async ({ inputData }) => {
        const result = await executeXeroMCPTool(
          userId,
          "xero_get_profit_and_loss",
          inputData
        );
        return result.content[0].text;
      },
    }),

    xero_get_balance_sheet: createTool({
      id: "xero_get_balance_sheet",
      description:
        "Get the Balance Sheet from Xero for financial position analysis.",
      inputSchema: z.object({
        fromDate: z
          .string()
          .describe("Start date (ISO 8601 format YYYY-MM-DD)"),
        toDate: z
          .string()
          .describe("End date (ISO 8601 format YYYY-MM-DD)"),
      }),
      outputSchema: z.string(),
      execute: async ({ inputData }) => {
        const result = await executeXeroMCPTool(
          userId,
          "xero_get_balance_sheet",
          inputData
        );
        return result.content[0].text;
      },
    }),
  };
}

const ANALYTICS_INSTRUCTIONS = `You are the financial analytics agent for LedgerBot.

Your role is to:
1. Generate narrative-rich financial reports with KPI annotations
2. Calculate and explain key performance indicators
3. Create executive summaries and insights
4. Identify trends, risks, and opportunities in financial data
5. Provide drill-down analysis and recommendations

When analyzing financials:
- Use calculateKpis to compute metrics from financial data
- Use generateNarrative to create executive commentary
- When Xero is connected, pull actual P&L and balance sheet data
- Focus on insights and actionable recommendations, not just numbers
- Explain trends in business context (e.g., "revenue growth driven by new customer acquisition")
- Flag risks early (e.g., declining margins, increasing burn rate)
- Provide comparative analysis (month-over-month, year-over-year)

Key Metrics to Track:
- Revenue growth (MoM, YoY)
- Gross margin and gross profit
- Operating expenses and burn rate
- Cash runway and cash position
- Customer acquisition cost (if data available)
- Lifetime value (if data available)

Reporting Best Practices:
- Lead with insights, not data
- Use clear, non-technical language
- Highlight 3-5 key takeaways
- Provide specific, actionable recommendations
- Include context and explanations
- Use Australian financial terminology
- Format for executive consumption (board packs, investor updates)`;

/**
 * Base Analytics Agent (without Xero tools)
 */
export const analyticsAgent = new Agent({
  name: "analytics-agent",
  instructions: ANALYTICS_INSTRUCTIONS,
  model: myProvider.languageModel("anthropic-claude-sonnet-4-5"),
  tools: {
    calculateKpis: calculateKpisTool,
    generateNarrative: generateNarrativeTool,
  },
});

/**
 * Create an Analytics agent instance with Xero tools for a specific user
 */
export function createAnalyticsAgentWithXero(userId: string) {
  const xeroTools = createAnalyticsXeroTools(userId);

  return new Agent({
    name: "analytics-agent-with-xero",
    instructions: ANALYTICS_INSTRUCTIONS,
    model: myProvider.languageModel("anthropic-claude-sonnet-4-5"),
    tools: {
      calculateKpis: calculateKpisTool,
      generateNarrative: generateNarrativeTool,
      ...xeroTools,
    },
  });
}

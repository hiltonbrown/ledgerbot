import "server-only";

import { tool } from "ai";
import { z } from "zod";
import { executeXeroMCPTool } from "@/lib/ai/xero-mcp-client";

/**
 * Calculate KPIs tool
 */
const calculateKpisTool = tool({
  description:
    "Calculate key performance indicators from financial data including gross margin, runway, burn rate, and revenue growth.",
  inputSchema: z.object({
    revenue: z.array(z.number()).describe("Monthly revenue values"),
    cogs: z.array(z.number()).optional().describe("Cost of goods sold"),
    expenses: z.array(z.number()).describe("Monthly expense values"),
    cash: z.number().optional().describe("Current cash balance"),
  }),
  execute: async ({
    revenue,
    cogs = [],
    expenses,
    cash = 0,
  }: {
    revenue: number[];
    cogs?: number[];
    expenses: number[];
    cash?: number;
  }) => {
    const latestRevenue = revenue.at(-1) || 0;
    const previousRevenue = revenue.at(-2) || 0;
    const latestCogs = cogs.at(-1) || 0;
    const latestExpenses = expenses.at(-1) || 0;

    const grossProfit = latestRevenue - latestCogs;
    const grossMargin =
      latestRevenue > 0 ? (grossProfit / latestRevenue) * 100 : 0;

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
const generateNarrativeTool = tool({
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
  execute: async ({
    period,
    kpis,
    context: additionalContext,
  }: {
    period: string;
    kpis: {
      grossMargin: number;
      netBurn: number;
      runway: number;
      revenueGrowth: number;
    };
    context?: string;
  }) => {
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

    if (additionalContext) {
      narrativeParts.push("");
      narrativeParts.push(`Context: ${additionalContext}`);
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
    xero_get_profit_and_loss: tool({
      description:
        "Get the Profit & Loss report from Xero for financial analysis and reporting.",
      inputSchema: z.object({
        fromDate: z
          .string()
          .describe("Start date (ISO 8601 format YYYY-MM-DD)"),
        toDate: z.string().describe("End date (ISO 8601 format YYYY-MM-DD)"),
        periods: z
          .number()
          .optional()
          .default(12)
          .describe("Number of periods"),
        timeframe: z
          .enum(["MONTH", "QUARTER", "YEAR"])
          .optional()
          .default("MONTH"),
      }),
      execute: async ({
        fromDate,
        toDate,
        periods = 12,
        timeframe = "MONTH",
      }: {
        fromDate: string;
        toDate: string;
        periods?: number;
        timeframe?: string;
      }) => {
        const result = await executeXeroMCPTool(
          userId,
          "xero_get_profit_and_loss",
          { fromDate, toDate, periods, timeframe }
        );
        return result.content[0].text;
      },
    }),

    xero_get_balance_sheet: tool({
      description:
        "Get the Balance Sheet from Xero for financial position analysis.",
      inputSchema: z.object({
        fromDate: z
          .string()
          .describe("Start date (ISO 8601 format YYYY-MM-DD)"),
        toDate: z.string().describe("End date (ISO 8601 format YYYY-MM-DD)"),
      }),
      execute: async ({
        fromDate,
        toDate,
      }: {
        fromDate: string;
        toDate: string;
      }) => {
        const result = await executeXeroMCPTool(
          userId,
          "xero_get_balance_sheet",
          { fromDate, toDate }
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
 * Get base Analytics agent tools (without Xero integration)
 */
export function getAnalyticsAgentTools() {
  return {
    calculateKpis: calculateKpisTool,
    generateNarrative: generateNarrativeTool,
  };
}

/**
 * Get Analytics agent tools with Xero integration for a specific user
 */
export function getAnalyticsAgentToolsWithXero(userId: string) {
  const xeroTools = createAnalyticsXeroTools(userId);

  return {
    calculateKpis: calculateKpisTool,
    generateNarrative: generateNarrativeTool,
    ...xeroTools,
  };
}

/**
 * Get Analytics agent system prompt
 */
export function getAnalyticsAgentSystemPrompt(): string {
  return ANALYTICS_INSTRUCTIONS;
}

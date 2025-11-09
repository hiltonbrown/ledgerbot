import "server-only";

import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { executeXeroMCPTool } from "@/lib/ai/xero-mcp-client";

/**
 * Xero tools for forecasting agent
 */
export function createForecastingXeroTools(userId: string) {
  return {
    xero_get_profit_and_loss: createTool({
      id: "xero_get_profit_and_loss",
      description:
        "Get the Profit & Loss report from Xero for a specific date range. Use this to understand historical revenue, expenses, and profitability trends.",
      inputSchema: z.object({
        fromDate: z
          .string()
          .describe(
            "Start date for the report (ISO 8601 format YYYY-MM-DD)"
          ),
        toDate: z
          .string()
          .describe("End date for the report (ISO 8601 format YYYY-MM-DD)"),
        periods: z
          .number()
          .optional()
          .default(12)
          .describe("Number of periods to include"),
        timeframe: z
          .enum(["MONTH", "QUARTER", "YEAR"])
          .optional()
          .default("MONTH")
          .describe("Reporting timeframe"),
      }),
      outputSchema: z.string(),
      execute: async ({ context }) => {
        const result = await executeXeroMCPTool(
          userId,
          "xero_get_profit_and_loss",
          context
        );
        return result.content[0].text;
      },
    }),

    xero_get_balance_sheet: createTool({
      id: "xero_get_balance_sheet",
      description:
        "Get the Balance Sheet from Xero for a specific date range. Use this to understand cash position, assets, liabilities, and equity.",
      inputSchema: z.object({
        fromDate: z
          .string()
          .describe(
            "Start date for the report (ISO 8601 format YYYY-MM-DD)"
          ),
        toDate: z
          .string()
          .describe("End date for the report (ISO 8601 format YYYY-MM-DD)"),
      }),
      outputSchema: z.string(),
      execute: async ({ context }) => {
        const result = await executeXeroMCPTool(
          userId,
          "xero_get_balance_sheet",
          context
        );
        return result.content[0].text;
      },
    }),
  };
}

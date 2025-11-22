import "server-only";

import { tool } from "ai";
import { z } from "zod";
import { executeXeroMCPTool } from "@/lib/ai/xero-mcp-client";
import { searchRegulatoryDocuments } from "@/lib/regulatory/search";

/**
 * Regulatory search tool for agents
 */
export const regulatorySearchTool = tool({
  description: `Searches the Australian regulatory knowledge base for information on employment law, taxation, and payroll.
    Use this tool to answer compliance questions and provide citations to official sources.
    Good queries are specific, like "what is the minimum wage for a retail worker?" or "superannuation guarantee percentage".`,
  inputSchema: z.object({
    query: z.string().describe("The specific question or topic to search for."),
    category: z
      .enum(["award", "tax_ruling", "payroll_tax", "all"])
      .optional()
      .default("all")
      .describe("The category to search within."),
    limit: z
      .number()
      .max(10)
      .optional()
      .default(5)
      .describe("The maximum number of results to return."),
  }),
  execute: async ({ query, category, limit }: { query: string; category: string; limit: number }) => {
    try {
      console.log(`[Q&A Agent] Regulatory search for: "${query}"`);
      const results = await searchRegulatoryDocuments(query, {
        category: category === "all" ? undefined : [category!],
        country: "AU",
        limit,
      });

      if (results.length === 0) {
        return {
          success: true,
          count: 0,
          results: [],
          message: "No results found.",
        };
      }

      const formattedResults = results.map((r) => ({
        title: r.title,
        url: r.sourceUrl,
        category: r.category,
        excerpt: r.excerpt,
        relevanceScore: r.relevanceScore,
      }));

      return {
        success: true,
        count: formattedResults.length,
        results: formattedResults,
      };
    } catch (error) {
      console.error("[Q&A Agent] Regulatory search error:", error);
      return {
        success: false,
        message: "An error occurred during the search.",
      };
    }
  },
});

/**
 * Create Xero tools for Q&A agent
 * These are conditionally added when user has an active Xero connection
 */
export function createQandaXeroTools(userId: string) {
  return {
    xero_list_invoices: tool({
      description:
        "Get a list of invoices from Xero. Can retrieve SALES INVOICES (sent TO customers, Type=ACCREC) or BILLS (received FROM suppliers, Type=ACCPAY). IMPORTANT: When user asks for invoices in a specific month/year, you MUST provide BOTH dateFrom and dateTo parameters to define the complete date range.",
      inputSchema: z.object({
        invoiceType: z
          .enum(["ACCREC", "ACCPAY"])
          .optional()
          .describe(
            "Invoice type: ACCREC for sales invoices (default), ACCPAY for bills/supplier invoices"
          ),
        status: z
          .enum(["DRAFT", "SUBMITTED", "AUTHORISED", "PAID", "VOIDED"])
          .optional()
          .describe("Invoice status filter"),
        dateFrom: z
          .string()
          .optional()
          .describe(
            "Start date for date range filter (ISO 8601 format YYYY-MM-DD)"
          ),
        dateTo: z
          .string()
          .optional()
          .describe(
            "End date for date range filter (ISO 8601 format YYYY-MM-DD)"
          ),
        contactId: z.string().optional().describe("Filter by contact ID"),
        limit: z
          .number()
          .optional()
          .default(100)
          .describe("Maximum number of invoices to return"),
      }),
      execute: async (args: { invoiceType?: string; status?: string; dateFrom?: string; dateTo?: string; contactId?: string; limit?: number }) => {
        const result = await executeXeroMCPTool(
          userId,
          "xero_list_invoices",
          args
        );
        return result.content[0].text;
      },
    }),

    xero_get_organisation: tool({
      description:
        "Get information about the connected Xero organisation. Use this to view organisation name, address, and settings.",
      inputSchema: z.object({}),
      execute: async () => {
        const result = await executeXeroMCPTool(
          userId,
          "xero_get_organisation",
          {}
        );
        return result.content[0].text;
      },
    }),

    xero_list_contacts: tool({
      description:
        "Get a list of contacts (customers and suppliers) from Xero. Use this to search for customers or suppliers by name or email.",
      inputSchema: z.object({
        searchTerm: z
          .string()
          .optional()
          .describe("Search contacts by name or email"),
        limit: z
          .number()
          .optional()
          .default(100)
          .describe("Maximum number of contacts to return"),
      }),
      execute: async (args: { searchTerm?: string; limit?: number }) => {
        const result = await executeXeroMCPTool(
          userId,
          "xero_list_contacts",
          args
        );
        return result.content[0].text;
      },
    }),

    xero_list_accounts: tool({
      description:
        "Get the chart of accounts from Xero. Use this to view account codes, names, and types.",
      inputSchema: z.object({
        accountType: z
          .enum([
            "BANK",
            "CURRENT",
            "CURRLIAB",
            "DEPRECIATN",
            "DIRECTCOSTS",
            "EQUITY",
            "EXPENSE",
            "FIXED",
            "INVENTORY",
            "LIABILITY",
            "NONCURRENT",
            "OTHERINCOME",
            "OVERHEADS",
            "PREPAYMENT",
            "REVENUE",
            "SALES",
            "TERMLIAB",
            "PAYGLIABILITY",
            "SUPERANNUATIONEXPENSE",
            "SUPERANNUATIONLIABILITY",
            "WAGESEXPENSE",
          ])
          .optional()
          .describe("Filter by account type"),
      }),
      execute: async (args: { accountType?: string }) => {
        const result = await executeXeroMCPTool(
          userId,
          "xero_list_accounts",
          args
        );
        return result.content[0].text;
      },
    }),
  };
}

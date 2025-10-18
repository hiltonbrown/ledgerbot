import { tool } from "ai";
import { z } from "zod";
import {
  executeXeroMCPTool,
  executeXeroMCPToolMultiTenant,
  xeroMCPTools,
} from "@/lib/ai/xero-mcp-client";
import { getAllDecryptedConnections } from "@/lib/xero/connection-manager";

/**
 * Xero Tools for AI SDK
 * Wraps Xero MCP tools for use with Vercel AI SDK
 */

/**
 * Create Xero tools for a specific user
 */
export function createXeroTools(userId: string, multiOrgMode = false) {
  const tenantSchema = {
    tenantId: z
      .string()
      .optional()
      .describe(
        "Xero organisation ID. When omitted, the user's primary organisation is used."
      ),
  };

  const baseTools = {
    xero_list_invoices: tool({
      description:
        "Get a list of invoices from Xero. Supports filtering by status, date range, and contact. Use this to find invoices for accounting queries.",
      inputSchema: z.object({
        ...tenantSchema,
        status: z
          .enum(["DRAFT", "SUBMITTED", "AUTHORISED", "PAID", "VOIDED"])
          .optional()
          .describe("Invoice status filter"),
        dateFrom: z
          .string()
          .optional()
          .describe(
            "Filter invoices from this date (ISO 8601 format, e.g., 2024-01-01)"
          ),
        dateTo: z
          .string()
          .optional()
          .describe(
            "Filter invoices to this date (ISO 8601 format, e.g., 2024-12-31)"
          ),
        contactId: z.string().optional().describe("Filter by contact ID"),
        limit: z
          .number()
          .optional()
          .default(100)
          .describe("Maximum number of invoices to return"),
      }),
      execute: async (args) => {
        const result = await executeXeroMCPTool(
          userId,
          "xero_list_invoices",
          args
        );
        return result.content[0].text;
      },
    }),

    xero_get_invoice: tool({
      description:
        "Get detailed information about a specific invoice by ID. Use this to view invoice details, line items, amounts, and status.",
      inputSchema: z.object({
        ...tenantSchema,
        invoiceId: z.string().describe("The Xero invoice ID"),
      }),
      execute: async (args) => {
        const result = await executeXeroMCPTool(
          userId,
          "xero_get_invoice",
          args
        );
        return result.content[0].text;
      },
    }),

    xero_list_contacts: tool({
      description:
        "Get a list of contacts (customers and suppliers) from Xero. Use this to search for customers or suppliers by name or email.",
      inputSchema: z.object({
        ...tenantSchema,
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
      execute: async (args) => {
        const result = await executeXeroMCPTool(
          userId,
          "xero_list_contacts",
          args
        );
        return result.content[0].text;
      },
    }),

    xero_get_contact: tool({
      description:
        "Get detailed information about a specific contact by ID. Use this to view contact details, addresses, and phone numbers.",
      inputSchema: z.object({
        ...tenantSchema,
        contactId: z.string().describe("The Xero contact ID"),
      }),
      execute: async (args) => {
        const result = await executeXeroMCPTool(
          userId,
          "xero_get_contact",
          args
        );
        return result.content[0].text;
      },
    }),

    xero_list_accounts: tool({
      description:
        "Get the chart of accounts from Xero. Use this to view available accounts for transactions and reporting.",
      inputSchema: z.object({
        ...tenantSchema,
        type: z
          .string()
          .optional()
          .describe(
            "Filter by account type (BANK, CURRENT, EXPENSE, FIXED, CURRLIAB, LIABILITY, EQUITY, REVENUE, DIRECTCOSTS, OVERHEADS)"
          ),
      }),
      execute: async (args) => {
        const result = await executeXeroMCPTool(
          userId,
          "xero_list_accounts",
          args
        );
        return result.content[0].text;
      },
    }),

    xero_list_journal_entries: tool({
      description:
        "Get journal entries (manual journals) from Xero. Use this to view manual journal entries for accounting analysis.",
      inputSchema: z.object({
        ...tenantSchema,
        dateFrom: z
          .string()
          .optional()
          .describe(
            "Filter journals from this date (ISO 8601 format, e.g., 2024-01-01)"
          ),
        dateTo: z
          .string()
          .optional()
          .describe(
            "Filter journals to this date (ISO 8601 format, e.g., 2024-12-31)"
          ),
        limit: z
          .number()
          .optional()
          .default(100)
          .describe("Maximum number of journals to return"),
      }),
      execute: async (args) => {
        const result = await executeXeroMCPTool(
          userId,
          "xero_list_journal_entries",
          args
        );
        return result.content[0].text;
      },
    }),

    xero_get_bank_transactions: tool({
      description:
        "Get bank transactions from Xero. Use this to view bank account transactions for reconciliation and analysis.",
      inputSchema: z.object({
        ...tenantSchema,
        bankAccountId: z
          .string()
          .optional()
          .describe("Filter by bank account ID"),
        dateFrom: z
          .string()
          .optional()
          .describe(
            "Filter transactions from this date (ISO 8601 format, e.g., 2024-01-01)"
          ),
        dateTo: z
          .string()
          .optional()
          .describe(
            "Filter transactions to this date (ISO 8601 format, e.g., 2024-12-31)"
          ),
        limit: z
          .number()
          .optional()
          .default(100)
          .describe("Maximum number of transactions to return"),
      }),
      execute: async (args) => {
        const result = await executeXeroMCPTool(
          userId,
          "xero_get_bank_transactions",
          args
        );
        return result.content[0].text;
      },
    }),

    xero_get_organisation: tool({
      description:
        "Get information about the connected Xero organisation. Use this to view organisation details like name, address, and settings.",
      inputSchema: z.object({ ...tenantSchema }),
      execute: async (args) => {
        const result = await executeXeroMCPTool(
          userId,
          "xero_get_organisation",
          args
        );
        return result.content[0].text;
      },
    }),
  } as const;

  if (!multiOrgMode) {
    return baseTools;
  }

  return {
    ...baseTools,
    xero_list_organisations: tool({
      description:
        "List all connected Xero organisations. Use this to understand which tenants are available for queries.",
      inputSchema: z.object({}),
      execute: async () => {
        const connections = await getAllDecryptedConnections(userId);
        return JSON.stringify(
          connections.map((connection) => ({
            tenantId: connection.tenantId,
            tenantName: connection.tenantName,
            tenantType: connection.tenantType,
            isPrimary: connection.isPrimary,
          })),
          null,
          2
        );
      },
    }),
    xero_compare_organisations: tool({
      description:
        "Execute a Xero MCP tool across multiple organisations for cross-company comparisons.",
      inputSchema: z.object({
        tool: z
          .enum(xeroMCPTools.map((tool) => tool.name) as [string, ...string[]])
          .describe("Tool to execute for each organisation"),
        tenantIds: z
          .array(z.string())
          .optional()
          .describe(
            "Specific organisation IDs to include. Defaults to all connected organisations."
          ),
        payload: z
          .record(z.any())
          .optional()
          .describe("Arguments to pass to the underlying tool"),
      }),
      execute: async ({ tool, tenantIds, payload }) => {
        const results = await executeXeroMCPToolMultiTenant(
          userId,
          tool,
          payload ?? {},
          tenantIds
        );

        return JSON.stringify(results, null, 2);
      },
    }),
  } as const;
}

/**
 * Get list of Xero tool names for experimental_activeTools
 */
export const xeroToolNames = xeroMCPTools.map((tool) => tool.name);

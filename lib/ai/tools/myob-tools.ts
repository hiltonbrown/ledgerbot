import { tool } from "ai";
import { z } from "zod";
import { executeMyobMCPTool, myobMCPTools } from "@/lib/ai/myob-mcp-client";

/**
 * MYOB Tools for AI SDK
 * Wraps MYOB MCP tools for use with Vercel AI SDK
 */

/**
 * Create MYOB tools for a specific user
 */
export function createMyobTools(userId: string) {
  return {
    myob_list_invoices: tool({
      description:
        "Get a list of invoices from MYOB. Returns sales invoices (Item/Service/Professional/Miscellaneous types). IMPORTANT: Filters by INVOICE DATE (the date the invoice was created), NOT payment date. When user asks for invoices in a specific month/year, provide BOTH dateFrom and dateTo parameters to define the complete date range.",
      inputSchema: z.object({
        invoiceType: z
          .enum(["Item", "Service", "Professional", "Miscellaneous"])
          .optional()
          .describe(
            "Invoice type: Item (default), Service, Professional, or Miscellaneous"
          ),
        dateFrom: z
          .string()
          .optional()
          .describe(
            "Start date for date range filter (ISO 8601 format YYYY-MM-DD, e.g., 2025-10-01). REQUIRED when filtering by month/year."
          ),
        dateTo: z
          .string()
          .optional()
          .describe(
            "End date for date range filter (ISO 8601 format YYYY-MM-DD, e.g., 2025-10-31). REQUIRED when filtering by month/year."
          ),
        limit: z
          .number()
          .optional()
          .default(100)
          .describe("Maximum number of invoices to return"),
      }),
      execute: async (args) => {
        const result = await executeMyobMCPTool(
          userId,
          "myob_list_invoices",
          args
        );
        return result.content[0].text;
      },
    }),

    myob_get_invoice: tool({
      description:
        "Get detailed information about a specific invoice by UID. Use this to view invoice details, line items, amounts, and status.",
      inputSchema: z.object({
        invoiceUid: z.string().describe("The MYOB invoice UID"),
        invoiceType: z
          .enum(["Item", "Service", "Professional", "Miscellaneous"])
          .optional()
          .describe("Invoice type (default: Item)"),
      }),
      execute: async (args) => {
        const result = await executeMyobMCPTool(
          userId,
          "myob_get_invoice",
          args
        );
        return result.content[0].text;
      },
    }),

    myob_list_contacts: tool({
      description:
        "Get a list of contacts (customers, suppliers, or personal contacts) from MYOB. Use this to search for contacts by name or company name.",
      inputSchema: z.object({
        contactType: z
          .enum(["Customer", "Supplier", "Personal"])
          .optional()
          .describe("Contact type: Customer (default), Supplier, or Personal"),
        searchTerm: z
          .string()
          .optional()
          .describe("Search contacts by name or company name"),
        limit: z
          .number()
          .optional()
          .default(100)
          .describe("Maximum number of contacts to return"),
      }),
      execute: async (args) => {
        const result = await executeMyobMCPTool(
          userId,
          "myob_list_contacts",
          args
        );
        return result.content[0].text;
      },
    }),

    myob_get_contact: tool({
      description:
        "Get detailed information about a specific contact by UID. Use this to view contact details, addresses, and phone numbers.",
      inputSchema: z.object({
        contactUid: z.string().describe("The MYOB contact UID"),
        contactType: z
          .enum(["Customer", "Supplier", "Personal"])
          .optional()
          .describe("Contact type: Customer (default), Supplier, or Personal"),
      }),
      execute: async (args) => {
        const result = await executeMyobMCPTool(
          userId,
          "myob_get_contact",
          args
        );
        return result.content[0].text;
      },
    }),

    myob_list_accounts: tool({
      description:
        "Get the chart of accounts from MYOB. Use this to view available accounts for transactions and reporting.",
      inputSchema: z.object({
        accountType: z
          .string()
          .optional()
          .describe(
            "Filter by account classification (Asset, Liability, Equity, Income, Expense, CostOfSales, OtherIncome, OtherExpense)"
          ),
        limit: z
          .number()
          .optional()
          .default(100)
          .describe("Maximum number of accounts to return"),
      }),
      execute: async (args) => {
        const result = await executeMyobMCPTool(
          userId,
          "myob_list_accounts",
          args
        );
        return result.content[0].text;
      },
    }),

    myob_get_company_file: tool({
      description:
        "Get information about the connected MYOB company file. Use this to view company name, version, and settings.",
      inputSchema: z.object({}),
      execute: async () => {
        const result = await executeMyobMCPTool(
          userId,
          "myob_get_company_file",
          {}
        );
        return result.content[0].text;
      },
    }),
  };
}

/**
 * Get list of MYOB tool names for experimental_activeTools
 */
export const myobToolNames = myobMCPTools.map((tool) => tool.name);

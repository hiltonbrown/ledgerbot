/**
 * QuickBooks AI SDK Tools
 *
 * AI-accessible tools for QuickBooks Online integration.
 * These tools wrap the QuickBooks MCP client functions and provide
 * Zod schemas for parameter validation.
 *
 * Usage: Conditionally loaded in chat API when user has active QuickBooks connection
 */

import { tool } from "ai";
import { z } from "zod";
import {
  getQuickBooksBalanceSheet,
  getQuickBooksCompanyInfo,
  getQuickBooksCustomer,
  getQuickBooksInvoice,
  getQuickBooksProfitAndLoss,
  getQuickBooksVendor,
  listQuickBooksAccounts,
  listQuickBooksBills,
  listQuickBooksCustomers,
  listQuickBooksInvoices,
  listQuickBooksVendors,
} from "../quickbooks-mcp-client";

/**
 * List invoices from QuickBooks
 */
export const quickbooks_list_invoices = (userId: string) =>
  tool({
    description:
      "Get a list of invoices from QuickBooks with optional filters for status (Paid, Unpaid, All) and date range",
    parameters: z.object({
      status: z
        .enum(["Paid", "Unpaid", "All"])
        .optional()
        .describe("Filter invoices by payment status"),
      startDate: z
        .string()
        .optional()
        .describe("Start date for filtering (YYYY-MM-DD format)"),
      endDate: z
        .string()
        .optional()
        .describe("End date for filtering (YYYY-MM-DD format)"),
      maxResults: z
        .number()
        .optional()
        .describe("Maximum number of results to return (default: 100)"),
    }),
    execute: async ({ status, startDate, endDate, maxResults }) => {
      const invoices = await listQuickBooksInvoices(userId, {
        status,
        startDate,
        endDate,
        maxResults,
      });
      return { invoices };
    },
  });

/**
 * Get a specific invoice by ID
 */
export const quickbooks_get_invoice = (userId: string) =>
  tool({
    description: "Get detailed information about a specific QuickBooks invoice",
    parameters: z.object({
      invoiceId: z.string().describe("The QuickBooks invoice ID"),
    }),
    execute: async ({ invoiceId }) => {
      const invoice = await getQuickBooksInvoice(userId, invoiceId);
      return { invoice };
    },
  });

/**
 * List customers from QuickBooks
 */
export const quickbooks_list_customers = (userId: string) =>
  tool({
    description:
      "Get a list of customers from QuickBooks with optional name search",
    parameters: z.object({
      searchTerm: z
        .string()
        .optional()
        .describe("Search term to filter customers by display name"),
      maxResults: z
        .number()
        .optional()
        .describe("Maximum number of results to return (default: 100)"),
    }),
    execute: async ({ searchTerm, maxResults }) => {
      const customers = await listQuickBooksCustomers(userId, {
        searchTerm,
        maxResults,
      });
      return { customers };
    },
  });

/**
 * Get a specific customer by ID
 */
export const quickbooks_get_customer = (userId: string) =>
  tool({
    description:
      "Get detailed information about a specific QuickBooks customer",
    parameters: z.object({
      customerId: z.string().describe("The QuickBooks customer ID"),
    }),
    execute: async ({ customerId }) => {
      const customer = await getQuickBooksCustomer(userId, customerId);
      return { customer };
    },
  });

/**
 * List vendors from QuickBooks
 */
export const quickbooks_list_vendors = (userId: string) =>
  tool({
    description:
      "Get a list of vendors (suppliers) from QuickBooks with optional name search",
    parameters: z.object({
      searchTerm: z
        .string()
        .optional()
        .describe("Search term to filter vendors by display name"),
      maxResults: z
        .number()
        .optional()
        .describe("Maximum number of results to return (default: 100)"),
    }),
    execute: async ({ searchTerm, maxResults }) => {
      const vendors = await listQuickBooksVendors(userId, {
        searchTerm,
        maxResults,
      });
      return { vendors };
    },
  });

/**
 * Get a specific vendor by ID
 */
export const quickbooks_get_vendor = (userId: string) =>
  tool({
    description: "Get detailed information about a specific QuickBooks vendor",
    parameters: z.object({
      vendorId: z.string().describe("The QuickBooks vendor ID"),
    }),
    execute: async ({ vendorId }) => {
      const vendor = await getQuickBooksVendor(userId, vendorId);
      return { vendor };
    },
  });

/**
 * List accounts from chart of accounts
 */
export const quickbooks_list_accounts = (userId: string) =>
  tool({
    description:
      "Get the chart of accounts from QuickBooks (cached in database for performance)",
    parameters: z.object({
      accountType: z
        .string()
        .optional()
        .describe(
          "Filter by account type (e.g., Bank, Accounts Receivable, Expense, Income)"
        ),
      maxResults: z
        .number()
        .optional()
        .describe("Maximum number of results to return"),
    }),
    execute: async ({ accountType, maxResults }) => {
      const accounts = await listQuickBooksAccounts(userId, {
        accountType,
        maxResults,
      });
      return { accounts };
    },
  });

/**
 * Get company information
 */
export const quickbooks_get_company_info = (userId: string) =>
  tool({
    description:
      "Get information about the connected QuickBooks company (name, address, contact details)",
    parameters: z.object({}),
    execute: async () => {
      const companyInfo = await getQuickBooksCompanyInfo(userId);
      return { companyInfo };
    },
  });

/**
 * List bills (accounts payable)
 */
export const quickbooks_list_bills = (userId: string) =>
  tool({
    description:
      "Get a list of bills (accounts payable) from QuickBooks with optional filters",
    parameters: z.object({
      status: z
        .enum(["Paid", "Unpaid", "All"])
        .optional()
        .describe("Filter bills by payment status"),
      startDate: z
        .string()
        .optional()
        .describe("Start date for filtering (YYYY-MM-DD format)"),
      endDate: z
        .string()
        .optional()
        .describe("End date for filtering (YYYY-MM-DD format)"),
      maxResults: z
        .number()
        .optional()
        .describe("Maximum number of results to return (default: 100)"),
    }),
    execute: async ({ status, startDate, endDate, maxResults }) => {
      const bills = await listQuickBooksBills(userId, {
        status,
        startDate,
        endDate,
        maxResults,
      });
      return { bills };
    },
  });

/**
 * Get profit and loss report
 */
export const quickbooks_get_profit_and_loss = (userId: string) =>
  tool({
    description:
      "Get a Profit & Loss (Income Statement) report from QuickBooks for a specified date range",
    parameters: z.object({
      startDate: z
        .string()
        .describe("Start date for the report (YYYY-MM-DD format)"),
      endDate: z
        .string()
        .describe("End date for the report (YYYY-MM-DD format)"),
    }),
    execute: async ({ startDate, endDate }) => {
      const report = await getQuickBooksProfitAndLoss(userId, {
        startDate,
        endDate,
      });
      return { report };
    },
  });

/**
 * Get balance sheet report
 */
export const quickbooks_get_balance_sheet = (userId: string) =>
  tool({
    description: "Get a Balance Sheet report from QuickBooks as of a specific date",
    parameters: z.object({
      date: z
        .string()
        .describe("Date for the balance sheet report (YYYY-MM-DD format)"),
    }),
    execute: async ({ date }) => {
      const report = await getQuickBooksBalanceSheet(userId, {
        date,
      });
      return { report };
    },
  });

/**
 * Create QuickBooks tools for a specific user
 */
export function createQuickBooksTools(userId: string) {
  return {
    quickbooks_list_invoices: quickbooks_list_invoices(userId),
    quickbooks_get_invoice: quickbooks_get_invoice(userId),
    quickbooks_list_customers: quickbooks_list_customers(userId),
    quickbooks_get_customer: quickbooks_get_customer(userId),
    quickbooks_list_vendors: quickbooks_list_vendors(userId),
    quickbooks_get_vendor: quickbooks_get_vendor(userId),
    quickbooks_list_accounts: quickbooks_list_accounts(userId),
    quickbooks_get_company_info: quickbooks_get_company_info(userId),
    quickbooks_list_bills: quickbooks_list_bills(userId),
    quickbooks_get_profit_and_loss: quickbooks_get_profit_and_loss(userId),
    quickbooks_get_balance_sheet: quickbooks_get_balance_sheet(userId),
  };
}

/**
 * Tool names array for activeTools configuration
 */
export const quickbooksToolNames = [
  "quickbooks_list_invoices",
  "quickbooks_get_invoice",
  "quickbooks_list_customers",
  "quickbooks_get_customer",
  "quickbooks_list_vendors",
  "quickbooks_get_vendor",
  "quickbooks_list_accounts",
  "quickbooks_get_company_info",
  "quickbooks_list_bills",
  "quickbooks_get_profit_and_loss",
  "quickbooks_get_balance_sheet",
] as const;

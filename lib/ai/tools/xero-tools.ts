import { tool } from "ai";
import { z } from "zod";
import { executeXeroMCPTool, xeroMCPTools } from "@/lib/ai/xero-mcp-client";
import type { XeroAccount } from "@/lib/db/schema";
import { getChartOfAccounts } from "@/lib/xero/chart-of-accounts-sync";
import { getDecryptedConnection } from "@/lib/xero/connection-manager";

/**
 * Xero Tools for AI SDK
 * Wraps Xero MCP tools for use with Vercel AI SDK
 */

/**
 * Create Xero tools for a specific user
 */
export function createXeroTools(userId: string) {
  return {
    xero_list_invoices: tool({
      description:
        "Get a list of invoices from Xero. Can retrieve SALES INVOICES (sent TO customers, Type=ACCREC) or BILLS (received FROM suppliers, Type=ACCPAY). IMPORTANT NOTES: (1) Filters by INVOICE DATE (the date the invoice was created), NOT payment date. (2) When user asks for invoices in a specific month/year, you MUST provide BOTH dateFrom and dateTo parameters to define the complete date range. For example, for 'October 2025' use dateFrom='2025-10-01' and dateTo='2025-10-31'. (3) Use invoiceType parameter to specify which type: 'ACCREC' for sales invoices (default), 'ACCPAY' for bills/supplier invoices. (4) This returns only invoice records - P&L reports may include additional transactions like bank transactions, journal entries, and credit notes that won't appear in this list.",
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
            "Start date for date range filter (ISO 8601 format YYYY-MM-DD, e.g., 2025-10-01). REQUIRED when filtering by month/year."
          ),
        dateTo: z
          .string()
          .optional()
          .describe(
            "End date for date range filter (ISO 8601 format YYYY-MM-DD, e.g., 2025-10-31). REQUIRED when filtering by month/year."
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
        "Get the chart of accounts from cached Xero data. This retrieves accounts from the local database cache (synced when connection was established). Use this to view available accounts for transactions and reporting. For the latest data, users can manually sync via settings.",
      inputSchema: z.object({
        type: z
          .string()
          .optional()
          .describe(
            "Filter by account type (BANK, CURRENT, EXPENSE, FIXED, CURRLIAB, LIABILITY, EQUITY, REVENUE, DIRECTCOSTS, OVERHEADS)"
          ),
      }),
      execute: async (args) => {
        try {
          // Get the active connection for this user
          const connection = await getDecryptedConnection(userId);

          if (!connection) {
            return JSON.stringify({
              error: "No active Xero connection found",
              message: "Please connect to Xero first",
            });
          }

          // Retrieve chart of accounts from database cache
          const chartData = await getChartOfAccounts(connection.id);

          if (!chartData || !chartData.accounts) {
            return JSON.stringify({
              error: "Chart of accounts not synced",
              message:
                "Chart of accounts has not been synced yet. Please sync your Xero connection in settings.",
              connectionId: connection.id,
              organisationName: connection.tenantName,
            });
          }

          // Filter by type if specified
          let accounts = chartData.accounts as XeroAccount[];

          if (args.type) {
            accounts = accounts.filter(
              (account) =>
                account.type?.toLowerCase() === args.type?.toLowerCase()
            );
          }

          // Filter out deleted accounts and format response
          const activeAccounts = accounts.filter(
            (account) => account.status !== "DELETED"
          );

          return JSON.stringify({
            accounts: activeAccounts,
            totalCount: activeAccounts.length,
            syncedAt: chartData.syncedAt,
            organisationName: connection.tenantName,
            source: "database_cache",
            note: "Data retrieved from local cache. Use manual sync in settings to refresh from Xero.",
          });
        } catch (error) {
          console.error(
            "Error retrieving chart of accounts from cache:",
            error
          );
          return JSON.stringify({
            error: "Failed to retrieve chart of accounts",
            message:
              error instanceof Error ? error.message : "Unknown error occurred",
          });
        }
      },
    }),

    xero_list_journal_entries: tool({
      description:
        "Get journal entries (manual journals) from Xero. Use this to view manual journal entries for accounting analysis.",
      inputSchema: z.object({
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

    xero_list_credit_notes: tool({
      description:
        "Get a list of credit notes from Xero. Can retrieve SALES CREDIT NOTES (issued TO customers, Type=ACCRECCREDIT) or PURCHASE CREDIT NOTES (received FROM suppliers, Type=ACCPAYCREDIT). Use creditNoteType to specify which type: 'ACCRECCREDIT' for sales credit notes (default), 'ACCPAYCREDIT' for purchase credit notes.",
      inputSchema: z.object({
        creditNoteType: z
          .enum(["ACCRECCREDIT", "ACCPAYCREDIT"])
          .optional()
          .describe(
            "Credit note type: ACCRECCREDIT for sales credit notes (default), ACCPAYCREDIT for purchase credit notes"
          ),
        status: z
          .enum(["DRAFT", "SUBMITTED", "AUTHORISED", "PAID", "VOIDED"])
          .optional()
          .describe("Credit note status filter"),
        dateFrom: z
          .string()
          .optional()
          .describe("Filter credit notes from this date (YYYY-MM-DD format)"),
        dateTo: z
          .string()
          .optional()
          .describe("Filter credit notes to this date (YYYY-MM-DD format)"),
        limit: z
          .number()
          .optional()
          .default(100)
          .describe("Maximum number of credit notes to return"),
      }),
      execute: async (args) => {
        const result = await executeXeroMCPTool(
          userId,
          "xero_list_credit_notes",
          args
        );
        return result.content[0].text;
      },
    }),

    xero_list_payments: tool({
      description: "Get a list of payments from Xero.",
      inputSchema: z.object({
        dateFrom: z
          .string()
          .optional()
          .describe("Filter payments from this date (YYYY-MM-DD format)"),
        dateTo: z
          .string()
          .optional()
          .describe("Filter payments to this date (YYYY-MM-DD format)"),
        limit: z
          .number()
          .optional()
          .default(100)
          .describe("Maximum number of payments to return"),
      }),
      execute: async (args) => {
        const result = await executeXeroMCPTool(
          userId,
          "xero_list_payments",
          args
        );
        return result.content[0].text;
      },
    }),

    xero_list_tax_rates: tool({
      description: "Get a list of tax rates configured in Xero.",
      inputSchema: z.object({}),
      execute: async () => {
        const result = await executeXeroMCPTool(
          userId,
          "xero_list_tax_rates",
          {}
        );
        return result.content[0].text;
      },
    }),

    xero_get_profit_and_loss: tool({
      description:
        "Get comprehensive profit and loss report from Xero for a specified date range. IMPORTANT LIMITS: (1) The range between fromDate and toDate cannot exceed 365 days. (2) The maximum number of comparative periods is 11. To analyze longer durations, make multiple calls. This report includes ALL financial transactions: sales invoices, bills, credit notes, bank transactions, manual journal entries, and payments. Uses the accounting basis configured in Xero.",
      inputSchema: z.object({
        fromDate: z
          .string()
          .describe(
            "Start date for the report (YYYY-MM-DD format). Must be within 365 days of toDate."
          ),
        toDate: z
          .string()
          .describe(
            "End date for the report (YYYY-MM-DD format). Must be within 365 days of fromDate."
          ),
        periods: z
          .number()
          .min(1)
          .max(11)
          .optional()
          .describe(
            "Number of comparative periods to include (1-11). Example: to compare with previous months."
          ),
        timeframe: z
          .enum(["MONTH", "QUARTER", "YEAR"])
          .optional()
          .describe("Reporting period frequency"),
      }),
      execute: async (args) => {
        const result = await executeXeroMCPTool(
          userId,
          "xero_get_profit_and_loss",
          args
        );
        return result.content[0].text;
      },
    }),

    xero_get_balance_sheet: tool({
      description:
        "Get balance sheet report showing assets, liabilities, and equity as of a specific date. Optionally compare multiple periods.",
      inputSchema: z.object({
        date: z
          .string()
          .optional()
          .describe(
            "Balance sheet date (YYYY-MM-DD format). Defaults to current date if not specified."
          ),
        periods: z
          .number()
          .optional()
          .describe(
            "Number of periods to compare (e.g., 12 for monthly comparison)"
          ),
        timeframe: z
          .enum(["MONTH", "QUARTER", "YEAR"])
          .optional()
          .describe(
            "Reporting period frequency (e.g., MONTH for monthly comparison)"
          ),
      }),
      execute: async (args) => {
        const result = await executeXeroMCPTool(
          userId,
          "xero_get_balance_sheet",
          args
        );
        return result.content[0].text;
      },
    }),

    xero_get_trial_balance: tool({
      description:
        "Get trial balance report showing all account balances. Use this to verify debits and credits remain in balance at a specific date.",
      inputSchema: z.object({
        date: z.string().describe("Date for the report (YYYY-MM-DD format)"),
      }),
      execute: async (args) => {
        const result = await executeXeroMCPTool(
          userId,
          "xero_get_trial_balance",
          args
        );
        return result.content[0].text;
      },
    }),

    xero_list_items: tool({
      description:
        "Get a list of inventory items and services from Xero. Use this to inspect product codes, pricing, and availability.",
      inputSchema: z.object({
        code: z
          .string()
          .optional()
          .describe("Filter by item code (exact match)"),
        limit: z
          .number()
          .optional()
          .default(100)
          .describe("Maximum number of items to return"),
      }),
      execute: async (args) => {
        const result = await executeXeroMCPTool(
          userId,
          "xero_list_items",
          args
        );
        return result.content[0].text;
      },
    }),

    xero_list_quotes: tool({
      description:
        "Get a list of sales quotes from Xero. Use this to monitor proposal status and pipeline activity.",
      inputSchema: z.object({
        status: z
          .enum(["DRAFT", "SENT", "ACCEPTED", "DECLINED"])
          .optional()
          .describe("Quote status filter"),
        dateFrom: z
          .string()
          .optional()
          .describe("Filter quotes from this date (YYYY-MM-DD format)"),
        dateTo: z
          .string()
          .optional()
          .describe("Filter quotes to this date (YYYY-MM-DD format)"),
        limit: z
          .number()
          .optional()
          .default(100)
          .describe("Maximum number of quotes to return"),
      }),
      execute: async (args) => {
        const result = await executeXeroMCPTool(
          userId,
          "xero_list_quotes",
          args
        );
        return result.content[0].text;
      },
    }),

    xero_list_contact_groups: tool({
      description:
        "Get a list of contact groups from Xero. Use this to review segmentation and targeted communication lists.",
      inputSchema: z.object({}),
      execute: async () => {
        const result = await executeXeroMCPTool(
          userId,
          "xero_list_contact_groups",
          {}
        );
        return result.content[0].text;
      },
    }),

    xero_get_aged_receivables: tool({
      description:
        "Get aged receivables report showing outstanding invoices by age. Use this to understand overdue balances for a contact.",
      inputSchema: z.object({
        contactId: z.string().describe("Xero contact ID to analyze"),
        date: z.string().optional().describe("Report date (YYYY-MM-DD format)"),
        fromDate: z
          .string()
          .optional()
          .describe("Start date for the ageing period (YYYY-MM-DD format)"),
        toDate: z
          .string()
          .optional()
          .describe("End date for the ageing period (YYYY-MM-DD format)"),
      }),
      execute: async (args) => {
        const result = await executeXeroMCPTool(
          userId,
          "xero_get_aged_receivables",
          args
        );
        return result.content[0].text;
      },
    }),

    xero_get_aged_payables: tool({
      description:
        "Get aged payables report showing outstanding bills by age. Use this to review supplier balances for a contact.",
      inputSchema: z.object({
        contactId: z.string().describe("Xero contact ID to analyze"),
        date: z.string().optional().describe("Report date (YYYY-MM-DD format)"),
        fromDate: z
          .string()
          .optional()
          .describe("Start date for the ageing period (YYYY-MM-DD format)"),
        toDate: z
          .string()
          .optional()
          .describe("End date for the ageing period (YYYY-MM-DD format)"),
      }),
      execute: async (args) => {
        const result = await executeXeroMCPTool(
          userId,
          "xero_get_aged_payables",
          args
        );
        return result.content[0].text;
      },
    }),

    xero_create_invoice: tool({
      description:
        "Create a new invoice in Xero. Use this to bill customers for products or services. Creates a draft invoice by default.",
      inputSchema: z.object({
        contactId: z.string().describe("The Xero contact ID for the customer"),
        date: z.string().describe("Invoice date (YYYY-MM-DD format)"),
        dueDate: z.string().describe("Payment due date (YYYY-MM-DD format)"),
        lineItems: z
          .array(
            z.object({
              description: z.string().describe("Line item description"),
              quantity: z.number().describe("Quantity"),
              unitAmount: z.number().describe("Unit price"),
              accountCode: z
                .string()
                .describe("Account code from chart of accounts"),
              taxType: z
                .string()
                .optional()
                .describe("Tax type code (optional)"),
            })
          )
          .describe("Array of invoice line items"),
        reference: z
          .string()
          .optional()
          .describe("Invoice reference number (optional)"),
        status: z
          .enum(["DRAFT", "AUTHORISED"])
          .optional()
          .describe("Invoice status (default: DRAFT)"),
      }),
      execute: async (args) => {
        const result = await executeXeroMCPTool(
          userId,
          "xero_create_invoice",
          args
        );
        return result.content[0].text;
      },
    }),

    xero_update_invoice: tool({
      description:
        "Update an existing invoice in Xero. Can only update DRAFT invoices.",
      inputSchema: z.object({
        invoiceId: z.string().describe("The Xero invoice ID to update"),
        contactId: z
          .string()
          .optional()
          .describe("The Xero contact ID for the customer"),
        date: z
          .string()
          .optional()
          .describe("Invoice date (YYYY-MM-DD format)"),
        dueDate: z
          .string()
          .optional()
          .describe("Payment due date (YYYY-MM-DD format)"),
        lineItems: z
          .array(
            z.object({
              description: z.string().describe("Line item description"),
              quantity: z.number().describe("Quantity"),
              unitAmount: z.number().describe("Unit price"),
              accountCode: z
                .string()
                .describe("Account code from chart of accounts"),
              taxType: z
                .string()
                .optional()
                .describe("Tax type code (optional)"),
            })
          )
          .optional()
          .describe("Array of invoice line items"),
        reference: z
          .string()
          .optional()
          .describe("Invoice reference number (optional)"),
        status: z
          .enum(["DRAFT", "AUTHORISED"])
          .optional()
          .describe("Invoice status"),
      }),
      execute: async (args) => {
        const result = await executeXeroMCPTool(
          userId,
          "xero_update_invoice",
          args
        );
        return result.content[0].text;
      },
    }),

    xero_create_contact: tool({
      description: "Create a new contact (customer/supplier) in Xero.",
      inputSchema: z.object({
        name: z.string().describe("Contact name"),
        email: z.string().optional().describe("Contact email address"),
        phone: z.string().optional().describe("Contact phone number"),
        addresses: z
          .array(
            z.object({
              addressType: z
                .enum(["POBOX", "STREET", "DELIVERY"])
                .describe("Address type"),
              addressLine1: z.string().optional().describe("Address line 1"),
              addressLine2: z.string().optional().describe("Address line 2"),
              city: z.string().optional().describe("City"),
              region: z.string().optional().describe("Region/State"),
              postalCode: z.string().optional().describe("Postal code"),
              country: z.string().optional().describe("Country"),
            })
          )
          .optional()
          .describe("Array of contact addresses"),
      }),
      execute: async (args) => {
        const result = await executeXeroMCPTool(
          userId,
          "xero_create_contact",
          args
        );
        return result.content[0].text;
      },
    }),

    xero_update_contact: tool({
      description: "Update an existing contact in Xero.",
      inputSchema: z.object({
        contactId: z.string().describe("The Xero contact ID to update"),
        name: z.string().optional().describe("Contact name"),
        email: z.string().optional().describe("Contact email address"),
        phone: z.string().optional().describe("Contact phone number"),
        addresses: z
          .array(
            z.object({
              addressType: z
                .enum(["POBOX", "STREET", "DELIVERY"])
                .describe("Address type"),
              addressLine1: z.string().optional().describe("Address line 1"),
              addressLine2: z.string().optional().describe("Address line 2"),
              city: z.string().optional().describe("City"),
              region: z.string().optional().describe("Region/State"),
              postalCode: z.string().optional().describe("Postal code"),
              country: z.string().optional().describe("Country"),
            })
          )
          .optional()
          .describe("Array of contact addresses"),
      }),
      execute: async (args) => {
        const result = await executeXeroMCPTool(
          userId,
          "xero_update_contact",
          args
        );
        return result.content[0].text;
      },
    }),

    xero_create_payment: tool({
      description: "Create a payment for an invoice in Xero.",
      inputSchema: z.object({
        invoiceId: z.string().describe("The Xero invoice ID to pay"),
        accountId: z
          .string()
          .describe("The Xero bank account ID for the payment"),
        amount: z.number().describe("Payment amount"),
        date: z.string().describe("Payment date (YYYY-MM-DD format)"),
        reference: z
          .string()
          .optional()
          .describe("Payment reference (optional)"),
      }),
      execute: async (args) => {
        const result = await executeXeroMCPTool(
          userId,
          "xero_create_payment",
          args
        );
        return result.content[0].text;
      },
    }),

    xero_create_quote: tool({
      description: "Create a new quote in Xero.",
      inputSchema: z.object({
        contactId: z.string().describe("The Xero contact ID for the customer"),
        date: z.string().describe("Quote date (YYYY-MM-DD format)"),
        expiryDate: z
          .string()
          .describe("Quote expiry date (YYYY-MM-DD format)"),
        lineItems: z
          .array(
            z.object({
              description: z.string().describe("Line item description"),
              quantity: z.number().describe("Quantity"),
              unitAmount: z.number().describe("Unit price"),
              accountCode: z
                .string()
                .describe("Account code from chart of accounts"),
              taxType: z
                .string()
                .optional()
                .describe("Tax type code (optional)"),
            })
          )
          .describe("Array of quote line items"),
        reference: z
          .string()
          .optional()
          .describe("Quote reference number (optional)"),
        status: z
          .enum(["DRAFT", "SENT", "ACCEPTED", "DECLINED"])
          .optional()
          .describe("Quote status (default: DRAFT)"),
      }),
      execute: async (args) => {
        const result = await executeXeroMCPTool(
          userId,
          "xero_create_quote",
          args
        );
        return result.content[0].text;
      },
    }),

    xero_create_credit_note: tool({
      description: "Create a new credit note in Xero.",
      inputSchema: z.object({
        contactId: z.string().describe("The Xero contact ID for the customer"),
        date: z.string().describe("Credit note date (YYYY-MM-DD format)"),
        lineItems: z
          .array(
            z.object({
              description: z.string().describe("Line item description"),
              quantity: z.number().describe("Quantity"),
              unitAmount: z.number().describe("Unit price"),
              accountCode: z
                .string()
                .describe("Account code from chart of accounts"),
              taxType: z
                .string()
                .optional()
                .describe("Tax type code (optional)"),
            })
          )
          .describe("Array of credit note line items"),
        reference: z
          .string()
          .optional()
          .describe("Credit note reference number (optional)"),
        status: z
          .enum(["DRAFT", "SUBMITTED", "AUTHORISED", "PAID", "VOIDED"])
          .optional()
          .describe("Credit note status (default: DRAFT)"),
      }),
      execute: async (args) => {
        const result = await executeXeroMCPTool(
          userId,
          "xero_create_credit_note",
          args
        );
        return result.content[0].text;
      },
    }),

    xero_update_credit_note: tool({
      description:
        "Update an existing credit note in Xero. Can only update DRAFT credit notes.",
      inputSchema: z.object({
        creditNoteId: z.string().describe("The Xero credit note ID to update"),
        contactId: z
          .string()
          .optional()
          .describe("The Xero contact ID for the customer"),
        date: z
          .string()
          .optional()
          .describe("Credit note date (YYYY-MM-DD format)"),
        lineItems: z
          .array(
            z.object({
              description: z.string().describe("Line item description"),
              quantity: z.number().describe("Quantity"),
              unitAmount: z.number().describe("Unit price"),
              accountCode: z
                .string()
                .describe("Account code from chart of accounts"),
              taxType: z
                .string()
                .optional()
                .describe("Tax type code (optional)"),
            })
          )
          .optional()
          .describe("Array of credit note line items"),
        reference: z
          .string()
          .optional()
          .describe("Credit note reference number (optional)"),
        status: z
          .enum(["DRAFT", "SUBMITTED", "AUTHORISED", "PAID", "VOIDED"])
          .optional()
          .describe("Credit note status"),
      }),
      execute: async (args) => {
        const result = await executeXeroMCPTool(
          userId,
          "xero_update_credit_note",
          args
        );
        return result.content[0].text;
      },
    }),
  };
}

/**
 * Get list of Xero tool names for experimental_activeTools
 */
export const xeroToolNames = xeroMCPTools.map((t) => t.name);

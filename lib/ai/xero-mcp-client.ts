import "server-only";

import { XeroClient } from "xero-node";
import { getDecryptedConnection } from "@/lib/xero/connection-manager";
import { updateXeroTokens } from "@/lib/db/queries";
import { encryptToken } from "@/lib/xero/encryption";
import type { DecryptedXeroConnection } from "@/lib/xero/types";

/**
 * Xero MCP Client
 * Provides MCP-compatible tool interfaces for Xero API operations
 */

export interface XeroMCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface XeroMCPToolResult {
  content: Array<{
    type: "text";
    text: string;
  }>;
  isError?: boolean;
}

/**
 * Get an authenticated Xero client for a user
 */
async function getXeroClient(
  userId: string
): Promise<{ client: XeroClient; connection: DecryptedXeroConnection }> {
  const connection = await getDecryptedConnection(userId);

  if (!connection) {
    throw new Error(
      "No active Xero connection found. Please connect to Xero first."
    );
  }

  const client = new XeroClient({
    clientId: process.env.XERO_CLIENT_ID || "",
    clientSecret: process.env.XERO_CLIENT_SECRET || "",
    redirectUris: [process.env.XERO_REDIRECT_URI || ""],
    scopes: connection.scopes,
  });

  await client.setTokenSet({
    access_token: connection.accessToken,
    refresh_token: connection.refreshToken,
    token_type: "Bearer",
    expires_in: Math.floor(
      (new Date(connection.expiresAt).getTime() - Date.now()) / 1000
    ),
  });

  return { client, connection };
}

async function persistTokenSet(
  client: XeroClient,
  connection: DecryptedXeroConnection
): Promise<void> {
  try {
    const tokenSet = client.readTokenSet();

    if (!tokenSet?.access_token || !tokenSet?.refresh_token) {
      return;
    }

    const expiresAt = tokenSet.expires_at
      ? new Date(tokenSet.expires_at * 1000)
      : tokenSet.expires_in
        ? new Date(Date.now() + tokenSet.expires_in * 1000)
        : null;

    if (!expiresAt) {
      return;
    }

    const hasChanged =
      tokenSet.access_token !== connection.accessToken ||
      tokenSet.refresh_token !== connection.refreshToken ||
      Math.abs(expiresAt.getTime() - new Date(connection.expiresAt).getTime()) >
        1000;

    if (!hasChanged) {
      return;
    }

    await updateXeroTokens({
      id: connection.id,
      accessToken: encryptToken(tokenSet.access_token),
      refreshToken: encryptToken(tokenSet.refresh_token),
      expiresAt,
    });

    connection.accessToken = tokenSet.access_token;
    connection.refreshToken = tokenSet.refresh_token;
    connection.expiresAt = expiresAt;
  } catch (error) {
    console.error("Failed to persist Xero token set:", error);
  }
}

/**
 * Available Xero MCP Tools
 */
export const xeroMCPTools: XeroMCPTool[] = [
  {
    name: "xero_list_invoices",
    description:
      "Get a list of invoices from Xero. Supports filtering by status, date range, and contact.",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          description:
            "Invoice status filter (DRAFT, SUBMITTED, AUTHORISED, PAID, VOIDED)",
          enum: ["DRAFT", "SUBMITTED", "AUTHORISED", "PAID", "VOIDED"],
        },
        dateFrom: {
          type: "string",
          description: "Filter invoices from this date (ISO 8601 format)",
        },
        dateTo: {
          type: "string",
          description: "Filter invoices to this date (ISO 8601 format)",
        },
        contactId: {
          type: "string",
          description: "Filter by contact ID",
        },
        limit: {
          type: "number",
          description: "Maximum number of invoices to return (default: 100)",
        },
      },
    },
  },
  {
    name: "xero_get_invoice",
    description: "Get detailed information about a specific invoice by ID.",
    inputSchema: {
      type: "object",
      properties: {
        invoiceId: {
          type: "string",
          description: "The Xero invoice ID",
        },
      },
      required: ["invoiceId"],
    },
  },
  {
    name: "xero_list_contacts",
    description: "Get a list of contacts (customers/suppliers) from Xero.",
    inputSchema: {
      type: "object",
      properties: {
        searchTerm: {
          type: "string",
          description: "Search contacts by name or email",
        },
        limit: {
          type: "number",
          description: "Maximum number of contacts to return (default: 100)",
        },
      },
    },
  },
  {
    name: "xero_get_contact",
    description: "Get detailed information about a specific contact by ID.",
    inputSchema: {
      type: "object",
      properties: {
        contactId: {
          type: "string",
          description: "The Xero contact ID",
        },
      },
      required: ["contactId"],
    },
  },
  {
    name: "xero_list_accounts",
    description: "Get the chart of accounts from Xero.",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          description:
            "Filter by account type (BANK, CURRENT, EXPENSE, FIXED, etc.)",
        },
      },
    },
  },
  {
    name: "xero_list_journal_entries",
    description: "Get journal entries (manual journals) from Xero.",
    inputSchema: {
      type: "object",
      properties: {
        dateFrom: {
          type: "string",
          description: "Filter journals from this date (ISO 8601 format)",
        },
        dateTo: {
          type: "string",
          description: "Filter journals to this date (ISO 8601 format)",
        },
        limit: {
          type: "number",
          description: "Maximum number of journals to return (default: 100)",
        },
      },
    },
  },
  {
    name: "xero_get_bank_transactions",
    description: "Get bank transactions from Xero.",
    inputSchema: {
      type: "object",
      properties: {
        bankAccountId: {
          type: "string",
          description: "Filter by bank account ID",
        },
        dateFrom: {
          type: "string",
          description: "Filter transactions from this date (ISO 8601 format)",
        },
        dateTo: {
          type: "string",
          description: "Filter transactions to this date (ISO 8601 format)",
        },
        limit: {
          type: "number",
          description:
            "Maximum number of transactions to return (default: 100)",
        },
      },
    },
  },
  {
    name: "xero_get_organisation",
    description: "Get information about the connected Xero organisation.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "xero_list_payments",
    description: "Get a list of payments from Xero",
    inputSchema: {
      type: "object",
      properties: {
        dateFrom: {
          type: "string",
          description: "Filter payments from this date (YYYY-MM-DD format)",
        },
        dateTo: {
          type: "string",
          description: "Filter payments to this date (YYYY-MM-DD format)",
        },
        limit: {
          type: "number",
          description: "Maximum number of payments to return (default: 100)",
        },
      },
    },
  },
  {
    name: "xero_list_credit_notes",
    description: "Get a list of credit notes from Xero",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          description:
            "Credit note status filter (DRAFT, SUBMITTED, AUTHORISED, PAID, VOIDED)",
          enum: ["DRAFT", "SUBMITTED", "AUTHORISED", "PAID", "VOIDED"],
        },
        dateFrom: {
          type: "string",
          description: "Filter credit notes from this date (YYYY-MM-DD format)",
        },
        dateTo: {
          type: "string",
          description: "Filter credit notes to this date (YYYY-MM-DD format)",
        },
        limit: {
          type: "number",
          description:
            "Maximum number of credit notes to return (default: 100)",
        },
      },
    },
  },
  {
    name: "xero_list_tax_rates",
    description: "Get a list of tax rates configured in Xero",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "xero_get_profit_and_loss",
    description:
      "Get profit and loss report from Xero for a specified date range. Shows revenue, expenses, and net profit.",
    inputSchema: {
      type: "object",
      properties: {
        fromDate: {
          type: "string",
          description: "Start date for the report (YYYY-MM-DD format)",
        },
        toDate: {
          type: "string",
          description: "End date for the report (YYYY-MM-DD format)",
        },
        periods: {
          type: "number",
          description: "Number of periods to compare (optional)",
        },
        timeframe: {
          type: "string",
          description: "Reporting period: MONTH, QUARTER, or YEAR (optional)",
          enum: ["MONTH", "QUARTER", "YEAR"],
        },
      },
      required: ["fromDate", "toDate"],
    },
  },
  {
    name: "xero_get_balance_sheet",
    description: "Get balance sheet report showing assets, liabilities, and equity",
    inputSchema: {
      type: "object",
      properties: {
        fromDate: {
          type: "string",
          description: "Start date for the report (YYYY-MM-DD format)",
        },
        toDate: {
          type: "string",
          description: "End date for the report (YYYY-MM-DD format)",
        },
        periods: {
          type: "number",
          description: "Number of periods to compare (optional)",
        },
        timeframe: {
          type: "string",
          description: "Reporting period: MONTH, QUARTER, or YEAR (optional)",
          enum: ["MONTH", "QUARTER", "YEAR"],
        },
      },
      required: ["fromDate", "toDate"],
    },
  },
  {
    name: "xero_get_trial_balance",
    description: "Get trial balance report showing all account balances",
    inputSchema: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "Date for the report (YYYY-MM-DD format)",
        },
      },
      required: ["date"],
    },
  },
];

/**
 * Execute a Xero MCP tool
 */
export async function executeXeroMCPTool(
  userId: string,
  toolName: string,
  args: Record<string, unknown>
): Promise<XeroMCPToolResult> {
  try {
    const { client, connection } = await getXeroClient(userId);
    try {
      switch (toolName) {
      case "xero_list_invoices": {
        const { status, dateFrom, dateTo, contactId, limit = 100 } = args;

        // Build where clause
        const whereClauses: string[] = [];
        if (status) whereClauses.push(`Status=="${status}"`);
        if (contactId)
          whereClauses.push(`Contact.ContactID==Guid("${contactId}")`);
        if (dateFrom) whereClauses.push(`Date>=DateTime(${dateFrom})`);
        if (dateTo) whereClauses.push(`Date<=DateTime(${dateTo})`);

        const where =
          whereClauses.length > 0 ? whereClauses.join(" AND ") : undefined;

        const response = await client.accountingApi.getInvoices(
          connection.tenantId,
          undefined, // ifModifiedSince
          where,
          undefined, // order
          undefined, // IDs
          undefined, // invoiceNumbers
          undefined, // contactIDs
          undefined, // statuses
          undefined, // page
          undefined, // includeArchived
          undefined, // createdByMyApp
          undefined, // unitdp
          undefined // summaryOnly
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response.body.invoices, null, 2),
            },
          ],
        };
      }

      case "xero_get_invoice": {
        const { invoiceId } = args;
        if (!invoiceId) throw new Error("invoiceId is required");

        const response = await client.accountingApi.getInvoice(
          connection.tenantId,
          invoiceId as string
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response.body.invoices?.[0], null, 2),
            },
          ],
        };
      }

      case "xero_list_contacts": {
        const { searchTerm, limit = 100 } = args;

        const where = searchTerm
          ? `Name.Contains("${searchTerm}") OR EmailAddress.Contains("${searchTerm}")`
          : undefined;

        const response = await client.accountingApi.getContacts(
          connection.tenantId,
          undefined, // ifModifiedSince
          where,
          undefined, // order
          undefined, // IDs
          undefined, // page
          undefined, // includeArchived
          undefined, // summaryOnly
          undefined // searchTerm (separate parameter)
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response.body.contacts, null, 2),
            },
          ],
        };
      }

      case "xero_get_contact": {
        const { contactId } = args;
        if (!contactId) throw new Error("contactId is required");

        const response = await client.accountingApi.getContact(
          connection.tenantId,
          contactId as string
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response.body.contacts?.[0], null, 2),
            },
          ],
        };
      }

      case "xero_list_accounts": {
        const { type } = args;

        const where = type ? `Type=="${type}"` : undefined;

        const response = await client.accountingApi.getAccounts(
          connection.tenantId,
          undefined,
          where
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response.body.accounts, null, 2),
            },
          ],
        };
      }

      case "xero_list_journal_entries": {
        const { dateFrom, dateTo, limit = 100 } = args;

        const response = await client.accountingApi.getManualJournals(
          connection.tenantId,
          undefined, // ifModifiedSince
          undefined, // where
          undefined, // order
          undefined, // page
          undefined // offset
        );

        // Filter by date if provided (Xero doesn't support date filtering in API)
        let journals = response.body.manualJournals || [];

        if (dateFrom || dateTo) {
          journals = journals.filter((journal) => {
            if (!journal.date) return false;
            const journalDate = new Date(journal.date);
            if (dateFrom && journalDate < new Date(dateFrom as string))
              return false;
            if (dateTo && journalDate > new Date(dateTo as string))
              return false;
            return true;
          });
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(journals, null, 2),
            },
          ],
        };
      }

      case "xero_get_bank_transactions": {
        const { bankAccountId, dateFrom, dateTo, limit = 100 } = args;

        const whereClauses: string[] = [];
        if (bankAccountId)
          whereClauses.push(`BankAccount.AccountID==Guid("${bankAccountId}")`);
        if (dateFrom) whereClauses.push(`Date>=DateTime(${dateFrom})`);
        if (dateTo) whereClauses.push(`Date<=DateTime(${dateTo})`);

        const where =
          whereClauses.length > 0 ? whereClauses.join(" AND ") : undefined;

        const response = await client.accountingApi.getBankTransactions(
          connection.tenantId,
          undefined, // ifModifiedSince
          where,
          undefined, // order
          undefined, // page
          undefined, // unitdp
          undefined // pageSize
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response.body.bankTransactions, null, 2),
            },
          ],
        };
      }

      case "xero_list_credit_notes": {
        const { status, dateFrom, dateTo, limit = 100 } = args;

        const whereClauses: string[] = [];
        if (status) whereClauses.push(`Status=="${status}"`);
        if (dateFrom) whereClauses.push(`Date>=DateTime(${dateFrom})`);
        if (dateTo) whereClauses.push(`Date<=DateTime(${dateTo})`);

        const where =
          whereClauses.length > 0 ? whereClauses.join(" AND ") : undefined;

        const response = await client.accountingApi.getCreditNotes(
          connection.tenantId,
          undefined, // ifModifiedSince
          where,
          undefined, // order
          undefined, // page
          undefined, // unitdp
          limit as number | undefined // pageSize
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response.body.creditNotes, null, 2),
            },
          ],
        };
      }

      case "xero_list_payments": {
        const { dateFrom, dateTo, limit = 100 } = args;

        const whereClauses: string[] = [];
        if (dateFrom) whereClauses.push(`Date>=DateTime(${dateFrom})`);
        if (dateTo) whereClauses.push(`Date<=DateTime(${dateTo})`);

        const where =
          whereClauses.length > 0 ? whereClauses.join(" AND ") : undefined;

        const response = await client.accountingApi.getPayments(
          connection.tenantId,
          undefined, // ifModifiedSince
          where,
          undefined, // order
          undefined, // page
          limit as number | undefined // pageSize
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response.body.payments, null, 2),
            },
          ],
        };
      }

      case "xero_list_tax_rates": {
        const response = await client.accountingApi.getTaxRates(
          connection.tenantId
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response.body.taxRates, null, 2),
            },
          ],
        };
      }

      case "xero_get_organisation": {
        const response = await client.accountingApi.getOrganisations(
          connection.tenantId
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response.body.organisations?.[0], null, 2),
            },
          ],
        };
      }

      case "xero_get_profit_and_loss": {
        const { fromDate, toDate, periods, timeframe } = args;

        if (!fromDate || !toDate) {
          throw new Error("fromDate and toDate are required");
        }

        const response = await client.accountingApi.getReportProfitAndLoss(
          connection.tenantId,
          fromDate as string,
          toDate as string,
          periods as number | undefined,
          timeframe as "MONTH" | "QUARTER" | "YEAR" | undefined
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response.body, null, 2),
            },
          ],
        };
      }

      case "xero_get_balance_sheet": {
        const { fromDate, toDate, periods, timeframe } = args;

        if (!fromDate || !toDate) {
          throw new Error("fromDate and toDate are required");
        }

        const response = await client.accountingApi.getReportBalanceSheet(
          connection.tenantId,
          fromDate as string,
          toDate as string,
          periods as number | undefined,
          timeframe as "MONTH" | "QUARTER" | "YEAR" | undefined
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response.body, null, 2),
            },
          ],
        };
      }

      case "xero_get_trial_balance": {
        const { date } = args;

        if (!date) {
          throw new Error("date is required");
        }

        const response = await client.accountingApi.getReportTrialBalance(
          connection.tenantId,
          date as string
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response.body, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown Xero tool: ${toolName}`);
      }
    } finally {
      await persistTokenSet(client, connection);
    }
  } catch (error) {
    console.error(`Xero MCP tool error (${toolName}):`, error);
    return {
      content: [
        {
          type: "text",
          text: `Error executing Xero tool: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Check if a tool name is a Xero MCP tool
 */
export function isXeroMCPTool(toolName: string): boolean {
  return xeroMCPTools.some((tool) => tool.name === toolName);
}

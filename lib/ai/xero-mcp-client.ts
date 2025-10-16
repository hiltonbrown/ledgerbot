import "server-only";

import { XeroClient } from "xero-node";
import { getDecryptedConnection } from "@/lib/xero/connection-manager";
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

      default:
        throw new Error(`Unknown Xero tool: ${toolName}`);
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

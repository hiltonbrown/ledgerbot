import "server-only";

import { randomUUID } from "crypto";
import { XeroClient } from "xero-node";
import { getActiveXeroConnections } from "@/lib/db/queries";
import {
  cacheAccounts,
  cacheBankTransactions,
  cacheContacts,
  cacheInvoices,
  getCachedAccounts,
  getCachedBankTransactions,
  getCachedContacts,
  getCachedInvoices,
} from "@/lib/xero/cache-manager";
import { getConnectionSafe } from "@/lib/xero/connection-pool";
import { withXeroContext } from "@/lib/xero/request-context";
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
  userId: string,
  tenantId?: string
): Promise<{ client: XeroClient; connection: DecryptedXeroConnection }> {
  const connection = await getConnectionSafe(userId, tenantId);

  if (!connection) {
    throw new Error(
      tenantId
        ? `No active Xero connection found for tenant ${tenantId}`
        : "No active Xero connection found. Please connect to Xero first."
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
    expires_in: Math.max(
      Math.floor((new Date(connection.expiresAt).getTime() - Date.now()) / 1000),
      0
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
    const tenantId = args.tenantId as string | undefined;
    const { tenantId: _, ...apiArgs } = args;
    const { client, connection } = await getXeroClient(userId, tenantId);

    const executor = async (): Promise<XeroMCPToolResult> => {
      switch (toolName) {
      case "xero_list_invoices": {
        const { status, dateFrom, dateTo, contactId, limit = 100 } = apiArgs;

        const cached = await getCachedInvoices(connection.tenantId, {
          status: status as string | undefined,
          contactId: contactId as string | undefined,
          dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
          dateTo: dateTo ? new Date(dateTo as string) : undefined,
          limit: limit as number | undefined,
        });

        if (cached.fromCache && !cached.isStale) {
          return {
            content: [
              { type: "text", text: JSON.stringify(cached.data, null, 2) },
            ],
          };
        }

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
          undefined,
          where
        );

        if (response.body.invoices) {
          await cacheInvoices(connection.tenantId, response.body.invoices);
        }

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
        const { invoiceId } = apiArgs;
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
        const { searchTerm, limit = 100 } = apiArgs;

        const cached = await getCachedContacts(connection.tenantId, {
          searchTerm: searchTerm as string | undefined,
          limit: limit as number | undefined,
        });

        if (cached.fromCache && !cached.isStale) {
          return {
            content: [
              { type: "text", text: JSON.stringify(cached.data, null, 2) },
            ],
          };
        }

        const where = searchTerm
          ? `Name.Contains("${searchTerm}") OR EmailAddress.Contains("${searchTerm}")`
          : undefined;

        const response = await client.accountingApi.getContacts(
          connection.tenantId,
          undefined,
          where
        );

        if (response.body.contacts) {
          await cacheContacts(connection.tenantId, response.body.contacts);
        }

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
        const { contactId } = apiArgs;
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
        const { type } = apiArgs;

        const cached = await getCachedAccounts(connection.tenantId, {
          type: type as string | undefined,
        });

        if (cached.fromCache && !cached.isStale) {
          return {
            content: [
              { type: "text", text: JSON.stringify(cached.data, null, 2) },
            ],
          };
        }

        const where = type ? `Type=="${type}"` : undefined;

        const response = await client.accountingApi.getAccounts(
          connection.tenantId,
          undefined,
          where
        );

        if (response.body.accounts) {
          await cacheAccounts(connection.tenantId, response.body.accounts);
        }

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
        const { dateFrom, dateTo, limit = 100 } = apiArgs;

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
        const { bankAccountId, dateFrom, dateTo, limit = 100 } = apiArgs;

        const cached = await getCachedBankTransactions(connection.tenantId, {
          bankAccountId: bankAccountId as string | undefined,
          dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
          dateTo: dateTo ? new Date(dateTo as string) : undefined,
          limit: limit as number | undefined,
        });

        if (cached.fromCache && !cached.isStale) {
          return {
            content: [
              { type: "text", text: JSON.stringify(cached.data, null, 2) },
            ],
          };
        }

        const whereClauses: string[] = [];
        if (bankAccountId)
          whereClauses.push(`BankAccount.AccountID==Guid("${bankAccountId}")`);
        if (dateFrom) whereClauses.push(`Date>=DateTime(${dateFrom})`);
        if (dateTo) whereClauses.push(`Date<=DateTime(${dateTo})`);

        const where =
          whereClauses.length > 0 ? whereClauses.join(" AND ") : undefined;

        const response = await client.accountingApi.getBankTransactions(
          connection.tenantId,
          undefined,
          where
        );

        if (response.body.bankTransactions) {
          await cacheBankTransactions(
            connection.tenantId,
            response.body.bankTransactions
          );
        }

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
    };

    return await withXeroContext(
      {
        userId,
        tenantId: connection.tenantId,
        requestId: randomUUID(),
      },
      executor
    );
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

export async function executeXeroMCPToolMultiTenant(
  userId: string,
  toolName: string,
  args: Record<string, unknown>,
  tenantIds?: string[]
): Promise<Record<string, XeroMCPToolResult>> {
  const results: Record<string, XeroMCPToolResult> = {};
  const ids =
    tenantIds && tenantIds.length > 0
      ? Array.from(new Set(tenantIds))
      : Array.from(
          new Set(
            (await getActiveXeroConnections(userId)).map(
              (connection) => connection.tenantId
            )
          )
        );

  if (ids.length === 0) {
    return results;
  }

  await Promise.all(
    ids.map(async (tenantId) => {
      try {
        const result = await executeXeroMCPTool(userId, toolName, {
          ...args,
          tenantId,
        });
        results[tenantId] = result;
      } catch (error) {
        results[tenantId] = {
          content: [
            {
              type: "text",
              text: `Error executing tool for tenant ${tenantId}: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
          isError: true,
        };
      }
    })
  );

  return results;
}

/**
 * Check if a tool name is a Xero MCP tool
 */
export function isXeroMCPTool(toolName: string): boolean {
  return xeroMCPTools.some((tool) => tool.name === toolName);
}

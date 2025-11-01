import "server-only";

import {
  CreditNote,
  Invoice,
  Phone,
  type QuoteStatusCodes,
  XeroClient,
} from "xero-node";
import { updateXeroTokens } from "@/lib/db/queries";
import { getDecryptedConnection } from "@/lib/xero/connection-manager";
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
    description:
      "Get balance sheet report showing assets, liabilities, and equity",
    inputSchema: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "Date for the report (YYYY-MM-DD format)",
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
      required: [],
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
  {
    name: "xero_list_items",
    description: "Get a list of inventory items and services from Xero",
    inputSchema: {
      type: "object",
      properties: {
        code: {
          type: "string",
          description: "Filter by item code",
        },
        limit: {
          type: "number",
          description: "Maximum number of items to return (default: 100)",
        },
      },
    },
  },
  {
    name: "xero_list_quotes",
    description: "Get a list of sales quotes from Xero",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          description: "Quote status filter (DRAFT, SENT, ACCEPTED, DECLINED)",
          enum: ["DRAFT", "SENT", "ACCEPTED", "DECLINED"],
        },
        dateFrom: {
          type: "string",
          description: "Filter quotes from this date (YYYY-MM-DD format)",
        },
        dateTo: {
          type: "string",
          description: "Filter quotes to this date (YYYY-MM-DD format)",
        },
        limit: {
          type: "number",
          description: "Maximum number of quotes to return (default: 100)",
        },
      },
    },
  },
  {
    name: "xero_list_contact_groups",
    description: "Get a list of contact groups from Xero",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "xero_get_aged_receivables",
    description:
      "Get aged receivables report showing outstanding invoices by age",
    inputSchema: {
      type: "object",
      properties: {
        contactId: {
          type: "string",
          description: "Xero contact ID to retrieve receivables for",
        },
        date: {
          type: "string",
          description:
            "Report date (YYYY-MM-DD format). Defaults to today's date if omitted",
        },
        fromDate: {
          type: "string",
          description: "Start date for the ageing period (YYYY-MM-DD format)",
        },
        toDate: {
          type: "string",
          description: "End date for the ageing period (YYYY-MM-DD format)",
        },
      },
      required: ["contactId"],
    },
  },
  {
    name: "xero_get_aged_payables",
    description: "Get aged payables report showing outstanding bills by age",
    inputSchema: {
      type: "object",
      properties: {
        contactId: {
          type: "string",
          description: "Xero contact ID to retrieve payables for",
        },
        date: {
          type: "string",
          description:
            "Report date (YYYY-MM-DD format). Defaults to today's date if omitted",
        },
        fromDate: {
          type: "string",
          description: "Start date for the ageing period (YYYY-MM-DD format)",
        },
        toDate: {
          type: "string",
          description: "End date for the ageing period (YYYY-MM-DD format)",
        },
      },
      required: ["contactId"],
    },
  },
  {
    name: "xero_create_invoice",
    description:
      "Create a new invoice in Xero. Creates a draft invoice by default.",
    inputSchema: {
      type: "object",
      properties: {
        contactId: {
          type: "string",
          description: "The Xero contact ID for the customer",
        },
        date: {
          type: "string",
          description: "Invoice date (YYYY-MM-DD format)",
        },
        dueDate: {
          type: "string",
          description: "Payment due date (YYYY-MM-DD format)",
        },
        lineItems: {
          type: "array",
          description: "Array of invoice line items",
          items: {
            type: "object",
            properties: {
              description: {
                type: "string",
                description: "Line item description",
              },
              quantity: {
                type: "number",
                description: "Quantity",
              },
              unitAmount: {
                type: "number",
                description: "Unit price",
              },
              accountCode: {
                type: "string",
                description: "Account code",
              },
              taxType: {
                type: "string",
                description: "Tax type (optional)",
              },
            },
            required: ["description", "quantity", "unitAmount", "accountCode"],
          },
        },
        reference: {
          type: "string",
          description: "Invoice reference number (optional)",
        },
        status: {
          type: "string",
          description: "Invoice status (DRAFT or AUTHORISED, default: DRAFT)",
          enum: ["DRAFT", "AUTHORISED"],
        },
      },
      required: ["contactId", "date", "dueDate", "lineItems"],
    },
  },
  {
    name: "xero_update_invoice",
    description:
      "Update an existing invoice in Xero. Can only update DRAFT invoices.",
    inputSchema: {
      type: "object",
      properties: {
        invoiceId: {
          type: "string",
          description: "The Xero invoice ID to update",
        },
        contactId: {
          type: "string",
          description: "The Xero contact ID for the customer",
        },
        date: {
          type: "string",
          description: "Invoice date (YYYY-MM-DD format)",
        },
        dueDate: {
          type: "string",
          description: "Payment due date (YYYY-MM-DD format)",
        },
        lineItems: {
          type: "array",
          description: "Array of invoice line items",
          items: {
            type: "object",
            properties: {
              description: {
                type: "string",
                description: "Line item description",
              },
              quantity: {
                type: "number",
                description: "Quantity",
              },
              unitAmount: {
                type: "number",
                description: "Unit price",
              },
              accountCode: {
                type: "string",
                description: "Account code",
              },
              taxType: {
                type: "string",
                description: "Tax type (optional)",
              },
            },
            required: ["description", "quantity", "unitAmount", "accountCode"],
          },
        },
        reference: {
          type: "string",
          description: "Invoice reference number (optional)",
        },
        status: {
          type: "string",
          description: "Invoice status (DRAFT or AUTHORISED)",
          enum: ["DRAFT", "AUTHORISED"],
        },
      },
      required: ["invoiceId"],
    },
  },
  {
    name: "xero_create_contact",
    description: "Create a new contact (customer/supplier) in Xero.",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Contact name",
        },
        email: {
          type: "string",
          description: "Contact email address",
        },
        phone: {
          type: "string",
          description: "Contact phone number",
        },
        addresses: {
          type: "array",
          description: "Array of contact addresses",
          items: {
            type: "object",
            properties: {
              addressType: {
                type: "string",
                description: "Address type (POBOX, STREET, DELIVERY)",
                enum: ["POBOX", "STREET", "DELIVERY"],
              },
              addressLine1: {
                type: "string",
                description: "Address line 1",
              },
              addressLine2: {
                type: "string",
                description: "Address line 2",
              },
              city: {
                type: "string",
                description: "City",
              },
              region: {
                type: "string",
                description: "Region/State",
              },
              postalCode: {
                type: "string",
                description: "Postal code",
              },
              country: {
                type: "string",
                description: "Country",
              },
            },
            required: ["addressType"],
          },
        },
      },
      required: ["name"],
    },
  },
  {
    name: "xero_update_contact",
    description: "Update an existing contact in Xero.",
    inputSchema: {
      type: "object",
      properties: {
        contactId: {
          type: "string",
          description: "The Xero contact ID to update",
        },
        name: {
          type: "string",
          description: "Contact name",
        },
        email: {
          type: "string",
          description: "Contact email address",
        },
        phone: {
          type: "string",
          description: "Contact phone number",
        },
        addresses: {
          type: "array",
          description: "Array of contact addresses",
          items: {
            type: "object",
            properties: {
              addressType: {
                type: "string",
                description: "Address type (POBOX, STREET, DELIVERY)",
                enum: ["POBOX", "STREET", "DELIVERY"],
              },
              addressLine1: {
                type: "string",
                description: "Address line 1",
              },
              addressLine2: {
                type: "string",
                description: "Address line 2",
              },
              city: {
                type: "string",
                description: "City",
              },
              region: {
                type: "string",
                description: "Region/State",
              },
              postalCode: {
                type: "string",
                description: "Postal code",
              },
              country: {
                type: "string",
                description: "Country",
              },
            },
            required: ["addressType"],
          },
        },
      },
      required: ["contactId"],
    },
  },
  {
    name: "xero_create_payment",
    description: "Create a payment for an invoice in Xero.",
    inputSchema: {
      type: "object",
      properties: {
        invoiceId: {
          type: "string",
          description: "The Xero invoice ID to pay",
        },
        accountId: {
          type: "string",
          description: "The Xero bank account ID for the payment",
        },
        amount: {
          type: "number",
          description: "Payment amount",
        },
        date: {
          type: "string",
          description: "Payment date (YYYY-MM-DD format)",
        },
        reference: {
          type: "string",
          description: "Payment reference (optional)",
        },
      },
      required: ["invoiceId", "accountId", "amount", "date"],
    },
  },
  {
    name: "xero_create_quote",
    description: "Create a new quote in Xero.",
    inputSchema: {
      type: "object",
      properties: {
        contactId: {
          type: "string",
          description: "The Xero contact ID for the customer",
        },
        date: {
          type: "string",
          description: "Quote date (YYYY-MM-DD format)",
        },
        expiryDate: {
          type: "string",
          description: "Quote expiry date (YYYY-MM-DD format)",
        },
        lineItems: {
          type: "array",
          description: "Array of quote line items",
          items: {
            type: "object",
            properties: {
              description: {
                type: "string",
                description: "Line item description",
              },
              quantity: {
                type: "number",
                description: "Quantity",
              },
              unitAmount: {
                type: "number",
                description: "Unit price",
              },
              accountCode: {
                type: "string",
                description: "Account code",
              },
              taxType: {
                type: "string",
                description: "Tax type (optional)",
              },
            },
            required: ["description", "quantity", "unitAmount", "accountCode"],
          },
        },
        reference: {
          type: "string",
          description: "Quote reference number (optional)",
        },
        status: {
          type: "string",
          description:
            "Quote status (DRAFT, SENT, ACCEPTED, DECLINED, default: DRAFT)",
          enum: ["DRAFT", "SENT", "ACCEPTED", "DECLINED"],
        },
      },
      required: ["contactId", "date", "expiryDate", "lineItems"],
    },
  },
  {
    name: "xero_create_credit_note",
    description: "Create a new credit note in Xero.",
    inputSchema: {
      type: "object",
      properties: {
        contactId: {
          type: "string",
          description: "The Xero contact ID for the customer",
        },
        date: {
          type: "string",
          description: "Credit note date (YYYY-MM-DD format)",
        },
        lineItems: {
          type: "array",
          description: "Array of credit note line items",
          items: {
            type: "object",
            properties: {
              description: {
                type: "string",
                description: "Line item description",
              },
              quantity: {
                type: "number",
                description: "Quantity",
              },
              unitAmount: {
                type: "number",
                description: "Unit price",
              },
              accountCode: {
                type: "string",
                description: "Account code",
              },
              taxType: {
                type: "string",
                description: "Tax type (optional)",
              },
            },
            required: ["description", "quantity", "unitAmount", "accountCode"],
          },
        },
        reference: {
          type: "string",
          description: "Credit note reference number (optional)",
        },
        status: {
          type: "string",
          description:
            "Credit note status (DRAFT, SUBMITTED, AUTHORISED, PAID, VOIDED, default: DRAFT)",
          enum: ["DRAFT", "SUBMITTED", "AUTHORISED", "PAID", "VOIDED"],
        },
      },
      required: ["contactId", "date", "lineItems"],
    },
  },
  {
    name: "xero_update_credit_note",
    description:
      "Update an existing credit note in Xero. Can only update DRAFT credit notes.",
    inputSchema: {
      type: "object",
      properties: {
        creditNoteId: {
          type: "string",
          description: "The Xero credit note ID to update",
        },
        contactId: {
          type: "string",
          description: "The Xero contact ID for the customer",
        },
        date: {
          type: "string",
          description: "Credit note date (YYYY-MM-DD format)",
        },
        lineItems: {
          type: "array",
          description: "Array of credit note line items",
          items: {
            type: "object",
            properties: {
              description: {
                type: "string",
                description: "Line item description",
              },
              quantity: {
                type: "number",
                description: "Quantity",
              },
              unitAmount: {
                type: "number",
                description: "Unit price",
              },
              accountCode: {
                type: "string",
                description: "Account code",
              },
              taxType: {
                type: "string",
                description: "Tax type (optional)",
              },
            },
            required: ["description", "quantity", "unitAmount", "accountCode"],
          },
        },
        reference: {
          type: "string",
          description: "Credit note reference number (optional)",
        },
        status: {
          type: "string",
          description:
            "Credit note status (DRAFT, SUBMITTED, AUTHORISED, PAID, VOIDED)",
          enum: ["DRAFT", "SUBMITTED", "AUTHORISED", "PAID", "VOIDED"],
        },
      },
      required: ["creditNoteId"],
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
            whereClauses.push(
              `BankAccount.AccountID==Guid("${bankAccountId}")`
            );
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
          const { date, periods, timeframe } = args;

          const response = await client.accountingApi.getReportBalanceSheet(
            connection.tenantId,
            date as string | undefined,
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

        case "xero_list_items": {
          const { code, limit = 100 } = args;

          const where = code ? `Code=="${code as string}"` : undefined;

          const response = await client.accountingApi.getItems(
            connection.tenantId,
            undefined, // ifModifiedSince
            where,
            undefined, // order
            undefined // unitdp
          );

          const items = response.body.items ?? [];
          const limitValue = typeof limit === "number" ? limit : 100;

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(items.slice(0, limitValue), null, 2),
              },
            ],
          };
        }

        case "xero_list_quotes": {
          const { status, dateFrom, dateTo, limit = 100 } = args;

          const response = await client.accountingApi.getQuotes(
            connection.tenantId,
            undefined, // ifModifiedSince
            dateFrom as string | undefined,
            dateTo as string | undefined,
            undefined, // expiryDateFrom
            undefined, // expiryDateTo
            undefined, // contactID
            status as string | undefined,
            undefined, // page
            undefined, // order
            undefined // quoteNumber
          );

          const quotes = response.body.quotes ?? [];
          const limitValue = typeof limit === "number" ? limit : 100;

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(quotes.slice(0, limitValue), null, 2),
              },
            ],
          };
        }

        case "xero_list_contact_groups": {
          const response = await client.accountingApi.getContactGroups(
            connection.tenantId
          );

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(response.body.contactGroups, null, 2),
              },
            ],
          };
        }

        case "xero_get_aged_receivables": {
          const { contactId, date, fromDate, toDate } = args;

          if (!contactId) {
            throw new Error("contactId is required");
          }

          const response =
            await client.accountingApi.getReportAgedReceivablesByContact(
              connection.tenantId,
              contactId as string,
              date as string | undefined,
              fromDate as string | undefined,
              toDate as string | undefined
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

        case "xero_get_aged_payables": {
          const { contactId, date, fromDate, toDate } = args;

          if (!contactId) {
            throw new Error("contactId is required");
          }

          const response =
            await client.accountingApi.getReportAgedPayablesByContact(
              connection.tenantId,
              contactId as string,
              date as string | undefined,
              fromDate as string | undefined,
              toDate as string | undefined
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

        case "xero_create_invoice": {
          const { contactId, date, dueDate, lineItems, reference, status } =
            args;

          // Validate required fields
          if (!contactId || !date || !dueDate || !lineItems) {
            throw new Error(
              "contactId, date, dueDate, and lineItems are required"
            );
          }

          // Validate line items array
          if (!Array.isArray(lineItems) || lineItems.length === 0) {
            throw new Error("lineItems must be a non-empty array");
          }

          // Validate each line item
          for (const item of lineItems) {
            if (
              !item.description ||
              typeof item.quantity !== "number" ||
              typeof item.unitAmount !== "number" ||
              !item.accountCode
            ) {
              throw new Error(
                "All line items must have description, quantity, unitAmount, and accountCode"
              );
            }
          }

          // Validate status if provided
          if (status && !["DRAFT", "AUTHORISED"].includes(status as string)) {
            throw new Error("Status must be either DRAFT or AUTHORISED");
          }

          // Construct invoice object
          const invoice: Invoice = {
            type: Invoice.TypeEnum.ACCREC, // Accounts Receivable
            contact: {
              contactID: contactId as string,
            },
            date: date as string,
            dueDate: dueDate as string,
            lineItems: (lineItems as any[]).map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitAmount: item.unitAmount,
              accountCode: item.accountCode,
              taxType: item.taxType || "NONE",
            })),
            status:
              (status as string) === "AUTHORISED"
                ? Invoice.StatusEnum.AUTHORISED
                : Invoice.StatusEnum.DRAFT,
            reference: reference as string | undefined,
          };

          const response = await client.accountingApi.createInvoices(
            connection.tenantId,
            {
              invoices: [invoice],
            }
          );

          // Check for validation errors from Xero API
          if (response.body.invoices?.[0]?.hasErrors) {
            const errors = response.body.invoices[0].validationErrors;
            throw new Error(
              `Invoice validation failed: ${JSON.stringify(errors)}`
            );
          }

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    success: true,
                    invoice: response.body.invoices?.[0],
                    message: "Invoice created successfully",
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        case "xero_update_invoice": {
          const {
            invoiceId,
            contactId,
            date,
            dueDate,
            lineItems,
            reference,
            status,
          } = args;

          // Validate required fields
          if (!invoiceId) {
            throw new Error("invoiceId is required");
          }

          // Validate line items if provided
          if (lineItems) {
            if (!Array.isArray(lineItems) || lineItems.length === 0) {
              throw new Error("lineItems must be a non-empty array");
            }
            for (const item of lineItems) {
              if (
                !item.description ||
                typeof item.quantity !== "number" ||
                typeof item.unitAmount !== "number" ||
                !item.accountCode
              ) {
                throw new Error(
                  "All line items must have description, quantity, unitAmount, and accountCode"
                );
              }
            }
          }

          // Validate status if provided
          if (status && !["DRAFT", "AUTHORISED"].includes(status as string)) {
            throw new Error("Status must be either DRAFT or AUTHORISED");
          }

          // Construct invoice object with only provided fields
          const invoice: Partial<Invoice> = {
            invoiceID: invoiceId as string,
          };

          if (contactId) invoice.contact = { contactID: contactId as string };
          if (date) invoice.date = date as string;
          if (dueDate) invoice.dueDate = dueDate as string;
          if (reference) invoice.reference = reference as string;
          if (status) {
            invoice.status =
              status === "AUTHORISED"
                ? Invoice.StatusEnum.AUTHORISED
                : Invoice.StatusEnum.DRAFT;
          }
          if (lineItems) {
            invoice.lineItems = (lineItems as any[]).map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitAmount: item.unitAmount,
              accountCode: item.accountCode,
              taxType: item.taxType || "NONE",
            }));
          }

          const response = await client.accountingApi.updateInvoice(
            connection.tenantId,
            invoiceId as string,
            { invoices: [invoice as Invoice] }
          );

          // Check for validation errors from Xero API
          if (response.body.invoices?.[0]?.hasErrors) {
            const errors = response.body.invoices[0].validationErrors;
            throw new Error(
              `Invoice update validation failed: ${JSON.stringify(errors)}`
            );
          }

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    success: true,
                    invoice: response.body.invoices?.[0],
                    message: "Invoice updated successfully",
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        case "xero_create_contact": {
          const { name, email, phone, addresses } = args;

          // Validate required fields
          if (!name) {
            throw new Error("name is required");
          }

          // Validate addresses if provided
          if (addresses) {
            if (!Array.isArray(addresses)) {
              throw new Error("addresses must be an array");
            }
            for (const addr of addresses) {
              if (
                !addr.addressType ||
                !["POBOX", "STREET", "DELIVERY"].includes(addr.addressType)
              ) {
                throw new Error(
                  "Address type must be POBOX, STREET, or DELIVERY"
                );
              }
            }
          }

          // Construct contact object
          const contact = {
            name: name as string,
            emailAddress: email as string | undefined,
            phones: phone
              ? [
                  {
                    phoneType: Phone.PhoneTypeEnum.DEFAULT,
                    phoneNumber: phone as string,
                  },
                ]
              : undefined,
            addresses: addresses
              ? (addresses as any[]).map((addr) => ({
                  addressType: addr.addressType,
                  addressLine1: addr.addressLine1,
                  addressLine2: addr.addressLine2,
                  city: addr.city,
                  region: addr.region,
                  postalCode: addr.postalCode,
                  country: addr.country,
                }))
              : undefined,
          };

          const response = await client.accountingApi.createContacts(
            connection.tenantId,
            { contacts: [contact] }
          );

          // Check for validation errors from Xero API
          if (response.body.contacts?.[0]?.hasValidationErrors) {
            const errors = response.body.contacts[0].validationErrors;
            throw new Error(
              `Contact validation failed: ${JSON.stringify(errors)}`
            );
          }

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    success: true,
                    contact: response.body.contacts?.[0],
                    message: "Contact created successfully",
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        case "xero_update_contact": {
          const { contactId, name, email, phone, addresses } = args;

          // Validate required fields
          if (!contactId) {
            throw new Error("contactId is required");
          }

          // Validate addresses if provided
          if (addresses) {
            if (!Array.isArray(addresses)) {
              throw new Error("addresses must be an array");
            }
            for (const addr of addresses) {
              if (
                !addr.addressType ||
                !["POBOX", "STREET", "DELIVERY"].includes(addr.addressType)
              ) {
                throw new Error(
                  "Address type must be POBOX, STREET, or DELIVERY"
                );
              }
            }
          }

          // Construct contact object with only provided fields
          const contact: any = {
            contactID: contactId as string,
          };

          if (name) contact.name = name as string;
          if (email) contact.emailAddress = email as string;
          if (phone) {
            contact.phones = [
              {
                phoneType: "DEFAULT",
                phoneNumber: phone as string,
              },
            ];
          }
          if (addresses) {
            contact.addresses = (addresses as any[]).map((addr) => ({
              addressType: addr.addressType,
              addressLine1: addr.addressLine1,
              addressLine2: addr.addressLine2,
              city: addr.city,
              region: addr.region,
              postalCode: addr.postalCode,
              country: addr.country,
            }));
          }

          const response = await client.accountingApi.updateContact(
            connection.tenantId,
            contactId as string,
            { contacts: [contact] }
          );

          // Check for validation errors from Xero API
          if (response.body.contacts?.[0]?.hasValidationErrors) {
            const errors = response.body.contacts[0].validationErrors;
            throw new Error(
              `Contact update validation failed: ${JSON.stringify(errors)}`
            );
          }

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    success: true,
                    contact: response.body.contacts?.[0],
                    message: "Contact updated successfully",
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        case "xero_create_payment": {
          const { invoiceId, accountId, amount, date, reference } = args;

          // Validate required fields
          if (!invoiceId || !accountId || typeof amount !== "number" || !date) {
            throw new Error(
              "invoiceId, accountId, amount, and date are required"
            );
          }

          // Construct payment object
          const payment = {
            invoice: { invoiceID: invoiceId as string },
            account: { accountID: accountId as string },
            amount: amount as number,
            date: date as string,
            reference: reference as string | undefined,
          };

          const response = await client.accountingApi.createPayments(
            connection.tenantId,
            { payments: [payment] }
          );

          // Check for validation errors from Xero API
          if (response.body.payments?.[0]?.hasValidationErrors) {
            const errors = response.body.payments[0].validationErrors;
            throw new Error(
              `Payment validation failed: ${JSON.stringify(errors)}`
            );
          }

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    success: true,
                    payment: response.body.payments?.[0],
                    message: "Payment created successfully",
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        case "xero_create_quote": {
          const { contactId, date, expiryDate, lineItems, reference, status } =
            args;

          // Validate required fields
          if (!contactId || !date || !expiryDate || !lineItems) {
            throw new Error(
              "contactId, date, expiryDate, and lineItems are required"
            );
          }

          // Validate line items array
          if (!Array.isArray(lineItems) || lineItems.length === 0) {
            throw new Error("lineItems must be a non-empty array");
          }

          // Validate each line item
          for (const item of lineItems) {
            if (
              !item.description ||
              typeof item.quantity !== "number" ||
              typeof item.unitAmount !== "number" ||
              !item.accountCode
            ) {
              throw new Error(
                "All line items must have description, quantity, unitAmount, and accountCode"
              );
            }
          }

          // Validate status if provided
          if (
            status &&
            !["DRAFT", "SENT", "ACCEPTED", "DECLINED"].includes(
              status as string
            )
          ) {
            throw new Error(
              "Status must be DRAFT, SENT, ACCEPTED, or DECLINED"
            );
          }

          // Construct quote object
          const quote = {
            contact: {
              contactID: contactId as string,
            },
            date: date as string,
            expiryDate: expiryDate as string,
            lineItems: (lineItems as any[]).map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitAmount: item.unitAmount,
              accountCode: item.accountCode,
              taxType: item.taxType || "NONE",
            })),
            reference: reference as string | undefined,
            status: status as QuoteStatusCodes | undefined,
          };

          const response = await client.accountingApi.createQuotes(
            connection.tenantId,
            { quotes: [quote] }
          );

          // Check for validation errors from Xero API
          if (response.body.quotes?.[0]?.validationErrors?.length) {
            const errors = response.body.quotes[0].validationErrors;
            throw new Error(
              `Quote validation failed: ${JSON.stringify(errors)}`
            );
          }

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    success: true,
                    quote: response.body.quotes?.[0],
                    message: "Quote created successfully",
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        case "xero_create_credit_note": {
          const { contactId, date, lineItems, reference, status } = args;

          // Validate required fields
          if (!contactId || !date || !lineItems) {
            throw new Error("contactId, date, and lineItems are required");
          }

          // Validate line items array
          if (!Array.isArray(lineItems) || lineItems.length === 0) {
            throw new Error("lineItems must be a non-empty array");
          }

          // Validate each line item
          for (const item of lineItems) {
            if (
              !item.description ||
              typeof item.quantity !== "number" ||
              typeof item.unitAmount !== "number" ||
              !item.accountCode
            ) {
              throw new Error(
                "All line items must have description, quantity, unitAmount, and accountCode"
              );
            }
          }

          // Validate status if provided
          if (
            status &&
            !["DRAFT", "SUBMITTED", "AUTHORISED", "PAID", "VOIDED"].includes(
              status as string
            )
          ) {
            throw new Error(
              "Status must be DRAFT, SUBMITTED, AUTHORISED, PAID, or VOIDED"
            );
          }

          // Construct credit note object
          const creditNote = {
            type: CreditNote.TypeEnum.ACCRECCREDIT, // Accounts Receivable Credit Note
            contact: {
              contactID: contactId as string,
            },
            date: date as string,
            lineItems: (lineItems as any[]).map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitAmount: item.unitAmount,
              accountCode: item.accountCode,
              taxType: item.taxType || "NONE",
            })),
            reference: reference as string | undefined,
            status: status as CreditNote.StatusEnum | undefined,
          };

          const response = await client.accountingApi.createCreditNotes(
            connection.tenantId,
            { creditNotes: [creditNote] }
          );

          // Check for validation errors from Xero API
          if (response.body.creditNotes?.[0]?.hasErrors) {
            const errors = response.body.creditNotes[0].validationErrors;
            throw new Error(
              `Credit note validation failed: ${JSON.stringify(errors)}`
            );
          }

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    success: true,
                    creditNote: response.body.creditNotes?.[0],
                    message: "Credit note created successfully",
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        case "xero_update_credit_note": {
          const {
            creditNoteId,
            contactId,
            date,
            lineItems,
            reference,
            status,
          } = args;

          // Validate required fields
          if (!creditNoteId) {
            throw new Error("creditNoteId is required");
          }

          // Validate line items if provided
          if (lineItems) {
            if (!Array.isArray(lineItems) || lineItems.length === 0) {
              throw new Error("lineItems must be a non-empty array");
            }
            for (const item of lineItems) {
              if (
                !item.description ||
                typeof item.quantity !== "number" ||
                typeof item.unitAmount !== "number" ||
                !item.accountCode
              ) {
                throw new Error(
                  "All line items must have description, quantity, unitAmount, and accountCode"
                );
              }
            }
          }

          // Validate status if provided
          if (
            status &&
            !["DRAFT", "SUBMITTED", "AUTHORISED", "PAID", "VOIDED"].includes(
              status as string
            )
          ) {
            throw new Error(
              "Status must be DRAFT, SUBMITTED, AUTHORISED, PAID, or VOIDED"
            );
          }

          // Construct credit note object with only provided fields
          const creditNote: any = {
            creditNoteID: creditNoteId as string,
          };

          if (contactId)
            creditNote.contact = { contactID: contactId as string };
          if (date) creditNote.date = date as string;
          if (reference) creditNote.reference = reference as string;
          if (status) creditNote.status = status as CreditNote.StatusEnum;
          if (lineItems) {
            creditNote.lineItems = (lineItems as any[]).map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitAmount: item.unitAmount,
              accountCode: item.accountCode,
              taxType: item.taxType || "NONE",
            }));
          }

          const response = await client.accountingApi.updateCreditNote(
            connection.tenantId,
            creditNoteId as string,
            { creditNotes: [creditNote] }
          );

          // Check for validation errors from Xero API
          if (response.body.creditNotes?.[0]?.hasErrors) {
            const errors = response.body.creditNotes[0].validationErrors;
            throw new Error(
              `Credit note update validation failed: ${JSON.stringify(errors)}`
            );
          }

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    success: true,
                    creditNote: response.body.creditNotes?.[0],
                    message: "Credit note updated successfully",
                  },
                  null,
                  2
                ),
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

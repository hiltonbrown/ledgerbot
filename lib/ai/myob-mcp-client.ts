import "server-only";

import {
  updateMyobConnectionError,
  updateMyobLastApiCall,
} from "@/lib/db/queries";
import { getDecryptedConnection } from "@/lib/myob/connection-manager";
import {
  getMyobErrorMessage,
  parseMyobError,
  requiresMyobReauth,
} from "@/lib/myob/error-handler";
import type { DecryptedMyobConnection, MyobApiResponse } from "@/lib/myob/types";

/**
 * MYOB MCP Client
 * Provides MCP-compatible tool interfaces for MYOB Business API operations
 *
 * Note: Unlike Xero, MYOB does not have an official Node.js SDK
 * This client uses direct fetch calls to the MYOB Business API
 */

export type MyobMCPTool = {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
};

export type MyobMCPToolResult = {
  content: Array<{
    type: "text";
    text: string;
  }>;
  isError?: boolean;
};

// MYOB API Base URLs
const MYOB_API_BASE_URL = "https://api.myob.com/accountright";

/**
 * Get required headers for MYOB API requests
 */
function getMyobHeaders(
  connection: DecryptedMyobConnection,
  includeCompanyFile = true
): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${connection.accessToken}`,
    "x-myobapi-key": process.env.MYOB_API_KEY || "",
    "x-myobapi-version": "v2",
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  // Add company file credentials if available
  if (
    includeCompanyFile &&
    connection.cfUsername &&
    connection.cfPassword
  ) {
    const cfToken = Buffer.from(
      `${connection.cfUsername}:${connection.cfPassword}`
    ).toString("base64");
    headers["x-myobapi-cftoken"] = cfToken;
  }

  return headers;
}

/**
 * Make an authenticated MYOB API request
 */
async function makeMyobRequest<T>(
  userId: string,
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const connection = await getDecryptedConnection(userId);

  if (!connection) {
    throw new Error(
      "No active MYOB connection found. Please connect to MYOB first."
    );
  }

  if (!connection.businessId) {
    throw new Error(
      "MYOB connection is missing business ID. Please reconnect to MYOB."
    );
  }

  const apiKey = process.env.MYOB_API_KEY;
  if (!apiKey) {
    throw new Error("MYOB_API_KEY environment variable is not configured");
  }

  // Build full URL with company file URI (businessId)
  const url = `${MYOB_API_BASE_URL}/${connection.businessId}${endpoint}`;

  console.log(`[MYOB API] ${options.method || "GET"} ${endpoint}`);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...getMyobHeaders(connection),
        ...options.headers,
      },
    });

    // Update last API call timestamp
    await updateMyobLastApiCall(connection.id);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[MYOB API Error] ${response.status}: ${errorText}`);

      const error = {
        status: response.status,
        statusText: response.statusText,
        message: errorText,
      };

      const parsedError = parseMyobError(error);

      // Update connection error status if it requires reauth
      if (parsedError.requiresReauth) {
        await updateMyobConnectionError(
          connection.id,
          parsedError.message,
          parsedError.type
        );
      }

      throw new Error(parsedError.message);
    }

    const data = await response.json();
    return data as T;
  } catch (error) {
    console.error(`[MYOB API] Request failed:`, error);

    // Check if error requires reauth
    if (requiresMyobReauth(error)) {
      const errorMessage = getMyobErrorMessage(error);
      await updateMyobConnectionError(
        connection.id,
        errorMessage,
        "authentication_error"
      );
    }

    throw error;
  }
}

/**
 * Build OData query string from parameters
 */
function buildODataQuery(params: {
  filter?: string;
  orderby?: string;
  top?: number;
  skip?: number;
}): string {
  const queryParts: string[] = [];

  if (params.filter) {
    queryParts.push(`$filter=${encodeURIComponent(params.filter)}`);
  }

  if (params.orderby) {
    queryParts.push(`$orderby=${encodeURIComponent(params.orderby)}`);
  }

  if (params.top !== undefined && params.top > 0) {
    queryParts.push(`$top=${Math.min(params.top, 1000)}`); // MYOB max 1000
  }

  if (params.skip !== undefined && params.skip > 0) {
    queryParts.push(`$skip=${params.skip}`);
  }

  return queryParts.length > 0 ? `?${queryParts.join("&")}` : "";
}

/**
 * Available MYOB MCP Tools
 */
export const myobMCPTools: MyobMCPTool[] = [
  {
    name: "myob_list_invoices",
    description:
      "Get a list of invoices from MYOB. Returns sales invoices (Item/Service/Professional types). Use filters to narrow results by date, status, or customer.",
    inputSchema: {
      type: "object",
      properties: {
        invoiceType: {
          type: "string",
          description:
            "Invoice type: Item, Service, Professional, or Miscellaneous (default: Item)",
          enum: ["Item", "Service", "Professional", "Miscellaneous"],
        },
        dateFrom: {
          type: "string",
          description:
            "Filter invoices from this date (ISO 8601 format YYYY-MM-DD)",
        },
        dateTo: {
          type: "string",
          description:
            "Filter invoices to this date (ISO 8601 format YYYY-MM-DD)",
        },
        limit: {
          type: "number",
          description: "Maximum number of invoices to return (default: 100)",
        },
      },
    },
  },
  {
    name: "myob_get_invoice",
    description:
      "Get detailed information about a specific invoice by UID. Returns complete invoice details including line items, amounts, and customer information.",
    inputSchema: {
      type: "object",
      properties: {
        invoiceUid: {
          type: "string",
          description: "The MYOB invoice UID (unique identifier)",
        },
        invoiceType: {
          type: "string",
          description: "Invoice type: Item, Service, Professional, or Miscellaneous",
          enum: ["Item", "Service", "Professional", "Miscellaneous"],
        },
      },
      required: ["invoiceUid"],
    },
  },
  {
    name: "myob_list_contacts",
    description:
      "Get a list of contacts (customers and suppliers) from MYOB. Use searchTerm to filter by name or company name.",
    inputSchema: {
      type: "object",
      properties: {
        contactType: {
          type: "string",
          description: "Contact type: Customer, Supplier, or Personal",
          enum: ["Customer", "Supplier", "Personal"],
        },
        searchTerm: {
          type: "string",
          description: "Search contacts by name or company name",
        },
        limit: {
          type: "number",
          description: "Maximum number of contacts to return (default: 100)",
        },
      },
    },
  },
  {
    name: "myob_get_contact",
    description:
      "Get detailed information about a specific contact by UID. Returns complete contact details including addresses, phone numbers, and tax settings.",
    inputSchema: {
      type: "object",
      properties: {
        contactUid: {
          type: "string",
          description: "The MYOB contact UID (unique identifier)",
        },
        contactType: {
          type: "string",
          description: "Contact type: Customer, Supplier, or Personal",
          enum: ["Customer", "Supplier", "Personal"],
        },
      },
      required: ["contactUid"],
    },
  },
  {
    name: "myob_list_accounts",
    description:
      "Get the chart of accounts from MYOB. Use this to view available accounts for transactions and reporting.",
    inputSchema: {
      type: "object",
      properties: {
        accountType: {
          type: "string",
          description:
            "Filter by account classification (Asset, Liability, Equity, Income, Expense, etc.)",
        },
        limit: {
          type: "number",
          description: "Maximum number of accounts to return (default: 100)",
        },
      },
    },
  },
  {
    name: "myob_get_company_file",
    description:
      "Get information about the connected MYOB company file. Returns company name, version, and settings.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

/**
 * Execute a MYOB MCP tool
 */
export async function executeMyobMCPTool(
  userId: string,
  toolName: string,
  args: Record<string, unknown>
): Promise<MyobMCPToolResult> {
  try {
    console.log(`[MYOB MCP] Executing tool: ${toolName}`, args);

    switch (toolName) {
      case "myob_list_invoices":
        return await myobListInvoices(userId, args);

      case "myob_get_invoice":
        return await myobGetInvoice(userId, args);

      case "myob_list_contacts":
        return await myobListContacts(userId, args);

      case "myob_get_contact":
        return await myobGetContact(userId, args);

      case "myob_list_accounts":
        return await myobListAccounts(userId, args);

      case "myob_get_company_file":
        return await myobGetCompanyFile(userId);

      default:
        throw new Error(`Unknown MYOB tool: ${toolName}`);
    }
  } catch (error) {
    console.error(`[MYOB MCP] Tool execution failed:`, error);
    const errorMessage = getMyobErrorMessage(error);

    return {
      content: [
        {
          type: "text",
          text: `Error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * List invoices from MYOB
 */
async function myobListInvoices(
  userId: string,
  args: Record<string, unknown>
): Promise<MyobMCPToolResult> {
  const invoiceType = (args.invoiceType as string) || "Item";
  const dateFrom = args.dateFrom as string | undefined;
  const dateTo = args.dateTo as string | undefined;
  const limit = (args.limit as number) || 100;

  // Helper to validate ISO 8601 date (YYYY-MM-DD)
  function isValidIsoDate(date: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(date);
  }
  // Escape single quotes for OData
  function escapeODataString(str: string): string {
    return str.replace(/'/g, "''");
  }

  // Build OData filter
  const filters: string[] = [];

  if (dateFrom && isValidIsoDate(dateFrom)) {
    filters.push(`Date ge datetime'${escapeODataString(dateFrom)}'`);
  }

  if (dateTo && isValidIsoDate(dateTo)) {
    filters.push(`Date le datetime'${escapeODataString(dateTo)}'`);
  }

  const queryString = buildODataQuery({
    filter: filters.length > 0 ? filters.join(" and ") : undefined,
    orderby: "Date desc",
    top: limit,
  });

  const endpoint = `/Sale/Invoice/${invoiceType}${queryString}`;

  const response = await makeMyobRequest<MyobApiResponse<any>>(
    userId,
    endpoint
  );

  const invoices = response.Items || [];

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            count: invoices.length,
            invoices: invoices.map((inv: any) => ({
              uid: inv.UID,
              number: inv.Number,
              date: inv.Date,
              customer: inv.Customer?.Name,
              subtotal: inv.Subtotal,
              totalTax: inv.TotalTax,
              totalAmount: inv.TotalAmount,
              balanceDueAmount: inv.BalanceDueAmount,
              status: inv.Status,
            })),
          },
          null,
          2
        ),
      },
    ],
  };
}

/**
 * Get a specific invoice from MYOB
 */
async function myobGetInvoice(
  userId: string,
  args: Record<string, unknown>
): Promise<MyobMCPToolResult> {
  const invoiceUid = args.invoiceUid as string;
  const invoiceType = (args.invoiceType as string) || "Item";

  if (!invoiceUid) {
    throw new Error("invoiceUid is required");
  }

  const endpoint = `/Sale/Invoice/${invoiceType}/${invoiceUid}`;

  const invoice = await makeMyobRequest<any>(userId, endpoint);

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(invoice, null, 2),
      },
    ],
  };
}

/**
 * List contacts from MYOB
 */
async function myobListContacts(
  userId: string,
  args: Record<string, unknown>
): Promise<MyobMCPToolResult> {
  const contactType = (args.contactType as string) || "Customer";
  const searchTerm = args.searchTerm as string | undefined;
  const limit = (args.limit as number) || 100;

  // Build OData filter for search
  let filter: string | undefined;
  if (searchTerm) {
    // Search in both CompanyName and LastName (for individuals)
    // NOTE: The 'substringof' function is valid for OData v2/v3 only.
    // If MYOB upgrades to OData v4, change this to:
    //   filter = `contains(CompanyName,'${searchTerm}') or contains(LastName,'${searchTerm}')`;
    filter = `substringof('${searchTerm}',CompanyName) or substringof('${searchTerm}',LastName)`;
  }

  const queryString = buildODataQuery({
    filter,
    orderby: "CompanyName",
    top: limit,
  });

  const endpoint = `/Contact/${contactType}${queryString}`;

  const response = await makeMyobRequest<MyobApiResponse<any>>(
    userId,
    endpoint
  );

  const contacts = response.Items || [];

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            count: contacts.length,
            contacts: contacts.map((contact: any) => ({
              uid: contact.UID,
              displayID: contact.DisplayID,
              companyName: contact.CompanyName,
              firstName: contact.FirstName,
              lastName: contact.LastName,
              email: contact.Email,
              isActive: contact.IsActive,
            })),
          },
          null,
          2
        ),
      },
    ],
  };
}

/**
 * Get a specific contact from MYOB
 */
async function myobGetContact(
  userId: string,
  args: Record<string, unknown>
): Promise<MyobMCPToolResult> {
  const contactUid = args.contactUid as string;
  const contactType = (args.contactType as string) || "Customer";

  if (!contactUid) {
    throw new Error("contactUid is required");
  }

  const endpoint = `/Contact/${contactType}/${contactUid}`;

  const contact = await makeMyobRequest<any>(userId, endpoint);

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(contact, null, 2),
      },
    ],
  };
}

/**
 * List accounts from MYOB
 */
async function myobListAccounts(
  userId: string,
  args: Record<string, unknown>
): Promise<MyobMCPToolResult> {
  const accountType = args.accountType as string | undefined;
  const limit = (args.limit as number) || 100;

  // Allowed MYOB account classifications
  const allowedClassifications = [
    "Asset",
    "Liability",
    "Equity",
    "Income",
    "Expense",
    "Other Income",
    "Other Expense"
  ];

  // Build OData filter
  let filter: string | undefined;
  if (accountType) {
    if (!allowedClassifications.includes(accountType)) {
      throw new Error(`Invalid accountType: ${accountType}`);
    }
    filter = `Classification eq '${accountType.replace(/'/g, "''")}'`;
  }

  const queryString = buildODataQuery({
    filter,
    orderby: "DisplayID",
    top: limit,
  });

  const endpoint = `/GeneralLedger/Account${queryString}`;

  const response = await makeMyobRequest<MyobApiResponse<any>>(
    userId,
    endpoint
  );

  const accounts = response.Items || [];

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            count: accounts.length,
            accounts: accounts.map((account: any) => ({
              uid: account.UID,
              displayID: account.DisplayID,
              name: account.Name,
              type: account.Type,
              classification: account.Classification,
              isActive: account.IsActive,
              currentBalance: account.CurrentBalance,
            })),
          },
          null,
          2
        ),
      },
    ],
  };
}

/**
 * Get company file information
 */
async function myobGetCompanyFile(
  userId: string
): Promise<MyobMCPToolResult> {
  const endpoint = "/";

  const companyFile = await makeMyobRequest<any>(userId, endpoint);

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(companyFile, null, 2),
      },
    ],
  };
}

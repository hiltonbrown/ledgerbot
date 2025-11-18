/**
 * QuickBooks MCP (Model Context Protocol) Client
 *
 * This module provides MCP-compatible tool definitions for QuickBooks Online API integration.
 * It follows the same pattern as the Xero MCP client, providing direct API access without
 * requiring a separate MCP server process.
 *
 * Tools provided:
 * - Invoice operations (list, get)
 * - Customer operations (list, get)
 * - Vendor operations (list, get)
 * - Account operations (list)
 * - Company info (get)
 *
 * All tools require an active QuickBooks connection for the user.
 */

import "server-only";

import { getDecryptedConnection } from "@/lib/quickbooks/connection-manager";
import type { QuickBooksAPIResponse } from "@/lib/quickbooks/types";

// QuickBooks API base URLs
const QB_API_URLS = {
  sandbox: "https://sandbox-quickbooks.api.intuit.com/v3/company",
  production: "https://quickbooks.api.intuit.com/v3/company",
};

/**
 * Make an authenticated request to the QuickBooks API
 */
async function makeQuickBooksRequest<T>(
  userId: string,
  endpoint: string,
  options: {
    method?: string;
    body?: any;
    query?: Record<string, string>;
  } = {}
): Promise<QuickBooksAPIResponse<T>> {
  const connection = await getDecryptedConnection(userId);

  if (!connection) {
    throw new Error(
      "No active QuickBooks connection found. Please connect your QuickBooks account in Settings > Integrations."
    );
  }

  const baseUrl =
    QB_API_URLS[connection.environment || "production"] +
    `/${connection.realmId}`;

  // Build query string
  const queryParams = new URLSearchParams(options.query || {});
  const url = `${baseUrl}${endpoint}${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;

  const response = await fetch(url, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${connection.accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(30_000), // 30 second timeout
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(
      `QuickBooks API error: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  return await response.json();
}

/**
 * List invoices from QuickBooks
 *
 * @param userId - User ID for connection lookup
 * @param status - Filter by invoice status (e.g., "Paid", "Unpaid", "All")
 * @param startDate - Filter invoices on or after this date (YYYY-MM-DD)
 * @param endDate - Filter invoices on or before this date (YYYY-MM-DD)
 * @param maxResults - Maximum number of results to return (default: 100)
 */
export async function listQuickBooksInvoices(
  userId: string,
  options: {
    status?: string;
    startDate?: string;
    endDate?: string;
    maxResults?: number;
  } = {}
): Promise<any[]> {
  const { status, startDate, endDate, maxResults = 100 } = options;

  // Build SQL-like query for QuickBooks API
  let query = "SELECT * FROM Invoice";
  const conditions: string[] = [];

  if (status && status !== "All") {
    // QuickBooks uses Balance to determine paid/unpaid status
    if (status === "Unpaid") {
      conditions.push("Balance > '0'");
    } else if (status === "Paid") {
      conditions.push("Balance = '0'");
    }
  }

  if (startDate) {
    conditions.push(`TxnDate >= '${startDate}'`);
  }

  if (endDate) {
    conditions.push(`TxnDate <= '${endDate}'`);
  }

  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(" AND ")}`;
  }

  query += ` MAXRESULTS ${maxResults}`;

  const response = await makeQuickBooksRequest<any>(userId, "/query", {
    query: { query },
  });

  return response.QueryResponse?.Invoice || [];
}

/**
 * Get a specific invoice by ID
 */
export async function getQuickBooksInvoice(
  userId: string,
  invoiceId: string
): Promise<any> {
  const response = await makeQuickBooksRequest<any>(
    userId,
    `/invoice/${invoiceId}`
  );

  return response.Invoice || null;
}

/**
 * List customers from QuickBooks
 */
export async function listQuickBooksCustomers(
  userId: string,
  options: {
    searchTerm?: string;
    maxResults?: number;
  } = {}
): Promise<any[]> {
  const { searchTerm, maxResults = 100 } = options;

  let query = "SELECT * FROM Customer";

  if (searchTerm) {
    query += ` WHERE DisplayName LIKE '%${searchTerm}%'`;
  }

  query += ` MAXRESULTS ${maxResults}`;

  const response = await makeQuickBooksRequest<any>(userId, "/query", {
    query: { query },
  });

  return response.QueryResponse?.Customer || [];
}

/**
 * Get a specific customer by ID
 */
export async function getQuickBooksCustomer(
  userId: string,
  customerId: string
): Promise<any> {
  const response = await makeQuickBooksRequest<any>(
    userId,
    `/customer/${customerId}`
  );

  return response.Customer || null;
}

/**
 * List vendors from QuickBooks
 */
export async function listQuickBooksVendors(
  userId: string,
  options: {
    searchTerm?: string;
    maxResults?: number;
  } = {}
): Promise<any[]> {
  const { searchTerm, maxResults = 100 } = options;

  let query = "SELECT * FROM Vendor";

  if (searchTerm) {
    query += ` WHERE DisplayName LIKE '%${searchTerm}%'`;
  }

  query += ` MAXRESULTS ${maxResults}`;

  const response = await makeQuickBooksRequest<any>(userId, "/query", {
    query: { query },
  });

  return response.QueryResponse?.Vendor || [];
}

/**
 * Get a specific vendor by ID
 */
export async function getQuickBooksVendor(
  userId: string,
  vendorId: string
): Promise<any> {
  const response = await makeQuickBooksRequest<any>(
    userId,
    `/vendor/${vendorId}`
  );

  return response.Vendor || null;
}

/**
 * List accounts from chart of accounts (cached in database)
 */
export async function listQuickBooksAccounts(
  userId: string,
  options: {
    accountType?: string;
    maxResults?: number;
  } = {}
): Promise<any[]> {
  const connection = await getDecryptedConnection(userId);

  if (!connection) {
    throw new Error("No active QuickBooks connection found");
  }

  // Return from cache if available
  if (connection.chartOfAccounts) {
    let accounts = connection.chartOfAccounts;

    // Filter by account type if specified
    if (options.accountType) {
      accounts = accounts.filter(
        (account) => account.AccountType === options.accountType
      );
    }

    // Apply max results limit
    if (options.maxResults) {
      accounts = accounts.slice(0, options.maxResults);
    }

    return accounts;
  }

  // Fetch from API if not cached
  const { maxResults = 500 } = options;
  let query = "SELECT * FROM Account";

  if (options.accountType) {
    query += ` WHERE AccountType = '${options.accountType}'`;
  }

  query += ` MAXRESULTS ${maxResults}`;

  const response = await makeQuickBooksRequest<any>(userId, "/query", {
    query: { query },
  });

  return response.QueryResponse?.Account || [];
}

/**
 * Get company information
 */
export async function getQuickBooksCompanyInfo(userId: string): Promise<any> {
  const connection = await getDecryptedConnection(userId);

  if (!connection) {
    throw new Error("No active QuickBooks connection found");
  }

  const response = await makeQuickBooksRequest<any>(
    userId,
    `/companyinfo/${connection.realmId}`
  );

  return response.CompanyInfo || null;
}

/**
 * Get bills (accounts payable)
 */
export async function listQuickBooksBills(
  userId: string,
  options: {
    status?: string;
    startDate?: string;
    endDate?: string;
    maxResults?: number;
  } = {}
): Promise<any[]> {
  const { status, startDate, endDate, maxResults = 100 } = options;

  let query = "SELECT * FROM Bill";
  const conditions: string[] = [];

  if (status && status !== "All") {
    if (status === "Unpaid") {
      conditions.push("Balance > '0'");
    } else if (status === "Paid") {
      conditions.push("Balance = '0'");
    }
  }

  if (startDate) {
    conditions.push(`TxnDate >= '${startDate}'`);
  }

  if (endDate) {
    conditions.push(`TxnDate <= '${endDate}'`);
  }

  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(" AND ")}`;
  }

  query += ` MAXRESULTS ${maxResults}`;

  const response = await makeQuickBooksRequest<any>(userId, "/query", {
    query: { query },
  });

  return response.QueryResponse?.Bill || [];
}

/**
 * Get profit and loss report (similar to Xero)
 */
export async function getQuickBooksProfitAndLoss(
  userId: string,
  options: {
    startDate: string;
    endDate: string;
  }
): Promise<any> {
  const { startDate, endDate } = options;

  const response = await makeQuickBooksRequest<any>(userId, "/reports/ProfitAndLoss", {
    query: {
      start_date: startDate,
      end_date: endDate,
    },
  });

  return response;
}

/**
 * Get balance sheet report (similar to Xero)
 */
export async function getQuickBooksBalanceSheet(
  userId: string,
  options: {
    date: string;
  }
): Promise<any> {
  const { date } = options;

  const response = await makeQuickBooksRequest<any>(userId, "/reports/BalanceSheet", {
    query: {
      date,
    },
  });

  return response;
}

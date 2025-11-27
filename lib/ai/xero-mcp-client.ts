import "server-only";

import {
  CreditNote,
  Invoice,
  Phone,
  type QuoteStatusCodes,
  XeroClient,
} from "xero-node";
import {
  updateConnectionError,
  updateLastApiCall,
  updateRateLimitInfo,
  updateXeroTokens,
} from "@/lib/db/queries";
import { getDecryptedConnection } from "@/lib/xero/connection-manager";
import { encryptToken } from "@/lib/xero/encryption";
import type { ParsedXeroError } from "@/lib/xero/error-handler";
import {
  extractCorrelationId,
  formatErrorForLogging,
  parseXeroError,
  requiresReconnection,
} from "@/lib/xero/error-handler";
import {
  buildPaginationParams,
  calculateBackoffDelay,
  extractRateLimitInfo,
  generateRateLimitUserMessage,
  logRateLimitStatus,
  type RateLimitInfo,
  shouldWaitForRateLimit,
} from "@/lib/xero/rate-limit-handler";
import type { DecryptedXeroConnection } from "@/lib/xero/types";

/**
 * Xero MCP Client
 * Provides MCP-compatible tool interfaces for Xero API operations
 */

/**
 * Convert ISO 8601 date string (YYYY-MM-DD) to Xero DateTime format (YYYY,MM,DD)
 * @param isoDate - Date string in ISO 8601 format (e.g., "2025-10-01")
 * @returns Xero DateTime format (e.g., "2025,10,01")
 */
function formatXeroDate(isoDate: string): string {
  // Remove any time component and trim
  const datePart = isoDate.split("T")[0].trim();
  // Replace hyphens with commas for Xero DateTime format
  return datePart.replace(/-/g, ",");
}

/**
 * Format if-modified-since parameter for Xero API
 * Converts ISO date string to Date object for Xero SDK
 * @param ifModifiedSince - ISO 8601 date string (e.g., "2025-01-01" or "2025-01-01T00:00:00")
 * @returns Date object or undefined if not provided
 */
function formatIfModifiedSince(ifModifiedSince?: string): Date | undefined {
  if (!ifModifiedSince) {
    return;
  }

  try {
    const date = new Date(ifModifiedSince);
    // Validate the date is valid
    if (Number.isNaN(date.getTime())) {
      console.warn(
        `[formatIfModifiedSince] Invalid date format: ${ifModifiedSince}`
      );
      return;
    }
    return date;
  } catch (error) {
    console.warn(
      `[formatIfModifiedSince] Error parsing date: ${ifModifiedSince}`,
      error
    );
    return;
  }
}

export type XeroMCPTool = {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
};

export type XeroMCPToolResult = {
  content: Array<{
    type: "text";
    text: string;
  }>;
  isError?: boolean;
};

// Concurrent request limiter - Xero allows max 5 concurrent calls
const concurrentRequestLimiter = new Map<string, number>(); // connectionId -> active request count
const MAX_CONCURRENT_REQUESTS = 5;

/**
 * Acquire a concurrent request slot for rate limiting
 * Implements Xero's 5 concurrent call limit per tenant
 * @param connectionId - Connection ID to track concurrent requests
 * @returns Promise that resolves when a slot is available
 */
async function acquireConcurrentSlot(
  connectionId: string
): Promise<() => void> {
  // Wait until we have a slot available
  while (
    (concurrentRequestLimiter.get(connectionId) || 0) >= MAX_CONCURRENT_REQUESTS
  ) {
    console.log(
      `[RateLimit] Connection ${connectionId} at max concurrent requests (${MAX_CONCURRENT_REQUESTS}), waiting...`
    );
    await new Promise((resolve) => setTimeout(resolve, 100)); // Wait 100ms and check again
  }

  // Increment counter
  const current = concurrentRequestLimiter.get(connectionId) || 0;
  concurrentRequestLimiter.set(connectionId, current + 1);

  console.log(
    `[RateLimit] Connection ${connectionId} acquired slot (${current + 1}/${MAX_CONCURRENT_REQUESTS})`
  );

  // Return release function
  return () => {
    const updated = (concurrentRequestLimiter.get(connectionId) || 1) - 1;
    concurrentRequestLimiter.set(connectionId, Math.max(0, updated));
    console.log(
      `[RateLimit] Connection ${connectionId} released slot (${updated}/${MAX_CONCURRENT_REQUESTS})`
    );
  };
}

/**
 * Check rate limits before making API call
 * Implements Xero best practice: check limits proactively and wait if needed
 * @param connection - Xero connection with rate limit data
 * @throws Error if rate limit is exceeded and retry time is too long
 */
async function checkRateLimits(
  connection: DecryptedXeroConnection
): Promise<void> {
  const rateLimitStatus = {
    rateLimitResetAt: connection.rateLimitResetAt,
    rateLimitProblem: connection.rateLimitProblem,
    rateLimitMinuteRemaining: connection.rateLimitMinuteRemaining,
    rateLimitDayRemaining: connection.rateLimitDayRemaining,
  };

  const result = shouldWaitForRateLimit(rateLimitStatus);

  if (result.wait && result.waitMs) {
    const waitSeconds = Math.ceil(result.waitMs / 1000);
    console.warn(
      `⚠️ [RateLimit] ${result.reason} - waiting ${waitSeconds}s before API call`
    );

    // Only wait up to 5 minutes automatically - longer waits should return error to user
    if (result.waitMs > 300_000) {
      throw new Error(
        `Xero rate limit exceeded. ${result.reason}. Please try again later.`
      );
    }

    await new Promise((resolve) => setTimeout(resolve, result.waitMs));
    console.log("✓ [RateLimit] Wait complete, proceeding with API call");
  }
}

/**
 * Get an authenticated Xero client for a user with rate limit checking
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

  // Validate tenant ID exists
  if (!connection.tenantId) {
    throw new Error(
      "Xero connection is missing tenant ID. Please reconnect to Xero."
    );
  }

  // Check rate limits before creating client
  await checkRateLimits(connection);

  const client = new XeroClient({
    clientId: process.env.XERO_CLIENT_ID || "",
    clientSecret: process.env.XERO_CLIENT_SECRET || "",
    redirectUris: [process.env.XERO_REDIRECT_URI || ""],
    scopes: connection.scopes,
    httpTimeout: 10_000, // 10 seconds - prevent timeout issues
  });

  // Initialize the client BEFORE setting token set
  await client.initialize();

  // Calculate actual remaining time for token expiry
  // CRITICAL: We must use the ACTUAL expiry time from the database, not assume 30 minutes
  // If token is already expired (negative), we must trigger refresh by setting expires_in to 1
  // Setting to 0 or negative values can cause SDK issues, so use 1 to force immediate refresh
  const expiresAt = new Date(connection.expiresAt);
  const now = new Date();
  const actualSecondsRemaining = Math.floor(
    (expiresAt.getTime() - now.getTime()) / 1000
  );

  // If token is expired or expiring within 60 seconds, set to 1 to trigger immediate refresh
  // Otherwise use actual remaining time
  const secondsRemaining =
    actualSecondsRemaining <= 60 ? 1 : actualSecondsRemaining;

  console.log(`[getXeroClient] Setting up client for user ${userId}`);
  console.log(`  Token expires at: ${expiresAt.toISOString()}`);
  console.log(`  Current time: ${now.toISOString()}`);
  console.log(
    `  Actual seconds remaining: ${actualSecondsRemaining} (${Math.floor(actualSecondsRemaining / 60)} minutes)`
  );
  console.log(
    `  Setting expires_in to: ${secondsRemaining} ${actualSecondsRemaining <= 60 ? "(forcing refresh)" : ""}`
  );

  await client.setTokenSet({
    access_token: connection.accessToken,
    refresh_token: connection.refreshToken,
    token_type: "Bearer",
    expires_in: secondsRemaining, // Use ACTUAL remaining time, or 1 to force refresh if expired
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
      console.log(
        `[persistTokenSet] No token set to persist for connection ${connection.id}`
      );
      return;
    }

    // Extract expiry and authentication_event_id from JWT for accuracy
    let expiresAt: Date | null = null;
    let authenticationEventId: string | undefined;

    try {
      const parts = tokenSet.access_token.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(
          Buffer.from(parts[1], "base64url").toString("utf-8")
        );
        authenticationEventId = payload.authentication_event_id;

        // Use the actual exp claim from JWT (Unix timestamp in seconds)
        if (payload.exp) {
          expiresAt = new Date(payload.exp * 1000);
        }
      }
    } catch (jwtError) {
      console.warn(
        `[persistTokenSet] Could not extract JWT data for connection ${connection.id}:`,
        jwtError
      );
    }

    // Fallback to calculated expiry if JWT parsing failed
    if (!expiresAt) {
      expiresAt = tokenSet.expires_at
        ? new Date(tokenSet.expires_at * 1000)
        : tokenSet.expires_in
          ? new Date(Date.now() + tokenSet.expires_in * 1000)
          : null;
    }

    if (!expiresAt) {
      console.warn(
        `[persistTokenSet] No expiry time available for connection ${connection.id}`
      );
      return;
    }

    // Check if tokens have actually changed
    const hasChanged =
      tokenSet.access_token !== connection.accessToken ||
      tokenSet.refresh_token !== connection.refreshToken ||
      Math.abs(expiresAt.getTime() - new Date(connection.expiresAt).getTime()) >
        2000; // 2 second tolerance

    if (!hasChanged) {
      console.log(
        `[persistTokenSet] Tokens unchanged for connection ${connection.id}`
      );
      return;
    }

    console.log(
      `[persistTokenSet] Persisting updated tokens for connection ${connection.id}`
    );
    console.log(`  New expiry: ${expiresAt.toISOString()}`);
    console.log(
      `  Minutes until expiry: ${Math.floor((expiresAt.getTime() - Date.now()) / (60 * 1000))}`
    );

    const updatedConnection = await updateXeroTokens({
      id: connection.id,
      accessToken: encryptToken(tokenSet.access_token),
      refreshToken: encryptToken(tokenSet.refresh_token),
      expiresAt,
      authenticationEventId,
      resetRefreshTokenIssuedAt: true, // CRITICAL: Reset 60-day window for new refresh token
      expectedUpdatedAt: connection.updatedAt, // Optimistic locking to prevent race conditions
    });

    // Handle optimistic lock failure (another process updated the token concurrently)
    if (!updatedConnection) {
      console.warn(
        `⚠️ [persistTokenSet] Concurrent token update detected for connection ${connection.id}`
      );
      console.warn(
        "  Tokens were updated by another process - attempting to fetch latest tokens"
      );
      // Standardize handling: fetch latest connection and validate tokens
      const latestConnection = await getDecryptedConnection(connection.id);
      if (
        latestConnection?.accessToken &&
        latestConnection.refreshToken &&
        latestConnection.expiresAt > new Date()
      ) {
        // Update in-memory connection object with latest values
        connection.accessToken = latestConnection.accessToken;
        connection.refreshToken = latestConnection.refreshToken;
        connection.expiresAt = latestConnection.expiresAt;
        connection.updatedAt = latestConnection.updatedAt;
        console.log(
          `✅ [persistTokenSet] Used latest tokens from database for connection ${connection.id}`
        );
        return;
      }
      throw new Error(
        `[persistTokenSet] Optimistic lock failed and could not retrieve valid tokens for connection ${connection.id}`
      );
    }

    // Update in-memory connection object with successfully persisted values
    connection.accessToken = tokenSet.access_token;
    connection.refreshToken = tokenSet.refresh_token;
    connection.expiresAt = expiresAt;
    connection.updatedAt = updatedConnection.updatedAt; // Update the timestamp for future optimistic locks

    console.log(
      `✅ [persistTokenSet] Successfully persisted tokens for connection ${connection.id}`
    );
  } catch (error) {
    console.error(
      `❌ [persistTokenSet] Failed to persist Xero token set for connection ${connection.id}:`,
      error
    );
    // Don't throw - persistence failure shouldn't break API calls
  }
}

/**
 * Generic pagination helper for Xero API calls with rate limit tracking
 * Implements Xero pagination best practices:
 * - Uses page and pageSize parameters (page starts at 1)
 * - Default pageSize: 100, maximum: 1000
 * - Stops when receiving fewer records than pageSize (indicates last page)
 * - Tracks rate limits from response headers
 * - Handles partial pages due to filters, permissions, or data gaps
 *
 * Reference: https://developer.xero.com/documentation/best-practices/integration-health/paging
 *
 * @param fetchPage - Function to fetch a page of results
 * @param limit - Maximum number of results to return (optional, defaults to all)
 * @param pageSize - Number of records per page (default 100, max 1000)
 * @param connectionId - Connection ID for rate limit tracking
 */
async function paginateXeroAPI<T>(
  fetchPage: (
    currentPage: number,
    currentPageSize: number
  ) => Promise<{
    results: T[];
    headers?: any;
  }>,
  limit?: number,
  pageSize = 100,
  connectionId?: string
): Promise<T[]> {
  const allResults: T[] = [];
  let currentPage = 1;
  const effectiveLimit = limit && limit > 0 ? limit : Number.POSITIVE_INFINITY;
  // Xero recommends pageSize between 1 and 1000 for optimal performance
  const effectivePageSize = Math.min(Math.max(pageSize, 1), 1000);
  let consecutiveEmptyPages = 0;
  const MAX_CONSECUTIVE_EMPTY = 2; // Stop after 2 consecutive empty pages (safety mechanism)

  console.log(
    `[paginateXeroAPI] Starting pagination: limit=${effectiveLimit}, pageSize=${effectivePageSize}`
  );

  while (allResults.length < effectiveLimit) {
    console.log(
      `[paginateXeroAPI] Fetching page ${currentPage}, current results: ${allResults.length}`
    );

    let pageResults: T[];
    let headers: any;

    try {
      const response = await fetchPage(currentPage, effectivePageSize);
      pageResults = response.results;
      headers = response.headers;
    } catch (error) {
      console.error(
        `[paginateXeroAPI] Error fetching page ${currentPage}:`,
        error
      );
      // If we've already got some results, return what we have
      if (allResults.length > 0) {
        console.warn(
          `[paginateXeroAPI] Returning ${allResults.length} results collected before error`
        );
        break;
      }
      throw error;
    }

    // Track rate limit info from response headers
    if (headers && connectionId) {
      const rateLimitInfo = extractRateLimitInfo(headers);
      if (
        rateLimitInfo.minuteRemaining !== undefined ||
        rateLimitInfo.dayRemaining !== undefined
      ) {
        await updateRateLimitInfo(connectionId, rateLimitInfo);
        logRateLimitStatus(connectionId, "pagination", rateLimitInfo);
      }
    }

    // Xero Best Practice: Stop when receiving fewer records than pageSize
    // This indicates we've reached the last page of results
    if (!pageResults || pageResults.length === 0) {
      consecutiveEmptyPages++;
      console.log(
        `[paginateXeroAPI] Page ${currentPage} returned no results (${consecutiveEmptyPages}/${MAX_CONSECUTIVE_EMPTY} consecutive empty)`
      );

      if (consecutiveEmptyPages >= MAX_CONSECUTIVE_EMPTY) {
        console.log(
          `[paginateXeroAPI] Stopping after ${MAX_CONSECUTIVE_EMPTY} consecutive empty pages`
        );
        break;
      }
    } else {
      // Reset counter when we get results
      consecutiveEmptyPages = 0;
      console.log(
        `[paginateXeroAPI] Page ${currentPage} returned ${pageResults.length} results`
      );

      // Add results up to the limit
      const remainingSlots = effectiveLimit - allResults.length;
      const resultsToAdd = pageResults.slice(0, remainingSlots);
      allResults.push(...resultsToAdd);

      console.log(
        `[paginateXeroAPI] Added ${resultsToAdd.length} results, total: ${allResults.length}`
      );

      // If we've hit the limit exactly, stop
      if (allResults.length >= effectiveLimit) {
        console.log(
          `[paginateXeroAPI] Reached limit of ${effectiveLimit} results`
        );
        break;
      }

      // Check if this is the last page (received fewer than pageSize)
      // This is Xero's recommended way to detect end of pagination
      if (pageResults.length < effectivePageSize) {
        console.log(
          `[paginateXeroAPI] Received ${pageResults.length} < ${effectivePageSize} - last page reached`
        );
        break;
      }
    }

    currentPage++;

    // Safety limit to prevent infinite loops (100 pages = up to 100,000 records at max pageSize)
    if (currentPage > 100) {
      console.warn(
        `[paginateXeroAPI] Safety limit reached: 100 pages, returning ${allResults.length} results`
      );
      break;
    }
  }

  console.log(
    `[paginateXeroAPI] Completed: fetched ${allResults.length} results across ${currentPage - 1} pages`
  );
  return allResults;
}

/**
 * Available Xero MCP Tools
 */
export const xeroMCPTools: XeroMCPTool[] = [
  {
    name: "xero_list_invoices",
    description:
      "Get a list of invoices from Xero. Can retrieve SALES INVOICES (sent TO customers, Type=ACCREC) or BILLS (received FROM suppliers, Type=ACCPAY). IMPORTANT NOTES: (1) Filters by INVOICE DATE (the date the invoice was created), NOT payment date. (2) When filtering by month/year, you MUST provide BOTH dateFrom and dateTo to define the complete date range. For example, for 'October 2025' use dateFrom='2025-10-01' and dateTo='2025-10-31'. (3) Use invoiceType parameter to specify which type: 'ACCREC' for sales invoices (default), 'ACCPAY' for bills/supplier invoices. (4) Uses pagination for efficient data retrieval. (5) This returns only invoice records - P&L reports may include additional transactions like bank transactions, journal entries, and credit notes that won't appear in this list. (6) Use ifModifiedSince to retrieve only invoices modified since a specific date (recommended for large datasets).",
    inputSchema: {
      type: "object",
      properties: {
        invoiceType: {
          type: "string",
          description:
            "Invoice type: ACCREC for sales invoices (default), ACCPAY for bills/supplier invoices",
          enum: ["ACCREC", "ACCPAY"],
        },
        status: {
          type: "string",
          description:
            "Invoice status filter (DRAFT, SUBMITTED, AUTHORISED, PAID, VOIDED)",
          enum: ["DRAFT", "SUBMITTED", "AUTHORISED", "PAID", "VOIDED"],
        },
        dateFrom: {
          type: "string",
          description:
            "Start date for date range filter (ISO 8601 format YYYY-MM-DD, e.g., 2025-10-01). REQUIRED when filtering by month/year.",
        },
        dateTo: {
          type: "string",
          description:
            "End date for date range filter (ISO 8601 format YYYY-MM-DD, e.g., 2025-10-31). REQUIRED when filtering by month/year.",
        },
        contactId: {
          type: "string",
          description: "Filter by contact ID",
        },
        ifModifiedSince: {
          type: "string",
          description:
            "Retrieve only invoices modified since this date (ISO 8601 format YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS). Recommended for incremental syncing and reducing API calls. Example: '2025-01-01' or '2025-01-01T00:00:00'",
        },
        limit: {
          type: "number",
          description: "Maximum number of invoices to return (default: 100)",
        },
        page: {
          type: "number",
          description:
            "Page number to retrieve (starts at 1). If specified, returns only this page.",
        },
        pageSize: {
          type: "number",
          description: "Number of records per page (default: 100, max: 1000)",
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
    description:
      "Get a list of contacts (customers/suppliers) from Xero. Use if-modified-since for incremental syncing to reduce API calls.",
    inputSchema: {
      type: "object",
      properties: {
        searchTerm: {
          type: "string",
          description: "Search contacts by name or email",
        },
        ifModifiedSince: {
          type: "string",
          description:
            "Retrieve only contacts modified since this date (ISO 8601 format YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS). Recommended for incremental syncing.",
        },
        limit: {
          type: "number",
          description: "Maximum number of contacts to return (default: 100)",
        },
        page: {
          type: "number",
          description:
            "Page number to retrieve (starts at 1). If specified, returns only this page.",
        },
        pageSize: {
          type: "number",
          description: "Number of records per page (default: 100, max: 1000)",
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
    description:
      "Get journal entries (manual journals) from Xero. Supports pagination for efficient data retrieval.",
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
        page: {
          type: "number",
          description:
            "Page number to retrieve (starts at 1). If specified, returns only this page.",
        },
        pageSize: {
          type: "number",
          description: "Number of records per page (default: 100, max: 1000)",
        },
      },
    },
  },
  {
    name: "xero_get_bank_transactions",
    description:
      "Get bank transactions from Xero. Supports pagination for efficient data retrieval.",
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
        page: {
          type: "number",
          description:
            "Page number to retrieve (starts at 1). If specified, returns only this page.",
        },
        pageSize: {
          type: "number",
          description: "Number of records per page (default: 100, max: 1000)",
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
    description:
      "Get a list of payments from Xero. Supports pagination for efficient data retrieval.",
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
        page: {
          type: "number",
          description:
            "Page number to retrieve (starts at 1). If specified, returns only this page.",
        },
        pageSize: {
          type: "number",
          description: "Number of records per page (default: 100, max: 1000)",
        },
      },
    },
  },
  {
    name: "xero_list_credit_notes",
    description:
      "Get a list of credit notes from Xero. Can retrieve SALES CREDIT NOTES (issued TO customers, Type=ACCRECCREDIT) or PURCHASE CREDIT NOTES (received FROM suppliers, Type=ACCPAYCREDIT). Use creditNoteType to specify which type: 'ACCRECCREDIT' for sales credit notes (default), 'ACCPAYCREDIT' for purchase credit notes. Supports pagination for efficient data retrieval.",
    inputSchema: {
      type: "object",
      properties: {
        creditNoteType: {
          type: "string",
          description:
            "Credit note type: ACCRECCREDIT for sales credit notes (default), ACCPAYCREDIT for purchase credit notes",
          enum: ["ACCRECCREDIT", "ACCPAYCREDIT"],
        },
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
        page: {
          type: "number",
          description:
            "Page number to retrieve (starts at 1). If specified, returns only this page.",
        },
        pageSize: {
          type: "number",
          description: "Number of records per page (default: 100, max: 1000)",
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
      "Get comprehensive profit and loss report from Xero for a specified date range. IMPORTANT: This report includes ALL financial transactions: sales invoices, bills, credit notes, bank transactions, manual journal entries, and payments. Uses the accounting basis configured in Xero (typically ACCRUAL, meaning revenue/expenses recognized when incurred, not when paid). The report may show different totals than invoice lists because it includes bank transactions, journal entries, and other adjustments. For transaction-level analysis, use xero_list_invoices, xero_list_credit_notes, xero_get_bank_transactions, and xero_list_journal_entries separately.",
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
    description:
      "Get a list of sales quotes from Xero. Supports pagination for efficient data retrieval. Note: Xero API uses fixed page size of 100 for quotes.",
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
        page: {
          type: "number",
          description:
            "Page number to retrieve (starts at 1). If specified, returns only this page.",
        },
        pageSize: {
          type: "number",
          description:
            "Number of records per page. Note: Xero API does not support custom page sizes for quotes; fixed at 100.",
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
 * Execute a Xero MCP tool with rate limiting, concurrent slot management, and retry logic
 */
export async function executeXeroMCPTool(
  userId: string,
  toolName: string,
  args: Record<string, unknown>
): Promise<XeroMCPToolResult> {
  let parsedError: ParsedXeroError | undefined;
  const MAX_RETRIES = 3; // Maximum retry attempts for 429 errors

  try {
    const { client, connection } = await getXeroClient(userId);

    // Acquire concurrent request slot (implements 5 concurrent call limit)
    const releaseSlot = await acquireConcurrentSlot(connection.id);

    try {
      // Retry loop for 429 rate limit errors
      let attempt = 0;
      let lastError: any;

      while (attempt <= MAX_RETRIES) {
        try {
          // Execute the Xero API operation
          const result = await executeXeroToolOperation(
            client,
            connection,
            toolName,
            args
          );

          // Track successful API call for connection management
          await updateLastApiCall(connection.id);

          return result;
        } catch (operationError) {
          lastError = operationError;

          // Extract X-Correlation-Id and rate limit info from error response
          let correlationId: string | undefined;
          let rateLimitInfo: RateLimitInfo | undefined;

          if (
            operationError &&
            typeof operationError === "object" &&
            "response" in operationError
          ) {
            const response = (operationError as any).response;
            if (response?.headers) {
              correlationId = extractCorrelationId(response.headers);
              rateLimitInfo = extractRateLimitInfo(response.headers);
            }

            // Check if this is a 429 rate limit error
            if (response?.status === 429) {
              attempt++;

              // Update rate limit info in database immediately
              if (
                rateLimitInfo?.minuteRemaining !== undefined ||
                rateLimitInfo?.dayRemaining !== undefined
              ) {
                await updateRateLimitInfo(connection.id, rateLimitInfo);
              }

              // If we have retries left, wait and retry
              if (attempt <= MAX_RETRIES) {
                const retryAfter = rateLimitInfo?.retryAfter;
                let waitMs: number;

                if (retryAfter) {
                  // Use Retry-After header from Xero (best practice)
                  waitMs = retryAfter * 1000;
                  console.warn(
                    `⚠️ [RateLimit] 429 error on attempt ${attempt}/${MAX_RETRIES} - Retry-After: ${retryAfter}s`
                  );
                } else {
                  // Fallback to exponential backoff
                  waitMs = calculateBackoffDelay(attempt - 1);
                  console.warn(
                    `⚠️ [RateLimit] 429 error on attempt ${attempt}/${MAX_RETRIES} - exponential backoff: ${Math.ceil(waitMs / 1000)}s`
                  );
                }

                // Wait before retrying
                await new Promise((resolve) => setTimeout(resolve, waitMs));
                console.log(
                  `🔄 [RateLimit] Retrying after ${Math.ceil(waitMs / 1000)}s...`
                );
                continue; // Retry
              }

              // Max retries exceeded - create user-friendly message
              const userMessage = rateLimitInfo
                ? generateRateLimitUserMessage(rateLimitInfo)
                : "Xero rate limit exceeded. Please try again in a few moments.";

              parsedError = {
                type: "rate_limit",
                message: `Rate limit exceeded after ${MAX_RETRIES} retries`,
                userMessage,
                statusCode: 429,
                correlationId,
              };

              throw operationError;
            }
          }

          // Not a 429 error - parse and throw immediately
          parsedError = parseXeroError(operationError, correlationId);

          // Log detailed error information for debugging
          console.error(
            `Xero API operation ${toolName} failed:`,
            formatErrorForLogging(parsedError)
          );

          // Update connection error status with all details
          await updateConnectionError(connection.id, {
            error: parsedError.userMessage,
            errorType: parsedError.type,
            correlationId: parsedError.correlationId,
            technicalDetails: JSON.stringify(parsedError),
          });

          // If error requires reconnection, log warning
          if (requiresReconnection(parsedError)) {
            console.warn(
              `Xero connection ${connection.id} requires reconnection due to ${parsedError.type} error`
            );
          }

          throw operationError;
        }
      }

      // Should never reach here, but throw last error just in case
      throw lastError;
    } finally {
      // Always release the concurrent slot
      releaseSlot();
    }
  } catch (error) {
    // If we haven't parsed the error yet, parse it now
    if (!parsedError) {
      parsedError = parseXeroError(error);
      console.error(
        "Xero MCP tool execution failed:",
        formatErrorForLogging(parsedError)
      );
    }

    // Return user-friendly error message
    return {
      content: [
        {
          type: "text",
          text: parsedError.userMessage,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Internal function to execute the actual Xero tool operation
 * Separated for cleaner error handling and tracking
 */
async function executeXeroToolOperation(
  client: XeroClient,
  connection: DecryptedXeroConnection,
  toolName: string,
  args: Record<string, unknown>
): Promise<XeroMCPToolResult> {
  try {
    switch (toolName) {
      case "xero_list_invoices": {
        const {
          invoiceType,
          status,
          dateFrom,
          dateTo,
          contactId,
          ifModifiedSince,
          limit,
          page,
          pageSize,
        } = args;

        // Format if-modified-since parameter
        const modifiedSince = formatIfModifiedSince(
          ifModifiedSince as string | undefined
        );

        // Build where clause
        const whereClauses: string[] = [];
        // Filter by invoice type - default to ACCREC (sales invoices) if not specified
        // ACCREC = Accounts Receivable (sales invoices to customers)
        // ACCPAY = Accounts Payable (bills from suppliers)
        const type = (invoiceType as string) || "ACCREC";
        whereClauses.push(`Type=="${type}"`);
        if (status) {
          whereClauses.push(`Status=="${status}"`);
        }
        if (contactId) {
          whereClauses.push(`Contact.ContactID==Guid("${contactId}")`);
        }
        // Xero API date filter format: Date>=DateTime(2025,10,01) - comma-separated
        if (dateFrom) {
          whereClauses.push(
            `Date>=DateTime(${formatXeroDate(dateFrom as string)})`
          );
        }
        if (dateTo) {
          whereClauses.push(
            `Date<=DateTime(${formatXeroDate(dateTo as string)})`
          );
        }

        const where =
          whereClauses.length > 0 ? whereClauses.join(" AND ") : undefined;

        // Log the query for debugging
        console.log(
          `[xero_list_invoices] Type: ${type}, WHERE clause: ${where || "(none)"}, ifModifiedSince: ${modifiedSince?.toISOString() || "(none)"}, limit: ${limit || 100}`
        );

        // If specific page requested, fetch that page only
        if (page !== undefined) {
          const paginationParams = buildPaginationParams({
            page: page as number,
            pageSize: pageSize as number | undefined,
          });

          const response = await client.accountingApi.getInvoices(
            connection.tenantId,
            modifiedSince, // ifModifiedSince - Best practice for incremental sync
            where, // where clause
            undefined, // order
            undefined, // IDs
            undefined, // invoiceNumbers
            undefined, // contactIDs
            undefined, // statuses
            paginationParams.page, // page number
            undefined, // includeArchived
            undefined, // createdByMyApp
            undefined, // unitdp
            undefined, // summaryOnly
            paginationParams.pageSize // pageSize
          );

          // Track rate limits
          const rateLimitInfo = extractRateLimitInfo(response.response.headers);
          await updateRateLimitInfo(connection.id, rateLimitInfo);
          logRateLimitStatus(connection.id, toolName, rateLimitInfo);

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(response.body.invoices || [], null, 2),
              },
            ],
          };
        }

        // Otherwise, paginate through all invoices
        const allInvoices = await paginateXeroAPI(
          async (currentPage, currentPageSize) => {
            const response = await client.accountingApi.getInvoices(
              connection.tenantId,
              modifiedSince, // ifModifiedSince - Best practice for incremental sync
              where, // where clause
              undefined, // order
              undefined, // IDs
              undefined, // invoiceNumbers
              undefined, // contactIDs
              undefined, // statuses
              currentPage, // page number
              undefined, // includeArchived
              undefined, // createdByMyApp
              undefined, // unitdp
              undefined, // summaryOnly
              currentPageSize // pageSize
            );
            return {
              results: response.body.invoices || [],
              headers: response.response.headers,
            };
          },
          limit as number | undefined,
          (pageSize as number | undefined) || 100,
          connection.id
        );

        // Validate results before returning
        if (!Array.isArray(allInvoices)) {
          console.warn(
            `[xero_list_invoices] Expected array but got: ${typeof allInvoices}`
          );
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify([], null, 2),
              },
            ],
          };
        }

        console.log(
          `[xero_list_invoices] Successfully retrieved ${allInvoices.length} invoices`
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(allInvoices, null, 2),
            },
          ],
        };
      }

      case "xero_get_invoice": {
        const { invoiceId } = args;
        if (!invoiceId) {
          throw new Error("invoiceId is required");
        }

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
        const { searchTerm, ifModifiedSince, limit, page, pageSize } = args;

        // Format if-modified-since parameter
        const modifiedSince = formatIfModifiedSince(
          ifModifiedSince as string | undefined
        );

        const where = searchTerm
          ? `(Name != null AND Name.Contains("${searchTerm}")) OR (EmailAddress != null AND EmailAddress.Contains("${searchTerm}"))`
          : undefined;

        // If specific page requested, fetch that page only
        if (page !== undefined) {
          const paginationParams = buildPaginationParams({
            page: page as number,
            pageSize: pageSize as number | undefined,
          });

          const response = await client.accountingApi.getContacts(
            connection.tenantId,
            modifiedSince, // ifModifiedSince - Best practice for incremental sync
            where, // where clause
            undefined, // order
            undefined, // IDs
            paginationParams.page, // page number
            undefined, // includeArchived
            undefined, // summaryOnly
            undefined, // searchTerm
            paginationParams.pageSize // pageSize
          );

          // Track rate limits
          const rateLimitInfo = extractRateLimitInfo(response.response.headers);
          await updateRateLimitInfo(connection.id, rateLimitInfo);
          logRateLimitStatus(connection.id, toolName, rateLimitInfo);

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(response.body.contacts || [], null, 2),
              },
            ],
          };
        }

        // Otherwise, paginate through all contacts
        const allContacts = await paginateXeroAPI(
          async (currentPage, currentPageSize) => {
            const response = await client.accountingApi.getContacts(
              connection.tenantId,
              modifiedSince, // ifModifiedSince - Best practice for incremental sync
              where, // where clause
              undefined, // order
              undefined, // IDs
              currentPage, // page number
              undefined, // includeArchived
              undefined, // summaryOnly
              undefined, // searchTerm
              currentPageSize // pageSize
            );
            return {
              results: response.body.contacts || [],
              headers: response.response.headers,
            };
          },
          limit as number | undefined,
          (pageSize as number | undefined) || 100,
          connection.id
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(allContacts, null, 2),
            },
          ],
        };
      }

      case "xero_get_contact": {
        const { contactId } = args;
        if (!contactId) {
          throw new Error("contactId is required");
        }

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
        const { dateFrom, dateTo, limit, page, pageSize } = args;

        // If specific page requested, fetch that page only
        if (page !== undefined) {
          const paginationParams = buildPaginationParams({
            page: page as number,
            pageSize: pageSize as number | undefined,
          });

          const response = await client.accountingApi.getManualJournals(
            connection.tenantId,
            undefined, // ifModifiedSince
            undefined, // where - Xero doesn't support date filtering in WHERE clause
            undefined, // order
            paginationParams.page, // page number
            paginationParams.pageSize // pageSize
          );

          // Track rate limits
          const rateLimitInfo = extractRateLimitInfo(response.response.headers);
          await updateRateLimitInfo(connection.id, rateLimitInfo);
          logRateLimitStatus(connection.id, toolName, rateLimitInfo);

          // Filter by date if provided (Xero doesn't support date filtering in API)
          let journals = response.body.manualJournals || [];
          if (dateFrom || dateTo) {
            journals = journals.filter((journal) => {
              if (!journal.date) {
                return false;
              }
              const journalDate = new Date(journal.date);
              if (dateFrom && journalDate < new Date(dateFrom as string)) {
                return false;
              }
              if (dateTo && journalDate > new Date(dateTo as string)) {
                return false;
              }
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

        // Otherwise, paginate through all manual journals
        const allJournals = await paginateXeroAPI(
          async (currentPage, currentPageSize) => {
            const response = await client.accountingApi.getManualJournals(
              connection.tenantId,
              undefined, // ifModifiedSince
              undefined, // where - Xero doesn't support date filtering in WHERE clause
              undefined, // order
              currentPage, // page number
              currentPageSize // pageSize
            );
            return {
              results: response.body.manualJournals || [],
              headers: response.response.headers,
            };
          },
          limit as number | undefined,
          (pageSize as number | undefined) || 100,
          connection.id
        );

        // Filter by date if provided (Xero doesn't support date filtering in API)
        let journals = allJournals;
        if (dateFrom || dateTo) {
          journals = journals.filter((journal) => {
            if (!journal.date) {
              return false;
            }
            const journalDate = new Date(journal.date);
            if (dateFrom && journalDate < new Date(dateFrom as string)) {
              return false;
            }
            if (dateTo && journalDate > new Date(dateTo as string)) {
              return false;
            }
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
        const { bankAccountId, dateFrom, dateTo, limit, page, pageSize } = args;

        const whereClauses: string[] = [];
        if (bankAccountId) {
          whereClauses.push(`BankAccount.AccountID==Guid("${bankAccountId}")`);
        }
        // Xero API date filter format: Date>=DateTime(2025,10,01) - comma-separated
        if (dateFrom) {
          whereClauses.push(
            `Date>=DateTime(${formatXeroDate(dateFrom as string)})`
          );
        }
        if (dateTo) {
          whereClauses.push(
            `Date<=DateTime(${formatXeroDate(dateTo as string)})`
          );
        }

        const where =
          whereClauses.length > 0 ? whereClauses.join(" AND ") : undefined;

        // If specific page requested, fetch that page only
        if (page !== undefined) {
          const paginationParams = buildPaginationParams({
            page: page as number,
            pageSize: pageSize as number | undefined,
          });

          const response = await client.accountingApi.getBankTransactions(
            connection.tenantId,
            undefined, // ifModifiedSince
            where, // where clause
            undefined, // order
            paginationParams.page, // page number
            undefined, // unitdp
            paginationParams.pageSize // pageSize
          );

          // Track rate limits
          const rateLimitInfo = extractRateLimitInfo(response.response.headers);
          await updateRateLimitInfo(connection.id, rateLimitInfo);
          logRateLimitStatus(connection.id, toolName, rateLimitInfo);

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  response.body.bankTransactions || [],
                  null,
                  2
                ),
              },
            ],
          };
        }

        // Otherwise, paginate through all bank transactions
        const allTransactions = await paginateXeroAPI(
          async (currentPage, currentPageSize) => {
            const response = await client.accountingApi.getBankTransactions(
              connection.tenantId,
              undefined, // ifModifiedSince
              where, // where clause
              undefined, // order
              currentPage, // page number
              undefined, // unitdp
              currentPageSize // pageSize
            );
            return {
              results: response.body.bankTransactions || [],
              headers: response.response.headers,
            };
          },
          limit as number | undefined,
          (pageSize as number | undefined) || 100,
          connection.id
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(allTransactions, null, 2),
            },
          ],
        };
      }

      case "xero_list_credit_notes": {
        const {
          creditNoteType,
          status,
          dateFrom,
          dateTo,
          limit,
          page,
          pageSize,
        } = args;

        const whereClauses: string[] = [];
        // Filter by credit note type - default to ACCRECCREDIT (sales credit notes) if not specified
        // ACCRECCREDIT = Sales credit notes (issued to customers)
        // ACCPAYCREDIT = Purchase credit notes (received from suppliers)
        const type = (creditNoteType as string) || "ACCRECCREDIT";
        whereClauses.push(`Type=="${type}"`);
        if (status) {
          whereClauses.push(`Status=="${status}"`);
        }
        // Xero API date filter format: Date>=DateTime(2025,10,01) - comma-separated
        if (dateFrom) {
          whereClauses.push(
            `Date>=DateTime(${formatXeroDate(dateFrom as string)})`
          );
        }
        if (dateTo) {
          whereClauses.push(
            `Date<=DateTime(${formatXeroDate(dateTo as string)})`
          );
        }

        const where =
          whereClauses.length > 0 ? whereClauses.join(" AND ") : undefined;

        // Log the query for debugging
        console.log(
          `[xero_list_credit_notes] Type: ${type}, WHERE clause: ${where || "(none)"}, limit: ${limit || 100}`
        );

        // If specific page requested, fetch that page only
        if (page !== undefined) {
          const paginationParams = buildPaginationParams({
            page: page as number,
            pageSize: pageSize as number | undefined,
          });

          const response = await client.accountingApi.getCreditNotes(
            connection.tenantId,
            undefined, // ifModifiedSince
            where, // where clause
            undefined, // order
            paginationParams.page, // page number
            undefined, // unitdp
            paginationParams.pageSize // pageSize
          );

          // Track rate limits
          const rateLimitInfo = extractRateLimitInfo(response.response.headers);
          await updateRateLimitInfo(connection.id, rateLimitInfo);
          logRateLimitStatus(connection.id, toolName, rateLimitInfo);

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(response.body.creditNotes || [], null, 2),
              },
            ],
          };
        }

        // Otherwise, paginate through all credit notes
        const allCreditNotes = await paginateXeroAPI(
          async (currentPage, currentPageSize) => {
            const response = await client.accountingApi.getCreditNotes(
              connection.tenantId,
              undefined, // ifModifiedSince
              where, // where clause
              undefined, // order
              currentPage, // page number
              undefined, // unitdp
              currentPageSize // pageSize
            );
            return {
              results: response.body.creditNotes || [],
              headers: response.response.headers,
            };
          },
          limit as number | undefined,
          (pageSize as number | undefined) || 100,
          connection.id
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(allCreditNotes, null, 2),
            },
          ],
        };
      }

      case "xero_list_payments": {
        const { dateFrom, dateTo, limit, page, pageSize } = args;

        const whereClauses: string[] = [];
        // Xero API date filter format: Date>=DateTime(2025,10,01) - comma-separated
        if (dateFrom) {
          whereClauses.push(
            `Date>=DateTime(${formatXeroDate(dateFrom as string)})`
          );
        }
        if (dateTo) {
          whereClauses.push(
            `Date<=DateTime(${formatXeroDate(dateTo as string)})`
          );
        }

        const where =
          whereClauses.length > 0 ? whereClauses.join(" AND ") : undefined;

        // If specific page requested, fetch that page only
        if (page !== undefined) {
          const paginationParams = buildPaginationParams({
            page: page as number,
            pageSize: pageSize as number | undefined,
          });

          const response = await client.accountingApi.getPayments(
            connection.tenantId,
            undefined, // ifModifiedSince
            where, // where clause
            undefined, // order
            paginationParams.page, // page number
            paginationParams.pageSize // pageSize
          );

          // Track rate limits
          const rateLimitInfo = extractRateLimitInfo(response.response.headers);
          await updateRateLimitInfo(connection.id, rateLimitInfo);
          logRateLimitStatus(connection.id, toolName, rateLimitInfo);

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(response.body.payments || [], null, 2),
              },
            ],
          };
        }

        // Otherwise, paginate through all payments
        const allPayments = await paginateXeroAPI(
          async (currentPage, currentPageSize) => {
            const response = await client.accountingApi.getPayments(
              connection.tenantId,
              undefined, // ifModifiedSince
              where, // where clause
              undefined, // order
              currentPage, // page number
              currentPageSize // pageSize
            );
            return {
              results: response.body.payments || [],
              headers: response.response.headers,
            };
          },
          limit as number | undefined,
          (pageSize as number | undefined) || 100,
          connection.id
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(allPayments, null, 2),
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
        const { status, dateFrom, dateTo, limit, page, pageSize } = args;

        // Note: Xero getQuotes API does not support pageSize parameter, only page
        // If specific page requested, fetch that page only
        if (page !== undefined) {
          const paginationParams = buildPaginationParams({
            page: page as number,
            pageSize: pageSize as number | undefined,
          });

          const response = await client.accountingApi.getQuotes(
            connection.tenantId,
            undefined, // ifModifiedSince
            dateFrom as string | undefined,
            dateTo as string | undefined,
            undefined, // expiryDateFrom
            undefined, // expiryDateTo
            undefined, // contactID
            status as string | undefined,
            paginationParams.page, // page number
            undefined, // order
            undefined // quoteNumber
          );

          // Track rate limits
          const rateLimitInfo = extractRateLimitInfo(response.response.headers);
          await updateRateLimitInfo(connection.id, rateLimitInfo);
          logRateLimitStatus(connection.id, toolName, rateLimitInfo);

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(response.body.quotes || [], null, 2),
              },
            ],
          };
        }

        // Otherwise, paginate through all quotes (Note: Xero API uses fixed page size of 100)
        const allQuotes = await paginateXeroAPI(
          async (currentPage, _pageSize) => {
            // Note: getQuotes doesn't support pageSize parameter, uses fixed 100
            const response = await client.accountingApi.getQuotes(
              connection.tenantId,
              undefined, // ifModifiedSince
              dateFrom as string | undefined,
              dateTo as string | undefined,
              undefined, // expiryDateFrom
              undefined, // expiryDateTo
              undefined, // contactID
              status as string | undefined,
              currentPage, // page number
              undefined, // order
              undefined // quoteNumber
            );
            return {
              results: response.body.quotes || [],
              headers: response.response.headers,
            };
          },
          limit as number | undefined,
          100, // Fixed page size for quotes (API doesn't support custom pageSize)
          connection.id
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(allQuotes, null, 2),
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
        const { contactId, date, dueDate, lineItems, reference, status } = args;

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

      case "xero_create_bill": {
        const {
          contactId,
          invoiceNumber,
          date,
          dueDate,
          lineItems,
          reference,
          status,
        } = args;

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

        // Construct bill (ACCPAY invoice)
        const bill: Invoice = {
          type: Invoice.TypeEnum.ACCPAY, // Accounts Payable - Bills from suppliers
          contact: {
            contactID: contactId as string,
          },
          invoiceNumber: invoiceNumber as string | undefined,
          date: date as string,
          dueDate: dueDate as string,
          lineItems: (lineItems as any[]).map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitAmount: item.unitAmount,
            accountCode: item.accountCode,
            taxType: item.taxType || "INPUT2", // Default to INPUT2 (GST on expenses)
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
            invoices: [bill],
          }
        );

        // Check for validation errors from Xero API
        if (response.body.invoices?.[0]?.hasErrors) {
          const errors = response.body.invoices[0].validationErrors;
          throw new Error(
            `Bill creation validation failed: ${JSON.stringify(errors)}`
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
                  message: "Bill created successfully in Xero",
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

        if (contactId) {
          invoice.contact = { contactID: contactId as string };
        }
        if (date) {
          invoice.date = date as string;
        }
        if (dueDate) {
          invoice.dueDate = dueDate as string;
        }
        if (reference) {
          invoice.reference = reference as string;
        }
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

        if (name) {
          contact.name = name as string;
        }
        if (email) {
          contact.emailAddress = email as string;
        }
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
          !["DRAFT", "SENT", "ACCEPTED", "DECLINED"].includes(status as string)
        ) {
          throw new Error("Status must be DRAFT, SENT, ACCEPTED, or DECLINED");
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
          throw new Error(`Quote validation failed: ${JSON.stringify(errors)}`);
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
        const { creditNoteId, contactId, date, lineItems, reference, status } =
          args;

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

        if (contactId) {
          creditNote.contact = { contactID: contactId as string };
        }
        if (date) {
          creditNote.date = date as string;
        }
        if (reference) {
          creditNote.reference = reference as string;
        }
        if (status) {
          creditNote.status = status as CreditNote.StatusEnum;
        }
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
}

/**
 * Check if a tool name is a Xero MCP tool
 */
export function isXeroMCPTool(toolName: string): boolean {
  return xeroMCPTools.some((tool) => tool.name === toolName);
}

import "server-only";

import { XeroClient } from "xero-node";
import { updateRateLimitInfo, updateXeroTokens } from "@/lib/db/queries";
import { getDecryptedConnection } from "@/lib/xero/connection-manager";
import { encryptToken } from "@/lib/xero/encryption";
import {
  extractRateLimitInfo,
  logRateLimitStatus,
  shouldWaitForRateLimit,
} from "@/lib/xero/rate-limit-handler";
import type { DecryptedXeroConnection } from "@/lib/xero/types";

// Concurrent request limiter - Xero allows max 5 concurrent calls
const concurrentRequestLimiter = new Map<string, number>(); // connectionId -> active request count
const MAX_CONCURRENT_REQUESTS = 5;

/**
 * Acquire a concurrent request slot for rate limiting
 * Implements Xero's 5 concurrent call limit per tenant
 * @param connectionId - Connection ID to track concurrent requests
 * @returns Promise that resolves when a slot is available
 */
export async function acquireConcurrentSlot(
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
export async function checkRateLimits(
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
export async function getRobustXeroClient(
  userId: string,
  tenantId?: string
): Promise<{ client: XeroClient; connection: DecryptedXeroConnection }> {
  const connection = await getDecryptedConnection(userId, tenantId);

  if (!connection) {
    if (tenantId) {
      throw new Error(`Xero connection for tenant ${tenantId} not found.`);
    }
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
export async function paginateXeroAPI<T>(
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
    let pageAttempts = 0;
    const MAX_PAGE_RETRIES = 3;
    let pageSuccess = false;

    while (!pageSuccess && pageAttempts <= MAX_PAGE_RETRIES) {
      try {
        const response = await fetchPage(currentPage, effectivePageSize);
        pageResults = response.results;
        headers = response.headers;
        pageSuccess = true;
      } catch (error: any) {
        pageAttempts++;

        // Extract rate limit info if available in error response
        let rateLimitInfo: ReturnType<typeof extractRateLimitInfo> | undefined;
        if (error?.response?.headers) {
          rateLimitInfo = extractRateLimitInfo(error.response.headers);
          if (
            connectionId &&
            (rateLimitInfo.minuteRemaining !== undefined ||
              rateLimitInfo.dayRemaining !== undefined)
          ) {
            await updateRateLimitInfo(connectionId, rateLimitInfo);
          }
        }

        // Check if 429 Rate Limit Error
        if (
          error?.response?.status === 429 &&
          pageAttempts <= MAX_PAGE_RETRIES
        ) {
          const retryAfter = rateLimitInfo?.retryAfter;
          const waitMs = retryAfter
            ? retryAfter * 1000
            : calculateBackoffDelay(pageAttempts - 1);

          console.warn(
            `⚠️ [paginateXeroAPI] 429 Rate Limit on page ${currentPage} (attempt ${pageAttempts}/${MAX_PAGE_RETRIES}). Waiting ${Math.ceil(waitMs / 1000)}s...`
          );

          await new Promise((resolve) => setTimeout(resolve, waitMs));
          continue; // Retry
        }

        console.error(
          `[paginateXeroAPI] Error fetching page ${currentPage} (attempt ${pageAttempts}):`,
          error
        );

        // Fail hard on non-transient errors or max retries
        throw error;
      }
    }

    // This should theoretically not be reached if pageSuccess is false (throws above),
    // but typescript might complain if pageResults is used unassigned.
    // @ts-expect-error
    if (!pageSuccess) break; // Safety break

    // Track rate limit info from successful response headers
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

export async function persistTokenSet(
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

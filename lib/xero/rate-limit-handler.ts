/**
 * Xero API Rate Limit Handler
 *
 * Implements Xero's rate limiting best practices:
 * - Tracks rate limit headers (X-MinLimit-Remaining, X-DayLimit-Remaining)
 * - Handles 429 errors with Retry-After header
 * - Implements exponential backoff for retries
 * - Supports pagination for large result sets
 *
 * Rate Limits:
 * - Concurrent: 5 calls at once
 * - Per Minute: 60 calls per tenant
 * - Per Day: 5000 calls per tenant
 * - App Minute: 10,000 calls across all tenants
 *
 * Reference: https://developer.xero.com/documentation/best-practices/integration-health/rate-limits
 */

export interface RateLimitInfo {
  minuteRemaining?: number; // X-MinLimit-Remaining
  dayRemaining?: number; // X-DayLimit-Remaining
  retryAfter?: number; // Retry-After (seconds)
  problem?: "minute" | "day"; // X-Rate-Limit-Problem
  resetAt?: Date; // Calculated from retryAfter
}

export interface PaginationParams {
  page?: number; // Page number (starts at 1)
  pageSize?: number; // Records per page (max 1000, default 100)
}

/**
 * Extract rate limit information from response headers
 * Supports Headers, Axios headers, or plain objects
 */
export function extractRateLimitInfo(
  headers: Headers | Record<string, any> | any
): RateLimitInfo {
  const getHeader = (name: string): string | null => {
    if (!headers) return null;

    // Native Headers API
    if (headers instanceof Headers) {
      return headers.get(name);
    }

    // Axios headers or plain object
    if (typeof headers === "object") {
      // Try exact match
      if (headers[name]) return String(headers[name]);

      // Try case-insensitive match (Axios can normalize headers)
      const lowerName = name.toLowerCase();
      for (const key of Object.keys(headers)) {
        if (key.toLowerCase() === lowerName) {
          return String(headers[key]);
        }
      }
    }

    return null;
  };

  const minuteRemaining = getHeader("X-MinLimit-Remaining");
  const dayRemaining = getHeader("X-DayLimit-Remaining");
  const retryAfter = getHeader("Retry-After");
  const problem = getHeader("X-Rate-Limit-Problem");

  const info: RateLimitInfo = {};

  if (minuteRemaining) {
    info.minuteRemaining = Number.parseInt(minuteRemaining, 10);
  }

  if (dayRemaining) {
    info.dayRemaining = Number.parseInt(dayRemaining, 10);
  }

  if (retryAfter) {
    const seconds = Number.parseInt(retryAfter, 10);
    info.retryAfter = seconds;
    info.resetAt = new Date(Date.now() + seconds * 1000);
  }

  if (problem === "minute" || problem === "day") {
    info.problem = problem;
  }

  return info;
}

/**
 * Check if we should wait before making a request based on rate limit status
 */
export function shouldWaitForRateLimit(rateLimitInfo: {
  rateLimitResetAt: Date | null;
  rateLimitProblem: string | null;
  rateLimitMinuteRemaining: number | null;
  rateLimitDayRemaining: number | null;
}): { wait: boolean; waitMs?: number; reason?: string } {
  // Check if we have an active rate limit
  if (rateLimitInfo.rateLimitResetAt) {
    const now = new Date();
    const resetAt = new Date(rateLimitInfo.rateLimitResetAt);

    if (resetAt > now) {
      const waitMs = resetAt.getTime() - now.getTime();
      return {
        wait: true,
        waitMs,
        reason: `Rate limit (${rateLimitInfo.rateLimitProblem || "unknown"}) - resets in ${Math.ceil(waitMs / 1000)}s`,
      };
    }
  }

  // Check if we're close to limits (proactive throttling)
  if (rateLimitInfo.rateLimitMinuteRemaining !== null) {
    if (rateLimitInfo.rateLimitMinuteRemaining <= 2) {
      return {
        wait: true,
        waitMs: 60_000, // Wait 1 minute
        reason: "Approaching minute rate limit (2 or fewer calls remaining)",
      };
    }
  }

  if (rateLimitInfo.rateLimitDayRemaining !== null) {
    if (rateLimitInfo.rateLimitDayRemaining <= 50) {
      // Reserve last 50 calls for critical operations
      return {
        wait: true,
        waitMs: 300_000, // Wait 5 minutes
        reason: "Approaching daily rate limit (50 or fewer calls remaining)",
      };
    }
  }

  return { wait: false };
}

/**
 * Calculate wait time for exponential backoff
 */
export function calculateBackoffDelay(
  attemptNumber: number,
  baseDelay = 1000
): number {
  // Exponential backoff with jitter: baseDelay * 2^attempt + random jitter
  const exponentialDelay = baseDelay * 2 ** attemptNumber;
  const jitter = Math.random() * 1000; // Add up to 1 second of jitter
  return Math.min(exponentialDelay + jitter, 60_000); // Cap at 60 seconds
}

/**
 * Format rate limit info for logging
 */
export function formatRateLimitInfo(info: RateLimitInfo): string {
  const parts: string[] = [];

  if (info.minuteRemaining !== undefined) {
    parts.push(`Minute: ${info.minuteRemaining}/60`);
  }

  if (info.dayRemaining !== undefined) {
    parts.push(`Day: ${info.dayRemaining}/5000`);
  }

  if (info.problem) {
    parts.push(`Problem: ${info.problem} limit exceeded`);
  }

  if (info.retryAfter !== undefined) {
    parts.push(`Retry after: ${info.retryAfter}s`);
  }

  if (info.resetAt) {
    parts.push(`Resets at: ${info.resetAt.toISOString()}`);
  }

  return parts.join(" | ");
}

/**
 * Build pagination parameters for Xero API requests
 */
export function buildPaginationParams(params: PaginationParams): {
  page: number;
  pageSize: number;
} {
  const page = params.page && params.page > 0 ? params.page : 1;
  const pageSize =
    params.pageSize && params.pageSize > 0 && params.pageSize <= 1000
      ? params.pageSize
      : 100; // Default 100, max 1000

  return { page, pageSize };
}

/**
 * Determine if pagination is available for an endpoint
 * Based on: https://developer.xero.com/documentation/best-practices/integration-health/paging
 */
export function supportsPagination(toolName: string): boolean {
  const paginatedEndpoints = [
    "xero_list_invoices",
    "xero_list_contacts",
    "xero_get_bank_transactions",
    "xero_list_credit_notes",
    "xero_list_journal_entries",
    "xero_list_payments",
    "xero_list_quotes",
    "xero_list_purchase_orders",
  ];

  return paginatedEndpoints.includes(toolName);
}

/**
 * Check if response indicates more pages are available
 * Xero returns fewer records than pageSize when you've reached the last page
 */
export function hasMorePages(
  recordCount: number,
  pageSize: number
): boolean {
  return recordCount >= pageSize;
}

/**
 * Generate helpful message about rate limits for users
 */
export function generateRateLimitUserMessage(info: RateLimitInfo): string {
  if (info.problem === "minute") {
    const retrySeconds = info.retryAfter || 60;
    return `Xero rate limit reached (60 calls per minute). Please wait ${retrySeconds} seconds before trying again.`;
  }

  if (info.problem === "day") {
    const retrySeconds = info.retryAfter || 3600;
    const retryHours = Math.ceil(retrySeconds / 3600);
    return `Xero daily rate limit reached (5000 calls per day). Please wait ${retryHours} hour(s) before trying again. Consider using filters or pagination to reduce API calls.`;
  }

  return "Xero rate limit reached. Please wait a moment before trying again.";
}

/**
 * Check if we should use pagination based on request
 */
export function shouldUsePagination(
  toolName: string,
  explicitPagination?: boolean
): boolean {
  // If pagination is explicitly requested, use it
  if (explicitPagination !== undefined) {
    return explicitPagination;
  }

  // For list endpoints, default to using pagination
  return supportsPagination(toolName);
}

/**
 * Log rate limit status for monitoring
 */
export function logRateLimitStatus(
  connectionId: string,
  toolName: string,
  info: RateLimitInfo
): void {
  const formatted = formatRateLimitInfo(info);

  // Warn if getting close to limits
  if (info.minuteRemaining !== undefined && info.minuteRemaining <= 10) {
    console.warn(
      `⚠️ Xero rate limit warning for connection ${connectionId} (${toolName}): ${formatted}`
    );
  } else if (info.dayRemaining !== undefined && info.dayRemaining <= 100) {
    console.warn(
      `⚠️ Xero daily rate limit warning for connection ${connectionId} (${toolName}): ${formatted}`
    );
  } else {
    console.log(
      `Rate limits for connection ${connectionId} (${toolName}): ${formatted}`
    );
  }
}

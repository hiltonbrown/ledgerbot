import "server-only";

import type { DecryptedXeroConnection } from "./types";

/**
 * Xero Best Practice: Tenant Context Management
 *
 * Critical guidelines from Xero documentation:
 * 1. "Always pass the tenant ID and access token explicitly" - Never rely on globals
 * 2. "Each API call must carry the correct xero-tenant-id header"
 * 3. "Do not use thread-local storage" - Can lead to tenant mixups
 * 4. "Pass tenant-specific data explicitly to ensure each request operates on correct identity"
 *
 * This module provides helpers to ensure tenant context is always explicit and correct.
 */

/**
 * Tenant context for making Xero API calls
 * This should be passed explicitly to all Xero API operations
 */
export type XeroTenantContext = {
  tenantId: string;
  accessToken: string;
  tenantName: string | null;
  organisationId: string | null;
  shortCode: string | null; // For deep linking
  connectionId: string; // For logging and debugging
};

/**
 * Create an explicit tenant context from a connection
 *
 * Xero Best Practice: "Pass Tenant Context Explicitly"
 * This ensures tenant data is never assumed from ambient context
 *
 * @param connection Decrypted Xero connection
 * @returns Immutable tenant context object
 */
export function createTenantContext(
  connection: DecryptedXeroConnection
): Readonly<XeroTenantContext> {
  // Validate required fields
  if (!connection.tenantId) {
    throw new Error(
      `Invalid connection: missing tenantId (connectionId: ${connection.id})`
    );
  }
  if (!connection.accessToken) {
    throw new Error(
      `Invalid connection: missing accessToken (connectionId: ${connection.id})`
    );
  }

  // Return immutable object to prevent accidental modifications
  return Object.freeze({
    tenantId: connection.tenantId,
    accessToken: connection.accessToken,
    tenantName: connection.tenantName,
    organisationId: connection.organisationId,
    shortCode: connection.shortCode,
    connectionId: connection.id,
  });
}

/**
 * Validate that a tenant context is safe to use for API calls
 *
 * Checks:
 * - Required fields are present
 * - Access token is not expired (this should be caught earlier, but double-check)
 *
 * @param context Tenant context to validate
 * @throws Error if context is invalid
 */
export function validateTenantContext(
  context: XeroTenantContext,
  expiresAt?: Date
): void {
  if (!context.tenantId || context.tenantId.trim() === "") {
    throw new Error("Tenant context missing tenantId");
  }

  if (!context.accessToken || context.accessToken.trim() === "") {
    throw new Error("Tenant context missing accessToken");
  }

  // Additional validation: Check token isn't obviously expired
  if (expiresAt && expiresAt <= new Date()) {
    throw new Error(
      `Access token expired at ${expiresAt.toISOString()} for tenant ${context.tenantId}. Token should have been refreshed before API call.`
    );
  }
}

/**
 * Create standard Xero API request headers with explicit tenant context
 *
 * Xero Best Practice: "Each API call must carry the correct xero-tenant-id header"
 *
 * @param context Tenant context
 * @returns Headers object ready for fetch()
 */
export function createXeroHeaders(
  context: XeroTenantContext,
  additionalHeaders?: Record<string, string>
): Headers {
  const headers = new Headers({
    Authorization: `Bearer ${context.accessToken}`,
    "xero-tenant-id": context.tenantId,
    "Content-Type": "application/json",
    Accept: "application/json",
    ...additionalHeaders,
  });

  return headers;
}

/**
 * Log tenant context for debugging (without exposing sensitive data)
 *
 * @param context Tenant context
 * @param operation Operation being performed
 */
export function logTenantContext(
  context: XeroTenantContext,
  operation: string
): void {
  console.log(`[Xero API] ${operation}`, {
    connectionId: context.connectionId,
    tenantId: context.tenantId,
    tenantName: context.tenantName,
    organisationId: context.organisationId,
    // Never log access token
    tokenLength: context.accessToken.length,
  });
}

/**
 * Helper to make a Xero API call with explicit tenant context
 *
 * Xero Best Practices enforced:
 * - Explicit tenant context (no globals)
 * - Proper headers with xero-tenant-id
 * - Correlation ID tracking for support
 *
 * @param context Tenant context
 * @param url API endpoint URL
 * @param options Fetch options
 * @returns Response from Xero API
 */
export async function makeXeroApiCall(
  context: XeroTenantContext,
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Validate context before making call
  validateTenantContext(context);

  // Create headers with tenant context
  const headers = createXeroHeaders(context, {
    ...(options.headers as Record<string, string>),
  });

  // Log the operation (without sensitive data)
  console.log(`[Xero API Call] ${options.method || "GET"} ${url}`, {
    connectionId: context.connectionId,
    tenantId: context.tenantId,
    tenantName: context.tenantName,
  });

  // Make the API call
  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Extract and log correlation ID for debugging
  const correlationId = response.headers.get("X-Correlation-Id");
  if (correlationId) {
    console.log(
      `[Xero API] Response correlation ID: ${correlationId} (status: ${response.status})`
    );
  }

  // Log rate limit information
  const minRemaining = response.headers.get("X-MinLimit-Remaining");
  const dayRemaining = response.headers.get("X-DayLimit-Remaining");
  if (minRemaining || dayRemaining) {
    console.log("[Xero API] Rate limits:", {
      minuteRemaining: minRemaining ? Number.parseInt(minRemaining, 10) : null,
      dayRemaining: dayRemaining ? Number.parseInt(dayRemaining, 10) : null,
    });
  }

  return response;
}

/**
 * Example usage pattern for Xero API operations
 *
 * ```typescript
 * // ✅ CORRECT: Explicit tenant context
 * async function getInvoices(connection: DecryptedXeroConnection) {
 *   const context = createTenantContext(connection);
 *   const response = await makeXeroApiCall(
 *     context,
 *     'https://api.xero.com/api.xro/2.0/Invoices',
 *     { method: 'GET' }
 *   );
 *   return response.json();
 * }
 *
 * // ❌ WRONG: Using globals or ambient context
 * let globalTenantId = '...'; // NEVER DO THIS
 * async function getInvoices() {
 *   // This can lead to tenant mixups in concurrent scenarios
 *   const response = await fetch('...', {
 *     headers: { 'xero-tenant-id': globalTenantId }
 *   });
 * }
 * ```
 */

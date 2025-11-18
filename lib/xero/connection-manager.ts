import "server-only";

import { XeroClient } from "xero-node";
import {
  deactivateXeroConnection,
  getActiveXeroConnection,
  getXeroConnectionById,
  removeDuplicateXeroConnectionsForUser,
  updateXeroTokens,
} from "@/lib/db/queries";
import { decryptToken, encryptToken } from "./encryption";
import type {
  DecryptedXeroConnection,
  XeroConnection,
  XeroTenant,
} from "./types";

// In-memory lock to prevent concurrent token refreshes for the same connection
// Key: connectionId, Value: Promise of ongoing refresh
const tokenRefreshLocks = new Map<string, Promise<TokenRefreshResult>>();

const XERO_SCOPES = [
  "offline_access",
  "accounting.transactions",
  "accounting.contacts",
  "accounting.settings",
  "accounting.reports.read",
  "accounting.journals.read",
  "accounting.attachments",
  "payroll.employees",
  "payroll.payruns",
  "payroll.timesheets",
];

export function createXeroClient(state?: string): XeroClient {
  const clientId = process.env.XERO_CLIENT_ID;
  const clientSecret = process.env.XERO_CLIENT_SECRET;
  const redirectUri = process.env.XERO_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Xero environment variables not configured: XERO_CLIENT_ID, XERO_CLIENT_SECRET, XERO_REDIRECT_URI required"
    );
  }

  return new XeroClient({
    clientId,
    clientSecret,
    redirectUris: [redirectUri],
    scopes: XERO_SCOPES,
    state,
    httpTimeout: 10_000, // 10 seconds - prevent timeout issues with token refresh
    clockTolerance: 10, // 10 seconds - handle time sync issues between servers (Xero best practice)
  });
}

export async function getDecryptedConnection(
  userId: string
): Promise<DecryptedXeroConnection | null> {
  try {
    await removeDuplicateXeroConnectionsForUser(userId);
  } catch (error) {
    console.error("Failed to prune duplicate Xero connections:", error);
  }

  const connection = await getActiveXeroConnection(userId);

  if (!connection) {
    return null;
  }

  // Check if refresh token has expired (Xero refresh tokens last 60 days from issuance)
  // IMPORTANT: Xero uses OAuth2 refresh token rotation - each refresh provides a NEW refresh token
  // with a NEW 60-day expiry window. The refreshTokenIssuedAt timestamp is updated on every
  // successful refresh to track the current token's age.
  const refreshTokenAge =
    Date.now() - new Date(connection.refreshTokenIssuedAt).getTime();
  const SIXTY_DAYS = 60 * 24 * 60 * 60 * 1000; // 60 days in milliseconds
  const FIFTY_FIVE_DAYS = 55 * 24 * 60 * 60 * 1000; // Warning threshold

  const refreshTokenAgeDays = Math.floor(
    refreshTokenAge / (24 * 60 * 60 * 1000)
  );

  if (refreshTokenAge >= SIXTY_DAYS) {
    // Refresh token is definitely expired - deactivate immediately
    console.error(
      `❌ [Xero Token] Refresh token expired for user ${userId} - last refreshed ${refreshTokenAgeDays} days ago (limit: 60 days)`
    );
    console.error(
      "  Connection will be deactivated. User must reconnect in Settings > Integrations."
    );

    try {
      await deactivateXeroConnection(connection.id);
      console.log(
        `Deactivated connection ${connection.id} due to expired refresh token (${refreshTokenAgeDays} days since last refresh)`
      );
    } catch (deactivateError) {
      console.error(
        `Failed to deactivate connection ${connection.id}:`,
        deactivateError
      );
    }

    throw new Error(
      `Xero refresh token expired (${refreshTokenAgeDays} days since last refresh, limit 60 days). Please reconnect your Xero account in Settings > Integrations.`
    );
  }

  if (refreshTokenAge > FIFTY_FIVE_DAYS) {
    console.warn(
      `⚠️ [Xero Token] Refresh token is ${refreshTokenAgeDays} days old (expires in ${60 - refreshTokenAgeDays} days). User should consider re-authenticating soon.`
    );
  }

  // Check if access token is expired or expiring soon (within 5 minutes)
  // Note: We use manual calculation here because tokenSet.expired() requires the full XeroClient context
  // This check happens before we initialize the client to avoid unnecessary API calls
  const expiresAt = new Date(connection.expiresAt);
  const now = new Date();
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  const isExpired = expiresAt <= now;
  const isExpiringSoon = expiresAt <= fiveMinutesFromNow;

  console.log(
    `[Xero Token Check] User: ${userId}, Connection: ${connection.id}`
  );
  console.log(`  Current time: ${now.toISOString()}`);
  console.log(`  Token expires: ${expiresAt.toISOString()}`);
  console.log(
    `  Status: ${isExpired ? "EXPIRED" : isExpiringSoon ? "EXPIRING SOON" : "VALID"}`
  );
  console.log(
    `  Minutes until expiry: ${Math.floor((expiresAt.getTime() - now.getTime()) / (60 * 1000))}`
  );

  if (expiresAt <= fiveMinutesFromNow) {
    console.log(
      `🔄 [Xero Token Refresh] Initiating refresh for user ${userId} - token ${isExpired ? "EXPIRED" : "expiring soon"} (expires: ${expiresAt.toISOString()})`
    );
    // Token needs refresh
    try {
      const refreshResult = await refreshXeroToken(connection.id);

      if (refreshResult.success && refreshResult.connection) {
        const newExpiresAt = new Date(refreshResult.connection.expiresAt);
        console.log(`✅ [Xero Token Refresh] SUCCESS for user ${userId}`);
        console.log(`  New expiry: ${newExpiresAt.toISOString()}`);
        console.log(
          `  Minutes until new expiry: ${Math.floor((newExpiresAt.getTime() - Date.now()) / (60 * 1000))}`
        );
        return {
          ...refreshResult.connection,
          accessToken: decryptToken(refreshResult.connection.accessToken),
          refreshToken: decryptToken(refreshResult.connection.refreshToken),
        };
      }

      // Check if this is a permanent failure (expired refresh token)
      if (refreshResult.isPermanentFailure) {
        console.error(
          `❌ [Xero Token Refresh] PERMANENT FAILURE for user ${userId}: ${refreshResult.error}`
        );
        console.error("  User must reconnect Xero in Settings > Integrations");
        // Only deactivate on permanent failures
        try {
          await deactivateXeroConnection(connection.id);
          console.log(
            `Deactivated Xero connection ${connection.id} due to permanent refresh failure (likely expired refresh token)`
          );
        } catch (deactivateError) {
          console.error(
            `Failed to deactivate Xero connection ${connection.id}:`,
            deactivateError
          );
        }
        // Throw an error with clear message for user
        throw new Error(
          "Xero refresh token has expired. Please reconnect your Xero account in Settings > Integrations."
        );
      }

      // Temporary failure - DO NOT deactivate, allow retry on next request
      console.warn(
        `⚠️ [Xero Token Refresh] TEMPORARY FAILURE for user ${userId}: ${refreshResult.error}`
      );
      console.warn(
        "  Will retry on next request - connection remains active for automatic recovery"
      );

      // Throw error to indicate refresh failed, but keep connection active
      // This allows automatic recovery on the next API call
      throw new Error(
        `Unable to refresh Xero token (temporary failure). Please try again in a moment. Error: ${refreshResult.error}`
      );
    } catch (error) {
      // If the error is one of our re-authentication messages, rethrow it
      if (
        error instanceof Error &&
        (error.message.includes("reconnect your Xero account") ||
          error.message.includes("Unable to refresh Xero token") ||
          error.message.includes("refresh token has expired"))
      ) {
        throw error;
      }

      // Unexpected error - log but do NOT deactivate (allow automatic recovery)
      console.error(
        `⚠️ Unexpected error refreshing Xero token for user ${userId}:`,
        error
      );
      console.error(
        "  Connection remains active for automatic recovery on next request"
      );

      // Throw error but keep connection active for retry
      throw new Error(
        `Unexpected error refreshing Xero token. Please try again. Error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  return {
    ...connection,
    accessToken: decryptToken(connection.accessToken),
    refreshToken: decryptToken(connection.refreshToken),
  };
}

export interface TokenRefreshResult {
  success: boolean;
  connection?: XeroConnection;
  error?: string;
  isPermanentFailure?: boolean; // True if refresh token is expired (needs re-auth)
}

export async function refreshXeroToken(
  connectionId: string,
  retryWithOldToken = false
): Promise<TokenRefreshResult> {
  // Check if there's already a refresh in progress for this connection
  const existingRefresh = tokenRefreshLocks.get(connectionId);
  if (existingRefresh) {
    console.log(
      `🔒 [refreshXeroToken] Refresh already in progress for connection ${connectionId}, waiting...`
    );
    return await existingRefresh;
  }

  // Create a new refresh promise and store it in the lock map
  const refreshPromise = performTokenRefresh(
    connectionId,
    retryWithOldToken
  ).finally(() => {
    // Always remove the lock when done (success or failure)
    tokenRefreshLocks.delete(connectionId);
  });

  tokenRefreshLocks.set(connectionId, refreshPromise);
  return await refreshPromise;
}

async function performTokenRefresh(
  connectionId: string,
  retryWithOldToken = false
): Promise<TokenRefreshResult> {
  const connection = await getXeroConnectionById(connectionId);

  if (!connection) {
    console.warn(`Xero connection ${connectionId} not found for refresh`);
    return {
      success: false,
      error: "Connection not found",
      isPermanentFailure: true,
    };
  }

  const xeroClient = createXeroClient();

  try {
    console.log(
      `🔄 [refreshXeroToken] Starting refresh for connection ${connectionId}${retryWithOldToken ? " (RETRY with old token)" : ""}`
    );
    console.log(
      `  Connection age: ${Math.floor((Date.now() - new Date(connection.updatedAt).getTime()) / (24 * 60 * 60 * 1000))} days`
    );
    console.log(
      `  Token expires: ${new Date(connection.expiresAt).toISOString()}`
    );

    const decryptedAccessToken = decryptToken(connection.accessToken);
    const decryptedRefreshToken = decryptToken(connection.refreshToken);

    console.log(`  Access token length: ${decryptedAccessToken.length}`);
    console.log(`  Refresh token length: ${decryptedRefreshToken.length}`);

    // Initialize the client BEFORE setting token set and refreshing
    await xeroClient.initialize();
    console.log("  ✓ Xero client initialized");

    // Set the current token set before refreshing
    // Use standard 30 minutes (1800 seconds) for expires_in instead of calculating from expired token
    await xeroClient.setTokenSet({
      access_token: decryptedAccessToken,
      refresh_token: decryptedRefreshToken,
      token_type: "Bearer",
      expires_in: 1800, // Standard 30 minutes - don't use expired token's remaining time
    });
    console.log("  ✓ Token set configured");

    // Refresh the token (no arguments needed)
    console.log("  🔄 Calling Xero API to refresh token...");
    const tokenSet = await xeroClient.refreshToken();
    console.log("  ✓ Received new token set from Xero");

    if (!tokenSet.access_token || !tokenSet.refresh_token) {
      console.error(
        "Invalid token response from Xero - missing access_token or refresh_token"
      );
      return {
        success: false,
        error: "Invalid token response from Xero",
        isPermanentFailure: false, // Might be temporary API issue
      };
    }

    // Extract expiry and authentication_event_id from JWT
    // CRITICAL: Use the actual 'exp' claim from JWT as authoritative source
    let expiresAt: Date;
    let authenticationEventId: string | undefined;

    try {
      // JWT is base64url encoded: header.payload.signature
      const parts = tokenSet.access_token.split(".");
      if (parts.length !== 3) {
        throw new Error(
          `Invalid JWT format: expected 3 parts, got ${parts.length}`
        );
      }

      const payload = JSON.parse(
        Buffer.from(parts[1], "base64url").toString("utf-8")
      );
      authenticationEventId = payload.authentication_event_id;

      // MUST have exp claim - this is the authoritative expiry time
      if (!payload.exp) {
        throw new Error(
          "JWT missing required 'exp' claim - cannot determine token expiry"
        );
      }

      // Use the actual exp claim from JWT (Unix timestamp in seconds)
      expiresAt = new Date(payload.exp * 1000);
      console.log(
        `  ✓ Token expiry from JWT: ${expiresAt.toISOString()} (exp: ${payload.exp})`
      );
    } catch (jwtError) {
      console.error(
        "  ❌ CRITICAL: Failed to parse JWT access token:",
        jwtError
      );
      throw new Error(
        `Failed to parse Xero access token JWT: ${jwtError instanceof Error ? jwtError.message : String(jwtError)}`
      );
    }

    console.log(
      `✅ Successfully refreshed Xero token for connection ${connectionId}, expires at ${expiresAt.toISOString()}${authenticationEventId ? `, auth_event_id: ${authenticationEventId}` : ""}`
    );

    const now = new Date();
    const updatedConnection = await updateXeroTokens({
      id: connectionId,
      accessToken: encryptToken(tokenSet.access_token),
      refreshToken: encryptToken(tokenSet.refresh_token),
      expiresAt,
      authenticationEventId,
      resetRefreshTokenIssuedAt: true, // CRITICAL: Reset the 60-day window with new refresh token
      expectedUpdatedAt: connection.updatedAt, // Optimistic locking to prevent race conditions
    });

    // Handle optimistic lock failure (another process updated the token concurrently)
    if (!updatedConnection) {
      console.warn(
        `⚠️ [refreshXeroToken] Concurrent token update detected for connection ${connectionId}`
      );
      console.warn(
        "  Another process already refreshed this token - fetching latest version"
      );

      // Fetch the latest connection (which has the newer token)
      const latestConnection = await getXeroConnectionById(connectionId);

      if (!latestConnection) {
        return {
          success: false,
          error: "Connection not found after concurrent update",
          isPermanentFailure: false,
        };
      }

      // Check if the latest token is still valid
      const latestExpiresAt = new Date(latestConnection.expiresAt);
      if (latestExpiresAt > now) {
        console.log(
          `  ✓ Using concurrently refreshed token (expires: ${latestExpiresAt.toISOString()})`
        );
        return {
          success: true,
          connection: latestConnection,
        };
      }

      // Latest token is also expired - this is unexpected
      console.error(
        `  ❌ Concurrently updated token is also expired - this should not happen`
      );
      return {
        success: false,
        error: "Concurrent token update produced expired token",
        isPermanentFailure: false,
      };
    }

    console.log(
      `  ✓ Refresh token rotation complete - new 60-day window starts at ${now.toISOString()}`
    );

    return {
      success: true,
      connection: updatedConnection,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      `❌ [refreshXeroToken] FAILED for connection ${connectionId}`
    );
    console.error(`  Error: ${errorMessage}`);
    if (error instanceof Error && error.stack) {
      console.error(
        `  Stack: ${error.stack.split("\n").slice(0, 3).join("\n")}`
      );
    }

    // Check if this is a permanent failure (expired refresh token)
    const isPermanent =
      error instanceof Error &&
      (error.message.includes("invalid_grant") ||
        error.message.includes("refresh_token") ||
        error.message.toLowerCase().includes("expired"));

    if (isPermanent) {
      console.warn(
        `❌ [refreshXeroToken] PERMANENT FAILURE - Refresh token expired for connection ${connectionId}`
      );
      console.warn(
        "  User will need to re-authenticate in Settings > Integrations"
      );
    } else {
      console.warn(
        `⚠️ [refreshXeroToken] TEMPORARY FAILURE for connection ${connectionId} - will retry`
      );
    }

    // Xero provides 30-minute grace period: if refresh fails and token was updated < 30 min ago,
    // we can retry with the old refresh token (in case the new token wasn't saved properly)
    if (!retryWithOldToken && !isPermanent) {
      const tokenAge = Date.now() - new Date(connection.updatedAt).getTime();
      const THIRTY_MINUTES = 30 * 60 * 1000;

      if (tokenAge < THIRTY_MINUTES) {
        console.log(
          `Token was updated ${Math.floor(tokenAge / 1000)} seconds ago (< 30 min grace period). Retrying with old token...`
        );
        // Retry once with the old token (within grace period)
        // Use performTokenRefresh directly to avoid re-acquiring lock
        return await performTokenRefresh(connectionId, true);
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      isPermanentFailure: isPermanent,
    };
  }
}

/**
 * Refresh a Xero token by connection ID with additional error handling for cron jobs
 * Returns success status and error message if failed
 */
export async function refreshXeroTokenById(
  connectionId: string
): Promise<{ success: boolean; error?: string }> {
  const result = await refreshXeroToken(connectionId);
  return {
    success: result.success,
    error: result.error,
  };
}

export async function getXeroTenants(
  accessToken: string
): Promise<XeroTenant[]> {
  const xeroClient = createXeroClient();

  try {
    await xeroClient.initialize();

    await xeroClient.setTokenSet({
      access_token: accessToken,
      refresh_token: "", // Not needed for this call
      token_type: "Bearer",
    });

    const tenants = await xeroClient.updateTenants();
    return tenants.map((tenant: any) => ({
      tenantId: tenant.tenantId,
      tenantName: tenant.tenantName,
      tenantType: tenant.tenantType,
    }));
  } catch (error) {
    console.error("Failed to get Xero tenants:", error);
    throw error;
  }
}

export async function getXeroAuthUrl(state: string): Promise<string> {
  const xeroClient = createXeroClient(state);
  const url = await xeroClient.buildConsentUrl();
  return url;
}

export function getXeroScopes(): string[] {
  return XERO_SCOPES;
}

/**
 * Revoke a Xero refresh token and deactivate the connection
 */
export async function revokeXeroToken(connectionId: string): Promise<void> {
  try {
    console.log(
      `Attempting to revoke Xero token for connection ${connectionId}`
    );

    const connection = await getXeroConnectionById(connectionId);
    if (!connection) {
      console.warn(`Xero connection ${connectionId} not found for revocation`);
      return;
    }

    const xeroClient = createXeroClient();

    try {
      const decryptedRefreshToken = decryptToken(connection.refreshToken);

      await xeroClient.initialize();

      // Set the token set first, then revoke
      // Use standard 30 minutes (1800 seconds) for expires_in
      await xeroClient.setTokenSet({
        access_token: decryptToken(connection.accessToken),
        refresh_token: decryptedRefreshToken,
        token_type: "Bearer",
        expires_in: 1800, // Standard 30 minutes - don't use expired token's remaining time
      });

      // Revoke the refresh token using Xero's revocation endpoint
      await xeroClient.revokeToken();

      console.log(
        `Successfully revoked Xero refresh token for connection ${connectionId}`
      );
    } catch (revokeError) {
      console.error(
        `Failed to revoke Xero token for connection ${connectionId}:`,
        revokeError
      );
      // Continue with deactivation even if revocation fails
    }

    // Deactivate the connection regardless of revocation success
    await deactivateXeroConnection(connectionId);
    console.log(
      `Deactivated Xero connection ${connectionId} after token revocation`
    );
  } catch (error) {
    console.error(
      `Error during Xero token revocation for connection ${connectionId}:`,
      error
    );
    throw error;
  }
}

/**
 * Fetch all Xero connections for a user from the Xero API
 * This calls the GET /connections endpoint and returns connection metadata
 */
export async function fetchXeroConnections(
  userId: string,
  authEventId?: string
): Promise<XeroConnectionInfo[]> {
  try {
    const connection = await getActiveXeroConnection(userId);

    if (!connection) {
      return [];
    }

    const xeroClient = createXeroClient();
    await xeroClient.initialize();

    const decryptedAccessToken = decryptToken(connection.accessToken);
    const decryptedRefreshToken = decryptToken(connection.refreshToken);

    await xeroClient.setTokenSet({
      access_token: decryptedAccessToken,
      refresh_token: decryptedRefreshToken,
      token_type: "Bearer",
      expires_in: 1800,
    });

    // Build URL with optional authEventId filter
    const baseUrl = "https://api.xero.com/connections";
    const url = authEventId ? `${baseUrl}?authEventId=${authEventId}` : baseUrl;

    // Make request to connections endpoint
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${decryptedAccessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch Xero connections: ${response.statusText}`
      );
    }

    const connections = await response.json();
    return connections as XeroConnectionInfo[];
  } catch (error) {
    console.error(
      `Failed to fetch Xero connections for user ${userId}:`,
      error
    );
    throw error;
  }
}

/**
 * Delete a specific Xero connection via the DELETE /connections endpoint
 */
export async function deleteXeroConnection(
  userId: string,
  xeroConnectionId: string
): Promise<void> {
  try {
    const connection = await getActiveXeroConnection(userId);

    if (!connection) {
      throw new Error("No active Xero connection found");
    }

    const xeroClient = createXeroClient();
    await xeroClient.initialize();

    const decryptedAccessToken = decryptToken(connection.accessToken);
    const decryptedRefreshToken = decryptToken(connection.refreshToken);

    await xeroClient.setTokenSet({
      access_token: decryptedAccessToken,
      refresh_token: decryptedRefreshToken,
      token_type: "Bearer",
      expires_in: 1800,
    });

    // Make DELETE request to connections endpoint
    const response = await fetch(
      `https://api.xero.com/connections/${xeroConnectionId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${decryptedAccessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to delete Xero connection: ${response.statusText}`
      );
    }

    console.log(`Successfully deleted Xero connection ${xeroConnectionId}`);
  } catch (error) {
    console.error(
      `Failed to delete Xero connection ${xeroConnectionId}:`,
      error
    );
    throw error;
  }
}

/**
 * Type definition for Xero connection info from /connections endpoint
 */
export interface XeroConnectionInfo {
  id: string;
  authEventId: string;
  tenantId: string;
  tenantType: "ORGANISATION" | "PRACTICEMANAGER" | "PRACTICE";
  tenantName: string | null;
  createdDateUtc: string;
  updatedDateUtc: string;
}

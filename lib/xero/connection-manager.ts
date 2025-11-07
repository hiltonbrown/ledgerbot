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

  // Check if refresh token might be expired (Xero refresh tokens last 60 days)
  // We don't have the exact refresh token creation date, so we estimate based on updatedAt
  const connectionAge = Date.now() - new Date(connection.updatedAt).getTime();
  const FIFTY_FIVE_DAYS = 55 * 24 * 60 * 60 * 1000; // 55 days in milliseconds

  if (connectionAge > FIFTY_FIVE_DAYS) {
    console.warn(
      `Xero connection for user ${userId} is older than 55 days (${Math.floor(connectionAge / (24 * 60 * 60 * 1000))} days). Refresh token may be expired. User should re-authenticate.`
    );
    // Don't deactivate yet - let the refresh attempt happen and handle the error
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

      // Temporary failure - don't deactivate, return current tokens and let caller retry
      console.warn(
        `⚠️ [Xero Token Refresh] TEMPORARY FAILURE for user ${userId}: ${refreshResult.error}`
      );
      console.warn(
        "  Returning expired tokens, connection remains active for retry"
      );

      // Return the existing (possibly expired) connection - let the API call fail with proper error
      return {
        ...connection,
        accessToken: decryptToken(connection.accessToken),
        refreshToken: decryptToken(connection.refreshToken),
      };
    } catch (error) {
      // If the error is our re-authentication message, rethrow it
      if (
        error instanceof Error &&
        error.message.includes("reconnect your Xero account")
      ) {
        throw error;
      }

      console.error(
        `Unexpected error refreshing Xero token for user ${userId}:`,
        error
      );
      // Don't deactivate on unexpected errors - connection might still be valid
      // Return the connection and let the API call handle the error
      return {
        ...connection,
        accessToken: decryptToken(connection.accessToken),
        refreshToken: decryptToken(connection.refreshToken),
      };
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
    // CRITICAL: Use the actual 'exp' claim from JWT, not calculated from expires_in
    let expiresAt = new Date(Date.now() + (tokenSet.expires_in || 1800) * 1000); // Fallback
    let authenticationEventId: string | undefined;

    try {
      // JWT is base64url encoded: header.payload.signature
      const parts = tokenSet.access_token.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(
          Buffer.from(parts[1], "base64url").toString("utf-8")
        );
        authenticationEventId = payload.authentication_event_id;

        // Use the actual exp claim from JWT (Unix timestamp in seconds)
        if (payload.exp) {
          expiresAt = new Date(payload.exp * 1000);
          console.log(
            `  ✓ Token expiry from JWT: ${expiresAt.toISOString()} (${payload.exp})`
          );
        } else {
          console.warn(
            `  ⚠️ JWT missing exp claim, using calculated expiry: ${expiresAt.toISOString()}`
          );
        }
      }
    } catch (jwtError) {
      console.warn(
        "  ⚠️ Could not extract data from JWT, using calculated expiry:",
        jwtError
      );
    }

    console.log(
      `✅ Successfully refreshed Xero token for connection ${connectionId}, expires at ${expiresAt.toISOString()}${authenticationEventId ? `, auth_event_id: ${authenticationEventId}` : ""}`
    );

    const updatedConnection = await updateXeroTokens({
      id: connectionId,
      accessToken: encryptToken(tokenSet.access_token),
      refreshToken: encryptToken(tokenSet.refresh_token),
      expiresAt,
      authenticationEventId,
    });

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
        return await refreshXeroToken(connectionId, true);
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

import "server-only";

import {
  deactivateMyobConnection,
  getActiveMyobConnection,
  getMyobConnectionById,
  updateMyobTokens,
} from "@/lib/db/queries";
import { decryptToken, encryptToken } from "./encryption";
import type {
  DecryptedMyobConnection,
  MyobConnection,
  MyobTokenResponse,
} from "./types";

// In-memory lock to prevent concurrent token refreshes for the same connection
const tokenRefreshLocks = new Map<string, Promise<TokenRefreshResult>>();

// MYOB OAuth2 scopes (space-separated as required by MYOB)
const MYOB_SCOPES = [
  "CompanyFile", // Legacy scope for backward compatibility
  "sme-company-file", // Required for company file access (new post-March 2025)
  "sme-general-ledger", // General ledger accounts, journals
  "sme-sales", // Invoices, quotes
  "sme-purchases", // Bills, purchase orders
  "sme-banking", // Bank accounts, transactions
  "sme-contacts-customer", // Customer contacts
  "sme-contacts-supplier", // Supplier contacts
  "sme-inventory", // Inventory items
];

// MYOB OAuth2 endpoints
const MYOB_AUTH_URL = "https://secure.myob.com/oauth2/account/authorize";
const MYOB_TOKEN_URL = "https://secure.myob.com/oauth2/v1/authorize";

export async function getDecryptedConnection(
  userId: string
): Promise<DecryptedMyobConnection | null> {
  const connection = await getActiveMyobConnection(userId);

  if (!connection) {
    return null;
  }

  // Check if refresh token has expired (MYOB refresh tokens typically last 30 days)
  const refreshTokenAge =
    Date.now() - new Date(connection.refreshTokenIssuedAt).getTime();
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
  const TWENTY_FIVE_DAYS = 25 * 24 * 60 * 60 * 1000; // Warning threshold

  const refreshTokenAgeDays = Math.floor(
    refreshTokenAge / (24 * 60 * 60 * 1000)
  );

  if (refreshTokenAge >= THIRTY_DAYS) {
    console.error(
      `❌ [MYOB Token] Refresh token expired for user ${userId} - issued ${refreshTokenAgeDays} days ago (limit: 30 days)`
    );
    console.error(
      "  Connection will be deactivated. User must reconnect in Settings > Integrations."
    );

    try {
      await deactivateMyobConnection(connection.id);
      console.log(
        `Deactivated MYOB connection ${connection.id} due to expired refresh token (${refreshTokenAgeDays} days old)`
      );
    } catch (deactivateError) {
      console.error(
        `Failed to deactivate MYOB connection ${connection.id}:`,
        deactivateError
      );
    }

    throw new Error(
      `MYOB refresh token expired (${refreshTokenAgeDays} days old, limit 30 days). Please reconnect your MYOB account in Settings > Integrations.`
    );
  }

  if (refreshTokenAge > TWENTY_FIVE_DAYS) {
    console.warn(
      `⚠️ [MYOB Token] Refresh token is ${refreshTokenAgeDays} days old (expires in ${30 - refreshTokenAgeDays} days). User should consider re-authenticating soon.`
    );
  }

  // Check if access token is expired or expiring soon (within 5 minutes)
  const expiresAt = new Date(connection.expiresAt);
  const now = new Date();
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  const isExpired = expiresAt <= now;
  const isExpiringSoon = expiresAt <= fiveMinutesFromNow;

  console.log(
    `[MYOB Token Check] User: ${userId}, Connection: ${connection.id}`
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
      `🔄 [MYOB Token Refresh] Initiating refresh for user ${userId} - token ${isExpired ? "EXPIRED" : "expiring soon"} (expires: ${expiresAt.toISOString()})`
    );

    try {
      const refreshResult = await refreshMyobToken(connection.id);

      if (refreshResult.success && refreshResult.connection) {
        const newExpiresAt = new Date(refreshResult.connection.expiresAt);
        console.log(`✅ [MYOB Token Refresh] SUCCESS for user ${userId}`);
        console.log(`  New expiry: ${newExpiresAt.toISOString()}`);
        console.log(
          `  Minutes until new expiry: ${Math.floor((newExpiresAt.getTime() - Date.now()) / (60 * 1000))}`
        );
        return {
          ...refreshResult.connection,
          accessToken: decryptToken(refreshResult.connection.accessToken),
          refreshToken: decryptToken(refreshResult.connection.refreshToken),
          cfUsername: refreshResult.connection.cfUsername
            ? decryptToken(refreshResult.connection.cfUsername)
            : null,
          cfPassword: refreshResult.connection.cfPassword
            ? decryptToken(refreshResult.connection.cfPassword)
            : null,
        };
      }

      if (refreshResult.isPermanentFailure) {
        console.error(
          `❌ [MYOB Token Refresh] PERMANENT FAILURE for user ${userId}: ${refreshResult.error}`
        );
        console.error("  User must reconnect MYOB in Settings > Integrations");
        try {
          await deactivateMyobConnection(connection.id);
          console.log(
            `Deactivated MYOB connection ${connection.id} due to permanent refresh failure`
          );
        } catch (deactivateError) {
          console.error(
            `Failed to deactivate MYOB connection ${connection.id}:`,
            deactivateError
          );
        }
        throw new Error(
          "MYOB refresh token has expired. Please reconnect your MYOB account in Settings > Integrations."
        );
      }

      console.warn(
        `⚠️ [MYOB Token Refresh] TEMPORARY FAILURE for user ${userId}: ${refreshResult.error}`
      );
      console.warn(
        "  Will retry on next request - connection remains active for automatic recovery"
      );

      throw new Error(
        `Unable to refresh MYOB token (temporary failure). Please try again in a moment. Error: ${refreshResult.error}`
      );
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes("reconnect your MYOB account") ||
          error.message.includes("Unable to refresh MYOB token") ||
          error.message.includes("refresh token has expired"))
      ) {
        throw error;
      }

      console.error(
        `⚠️ Unexpected error refreshing MYOB token for user ${userId}:`,
        error
      );
      console.error(
        "  Connection remains active for automatic recovery on next request"
      );

      throw new Error(
        `Unexpected error refreshing MYOB token. Please try again. Error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  return {
    ...connection,
    accessToken: decryptToken(connection.accessToken),
    refreshToken: decryptToken(connection.refreshToken),
    cfUsername: connection.cfUsername
      ? decryptToken(connection.cfUsername)
      : null,
    cfPassword: connection.cfPassword
      ? decryptToken(connection.cfPassword)
      : null,
  };
}

export interface TokenRefreshResult {
  success: boolean;
  connection?: MyobConnection;
  error?: string;
  isPermanentFailure?: boolean;
}

export async function refreshMyobToken(
  connectionId: string
): Promise<TokenRefreshResult> {
  const existingRefresh = tokenRefreshLocks.get(connectionId);
  if (existingRefresh) {
    console.log(
      `🔒 [refreshMyobToken] Refresh already in progress for connection ${connectionId}, waiting...`
    );
    return await existingRefresh;
  }

  const refreshPromise = performTokenRefresh(connectionId).finally(() => {
    tokenRefreshLocks.delete(connectionId);
  });

  tokenRefreshLocks.set(connectionId, refreshPromise);
  return await refreshPromise;
}

async function performTokenRefresh(
  connectionId: string
): Promise<TokenRefreshResult> {
  const connection = await getMyobConnectionById(connectionId);

  if (!connection) {
    console.warn(`MYOB connection ${connectionId} not found for refresh`);
    return {
      success: false,
      error: "Connection not found",
      isPermanentFailure: true,
    };
  }

  try {
    console.log(
      `🔄 [refreshMyobToken] Starting refresh for connection ${connectionId}`
    );
    console.log(
      `  Connection age: ${Math.floor((Date.now() - new Date(connection.updatedAt).getTime()) / (24 * 60 * 60 * 1000))} days`
    );
    console.log(
      `  Token expires: ${new Date(connection.expiresAt).toISOString()}`
    );

    const decryptedRefreshToken = decryptToken(connection.refreshToken);
    console.log(`  Refresh token length: ${decryptedRefreshToken.length}`);

    const clientId = process.env.MYOB_CLIENT_ID;
    const clientSecret = process.env.MYOB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error(
        "MYOB_CLIENT_ID and MYOB_CLIENT_SECRET environment variables are required"
      );
    }

    // MYOB requires form-encoded body for token refresh
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: decryptedRefreshToken,
      grant_type: "refresh_token",
    });

    console.log("  🔄 Calling MYOB API to refresh token...");
    const response = await fetch(MYOB_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `  ❌ MYOB token refresh failed: ${response.status} ${response.statusText}`
      );
      console.error(`  Response: ${errorText}`);

      const isPermanent =
        response.status === 400 ||
        errorText.includes("invalid_grant") ||
        errorText.includes("expired");

      return {
        success: false,
        error: `HTTP ${response.status}: ${errorText}`,
        isPermanentFailure: isPermanent,
      };
    }

    const tokenData: MyobTokenResponse = await response.json();
    console.log("  ✓ Received new token set from MYOB");

    if (!tokenData.access_token || !tokenData.refresh_token) {
      console.error(
        "Invalid token response from MYOB - missing access_token or refresh_token"
      );
      return {
        success: false,
        error: "Invalid token response from MYOB",
        isPermanentFailure: false,
      };
    }

    // Calculate expiry time
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
    console.log(`  ✓ Token expiry: ${expiresAt.toISOString()}`);

    const updatedConnection = await updateMyobTokens({
      id: connectionId,
      accessToken: encryptToken(tokenData.access_token),
      refreshToken: encryptToken(tokenData.refresh_token),
      expiresAt,
    });

    console.log(
      `✅ Successfully refreshed MYOB token for connection ${connectionId}, expires at ${expiresAt.toISOString()}`
    );

    return {
      success: true,
      connection: updatedConnection,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      `❌ [refreshMyobToken] FAILED for connection ${connectionId}`
    );
    console.error(`  Error: ${errorMessage}`);
    if (error instanceof Error && error.stack) {
      console.error(
        `  Stack: ${error.stack.split("\n").slice(0, 3).join("\n")}`
      );
    }

    const isPermanent =
      error instanceof Error &&
      (error.message.includes("invalid_grant") ||
        error.message.includes("refresh_token") ||
        error.message.toLowerCase().includes("expired"));

    if (isPermanent) {
      console.warn(
        `❌ [refreshMyobToken] PERMANENT FAILURE - Refresh token expired for connection ${connectionId}`
      );
      console.warn(
        "  User will need to re-authenticate in Settings > Integrations"
      );
    } else {
      console.warn(
        `⚠️ [refreshMyobToken] TEMPORARY FAILURE for connection ${connectionId} - will retry`
      );
    }

    return {
      success: false,
      error: errorMessage,
      isPermanentFailure: isPermanent,
    };
  }
}

export async function getMyobAuthUrl(state: string): Promise<string> {
  const clientId = process.env.MYOB_CLIENT_ID;
  const redirectUri = process.env.MYOB_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    throw new Error(
      "MYOB environment variables not configured: MYOB_CLIENT_ID, MYOB_REDIRECT_URI required"
    );
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: MYOB_SCOPES.join(" "), // Space-separated scopes
    prompt: "consent", // Required to receive businessId in callback
    state,
  });

  return `${MYOB_AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForTokens(
  code: string,
  state: string
): Promise<MyobTokenResponse> {
  const clientId = process.env.MYOB_CLIENT_ID;
  const clientSecret = process.env.MYOB_CLIENT_SECRET;
  const redirectUri = process.env.MYOB_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "MYOB environment variables not configured: MYOB_CLIENT_ID, MYOB_CLIENT_SECRET, MYOB_REDIRECT_URI required"
    );
  }

  // MYOB requires form-encoded body, not URL parameters
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
    scope: MYOB_SCOPES.join(" "),
  });

  const response = await fetch(MYOB_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("MYOB token exchange failed:", response.status, errorText);
    throw new Error(`Failed to exchange code for tokens: ${errorText}`);
  }

  const tokenData: MyobTokenResponse = await response.json();
  return tokenData;
}

export function getMyobScopes(): string[] {
  return MYOB_SCOPES;
}

export async function revokeMyobToken(connectionId: string): Promise<void> {
  try {
    console.log(
      `Attempting to revoke MYOB token for connection ${connectionId}`
    );

    const connection = await getMyobConnectionById(connectionId);
    if (!connection) {
      console.warn(`MYOB connection ${connectionId} not found for revocation`);
      return;
    }

    // MYOB doesn't have a standard token revocation endpoint
    // We'll just deactivate the connection in our database
    console.log(
      `MYOB does not support token revocation endpoint - deactivating connection ${connectionId}`
    );

    await deactivateMyobConnection(connectionId);
    console.log(
      `Deactivated MYOB connection ${connectionId} (no token revocation available)`
    );
  } catch (error) {
    console.error(
      `Error during MYOB connection deactivation for connection ${connectionId}:`,
      error
    );
    throw error;
  }
}

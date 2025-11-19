import "server-only";

import {
  deactivateQuickBooksConnection,
  getActiveQuickBooksConnection,
  getQuickBooksConnectionById,
  removeDuplicateQuickBooksConnectionsForUser,
  updateQuickBooksTokens,
} from "@/lib/db/queries";
import { decryptToken, encryptToken } from "./encryption";
import type {
  DecryptedQuickBooksConnection,
  QuickBooksCompanyInfo,
  QuickBooksConnection,
  QuickBooksOAuthConfig,
  QuickBooksOAuthTokenResponse,
  QuickBooksTokenSet,
} from "./types";

// In-memory lock to prevent concurrent token refreshes for the same connection
// Key: connectionId, Value: Promise of ongoing refresh
const tokenRefreshLocks = new Map<string, Promise<TokenRefreshResult>>();

const QUICKBOOKS_SCOPES = ["com.intuit.quickbooks.accounting"];

// QuickBooks OAuth endpoints
const OAUTH_ENDPOINTS = {
  production: {
    auth: "https://appcenter.intuit.com/connect/oauth2",
    token: "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
    revoke: "https://developer.api.intuit.com/v2/oauth2/tokens/revoke",
    api: "https://quickbooks.api.intuit.com",
  },
  sandbox: {
    auth: "https://appcenter.intuit.com/connect/oauth2",
    token: "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
    revoke: "https://developer.api.intuit.com/v2/oauth2/tokens/revoke",
    api: "https://sandbox-quickbooks.api.intuit.com",
  },
};

export function getQuickBooksConfig(): QuickBooksOAuthConfig {
  const clientId = process.env.QUICKBOOKS_CLIENT_ID;
  const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET;
  const redirectUri = process.env.QUICKBOOKS_REDIRECT_URI;
  const environment = process.env.QUICKBOOKS_ENVIRONMENT || "production";

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "QuickBooks environment variables not configured: QUICKBOOKS_CLIENT_ID, QUICKBOOKS_CLIENT_SECRET, QUICKBOOKS_REDIRECT_URI required"
    );
  }

  if (environment !== "sandbox" && environment !== "production") {
    throw new Error(
      'QUICKBOOKS_ENVIRONMENT must be "sandbox" or "production"'
    );
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
    environment: environment as "sandbox" | "production",
  };
}

export async function getDecryptedConnection(
  userId: string
): Promise<DecryptedQuickBooksConnection | null> {
  try {
    await removeDuplicateQuickBooksConnectionsForUser(userId);
  } catch (error) {
    console.error("Failed to prune duplicate QuickBooks connections:", error);
  }

  const connection = await getActiveQuickBooksConnection(userId);

  if (!connection) {
    return null;
  }

  // Check if refresh token has expired (QuickBooks refresh tokens last 100 days from issuance)
  // QuickBooks uses OAuth2 refresh token rotation
  // Each refresh provides a NEW refresh token with a NEW 100-day expiry window
  const refreshTokenAge =
    Date.now() - new Date(connection.refreshTokenIssuedAt).getTime();
  const HUNDRED_DAYS = 100 * 24 * 60 * 60 * 1000; // 100 days in milliseconds
  const NINETY_FIVE_DAYS = 95 * 24 * 60 * 60 * 1000; // Warning threshold

  const refreshTokenAgeDays = Math.floor(
    refreshTokenAge / (24 * 60 * 60 * 1000)
  );

  if (refreshTokenAge >= HUNDRED_DAYS) {
    // Refresh token is definitely expired - deactivate immediately
    console.error(
      `❌ [QuickBooks Token] Refresh token expired for user ${userId} - last refreshed ${refreshTokenAgeDays} days ago (limit: 100 days)`
    );
    console.error(
      "  Connection will be deactivated. User must reconnect in Settings > Integrations."
    );

    try {
      await deactivateQuickBooksConnection(connection.id);
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
      `QuickBooks refresh token expired (${refreshTokenAgeDays} days since last refresh, limit 100 days). Please reconnect your QuickBooks account in Settings > Integrations.`
    );
  }

  if (refreshTokenAge > NINETY_FIVE_DAYS) {
    console.warn(
      `⚠️ [QuickBooks Token] Refresh token is ${refreshTokenAgeDays} days old (expires in ${100 - refreshTokenAgeDays} days). User should consider re-authenticating soon.`
    );
  }

  // Check if access token is expired or expiring soon (within 5 minutes)
  const expiresAt = new Date(connection.expiresAt);
  const now = new Date();
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  const isExpired = expiresAt <= now;
  const isExpiringSoon = expiresAt <= fiveMinutesFromNow;

  console.log(
    `[QuickBooks Token Check] User: ${userId}, Connection: ${connection.id}`
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
      `🔄 [QuickBooks Token Refresh] Initiating refresh for user ${userId} - token ${isExpired ? "EXPIRED" : "expiring soon"} (expires: ${expiresAt.toISOString()})`
    );
    // Token needs refresh
    try {
      const refreshResult = await refreshQuickBooksToken(connection.id);

      if (refreshResult.success && refreshResult.connection) {
        const newExpiresAt = new Date(refreshResult.connection.expiresAt);
        console.log(`✅ [QuickBooks Token Refresh] SUCCESS for user ${userId}`);
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
          `❌ [QuickBooks Token Refresh] PERMANENT FAILURE for user ${userId}: ${refreshResult.error}`
        );
        console.error(
          "  User must reconnect QuickBooks in Settings > Integrations"
        );
        // Only deactivate on permanent failures
        try {
          await deactivateQuickBooksConnection(connection.id);
          console.log(
            `Deactivated QuickBooks connection ${connection.id} due to permanent refresh failure (likely expired refresh token)`
          );
        } catch (deactivateError) {
          console.error(
            `Failed to deactivate QuickBooks connection ${connection.id}:`,
            deactivateError
          );
        }
        // Throw an error with clear message for user
        throw new Error(
          "QuickBooks refresh token has expired. Please reconnect your QuickBooks account in Settings > Integrations."
        );
      }

      // Temporary failure - DO NOT deactivate, allow retry on next request
      console.warn(
        `⚠️ [QuickBooks Token Refresh] TEMPORARY FAILURE for user ${userId}: ${refreshResult.error}`
      );
      console.warn(
        "  Will retry on next request - connection remains active for automatic recovery"
      );

      // Throw error to indicate refresh failed, but keep connection active
      throw new Error(
        `Unable to refresh QuickBooks token (temporary failure). Please try again in a moment. Error: ${refreshResult.error}`
      );
    } catch (error) {
      // If the error is one of our re-authentication messages, rethrow it
      if (
        error instanceof Error &&
        (error.message.includes("reconnect your QuickBooks account") ||
          error.message.includes("Unable to refresh QuickBooks token") ||
          error.message.includes("refresh token has expired"))
      ) {
        throw error;
      }

      // Unexpected error - log but do NOT deactivate (allow automatic recovery)
      console.error(
        `⚠️ Unexpected error refreshing QuickBooks token for user ${userId}:`,
        error
      );
      console.error(
        "  Connection remains active for automatic recovery on next request"
      );

      // Throw error but keep connection active for retry
      throw new Error(
        `Unexpected error refreshing QuickBooks token. Please try again. Error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  return {
    ...connection,
    accessToken: decryptToken(connection.accessToken),
    refreshToken: decryptToken(connection.refreshToken),
  };
}

export type TokenRefreshResult = {
  success: boolean;
  connection?: QuickBooksConnection;
  error?: string;
  isPermanentFailure?: boolean; // True if refresh token is expired (needs re-auth)
};

export async function refreshQuickBooksToken(
  connectionId: string
): Promise<TokenRefreshResult> {
  // Check if there's already a refresh in progress for this connection
  const existingRefresh = tokenRefreshLocks.get(connectionId);
  if (existingRefresh) {
    console.log(
      `🔒 [refreshQuickBooksToken] Refresh already in progress for connection ${connectionId}, waiting...`
    );
    return await existingRefresh;
  }

  // Create a new refresh promise and store it in the lock map
  const refreshPromise = performTokenRefresh(connectionId).finally(() => {
    // Always remove the lock when done (success or failure)
    tokenRefreshLocks.delete(connectionId);
  });

  tokenRefreshLocks.set(connectionId, refreshPromise);
  return await refreshPromise;
}

async function performTokenRefresh(
  connectionId: string
): Promise<TokenRefreshResult> {
  const connection = await getQuickBooksConnectionById(connectionId);

  if (!connection) {
    console.warn(
      `QuickBooks connection ${connectionId} not found for refresh`
    );
    return {
      success: false,
      error: "Connection not found",
      isPermanentFailure: true,
    };
  }

  const config = getQuickBooksConfig();
  // Ensure environment is valid (sandbox or production)
  const environment: "sandbox" | "production" =
    connection.environment === "sandbox" ? "sandbox" : "production";
  const endpoints = OAUTH_ENDPOINTS[environment];

  try {
    console.log(
      `🔄 [refreshQuickBooksToken] Starting refresh for connection ${connectionId}`
    );
    console.log(
      `  Connection age: ${Math.floor((Date.now() - new Date(connection.updatedAt).getTime()) / (24 * 60 * 60 * 1000))} days`
    );
    console.log(
      `  Token expires: ${new Date(connection.expiresAt).toISOString()}`
    );

    const decryptedRefreshToken = decryptToken(connection.refreshToken);

    // QuickBooks OAuth 2.0 token refresh
    // https://developer.intuit.com/app/developer/qbo/docs/develop/authentication-and-authorization/oauth-2.0#refresh-the-access-token
    const tokenResponse = await fetch(endpoints.token, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: decryptedRefreshToken,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error(
        `QuickBooks token refresh failed: ${tokenResponse.status} ${tokenResponse.statusText}`,
        errorText
      );

      // Check if this is a permanent failure (invalid_grant means refresh token is invalid/expired)
      const isPermanent =
        tokenResponse.status === 400 && errorText.includes("invalid_grant");

      return {
        success: false,
        error: `Token refresh failed: ${tokenResponse.status} ${tokenResponse.statusText}`,
        isPermanentFailure: isPermanent,
      };
    }

    const tokenData =
      (await tokenResponse.json()) as QuickBooksOAuthTokenResponse;

    if (!tokenData.access_token || !tokenData.refresh_token) {
      console.error(
        "Invalid token response from QuickBooks - missing access_token or refresh_token"
      );
      return {
        success: false,
        error: "Invalid token response from QuickBooks",
        isPermanentFailure: false,
      };
    }

    // Calculate expiry time (QuickBooks provides expires_in in seconds)
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    console.log(
      `✅ Successfully refreshed QuickBooks token for connection ${connectionId}, expires at ${expiresAt.toISOString()}`
    );

    const now = new Date();
    const updatedConnection = await updateQuickBooksTokens({
      id: connectionId,
      accessToken: encryptToken(tokenData.access_token),
      refreshToken: encryptToken(tokenData.refresh_token),
      expiresAt,
      resetRefreshTokenIssuedAt: true, // CRITICAL: Reset the 100-day window with new refresh token
      expectedUpdatedAt: connection.updatedAt, // Optimistic locking to prevent race conditions
    });

    // Handle optimistic lock failure (another process updated the token concurrently)
    if (!updatedConnection) {
      console.warn(
        `⚠️ [refreshQuickBooksToken] Concurrent token update detected for connection ${connectionId}`
      );
      console.warn(
        "  Another process already refreshed this token - fetching latest version"
      );

      // Fetch the latest connection (which has the newer token)
      const latestConnection = await getQuickBooksConnectionById(connectionId);

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
        "  ❌ Concurrently updated token is also expired - this should not happen"
      );
      return {
        success: false,
        error: "Concurrent token update produced expired token",
        isPermanentFailure: false,
      };
    }

    console.log(
      `  ✓ Refresh token rotation complete - new 100-day window starts at ${now.toISOString()}`
    );

    return {
      success: true,
      connection: updatedConnection,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      `❌ [refreshQuickBooksToken] FAILED for connection ${connectionId}`
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
        `❌ [refreshQuickBooksToken] PERMANENT FAILURE - Refresh token expired for connection ${connectionId}`
      );
      console.warn(
        "  User will need to re-authenticate in Settings > Integrations"
      );
    } else {
      console.warn(
        `⚠️ [refreshQuickBooksToken] TEMPORARY FAILURE for connection ${connectionId} - will retry`
      );
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      isPermanentFailure: isPermanent,
    };
  }
}

export async function getQuickBooksAuthUrl(state: string): Promise<string> {
  const config = getQuickBooksConfig();
  const endpoints = OAUTH_ENDPOINTS[config.environment];

  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: "code",
    scope: QUICKBOOKS_SCOPES.join(" "),
    redirect_uri: config.redirectUri,
    state,
  });

  return `${endpoints.auth}?${params.toString()}`;
}

export async function exchangeCodeForTokens(
  code: string
): Promise<QuickBooksTokenSet> {
  const config = getQuickBooksConfig();
  const endpoints = OAUTH_ENDPOINTS[config.environment];

  const tokenResponse = await fetch(endpoints.token, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: config.redirectUri,
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new Error(
      `Failed to exchange code for tokens: ${tokenResponse.status} ${tokenResponse.statusText} - ${errorText}`
    );
  }

  const tokenData =
    (await tokenResponse.json()) as QuickBooksOAuthTokenResponse;

  return {
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expires_in: tokenData.expires_in,
    x_refresh_token_expires_in: tokenData.x_refresh_token_expires_in,
    token_type: tokenData.token_type,
  };
}

export async function fetchQuickBooksCompanyInfo(
  accessToken: string,
  realmId: string,
  environment: "sandbox" | "production" = "production"
): Promise<QuickBooksCompanyInfo> {
  const endpoints = OAUTH_ENDPOINTS[environment];

  const response = await fetch(
    `${endpoints.api}/v3/company/${realmId}/companyinfo/${realmId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(10_000), // 10 second timeout
    }
  );

  if (!response.ok) {
    const errorBody = await response
      .text()
      .catch(() => "Unable to read error response");

    if (response.status === 401) {
      throw new Error(
        "QuickBooks authentication failed (401). Access token may be expired or invalid."
      );
    }
    if (response.status === 403) {
      throw new Error(
        "QuickBooks access forbidden (403). Missing required scopes for company info endpoint."
      );
    }

    throw new Error(
      `Failed to fetch QuickBooks company info: ${response.status} ${response.statusText}. ${errorBody.substring(0, 200)}`
    );
  }

  const data = await response.json();

  if (!data || !data.CompanyInfo) {
    throw new Error("Invalid response format from QuickBooks API");
  }

  return data.CompanyInfo as QuickBooksCompanyInfo;
}

export async function revokeQuickBooksToken(
  connectionId: string
): Promise<void> {
  try {
    console.log(
      `Attempting to revoke QuickBooks token for connection ${connectionId}`
    );

    const connection = await getQuickBooksConnectionById(connectionId);
    if (!connection) {
      console.warn(
        `QuickBooks connection ${connectionId} not found for revocation`
      );
      return;
    }

    const config = getQuickBooksConfig();
    // Ensure environment is valid (sandbox or production)
    const environment: "sandbox" | "production" =
      connection.environment === "sandbox" ? "sandbox" : "production";
    const endpoints = OAUTH_ENDPOINTS[environment];

    try {
      const decryptedRefreshToken = decryptToken(connection.refreshToken);

      // Revoke the refresh token using QuickBooks revocation endpoint
      const revokeResponse = await fetch(endpoints.revoke, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`,
        },
        body: new URLSearchParams({
          token: decryptedRefreshToken,
        }),
      });

      if (!revokeResponse.ok) {
        console.error(
          `Failed to revoke QuickBooks token: ${revokeResponse.status} ${revokeResponse.statusText}`
        );
      } else {
        console.log(
          `Successfully revoked QuickBooks refresh token for connection ${connectionId}`
        );
      }
    } catch (revokeError) {
      console.error(
        `Failed to revoke QuickBooks token for connection ${connectionId}:`,
        revokeError
      );
      // Continue with deactivation even if revocation fails
    }

    // Deactivate the connection regardless of revocation success
    await deactivateQuickBooksConnection(connectionId);
    console.log(
      `Deactivated QuickBooks connection ${connectionId} after token revocation`
    );
  } catch (error) {
    console.error(
      `Error during QuickBooks token revocation for connection ${connectionId}:`,
      error
    );
    throw error;
  }
}

export function getQuickBooksScopes(): string[] {
  return QUICKBOOKS_SCOPES;
}

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

  // Check if token is expired or expiring soon (within 5 minutes)
  const expiresAt = new Date(connection.expiresAt);
  const now = new Date();
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  if (expiresAt <= fiveMinutesFromNow) {
    console.log(
      `Xero token for user ${userId} is expired or expiring soon, attempting refresh`
    );
    // Token needs refresh
    try {
      const refreshedConnection = await refreshXeroToken(connection.id);
      if (refreshedConnection) {
        console.log(`Successfully refreshed Xero token for user ${userId}`);
        return {
          ...refreshedConnection,
          accessToken: decryptToken(refreshedConnection.accessToken),
          refreshToken: decryptToken(refreshedConnection.refreshToken),
        };
      }
      console.warn(
        `Failed to refresh Xero token for user ${userId}, token may be expired`
      );
      // Deactivate the connection since refresh failed
      try {
        await deactivateXeroConnection(connection.id);
        console.log(
          `Deactivated Xero connection ${connection.id} due to refresh failure`
        );
      } catch (deactivateError) {
        console.error(
          `Failed to deactivate Xero connection ${connection.id}:`,
          deactivateError
        );
      }
      return null;
    } catch (error) {
      console.error(`Failed to refresh Xero token for user ${userId}:`, error);
      // Deactivate the connection since refresh failed
      try {
        await deactivateXeroConnection(connection.id);
        console.log(
          `Deactivated Xero connection ${connection.id} due to refresh failure`
        );
      } catch (deactivateError) {
        console.error(
          `Failed to deactivate Xero connection ${connection.id}:`,
          deactivateError
        );
      }
      return null;
    }
  }

  return {
    ...connection,
    accessToken: decryptToken(connection.accessToken),
    refreshToken: decryptToken(connection.refreshToken),
  };
}

async function refreshXeroToken(
  connectionId: string
): Promise<XeroConnection | null> {
  const connection = await getXeroConnectionById(connectionId);

  if (!connection) {
    console.warn(`Xero connection ${connectionId} not found for refresh`);
    return null;
  }

  const xeroClient = createXeroClient();

  try {
    console.log(
      `Attempting to refresh Xero token for connection ${connectionId}`
    );

    const decryptedAccessToken = decryptToken(connection.accessToken);
    const decryptedRefreshToken = decryptToken(connection.refreshToken);

    await xeroClient.initialize();

    // Set the current token set before refreshing
    await xeroClient.setTokenSet({
      access_token: decryptedAccessToken,
      refresh_token: decryptedRefreshToken,
      token_type: "Bearer",
      expires_in: Math.max(
        Math.floor(
          (new Date(connection.expiresAt).getTime() - Date.now()) / 1000
        ),
        0
      ),
    });

    // Refresh the token (no arguments needed)
    const tokenSet = await xeroClient.refreshToken();

    if (!tokenSet.access_token || !tokenSet.refresh_token) {
      console.error(
        "Invalid token response from Xero - missing access_token or refresh_token"
      );
      throw new Error("Invalid token response from Xero");
    }

    const expiresAt = new Date(
      Date.now() + (tokenSet.expires_in || 1800) * 1000
    );

    console.log(
      `Successfully refreshed Xero token for connection ${connectionId}, expires at ${expiresAt.toISOString()}`
    );

    const updatedConnection = await updateXeroTokens({
      id: connectionId,
      accessToken: encryptToken(tokenSet.access_token),
      refreshToken: encryptToken(tokenSet.refresh_token),
      expiresAt,
    });

    return updatedConnection;
  } catch (error) {
    console.error(
      `Failed to refresh Xero token for connection ${connectionId}:`,
      {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      }
    );

    // Check if this is a refresh token expiry error
    if (
      error instanceof Error &&
      (error.message.includes("invalid_grant") ||
        error.message.includes("refresh_token") ||
        error.message.includes("expired"))
    ) {
      console.warn(
        `Refresh token appears to be expired for connection ${connectionId}, user will need to re-authenticate`
      );
      // Don't throw here - let the caller handle the null return and potentially deactivate the connection
      return null;
    }

    throw error;
  }
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
      await xeroClient.setTokenSet({
        access_token: decryptToken(connection.accessToken),
        refresh_token: decryptedRefreshToken,
        token_type: "Bearer",
        expires_in: Math.max(
          Math.floor(
            (new Date(connection.expiresAt).getTime() - Date.now()) / 1000
          ),
          0
        ),
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

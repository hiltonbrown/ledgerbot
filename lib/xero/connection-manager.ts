import "server-only";

import { XeroClient } from "xero-node";
import {
  getActiveXeroConnection,
  getXeroConnectionById,
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
  const connection = await getActiveXeroConnection(userId);

  if (!connection) {
    return null;
  }

  // Check if token is expired or expiring soon (within 5 minutes)
  const expiresAt = new Date(connection.expiresAt);
  const now = new Date();
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  if (expiresAt <= fiveMinutesFromNow) {
    // Token needs refresh
    try {
      const refreshedConnection = await refreshXeroToken(connection.id);
      if (refreshedConnection) {
        return {
          ...refreshedConnection,
          accessToken: decryptToken(refreshedConnection.accessToken),
          refreshToken: decryptToken(refreshedConnection.refreshToken),
        };
      }
    } catch (error) {
      console.error("Failed to refresh Xero token:", error);
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
    return null;
  }

  const xeroClient = createXeroClient();

  try {
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
      throw new Error("Invalid token response from Xero");
    }

    const expiresAt = new Date(
      Date.now() + (tokenSet.expires_in || 1800) * 1000
    );

    const updatedConnection = await updateXeroTokens({
      id: connectionId,
      accessToken: encryptToken(tokenSet.access_token),
      refreshToken: encryptToken(tokenSet.refresh_token),
      expiresAt,
    });

    return updatedConnection;
  } catch (error) {
    console.error("Failed to refresh Xero token:", error);
    throw error;
  }
}

export async function getXeroTenants(
  accessToken: string
): Promise<XeroTenant[]> {
  const xeroClient = createXeroClient();

  try {
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

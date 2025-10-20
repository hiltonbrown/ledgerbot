import "server-only";

import { XeroClient } from "xero-node";
import type { DecryptedXeroConnection } from "@/lib/xero/types";

/**
 * Creates a configured XeroClient instance from a decrypted connection
 */
export function createClient(connection: DecryptedXeroConnection): XeroClient {
  const client = new XeroClient({
    clientId: process.env.XERO_CLIENT_ID || "",
    clientSecret: process.env.XERO_CLIENT_SECRET || "",
    redirectUris: [process.env.XERO_REDIRECT_URI || ""],
    scopes: connection.scopes,
  });

  client.setTokenSet({
    access_token: connection.accessToken,
    refresh_token: connection.refreshToken,
    token_type: "Bearer",
    expires_in: Math.max(
      Math.floor(
        (new Date(connection.expiresAt).getTime() - Date.now()) / 1000
      ),
      0
    ),
  });

  return client;
}

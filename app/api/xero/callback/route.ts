import { after, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { createXeroConnection } from "@/lib/db/queries";
import { syncActiveConnectionChartOfAccounts } from "@/lib/xero/chart-of-accounts-sync";
import {
  createXeroClient,
  fetchXeroOrganisation,
  getXeroScopes,
  getXeroTenants,
} from "@/lib/xero/connection-manager";
import { encryptToken } from "@/lib/xero/encryption";

export async function GET(request: Request) {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.redirect(
        new URL("/login?error=unauthorized", request.url)
      );
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      console.error("Xero OAuth error:", error);
      return NextResponse.redirect(
        new URL(
          `/settings/integrations?error=${encodeURIComponent(error)}`,
          request.url
        )
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL("/settings/integrations?error=missing_parameters", request.url)
      );
    }

    // Verify state - Xero best practice: prevent CSRF and validate freshness
    try {
      const stateData = JSON.parse(
        Buffer.from(state, "base64").toString("utf-8")
      );

      // Verify user ID matches
      if (stateData.userId !== user.id) {
        console.error("State user ID mismatch:", {
          expected: user.id,
          received: stateData.userId,
        });
        return NextResponse.redirect(
          new URL("/settings/integrations?error=invalid_state", request.url)
        );
      }

      // Verify state hasn't expired (10 minute limit per Xero best practice)
      const stateAge = Date.now() - stateData.timestamp;
      const TEN_MINUTES = 10 * 60 * 1000;
      if (stateAge > TEN_MINUTES) {
        console.error("State expired:", {
          age: Math.floor(stateAge / 1000),
          limit: 600,
        });
        return NextResponse.redirect(
          new URL(
            "/settings/integrations?error=state_expired",
            request.url
          )
        );
      }

      // Verify nonce exists (CSRF protection)
      if (!stateData.nonce || typeof stateData.nonce !== "string") {
        console.error("Missing or invalid nonce in state");
        return NextResponse.redirect(
          new URL("/settings/integrations?error=invalid_state", request.url)
        );
      }
    } catch (parseError) {
      console.error("Failed to parse state:", parseError);
      return NextResponse.redirect(
        new URL("/settings/integrations?error=invalid_state", request.url)
      );
    }

    // Exchange code for tokens
    const xeroClient = createXeroClient(state);
    const tokenSet = await xeroClient.apiCallback(request.url);

    if (
      !tokenSet.access_token ||
      !tokenSet.refresh_token ||
      !tokenSet.expires_in
    ) {
      throw new Error("Invalid token set received from Xero");
    }

    // Get tenants (organizations)
    const tenants = await getXeroTenants(tokenSet.access_token);

    if (tenants.length === 0) {
      return NextResponse.redirect(
        new URL("/settings/integrations?error=no_organizations", request.url)
      );
    }

    // Extract expiry time and authentication_event_id from access token JWT
    // CRITICAL: Use the actual 'exp' claim from JWT, not calculated from expires_in
    // The JWT exp is the authoritative source of truth from Xero
    let expiresAt = new Date(Date.now() + tokenSet.expires_in * 1000); // Fallback
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
            `[OAuth Callback] Token expiry from JWT: ${expiresAt.toISOString()} (${payload.exp})`
          );
        } else {
          console.warn(
            "[OAuth Callback] JWT missing exp claim, using calculated expiry"
          );
        }
      }
    } catch (jwtError) {
      console.warn(
        "Could not extract data from access token JWT, using calculated expiry:",
        jwtError
      );
    }

    // Encrypt tokens once (same for all organizations)
    const encryptedAccessToken = encryptToken(tokenSet.access_token);
    const encryptedRefreshToken = encryptToken(tokenSet.refresh_token);

    // Fetch organisation details for each tenant (Xero best practice)
    // This provides important metadata like shortCode (for deep linking), baseCurrency, organisationType
    // See: https://developer.xero.com/documentation/best-practices/data-integrity/managing-tokens/#get-organisation
    const tenantDetailsPromises = tenants.map(async (tenant) => {
      try {
        // tokenSet.access_token is guaranteed to be defined by the check above
        const orgDetails = await fetchXeroOrganisation(
          tokenSet.access_token!,
          tenant.tenantId
        );
        console.log(
          `✅ [OAuth Callback] Fetched organisation details for ${tenant.tenantName} (${tenant.tenantId}):`,
          {
            organisationId: orgDetails.OrganisationID,
            shortCode: orgDetails.ShortCode,
            baseCurrency: orgDetails.BaseCurrency,
            organisationType: orgDetails.OrganisationType,
            isDemoCompany: orgDetails.IsDemoCompany,
          }
        );
        return {
          tenant,
          orgDetails,
        };
      } catch (error) {
        // Log detailed error but continue with graceful degradation
        console.error(
          `⚠️ [OAuth Callback] Failed to fetch organisation details for ${tenant.tenantName} (${tenant.tenantId}):`,
          {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            tenantId: tenant.tenantId,
            timestamp: new Date().toISOString(),
          }
        );
        console.warn(
          `[OAuth Callback] Continuing with connection creation without organisation metadata for ${tenant.tenantId}`
        );
        // Return tenant without org details if fetch fails (graceful degradation)
        // Connection will still be created but without the metadata fields
        return {
          tenant,
          orgDetails: null,
        };
      }
    });

    const tenantDetailsResults = await Promise.all(tenantDetailsPromises);

    // Fetch connection metadata from Xero /connections endpoint (best practice)
    // This provides the Xero connection ID and creation/update timestamps
    let connectionsMetadata: Map<string, any> = new Map();
    try {
      const connections = await fetch(
        `https://api.xero.com/connections${authenticationEventId ? `?authEventId=${authenticationEventId}` : ""}`,
        {
          headers: {
            Authorization: `Bearer ${tokenSet.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (connections.ok) {
        const connectionsData = await connections.json();
        // Map by tenantId for easy lookup
        for (const conn of connectionsData) {
          connectionsMetadata.set(conn.tenantId, conn);
        }
        console.log(
          `✅ [OAuth Callback] Fetched connection metadata for ${connectionsData.length} tenant(s)`
        );
      } else {
        console.warn(
          `⚠️ [OAuth Callback] Failed to fetch connection metadata: ${connections.status}`
        );
      }
    } catch (metadataError) {
      console.warn(
        "[OAuth Callback] Could not fetch connection metadata:",
        metadataError
      );
      // Continue without metadata - it's not critical for connection creation
    }

    // Create connections with organisation metadata and connection tracking
    await Promise.all(
      tenantDetailsResults.map(({ tenant, orgDetails }) => {
        const connMetadata = connectionsMetadata.get(tenant.tenantId);
        return createXeroConnection({
          userId: user.id,
          tenantId: tenant.tenantId,
          tenantName: tenant.tenantName,
          tenantType: tenant.tenantType,
          // Xero connection metadata (for tracking and cleanup)
          xeroConnectionId: connMetadata?.id, // Xero's connection ID from /connections endpoint
          xeroCreatedDateUtc: connMetadata?.createdDateUtc
            ? new Date(connMetadata.createdDateUtc)
            : undefined,
          xeroUpdatedDateUtc: connMetadata?.updatedDateUtc
            ? new Date(connMetadata.updatedDateUtc)
            : undefined,
          // Organisation metadata (Xero best practice fields)
          organisationId: orgDetails?.OrganisationID,
          shortCode: orgDetails?.ShortCode,
          baseCurrency: orgDetails?.BaseCurrency,
          organisationType: orgDetails?.OrganisationType,
          isDemoCompany: orgDetails?.IsDemoCompany ?? false,
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          expiresAt,
          scopes: getXeroScopes(),
          authenticationEventId,
        });
      })
    );

    // Auto-sync chart of accounts for the active connection (non-blocking)
    after(async () => {
      try {
        const result = await syncActiveConnectionChartOfAccounts(user.id);
        if (result.success) {
          console.log(
            `✅ Auto-synced chart of accounts: ${result.accountCount} accounts`
          );
        } else {
          console.error("Failed to auto-sync chart of accounts:", result.error);
        }
      } catch (error) {
        console.error("Error in auto-sync chart of accounts:", error);
      }
    });

    // Redirect to settings page with success
    // Note: createXeroConnection already sets the connection as active
    return NextResponse.redirect(
      new URL("/settings/integrations?xero=connected", request.url)
    );
  } catch (error) {
    console.error("Xero callback error:", error);
    return NextResponse.redirect(
      new URL(
        `/settings/integrations?error=${encodeURIComponent("connection_failed")}`,
        request.url
      )
    );
  }
}

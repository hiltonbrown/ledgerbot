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

    // Verify state
    try {
      const stateData = JSON.parse(
        Buffer.from(state, "base64").toString("utf-8")
      );
      if (stateData.userId !== user.id) {
        return NextResponse.redirect(
          new URL("/settings/integrations?error=invalid_state", request.url)
        );
      }
    } catch {
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
          `[OAuth Callback] Fetched organisation details for ${tenant.tenantName} (${tenant.tenantId}):`,
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
        console.error(
          `Failed to fetch organisation details for ${tenant.tenantId}:`,
          error
        );
        // Return tenant without org details if fetch fails (graceful degradation)
        return {
          tenant,
          orgDetails: null,
        };
      }
    });

    const tenantDetailsResults = await Promise.all(tenantDetailsPromises);

    // Create connections with organisation metadata
    await Promise.all(
      tenantDetailsResults.map(({ tenant, orgDetails }) =>
        createXeroConnection({
          userId: user.id,
          tenantId: tenant.tenantId,
          tenantName: tenant.tenantName,
          tenantType: tenant.tenantType,
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
        })
      )
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

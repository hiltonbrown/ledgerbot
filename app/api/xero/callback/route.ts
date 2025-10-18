import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { createXeroConnection } from "@/lib/db/queries";
import {
  createXeroClient,
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

    // Get tenants
    const tenants = await getXeroTenants(tokenSet.access_token);

    if (tenants.length === 0) {
      return NextResponse.redirect(
        new URL("/settings/integrations?error=no_organizations", request.url)
      );
    }

    // Use the first tenant (or could allow user to select)
    const tenant = tenants[0];

    // Calculate expiry time
    const expiresAt = new Date(Date.now() + tokenSet.expires_in * 1000);

    // Encrypt and store tokens
    await createXeroConnection({
      userId: user.id,
      tenantId: tenant.tenantId,
      tenantName: tenant.tenantName,
      accessToken: encryptToken(tokenSet.access_token),
      refreshToken: encryptToken(tokenSet.refresh_token),
      expiresAt,
      scopes: getXeroScopes(),
    });

    // Redirect to settings page with success
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

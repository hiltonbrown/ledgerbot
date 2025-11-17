import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { createMyobConnection } from "@/lib/db/queries";
import {
  exchangeCodeForTokens,
  getMyobScopes,
} from "@/lib/myob/connection-manager";
import { encryptToken } from "@/lib/myob/encryption";

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
    const businessId = searchParams.get("businessId"); // MYOB's cf_uri parameter
    const error = searchParams.get("error");

    if (error) {
      console.error("MYOB OAuth error:", error);
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

    // CRITICAL: businessId is required for MYOB API calls (cf_uri)
    // This is only returned when using prompt=consent in the OAuth flow
    if (!businessId) {
      console.error(
        "MYOB OAuth callback missing businessId - ensure prompt=consent is set in auth URL"
      );
      return NextResponse.redirect(
        new URL(
          "/settings/integrations?error=missing_business_id",
          request.url
        )
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
    console.log("Exchanging MYOB authorization code for tokens...");
    const tokenData = await exchangeCodeForTokens(code, state);

    if (!tokenData.access_token || !tokenData.refresh_token) {
      throw new Error("Invalid token set received from MYOB");
    }

    console.log("Successfully received tokens from MYOB");
    console.log("  Access token length:", tokenData.access_token.length);
    console.log("  Refresh token length:", tokenData.refresh_token.length);
    console.log("  Expires in:", tokenData.expires_in, "seconds");
    console.log("  Business ID:", businessId);

    // Calculate expiry time
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    // Encrypt tokens
    const encryptedAccessToken = encryptToken(tokenData.access_token);
    const encryptedRefreshToken = encryptToken(tokenData.refresh_token);

    // Create MYOB connection
    // Note: businessName will need to be fetched from MYOB API in a future enhancement
    // For now, we'll use the businessId as a placeholder
    await createMyobConnection({
      userId: user.id,
      businessId,
      businessName: undefined, // Will be populated when we fetch company file details
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      expiresAt,
      scopes: getMyobScopes(),
      // Optional: Company file credentials can be added later if needed
      // cfUsername: undefined,
      // cfPassword: undefined,
    });

    console.log(
      `Created MYOB connection for user ${user.id}, business ${businessId}`
    );

    // Redirect to settings page with success
    return NextResponse.redirect(
      new URL("/settings/integrations?myob=connected", request.url)
    );
  } catch (error) {
    console.error("MYOB callback error:", error);
    return NextResponse.redirect(
      new URL(
        `/settings/integrations?error=${encodeURIComponent("connection_failed")}`,
        request.url
      )
    );
  }
}

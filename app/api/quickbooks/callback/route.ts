import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { createQuickBooksConnection } from "@/lib/db/queries";
import {
  exchangeCodeForTokens,
  fetchQuickBooksCompanyInfo,
  getQuickBooksConfig,
  getQuickBooksScopes,
} from "@/lib/quickbooks/connection-manager";
import { encryptToken } from "@/lib/quickbooks/encryption";

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
    const realmId = searchParams.get("realmId");
    const error = searchParams.get("error");

    if (error) {
      console.error("QuickBooks OAuth error:", error);
      return NextResponse.redirect(
        new URL(
          `/settings/integrations?error=${encodeURIComponent(error)}`,
          request.url
        )
      );
    }

    if (!code || !state || !realmId) {
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
    const tokenSet = await exchangeCodeForTokens(code);

    if (
      !tokenSet.access_token ||
      !tokenSet.refresh_token ||
      !tokenSet.expires_in
    ) {
      throw new Error("Invalid token set received from QuickBooks");
    }

    // Calculate expiry time
    const expiresAt = new Date(Date.now() + tokenSet.expires_in * 1000);

    // Encrypt tokens
    const encryptedAccessToken = encryptToken(tokenSet.access_token);
    const encryptedRefreshToken = encryptToken(tokenSet.refresh_token);

    // Get QuickBooks environment from config
    const config = getQuickBooksConfig();

    // Fetch company info (QuickBooks best practice)
    let companyInfo;
    try {
      companyInfo = await fetchQuickBooksCompanyInfo(
        tokenSet.access_token,
        realmId,
        config.environment
      );
      console.log(
        `✅ [OAuth Callback] Fetched company info for ${companyInfo.CompanyName} (${realmId}):`,
        {
          companyName: companyInfo.CompanyName,
          legalName: companyInfo.LegalName,
          country: companyInfo.Country,
          currency:
            companyInfo.CompanyCurrency?.value ||
            companyInfo.CompanyCurrency?.name,
          fiscalYearStartMonth: companyInfo.FiscalYearStartMonth,
        }
      );
    } catch (error) {
      console.error(
        `⚠️ [OAuth Callback] Failed to fetch company info for ${realmId}:`,
        {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          realmId,
          timestamp: new Date().toISOString(),
        }
      );
      console.warn(
        `[OAuth Callback] Continuing with connection creation without company metadata for ${realmId}`
      );
    }

    // Create connection with company metadata
    await createQuickBooksConnection({
      userId: user.id,
      realmId,
      companyName: companyInfo?.CompanyName,
      companyId: realmId, // QuickBooks uses realmId as company ID
      legalName: companyInfo?.LegalName,
      baseCurrency:
        companyInfo?.CompanyCurrency?.value ||
        companyInfo?.CompanyCurrency?.name,
      country: companyInfo?.Country,
      fiscalYearStartMonth: companyInfo?.FiscalYearStartMonth,
      environment: config.environment,
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      expiresAt,
      scopes: getQuickBooksScopes(),
    });

    // Redirect to settings page with success
    return NextResponse.redirect(
      new URL("/settings/integrations?quickbooks=connected", request.url)
    );
  } catch (error) {
    console.error("QuickBooks callback error:", error);
    return NextResponse.redirect(
      new URL(
        `/settings/integrations?error=${encodeURIComponent("connection_failed")}`,
        request.url
      )
    );
  }
}

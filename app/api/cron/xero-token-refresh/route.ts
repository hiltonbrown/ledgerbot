import { NextResponse } from "next/server";
import { getAllActiveXeroConnections } from "@/lib/db/queries";
import { refreshXeroToken } from "@/lib/xero/connection-manager";

// Configure route for Vercel cron jobs
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes max duration

/**
 * Xero Proactive Token Refresh Cron Job
 *
 * Xero best practice: Refresh tokens BEFORE they expire to prevent service interruption
 *
 * This job runs every 15 minutes to:
 * 1. Find connections with tokens expiring in < 20 minutes
 * 2. Proactively refresh these tokens
 * 3. Track success/failure rates
 *
 * Why 20 minutes?
 * - Xero access tokens last 30 minutes
 * - Refreshing at 20 minutes leaves 10-minute buffer for:
 *   - Cron job delays
 *   - Network latency
 *   - Rate limiting
 * - Prevents tokens expiring during user operations
 *
 * Recommended cron schedule: */15 * * * * (every 15 minutes)
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  console.log("⏰ Scheduled Xero token refresh started");

  try {
    const now = new Date();
    const twentyMinutesFromNow = new Date(now.getTime() + 20 * 60 * 1000);

    // Get all active connections
    const connections = await getAllActiveXeroConnections();

    // Filter to connections with tokens expiring in < 20 minutes
    const connectionsToRefresh = connections.filter((conn) => {
      const expiresAt = new Date(conn.expiresAt);
      return expiresAt <= twentyMinutesFromNow;
    });

    console.log(
      `Found ${connectionsToRefresh.length} connections with tokens expiring in < 20 minutes (out of ${connections.length} total active connections)`
    );

    if (connectionsToRefresh.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No tokens need refreshing",
        total: 0,
        refreshed: 0,
        failed: 0,
      });
    }

    let refreshed = 0;
    let failed = 0;
    const failures: Array<{
      connectionId: string;
      tenantName: string | null;
      error: string;
      isPermanent: boolean;
    }> = [];

    // Refresh tokens for all expiring connections
    for (const connection of connectionsToRefresh) {
      const expiresAt = new Date(connection.expiresAt);
      const minutesUntilExpiry = Math.floor(
        (expiresAt.getTime() - now.getTime()) / (60 * 1000)
      );

      console.log(
        `Refreshing token for connection ${connection.id} (${connection.tenantName || connection.tenantId}), expires in ${minutesUntilExpiry} minutes`
      );

      try {
        const result = await refreshXeroToken(connection.id);

        if (result.success) {
          refreshed++;
          console.log(
            `✅ Successfully refreshed token for connection ${connection.id} (${connection.tenantName || connection.tenantId})`
          );
        } else {
          failed++;
          console.error(
            `❌ Failed to refresh token for connection ${connection.id}:`,
            result.error
          );

          failures.push({
            connectionId: connection.id,
            tenantName: connection.tenantName,
            error: result.error || "Unknown error",
            isPermanent: result.isPermanentFailure || false,
          });
        }
      } catch (error) {
        failed++;
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        console.error(
          `❌ Unexpected error refreshing token for connection ${connection.id}:`,
          errorMessage
        );

        failures.push({
          connectionId: connection.id,
          tenantName: connection.tenantName,
          error: errorMessage,
          isPermanent: false,
        });
      }
    }

    console.log(
      `✅ Xero token refresh completed: ${refreshed} refreshed, ${failed} failed out of ${connectionsToRefresh.length} total`
    );

    // Log permanent failures (require user re-authentication)
    const permanentFailures = failures.filter((f) => f.isPermanent);
    if (permanentFailures.length > 0) {
      console.warn(
        `⚠️ ${permanentFailures.length} connection(s) require user re-authentication:`,
        permanentFailures.map((f) => ({
          connectionId: f.connectionId,
          tenant: f.tenantName,
        }))
      );
    }

    return NextResponse.json({
      success: true,
      total: connectionsToRefresh.length,
      refreshed,
      failed,
      failures: failures.length > 0 ? failures : undefined,
      permanentFailures: permanentFailures.length,
    });
  } catch (error) {
    console.error("❌ Xero token refresh failed:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Xero token refresh failed",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

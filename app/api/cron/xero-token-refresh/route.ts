import { NextResponse } from "next/server";
import {
  deactivateXeroConnection,
  getExpiringXeroConnections,
} from "@/lib/db/queries";
import { refreshXeroTokenById } from "@/lib/xero/connection-manager";

// Configure route for Vercel cron jobs
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // 60 seconds max duration

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  console.log("⏰ Scheduled Xero token refresh started");

  try {
    // Get connections expiring within 7 days
    const expiringConnections = await getExpiringXeroConnections(7);

    console.log(
      `Found ${expiringConnections.length} Xero connections expiring within 7 days`
    );

    if (expiringConnections.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No expiring connections found",
        total: 0,
        refreshed: 0,
        failed: 0,
      });
    }

    let refreshed = 0;
    let failed = 0;
    const failures: Array<{ connectionId: string; error: string }> = [];

    // Refresh each expiring connection
    for (const connection of expiringConnections) {
      console.log(
        `Refreshing token for connection ${connection.id} (user: ${connection.userId}, tenant: ${connection.tenantName || connection.tenantId}, expires: ${connection.expiresAt.toISOString()})`
      );

      const result = await refreshXeroTokenById(connection.id);

      if (result.success) {
        refreshed++;
        console.log(
          `✅ Successfully refreshed token for connection ${connection.id}`
        );
      } else {
        failed++;
        const errorMsg = result.error || "Unknown error";
        console.error(
          `❌ Failed to refresh token for connection ${connection.id}: ${errorMsg}`
        );
        failures.push({
          connectionId: connection.id,
          error: errorMsg,
        });

        // Only deactivate on permanent failures (expired refresh token)
        // Temporary failures (network, server errors) should retry on next cron run
        const isPermanentFailure =
          errorMsg.includes("invalid_grant") ||
          errorMsg.includes("refresh_token") ||
          errorMsg.toLowerCase().includes("expired") ||
          errorMsg.includes("60 days");

        if (isPermanentFailure) {
          try {
            await deactivateXeroConnection(connection.id);
            console.log(
              `Deactivated connection ${connection.id} due to PERMANENT refresh failure (expired refresh token)`
            );
          } catch (deactivateError) {
            console.error(
              `Failed to deactivate connection ${connection.id}:`,
              deactivateError
            );
          }
        } else {
          console.warn(
            `⚠️ TEMPORARY failure for connection ${connection.id} - will retry on next cron run (connection remains active)`
          );
        }
      }
    }

    console.log(
      `✅ Scheduled Xero token refresh completed: ${refreshed} refreshed, ${failed} failed out of ${expiringConnections.length} total`
    );

    return NextResponse.json({
      success: true,
      total: expiringConnections.length,
      refreshed,
      failed,
      failures: failures.length > 0 ? failures : undefined,
    });
  } catch (error) {
    console.error("❌ Scheduled Xero token refresh failed:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Scheduled Xero token refresh failed",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

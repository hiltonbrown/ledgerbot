import { NextResponse } from "next/server";
import { db, deactivateXeroConnection } from "@/lib/db/queries";
import { xeroConnection } from "@/lib/db/schema";
import { and, eq, lt, isNull, or } from "drizzle-orm";
import { deleteXeroConnection } from "@/lib/xero/connection-manager";

// Configure route for Vercel cron jobs
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes max duration

/**
 * Xero Connection Cleanup Cron Job
 *
 * This job runs daily to clean up unused or expired Xero connections.
 * It's critical for certification to prevent billing for non-converting referrals.
 *
 * Cleanup criteria:
 * 1. Connections with no API calls in 60+ days (unused connections)
 * 2. Connections in error state for 30+ days (likely expired)
 * 3. Inactive connections that haven't been used
 *
 * Process:
 * 1. Find connections matching cleanup criteria
 * 2. Delete from Xero API (if xeroConnectionId exists)
 * 3. Deactivate in database
 * 4. Log results
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  console.log("⏰ Scheduled Xero connection cleanup started");

  try {
    const now = new Date();
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Find connections to clean up
    const connectionsToCleanup = await db
      .select()
      .from(xeroConnection)
      .where(
        or(
          // Never used (created 60+ days ago, never made an API call)
          and(
            isNull(xeroConnection.lastApiCallAt),
            lt(xeroConnection.createdAt, sixtyDaysAgo)
          ),
          // Unused for 60+ days
          and(
            lt(xeroConnection.lastApiCallAt, sixtyDaysAgo),
            eq(xeroConnection.isActive, true)
          ),
          // In error state for 30+ days
          and(
            eq(xeroConnection.connectionStatus, "error"),
            lt(xeroConnection.updatedAt, thirtyDaysAgo)
          )
        )
      );

    console.log(
      `Found ${connectionsToCleanup.length} Xero connections to clean up`
    );

    if (connectionsToCleanup.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No connections to clean up",
        total: 0,
        deleted: 0,
        failed: 0,
      });
    }

    let deleted = 0;
    let failed = 0;
    const failures: Array<{
      connectionId: string;
      tenantName: string | null;
      reason: string;
      error: string;
    }> = [];

    // Process each connection
    for (const connection of connectionsToCleanup) {
      const reason = getCleanupReason(connection, sixtyDaysAgo, thirtyDaysAgo);

      console.log(
        `Cleaning up connection ${connection.id} (${connection.tenantName || connection.tenantId}): ${reason}`
      );

      try {
        // Delete from Xero API if we have the xeroConnectionId
        if (connection.xeroConnectionId) {
          try {
            // Get a user connection to authenticate the delete request
            await deleteXeroConnection(
              connection.userId,
              connection.xeroConnectionId
            );
            console.log(
              `✅ Deleted from Xero API: ${connection.xeroConnectionId}`
            );
          } catch (xeroError) {
            console.error(
              `Failed to delete from Xero API (continuing with DB cleanup):`,
              xeroError
            );
            // Continue with database cleanup even if Xero API call fails
          }
        }

        // Deactivate in database
        await deactivateXeroConnection(connection.id);
        deleted++;

        console.log(
          `✅ Successfully cleaned up connection ${connection.id} (${connection.tenantName || connection.tenantId})`
        );
      } catch (error) {
        failed++;
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        console.error(
          `❌ Failed to clean up connection ${connection.id}:`,
          errorMessage
        );

        failures.push({
          connectionId: connection.id,
          tenantName: connection.tenantName,
          reason,
          error: errorMessage,
        });
      }
    }

    console.log(
      `✅ Xero connection cleanup completed: ${deleted} deleted, ${failed} failed out of ${connectionsToCleanup.length} total`
    );

    return NextResponse.json({
      success: true,
      total: connectionsToCleanup.length,
      deleted,
      failed,
      failures: failures.length > 0 ? failures : undefined,
    });
  } catch (error) {
    console.error("❌ Xero connection cleanup failed:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Xero connection cleanup failed",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * Determine the cleanup reason for logging
 */
function getCleanupReason(
  connection: any,
  sixtyDaysAgo: Date,
  thirtyDaysAgo: Date
): string {
  if (!connection.lastApiCallAt && connection.createdAt < sixtyDaysAgo) {
    return "Never used (60+ days old)";
  }

  if (connection.lastApiCallAt && connection.lastApiCallAt < sixtyDaysAgo) {
    const daysSinceLastUse = Math.floor(
      (Date.now() - new Date(connection.lastApiCallAt).getTime()) /
        (24 * 60 * 60 * 1000)
    );
    return `Unused for ${daysSinceLastUse} days`;
  }

  if (
    connection.connectionStatus === "error" &&
    connection.updatedAt < thirtyDaysAgo
  ) {
    return "Error state for 30+ days";
  }

  return "Unknown reason";
}

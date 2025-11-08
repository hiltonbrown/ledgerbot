import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/clerk-helpers";
import { syncChartOfAccounts } from "@/lib/xero/chart-of-accounts-sync";
import { getDecryptedConnection } from "@/lib/xero/connection-manager";

/**
 * POST /api/xero/chart-of-accounts/sync
 * Trigger manual sync of chart of accounts from Xero API
 */
export async function POST() {
  try {
    const user = await requireAuth();

    // Get active Xero connection
    const connection = await getDecryptedConnection(user.id);

    if (!connection) {
      return NextResponse.json(
        { error: "No active Xero connection found" },
        { status: 404 }
      );
    }

    // Trigger sync
    const result = await syncChartOfAccounts(connection.id);

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || "Failed to sync chart of accounts",
          correlationId: result.correlationId,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      accountCount: result.accountCount,
      connectionId: connection.id,
      organisationName: connection.tenantName,
    });
  } catch (error) {
    console.error("Error syncing chart of accounts:", error);
    return NextResponse.json(
      { error: "Failed to sync chart of accounts" },
      { status: 500 }
    );
  }
}

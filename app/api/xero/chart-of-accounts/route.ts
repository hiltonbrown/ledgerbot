import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/clerk-helpers";
import { getChartOfAccounts } from "@/lib/xero/chart-of-accounts-sync";
import { getDecryptedConnection } from "@/lib/xero/connection-manager";

/**
 * GET /api/xero/chart-of-accounts
 * Fetch chart of accounts for the active Xero connection
 */
export async function GET() {
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

    // Get chart of accounts from database
    const chartData = await getChartOfAccounts(connection.id);

    if (!chartData) {
      return NextResponse.json(
        {
          error: "Chart of accounts not synced yet",
          connectionId: connection.id,
          organisationName: connection.tenantName,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      accounts: chartData.accounts,
      syncedAt: chartData.syncedAt,
      accountCount: chartData.accountCount,
      connectionId: connection.id,
      organisationName: connection.tenantName,
    });
  } catch (error) {
    console.error("Error fetching chart of accounts:", error);
    return NextResponse.json(
      { error: "Failed to fetch chart of accounts" },
      { status: 500 }
    );
  }
}

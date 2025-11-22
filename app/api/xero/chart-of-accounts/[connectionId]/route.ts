import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/clerk-helpers";
import { db } from "@/lib/db/queries";
import { xeroConnection } from "@/lib/db/schema";
import { getChartOfAccounts } from "@/lib/xero/chart-of-accounts-sync";

/**
 * GET /api/xero/chart-of-accounts/[connectionId]
 * Fetch chart of accounts for a specific Xero connection
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ connectionId: string }> }
) {
  try {
    const user = await requireAuth();
    const { connectionId } = await params;

    // Verify the connection belongs to the current user
    const [connection] = await db
      .select()
      .from(xeroConnection)
      .where(eq(xeroConnection.id, connectionId));

    if (!connection) {
      return NextResponse.json(
        { error: "Connection not found" },
        { status: 404 }
      );
    }

    if (connection.userId !== user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get chart of accounts from database
    const chartData = await getChartOfAccounts(connectionId);

    if (!chartData) {
      return NextResponse.json(
        {
          error: "Chart of accounts not synced yet",
          connectionId,
          organisationName: connection.tenantName,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      accounts: chartData.accounts,
      syncedAt: chartData.syncedAt,
      accountCount: chartData.accountCount,
      connectionId,
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

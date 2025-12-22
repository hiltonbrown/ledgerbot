import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { getActiveXeroConnection } from "@/lib/db/queries";
import { startSyncJob } from "@/lib/xero/sync-manager";

export const runtime = "nodejs";

/**
 * POST /api/agents/ar/sync
 * Starts a background sync job for the active organisation
 */
export async function POST(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return new NextResponse("Not authenticated", { status: 401 });
    }

    const activeConnection = await getActiveXeroConnection(user.id);
    if (!activeConnection) {
      return NextResponse.json(
        { success: false, error: "No active Xero connection." },
        { status: 400 }
      );
    }

    // Start background job
    const job = await startSyncJob(user.id, activeConnection.tenantId);

    return NextResponse.json({
      success: true,
      jobId: job.id,
      message: "Sync job started in background",
    });
  } catch (error: any) {
    console.error("[AR Sync API] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to start sync" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { getActiveXeroConnection } from "@/lib/db/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/xero/status
 * Returns simple connection status for the authenticated user
 */
export async function GET() {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const connection = await getActiveXeroConnection(user.id);

    if (!connection) {
      return NextResponse.json({
        connected: false,
      });
    }

    return NextResponse.json({
      connected: true,
      organisationName: connection.tenantName,
      expiresAt: connection.expiresAt,
    });
  } catch (error) {
    console.error("Xero status endpoint error:", error);
    return NextResponse.json(
      {
        connected: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

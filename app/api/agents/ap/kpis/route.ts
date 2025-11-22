import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { getAPKPIs } from "@/lib/db/queries/ap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/agents/ap/kpis
 * Get AP KPIs for the current user
 */
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const kpis = await getAPKPIs(user.id);

    return NextResponse.json({
      success: true,
      kpis,
    });
  } catch (error) {
    console.error("[AP KPIs API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get AP KPIs",
      },
      { status: 500 }
    );
  }
}

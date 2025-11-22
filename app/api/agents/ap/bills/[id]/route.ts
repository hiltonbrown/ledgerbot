import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { getBillWithDetails } from "@/lib/db/queries/ap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/agents/ap/bills/[id]
 * Get full bill details including payments, risk assessment, and bank changes
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;

    const billDetails = await getBillWithDetails(id, user.id);

    if (!billDetails) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      bill: billDetails,
    });
  } catch (error) {
    console.error("[AP Bill Details API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get bill details",
      },
      { status: 500 }
    );
  }
}

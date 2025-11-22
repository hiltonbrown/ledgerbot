import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import {
  getContactsWithStats,
  getUnverifiedBankChanges,
} from "@/lib/db/queries/ap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/agents/ap/creditors
 * Get creditor list with statistics for the current user
 */
export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") || "all";

    // Get all creditors with stats
    let creditors = await getContactsWithStats(user.id);

    // Get unverified bank changes
    const bankChanges = await getUnverifiedBankChanges(user.id);
    const contactsWithBankChanges = new Set(
      bankChanges.map((bc) => bc.contactId)
    );

    // Apply filters
    switch (filter) {
      case "high-risk":
        creditors = creditors.filter(
          (c) => c.riskLevel === "high" || c.riskLevel === "critical"
        );
        break;
      case "bank-changes":
        creditors = creditors.filter((c) => contactsWithBankChanges.has(c.id));
        break;
      case "overdue":
        creditors = creditors.filter((c) => c.totalOverdue > 0);
        break;
      default:
        // No filter, return all
        break;
    }

    // Annotate with bank change flags
    const creditorsWithFlags = creditors.map((creditor) => ({
      ...creditor,
      hasBankChange: contactsWithBankChanges.has(creditor.id),
    }));

    return NextResponse.json({
      success: true,
      creditors: creditorsWithFlags,
      filter,
    });
  } catch (error) {
    console.error("[AP Creditors API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get creditors",
      },
      { status: 500 }
    );
  }
}

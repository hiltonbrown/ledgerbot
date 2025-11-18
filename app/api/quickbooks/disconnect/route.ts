import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { getActiveQuickBooksConnection } from "@/lib/db/queries";
import { revokeQuickBooksToken } from "@/lib/quickbooks/connection-manager";

export async function POST() {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const connection = await getActiveQuickBooksConnection(user.id);

    if (!connection) {
      return NextResponse.json(
        { error: "No active QuickBooks connection found" },
        { status: 404 }
      );
    }

    // Revoke the token and deactivate the connection
    await revokeQuickBooksToken(connection.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("QuickBooks disconnect error:", error);
    return NextResponse.json(
      { error: "Failed to disconnect QuickBooks" },
      { status: 500 }
    );
  }
}

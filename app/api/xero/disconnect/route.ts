import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { getActiveXeroConnection } from "@/lib/db/queries";
import { revokeXeroToken } from "@/lib/xero/connection-manager";

export async function POST() {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const connection = await getActiveXeroConnection(user.id);

    if (!connection) {
      return NextResponse.json(
        { error: "No active Xero connection found" },
        { status: 404 }
      );
    }

    // Revoke the refresh token with Xero before deactivating
    try {
      await revokeXeroToken(connection.id);
      console.log(`Successfully revoked Xero token for user ${user.id}`);
    } catch (revokeError) {
      console.error(
        `Failed to revoke Xero token for user ${user.id}:`,
        revokeError
      );
      // Continue with deactivation even if revocation fails
    }

    return NextResponse.json({
      success: true,
      message: "Xero connection disconnected successfully",
    });
  } catch (error) {
    console.error("Xero disconnect error:", error);
    return NextResponse.json(
      { error: "Failed to disconnect Xero" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import {
  deleteXeroConnection as deleteXeroConnectionRecord,
  getActiveXeroConnection,
  getXeroConnectionsByUserId,
} from "@/lib/db/queries";
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

    try {
      const userConnections = await getXeroConnectionsByUserId(user.id);

      for (const userConnection of userConnections) {
        try {
          await revokeXeroToken(userConnection.id);
          console.log(
            `Successfully revoked Xero token for connection ${userConnection.id} (user ${user.id})`
          );
        } catch (revokeError) {
          console.error(
            `Failed to revoke Xero token for connection ${userConnection.id} (user ${user.id}):`,
            revokeError
          );
          // Continue with revocation attempts for other connections even if one fails
        }

        await deleteXeroConnectionRecord(userConnection.id);
      }

      console.log(
        `Removed ${userConnections.length} Xero connection record(s) for user ${user.id}`
      );
    } catch (dbError) {
      console.error(
        `Failed to remove Xero authentication record for user ${user.id}:`,
        dbError
      );
      return NextResponse.json(
        { error: "Failed to remove Xero authentication record" },
        { status: 500 }
      );
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

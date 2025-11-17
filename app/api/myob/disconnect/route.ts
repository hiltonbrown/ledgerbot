import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import {
  deleteMyobConnection as deleteMyobConnectionRecord,
  getActiveMyobConnection,
  getMyobConnectionsByUserId,
} from "@/lib/db/queries";
import { revokeMyobToken } from "@/lib/myob/connection-manager";

export async function POST() {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const connection = await getActiveMyobConnection(user.id);

    if (!connection) {
      return NextResponse.json(
        { error: "No active MYOB connection found" },
        { status: 404 }
      );
    }

    try {
      const userConnections = await getMyobConnectionsByUserId(user.id);

      for (const userConnection of userConnections) {
        try {
          await revokeMyobToken(userConnection.id);
          console.log(
            `Successfully revoked MYOB token for connection ${userConnection.id} (user ${user.id})`
          );
        } catch (revokeError) {
          console.error(
            `Failed to revoke MYOB token for connection ${userConnection.id} (user ${user.id}):`,
            revokeError
          );
          // Continue with revocation attempts for other connections even if one fails
        }

        await deleteMyobConnectionRecord(userConnection.id);
      }

      console.log(
        `Removed ${userConnections.length} MYOB connection record(s) for user ${user.id}`
      );
    } catch (dbError) {
      console.error(
        `Failed to remove MYOB authentication record for user ${user.id}:`,
        dbError
      );
      return NextResponse.json(
        { error: "Failed to remove MYOB authentication record" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "MYOB connection disconnected successfully",
    });
  } catch (error) {
    console.error("MYOB disconnect error:", error);
    return NextResponse.json(
      { error: "Failed to disconnect MYOB" },
      { status: 500 }
    );
  }
}

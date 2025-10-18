import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { getDecryptedConnection, syncXeroConnections } from "@/lib/xero/connection-manager";

export async function POST() {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const connection = await getDecryptedConnection(user.id);

    if (!connection) {
      return NextResponse.json(
        { error: "No active Xero connection" },
        { status: 404 }
      );
    }

    await syncXeroConnections(user.id, connection.accessToken);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to sync Xero connections", error);
    return NextResponse.json(
      { error: "Failed to sync connections" },
      { status: 500 }
    );
  }
}

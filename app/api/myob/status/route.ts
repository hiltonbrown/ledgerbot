import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { getActiveMyobConnection } from "@/lib/db/queries";

export async function GET() {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const connection = await getActiveMyobConnection(user.id);

    if (!connection) {
      return NextResponse.json({
        connected: false,
        connection: null,
      });
    }

    // Return connection info without sensitive data
    return NextResponse.json({
      connected: true,
      connection: {
        id: connection.id,
        businessId: connection.businessId,
        businessName: connection.businessName,
        isActive: connection.isActive,
        connectionStatus: connection.connectionStatus,
        expiresAt: connection.expiresAt,
        lastApiCall: connection.lastApiCall,
        lastError: connection.lastError,
        createdAt: connection.createdAt,
        updatedAt: connection.updatedAt,
      },
    });
  } catch (error) {
    console.error("MYOB status check error:", error);
    return NextResponse.json(
      { error: "Failed to check MYOB connection status" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { fetchXeroConnections } from "@/lib/xero/connection-manager";
import {
  getAllXeroConnectionsForUser,
  syncXeroConnectionMetadata,
} from "@/lib/db/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/xero/connections
 * Fetches all Xero tenant connections for the authenticated user
 * Supports optional authEventId filter to get connections from specific auth event
 */
export async function GET(request: Request) {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get optional authEventId filter from query params
    const { searchParams } = new URL(request.url);
    const authEventId = searchParams.get("authEventId") || undefined;

    try {
      // Fetch fresh connection data from Xero API
      const xeroConnections = await fetchXeroConnections(user.id, authEventId);

      // Sync the metadata with our database
      for (const xeroConn of xeroConnections) {
        await syncXeroConnectionMetadata(user.id, xeroConn);
      }

      // Get all connections from our database with updated metadata
      const dbConnections = await getAllXeroConnectionsForUser(user.id);

      // Map to safe response format (exclude sensitive tokens)
      const connections = dbConnections.map((conn) => ({
        id: conn.id,
        xeroConnectionId: conn.xeroConnectionId,
        tenantId: conn.tenantId,
        tenantName: conn.tenantName,
        tenantType: conn.tenantType,
        authenticationEventId: conn.authenticationEventId,
        connectionStatus: conn.connectionStatus,
        lastError: conn.lastError,
        lastApiCallAt: conn.lastApiCallAt,
        xeroCreatedDateUtc: conn.xeroCreatedDateUtc,
        xeroUpdatedDateUtc: conn.xeroUpdatedDateUtc,
        isActive: conn.isActive,
        expiresAt: conn.expiresAt,
        createdAt: conn.createdAt,
        updatedAt: conn.updatedAt,
      }));

      return NextResponse.json({
        success: true,
        connections,
      });
    } catch (error) {
      console.error("Failed to fetch Xero connections:", error);

      // Return database connections even if Xero API call fails
      const dbConnections = await getAllXeroConnectionsForUser(user.id);

      const connections = dbConnections.map((conn) => ({
        id: conn.id,
        xeroConnectionId: conn.xeroConnectionId,
        tenantId: conn.tenantId,
        tenantName: conn.tenantName,
        tenantType: conn.tenantType,
        authenticationEventId: conn.authenticationEventId,
        connectionStatus: "error" as const,
        lastError:
          error instanceof Error
            ? error.message
            : "Failed to fetch from Xero API",
        lastApiCallAt: conn.lastApiCallAt,
        xeroCreatedDateUtc: conn.xeroCreatedDateUtc,
        xeroUpdatedDateUtc: conn.xeroUpdatedDateUtc,
        isActive: conn.isActive,
        expiresAt: conn.expiresAt,
        createdAt: conn.createdAt,
        updatedAt: conn.updatedAt,
      }));

      return NextResponse.json({
        success: false,
        connections,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch connections",
      });
    }
  } catch (error) {
    console.error("Xero connections endpoint error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { deleteXeroConnection } from "@/lib/xero/connection-manager";
import { getXeroConnectionById, deactivateXeroConnection } from "@/lib/db/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DELETE /api/xero/connections/[id]
 * Deletes a specific Xero tenant connection
 * This calls the Xero API DELETE /connections endpoint and deactivates in database
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: connectionId } = await params;

    // Get connection and verify ownership
    const connection = await getXeroConnectionById(connectionId);

    if (!connection) {
      return NextResponse.json(
        { error: "Connection not found" },
        { status: 404 }
      );
    }

    if (connection.userId !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized - connection belongs to another user" },
        { status: 403 }
      );
    }

    // Check if we have xeroConnectionId to delete from Xero API
    if (connection.xeroConnectionId) {
      try {
        // Delete from Xero API
        await deleteXeroConnection(user.id, connection.xeroConnectionId);
        console.log(
          `Successfully deleted Xero connection ${connection.xeroConnectionId} from Xero API`
        );
      } catch (error) {
        console.error(
          "Failed to delete connection from Xero API:",
          error
        );
        // Continue with database deletion even if Xero API call fails
      }
    }

    // Deactivate in our database
    await deactivateXeroConnection(connectionId);

    console.log(
      `Successfully deactivated connection ${connectionId} for user ${user.id}`
    );

    return NextResponse.json({
      success: true,
      message: "Connection disconnected successfully",
    });
  } catch (error) {
    console.error("Failed to delete Xero connection:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete connection",
      },
      { status: 500 }
    );
  }
}

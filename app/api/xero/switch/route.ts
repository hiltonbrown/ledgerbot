import { after, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { activateXeroConnection } from "@/lib/db/queries";
import { syncChartOfAccounts } from "@/lib/xero/chart-of-accounts-sync";

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();

    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { connectionId } = await request.json();

    if (!connectionId) {
      return NextResponse.json(
        { error: "Connection ID is required" },
        { status: 400 }
      );
    }

    // Activate selected connection and validate user ownership (deactivates others automatically)
    await activateXeroConnection(connectionId, user.id);

    // Auto-sync chart of accounts for the newly activated connection (non-blocking)
    after(async () => {
      try {
        const result = await syncChartOfAccounts(connectionId);
        if (result.success) {
          console.log(
            `✅ Auto-synced chart of accounts after org switch: ${result.accountCount} accounts`
          );
        } else {
          console.error(
            "Failed to auto-sync chart of accounts after org switch:",
            result.error
          );
        }
      } catch (error) {
        console.error(
          "Error in auto-sync chart of accounts after org switch:",
          error
        );
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Xero switch error:", error);
    return NextResponse.json(
      { error: "Failed to switch organization" },
      { status: 500 }
    );
  }
}

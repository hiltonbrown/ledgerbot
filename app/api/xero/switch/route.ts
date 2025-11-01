import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { activateXeroConnection } from "@/lib/db/queries";

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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Xero switch error:", error);
    return NextResponse.json(
      { error: "Failed to switch organization" },
      { status: 500 }
    );
  }
}

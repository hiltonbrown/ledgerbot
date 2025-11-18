import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { getQuickBooksAuthUrl } from "@/lib/quickbooks/connection-manager";

export async function GET() {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Create state with user ID for verification in callback
    const state = Buffer.from(
      JSON.stringify({
        userId: user.id,
        timestamp: Date.now(),
      })
    ).toString("base64");

    const authUrl = await getQuickBooksAuthUrl(state);

    return NextResponse.json({ url: authUrl });
  } catch (error) {
    console.error("QuickBooks auth initialization failed:", error);
    return NextResponse.json(
      { error: "Failed to initialize QuickBooks authentication" },
      { status: 500 }
    );
  }
}

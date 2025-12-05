import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/clerk-helpers";
import { db } from "@/lib/db/queries";
import { userSettings } from "@/lib/db/schema";

export async function GET() {
  try {
    const user = await requireAuth();

    const [settings] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, user.id));

    return NextResponse.json({
      agentSettings: settings?.agentSettings || {},
    });
  } catch (error) {
    console.error("Error fetching agent settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch agent settings" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const { agentSettings } = body;

    // Check if settings already exist
    const [existingSettings] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, user.id));

    if (existingSettings) {
      // Update existing settings
      await db
        .update(userSettings)
        .set({
          agentSettings,
          updatedAt: new Date(),
        })
        .where(eq(userSettings.userId, user.id));
    } else {
      // Insert new settings
      await db.insert(userSettings).values({
        userId: user.id,
        agentSettings,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving agent settings:", error);
    return NextResponse.json(
      { error: "Failed to save agent settings" },
      { status: 500 }
    );
  }
}

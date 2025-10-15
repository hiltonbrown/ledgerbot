import { NextResponse } from "next/server";
import { db } from "@/lib/db/queries";
import { userSettings } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/clerk-helpers";
import { eq } from "drizzle-orm";

import { getUserSettings } from "./data";

export async function GET() {
  const settings = await getUserSettings();
  return NextResponse.json(settings);
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const {
      firstName,
      lastName,
      country,
      state,
      isLocked,
      systemPrompt,
      codePrompt,
      sheetPrompt,
      suggestions,
    } = body;

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
          firstName,
          lastName,
          country,
          state,
          isLocked,
          systemPrompt,
          codePrompt,
          sheetPrompt,
          suggestions,
          updatedAt: new Date(),
        })
        .where(eq(userSettings.userId, user.id));
    } else {
      // Insert new settings
      await db.insert(userSettings).values({
        userId: user.id,
        firstName,
        lastName,
        country,
        state,
        isLocked,
        systemPrompt,
        codePrompt,
        sheetPrompt,
        suggestions,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving user settings:", error);
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    );
  }
}

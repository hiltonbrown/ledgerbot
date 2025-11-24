import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/clerk-helpers";
import { db } from "@/lib/db/queries";
import { userSettings } from "@/lib/db/schema";

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
      // firstName and lastName are now managed by Clerk, not stored in userSettings
      country,
      state,
      timezone,
      isLocked,
      defaultModel,
      defaultReasoning,
      suggestions,
      // Template variables
      companyName,
      industryContext,
      chartOfAccounts,
      toneAndGrammar,
      customVariables,
      // Custom instructions
      customSystemInstructions,
      customCodeInstructions,
      customSheetInstructions,
    } = body;

    // Check if settings already exist
    const [existingSettings] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, user.id));

    if (existingSettings) {
      // Update existing settings (excluding firstName/lastName)
      await db
        .update(userSettings)
        .set({
          country,
          state,
          timezone,
          isLocked,
          defaultModel,
          defaultReasoning,
          suggestions,
          // Template variables
          companyName,
          industryContext,
          chartOfAccounts,
          toneAndGrammar,
          customVariables,
          // Custom instructions
          customSystemInstructions,
          customCodeInstructions,
          customSheetInstructions,
          updatedAt: new Date(),
        })
        .where(eq(userSettings.userId, user.id));
    } else {
      // Insert new settings (excluding firstName/lastName)
      await db.insert(userSettings).values({
        userId: user.id,
        country,
        state,
        timezone,
        isLocked,
        defaultModel,
        defaultReasoning,
        suggestions,
        // Template variables
        companyName,
        industryContext,
        chartOfAccounts,
        toneAndGrammar,
        customVariables,
        // Custom instructions
        customSystemInstructions,
        customCodeInstructions,
        customSheetInstructions,
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

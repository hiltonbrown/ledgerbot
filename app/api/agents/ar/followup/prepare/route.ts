import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserSettings } from "@/app/(settings)/api/user/data";
import { getCustomerFollowUpData } from "@/lib/actions/ar";
import { db, getActiveXeroConnection, saveArFollowUpContext } from "@/lib/db/queries";
import { arContact } from "@/lib/db/schema/ar";
import {
  type FollowUpTone,
  generateFollowUpContext,
  generateSuggestedActions,
} from "@/lib/logic/ar-chat";

const requestSchema = z.object({
  contactId: z.string().uuid(),
  followUpType: z.enum(["polite", "firm", "final"]).optional(),
});

export async function POST(request: NextRequest) {
  try {
    console.log("[AR Follow-up Prepare] Starting request");
    const { userId } = await auth();
    if (!userId) {
      console.error("[AR Follow-up Prepare] Unauthorized - no userId");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.log("[AR Follow-up Prepare] User authenticated:", userId);

    const body = await request.json();
    console.log("[AR Follow-up Prepare] Request body:", body);

    const validation = requestSchema.safeParse(body);

    if (!validation.success) {
      console.error(
        "[AR Follow-up Prepare] Validation failed:",
        validation.error.issues
      );
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { contactId, followUpType } = validation.data;
    console.log("[AR Follow-up Prepare] Validated data:", {
      contactId,
      followUpType,
    });

    // Verify contact ownership
    const contact = await db.query.arContact.findFirst({
      where: and(eq(arContact.id, contactId), eq(arContact.userId, userId)),
    });

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // Get active Xero connection for tenantId
    const xeroConnection = await getActiveXeroConnection(userId);
    if (!xeroConnection) {
      return NextResponse.json({ error: "Xero connection not found" }, { status: 404 });
    }

    // Get comprehensive AR data
    const arData = await getCustomerFollowUpData(contactId, userId, xeroConnection.tenantId);

    // Get user settings for sender information
    console.log("[AR Follow-up Prepare] Fetching user settings");
    const userSettings = await getUserSettings();
    console.log("[AR Follow-up Prepare] User settings fetched");

    // Generate context
    console.log("[AR Follow-up Prepare] Generating context");
    const contextData = generateFollowUpContext({
      customer: {
        id: contact.id,
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
      },
      sender: {
        name: userSettings.name,
        companyName: userSettings.personalisation.companyName,
        email: userSettings.email,
      },
      totalOutstanding: arData.totalOutstanding,
      riskScore: arData.riskScore,
      invoices: arData.invoices,
      followUpType: followUpType as FollowUpTone | undefined,
    });

    console.log("[AR Follow-up Prepare] Context generated, saving to cache");

    // Cache context for 24 hours
    const contextId = await saveArFollowUpContext({
      userId,
      contactId,
      contextData,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    console.log("[AR Follow-up Prepare] Context cached with ID:", contextId);

    // Generate preview and suggestions
    const preview = {
      customerName: contact.name,
      totalOutstanding: arData.totalOutstanding,
      riskScore: arData.riskScore,
      invoiceCount: arData.invoices.length,
      oldestOverdueDays:
        arData.invoices.length > 0
          ? Math.max(...arData.invoices.map((inv) => inv.daysOverdue))
          : 0,
    };

    const suggestedActions = generateSuggestedActions(
      {
        id: contact.id,
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
      },
      arData.riskScore
    );

    console.log("[AR Follow-up Prepare] Returning response");
    return NextResponse.json({
      contextId,
      preview,
      suggestedActions,
    });
  } catch (error) {
    console.error("[AR Follow-up Prepare] Error occurred:", error);
    console.error(
      "[AR Follow-up Prepare] Error stack:",
      error instanceof Error ? error.stack : "No stack"
    );
    return NextResponse.json(
      {
        error: "Failed to prepare follow-up context",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

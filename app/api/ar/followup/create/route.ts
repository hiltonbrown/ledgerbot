import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import {
  getArFollowUpContext,
  saveChatIfNotExists,
  saveMessages,
} from "@/lib/db/queries";
import { generateFollowUpRequest } from "@/lib/logic/ar-chat";
import { generateUUID } from "@/lib/utils";

const requestSchema = z.object({
  contextId: z.string().uuid(),
  actionType: z.enum(["email", "call", "sms"]),
  customPrompt: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    console.log("[AR Follow-up Create] Starting request");
    const user = await getAuthUser();
    if (!user) {
      console.error("[AR Follow-up Create] Unauthorized - no user");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.log(
      "[AR Follow-up Create] User authenticated:",
      user.id,
      user.clerkId
    );

    const body = await request.json();
    console.log("[AR Follow-up Create] Request body:", body);

    const validation = requestSchema.safeParse(body);

    if (!validation.success) {
      console.error(
        "[AR Follow-up Create] Validation failed:",
        validation.error.issues
      );
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { contextId, actionType, customPrompt } = validation.data;
    console.log("[AR Follow-up Create] Validated data:", {
      contextId,
      actionType,
      customPrompt,
    });

    // Get cached context
    console.log("[AR Follow-up Create] Fetching cached context");
    const context = await getArFollowUpContext(contextId, user.clerkId);

    if (!context) {
      console.error("[AR Follow-up Create] Context not found or expired");
      return NextResponse.json(
        { error: "Context not found or expired" },
        { status: 404 }
      );
    }
    console.log("[AR Follow-up Create] Context found:", context.id);

    // Generate chat ID
    const chatId = generateUUID();
    console.log("[AR Follow-up Create] Generated chat ID:", chatId);

    // Create the chat
    console.log("[AR Follow-up Create] Creating chat with user.id:", user.id);
    await saveChatIfNotExists({
      id: chatId,
      userId: user.id,
      title: `Follow-up: ${context.contextData.metadata.customerName}`,
      visibility: "private",
    });
    console.log("[AR Follow-up Create] Chat created");

    // Save context as a system message
    console.log("[AR Follow-up Create] Saving system message");
    await saveMessages({
      messages: [
        {
          chatId,
          id: generateUUID(),
          role: "system",
          createdAt: new Date(),
          parts: [{ type: "text", text: context.contextData.prompt }],
          attachments: [],
          confidence: null,
          citations: null,
          needsReview: null,
        },
      ],
    });
    console.log("[AR Follow-up Create] System message saved");

    // Generate the initial user message based on action type
    let userMessage = customPrompt;
    console.log(
      "[AR Follow-up Create] Generating user message for action:",
      actionType
    );
    if (!userMessage) {
      const { customerName, totalOutstanding } = context.contextData.metadata;

      switch (actionType) {
        case "email":
          userMessage = generateFollowUpRequest({
            customer: { name: customerName, email: null, phone: null },
            totalOutstanding,
          });
          break;
        case "sms":
          userMessage = `Draft a brief SMS reminder for ${customerName} about their outstanding balance of $${totalOutstanding.toFixed(2)}.`;
          break;
        case "call":
          userMessage = `Create a call script for following up with ${customerName} about their outstanding balance of $${totalOutstanding.toFixed(2)}.`;
          break;
        default:
          userMessage = generateFollowUpRequest({
            customer: { name: customerName, email: null, phone: null },
            totalOutstanding,
          });
      }
    }

    console.log(
      "[AR Follow-up Create] Returning response with chatId:",
      chatId
    );

    // Encode the message for URL
    const encodedMessage = encodeURIComponent(userMessage);

    return NextResponse.json({
      chatId,
      redirectUrl: `/chat/${chatId}?query=${encodedMessage}`,
    });
  } catch (error) {
    console.error("[AR Follow-up Create] Error occurred:", error);
    console.error(
      "[AR Follow-up Create] Error stack:",
      error instanceof Error ? error.stack : "No stack"
    );
    return NextResponse.json(
      {
        error: "Failed to create follow-up chat",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

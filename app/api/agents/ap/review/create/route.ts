import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import {
  getApReviewContext,
  saveChatIfNotExists,
  saveMessages,
} from "@/lib/db/queries";
import { generateUUID } from "@/lib/utils";

const requestSchema = z.object({
  contextId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = requestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { contextId } = validation.data;

    // Get cached context
    const context = await getApReviewContext(contextId, user.id);

    if (!context) {
      return NextResponse.json(
        { error: "Context not found or expired" },
        { status: 404 }
      );
    }

    const chatId = generateUUID();

    // Create the chat
    await saveChatIfNotExists({
      id: chatId,
      userId: user.id,
      title: `Review: ${context.contextData.metadata.creditorName}`,
      visibility: "private",
    });

    // Save system message (Context)
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

    const initialMessage = `I'd like to review the outstanding invoices for ${context.contextData.metadata.creditorName}.`;

    // Note: We do NOT save the initial user message here.
    // It is returned to the client to be sent via 'autoSend' param,
    // which triggers the AI generation flow in the chat UI.

    return NextResponse.json({
      chatId,
      initialMessage,
    });
  } catch (error) {
    console.error("[AP Review Create] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to create review chat",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

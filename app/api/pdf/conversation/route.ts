import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { getConversationCache } from "@/lib/redis/document-chat-cache";

export const runtime = "nodejs";

const GetConversationSchema = z.object({
  contextFileId: z.string().min(1),
});

/**
 * GET /api/pdf/conversation?contextFileId=xxx
 * Retrieve cached conversation state for a document
 */
export async function GET(request: Request) {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const contextFileId = searchParams.get("contextFileId");

  if (!contextFileId) {
    return NextResponse.json(
      { error: "contextFileId is required" },
      { status: 400 }
    );
  }

  try {
    const validation = GetConversationSchema.safeParse({ contextFileId });

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid contextFileId" },
        { status: 400 }
      );
    }

    const cached = await getConversationCache(user.id, contextFileId);

    if (!cached) {
      return NextResponse.json({
        cached: false,
        data: null,
      });
    }

    return NextResponse.json({
      cached: true,
      data: {
        contextFileId: cached.contextFileId,
        documentId: cached.documentId,
        summary: cached.summary,
        messages: cached.messages,
        lastUpdated: cached.lastUpdated,
      },
    });
  } catch (error) {
    console.error(
      "[docmanagement] Failed to retrieve cached conversation:",
      error
    );
    return NextResponse.json(
      { error: "Failed to retrieve conversation." },
      { status: 500 }
    );
  }
}

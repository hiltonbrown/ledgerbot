import { readFileSync } from "node:fs";
import { join } from "node:path";
import { type CoreMessage, streamText } from "ai";
import { NextResponse } from "next/server";
import { createAPTools, createAPXeroTools } from "@/lib/agents/ap/tools";
import type { APAgentSettings } from "@/lib/agents/ap/types";
import { myProvider } from "@/lib/ai/providers";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import {
  getActiveXeroConnection,
  getChatById,
  saveChat,
} from "@/lib/db/queries";

export const maxDuration = 60;

// Load system prompt from markdown file
const SYSTEM_INSTRUCTIONS = readFileSync(
  join(process.cwd(), "prompts/ap-system-prompt.md"),
  "utf-8"
);

/**
 * POST /api/agents/ap
 *
 * Handles AP agent chat requests with streaming responses.
 */
export async function POST(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return new NextResponse("Not authenticated", { status: 401 });
    }

    const { messages, settings } = (await req.json()) as {
      messages: CoreMessage[];
      settings?: APAgentSettings;
    };

    // Get or create chat for AP agent
    const chatId = "ap-agent";
    const chat = await getChatById({ id: chatId });
    if (!chat) {
      await saveChat({
        id: chatId,
        userId: user.id,
        title: "Accounts Payable Agent",
        visibility: "private",
      });
    }

    // Determine which tools to use based on Xero connection
    const xeroConnection = await getActiveXeroConnection(user.id);
    const tools = xeroConnection
      ? createAPXeroTools(user.id)
      : createAPTools(user.id);

    if (xeroConnection) {
      console.log("[AP Agent] Using agent with Xero tools");
    } else {
      console.log("[AP Agent] Using base agent (no Xero connection)");
    }

    const result = streamText({
      model: myProvider.languageModel(
        settings?.model || "anthropic-claude-sonnet-4-5"
      ),
      system: SYSTEM_INSTRUCTIONS,
      messages,
      tools,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("[AP Agent] Error handling chat request:", error);

    // Provide user-friendly error messages
    if (error instanceof Error) {
      if (error.message.includes("Xero")) {
        return new NextResponse(
          "Xero integration error. Please check your connection.",
          { status: 500 }
        );
      }
      if (error.message.includes("authentication")) {
        return new NextResponse("Authentication error", { status: 401 });
      }
    }

    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

import { NextResponse } from "next/server";
import type { CoreMessage } from "ai";
import { arAgent, createArAgentWithModel } from "@/lib/agents/ar/agent";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { getChatById, saveChat } from "@/lib/db/queries";

export const maxDuration = 60;

type ArSettings = {
  model?: string;
  asOf?: string;
  minDaysOverdue?: number;
  tone?: "polite" | "firm" | "final";
  autoConfirm?: boolean;
};

export async function POST(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return new NextResponse("Not authenticated", { status: 401 });
    }

    const { messages, settings } = (await req.json()) as {
      messages: CoreMessage[];
      settings?: ArSettings;
    };

    // Get or create chat for AR agent
    const chatId = "ar-agent";
    const chat = await getChatById({ id: chatId });
    if (!chat) {
      await saveChat({
        id: chatId,
        userId: user.id,
        title: "AR Agent (Accounts Receivable)",
        visibility: "private",
      });
    }

    // Use custom model if specified in settings
    const agent = settings?.model
      ? createArAgentWithModel(settings.model)
      : arAgent;

    console.log("[AR Agent] Processing chat request", {
      userId: user.id,
      messageCount: messages.length,
      settings,
    });

    // Inject user ID into system context for tools
    const systemMessage: CoreMessage = {
      role: "system",
      content: `User ID: ${user.id}

CRITICAL REMINDER:
- commsEnabled: false
- NEVER send emails or SMS
- ONLY generate copy-ready artefacts
- Always include "commsEnabled: false" in summaries

${settings?.asOf ? `As-of date: ${settings.asOf}` : ""}
${settings?.minDaysOverdue !== undefined ? `Minimum days overdue: ${settings.minDaysOverdue}` : ""}
${settings?.tone ? `Preferred tone: ${settings.tone}` : ""}
${settings?.autoConfirm ? "Auto-confirm: enabled (generate artefacts without confirmation)" : "Auto-confirm: disabled (propose first, wait for confirmation)"}`,
    };

    const messagesWithContext = [systemMessage, ...messages];

    // Stream the agent response using Mastra's AI SDK integration
    const stream = await agent.stream(messagesWithContext, {
      format: "aisdk",
      maxSteps: 5,
      onStepFinish: ({ text, toolCalls }) => {
        console.log("[AR Agent] Step finished:", {
          hasText: !!text,
          toolCallsCount: toolCalls?.length || 0,
        });
      },
    });

    return stream.toUIMessageStreamResponse();
  } catch (error) {
    console.error("[AR Agent] Error handling chat request:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

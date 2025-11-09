import { NextResponse } from "next/server";
import type { CoreMessage } from "ai";
import {
  analyticsAgent,
  createAnalyticsAgentWithXero,
} from "@/lib/agents/analytics/agent";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import {
  getActiveXeroConnection,
  getChatById,
  saveChat,
} from "@/lib/db/queries";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return new NextResponse("Not authenticated", { status: 401 });
    }

    const { messages, settings } = (await req.json()) as {
      messages: CoreMessage[];
      settings?: {
        model?: string;
        chatId?: string;
      };
    };

    // Get or create chat for analytics agent
    const chatId = settings?.chatId || "analytics-agent";
    const chat = await getChatById({ id: chatId });
    if (!chat) {
      await saveChat({
        id: chatId,
        userId: user.id,
        title: "Analytics Agent",
        visibility: "private",
      });
    }

    // Determine which agent to use based on Xero connection
    const xeroConnection = await getActiveXeroConnection(user.id);
    const agent = xeroConnection
      ? createAnalyticsAgentWithXero(user.id)
      : analyticsAgent;

    if (xeroConnection) {
      console.log(
        "[Analytics Agent] Using agent with Xero P&L and balance sheet tools"
      );
    }

    // Stream the agent response using Mastra's AI SDK integration
    const stream = await agent.stream(messages, {
      format: "aisdk",
      maxSteps: 5,
    });

    return stream.toUIMessageStreamResponse();
  } catch (error) {
    console.error("[Analytics Agent] Error handling chat request:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

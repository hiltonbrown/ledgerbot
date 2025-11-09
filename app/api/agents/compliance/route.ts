import { NextResponse } from "next/server";
import type { CoreMessage } from "ai";
import {
  complianceAgent,
  createComplianceAgentWithXero,
} from "@/lib/agents/compliance/agent";
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

    // Get or create chat for compliance agent
    const chatId = settings?.chatId || "compliance-agent";
    const chat = await getChatById({ id: chatId });
    if (!chat) {
      await saveChat({
        id: chatId,
        userId: user.id,
        title: "Compliance Agent",
        visibility: "private",
      });
    }

    // Determine which agent to use based on Xero connection
    const xeroConnection = await getActiveXeroConnection(user.id);
    const agent = xeroConnection
      ? createComplianceAgentWithXero(user.id)
      : complianceAgent;

    if (xeroConnection) {
      console.log("[Compliance Agent] Using agent with Xero GST report tools");
    }

    // Stream the agent response using Mastra's AI SDK integration
    const stream = await agent.stream(messages, {
      format: "aisdk",
      maxSteps: 5,
    });

    return stream.toUIMessageStreamResponse();
  } catch (error) {
    console.error("[Compliance Agent] Error handling chat request:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

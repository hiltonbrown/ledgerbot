import { NextResponse } from "next/server";
import type { CoreMessage } from "ai";
import {
  reconciliationAgent,
  createReconciliationAgentWithXero,
} from "@/lib/agents/reconciliations/agent";
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
        autoApprove?: boolean;
        matchThreshold?: number;
      };
    };

    // Get or create chat for reconciliation agent
    const chatId = settings?.chatId || "reconciliation-agent";
    const chat = await getChatById({ id: chatId });
    if (!chat) {
      await saveChat({
        id: chatId,
        userId: user.id,
        title: "Reconciliation Agent",
        visibility: "private",
      });
    }

    // Determine which agent to use based on Xero connection
    const xeroConnection = await getActiveXeroConnection(user.id);
    const agent = xeroConnection
      ? createReconciliationAgentWithXero(user.id)
      : reconciliationAgent;

    if (xeroConnection) {
      console.log(
        "[Reconciliation Agent] Using agent with Xero bank transaction tools"
      );
    }

    // Stream the agent response using Mastra's AI SDK integration
    const stream = await agent.stream(messages, {
      format: "aisdk",
      maxSteps: 5,
    });

    return stream.toUIMessageStreamResponse();
  } catch (error) {
    console.error(
      "[Reconciliation Agent] Error handling chat request:",
      error
    );
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

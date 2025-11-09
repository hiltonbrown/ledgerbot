import { NextResponse } from "next/server";
import type { CoreMessage } from "ai";
import { workflowSupervisorAgent } from "@/lib/agents/workflow/supervisor";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import {
  getChatById,
  saveChat,
} from "@/lib/db/queries";

export const maxDuration = 300; // 5 minutes for workflow execution

export async function POST(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return new NextResponse("Not authenticated", { status: 401 });
    }

    const { messages, settings } = (await req.json()) as {
      messages: CoreMessage[];
      settings?: {
        chatId?: string;
      };
    };

    // Get or create chat for workflow supervisor
    const chatId = settings?.chatId || "workflow-supervisor";
    const chat = await getChatById({ id: chatId });
    if (!chat) {
      await saveChat({
        id: chatId,
        userId: user.id,
        title: "Workflow Supervisor",
        visibility: "private",
      });
    }

    console.log("[Workflow Supervisor] Starting workflow orchestration");

    // Stream the agent response using Mastra's AI SDK integration
    const stream = await workflowSupervisorAgent.stream(messages, {
      format: "aisdk",
      maxSteps: 10, // Workflows may need more steps
    });

    return stream.toUIMessageStreamResponse();
  } catch (error) {
    console.error("[Workflow Supervisor] Error handling chat request:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

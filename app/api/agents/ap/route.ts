import { NextResponse } from "next/server";
import type { CoreMessage } from "ai";
import { apAgent, createAPAgentWithXero } from "@/lib/agents/ap/agent";
import type { APAgentSettings } from "@/lib/agents/ap/types";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import {
  getActiveXeroConnection,
  getChatById,
  saveChat,
} from "@/lib/db/queries";

export const maxDuration = 60;

/**
 * POST /api/agents/ap
 *
 * Handles AP agent chat requests with streaming responses.
 *
 * Features:
 * - Conditional Xero tool integration based on user connection
 * - Real-time streaming with step-by-step execution
 * - Token usage tracking and logging
 * - Support for custom model selection
 *
 * Request body:
 * {
 *   messages: CoreMessage[],
 *   settings?: {
 *     model?: string,
 *     autoApprovalThreshold?: number,
 *     requireABN?: boolean,
 *     gstValidation?: boolean,
 *     duplicateCheckDays?: number,
 *     defaultPaymentTerms?: string
 *   }
 * }
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

    // Determine which agent to use based on Xero connection
    const xeroConnection = await getActiveXeroConnection(user.id);
    const agent = xeroConnection
      ? createAPAgentWithXero(user.id, settings?.model)
      : apAgent;

    if (xeroConnection) {
      console.log("[AP Agent] Using agent with Xero tools");
      console.log(`[AP Agent] Xero organisation: ${xeroConnection.tenantName}`);
    } else {
      console.log("[AP Agent] Using base agent (no Xero connection)");
    }

    // Log agent configuration
    if (settings) {
      console.log("[AP Agent] Settings:", {
        model: settings.model || "anthropic-claude-sonnet-4-5",
        autoApprovalThreshold: settings.autoApprovalThreshold,
        requireABN: settings.requireABN,
        gstValidation: settings.gstValidation,
        duplicateCheckDays: settings.duplicateCheckDays,
      });
    }

    // Stream the agent response using Mastra's AI SDK integration
    const stream = await agent.stream(messages, {
      format: "aisdk",
      maxSteps: 5,
      onStepFinish: async ({ stepType, text, toolCalls, usage }) => {
        // Log each step for observability
        console.log(`[AP Agent] Step completed: ${stepType}`);
        if (toolCalls && toolCalls.length > 0) {
          console.log(
            `[AP Agent] Tools called: ${toolCalls.map((tc) => tc.toolName).join(", ")}`
          );
        }
        if (usage) {
          console.log(
            `[AP Agent] Token usage - Prompt: ${usage.promptTokens}, Completion: ${usage.completionTokens}`
          );
        }
      },
    });

    return stream.toUIMessageStreamResponse();
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

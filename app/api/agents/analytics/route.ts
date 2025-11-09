import { createUIMessageStream, JsonToSseTransformStream } from "ai";
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
  saveMessages,
} from "@/lib/db/queries";
import type { DBMessage } from "@/lib/db/schema";
import { generateUUID } from "@/lib/utils";

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

    const stream = createUIMessageStream({
      execute: ({ writer: dataStream }) => {
        const result = agent.generate(messages, {
          maxSteps: 5,
          onStepFinish: ({ text: stepText, toolCalls: stepToolCalls }) => {
            console.log("[Analytics Agent] Step finished:", {
              toolCallsCount: stepToolCalls?.length || 0,
              textLength: stepText?.length || 0,
            });
          },
          onFinish: async ({ text, toolCalls, usage, finishReason }) => {
            console.log("[Analytics Agent] Finished processing:", {
              userId: user.id,
              toolCallsCount: toolCalls?.length || 0,
              finishReason,
              usage,
            });

            // Save messages
            try {
              const dbMessages: DBMessage[] = [];

              // Save the last user message if not already saved
              const lastUserMessage = messages[messages.length - 1];
              if (lastUserMessage?.role === "user") {
                dbMessages.push({
                  id: generateUUID(),
                  chatId,
                  role: "user",
                  parts: lastUserMessage.parts || [],
                  attachments: [],
                  createdAt: new Date(),
                  confidence: null,
                  citations: null,
                  needsReview: null,
                });
              }

              // Save the assistant response
              dbMessages.push({
                id: generateUUID(),
                chatId,
                role: "assistant",
                parts: [{ type: "text", text }],
                attachments: [],
                createdAt: new Date(),
                confidence: null,
                citations: null,
                needsReview: null,
              });

              await saveMessages({ messages: dbMessages });
              console.log(
                `[Analytics Agent] Saved ${dbMessages.length} messages`
              );
            } catch (error) {
              console.error("[Analytics Agent] Failed to save messages:", error);
            }
          },
        });

        // Merge the agent stream with the UI message stream
        dataStream.merge(result.toUIMessageStream());
      },
      onError: (error) => {
        console.error("[Analytics Agent] Stream error:", error);
        return error instanceof Error ? error.message : String(error);
      },
    });

    // Convert to SSE stream and return as Response
    const sseStream = stream.pipeThrough(new JsonToSseTransformStream());
    return new Response(sseStream);
  } catch (error) {
    console.error("[Analytics Agent] Error handling chat request:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

import { createUIMessageStream, JsonToSseTransformStream } from "ai";
import { NextResponse } from "next/server";
import type { CoreMessage } from "ai";
import { workflowSupervisorAgent } from "@/lib/agents/workflow/supervisor";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import {
  getChatById,
  saveChat,
  saveMessages,
} from "@/lib/db/queries";
import type { DBMessage } from "@/lib/db/schema";
import { generateUUID } from "@/lib/utils";

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

    const stream = createUIMessageStream({
      execute: ({ writer: dataStream }) => {
        const result = workflowSupervisorAgent.generate(messages, {
          maxSteps: 10, // Workflows may need more steps
          onStepFinish: ({ text: stepText, toolCalls: stepToolCalls }) => {
            console.log("[Workflow Supervisor] Step finished:", {
              toolCallsCount: stepToolCalls?.length || 0,
              textLength: stepText?.length || 0,
            });

            // Emit progress updates for workflows
            if (stepToolCalls && stepToolCalls.length > 0) {
              for (const toolCall of stepToolCalls) {
                if (toolCall.toolName?.startsWith("execute")) {
                  dataStream.write({
                    type: "workflow-progress",
                    data: {
                      workflow: toolCall.toolName,
                      status: "running",
                    },
                  });
                }
              }
            }
          },
          onFinish: async ({ text, toolCalls, usage, finishReason }) => {
            console.log("[Workflow Supervisor] Finished processing:", {
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
                const content = typeof lastUserMessage.content === "string"
                  ? lastUserMessage.content
                  : "";
                dbMessages.push({
                  id: generateUUID(),
                  chatId,
                  role: "user",
                  parts: [{ type: "text", text: content }],
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
                `[Workflow Supervisor] Saved ${dbMessages.length} messages`
              );
            } catch (error) {
              console.error(
                "[Workflow Supervisor] Failed to save messages:",
                error
              );
            }
          },
        });

        // Merge the agent stream with the UI message stream
        dataStream.merge(result.toUIMessageStream());
      },
      onError: (error) => {
        console.error("[Workflow Supervisor] Stream error:", error);
        return error instanceof Error ? error.message : String(error);
      },
    });

    // Convert to SSE stream and return as Response
    const sseStream = stream.pipeThrough(new JsonToSseTransformStream());
    return new Response(sseStream);
  } catch (error) {
    console.error("[Workflow Supervisor] Error handling chat request:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

import { createUIMessageStream, JsonToSseTransformStream } from "ai";
import { NextResponse } from "next/server";
import type { CoreMessage } from "ai";
import {
  qandaAgent,
  createQandaAgentWithXero,
} from "@/lib/agents/qanda/agent";
import type { QandaSettings } from "@/lib/agents/qanda/types";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import {
  getActiveXeroConnection,
  getChatById,
  saveChat,
  saveMessages,
} from "@/lib/db/queries";
import type { DBMessage } from "@/lib/db/schema";
import {
  calculateConfidence,
  extractCitations,
  requiresHumanReview,
} from "@/lib/regulatory/confidence";
import { refreshSourcesForCategories } from "@/lib/regulatory/scraper";
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
      settings?: QandaSettings;
    };

    if (settings?.refreshSources) {
      const requestedCategories: string[] = Array.isArray(settings?.categories)
        ? (settings.categories as string[])
        : ["award", "tax_ruling", "payroll_tax"];

      const uniqueCategories = Array.from(new Set(requestedCategories));
      try {
        console.log(
          "[Q&A Agent] Refreshing regulatory sources via Mastra",
          uniqueCategories
        );
        await refreshSourcesForCategories({
          categories: uniqueCategories,
          limitPerCategory: settings?.refreshLimit ?? 1,
        });
      } catch (error) {
        console.warn("[Q&A Agent] Failed to refresh sources", error);
      }
    }

    // Get or create chat for Q&A agent
    const chatId = "qanda-agent";
    const chat = await getChatById({ id: chatId });
    if (!chat) {
      await saveChat({
        id: chatId,
        userId: user.id,
        title: "Q&A Advisory Agent",
        visibility: "private",
      });
    }

    // Determine which agent to use based on Xero connection
    const xeroConnection = await getActiveXeroConnection(user.id);
    const agent = xeroConnection
      ? createQandaAgentWithXero(user.id, settings?.model)
      : qandaAgent;

    if (xeroConnection) {
      console.log("[Q&A Agent] Using agent with Xero tools");
    }

    const stream = createUIMessageStream({
      execute: ({ writer: dataStream }) => {
        const result = agent.generate(messages, {
          maxSteps: 5,
          onStepFinish: ({ text: stepText, toolCalls: stepToolCalls }) => {
            console.log("[Q&A Agent] Step finished:", {
              toolCallsCount: stepToolCalls?.length || 0,
              textLength: stepText?.length || 0,
            });
          },
          onFinish: async ({ text, toolCalls, usage, finishReason }) => {
            const confidence = calculateConfidence(toolCalls, text);
            const citations = extractCitations(toolCalls);
            const needsReview = requiresHumanReview(
              confidence,
              settings?.confidenceThreshold || 0.6
            );

            console.log("[Q&A Agent] Finished processing response:", {
              userId: user.id,
              confidence: confidence.toFixed(3),
              citationCount: citations.length,
              needsReview,
              finishReason,
              usage,
            });

            // Stream metadata to the client as data annotation
            dataStream.write({
              type: "data-metadata",
              data: {
                confidence,
                citations,
                needsReview,
              },
            });

            // Save messages with confidence and citations
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

              // Save the assistant response with confidence and citations
              dbMessages.push({
                id: generateUUID(),
                chatId,
                role: "assistant",
                parts: [{ type: "text", text }],
                attachments: [],
                createdAt: new Date(),
                confidence,
                citations: citations.length > 0 ? citations : null,
                needsReview,
              });

              await saveMessages({ messages: dbMessages });
              console.log(
                `[Q&A Agent] Saved ${dbMessages.length} messages with confidence score`
              );
            } catch (error) {
              console.error("[Q&A Agent] Failed to save messages:", error);
            }

            if (needsReview) {
              console.warn(
                `[Q&A Agent] Response for user ${user.id} requires human review (Confidence: ${confidence.toFixed(3)})`
              );
            }
          },
        });

        // Merge the agent stream with the UI message stream
        dataStream.merge(result.toUIMessageStream());
      },
      onError: (error) => {
        console.error("[Q&A Agent] Stream error:", error);
        return error instanceof Error ? error.message : String(error);
      },
    });

    // Convert to SSE stream and return as Response
    const sseStream = stream.pipeThrough(new JsonToSseTransformStream());
    return new Response(sseStream);
  } catch (error) {
    console.error("[Q&A Agent] Error handling chat request:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

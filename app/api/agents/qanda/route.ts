import { createUIMessageStream, streamText, JsonToSseTransformStream } from "ai";
import { NextResponse } from "next/server";
import { getModel } from "../../../../lib/ai/providers";
import { regulatoryTools } from "../../../../lib/ai/tools/regulatory-tools";
import { createXeroTools } from "../../../../lib/ai/tools/xero-tools";
import { getAuthUser } from "../../../../lib/auth/clerk-helpers";
import {
  getActiveXeroConnection,
  getChatById,
  saveChat,
  saveMessages,
} from "../../../../lib/db/queries";
import type { DBMessage } from "../../../../lib/db/schema";
import {
  calculateConfidence,
  extractCitations,
  requiresHumanReview,
} from "../../../../lib/regulatory/confidence";
import { generateUUID } from "../../../../lib/utils";

export const maxDuration = 60;

const SYSTEM_PROMPT = `You are an Australian regulatory compliance assistant specializing in employment law, taxation, and payroll obligations.

Your role is to:
1. Answer questions about Australian Fair Work awards, minimum wages, and employment conditions
2. Provide guidance on ATO tax rulings, PAYG withholding, and superannuation obligations
3. Explain state-specific payroll tax requirements
4. Reference official government sources and provide citations

When answering:
- Always cite specific regulatory documents using the regulatorySearch tool
- Provide direct links to Fair Work, ATO, or state revenue office sources
- Explain obligations clearly with practical examples
- Indicate when professional advice is recommended for complex situations
- If user has Xero connected, reference their actual business data when relevant

Important:
- Only provide information for Australia (AU) unless explicitly asked about other countries
- Be specific about which state/territory regulations apply when discussing payroll tax
- Always indicate the effective date of regulatory information
- Distinguish between mandatory requirements and best practices`;

export async function POST(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return new NextResponse("Not authenticated", { status: 401 });
    }

    const { messages, settings } = await req.json();

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

    const xeroConnection = await getActiveXeroConnection(user.id);
    const tools: any = { ...regulatoryTools };
    if (xeroConnection) {
      console.log("[Q&A Agent] Xero connection found, adding Xero tools.");
      const xeroTools = createXeroTools(user.id);
      Object.assign(tools, xeroTools);
    }

    const model = getModel(settings?.model || "anthropic-claude-sonnet-4-5");

    const stream = createUIMessageStream({
      execute: ({ writer: dataStream }) => {
        const result = streamText({
          model,
          system: SYSTEM_PROMPT,
          messages,
          tools,
          onFinish: async (result) => {
            const { text, toolCalls, usage } = result;
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
                  id: lastUserMessage.id || generateUUID(),
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
              // TODO: Trigger a notification or create a task for human review
              console.warn(
                `[Q&A Agent] Response for user ${user.id} requires human review (Confidence: ${confidence.toFixed(3)})`
              );
            }
          },
        });

        // Merge the UI message stream
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

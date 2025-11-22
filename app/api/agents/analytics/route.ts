import {
  convertToModelMessages,
  createUIMessageStream,
  JsonToSseTransformStream,
  streamText,
} from "ai";
import {
  getAnalyticsAgentSystemPrompt,
  getAnalyticsAgentTools,
  getAnalyticsAgentToolsWithXero,
} from "@/lib/agents/analytics/agent";
import { myProvider } from "@/lib/ai/providers";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { isProductionEnvironment } from "@/lib/constants";
import { getActiveXeroConnection } from "@/lib/db/queries";
import { generateUUID } from "@/lib/utils";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return new Response("Not authenticated", { status: 401 });
    }

    const { messages } = (await request.json()) as {
      messages: any[];
      chatId?: string;
    };

    // Check if user has Xero connection
    const xeroConnection = await getActiveXeroConnection(user.id);
    const analyticsTools = xeroConnection
      ? getAnalyticsAgentToolsWithXero(user.id)
      : getAnalyticsAgentTools();

    const stream = createUIMessageStream({
      execute: ({ writer: dataStream }) => {
        const result = streamText({
          model: myProvider.languageModel("anthropic-claude-sonnet-4-5"),
          system: getAnalyticsAgentSystemPrompt(),
          messages: convertToModelMessages(messages),
          tools: analyticsTools,
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: "analytics-agent",
          },
        });

        dataStream.merge(
          result.toUIMessageStream({
            sendReasoning: true,
          })
        );
      },
      generateId: generateUUID,
    });

    const sseStream = stream.pipeThrough(new JsonToSseTransformStream());
    return new Response(sseStream);
  } catch (error) {
    console.error("[Analytics Agent] Error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

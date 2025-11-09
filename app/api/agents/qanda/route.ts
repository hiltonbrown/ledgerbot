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
} from "@/lib/db/queries";
import { refreshSourcesForCategories } from "@/lib/regulatory/scraper";

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

    // Stream the agent response using Mastra's AI SDK integration
    const stream = await agent.stream(messages, {
      format: "aisdk",
      maxSteps: 5,
    });

    return stream.toUIMessageStreamResponse();
  } catch (error) {
    console.error("[Q&A Agent] Error handling chat request:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

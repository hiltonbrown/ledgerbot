import { type CoreMessage, streamText } from "ai";
import { NextResponse } from "next/server";
import {
  createQandaXeroTools,
  regulatorySearchTool,
} from "@/lib/agents/qanda/tools";
import type { QandaSettings } from "@/lib/agents/qanda/types";
import { myProvider } from "@/lib/ai/providers";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import {
  getActiveXeroConnection,
  getChatById,
  saveChat,
} from "@/lib/db/queries";
import { refreshSourcesForCategories } from "@/lib/regulatory/scraper";

export const maxDuration = 60;

const SYSTEM_INSTRUCTIONS = `You are an Australian regulatory compliance assistant specializing in employment law, taxation, and payroll obligations.

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
          "[Q&A Agent] Refreshing regulatory sources",
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

    // Determine which tools to use based on Xero connection
    const xeroConnection = await getActiveXeroConnection(user.id);
    const xeroTools = xeroConnection ? createQandaXeroTools(user.id) : {};

    if (xeroConnection) {
      console.log("[Q&A Agent] Using agent with Xero tools");
    }

    const result = streamText({
      model: myProvider.languageModel(
        settings?.model || "anthropic-claude-sonnet-4-5"
      ),
      system: SYSTEM_INSTRUCTIONS,
      messages,
      tools: {
        regulatorySearch: regulatorySearchTool,
        ...xeroTools,
      },
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("[Q&A Agent] Error handling chat request:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

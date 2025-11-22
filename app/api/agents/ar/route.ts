import { readFileSync } from "node:fs";
import { join } from "node:path";
import { type CoreMessage, streamText } from "ai";
import { NextResponse } from "next/server";
import { myProvider } from "@/lib/ai/providers";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { getChatById, saveChat } from "@/lib/db/queries";
import {
  buildCallScriptTool,
  buildEmailReminderTool,
  buildSmsReminderTool,
  getInvoicesDueTool,
  postNoteTool,
  predictLateRiskTool,
  reconcilePaymentTool,
  saveNoteToXeroTool,
  syncXeroTool,
} from "@/lib/tools/ar/messaging";

export const maxDuration = 60;

type ArSettings = {
  model?: string;
  asOf?: string;
  minDaysOverdue?: number;
  tone?: "polite" | "firm" | "final";
  autoConfirm?: boolean;
};

// Load system prompt from markdown file
const SYSTEM_PROMPT_PATH = join(
  process.cwd(),
  "prompts",
  "ar-system-prompt.md"
);
const SYSTEM_INSTRUCTIONS = readFileSync(SYSTEM_PROMPT_PATH, "utf-8");

export async function POST(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return new NextResponse("Not authenticated", { status: 401 });
    }

    const { messages, settings } = (await req.json()) as {
      messages: CoreMessage[];
      settings?: ArSettings;
    };

    // Get or create chat for AR agent
    const chatId = "ar-agent";
    const chat = await getChatById({ id: chatId });
    if (!chat) {
      await saveChat({
        id: chatId,
        userId: user.id,
        title: "AR Agent (Accounts Receivable)",
        visibility: "private",
      });
    }

    console.log("[AR Agent] Processing chat request", {
      userId: user.id,
      messageCount: messages.length,
      settings,
    });

    // Inject user ID into system context for tools
    const systemMessage: CoreMessage = {
      role: "system",
      content: `${SYSTEM_INSTRUCTIONS}

User ID: ${user.id}

CRITICAL REMINDER:
- commsEnabled: false
- NEVER send emails or SMS
- ONLY generate copy-ready artefacts
- Always include "commsEnabled: false" in summaries

${settings?.asOf ? `As-of date: ${settings.asOf}` : ""}
${settings?.minDaysOverdue !== undefined ? `Minimum days overdue: ${settings.minDaysOverdue}` : ""}
${settings?.tone ? `Preferred tone: ${settings.tone}` : ""}
${settings?.autoConfirm ? "Auto-confirm: enabled (generate artefacts without confirmation)" : "Auto-confirm: disabled (propose first, wait for confirmation)"}`,
    };

    const messagesWithContext = [systemMessage, ...messages];

    const result = streamText({
      model: myProvider.languageModel(
        settings?.model || "anthropic-claude-sonnet-4-5"
      ),
      messages: messagesWithContext,
      tools: {
        getInvoicesDue: getInvoicesDueTool,
        predictLateRisk: predictLateRiskTool,
        buildEmailReminder: buildEmailReminderTool,
        buildSmsReminder: buildSmsReminderTool,
        buildCallScript: buildCallScriptTool,
        reconcilePayment: reconcilePaymentTool,
        postNote: postNoteTool,
        saveNoteToXero: saveNoteToXeroTool,
        syncXero: syncXeroTool,
      },
      onStepFinish: ({ text, toolCalls }) => {
        console.log("[AR Agent] Step finished:", {
          hasText: !!text,
          toolCallsCount: toolCalls?.length || 0,
        });
      },
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("[AR Agent] Error handling chat request:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

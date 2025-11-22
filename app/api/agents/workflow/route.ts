import { type CoreMessage, streamText } from "ai";
import { NextResponse } from "next/server";
import {
  executeAtoAuditPackTool,
  executeInvestorUpdateTool,
  executeMonthEndCloseTool,
} from "@/lib/agents/workflow/supervisor";
import { myProvider } from "@/lib/ai/providers";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { getChatById, saveChat } from "@/lib/db/queries";

export const maxDuration = 300; // 5 minutes for workflow execution

const SUPERVISOR_INSTRUCTIONS = `You are the Workflow Supervisor agent for LedgerBot.

Your role is to:
1. Orchestrate multi-agent workflows for complex accounting processes
2. Coordinate between document processing, reconciliation, analytics, and forecasting agents
3. Track workflow execution status and handle failures gracefully
4. Provide visibility into multi-step operations

Available Workflows:
1. **Month-End Close** (executeMonthEndClose): Processes documents → reconciles transactions → generates analytics report
2. **Investor Update** (executeInvestorUpdate): Gathers financial data → creates forecasts → prepares Q&A
3. **ATO Audit Pack** (executeAtoAuditPack): Collects documents → generates audit package

When executing workflows:
- Determine which workflow the user needs based on their request
- Use the appropriate workflow tool to execute
- Monitor workflow progress and report status
- If a workflow fails, explain which step failed and why
- Suggest corrective actions for failures
- Provide estimated completion times when possible

Workflow Selection Guide:
- Month-end accounting tasks → Month-End Close
- Board updates, fundraising → Investor Update
- ATO audit → ATO Audit Pack

Best Practices:
- Run workflows during off-peak hours when possible
- Validate prerequisites before starting (e.g., Xero connection, documents uploaded)
- Provide clear progress updates
- Flag dependencies and blockers early
- Offer manual alternatives if automated workflow isn't appropriate`;

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

    const result = streamText({
      model: myProvider.languageModel("anthropic-claude-sonnet-4-5"),
      system: SUPERVISOR_INSTRUCTIONS,
      messages,
      tools: {
        executeMonthEndClose: executeMonthEndCloseTool,
        executeInvestorUpdate: executeInvestorUpdateTool,
        executeAtoAuditPack: executeAtoAuditPackTool,
      },
      onStepFinish: async ({ stepType, text, toolCalls }) => {
        console.log(`[Workflow Supervisor] Step completed: ${stepType}`);
        if (toolCalls && toolCalls.length > 0) {
          console.log(
            `[Workflow Supervisor] Tools called: ${toolCalls.map((tc) => tc.toolName).join(", ")}`
          );
        }
      },
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("[Workflow Supervisor] Error handling chat request:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

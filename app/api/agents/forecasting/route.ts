import { NextResponse } from "next/server";
import { z } from "zod";
import { runFinancialModelingAgent } from "@/lib/agents/forecasting/agent";
import {
  forecastModelIds,
  getModelMeta,
} from "@/lib/agents/forecasting/config";
import { forecastingMemory } from "@/lib/agents/forecasting/memory";
import {
  addMonths,
  clampHorizon,
  endOfMonth,
  formatIsoDate,
  parseMonthToDate,
} from "@/lib/agents/forecasting/utils";
import { createXeroTools } from "@/lib/ai/tools/xero-tools";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import {
  getActiveXeroConnection,
  saveChat,
  saveDocument,
  saveMessages,
} from "@/lib/db/queries";
import type { DBMessage } from "@/lib/db/schema";
import { generateUUID } from "@/lib/utils";

const requestSchema = z.object({
  modelId: z.enum(forecastModelIds),
  includeOptimistic: z.boolean().default(true),
  includePessimistic: z.boolean().default(true),
  variables: z.object({
    startMonth: z.string().min(7),
    horizonMonths: z.number().int(),
    currency: z.string().min(1).max(8),
    openingCash: z.number().nullable().optional(),
    revenueStreams: z.array(z.string()).default([]),
    costDrivers: z.array(z.string()).default([]),
    notes: z.string().optional(),
    growthSignals: z.array(z.string()).default([]),
    assumptionOverrides: z.record(z.string(), z.string()).optional(),
  }),
});

function truncate(text: string, maxLength = 1600) {
  if (!text) {
    return "";
  }
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
}

async function buildXeroContext({
  userId,
  fromDate,
  toDate,
  periods,
}: {
  userId: string;
  fromDate: string;
  toDate: string;
  periods: number;
}) {
  try {
    const tools = createXeroTools(userId);

    const [pnlResult, balanceResult] = await Promise.allSettled([
      // biome-ignore lint/suspicious/noExplicitAny: Type workaround for AI SDK tool execution
      (tools.xero_get_profit_and_loss as any).execute({
        fromDate,
        toDate,
        periods: Math.min(periods, 12),
        timeframe: "MONTH",
      }),
      // biome-ignore lint/suspicious/noExplicitAny: Type workaround for AI SDK tool execution
      (tools.xero_get_balance_sheet as any).execute({ fromDate, toDate }),
    ]);

    const sections: string[] = [];

    if (pnlResult.status === "fulfilled" && pnlResult.value) {
      sections.push(`# Profit & loss excerpt\n${truncate(pnlResult.value)}`);
    }

    if (balanceResult.status === "fulfilled" && balanceResult.value) {
      sections.push(
        `# Balance sheet excerpt\n${truncate(balanceResult.value)}`
      );
    }

    if (sections.length === 0) {
      return "Connected to Xero but no report data was returned for the selected window.";
    }

    return sections.join("\n\n");
  } catch (error) {
    console.warn("[ForecastingAgent] Failed to collect Xero context", error);
    return "Xero connection detected but the reporting API could not be reached. Proceed with internal assumptions.";
  }
}

function buildUserSummary({
  modelLabel,
  startMonth,
  horizonMonths,
  currency,
  openingCash,
  revenueStreams,
  costDrivers,
  notes,
  growthSignals,
}: {
  modelLabel: string;
  startMonth: string;
  horizonMonths: number;
  currency: string;
  openingCash?: number | null;
  revenueStreams: string[];
  costDrivers: string[];
  notes?: string;
  growthSignals: string[];
}) {
  const lines = [
    `Kick off the ${modelLabel} forecast.`,
    `- Start month: ${startMonth}`,
    `- Horizon: ${horizonMonths} months`,
    `- Currency: ${currency}`,
    `- Opening cash: ${openingCash ?? 0}`,
    revenueStreams.length
      ? `- Revenue streams:\n  ${revenueStreams.map((item) => `• ${item}`).join("\n  ")}`
      : "- Revenue streams: none provided",
    costDrivers.length
      ? `- Cost structure:\n  ${costDrivers.map((item) => `• ${item}`).join("\n  ")}`
      : "- Cost structure: none provided",
  ];

  if (growthSignals.length) {
    lines.push(
      `- Growth signals:\n  ${growthSignals.map((item) => `• ${item}`).join("\n  ")}`
    );
  }

  if (notes?.trim()) {
    lines.push(`- Notes: ${notes.trim()}`);
  }

  return lines.join("\n");
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return new NextResponse("Not authenticated", { status: 401 });
    }

    const parsedBody = requestSchema.safeParse(await request.json());

    if (!parsedBody.success) {
      return NextResponse.json(
        { error: parsedBody.error.flatten() },
        { status: 400 }
      );
    }

    const body = parsedBody.data;
    const modelMeta = getModelMeta(body.modelId);

    const parsedStart =
      parseMonthToDate(body.variables.startMonth) ??
      parseMonthToDate(new Date().toISOString().slice(0, 7)) ??
      new Date();
    const normalizedStartMonth = `${parsedStart.getUTCFullYear()}-${String(
      parsedStart.getUTCMonth() + 1
    ).padStart(2, "0")}`;

    const clampedHorizon = clampHorizon(body.variables.horizonMonths, {
      min: 3,
      max: 36,
    });

    const startDate = parsedStart;
    const finalMonthStart = addMonths(startDate, clampedHorizon - 1);
    const fromDate = formatIsoDate(startDate);
    const toDate = formatIsoDate(endOfMonth(finalMonthStart));

    const xeroConnection = await getActiveXeroConnection(user.id);
    const xeroContext = xeroConnection
      ? await buildXeroContext({
          userId: user.id,
          fromDate,
          toDate,
          periods: clampedHorizon,
        })
      : undefined;

    const memoryKeywords = new Set<string>([
      modelMeta.label,
      normalizedStartMonth,
      body.variables.currency,
      ...body.variables.revenueStreams.slice(0, 3),
      ...body.variables.costDrivers.slice(0, 3),
    ]);

    const memorySnippets = await forecastingMemory
      .searchRelevantMemories(user.id, Array.from(memoryKeywords), 5)
      .then((results) =>
        results.map(
          (item) =>
            `${item.role === "assistant" ? "Agent" : "User"}: ${truncate(item.content, 240)}`
        )
      );

    const agentResult = await runFinancialModelingAgent({
      userId: user.id,
      preferredModel: body.modelId,
      variables: {
        startMonth: normalizedStartMonth,
        horizonMonths: clampedHorizon,
        currency: body.variables.currency,
        openingCash: body.variables.openingCash,
        revenueStreams: body.variables.revenueStreams,
        costDrivers: body.variables.costDrivers,
        notes: body.variables.notes,
        growthSignals: body.variables.growthSignals,
        assumptionOverrides: body.variables.assumptionOverrides ?? {},
      },
      includeOptimistic: body.includeOptimistic,
      includePessimistic: body.includePessimistic,
      xeroContext,
      memorySnippets,
    });

    const chatId = generateUUID();
    const documentId = generateUUID();
    const now = new Date();

    const chatTitle = `${modelMeta.label} – ${normalizedStartMonth}`;

    await saveChat({
      id: chatId,
      userId: user.id,
      title: chatTitle,
      visibility: "private",
    });

    const documentTitle = `${modelMeta.label} forecast (${clampedHorizon}m starting ${normalizedStartMonth})`;

    await saveDocument({
      id: documentId,
      title: documentTitle,
      content: agentResult.csv,
      kind: "sheet",
      userId: user.id,
      chatId,
    });

    const userMessageId = generateUUID();
    const assistantMessageId = generateUUID();
    const toolCallId = generateUUID();

    const userMessageText = buildUserSummary({
      modelLabel: modelMeta.label,
      startMonth: normalizedStartMonth,
      horizonMonths: clampedHorizon,
      currency: body.variables.currency,
      openingCash: body.variables.openingCash,
      revenueStreams: body.variables.revenueStreams,
      costDrivers: body.variables.costDrivers,
      notes: body.variables.notes,
      growthSignals: body.variables.growthSignals,
    });

    const assistantNarrative = `${agentResult.assistantSummary}\nForecast spreadsheet: ${documentTitle}.`;

    const dbMessages: DBMessage[] = [
      {
        id: userMessageId,
        chatId,
        role: "user",
        parts: [{ type: "text", text: userMessageText }] as any,
        attachments: [],
        createdAt: now,
        confidence: null,
        citations: null,
        needsReview: null,
      },
      {
        id: assistantMessageId,
        chatId,
        role: "assistant",
        parts: [
          {
            type: "tool-createDocument",
            toolCallId,
            state: "output-available",
            input: { action: "create", title: documentTitle, kind: "sheet" },
            output: {
              action: "create",
              id: documentId,
              title: documentTitle,
              kind: "sheet",
            },
          },
          { type: "text", text: assistantNarrative },
        ] as any,
        attachments: [],
        createdAt: now,
        confidence: null,
        citations: null,
        needsReview: null,
      },
    ];

    let clarifyingMessageId: string | null = null;
    if (agentResult.clarifyingQuestions.length > 0) {
      clarifyingMessageId = generateUUID();
      const clarifyingText = `To make this forecast sharper I need a few clarifications:\n${agentResult.clarifyingQuestions
        .map((question, index) => `${index + 1}. ${question}`)
        .join("\n")}`;

      dbMessages.push({
        id: clarifyingMessageId,
        chatId,
        role: "assistant",
        parts: [{ type: "text", text: clarifyingText }] as any,
        attachments: [],
        createdAt: now,
        confidence: null,
        citations: null,
        needsReview: null,
      });
    }

    await saveMessages({ messages: dbMessages });

    await forecastingMemory.appendMany([
      {
        chatId,
        userId: user.id,
        role: "user",
        content: userMessageText,
      },
      {
        chatId,
        userId: user.id,
        role: "assistant",
        content: assistantNarrative,
      },
      ...(clarifyingMessageId
        ? [
            {
              chatId,
              userId: user.id,
              role: "assistant" as const,
              content: `Clarifying questions:\n${agentResult.clarifyingQuestions
                .map((question, index) => `${index + 1}. ${question}`)
                .join("\n")}`,
            },
          ]
        : []),
    ]);

    return NextResponse.json({
      chatId,
      documentId,
      chartSuggestions: agentResult.visualizationNotes,
      scenarios: agentResult.scenarioLabels,
      clarifyingQuestions: agentResult.clarifyingQuestions,
    });
  } catch (error) {
    console.error("[ForecastingAgent] Failed to start forecasting chat", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

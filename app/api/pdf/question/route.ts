import { NextResponse } from "next/server";
import { z } from "zod";

import { answerPdfQuestion } from "@/lib/agents/docmanagement/workflow";
import type { PdfChatMessage } from "@/lib/agents/docmanagement/types";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { getContextFileById, touchContextFile } from "@/lib/db/queries";

export const runtime = "nodejs";
export const maxDuration = 60;

const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(1200),
  sources: z.array(z.string()).optional(),
});

const sectionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1).max(1200),
  keyFacts: z.array(z.string()).max(10),
  monetaryAmounts: z.array(z.string()).max(10),
  complianceSignals: z.array(z.string()).max(10),
  sourcePreview: z.string().optional(),
});

const QuestionSchema = z.object({
  contextFileId: z.string().min(1),
  question: z.string().min(1).max(600),
  summary: z.string().min(1).max(6000),
  sections: z.array(sectionSchema).min(1).max(20),
  history: z.array(chatMessageSchema).max(12).optional(),
});

export async function POST(request: Request) {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: z.infer<typeof QuestionSchema>;
  try {
    payload = QuestionSchema.parse(await request.json());
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? error.issues.map((issue) => issue.message).join(" ")
        : "Invalid request payload.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const contextFile = await getContextFileById({
      id: payload.contextFileId,
      userId: user.id,
    });

    if (!contextFile) {
      return NextResponse.json({ error: "File not found." }, { status: 404 });
    }

    if (!contextFile.extractedText || contextFile.status !== "ready") {
      return NextResponse.json(
        {
          error:
            contextFile.errorMessage ||
            "This PDF is missing searchable text. Please upload a machine-readable version.",
        },
        { status: 400 }
      );
    }

    const answer = await answerPdfQuestion({
      summary: payload.summary,
      sections: payload.sections,
      rawText: contextFile.extractedText,
      question: payload.question,
      history: payload.history as PdfChatMessage[] | undefined,
    });

    await touchContextFile(contextFile.id);

    return NextResponse.json(answer);
  } catch (error) {
    console.error("[docmanagement] Failed to answer PDF question", error);
    return NextResponse.json(
      { error: "Failed to answer the question." },
      { status: 500 }
    );
  }
}

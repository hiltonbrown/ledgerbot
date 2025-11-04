import { NextResponse } from "next/server";
import { z } from "zod";

import {
  buildSummaryDocument,
  generatePdfQuestions,
} from "@/lib/agents/docmanagement/workflow";
import type { PdfSectionSummary } from "@/lib/agents/docmanagement/types";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import {
  getContextFileById,
  saveDocument,
  touchContextFile,
} from "@/lib/db/queries";

export const runtime = "nodejs";
export const maxDuration = 60;

const sectionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1).max(1200),
  keyFacts: z.array(z.string()).max(10),
  monetaryAmounts: z.array(z.string()).max(10),
  complianceSignals: z.array(z.string()).max(10),
  sourcePreview: z.string().optional(),
});

const QuestionsSchema = z.object({
  contextFileId: z.string().min(1),
  documentId: z.string().min(1),
  summary: z.string().min(1).max(6000),
  highlights: z.array(z.string()).max(12).default([]),
  sections: z.array(sectionSchema).min(1).max(20),
});

export async function POST(request: Request) {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: z.infer<typeof QuestionsSchema>;
  try {
    payload = QuestionsSchema.parse(await request.json());
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

    const questionResult = await generatePdfQuestions({
      summary: payload.summary,
      highlights: payload.highlights,
      sections: payload.sections as PdfSectionSummary[],
    });

    const markdown = buildSummaryDocument({
      fileName: contextFile.originalName ?? contextFile.name,
      summary: payload.summary,
      highlights: payload.highlights,
      sections: payload.sections as PdfSectionSummary[],
      questions: questionResult.questions,
    });

    await saveDocument({
      id: payload.documentId,
      title: `Summary: ${contextFile.originalName ?? contextFile.name}`,
      kind: "text",
      content: markdown,
      userId: user.id,
    });

    await touchContextFile(contextFile.id);

    return NextResponse.json({
      documentId: payload.documentId,
      questions: questionResult.questions,
      warnings: questionResult.warnings,
    });
  } catch (error) {
    console.error("[docmanagement] Failed to generate questions", error);
    return NextResponse.json(
      { error: "Failed to generate follow-up questions." },
      { status: 500 }
    );
  }
}

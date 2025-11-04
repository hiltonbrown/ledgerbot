import { NextResponse } from "next/server";
import { z } from "zod";

import { summarizePdfContent, buildSummaryDocument } from "@/lib/agents/docmanagement/workflow";
import type { PdfSectionSummary } from "@/lib/agents/docmanagement/types";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import {
  getContextFileById,
  saveDocument,
  touchContextFile,
} from "@/lib/db/queries";
import { generateUUID } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 60;

const SummarizeSchema = z.object({
  contextFileId: z.string().min(1),
  summaryDocumentId: z.string().optional(),
});

export async function POST(request: Request) {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: z.infer<typeof SummarizeSchema>;
  try {
    payload = SummarizeSchema.parse(await request.json());
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
            "This PDF has no searchable text. Try re-uploading with OCR enabled.",
        },
        { status: 400 }
      );
    }

    const summaryResult = await summarizePdfContent({
      text: contextFile.extractedText,
      fileName: contextFile.originalName ?? contextFile.name,
    });

    const documentId = payload.summaryDocumentId ?? generateUUID();

    const markdown = buildSummaryDocument({
      fileName: contextFile.originalName ?? contextFile.name,
      summary: summaryResult.summary,
      highlights: summaryResult.highlights,
      sections: summaryResult.sections as PdfSectionSummary[],
    });

    await saveDocument({
      id: documentId,
      title: `Summary: ${contextFile.originalName ?? contextFile.name}`,
      kind: "text",
      content: markdown,
      userId: user.id,
    });

    await touchContextFile(contextFile.id);

    return NextResponse.json({
      documentId,
      summary: summaryResult.summary,
      highlights: summaryResult.highlights,
      sections: summaryResult.sections,
      warnings: summaryResult.warnings,
      usage: summaryResult.usage,
    });
  } catch (error) {
    console.error("[docmanagement] Failed to summarise PDF", error);
    return NextResponse.json(
      { error: "Failed to summarise the PDF." },
      { status: 500 }
    );
  }
}

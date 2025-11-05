import { and, eq, like } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { PdfSectionSummary } from "@/lib/agents/docmanagement/types";
import {
  buildSummaryDocument,
  summarizePdfContent,
} from "@/lib/agents/docmanagement/workflow";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import {
  db,
  getContextFileById,
  saveDocument,
  touchContextFile,
} from "@/lib/db/queries";
import { document } from "@/lib/db/schema";
import { generateUUID } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 60;

// Helper to create SSE stream
function createStreamResponse() {
  const encoder = new TextEncoder();
  let controllerRef: ReadableStreamDefaultController | null = null;

  const stream = new ReadableStream({
    start(controller) {
      controllerRef = controller;
    },
  });

  const sendEvent = (event: string, data: unknown) => {
    if (controllerRef) {
      const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      controllerRef.enqueue(encoder.encode(message));
    }
  };

  const close = () => {
    if (controllerRef) {
      controllerRef.close();
    }
  };

  return { stream, sendEvent, close };
}

const SummarizeSchema = z.object({
  contextFileId: z.string().min(1),
  summaryDocumentId: z.string().optional(),
  stream: z.boolean().optional(), // Enable streaming response
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

    // Check if we already have a summary document for this file
    // This simple caching prevents redundant processing
    const existingDocs = await db
      .select()
      .from(document)
      .where(
        and(
          eq(document.userId, user.id),
          like(
            document.title,
            `Summary: ${contextFile.originalName ?? contextFile.name}`
          )
        )
      )
      .limit(1);

    // If summary exists and was created recently (within 1 hour), return cached version
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (existingDocs.length > 0 && existingDocs[0].createdAt > oneHourAgo) {
      console.log(
        `[docmanagement] Using cached summary for ${contextFile.originalName}`
      );

      // Parse the existing markdown to extract structured data
      const cachedContent = existingDocs[0].content || "";
      const summaryMatch = cachedContent.match(
        /# PDF summary:.*?\n(.*?)(?=\n## |$)/s
      );
      const summary = summaryMatch?.[1]?.trim() || "Cached summary available.";

      return NextResponse.json({
        documentId: existingDocs[0].id,
        summary,
        highlights: [],
        sections: [],
        warnings: ["Using cached summary from recent analysis"],
        usage: { cached: true },
      });
    }

    // Enable SSE streaming if requested
    if (payload.stream) {
      const { stream, sendEvent, close } = createStreamResponse();

      // Process in background and stream progress
      (async () => {
        try {
          const summaryResult = await summarizePdfContent({
            text: contextFile.extractedText || "",
            fileName: contextFile.originalName ?? contextFile.name,
            onProgress: (event) => {
              sendEvent("progress", event);
            },
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

          sendEvent("complete", {
            documentId,
            summary: summaryResult.summary,
            highlights: summaryResult.highlights,
            sections: summaryResult.sections,
            warnings: summaryResult.warnings,
            usage: summaryResult.usage,
          });

          close();
        } catch (error) {
          sendEvent("error", {
            message:
              error instanceof Error
                ? error.message
                : "Failed to summarise the PDF.",
          });
          close();
        }
      })();

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // Non-streaming fallback (original behavior)
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

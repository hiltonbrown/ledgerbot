import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { createContextFile, updateContextFileContent } from "@/lib/db/queries";
import { extractPdfText } from "@/lib/files/parsers";
import { extractPdfTextWithOCR } from "@/lib/files/pdf-ocr";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB safety ceiling for invoices/statements
const SUPPORTED_CONTENT_TYPE = "application/pdf";

const UploadSchema = z.object({
  file: z
    .instanceof(Blob)
    .refine((value) => value.size > 0, {
      message: "The uploaded file is empty.",
    })
    .refine((value) => value.size <= MAX_FILE_SIZE_BYTES, {
      message: "PDFs larger than 15MB should be compressed before upload.",
    })
    .refine((value) => value.type === SUPPORTED_CONTENT_TYPE, {
      message: "Only PDF files are supported for this workflow.",
    }),
});

function sanitizeFileName(name: string) {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function estimateTokens(text: string) {
  if (!text) {
    return 0;
  }
  return Math.ceil(text.length / 4);
}

export async function POST(request: Request) {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!request.body) {
    return NextResponse.json(
      { error: "Request body is empty." },
      { status: 400 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "A PDF file is required under the `file` field." },
        { status: 400 }
      );
    }

    const validation = UploadSchema.safeParse({ file });
    if (!validation.success) {
      const message = validation.error.issues
        .map((issue) => issue.message)
        .join(" ");
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const safeName = sanitizeFileName(file.name || "document.pdf");
    const blobPath = `docmanagement/${user.id}/${Date.now()}-${safeName}`;

    const arrayBuffer = await file.arrayBuffer();

    const blobResult = await put(blobPath, arrayBuffer, {
      access: "public",
    });

    const [contextRecord] = await createContextFile({
      userId: user.id,
      name: safeName,
      originalName: file.name,
      blobUrl: blobResult.url,
      fileType: SUPPORTED_CONTENT_TYPE,
      fileSize: file.size,
      description: "docmanagement/pdf",
    });

    let extractedText = "";
    let extractionError: string | null = null;
    let usedOCR = false;

    try {
      extractedText = await extractPdfText(file);
    } catch (error) {
      extractionError =
        error instanceof Error
          ? error.message
          : "Unable to read the PDF. It might be encrypted or corrupted.";
    }

    // If basic extraction failed or returned minimal text, try OCR with Firecrawl
    if (!extractedText || extractedText.trim().length < 20) {
      try {
        console.log("[docmanagement] Basic extraction failed, attempting OCR with Firecrawl...");
        const ocrResult = await extractPdfTextWithOCR(blobResult.url);
        extractedText = ocrResult.text;
        usedOCR = true;
        extractionError = null; // Clear previous error since OCR succeeded
        console.log(`[docmanagement] OCR successful, extracted ${extractedText.length} characters`);
      } catch (ocrError) {
        console.error("[docmanagement] OCR extraction failed:", ocrError);
        extractionError =
          extractionError ??
          "No searchable text detected. The PDF may be scanned without OCR or password protected.";

        await updateContextFileContent({
          id: contextRecord.id,
          status: "failed",
          errorMessage: extractionError,
        });

        return NextResponse.json(
          {
            contextFileId: contextRecord.id,
            fileName: safeName,
            size: file.size,
            status: "needs_ocr",
            warnings: [extractionError],
          },
          { status: 200 }
        );
      }
    }

    const tokenEstimate = estimateTokens(extractedText);

    try {
      await updateContextFileContent({
        id: contextRecord.id,
        extractedText,
        tokenCount: tokenEstimate,
        status: "ready",
      });
    } catch (updateError) {
      console.error("[docmanagement] Failed to update context file after upload:", {
        contextRecordId: contextRecord.id,
        extractedTextLength: extractedText.length,
        tokenEstimate,
        error: updateError instanceof Error ? updateError.message : String(updateError),
        stack: updateError instanceof Error ? updateError.stack : undefined,
      });

      // Still return error to user since the file won't be usable
      return NextResponse.json(
        {
          error: "Failed to process the PDF content. Please try uploading again.",
          details: updateError instanceof Error ? updateError.message : "Unknown error"
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      contextFileId: contextRecord.id,
      fileName: safeName,
      size: file.size,
      status: "ready",
      tokenEstimate,
      usedOCR,
      warnings: extractionError ? [extractionError] : [],
    });
  } catch (error) {
    console.error("[docmanagement] PDF upload error", error);
    return NextResponse.json(
      { error: "Failed to upload and analyse the PDF." },
      { status: 500 }
    );
  }
}

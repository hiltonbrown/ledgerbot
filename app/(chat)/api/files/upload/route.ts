import type { PutBlobResult } from "@vercel/blob";
import { put } from "@vercel/blob";
import { after, NextResponse } from "next/server";
import { z } from "zod";

import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { createContextFile, saveChatIfNotExists } from "@/lib/db/queries";
import { processContextFile } from "@/lib/files/context-processor";
import {
  extractCsvData,
  extractDocxText,
  extractPdfText,
  extractXlsxData,
} from "@/lib/files/parsers";

// Required for after() to work
export const dynamic = "force-dynamic";

const SUPPORTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
];

const FileSchema = z.object({
  file: z
    .instanceof(Blob)
    .refine((file) => file.size <= 10 * 1024 * 1024, {
      message: "File size should be less than 10MB",
    })
    .refine((file) => SUPPORTED_TYPES.includes(file.type), {
      message:
        "File type not supported. Allowed formats: PNG, JPG, GIF, WebP, PDF, DOCX, XLSX, CSV",
    }),
});

async function extractDocumentText(file: Blob, contentType: string) {
  try {
    if (contentType === "application/pdf") {
      return { extractedText: await extractPdfText(file) };
    }

    if (contentType.includes("wordprocessingml")) {
      return { extractedText: await extractDocxText(file) };
    }

    if (contentType.includes("spreadsheetml")) {
      return { extractedText: await extractXlsxData(file) };
    }

    if (contentType === "text/csv") {
      return { extractedText: await extractCsvData(file) };
    }

    return { extractedText: "" };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to process file";
    return { extractedText: "", error: message };
  }
}

export async function POST(request: Request) {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (request.body === null) {
    return new Response("Request body is empty", { status: 400 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as Blob;
    const chatIdRaw = formData.get("chatId") as string | null;

    // Validate chatId - ensure it's either null or a non-empty string
    const chatId = chatIdRaw && chatIdRaw.trim() !== "" ? chatIdRaw : null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const validatedFile = FileSchema.safeParse({ file });

    if (!validatedFile.success) {
      const errorMessage = validatedFile.error.issues
        .map((issue) => issue.message)
        .join(", ");

      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    // Get filename from formData since Blob doesn't have name property
    const filename = (formData.get("file") as File).name;
    const fileBuffer = await file.arrayBuffer();

    // Create chat if provided (if it doesn't exist)
    // This ensures the file can be linked to the chat even if the chat hasn't been created yet
    let validChatId: string | undefined;
    if (chatId) {
      try {
        await saveChatIfNotExists({
          id: chatId,
          userId: user.id,
          title: "New Chat",
          visibility: "private",
        });
        validChatId = chatId;
      } catch (error) {
        console.error(`Failed to create chat ${chatId}:`, error);
        // Continue without associating with chat
      }
    }

    // Upload to blob storage
    const blobPath = `context-files/${user.id}/${Date.now()}-${filename}`;
    let blobData: PutBlobResult;
    try {
      blobData = await put(blobPath, fileBuffer, {
        access: "public",
      });
    } catch (_error) {
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    // Save to database
    let record;
    try {
      [record] = await createContextFile({
        userId: user.id,
        chatId: validChatId,
        name: blobData.pathname,
        originalName: filename,
        blobUrl: blobData.url,
        fileType: file.type,
        fileSize: file.size,
      });
    } catch (error) {
      console.error("Failed to save file to database:", error);
      return NextResponse.json(
        { error: "Failed to save file metadata" },
        { status: 500 }
      );
    }

    // Process file asynchronously
    after(() => processContextFile(record.id, blobData.url, file.type));

    // Extract text content for all file types (available as context)
    const { extractedText, error: processingError } = await extractDocumentText(
      file,
      file.type
    );

    // Return standard attachment response for all file types
    return NextResponse.json({
      ...blobData,
      contentType: file.type,
      extractedText,
      fileSize: file.size,
      processingError,
    });
  } catch (error) {
    console.error("File upload error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}

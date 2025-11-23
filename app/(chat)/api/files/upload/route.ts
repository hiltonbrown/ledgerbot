import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { getChatById, saveChat, saveDocument } from "@/lib/db/queries";
import {
  extractCsvData,
  extractDocxText,
  extractPdfText,
  extractXlsxData,
} from "@/lib/files/parsers";
import { generateUUID } from "@/lib/utils";

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
    let chatId = formData.get("chatId") as string | null;
    const visibility = (formData.get("visibility") as string) || "private";

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

    // Check if this is a spreadsheet
    const isSpreadsheet =
      file.type === "text/csv" || file.type.includes("spreadsheetml");

    // Upload to blob storage
    let blobData;
    try {
      blobData = await put(`${filename}`, fileBuffer, {
        access: "public",
      });
    } catch (_error) {
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    // Extract text content
    const { extractedText, error: processingError } =
      await extractDocumentText(file, file.type);

    // For spreadsheets, create everything server-side
    if (isSpreadsheet && extractedText && !processingError) {
      try {
        // Generate IDs
        const documentId = generateUUID();

        // Ensure chat exists (create if needed)
        if (!chatId) {
          chatId = generateUUID();
        }

        const existingChat = await getChatById({ id: chatId });
        if (!existingChat) {
          await saveChat({
            id: chatId,
            userId: user.id,
            title: "New Chat",
            visibility: visibility as "private" | "public",
          });
          console.log("[files/upload] Created chat:", chatId);
        }

        // Extract title from filename
        const baseName = filename.replace(/\.[^.]+$/, "") || "Imported Spreadsheet";
        const title =
          baseName.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim() ||
          "Imported Spreadsheet";

        // Create document with spreadsheet content
        await saveDocument({
          id: documentId,
          title,
          kind: "sheet",
          content: extractedText,
          userId: user.id,
          chatId,
        });
        console.log("[files/upload] Created document:", documentId);

        // NOTE: No assistant message needed - spreadsheet artifact will be visible
        // and user can start asking questions immediately

        // Return spreadsheet-specific response
        return NextResponse.json({
          ...blobData,
          contentType: file.type,
          extractedText,
          fileSize: file.size,
          // Spreadsheet-specific fields
          isSpreadsheet: true,
          chatId,
          documentId,
          title,
        });
      } catch (error) {
        console.error("[files/upload] Failed to create spreadsheet:", error);
        // Fall back to returning basic upload response
        return NextResponse.json({
          ...blobData,
          contentType: file.type,
          extractedText,
          fileSize: file.size,
          processingError: "Failed to create spreadsheet document",
        });
      }
    }

    // For non-spreadsheet files, return basic response
    return NextResponse.json({
      ...blobData,
      contentType: file.type,
      extractedText,
      fileSize: file.size,
      processingError,
    });
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}

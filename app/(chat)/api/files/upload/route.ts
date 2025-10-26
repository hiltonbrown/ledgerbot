import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthUser } from "@/lib/auth/clerk-helpers";
import {
  extractDocxText,
  extractPdfText,
  extractXlsxData,
} from "@/lib/files/parsers";

const SUPPORTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

const FileSchema = z.object({
  file: z
    .instanceof(Blob)
    .refine((file) => file.size <= 10 * 1024 * 1024, {
      message: "File size should be less than 10MB",
    })
    .refine((file) => SUPPORTED_TYPES.includes(file.type), {
      message:
        "File type not supported. Allowed formats: PNG, JPG, GIF, WebP, PDF, DOCX, XLSX",
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

    try {
      const data = await put(`${filename}`, fileBuffer, {
        access: "public",
      });

      const { extractedText, error: processingError } =
        await extractDocumentText(file, file.type);

      return NextResponse.json({
        ...data,
        contentType: file.type,
        extractedText,
        fileSize: file.size,
        processingError,
      });
    } catch (_error) {
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}

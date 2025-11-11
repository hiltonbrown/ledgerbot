import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/clerk-helpers";

const SUPPORTED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * POST /api/agents/ap/upload
 *
 * Upload invoice files (PDF or images) for AP agent processing
 *
 * Returns the uploaded file URL which can be passed to extractInvoiceData tool
 */
export async function POST(request: Request) {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File exceeds maximum size of 10MB" },
        { status: 400 }
      );
    }

    if (!SUPPORTED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: `File type not supported. Supported types: ${SUPPORTED_TYPES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Upload to Vercel Blob storage
    const fileBuffer = await file.arrayBuffer();
    const blobPath = `ap-invoices/${user.id}/${Date.now()}-${file.name}`;

    console.log(`[AP Agent] Uploading invoice: ${file.name} (${file.type})`);

    const blob = await put(blobPath, fileBuffer, {
      access: "public",
      addRandomSuffix: false,
    });

    console.log(`[AP Agent] Invoice uploaded successfully: ${blob.url}`);

    // Determine file type category
    const fileType = file.type.startsWith("image/") ? "image" : "pdf";

    return NextResponse.json({
      success: true,
      fileUrl: blob.url,
      fileName: file.name,
      fileType,
      fileSize: file.size,
      mimeType: file.type,
    });
  } catch (error) {
    console.error("[AP Agent] Invoice upload failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to upload invoice file",
      },
      { status: 500 }
    );
  }
}

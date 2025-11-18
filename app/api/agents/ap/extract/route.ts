import { NextResponse } from "next/server";
import { extractInvoiceData } from "@/lib/agents/ap/tools";
import { getAuthUser } from "@/lib/auth/clerk-helpers";

export const maxDuration = 60;

/**
 * POST /api/agents/ap/extract
 *
 * Directly extracts invoice data from an uploaded file using AI Vision.
 * This endpoint is called immediately after file upload to populate the form.
 *
 * Request body:
 * {
 *   fileUrl: string,
 *   fileType: "pdf" | "image",
 *   model?: string (optional, defaults to "anthropic-claude-sonnet-4-5")
 * }
 */
export async function POST(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return new NextResponse("Not authenticated", { status: 401 });
    }

    const { fileUrl, fileType, model } = await req.json();

    if (!fileUrl || !fileType) {
      return new NextResponse("Missing fileUrl or fileType", { status: 400 });
    }
    if (fileType !== "pdf" && fileType !== "image") {
      return new NextResponse("Invalid fileType. Must be 'pdf' or 'image'.", {
        status: 400,
      });
    }

    // Use provided model or default to Claude Sonnet
    const modelId = model || "anthropic-claude-sonnet-4-5";

    console.log(
      `[AP Extract] Extracting invoice data from ${fileType} at ${fileUrl} using model ${modelId}`
    );

    // Call the extraction function with the specified model
    const result = await extractInvoiceData(fileUrl, fileType, modelId);

    console.log("[AP Extract] Extraction result:", result);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[AP Extract] Error extracting invoice data:", error);
    return new NextResponse(
      error instanceof Error ? error.message : "Failed to extract invoice data",
      { status: 500 }
    );
  }
}

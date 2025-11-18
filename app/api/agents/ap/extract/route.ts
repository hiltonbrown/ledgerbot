import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { extractInvoiceData } from "@/lib/agents/ap/tools";

export const maxDuration = 60;

/**
 * POST /api/agents/ap/extract
 *
 * Directly extracts invoice data from an uploaded file using Claude Vision.
 * This endpoint is called immediately after file upload to populate the form.
 *
 * Request body:
 * {
 *   fileUrl: string,
 *   fileType: "pdf" | "image"
 * }
 */
export async function POST(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return new NextResponse("Not authenticated", { status: 401 });
    }

    const { fileUrl, fileType } = await req.json();

    if (!fileUrl || !fileType) {
      return new NextResponse("Missing fileUrl or fileType", { status: 400 });
    }

    console.log(`[AP Extract] Extracting invoice data from ${fileType} at ${fileUrl}`);

    // Call the extraction function directly
    const result = await extractInvoiceData(fileUrl, fileType);

    console.log(`[AP Extract] Extraction result:`, result);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[AP Extract] Error extracting invoice data:", error);
    return new NextResponse(
      error instanceof Error ? error.message : "Failed to extract invoice data",
      { status: 500 }
    );
  }
}

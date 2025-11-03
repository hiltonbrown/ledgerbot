import { updateContextFileContent } from "@/lib/db/queries";

import {
  extractCsvData,
  extractDocxText,
  extractPdfText,
  extractXlsxData,
} from "./parsers";

function estimateTokenCount(text: string | null | undefined): number {
  if (!text) {
    return 0;
  }
  return Math.ceil(text.length / 4);
}

export async function processContextFile(
  fileId: string,
  blobUrl: string,
  fileType: string
) {
  try {
    const response = await fetch(blobUrl);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.status}`);
    }

    const blob = await response.blob();
    let extractedText = "";

    if (fileType === "application/pdf") {
      extractedText = await extractPdfText(blob);
    } else if (fileType.includes("wordprocessingml")) {
      extractedText = await extractDocxText(blob);
    } else if (fileType.includes("spreadsheetml")) {
      extractedText = await extractXlsxData(blob);
    } else if (fileType === "text/csv") {
      extractedText = await extractCsvData(blob);
    } else if (fileType.startsWith("image/")) {
      extractedText = "";
    }

    await updateContextFileContent({
      id: fileId,
      extractedText: extractedText || undefined,
      tokenCount: estimateTokenCount(extractedText),
      status: "ready",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await updateContextFileContent({
      id: fileId,
      status: "failed",
      errorMessage: message,
    });
  }
}

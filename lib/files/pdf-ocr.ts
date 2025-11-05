/**
 * PDF OCR extraction using Firecrawl API
 * Fallback for scanned PDFs that don't have searchable text layers
 */

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
const FIRECRAWL_API_URL = "https://api.firecrawl.dev/v2/scrape";

export type OCRResult = {
  text: string;
  pageCount?: number;
  metadata?: {
    title?: string;
    author?: string;
  };
};

/**
 * Extract text from a PDF using Firecrawl's OCR capabilities
 * @param pdfUrl - Public URL to the PDF file (must be accessible)
 * @returns Extracted text content
 */
export async function extractPdfTextWithOCR(
  pdfUrl: string
): Promise<OCRResult> {
  if (!FIRECRAWL_API_KEY) {
    throw new Error(
      "FIRECRAWL_API_KEY environment variable is not set. OCR extraction requires Firecrawl API access."
    );
  }

  try {
    const response = await fetch(FIRECRAWL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
      },
      body: JSON.stringify({
        url: pdfUrl,
        formats: ["markdown"],
        parsers: [
          {
            type: "pdf",
            maxPages: 10_000, // Support large documents
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Firecrawl API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    if (!data.success || !data.data) {
      throw new Error(
        `Firecrawl returned unsuccessful response: ${JSON.stringify(data)}`
      );
    }

    const markdown = data.data.markdown || "";
    const metadata = data.data.metadata || {};

    if (!markdown || markdown.trim().length < 10) {
      throw new Error(
        "Firecrawl OCR returned minimal or no text. The PDF may be password protected or corrupted."
      );
    }

    return {
      text: markdown,
      metadata: {
        title: metadata.title,
        author: metadata.author,
      },
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`OCR extraction failed: ${error.message}`);
    }
    throw new Error("OCR extraction failed with unknown error");
  }
}

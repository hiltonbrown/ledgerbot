# PDF OCR Implementation

## Overview

The LedgerBot document management agent now supports automatic OCR (Optical Character Recognition) for scanned PDFs and image-based PDF files using Firecrawl's document parsing API.

## Problem

Previously, when users uploaded scanned PDFs (images without embedded text layers) to the `/agents/docmanagement` agent, the system would fail with the error:

```
"No searchable text detected. The PDF may be scanned without OCR or password protected."
```

This occurred because the basic Node.js text extraction (`lib/files/parsers.ts`) can only read PDFs with embedded text layers. Scanned documents (photos of receipts, invoices, bank statements) would fail extraction.

## Solution

### Architecture

We implemented a **two-tier extraction strategy**:

1. **Primary Extraction**: Fast, local PDF text extraction using Node.js buffer parsing
2. **Fallback OCR**: If primary extraction fails (< 20 characters), automatically use Firecrawl's OCR-enabled document parsing

### Implementation Files

#### 1. OCR Module (`lib/files/pdf-ocr.ts`)

New module that wraps Firecrawl's `/v2/scrape` API endpoint with PDF parser:

```typescript
export async function extractPdfTextWithOCR(pdfUrl: string): Promise<OCRResult>
```

**Features:**
- Accepts public Vercel Blob URLs
- Configures Firecrawl with `parsers: [{ type: "pdf", maxPages: 10000 }]`
- Returns extracted text in markdown format
- Includes metadata (title, author if available)
- Comprehensive error handling

**Requirements:**
- `FIRECRAWL_API_KEY` environment variable must be set
- PDF must be publicly accessible (Vercel Blob URLs work)

#### 2. Upload Route (`app/api/pdf/upload/route.ts`)

Updated the PDF upload endpoint to:

1. Upload PDF to Vercel Blob storage
2. Attempt basic text extraction
3. If extraction fails or returns < 20 characters:
   - Call `extractPdfTextWithOCR()` with the blob URL
   - Log OCR attempt and results
   - Set `usedOCR = true` flag in response
4. Save extracted text to database
5. Return status with OCR indicator

**Response Schema:**
```typescript
{
  contextFileId: string;
  fileName: string;
  size: number;
  status: "ready" | "needs_ocr";
  tokenEstimate?: number;
  usedOCR?: boolean;  // NEW: indicates OCR was used
  warnings?: string[];
}
```

#### 3. Frontend (`app/agents/docmanagement/page.tsx`)

Enhanced UI to show OCR success:

- Added `usedOCR` field to `UploadResponse` type
- When `usedOCR === true`, displays informational message:
  ```
  "This PDF was scanned or image-based. Text was successfully extracted using OCR."
  ```
- Improved error messages for truly failed extractions

### User Experience Flow

#### Before (Scanned PDF Upload):
1. User uploads scanned invoice
2. ❌ Error: "No searchable text detected. The PDF may be scanned without OCR or password protected."
3. User confused, workflow blocked

#### After (Scanned PDF Upload):
1. User uploads scanned invoice
2. System detects no embedded text
3. 🔄 Automatically attempts OCR extraction via Firecrawl
4. ✅ Success: Text extracted, displays info message
5. Summarization workflow proceeds normally

### Configuration

**Required Environment Variable:**
```bash
FIRECRAWL_API_KEY=fc-YOUR-API-KEY
```

Get your API key from: https://firecrawl.dev/

**Optional Configuration:**
- Maximum pages: Currently set to 10,000 (supports large documents)
- Text threshold: 20 characters minimum for valid extraction
- Extraction timeout: Inherits from route maxDuration (60 seconds)

### Pricing Considerations

**Firecrawl PDF Pricing:**
- 1 credit per page for PDF parsing with OCR
- Large invoices/statements typically 1-10 pages
- Example: 10-page bank statement = 10 credits

**Cost Optimization:**
- Only uses OCR when necessary (fallback)
- Most modern PDFs have embedded text (no OCR needed)
- Typical cost: 0-3 credits per document

### Technical Details

#### Text Extraction Logic

```typescript
// 1. Try basic extraction first (fast, free)
try {
  extractedText = await extractPdfText(file);
} catch (error) {
  extractionError = error.message;
}

// 2. If failed or minimal text, use OCR (slower, costs credits)
if (!extractedText || extractedText.trim().length < 20) {
  try {
    const ocrResult = await extractPdfTextWithOCR(blobUrl);
    extractedText = ocrResult.text;
    usedOCR = true;
  } catch (ocrError) {
    // Both methods failed - return error
    return { status: "needs_ocr", warnings: [...] };
  }
}
```

#### OCR API Call

```typescript
POST https://api.firecrawl.dev/v2/scrape
Authorization: Bearer fc-YOUR-API-KEY
Content-Type: application/json

{
  "url": "https://blob.vercel-storage.com/docmanagement/user-123/invoice.pdf",
  "formats": ["markdown"],
  "parsers": [{
    "type": "pdf",
    "maxPages": 10000
  }]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "markdown": "# Invoice\\n\\nAmount: $1,234.56\\nDate: 2025-01-04...",
    "metadata": {
      "title": "Invoice #12345",
      "author": "Acme Corp"
    }
  }
}
```

### Error Handling

The system handles multiple failure scenarios:

1. **Missing API Key**
   - Error: "FIRECRAWL_API_KEY environment variable is not set"
   - Status: 500 Internal Server Error

2. **OCR Extraction Fails**
   - Both basic and OCR extraction attempted
   - Error: "No searchable text detected. The PDF may be password protected or corrupted."
   - Status: 200 with `status: "needs_ocr"`

3. **Firecrawl API Error**
   - Network issues, rate limits, invalid URL
   - Logged to console with full error details
   - Falls back to standard error message

4. **Minimal Text Extraction**
   - OCR succeeds but returns < 10 characters
   - Treated as failed extraction
   - Error: "Firecrawl OCR returned minimal or no text"

### Testing

**Manual Testing Steps:**

1. **Scanned PDF Test:**
   ```
   1. Navigate to /agents/docmanagement
   2. Upload a scanned invoice/receipt (image-based PDF)
   3. Verify: "This PDF was scanned... Text was successfully extracted using OCR"
   4. Verify: Summarization proceeds normally
   ```

2. **Regular PDF Test:**
   ```
   1. Upload a regular PDF with embedded text
   2. Verify: No OCR message displayed
   3. Verify: Fast extraction (< 1 second)
   ```

3. **Encrypted PDF Test:**
   ```
   1. Upload password-protected PDF
   2. Verify: Error message about password protection
   3. Verify: No infinite retry loops
   ```

**Expected Logs:**

```
[docmanagement] Basic extraction failed, attempting OCR with Firecrawl...
[docmanagement] OCR successful, extracted 1247 characters
```

### Future Enhancements

Potential improvements for future releases:

1. **Progress Indicators**: Show "Performing OCR..." message during extraction
2. **Cost Tracking**: Track OCR credits used per user/organization
3. **Batch OCR**: Process multiple scanned PDFs in parallel
4. **Quality Settings**: Allow users to choose OCR quality vs. speed
5. **Language Detection**: Pass document language hint to improve accuracy
6. **Alternative OCR Providers**: Support for Azure Form Recognizer, AWS Textract
7. **Pre-processing**: Image enhancement before OCR for better accuracy

### Monitoring

**Key Metrics to Monitor:**

- OCR fallback rate (% of PDFs requiring OCR)
- OCR success rate (% of fallbacks that succeed)
- Average OCR processing time
- Firecrawl API error rate
- Credit consumption per month

**Logging:**

All OCR attempts are logged with:
- Timestamp
- User ID (from blob path)
- Success/failure status
- Character count extracted
- Error messages (if any)

### Troubleshooting

**Common Issues:**

1. **"FIRECRAWL_API_KEY environment variable is not set"**
   - Solution: Add `FIRECRAWL_API_KEY` to `.env.local` and restart server

2. **"Firecrawl API error (401): Unauthorized"**
   - Solution: Verify API key is correct and active

3. **"Firecrawl API error (429): Too Many Requests"**
   - Solution: Upgrade Firecrawl plan or implement rate limiting

4. **OCR takes too long (timeout)**
   - Solution: Increase `maxDuration` in route.ts or split large PDFs

5. **Extracted text is garbled/incorrect**
   - Cause: Low-quality scan or unusual fonts
   - Solution: Ask user to rescan at higher resolution

### References

- [Firecrawl Document Parsing Docs](https://docs.firecrawl.dev/features/document-parsing)
- [Firecrawl Scrape API Reference](https://docs.firecrawl.dev/api-reference/endpoint/scrape)
- [Vercel Blob Storage Docs](https://vercel.com/docs/storage/vercel-blob)

## Summary

✅ **What was fixed:**
- Scanned PDFs now work automatically with OCR fallback
- No manual OCR preprocessing required by users
- Seamless experience with informational messaging

✅ **What changed:**
- New `lib/files/pdf-ocr.ts` module
- Updated `app/api/pdf/upload/route.ts` with fallback logic
- Enhanced `app/agents/docmanagement/page.tsx` UI feedback
- Added `FIRECRAWL_API_KEY` environment variable requirement

✅ **Benefits:**
- Higher success rate for document processing
- Better user experience (no manual intervention)
- Supports real-world accounting documents (receipts, invoices, statements)
- Maintains fast performance for regular PDFs (no OCR overhead)

# Document Management Agent - Technical Architecture

**Version**: 1.0
**Last Updated**: 8 November 2024
**Audience**: Developers, System Engineers, Technical Staff

> **Other Documentation**: See also [User Guide](./docmanagement-user-guide.md), [Integration Guide](./docmanagement-integration-guide.md), [Development Guide](./docmanagement-development-guide.md)

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Document Lifecycle](#document-lifecycle)
3. [Storage and Quotas](#storage-and-quotas)
4. [Text Extraction Process](#text-extraction-process)
5. [Document Processing Pipeline](#document-processing-pipeline)

---

## System Architecture

### Overview of Components

The Document Management Agent consists of several interconnected systems:

1. **Frontend User Interface**: The web page you interact with, built with React and Next.js
2. **File Upload Service**: Handles file transfers from your browser to cloud storage
3. **Context File Database**: Stores metadata about uploaded documents
4. **Text Extraction Pipeline**: Converts PDFs into searchable text
5. **AI Summarisation Engine**: Analyses documents and generates summaries
6. **Chat Service**: Powers the interactive Q&A feature
7. **Integration Layer**: Connects to Xero and other LedgerBot features

Think of it as an assembly line where each station has a specific job, and the document moves through each station getting processed step by step.

### How Components Communicate

**User → Frontend:**
When you upload a document, your browser sends it to the LedgerBot server using a secure HTTPS connection.

**Frontend → Upload Service:**
The upload service receives the file, validates it (checking file type and size), and uploads it to Vercel Blob Storage (a cloud file storage system similar to Amazon S3).

**Upload Service → Database:**
Once the file is stored, a record is created in the PostgreSQL database in the "ContextFile" table. This record includes:
- Your user ID (so the file is private to you)
- File name and original name
- File size and type
- URL where the file is stored in cloud storage
- Status (initially "processing")
- Timestamps (when created, when last used)

**Database → Text Extraction:**
After the database record is created, an asynchronous job is triggered to process the file. This uses Next.js's "after" hook, which means the job runs in the background without making you wait.

**Text Extraction → AI Engine:**
Once text is extracted, it's passed to the AI engine (using the Vercel AI SDK and your configured model, like Claude Sonnet or GPT-5).

**AI Engine → Database:**
The AI's output (summary, sections, highlights) is stored back in the database, and the file status is updated to "ready".

**Frontend → Chat Service:**
When you click "Sync PDF", a separate service indexes the document for chat. This creates a vector representation of the text that enables semantic search.

**Chat Service ← → AI Engine:**
When you ask a question, the chat service finds relevant sections of the document and sends them along with your question to the AI engine, which generates an answer.

### Data Flow Diagram (Described)

Imagine a flowchart with these stages:

```
[User Browser]
   ↓ (uploads PDF)
[Upload Validation]
   ↓ (if valid)
[Cloud Storage] ← (stores file)
   ↓ (returns URL)
[Database] ← (creates record with URL)
   ↓ (triggers async)
[Text Extraction] ← (downloads from storage URL)
   ↓ (extracts text)
[Token Counter] ← (measures text length)
   ↓ (sends text to AI)
[AI Summarisation] ← (analyses document)
   ↓ (generates output)
[Database] ← (stores summary, sections)
   ↓ (updates status to "ready")
[User Browser] ← (polls for status, displays summary)

Separately, for chat:

[User] → [Click "Sync PDF"]
   ↓
[Chat Index Service] ← (downloads text, creates vectors)
   ↓ (ready for questions)
[User] → [Asks question]
   ↓
[Chat Service] ← (finds relevant sections)
   ↓ (combines with question)
[AI Engine] ← (generates answer)
   ↓ (streams response)
[User Browser] ← (displays answer in real-time)
```

### Technology Stack

**Frontend:**
- React (JavaScript library for building interactive interfaces)
- Next.js (React framework with server-side capabilities)
- TypeScript (typed version of JavaScript for better code quality)
- Tailwind CSS (utility-first CSS framework for styling)
- Shadcn UI (React component library for consistent design)

**Backend:**
- Next.js API Routes (serverless functions for handling requests)
- Vercel Blob (cloud object storage for files)
- PostgreSQL (relational database for metadata and user data)
- Drizzle ORM (database query builder for type-safe SQL)

**AI Processing:**
- Vercel AI SDK (library for working with AI models)
- AI Gateway (router for multiple AI providers: Anthropic, OpenAI, Google, xAI)
- PDF.js (PDF parsing library for text extraction)
- Mammoth (DOCX text extraction library)
- SheetJS (XLSX spreadsheet parsing library)

**Chat Indexing:**
- PDF parsing for page-level content extraction
- Section identification using AI-powered analysis
- Conversation state management with optional Redis caching

### Deployment Architecture

LedgerBot runs on Vercel's edge network, which means:

**Edge Functions:**
Your upload requests are handled by servers geographically close to you, reducing latency.

**Serverless Processing:**
Processing jobs (text extraction, AI analysis) run as serverless functions that scale automatically based on demand.

**Cloud Storage:**
Files are stored in Vercel Blob, which replicates data across multiple regions for reliability.

**Database:**
The PostgreSQL database is hosted on a managed service (likely Vercel Postgres or a similar provider), ensuring automatic backups and high availability.

This architecture means:
- Fast upload and download speeds
- Automatic scaling during busy periods
- High reliability and data durability
- No servers to maintain or manage

---

## Document Lifecycle

Let's follow a single document through its entire lifecycle in the system, from upload to eventual deletion.

### Phase 1: Creation

**Trigger**: You click the upload area and select a PDF file.

**What happens:**
1. Browser reads the file from your computer
2. JavaScript validates the file type and size before sending
3. File is uploaded via HTTPS POST request to `/api/pdf/upload`
4. Server validates again (never trust client-side validation alone)
5. Quota check: "Does this user have space for another file?"
6. If checks pass, file is uploaded to Vercel Blob Storage
7. Blob Storage returns a unique URL (like a receipt)
8. Database record created in `ContextFile` table with status "processing"
9. Response sent to browser with file metadata

**Status at end of phase**: File exists in storage, database shows "processing"

### Phase 2: Text Extraction

**Trigger**: Immediately after creation, an async job starts.

**What happens:**
1. Processing job downloads the file from Blob Storage using the URL
2. File type is detected (PDF, DOCX, XLSX, or image)
3. Appropriate extraction method is used:
   - **PDF with text**: Text is extracted directly from PDF structure
   - **PDF without text (scanned)**: OCR engine reads text from page images
   - **DOCX**: XML content is parsed and formatted text extracted
   - **XLSX**: Cell values are read and formatted as rows and columns
   - **Images**: OCR engine reads text from image
4. Extracted text is stored temporarily in memory
5. Token count is calculated (length of text divided by approximately 4 characters per token)
6. Database updated with `extractedText` and `tokenCount`, status remains "processing"

**Status at end of phase**: Text is extracted and stored, ready for AI analysis.

### Phase 3: AI Summarisation

**Trigger**: User sees "Summarising..." and processing begins.

**What happens:**
1. Frontend sends a request to `/api/pdf/summarize` with the context file ID
2. Server loads the extracted text from the database
3. A specialised AI prompt is constructed that includes:
   - Instructions to focus on accounting and compliance
   - The full document text
   - Australian tax context (GST, ATO references)
   - Request for structured output (summary, highlights, sections)
4. Request sent to AI provider via AI Gateway (could be Claude, GPT-5, or Gemini depending on settings)
5. AI processes the text and returns structured JSON with:
   - Overall summary paragraph
   - Bullet point highlights
   - Array of sections, each with title, summary, key facts, compliance signals
   - Identified monetary amounts
6. Results are stored in the database
7. Status updated to "ready"
8. Response streamed back to frontend with progress updates

**Status at end of phase**: Summary and sections visible to user, document ready for chat.

### Phase 4: Question Generation

**Trigger**: After summarisation completes, question generation starts.

**What happens:**
1. Request sent to `/api/pdf/questions` with summary and sections
2. AI analyses the content and identifies information gaps or ambiguities
3. AI generates relevant questions based on:
   - Missing information (e.g., "What is the supplier's payment method?")
   - Compliance verifications (e.g., "Is this expense GST-claimable?")
   - Reconciliation needs (e.g., "Have we already paid this invoice?")
4. Each question includes:
   - The question text
   - Rationale (why it's being asked)
   - Category (compliance, clarification, reconciliation)
   - Timing (when to ask: immediate, during review, at month-end)
5. Questions stored and displayed in the UI

**Status at end of phase**: Suggested questions available for user to review.

### Phase 5: Chat Indexing

**Trigger**: User clicks "Sync PDF" button.

**What happens:**
1. Request sent to `/api/agents/docmanagement` with mode "load"
2. PDF is parsed page-by-page
3. Each page's text is extracted and associated with a page number
4. Sections are mapped to page ranges
5. A document index is created linking:
   - Section IDs to page ranges
   - Key entities (amounts, dates, names) to locations
   - Compliance signals to source sections
6. Index stored in Redis cache (if Redis is configured) or in memory
7. Chat agent marked as "ready"

**Status at end of phase**: Document fully indexed, chat questions can be answered.

### Phase 6: Interactive Chat

**Trigger**: User types a question and clicks "Ask".

**What happens:**
1. Question sent to `/api/agents/docmanagement` with mode "chat"
2. Chat service performs semantic search to find relevant sections:
   - User's question is analysed for intent and key entities
   - Sections are scored for relevance to the question
   - Top 2-3 most relevant sections are selected
3. AI prompt is constructed with:
   - Document summary (for overall context)
   - Selected section excerpts (for specific details)
   - Chat history (for conversation continuity)
   - User's question
4. Request sent to AI provider
5. AI generates an answer based on the provided context
6. Answer streamed back to user in real-time (word-by-word)
7. Source sections are tagged in the response
8. Chat history updated with question and answer

**Status at end of phase**: Question answered, conversation history extended.

**Conversation Caching:**
If Redis is configured, the conversation (messages, summary, document ID) is cached for the current session. This allows you to refresh the page and continue where you left off.

### Phase 7: Dormancy

**What happens over time:**
- Document remains in storage and database indefinitely
- `lastUsedAt` timestamp is updated each time you view or interact with it
- Files that haven't been used in a long time may be flagged for archival (future feature)
- Storage quota is continuously enforced; you can't upload new files if over quota

### Phase 8: Deletion

**Trigger**: User deletes the file (future feature) or administrator purges old files.

**What happens:**
1. Database record is marked for deletion
2. File is removed from Vercel Blob Storage
3. Any cached conversation data is cleared from Redis
4. Database record is either permanently deleted or soft-deleted (marked inactive)
5. User's storage quota is updated to reflect freed space

**Status at end of phase**: Document no longer exists, space reclaimed.

---

## Storage and Quotas

Understanding how storage works helps you manage your files effectively and avoid hitting limits.

### Storage Quota System

Every LedgerBot user has two types of limits:

**File Count Limit:**
The maximum number of context files you can have uploaded at once. For example, a regular user might have a limit of 50 files.

**Storage Size Limit:**
The maximum total size of all your files combined. For example, a regular user might have 500MB of total storage.

**Why both limits exist:**
- File count prevents users from uploading thousands of tiny files, which strains database queries
- Size limit prevents users from uploading gigantic files, which strains storage costs

### How Quotas Are Enforced

**Before Upload:**
When you upload a file, the system checks:
1. "Does this user have fewer than their max file count?" If no, upload rejected.
2. "Will adding this file's size exceed the storage limit?" If yes, upload rejected.
3. Only if both checks pass does the upload proceed.

**During Upload:**
- Once the file is uploaded to storage, the database is updated immediately
- Your used storage and file count increase instantly
- This prevents race conditions where multiple uploads could exceed limits

**Quota Visibility:**
You can see your current usage at Settings > Files:
- "Used: 247 MB of 500 MB (49%)"
- "Files: 23 of 50"

### Storage Calculation

**What counts toward your quota:**
- All context files (documents uploaded via Document Management Agent, general file uploads, etc.)
- File size is the original uploaded file size (not the extracted text size)

**What doesn't count:**
- Chat messages and conversation history
- User settings and preferences
- Database records and metadata (these are tiny)

**Compression:**
Files are stored in their original format, not compressed. If you upload a 5MB PDF, it uses 5MB of quota even if it could be compressed to 2MB.

### Managing Your Quota

**Check Usage Regularly:**
Visit Settings > Files to monitor your storage consumption before hitting limits.

**Delete Processed Documents:**
Once you've extracted the summary and notes you need, delete the original if you have a copy elsewhere.

**Prioritise Important Files:**
Upload documents that benefit most from AI analysis (complex invoices, lengthy contracts), and process simple receipts manually.

**Optimise File Sizes:**
- Reduce PDF scan resolution (300 DPI is sufficient for text)
- Remove unnecessary pages (e.g., blank pages, advertising)
- Compress PDFs using tools like Adobe Acrobat or online compressors

**Archive Old Files:**
If you have documents from months ago that you no longer need to chat with, delete them from LedgerBot and keep originals in your accounting software.

### Quota Tiers

Different account types have different quotas:

**Regular Users** (example):
- 50 context files
- 500 MB storage

**Pro Users** (example):
- 200 context files
- 2 GB storage

**Enterprise Users** (example):
- Unlimited context files
- 10 GB storage

(Note: Exact quota numbers depend on your LedgerBot subscription plan. Check Settings > Usage for your specific limits.)

### What Happens When You Hit Quota

**File Count Limit Reached:**
- Upload button may be disabled or greyed out
- If you attempt to upload anyway, you'll receive an error: "Context file limit reached"
- You must delete at least one existing file before uploading a new one

**Storage Size Limit Reached:**
- Similar behaviour: upload blocked
- Error message: "Storage quota exceeded"
- You must delete files totalling enough space for the new upload

**Temporary Over-Quota:**
It's theoretically possible to go slightly over quota if files are uploaded simultaneously (before the database updates), but the system will prevent further uploads until you're back under the limit.

### Future Quota Features

Planned enhancements include:
- Automatic archival of old files to cheaper storage tiers
- Compression of stored PDFs to save space
- Smart recommendations on which files to delete based on usage
- Quota usage visualisations and trends

---

## Text Extraction Process

Text extraction is the critical step that converts your PDF into something the AI can understand. Let's explore how this works in detail.

### Direct Text Extraction

**When used:**
For PDFs that were created digitally (e.g., invoices generated by accounting software, documents exported from Word).

**How it works:**
PDFs store text in a structured format internally. The extraction library (PDF.js) reads this structure and outputs the text in reading order.

**Advantages:**
- Very fast (seconds)
- Extremely accurate (exactly what's in the PDF)
- No additional processing needed

**Challenges:**
- Layout preservation is difficult (multi-column documents may have text extracted in the wrong order)
- Tables can be messy (cells might not extract in logical order)
- Hidden or background text might be extracted unexpectedly

### Optical Character Recognition (OCR)

**When used:**
For PDFs that are essentially images (scanned documents, photos of receipts, faxed invoices).

**How it works:**
1. Each page of the PDF is rendered as an image
2. OCR engine (likely using Tesseract OCR or a cloud-based service) analyses the image
3. Text regions are identified (distinguishing text from graphics)
4. Each text region is processed character-by-character
5. Characters are recognised using machine learning models trained on millions of examples
6. Recognised characters are assembled into words, sentences, and paragraphs
7. Text is returned with confidence scores for each word

**Advantages:**
- Enables processing of scanned and photographed documents
- Can handle handwriting (though accuracy is lower)
- Works with faxed or low-quality images

**Challenges:**
- Slower than direct extraction (15-30 seconds for multi-page documents)
- Accuracy depends on image quality (poor scans = more errors)
- Can misread similar-looking characters (0 vs O, 1 vs I, 5 vs S)
- Unusual fonts or decorative text may be missed or misread

**OCR Accuracy Factors:**

**High Accuracy (95-99%):**
- Clean, high-resolution scans (300+ DPI)
- Standard fonts (Arial, Times New Roman, etc.)
- Good contrast (black text on white background)
- No skew or rotation
- Clear, crisp text

**Medium Accuracy (85-95%):**
- Moderate resolution scans (150-300 DPI)
- Mixed fonts or sizes
- Some background noise or artifacts
- Slight skew or rotation
- Faded text

**Low Accuracy (<85%):**
- Low resolution (< 150 DPI) or photos
- Handwriting or cursive fonts
- Poor contrast or colour backgrounds
- Significant skew or distortion
- Damaged or stained documents

### Token Counting

After text extraction, the text is measured in "tokens":

**What is a token?**
A token is roughly a word or part of a word. AI models process text in tokens, not characters. For English text, approximately 4 characters equal 1 token.

**Why count tokens?**
- AI processing has token limits (models can only handle a certain amount of text)
- Cost estimation (AI providers charge per token processed)
- Context window management (knowing how much text fits in a chat prompt)

**Estimation formula:**
`Token Count ≈ Text Length in Characters ÷ 4`

**Example:**
A 10-page invoice with 5,000 words might be 25,000 characters, estimated at ~6,250 tokens.

**Display:**
You'll see token estimates like "est. 6,250 tokens" in the upload metadata display. This gives you a sense of document complexity.

### Handling Extraction Failures

**What causes failures:**
- Password-protected PDFs (cannot be opened)
- Corrupted files (invalid PDF structure)
- PDFs with no text and failed OCR (completely blank scans)
- Extremely large documents (exceeding processing time limits)

**How failures are handled:**
1. Extraction attempt returns an error message
2. Database status updated to "failed"
3. Error message stored in `errorMessage` field
4. User sees an error notification in the UI

**Common error messages:**
- "Failed to extract text from PDF"
- "No searchable text detected. The PDF may be password protected or corrupted."
- "OCR processing failed. Please ensure the document is readable."

**Recovery:**
If extraction fails, you can:
- Try re-uploading the file (sometimes temporary issues resolve)
- Remove password protection from the PDF and re-upload
- Improve scan quality and re-upload
- Convert the document to a different format and then to PDF

---

## Document Processing Pipeline

Let's walk through what happens behind the scenes when you upload a document, explained in technical detail.

### Stage 1: Upload and Storage

When you select a PDF file:

1. **Client-Side Validation**: Your browser checks that the file is a PDF and under 15MB
2. **Secure Upload**: The file is uploaded to Vercel Blob Storage (a secure cloud file storage system)
3. **Database Record**: A database entry is created to track this file, including your user ID, file name, size, and storage URL
4. **Quota Checking**: The system verifies you haven't exceeded your storage quota or file count limits

Think of this like checking in a package at a post office, where the clerk weighs it, gives you a receipt, and logs it in their system.

### Stage 2: Text Extraction

Immediately after upload, text extraction begins:

1. **File Type Detection**: The system checks whether the PDF has embedded searchable text or is image-based
2. **Direct Text Extraction**: If the PDF has text (like a digitally created invoice), that text is extracted directly
3. **OCR Processing**: If the PDF is scanned or image-based (like a photographed receipt), Optical Character Recognition technology reads the text from the images
4. **Token Counting**: The extracted text is measured in "tokens" (roughly one word equals 1.3 tokens) to estimate processing cost

This is like a librarian determining whether a book needs to be retyped (OCR) or if they can just photocopy the text (direct extraction).

### Stage 3: AI Summarisation

With the text extracted, LedgerBot's AI engine processes it:

1. **Document Analysis**: The AI reads through the entire document, understanding context and structure
2. **Compliance Focus**: Using knowledge of Australian accounting standards, GST rules, and bookkeeping best practices, the AI identifies what matters
3. **Summary Generation**: A concise paragraph is created highlighting the "who, what, when, how much" of the document
4. **Highlight Extraction**: The most critical facts are pulled out as bullet points
5. **Progress Reporting**: You see real-time progress updates like "Extracting key entities...", "Analysing compliance signals...", "Generating summary..."

Imagine an experienced accountant reading through the document with a highlighter, making margin notes about important amounts and dates, then writing a brief summary at the top.

### Stage 4: Section Breakdown

Next, the document is divided into logical sections:

1. **Structure Detection**: The AI identifies natural divisions (header, line items, totals, terms, etc.)
2. **Section Summarisation**: Each section gets its own focused summary
3. **Fact Extraction**: Specific data points (dates, amounts, reference numbers) are extracted per section
4. **Compliance Annotation**: Any section with tax or regulatory implications gets flagged with compliance signals
5. **Monetary Highlighting**: Financial figures are identified and displayed prominently

This is like creating a detailed outline of a long document, with each heading having its own summary and list of key points.

### Stage 5: Question Generation

Based on the summary and sections, suggested questions are created:

1. **Content Analysis**: The AI reviews what information is present and what might be missing
2. **Question Formulation**: Relevant questions are created for follow-up actions
3. **Rationale Creation**: Each question includes an explanation of why it's being asked
4. **Categorisation**: Questions are tagged by type (compliance, clarification, reconciliation)

Think of this as a senior accountant reviewing a junior's work and writing a list of "Things to verify" and "Questions for the client".

### Stage 6: Chat Index Preparation

Finally, the document is prepared for interactive chat:

1. **Vector Indexing**: The document text is converted into a searchable format optimised for semantic search
2. **Section Mapping**: Each section is tagged with identifiers so answers can cite specific sources
3. **Agent Activation**: The chat system is notified that the document is ready for questions
4. **Conversation Initialisation**: A new conversation session is created for this document

This is like a research librarian creating a comprehensive index and cross-reference system for a new book, making it easy to find answers to specific questions later.

### Processing Time

Typical processing times:
- **Small documents** (1-2 pages, simple invoices): 30-45 seconds
- **Medium documents** (3-10 pages, detailed statements): 60-90 seconds
- **Large documents** (10+ pages, complex reports): 90-180 seconds

Factors that affect processing time:
- Document length (more pages = more processing)
- Whether OCR is needed (scanned documents take longer)
- Complexity of content (tables and multi-column layouts take longer)
- Current system load (busy times may be slightly slower)

---

**Document Version**: 1.0
**Last Updated**: 8 November 2024
**Next**: See [Integration Guide](./docmanagement-integration-guide.md) for system integrations
**Feedback**: Please send suggestions for improving this guide to docs@ledgerbot.com

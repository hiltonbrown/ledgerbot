# Document Management Agent - Development Guide

**Version**: 1.0
**Last Updated**: 8 November 2024
**Audience**: Developers, Product Managers, Engineering Teams

> **Other Documentation**: See also [User Guide](./docmanagement-user-guide.md), [Technical Architecture](./docmanagement-technical-architecture.md), [Integration Guide](./docmanagement-integration-guide.md)

---

## Table of Contents

1. [Current Implementation State](#current-implementation-state)
2. [Areas for Enhancement](#areas-for-enhancement)
3. [Technical Extension Points](#technical-extension-points)
4. [Suggested Roadmap Items](#suggested-roadmap-items)

---

## Current Implementation State

Let's be transparent about what's fully implemented, what's partially working, and what's planned for the future.

### Fully Implemented Features

✅ **PDF Upload and Storage:**
- Upload PDF files up to 15MB
- Secure storage on Vercel Blob
- Quota enforcement for file count and size
- File metadata tracking in database

✅ **Text Extraction:**
- Direct text extraction from digital PDFs
- OCR processing for scanned PDFs
- Token counting and estimation
- Error handling for extraction failures

✅ **AI Summarisation:**
- Accounting-focused summary generation
- Key highlights extraction
- Section breakdown with compliance signals
- Monetary amount identification
- Progress indicators during processing

✅ **Guided Questions:**
- AI-generated follow-up questions
- Categorisation (compliance, clarification, reconciliation)
- Rationale and timing suggestions
- Regenerate functionality

✅ **Document Chat:**
- Sync PDF for interactive chat
- Section-aware question answering
- Source citation (section references)
- Streaming responses
- Conversation history (session-based)

✅ **Integration Points:**
- Context file system integration
- Xero data cross-referencing (basic)
- User settings and personalisation
- Storage quota management

### Partially Implemented Features

⚠️ **Conversation Persistence:**
- Conversations work within a session
- Redis caching available if configured
- Long-term conversation history not yet implemented
- No ability to review past Q&A sessions

⚠️ **File Organisation:**
- Files are uploaded and stored
- No folders, tags, or search functionality
- Files settings page shows basic list
- Advanced organisation planned

⚠️ **Inter-Agent Communication:**
- Architectural hooks in place
- Basic data sharing implemented
- Full workflow automation in development
- Some agent connections are conceptual

⚠️ **OCR Quality Control:**
- OCR works for most documents
- No confidence scoring for recognised text
- No manual correction interface
- Accuracy reporting not implemented

### Placeholder or Future Features

🔮 **Multi-Format Support:**
- Currently PDF-only
- Word, Excel, image formats planned
- Direct email integration planned
- Batch upload functionality planned

🔮 **Advanced Organisation:**
- Folders and tags
- Search and filtering
- Saved searches and smart folders
- Document comparison

🔮 **Conversation Management:**
- Long-term conversation history
- Shareable Q&A sessions
- Export conversations to PDF or Word
- Conversation templates

🔮 **Workflow Automation:**
- Automatic document routing based on content
- Triggered actions (e.g., create Xero invoice draft)
- Approval workflows
- Scheduled processing

🔮 **Enhanced Analytics:**
- Document processing metrics
- OCR accuracy tracking
- Common questions analysis
- Usage reports

### Known Limitations

**File Size:**
15MB maximum is lower than some competitors (who offer 50-100MB). This is a deliberate trade-off for processing speed and cost.

**Session-Based Chat:**
Conversations don't persist across sessions. This is a known limitation planned for resolution.

**PDF-Only:**
Requiring PDF conversion is friction for users with native Word/Excel invoices. Multi-format support is a priority.

**No Collaborative Features:**
Currently single-user focused. Multi-user document sharing and commenting are planned.

**Limited Organisation:**
As your document library grows, finding specific documents becomes challenging. Organisation features are in development.

---

## Areas for Enhancement

This section is primarily for developers, system engineers, and product managers thinking about how to extend and improve the Document Management Agent.

### For Developers: Feature Enhancements

**Enhanced OCR Accuracy:**
- **Opportunity**: Current OCR works but has no confidence scoring or quality feedback
- **Implementation Ideas**:
  - Integrate an OCR quality assessment algorithm that scores each page
  - Flag low-confidence pages for human review
  - Offer manual text correction interface for critical documents
  - Use multiple OCR engines and compare results for consensus
- **Impact**: Reduced errors in critical financial figures, increased user trust

**Support for Additional File Formats:**
- **Opportunity**: Users have to convert Word/Excel/images to PDF before uploading
- **Implementation Ideas**:
  - Add DOCX, XLSX, JPEG, PNG support to the upload endpoint
  - Reuse existing parsers (already implemented for context files)
  - Implement server-side PDF conversion as a fallback
  - Accept email messages (EML files) with attachment extraction
- **Impact**: Reduced friction, faster workflow, broader use cases

**Batch Upload Functionality:**
- **Opportunity**: Users processing many documents must upload one-by-one
- **Implementation Ideas**:
  - Multi-file selection in upload dialog
  - Drag-and-drop multiple files
  - Queue-based processing with progress tracking
  - Bulk operations (tag multiple documents, delete multiple)
- **Impact**: Massive time savings for high-volume users

**Document Versioning System:**
- **Opportunity**: If a user uploads a corrected version of an invoice, there's no link to the original
- **Implementation Ideas**:
  - Track document relationships (original, revision, replacement)
  - Version history with diff viewer
  - Rollback to previous version
  - Merge summaries from multiple versions
- **Impact**: Better audit trail, compliance, error correction

**Advanced Search and Filtering:**
- **Opportunity**: No way to search document library by content or metadata
- **Implementation Ideas**:
  - Full-text search across all extracted text
  - Filter by date range, file size, document type
  - Semantic search (find documents similar to a query concept)
  - Saved search templates
- **Impact**: Faster document retrieval, better knowledge management

**Document Comparison Features:**
- **Opportunity**: Users want to compare invoices, contracts, or statements side-by-side
- **Implementation Ideas**:
  - Visual diff showing changes between documents
  - Highlight differences in amounts, terms, parties
  - Compare document types (invoice vs quote)
  - Generate comparison reports
- **Impact**: Improved fraud detection, contract negotiation, error identification

**Automated Categorisation with AI:**
- **Opportunity**: Users manually categorise documents (invoice, receipt, statement, etc.)
- **Implementation Ideas**:
  - AI model classifies document type automatically
  - Confidence-based auto-categorisation
  - Suggest tags based on content
  - Learn from user corrections
- **Impact**: Reduced manual work, better organisation

**Custom Extraction Templates:**
- **Opportunity**: Users with standardised suppliers want to extract specific fields (PO number, delivery date, etc.)
- **Implementation Ideas**:
  - User-defined extraction templates (e.g., "For invoices from ABC Supplies, extract: PO Number from top-right corner, Delivery Date from line 5")
  - Template library for common suppliers
  - Machine learning to improve templates over time
  - Export extracted data to CSV or JSON
- **Impact**: Structured data for integration with other systems, reduced manual data entry

### For System Engineers: Infrastructure Improvements

**Scalable Processing Pipeline:**
- **Opportunity**: Current async processing works for moderate loads but may bottleneck at high volume
- **Implementation Ideas**:
  - Move to a dedicated job queue system (BullMQ, Celery, AWS SQS)
  - Separate processing workers from web servers
  - Horizontal scaling of processing workers based on queue depth
  - Priority queues for pro users or urgent documents
- **Impact**: Reliable processing at scale, better resource utilisation

**Background Job Queue Implementation:**
- **Opportunity**: Next.js `after()` hook is simple but not robust for production
- **Implementation Ideas**:
  - Implement Redis-backed job queue
  - Retry logic with exponential backoff
  - Dead letter queue for failed jobs
  - Job monitoring dashboard
- **Impact**: Reduced failed processing, better error recovery, operational visibility

**Distributed OCR Processing:**
- **Opportunity**: OCR is CPU-intensive and can slow down web servers
- **Implementation Ideas**:
  - Offload OCR to dedicated GPU-accelerated workers
  - Use cloud OCR services (AWS Textract, Google Cloud Vision)
  - Parallel processing of multi-page documents
  - Caching of OCR results
- **Impact**: Faster processing, cost efficiency, better user experience

**Storage Optimisation Strategies:**
- **Opportunity**: Storing full PDFs is expensive at scale
- **Implementation Ideas**:
  - Compress PDFs after upload (lossless compression)
  - Tiered storage (recent files on fast SSD, old files on cheaper cold storage)
  - Deduplication (if same file uploaded multiple times, store once)
  - Archive old documents to S3 Glacier or similar
- **Impact**: Reduced storage costs, maintained performance for active documents

**Caching Layers for Frequently Accessed Documents:**
- **Opportunity**: Popular documents (templates, reference materials) are retrieved repeatedly
- **Implementation Ideas**:
  - Redis cache for document metadata and summaries
  - CDN caching for document URLs
  - In-memory cache for recently accessed documents
  - Cache invalidation on document updates
- **Impact**: Faster load times, reduced database load

**Monitoring and Alerting for Processing Failures:**
- **Opportunity**: Processing failures are silent unless user reports them
- **Implementation Ideas**:
  - Logging pipeline with structured logs
  - Error rate monitoring (X% of uploads failing)
  - Alerting on spikes in failures
  - Dashboard showing processing metrics (avg time, success rate, queue depth)
- **Impact**: Proactive issue detection, faster incident response

**Performance Metrics and Analytics:**
- **Opportunity**: No visibility into system performance trends
- **Implementation Ideas**:
  - Track processing time percentiles (p50, p95, p99)
  - Monitor AI API latency and costs
  - Document upload/success/failure rates
  - User engagement metrics (documents uploaded per user, chat questions asked)
- **Impact**: Data-driven optimisation, capacity planning

**Backup and Disaster Recovery:**
- **Opportunity**: If Blob Storage or database fails, user data could be lost
- **Implementation Ideas**:
  - Automated daily backups of database
  - Blob storage replication across regions
  - Disaster recovery runbooks
  - Regular recovery drills
- **Impact**: Data durability, business continuity

### Integration Opportunities

**Direct Bank Statement Import:**
- **Opportunity**: Users manually download bank statements and upload them
- **Implementation Ideas**:
  - Integrate with banking APIs (via Yodlee, Plaid, Basiq)
  - Automatic statement retrieval and upload
  - Match imported transactions to uploaded receipts
  - Scheduled imports (daily, weekly)
- **Impact**: Fully automated document intake, reduced manual work

**Email-to-Document Pipeline:**
- **Opportunity**: Many invoices arrive via email
- **Implementation Ideas**:
  - Provide each user with a unique email address (e.g., uploads-user123@ledgerbot.com)
  - Parse incoming emails for attachments
  - Automatically upload PDF attachments
  - Use email subject/body as document description
- **Impact**: Zero-click document upload, natural workflow integration

**Scanner Integration:**
- **Opportunity**: Users scan receipts at their office
- **Implementation Ideas**:
  - Mobile app with camera integration
  - Scan multiple receipts in batch
  - Upload directly from scanner device
  - Integration with scanning hardware (Fujitsu ScanSnap, etc.)
- **Impact**: Faster receipt processing, mobile-friendly workflow

**Cloud Storage Connectors:**
- **Opportunity**: Users store invoices in Google Drive, Dropbox, OneDrive
- **Implementation Ideas**:
  - OAuth integration with cloud storage providers
  - Browse and import files from cloud storage
  - Automatic sync (new files in a folder auto-upload)
  - Two-way sync (summaries saved back to cloud storage)
- **Impact**: Centralised document management, reduced duplication

**Automated Invoice Matching with Xero:**
- **Opportunity**: After processing an invoice, user manually enters it in Xero
- **Implementation Ideas**:
  - AI extracts structured invoice data (line items, amounts, etc.)
  - Generate Xero invoice draft via API
  - User reviews and approves with one click
  - Automatic posting to Xero after approval
- **Impact**: End-to-end automation, massive time savings

**Receipt Matching for Expense Reconciliation:**
- **Opportunity**: Employees submit expense receipts for reimbursement
- **Implementation Ideas**:
  - Upload receipt, extract amount and date
  - Match to credit card transactions
  - Approve or flag mismatches
  - Generate expense report
- **Impact**: Simplified expense management, reduced errors

**Custom Document Workflows:**
- **Opportunity**: Different businesses have different document approval processes
- **Implementation Ideas**:
  - Workflow builder (upload → review → approve → post to Xero)
  - Role-based approvals (bookkeeper reviews, accountant approves)
  - Email notifications at each step
  - Audit trail of all workflow actions
- **Impact**: Compliance, accountability, process standardisation

**API Endpoints for Third-Party Integrations:**
- **Opportunity**: Users want to integrate LedgerBot with other tools (CRM, ERP, etc.)
- **Implementation Ideas**:
  - REST API for document upload, retrieval, summarisation
  - Webhooks for processing completion
  - API keys for authentication
  - Rate limiting and usage quotas
- **Impact**: Ecosystem growth, platform extensibility

---

## Technical Extension Points

For developers looking to extend the Document Management Agent, here are the key extension points in the codebase.

### Context Processor Customisation

**Location**: `lib/files/context-processor.ts`

**Purpose**: Handles file processing after upload (text extraction, token counting, status updates).

**Extension Opportunities**:
- Add custom file type handlers (e.g., for proprietary formats)
- Implement custom OCR engines or fallback providers
- Add metadata extraction (e.g., document creation date, author from PDF metadata)
- Integrate with external processing services

**How to Extend**:
1. Add new file type check in `processContextFile` function
2. Implement extraction function for that type
3. Update status and store extracted text
4. Handle errors gracefully

**Example Use Case**:
Adding support for scanning image files (JPEG/PNG) and extracting text via OCR.

### Custom File Type Handlers

**Location**: `lib/files/parsers/` (would need to be created)

**Purpose**: Dedicated parsers for different file formats.

**Extension Opportunities**:
- Create parsers for additional formats (RTF, TXT, HTML)
- Implement table structure preservation from Excel
- Extract images from documents for separate analysis
- Parse email messages (EML format)

**How to Extend**:
1. Create a new parser file (e.g., `parseRtf.ts`)
2. Implement extraction logic
3. Export function with consistent interface (Blob → string)
4. Import and use in `context-processor.ts`

### Processing Pipeline Middleware

**Concept**: Modular processing steps that can be inserted into the pipeline.

**Extension Opportunities**:
- Pre-processing (document cleanup, rotation correction)
- Post-processing (spell-check extracted text, format normalisation)
- Validation (verify document structure, check for required fields)
- Enrichment (add metadata from external sources)

**How to Implement**:
1. Define middleware interface (input: file/text, output: processed file/text)
2. Create middleware registry
3. Chain middleware in processing pipeline
4. Allow configuration of active middleware per user or document type

### Storage Backend Alternatives

**Current**: Vercel Blob

**Extension Opportunities**:
- Support AWS S3 as alternative
- Support Azure Blob Storage
- Support self-hosted MinIO
- Allow per-user storage backend selection

**How to Implement**:
1. Abstract storage interface (`upload`, `download`, `delete`)
2. Implement interface for each provider
3. Configuration to select provider
4. Migrate existing files if switching providers

### Custom AI Extraction Tools

**Location**: `lib/ai/tools/` (create new document-specific tools)

**Purpose**: AI tools that operate on document content.

**Extension Opportunities**:
- Extract specific entities (ABN, ACN, email, phone)
- Classify document type automatically
- Detect language and translate if needed
- Extract tables as structured data

**How to Extend**:
1. Create new tool definition using `tool()` from Vercel AI SDK
2. Define input schema (document ID, extraction parameters)
3. Implement extraction logic (may call AI or use regex)
4. Return structured output
5. Register tool in chat API

**Example Use Case**:
Tool that extracts all line items from an invoice as structured JSON (description, quantity, unit price, total).

### Document Validation Rules

**Concept**: Automated checks that documents meet certain criteria.

**Extension Opportunities**:
- Validate invoice completeness (has ABN, invoice number, amount, date)
- Check GST calculations (10% of subtotal = GST amount)
- Verify payment details (valid BSB and account number format)
- Flag suspicious patterns (unusual amounts, duplicates)

**How to Implement**:
1. Define validation rule interface (input: document data, output: pass/fail + messages)
2. Implement rule library
3. Run rules after summarisation
4. Display validation results to user
5. Allow users to ignore or act on validation failures

### Automated Tagging Systems

**Concept**: Automatically assign tags to documents based on content.

**Extension Opportunities**:
- Tag by document type (invoice, receipt, statement)
- Tag by supplier (using name recognition)
- Tag by amount range (small < $100, medium $100-$1000, large > $1000)
- Tag by urgency (due dates, payment terms)

**How to Implement**:
1. Define tagging rules (regex, AI classification, keyword matching)
2. Run tagging after summarisation
3. Store tags in database
4. Allow manual tag editing
5. Use tags for search and filtering

### Duplicate Detection

**Concept**: Identify when the same document is uploaded multiple times.

**Extension Opportunities**:
- File hash comparison (exact duplicate detection)
- Content similarity (fuzzy duplicate detection)
- Invoice number matching
- Amount and date matching

**How to Implement**:
1. Calculate file hash on upload
2. Check database for existing file with same hash
3. If exact match, warn user or auto-link
4. For fuzzy matching, compare extracted text or invoice numbers
5. Suggest merging or flagging duplicates

---

## Suggested Roadmap Items

Based on user needs and technical opportunities, here's a suggested development roadmap.

### Short-Term (Next 3 Months)

**Priority 1: Enhanced Error Handling and User Feedback**
- Show detailed error messages for processing failures
- Provide retry button for failed uploads
- Email notification when processing completes (for large documents)
- Improve OCR quality warnings with actionable advice

**Priority 2: Progress Indicators for Long Processing**
- Real-time progress updates during summarisation (already partially implemented)
- Estimated time remaining
- Background processing notifications
- Process document in background, notify when ready

**Priority 3: Bulk Operations**
- Delete multiple documents at once
- Batch tagging (select multiple, apply tag)
- Export multiple summaries to PDF
- Download original files in bulk

**Priority 4: Conversation History Persistence**
- Save Q&A sessions to database
- View past conversations about a document
- Resume conversations across sessions
- Export conversations to PDF or Word

### Medium-Term (3-6 Months)

**Priority 1: AI-Powered Document Categorisation**
- Automatic document type detection (invoice, receipt, statement, contract, etc.)
- Confidence scores for categories
- User correction feedback loop
- Category-specific extraction templates

**Priority 2: Smart Suggestions for Tags and Descriptions**
- AI suggests tags based on content
- Auto-generate descriptive file names
- Learn from user tagging patterns
- Bulk apply suggested tags

**Priority 3: Document Templates and Schemas**
- Define expected structure for common document types
- Validate documents against schemas
- Extract structured data into custom fields
- Export structured data to CSV/JSON

**Priority 4: Multi-Format Support**
- Accept DOCX, XLSX, JPEG, PNG files directly
- Server-side conversion to PDF if needed
- Format-specific optimisations (e.g., preserve Excel formulas)
- Email message support (EML/MSG files)

**Priority 5: Advanced Search and Filtering**
- Full-text search across all documents
- Filter by date range, size, type, tags
- Saved search templates
- Semantic search (find documents about a concept)

### Long-Term (6-12 Months)

**Priority 1: Full Workflow Automation**
- Visual workflow builder
- Trigger actions on document upload (e.g., create Xero draft invoice)
- Approval workflows with notifications
- Integration with other agents (reconciliation, compliance)
- Audit trail and activity log

**Priority 2: Multi-User Collaboration**
- Share documents with team members
- Comment on documents
- @mention colleagues in conversations
- Role-based permissions (uploader, reviewer, approver)
- Team-wide document library

**Priority 3: Advanced Analytics and Reporting**
- Document processing metrics dashboard
- Common questions analysis
- Supplier spend analysis from uploaded invoices
- Compliance trends (GST errors, missing ABNs)
- Export reports to PDF/Excel

**Priority 4: Enhanced Integrations**
- Email-to-document pipeline (forward invoices to unique email address)
- Cloud storage sync (Google Drive, Dropbox, OneDrive)
- Direct bank statement import (via banking APIs)
- Scanner and mobile app integration
- API for third-party integrations

**Priority 5: AI Model Customisation**
- Fine-tune AI models on your document patterns
- Industry-specific extraction templates
- Custom compliance rules for your business
- Learn from corrections over time

---

**Document Version**: 1.0
**Last Updated**: 8 November 2024
**Next**: See [Troubleshooting & FAQ](./docmanagement-troubleshooting-faq.md) for common issues and solutions
**Feedback**: Please send suggestions for improving this guide to docs@ledgerbot.com

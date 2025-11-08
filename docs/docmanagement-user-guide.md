# Document Management Agent - User Guide

**Version**: 1.0
**Last Updated**: 8 November 2024
**Audience**: End-users, Accountants, Bookkeepers

> **Other Documentation**: See also [Technical Architecture](./docmanagement-technical-architecture.md), [Integration Guide](./docmanagement-integration-guide.md), [Troubleshooting](./docmanagement-troubleshooting-faq.md)

---

## Table of Contents

1. [Introduction](#introduction)
2. [Understanding the Document Management Agent](#understanding-the-document-management-agent)
3. [Accessing the Agent](#accessing-the-agent)
4. [Using the Agent](#using-the-agent)
5. [Best Practices](#best-practices)
6. [Advantages](#advantages)
7. [Disadvantages and Limitations](#disadvantages-and-limitations)

---

## Introduction

The Document Management Agent is LedgerBot's intelligent intake workspace for processing accounting documents. Think of it as your AI-powered assistant that reads through invoices, receipts, and bank statements, extracts the important information, and helps you understand what actions you need to take.

Instead of manually reading through every PDF, highlighting key amounts, and making notes, you upload the document and let LedgerBot do the heavy lifting. The agent creates a structured summary focused on accounting compliance, identifies key financial figures, and can even answer specific questions about the document.

### Who Should Use This Agent?

This agent is designed for:
- **Accountants and Bookkeepers** processing client documents
- **Finance Teams** managing incoming invoices and receipts
- **Business Owners** reviewing financial documents
- **Accounts Payable Staff** processing vendor invoices
- **Tax Preparers** reviewing supporting documentation

### Key Benefits

- Save time by automating document review and summarisation
- Extract text from scanned documents using OCR technology
- Get compliance-focused insights tailored to Australian accounting requirements
- Ask natural language questions about document contents
- Build a searchable knowledge base of your financial documents

---

## Understanding the Document Management Agent

### What Is It?

The Document Management Agent is a specialised workspace within LedgerBot that combines several AI-powered capabilities:

1. **Document Upload and Storage**: Securely upload PDF documents to your LedgerBot workspace
2. **OCR Processing**: Extract text from scanned or image-based PDFs automatically
3. **AI Summarisation**: Generate accounting-focused summaries with key highlights
4. **Section Analysis**: Break down documents into logical sections with compliance notes
5. **Guided Questions**: Receive suggested follow-up questions based on document content
6. **Interactive Chat**: Ask questions about the document and get AI-powered answers

Think of it like having an experienced bookkeeper review every document before you do, highlighting what matters and flagging potential issues.

### What Types of Documents Can Be Processed?

The agent is optimised for common accounting documents:

- **Invoices** (sales and purchase invoices)
- **Receipts** (expense receipts and payment confirmations)
- **Bank Statements** (transaction lists and account summaries)
- **Tax Documents** (PAYG summaries, BAS worksheets)
- **Financial Reports** (profit and loss, balance sheets)
- **Contracts** (supplier agreements, service contracts)

### File Format Support

Currently, the agent supports:
- **PDF files only** (with plans to expand to other formats)
- **Maximum file size**: 15MB per document
- **OCR enabled**: Scanned or image-based PDFs are automatically processed

### What Happens When You Upload a Document?

Here's the journey your document takes, explained in simple terms:

1. **Upload**: You select a PDF file from your computer
2. **Storage**: The file is securely uploaded to cloud storage
3. **Text Extraction**: If the PDF contains searchable text, it's extracted immediately. If it's a scanned document, OCR technology reads the text from the images
4. **AI Summarisation**: LedgerBot's AI reads through the entire document and creates a focused summary highlighting financial amounts, parties involved, dates, and compliance considerations
5. **Section Breakdown**: The document is divided into logical sections (like header information, line items, totals, terms and conditions) with individual summaries
6. **Question Generation**: Based on the content, LedgerBot suggests relevant follow-up questions you might want to ask
7. **Chat Preparation**: The document is indexed for interactive chat, allowing you to ask specific questions

The entire process typically takes 30 to 90 seconds, depending on document length and complexity.

---

## Accessing the Agent

### Navigation

To access the Document Management Agent:

1. Log in to your LedgerBot account
2. From the main navigation sidebar, click on **Agents**
3. On the Agents Overview page, you'll see all available agent workspaces
4. Click on the **Document Processing** card (with the file icon)
5. You'll be taken to `/agents/docmanagement`, the agent's dedicated workspace

Alternatively, you can navigate directly to the URL: `https://your-ledgerbot-domain.com/agents/docmanagement`

### Page Layout

When you arrive at the Document Management Agent workspace, you'll see a two-column layout:

**Left Column** (Main Workflow):
- Document upload area
- Upload metadata display (file name, size, token estimate)
- Warning and error messages
- AI-generated summary section
- Section breakdown with scrollable details

**Right Column** (Interaction):
- Suggested follow-up questions panel
- Interactive chat interface with the document
- Agent status indicator
- Chat history display

---

## Using the Agent

### Step 1: Uploading Documents

**To upload a document:**

1. Click on the upload area labelled "Upload supporting documents" (you'll see an upload icon)
2. Your computer's file browser will open
3. Select a PDF file (maximum 15MB)
4. Click "Open" to begin the upload

**What to expect:**
- The upload area will show a loading spinner with "Processing..." text
- You'll see the message "Processing..." while the file is being uploaded and analysed
- Upload typically takes 5 to 15 seconds depending on file size and internet speed

**Upload tips:**
- Make sure your PDF is not password-protected (protected files cannot be processed)
- For best results, use high-quality scans (300 DPI or higher) for scanned documents
- If your document is very large, consider splitting it into smaller sections

### Step 2: Viewing Upload Metadata

Once uploaded successfully, you'll see a metadata box displaying:

- **File Name**: The name of your uploaded document
- **File Size**: Size in kilobytes or megabytes
- **Token Estimate**: Approximate number of AI tokens (a measure of text length)
- **Status Badge**: Shows "Summarising" while processing, then "Ready" when complete

If OCR was used to extract text from a scanned document, you'll see a note:
> "This PDF was scanned or image-based. Text was successfully extracted using OCR."

### Step 3: Reviewing the Summary

After processing completes, the summary section appears with:

**Ledger-Ready Summary**:
A paragraph or two highlighting the most important information for accounting purposes, such as:
- Who is the document from and to?
- What is the total amount and any GST?
- What is the invoice or reference number?
- When is payment due?
- What goods or services are involved?

**Key Highlights**:
A bulleted list of the most critical facts, often including:
- Payment amounts and GST calculations
- Due dates and payment terms
- Account references or invoice numbers
- Any compliance flags or unusual items

**Example summary for an invoice:**
> "This is a tax invoice from ABC Office Supplies to XYZ Consulting Pty Ltd dated 15 October 2024 for office equipment totalling $1,100.00 including $100.00 GST. Payment is due within 14 days to BSB 123-456 Account 87654321. The invoice references PO-2024-789 and includes detailed line items for furniture and stationery."

### Step 4: Examining Section Breakdown

Below the summary, you'll see a scrollable list of sections. Each section card shows:

- **Section Number and Title**: For example, "1. Invoice Header" or "3. Line Items"
- **Monetary Amount Badge**: If the section contains financial figures (e.g., "$1,100.00")
- **Section Summary**: A focused description of what's in this section
- **Key Facts**: Specific data points extracted (dates, reference numbers, quantities)
- **Compliance Signals**: Any Australian tax or accounting compliance notes

This breakdown helps you quickly navigate to specific parts of the document without reading the entire summary.

### Step 5: Using Suggested Questions

The right column shows "Suggested follow-up questions" that LedgerBot generates based on the document content. Each suggested question includes:

- **The Question**: A natural language query you can ask
- **Rationale**: Why this question is relevant
- **Category and Timing**: Type of question (e.g., "Compliance") and when to ask it

These questions are designed to help with:
- Client follow-ups (asking for missing information)
- Reconciliation notes (confirming amounts against bank feeds)
- Compliance checks (verifying GST treatment, payment terms)

**To regenerate questions:**
- Click the "Regenerate" button if you want fresh suggestions
- This is useful after you've asked several questions and want new ideas

### Step 6: Syncing the PDF for Chat

Before you can chat with the document, you need to "sync" it with the chat agent:

1. Look for the "Chat with this PDF" panel in the right column
2. You'll see a status badge showing "Sync required"
3. Click the "Sync PDF" button
4. Wait a few seconds while LedgerBot indexes the document (you'll see "Syncing...")
5. Once complete, the badge will change to "Agent ready"

**Why syncing is needed:**
Syncing creates a specialised index of the document that allows the chat system to quickly find relevant sections when you ask questions. Think of it like creating a detailed table of contents and keyword index for faster searching.

### Step 7: Chatting with the Document

Once the agent is ready, you can ask questions in natural language:

**To ask a question:**

1. Type your question in the text area (you'll see a placeholder like "What GST amount should we book from this invoice?")
2. Click the "Ask" button (or press Enter)
3. Your question appears in the chat history
4. LedgerBot responds with an answer based on the document content

**Example questions you can ask:**

- "What is the total GST amount on this invoice?"
- "Who is the supplier and what is their ABN?"
- "When is payment due and what are the payment details?"
- "Are there any early payment discounts mentioned?"
- "What account code should I use for the office furniture line item?"
- "Is this invoice GST-compliant?"

**Understanding the answers:**

- Answers combine the overall summary with specific excerpts from relevant sections
- If LedgerBot references specific sections, you'll see badges like "Section 2: Line Items"
- These source badges help you verify the answer by checking the original section

**Chat tips:**

- Be specific in your questions (instead of "Tell me about this", ask "What is the invoice date?")
- If an answer isn't clear, ask a follow-up question to clarify
- You can ask multiple questions in sequence, building on previous answers
- The chat remembers your conversation history within this document session

### Step 8: Starting Over with a New Document

To process a new document:

1. Simply click the upload area again
2. Select a new PDF file
3. The workspace will reset and begin processing the new document
4. Your previous document conversation is not saved (this is a current limitation)

**Note**: Currently, conversations are specific to each document session and are not persisted long-term. If you need to keep a record of your questions and answers, copy them to your notes or accounting software.

---

## Best Practices

### Organising Your Documents

Although the current version doesn't include extensive organisation features, here are some tips for effective use:

**Consistent Naming:**
- When uploading, ensure your PDF has a meaningful file name (e.g., "ABC-Supplies-Invoice-Oct-2024.pdf" not "scan001.pdf")
- The file name appears in the metadata and helps you remember what you uploaded

**Process in Batches:**
- If you have multiple related documents, process them in logical batches
- For example, all invoices for a particular client, or all receipts for a specific month

**Take Notes:**
- Since conversations aren't saved long-term currently, copy important insights to your accounting software or notes app
- Include the document reference, summary highlights, and any key answers you received

### Writing Effective Questions

To get the best answers from the chat feature:

**Be Specific:**
- Instead of: "Tell me about this document"
- Try: "What is the invoice number, date, and total amount?"

**Ask One Thing at a Time:**
- Instead of: "What are the payment terms and is there GST and who's the supplier?"
- Try three separate questions about payment terms, GST, and supplier details

**Provide Context When Needed:**
- Instead of: "What account should this go to?"
- Try: "Based on my Xero chart of accounts, what account code should I use for the 'office furniture' line item?"

**Follow Up for Clarity:**
- If an answer is unclear, ask for elaboration
- "Can you explain that GST calculation in more detail?"

### Managing Storage Quotas

Every user has a storage quota for uploaded documents:

**Check Your Usage:**
- Navigate to Settings > Files to see your current storage usage
- The quota includes all context files, not just documents processed through this agent

**Delete Unneeded Documents:**
- After processing and extracting the information you need, delete the PDF if you don't need to reference it again
- Keep originals in your accounting software or document management system

**Prioritise Important Documents:**
- Upload documents you need AI assistance with
- For simple receipts you can process manually, consider handling those outside LedgerBot to save quota

**Upgrade If Needed:**
- If you regularly hit quota limits, consider upgrading your account tier for more storage

### Compliance and Recordkeeping

**Original Document Retention:**
The Document Management Agent creates summaries and extracts data, but it's not a replacement for proper document storage:

- **Keep Originals**: Always retain original invoices, receipts, and statements in your accounting system or dedicated document storage
- **ATO Requirements**: The Australian Tax Office requires you to keep records for 5 years; LedgerBot doesn't guarantee long-term storage
- **Audit Trail**: Use LedgerBot for processing and analysis, but ensure your authoritative copy is stored elsewhere

**Verify Critical Information:**
- Always double-check extracted amounts, dates, and ABNs against the original document
- OCR and AI processing, while accurate, can occasionally misread figures
- For high-value transactions or compliance-critical documents, human verification is essential

### When to Use This Agent vs Manual Processing

**Use the Document Management Agent for:**
- Complex invoices with many line items
- Scanned or image-based documents that need OCR
- Documents where you need compliance analysis (GST treatment, payment terms)
- Situations where you want to ask follow-up questions about the document
- Learning and training (understanding what information matters in documents)

**Process Manually for:**
- Very simple receipts (single item, clear total)
- Documents you're very familiar with (regular supplier invoices you process often)
- Situations where speed is critical and you don't need detailed analysis
- Documents below your storage quota threshold that you want to preserve space for more complex items

---

## Advantages

### Time Savings

**Automated Summarisation:**
Instead of reading through a 10-page contract or complex invoice, you get a focused summary in 60 seconds. For accountants processing dozens of documents daily, this can save hours per week.

**Key Fact Extraction:**
LedgerBot automatically pulls out the critical information (amounts, dates, reference numbers, ABNs) so you don't have to search through the document manually. This is especially valuable for documents with poor layouts or multiple pages.

**Intelligent Question Suggestions:**
Rather than wondering what you might have missed, LedgerBot prompts you with relevant follow-up questions. This reduces the cognitive load of review and ensures consistency.

### Accuracy and Consistency

**OCR Technology:**
Advanced optical character recognition can read scanned documents and even poor-quality photocopies. This eliminates manual re-typing and the errors that come with it.

**Compliance-Focused Analysis:**
LedgerBot's AI is trained on Australian accounting standards, GST rules, and bookkeeping best practices. It flags compliance issues that a non-specialist might miss.

**Consistent Reviews:**
Every document gets the same thorough review, regardless of how busy you are or what time of day you're processing it. This reduces the risk of overlooking important details.

### Enhanced Understanding

**Plain English Explanations:**
Complex documents are translated into clear, accessible summaries. This is valuable for business owners who aren't accountants or for training junior staff.

**Interactive Q&A:**
Being able to ask questions in natural language helps you understand the document more deeply. It's like having an experienced accountant sitting next to you explaining everything.

**Compliance Education:**
The compliance signals teach you what matters from a regulatory perspective, improving your knowledge over time.

### Workflow Integration

**Centralised Processing:**
All document intake happens in one place, creating a consistent workflow. You don't need to switch between multiple tools for different document types.

**Contextual Answers:**
When connected to Xero, LedgerBot can provide answers specific to your business setup, not generic advice.

**Future Automation Potential:**
The structured data extracted from documents can feed into other agents (reconciliation, compliance, analytics), building toward end-to-end automation.

---

## Disadvantages and Limitations

### File Format Restrictions

**PDF Only:**
Currently, the agent only accepts PDF files. If you have Word documents, Excel spreadsheets, or image files (JPEG, PNG), you'll need to convert them to PDF first.

**Why this matters:**
Many modern invoicing systems send Word or Excel invoices. You'll need a PDF conversion step before using the agent.

**Workaround:**
Use a free online PDF converter or your operating system's "Print to PDF" feature to convert documents before uploading.

### File Size Limits

**15MB Maximum:**
Large documents cannot be processed. This can be an issue for:
- Multi-month bank statements (50+ pages)
- Comprehensive financial reports with graphics
- High-resolution scanned documents

**Why this limit exists:**
Larger files consume more processing resources and storage. The 15MB limit balances functionality with system performance.

**Workaround:**
Split large documents into smaller sections (e.g., one bank statement per month) or reduce scan resolution (300 DPI is usually sufficient for text).

### Processing Time

**Not Instantaneous:**
Processing takes 30 to 180 seconds depending on document complexity. If you're used to instant uploads in other systems, this might feel slow.

**Why it takes time:**
LedgerBot performs multiple steps (OCR, AI analysis, section breakdown, question generation) that each require processing time.

**Impact:**
For high-volume processing (dozens of documents), the cumulative wait time can add up.

### OCR Accuracy

**Not Perfect:**
While OCR technology is highly accurate (typically 95-99%), it can struggle with:
- Poor quality scans or photos
- Unusual fonts or handwriting
- Documents with complex layouts (multi-column tables)
- Faded or low-contrast text

**Why this matters:**
Critical figures (amounts, ABNs, dates) might be misread, potentially leading to errors in your records.

**Mitigation:**
Always verify extracted amounts and key data against the original document, especially for high-value transactions.

### Storage Quotas

**Limited Space:**
Each user has a maximum number of files and total storage size. Once you hit these limits, you must delete old files before uploading new ones.

**Why quotas exist:**
Storage and processing have real costs. Quotas ensure fair resource allocation and prevent system abuse.

**Impact:**
For users processing many documents, quotas can become a constraint, requiring regular cleanup or account upgrades.

### No Long-Term Conversation History

**Session-Based Chat:**
Currently, conversations with a document are not saved long-term. If you close the page or upload a new document, your previous Q&A session is lost.

**Why this limitation exists:**
Conversation storage adds complexity and cost. The current implementation prioritises real-time assistance over historical record-keeping.

**Impact:**
You can't review past conversations about a document or share Q&A sessions with colleagues.

**Workaround:**
Copy important questions and answers to your notes or accounting software for future reference.

### Limited Organisation Features

**No Folders or Tags:**
The current interface doesn't provide ways to organise documents into folders, add custom tags, or search your document library.

**Why this matters:**
As you process more documents, finding a specific one from weeks ago becomes difficult.

**Current State:**
This is a known limitation, with organisation features planned for future development.

### Australian Focus

**Optimised for Australia:**
The compliance analysis and terminology are tailored to Australian accounting standards, GST, and ATO requirements.

**Impact for Non-Australian Users:**
If you're in another country, compliance signals might not align with your local regulations. Terminology (like "GST" instead of "VAT") might differ from what you're used to.

**Mitigation:**
You can still use the agent for basic summarisation and Q&A, but take compliance suggestions with a grain of salt if you're outside Australia.

---

**Document Version**: 1.0
**Last Updated**: 8 November 2024
**Next**: See [Technical Architecture Guide](./docmanagement-technical-architecture.md) for system implementation details
**Feedback**: Please send suggestions for improving this guide to docs@ledgerbot.com

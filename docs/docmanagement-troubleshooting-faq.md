# Document Management Agent - Troubleshooting & FAQ

**Version**: 1.0
**Last Updated**: 8 November 2024
**Audience**: End-users, Support Staff

> **Other Documentation**: See also [User Guide](./docmanagement-user-guide.md), [Technical Architecture](./docmanagement-technical-architecture.md), [Security Guide](./docmanagement-security-compliance.md)

---

## Table of Contents

1. [Troubleshooting](#troubleshooting)
2. [Frequently Asked Questions](#frequently-asked-questions)
3. [Support](#support)
4. [Glossary](#glossary)

---

## Troubleshooting

### Upload Failures

**Problem**: "Upload failed. Please try again."

**Possible Causes**:
- Network connection interrupted during upload
- File is corrupted or invalid
- Server is temporarily unavailable

**Solutions**:
1. Check your internet connection
2. Try uploading again
3. Try a different browser
4. If problem persists, try a smaller file or different document
5. Contact support if issue continues

---

**Problem**: "File exceeds maximum size"

**Cause**: File is larger than 15MB.

**Solutions**:
1. Check file size (right-click file, select Properties/Get Info)
2. Compress the PDF using Adobe Acrobat or online tools
3. Reduce scan resolution (300 DPI is sufficient for text)
4. Split large documents into smaller sections
5. Remove unnecessary pages (blank pages, advertising)

---

**Problem**: "File type not supported"

**Cause**: File is not a PDF.

**Solutions**:
1. Convert the file to PDF:
   - **Word**: File → Save As → Format: PDF
   - **Excel**: File → Save As → Format: PDF
   - **Images**: Use an online converter or preview app to "Print to PDF"
2. Ensure file extension is `.pdf` (not `.PDF` or other variants)
3. Try opening the file in a PDF reader to verify it's valid

---

**Problem**: "Context file limit reached" or "Storage quota exceeded"

**Cause**: You've hit your storage quota.

**Solutions**:
1. Go to Settings > Files to see current usage
2. Delete unneeded documents to free up space
3. Download important documents for local storage, then delete from LedgerBot
4. Consider upgrading your account for higher quotas

### Processing Stuck or Failed

**Problem**: Upload succeeds but processing shows "Processing..." for many minutes.

**Possible Causes**:
- Large or complex document taking longer than expected
- Server is under heavy load
- Processing job failed but status not updated

**Solutions**:
1. Wait up to 5 minutes for complex documents
2. Refresh the page to check if status updated
3. If still stuck after 5 minutes, re-upload the document
4. Try a different document to see if it's file-specific or system-wide
5. Contact support with document details (size, pages, file name)

---

**Problem**: "Failed to extract text from PDF"

**Possible Causes**:
- PDF is password-protected
- PDF is corrupted or invalid
- PDF contains no text and OCR failed

**Solutions**:
1. Remove password protection:
   - Open PDF in Adobe Acrobat
   - File → Properties → Security → Remove password
   - Save and re-upload
2. Try opening the PDF in a reader to verify it's not corrupted
3. If scanned document, ensure image quality is good (clear, high-contrast)
4. Try re-scanning at higher quality (300 DPI, black/white mode)
5. Convert to a fresh PDF using "Print to PDF" from your PDF reader

### OCR Not Extracting Text Correctly

**Problem**: Summarisation contains gibberish or wrong amounts.

**Cause**: OCR misread characters in scanned document.

**Solutions**:
1. Check original document quality:
   - Is text clear and readable?
   - Is there sufficient contrast (black text on white background)?
   - Are there stains, fading, or skew?
2. Re-scan document at higher quality:
   - 300 DPI minimum
   - Black and white mode (not colour or greyscale)
   - Ensure document is flat and aligned
3. Manually verify critical figures (amounts, dates, ABNs) against original
4. If OCR consistently fails for a supplier's invoices, contact support (may need custom handling)

---

**Problem**: OCR warning: "This PDF was scanned or image-based."

**Cause**: PDF contained images, not text, so OCR was used.

**Not an error**: This is informational. OCR successfully extracted text.

**What to do**:
- Verify critical figures are correct
- If text seems accurate, proceed normally
- If accuracy is critical (large amounts), double-check against original

### Documents Not Appearing in Chat Context

**Problem**: Asked a question in general chat but AI doesn't reference your uploaded document.

**Possible Causes**:
- Document not relevant to the question
- Document not processed yet (status still "processing")
- Context window full with other information

**Solutions**:
1. Check document status at Settings > Files (should be "ready")
2. If processing, wait until it completes
3. Make your question more specific to the document (mention supplier name, invoice number, etc.)
4. Use the Document Management Agent's dedicated chat instead of general chat
5. Try mentioning the document explicitly: "Based on the invoice I uploaded from ABC Supplies..."

---

**Problem**: Document chat says "Agent not ready" or "Sync required"

**Cause**: Document hasn't been synced for chat yet.

**Solution**:
1. Look for "Sync PDF" button in the Document Management Agent
2. Click it and wait for syncing to complete (5-10 seconds)
3. Status badge should change from "Sync required" to "Agent ready"
4. Now you can ask questions

### Chat Responses

**Problem**: Chat answer is vague or doesn't answer the question.

**Possible Causes**:
- Question is ambiguous
- Information is not in the document
- AI didn't find the relevant section

**Solutions**:
1. Rephrase question more specifically:
   - Instead of: "What about GST?"
   - Try: "What is the GST amount on this invoice?"
2. Ask if information exists:
   - "Does this document mention payment terms?"
3. Reference specific sections if you know where to look:
   - "In the line items section, what is the total for office furniture?"
4. If answer is still unclear, ask a follow-up:
   - "Can you explain that in more detail?"

---

**Problem**: Chat cites wrong section or amount.

**Cause**: AI made an error in interpretation (rare but possible).

**Solution**:
1. Always verify critical information against the original document
2. Check the cited section (click on section badge if provided)
3. If error is consistent, report to support (may indicate AI model issue)
4. For now, use chat as a guide, not authoritative source

---

**Problem**: Chat is slow or doesn't respond.

**Possible Causes**:
- High server load
- AI provider is slow
- Network connection issue

**Solutions**:
1. Wait up to 30 seconds for response
2. Check your internet connection
3. Refresh page and try again
4. Try during off-peak hours if problem persists

---

## Frequently Asked Questions

**Q: How many documents can I upload?**

A: This depends on your account tier. Regular users typically have a limit of 50 documents and 500MB total storage. Check Settings > Files to see your specific limits.

---

**Q: How long does processing take?**

A: Most documents process in 30-90 seconds. Small, simple invoices (1-2 pages) may take 30-45 seconds. Large or complex documents (10+ pages, tables, scanned) can take up to 3 minutes.

---

**Q: Can I edit documents after upload?**

A: Currently, you cannot edit the uploaded file itself. You can delete it and re-upload a corrected version. Editing summaries or extracted data is planned for a future release.

---

**Q: What happens to my documents if I delete them?**

A: When you delete a document:
- The file is removed from cloud storage
- The database record is deleted
- Associated summaries and chat history are deleted
- Your storage quota is reduced by the file's size
- **Note**: Deletion is permanent and cannot be undone

---

**Q: Are my documents secure?**

A: Yes. Documents are:
- Stored in encrypted cloud storage (Vercel Blob with encryption at rest)
- Accessed only by your user account (database enforces user isolation)
- Transmitted over HTTPS (encrypted in transit)
- Not used to train AI models (Anthropic, OpenAI, Google do not train on API data)
- Not visible to other users
- Not shared with third parties except as required for processing (AI providers)

See the [Security & Compliance Guide](./docmanagement-security-compliance.md) for more details.

---

**Q: Can other users see my documents?**

A: No. All documents are private to your account. Even LedgerBot administrators cannot access your documents without explicit permission (e.g., for support troubleshooting).

---

**Q: How do I know which documents the AI is using in chat?**

A: In the Document Management Agent, the chat cites specific sections (e.g., "Section 2: Line Items"). In general chat, LedgerBot may mention the file name or provide context about which document it referenced. Full source citation in general chat is planned for a future release.

---

**Q: Can I process the same document multiple times?**

A: Yes, you can upload the same document again. However, this uses additional storage quota. Duplicate detection to warn you about re-uploads is planned.

---

**Q: What if my invoice is in a language other than English?**

A: Currently, the system is optimised for English. Other languages may work but:
- OCR accuracy may be lower
- Summarisation may be less focused
- Compliance signals are based on Australian regulations (not applicable to other countries)
- Multi-language support is planned for future releases

---

**Q: Can I use this for non-accounting documents?**

A: Yes, but the summaries are optimised for accounting documents (invoices, receipts, statements). You can upload contracts, reports, or other PDFs, and you'll still get:
- Text extraction
- AI summarisation
- Interactive chat
- However, compliance signals and accounting-specific insights may not be relevant

---

**Q: Does the Document Management Agent replace my accounting software?**

A: No. LedgerBot is a processing and analysis tool, not a replacement for accounting software like Xero, MYOB, or QuickBooks. Use LedgerBot to:
- Extract information from documents
- Understand what to record
- Get compliance guidance
- Then enter the data into your accounting software (or use integrations to automate this)

---

**Q: Can I export summaries or chat conversations?**

A: Currently, you can copy and paste summaries/conversations into your own notes. Automated export (to PDF, Word, or your accounting software) is planned.

---

**Q: What if I need to process more than 50 documents?**

A: Options:
1. Delete old documents you no longer need to free up quota
2. Upgrade to a higher tier account (Pro or Enterprise) with larger quotas
3. Contact support to discuss custom quota limits for high-volume users

---

**Q: Can I integrate this with my own systems via API?**

A: Not yet. API access for third-party integrations is planned for a future release. If you have specific integration needs, contact support to discuss.

---

## Support

### Getting Help

If you encounter issues not covered in this guide:

**Email Support**:
Contact support@ledgerbot.com with:
- Your account email
- Description of the issue
- Steps to reproduce
- Screenshots if applicable
- Document details (file size, number of pages, file type)

**In-App Support**:
Look for the "Help" or "Support" button in the LedgerBot interface to submit a ticket directly.

**Response Times**:
- Regular accounts: 24-48 hours
- Pro accounts: 12-24 hours
- Enterprise accounts: 4-8 hours (with escalation for urgent issues)

### Providing Useful Information

When contacting support about document processing issues, include:

1. **File Details**:
   - File size (in MB)
   - Number of pages
   - File type (PDF, scanned vs digital)
   - File name

2. **Error Messages**:
   - Exact text of any error messages
   - Screenshots of errors

3. **Steps Taken**:
   - What you were trying to do
   - What you expected to happen
   - What actually happened

4. **Timing**:
   - When the issue occurred (date and time)
   - How long processing took before failing

5. **Sample File** (if not confidential):
   - If possible, provide a sample file that reproduces the issue
   - Redact sensitive information if needed

### Feature Requests

Have an idea for improving the Document Management Agent?

**Submit Feedback**:
Email feedback@ledgerbot.com with:
- Description of the feature
- Use case (why you need it)
- How it would improve your workflow

**Feature Voting**:
Check the LedgerBot roadmap (if available) to vote on proposed features.

### Training and Resources

**User Guides**:
Visit docs.ledgerbot.com for additional guides and tutorials.

**Video Tutorials**:
Look for video walkthroughs on the LedgerBot YouTube channel or help centre.

**Webinars**:
LedgerBot occasionally hosts webinars demonstrating features and best practices.

---

## Glossary

**Context File**: Any file uploaded to LedgerBot for use as context in AI conversations (documents, images, etc.).

**Document Management Agent**: Specialised workspace within LedgerBot for processing accounting documents with AI-powered summarisation and chat.

**OCR (Optical Character Recognition)**: Technology that reads text from images or scanned documents.

**Summarisation**: The process of analysing a document and generating a concise summary highlighting key information.

**Section Breakdown**: Dividing a document into logical parts (header, line items, totals) with individual summaries.

**Guided Questions**: AI-generated follow-up questions suggested based on document content.

**Chat Indexing**: Creating a searchable representation of a document for interactive question-answering.

**Token**: A unit of text (roughly a word or part of a word) used by AI models for processing.

**Token Count**: Measurement of how much text is in a document, expressed in tokens.

**Vercel Blob**: Cloud storage service used by LedgerBot for storing uploaded files.

**Next.js**: The web framework LedgerBot is built on (a React framework for full-stack applications).

**Async Processing**: Background job execution that doesn't block the user interface (you don't have to wait for it to complete).

**Vector Index**: A mathematical representation of document text that enables semantic search.

**Semantic Search**: Finding information based on meaning, not just exact keyword matches.

**Compliance Signal**: A note or flag indicating a regulatory or accounting standard consideration.

**Chart of Accounts**: A structured list of account codes used in accounting (e.g., 684 - Office Equipment).

**ABN (Australian Business Number)**: Unique identifier for businesses in Australia.

**GST (Goods and Services Tax)**: 10% value-added tax in Australia.

**ATO (Australian Taxation Office)**: Australia's tax regulatory body.

**Xero**: Cloud-based accounting software that integrates with LedgerBot.

**Context Manager**: LedgerBot system that selects which information to include when asking the AI a question.

**Context Window**: The maximum amount of text an AI model can process in one request.

**Session-Based**: Data that exists only during your current browser session (lost when you close the page).

**Persistent**: Data that is saved long-term (in a database) and available across sessions.

---

**Document Version**: 1.0
**Last Updated**: 8 November 2024
**Next**: See [Security & Compliance Guide](./docmanagement-security-compliance.md) for security details
**Feedback**: Please send suggestions for improving this guide to docs@ledgerbot.com

# Context Files User Guide

## Overview

Context Files allow you to upload documents that provide persistent background information to LedgerBot's AI conversations. These files act as a knowledge base that the AI can reference when answering your questions, making responses more relevant and specific to your business.

### What Are Context Files?

Context Files are documents you upload to LedgerBot that become part of every conversation. Think of them as reference materials that the AI keeps "in mind" while chatting with you. This could include:

- Business policies and procedures
- Product catalogues or price lists
- Client contracts and agreements
- Financial reports and statements
- Technical specifications
- Industry-specific documentation
- Historical invoices and receipts

### Why Use Context Files?

**Personalised Responses**: The AI provides answers tailored to your specific business context rather than generic advice.

**Consistency**: Ensure the AI refers to your actual policies, procedures, and data rather than making assumptions.

**Time Savings**: Upload documents once and reference them in multiple conversations without needing to explain context repeatedly.

**Better Analysis**: The AI can compare, cross-reference, and analyse information across multiple uploaded documents.

**Persistent Knowledge**: Context files remain available across all your chats until you remove them.

---

## Getting Started

### Accessing Context Files

1. Click on your profile icon in the top right corner
2. Select **Settings** from the dropdown menu
3. Click on **Files** in the left sidebar
4. You'll see the "Persistent context files" section

### Your Storage Quota

Regular users have:
- **100 MB** total storage capacity
- **50 files** maximum
- **10 MB** maximum size per file

You can see your current usage at the top of the Files page (e.g., "You are using 23.5 MB of 100 MB available").

---

## Uploading Files

### Supported File Formats

LedgerBot accepts the following file types:

**Images**:
- JPEG (`.jpg`, `.jpeg`)
- PNG (`.png`)
- GIF (`.gif`)
- WebP (`.webp`)

**Documents**:
- PDF (`.pdf`)
- Microsoft Word (`.docx`)
- Microsoft Excel (`.xlsx`)

**File Size Limit**: Maximum 10 MB per file

### How to Upload

1. **Navigate to Settings > Files**
2. **Click the "Upload files" button**
3. **Select one or more files** from your computer
   - You can select multiple files at once
   - Hold Ctrl (Windows) or Cmd (Mac) to select multiple files
4. **Wait for processing**
   - You'll see an "Uploading..." message during upload
   - Files are processed automatically after upload
   - A success message confirms each upload

**Note**: If you try to upload a file larger than 10 MB, you'll see an error message. If your upload would exceed your storage quota, you'll be notified before the upload completes.

### What Happens After Upload

Once uploaded, LedgerBot automatically processes your files:

1. **Text Extraction**: For PDFs, Word documents, and Excel spreadsheets, LedgerBot extracts all text content
2. **Token Counting**: The extracted text is analysed to count how many tokens (word-like units) it contains
3. **Status Updates**: The file status changes from "Processing" to "Ready" when complete

This processing happens in the background and typically takes a few seconds to a minute depending on file size and complexity.

---

## Managing Your Files

### Viewing Your Files

On the Files page, each uploaded file displays:

- **File name**: The original name of your uploaded file
- **File type**: For example, "PDF Document", "Excel Spreadsheet", "JPEG Image"
- **File size**: Shown in kilobytes (KB)
- **Token count**: Number of tokens extracted (only for text-based files)
- **Status badge**:
  - "Processing" (grey): Currently being processed
  - "Ready" (green): Available for use in conversations
  - "Failed" (red): Processing encountered an error
- **Upload date**: When the file was added

### Pinning Important Files

You can pin files to ensure they're prioritised in conversations:

1. **Find the file** you want to pin in your file list
2. **Click the "Pin" button** next to the file
3. The file now shows a **"Pinned" badge**
4. **Unpin** by clicking the same button again

**Why pin files?** Pinned files are given higher priority when the AI selects which context to include in responses. This is useful for frequently referenced documents like your current price list or active policies.

### Viewing Files

To view or download a file:

1. **Click the "View" button** next to any file
2. The file opens in a new browser tab
3. You can download it from there using your browser's download function

### Deleting Files

To remove a file:

1. **Click the "Delete" button** next to the file (red button)
2. **Confirm the deletion** in the popup
3. The file is immediately removed and your storage quota is updated

**Warning**: Deletion is permanent. If you delete a file, you'll need to re-upload it to use it again.

### Understanding File Status

**Processing**: The file has been uploaded but text extraction is still in progress. You'll see a grey "Processing…" badge. This typically takes a few seconds to a minute.

**Ready**: The file has been processed and is available for use in all conversations. You'll see a green "Ready" badge.

**Failed**: Something went wrong during processing. You'll see a red "Failed" badge and an error message explaining what happened. Common causes:
- Corrupted or invalid file
- PDF with no extractable text (scanned images without OCR)
- Encrypted or password-protected documents

If a file fails, try re-uploading it or converting it to a different format.

---

## Using Context Files in Chat

### How Context Works

Once files are uploaded and marked as "Ready":

1. **Automatic Inclusion**: LedgerBot automatically considers your context files when responding to questions
2. **Smart Selection**: The AI selects the most relevant files based on your question
3. **No Special Commands Needed**: You don't need to tell the AI to use context files; it happens automatically
4. **Transparent References**: The AI may mention which documents it referenced in its response

### Example Uses

**Scenario 1: Product Pricing**

You upload your product catalogue (Excel file) with items and prices.

- **You ask**: "What's the price for Widget XYZ?"
- **LedgerBot responds**: Checks your uploaded catalogue and provides the exact price

**Scenario 2: Company Policies**

You upload your employee handbook (PDF).

- **You ask**: "What's our annual leave policy?"
- **LedgerBot responds**: References the specific section from your handbook

**Scenario 3: Financial Analysis**

You upload last quarter's profit and loss statement (PDF).

- **You ask**: "Compare our revenue this quarter to last quarter"
- **LedgerBot responds**: Analyses the uploaded P&L and compares it with current data

**Scenario 4: Client Information**

You upload a client contract (Word document).

- **You ask**: "What are the payment terms for Acme Corp?"
- **LedgerBot responds**: Extracts payment terms from the uploaded contract

### Tips for Best Results

1. **Use Descriptive File Names**: Name files clearly so you can identify them later (e.g., "2024-Q1-ProfitLoss.pdf" instead of "document.pdf")

2. **Keep Files Updated**: If information changes (like a new price list), delete the old file and upload the new version

3. **Pin Frequently Used Files**: Pin documents you reference often, like current price lists or active policies

4. **Check Token Counts**: Files with very high token counts might not be fully included in every response due to AI context limits. Consider splitting very large documents into smaller, topic-specific files.

5. **Use Clear Text**: PDFs created from scanned images may not extract text well. Use text-based PDFs or Word documents when possible.

---

## Advanced Features

### Token Management

**What Are Tokens?** Tokens are word-like units that the AI uses to process text. A typical English word is about 1-2 tokens. For example, "Hello world" is approximately 3 tokens.

**Why It Matters**: The AI has a maximum context window (the total amount of information it can process at once). Your context files contribute to this limit.

**Your Limits**:
- **Maximum 10,000 tokens** across all context files per conversation
- You can see token counts on each file in your file list

**Managing Tokens**:
- If you have many large files, the AI will select the most relevant ones for each conversation
- Pinned files are prioritised when selecting context
- Consider removing or unpinning files you're not actively using

### File Descriptions

While not yet available in the current interface, future versions will allow you to add descriptions to files. This helps the AI understand what each file contains and when to use it.

### Tags

Future versions will support tagging files (e.g., "pricing", "policies", "contracts") to help organize and filter your context files.

---

## Troubleshooting

### "Storage Quota Exceeded" Error

**Problem**: You see this message when trying to upload a file.

**Solution**:
1. Check your current usage at the top of the Files page
2. Delete files you no longer need to free up space
3. Consider compressing large files before uploading
4. If you regularly exceed the limit, contact support about upgrading your account

### "File Exceeds Maximum Size" Error

**Problem**: You're trying to upload a file larger than 10 MB.

**Solutions**:
1. **For PDFs**: Use a PDF compressor tool to reduce file size
2. **For Images**: Resize or compress images before uploading
3. **For Excel**: Remove unnecessary worksheets or split into multiple files
4. **For Word**: Save as a simpler format or remove embedded images

### "Context File Limit Reached" Error

**Problem**: You've already uploaded 50 files (the maximum for regular users).

**Solutions**:
1. Delete files you no longer need
2. Consolidate multiple related files into a single document
3. Remove duplicate or outdated files

### File Stuck in "Processing" Status

**Problem**: A file has been processing for more than 5 minutes.

**Solutions**:
1. Refresh the page to check if status has updated
2. If still processing after 10 minutes, delete and re-upload
3. Try converting the file to a different format (e.g., save Excel as PDF)
4. Check that the file isn't corrupted by opening it locally

### "Failed" Status with Error Message

**Problem**: File processing failed with an error.

**Common Causes and Solutions**:

**"Failed to download file"**: Network issue during processing. Delete and re-upload.

**"File is encrypted or password-protected"**: Remove password protection and re-upload.

**"No text could be extracted"**:
- For PDFs: The PDF may be a scanned image. Use OCR software to convert to searchable text first.
- For images: Consider uploading a document format (PDF, Word) instead

**"Unknown error"**: The file may be corrupted. Try:
1. Opening the file locally to verify it works
2. Saving it in a different format
3. Re-exporting from the original source

### Context Files Not Being Referenced

**Problem**: The AI doesn't seem to use information from your uploaded files.

**Solutions**:
1. **Check file status**: Ensure files show "Ready" status, not "Processing" or "Failed"
2. **Pin important files**: Pin files you expect to be referenced frequently
3. **Be specific in questions**: Ask questions that clearly relate to the uploaded content
4. **Check relevance**: The AI only includes files relevant to your question
5. **Verify file content**: Use the "View" button to confirm the file contains the information you expect

### Files Disappear or Show Wrong Information

**Problem**: Files you uploaded aren't showing up or display incorrect details.

**Solutions**:
1. **Refresh the page**: Your browser cache may be outdated
2. **Check you're logged in**: Ensure you're viewing the correct account
3. **Verify deletion**: You or another user may have deleted the file
4. **Look for upload confirmation**: Check that uploads actually completed successfully

---

## Best Practices

### Organising Your Files

1. **Use Clear, Descriptive Names**:
   - Good: "2024-Product-Catalogue.xlsx"
   - Bad: "doc1.xlsx"

2. **Keep Files Current**: Remove outdated files and upload new versions when information changes

3. **Pin Active Documents**: Pin the 3-5 files you reference most often

4. **Regular Cleanup**: Periodically review your files and delete ones you no longer need

### Optimising for Performance

1. **Keep Files Focused**: Upload specific documents rather than huge comprehensive files

2. **Monitor Token Counts**: Files with 5,000+ tokens may not be fully used in every conversation

3. **Use Text-Based Formats**: Word and Excel files extract text better than scanned PDFs

4. **Compress Large Files**: Reduce file sizes before uploading to save quota

### Security and Privacy

1. **Sensitive Information**: Only upload files you're comfortable storing in LedgerBot's secure cloud storage

2. **Regular Audits**: Periodically review what files you have uploaded

3. **Remove Confidential Files**: Delete files containing sensitive information when you're done using them

4. **Account Security**: Use a strong password and enable two-factor authentication for your LedgerBot account

---

## Frequently Asked Questions

**Q: How many files can I upload?**
A: Regular users can upload up to 50 files with a total storage limit of 100 MB.

**Q: What file types are supported?**
A: Images (JPEG, PNG, GIF, WebP), PDFs, Word documents (.docx), and Excel spreadsheets (.xlsx).

**Q: How long does processing take?**
A: Usually a few seconds to a minute, depending on file size and complexity.

**Q: Can I upload scanned PDFs?**
A: Yes, but text extraction may fail if the PDF doesn't contain searchable text. Use OCR software first for best results.

**Q: Do I need to tell the AI to use my context files?**
A: No, the AI automatically considers relevant context files when responding to your questions.

**Q: What happens if I delete a file?**
A: The file is permanently removed and can't be referenced in future conversations. You'll need to re-upload it if needed.

**Q: Can I share files with other users?**
A: Not currently. Context files are private to your account.

**Q: Do context files work with agent workspaces?**
A: Yes, context files are available across all conversations, including agent workspaces.

**Q: How do I know which files the AI used?**
A: The AI may mention specific documents in its responses. Future versions will provide explicit source citations.

**Q: What's the difference between context files and attachments in chat?**
A: Context files are persistent and available in all conversations. Chat attachments are specific to a single message and conversation.

---

## Support

If you encounter issues not covered in this guide:

1. **Check file status**: Ensure files show "Ready" status
2. **Review error messages**: Read any error messages carefully for specific guidance
3. **Try re-uploading**: Sometimes deleting and re-uploading resolves processing issues
4. **Contact Support**: Reach out with:
   - Description of the issue
   - File name and type
   - Error message (if any)
   - What you were trying to accomplish

---

## Related Features

**Artifacts**: AI-generated documents that appear in a side panel during conversations. See the Artifacts User Guide for details.

**Q&A Agent**: The Q&A Agent uses a regulatory knowledge base similar to context files but focused on Australian tax and employment law.

**Xero Integration**: Connect your Xero accounting data for real-time financial queries. Context files can complement Xero data for comprehensive analysis.

---

**Last Updated**: November 2025
**Version**: 1.0
**Applies To**: LedgerBot Context Files System

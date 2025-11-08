# Document Management Agent - Integration Guide

**Version**: 1.0
**Last Updated**: 8 November 2024
**Audience**: Developers, System Integrators, Technical Staff

> **Other Documentation**: See also [User Guide](./docmanagement-user-guide.md), [Technical Architecture](./docmanagement-technical-architecture.md), [Development Guide](./docmanagement-development-guide.md)

---

## Table of Contents

1. [Integration with Other Features](#integration-with-other-features)
2. [Context Integration](#context-integration)
3. [Interaction with Other Systems](#interaction-with-other-systems)

---

## Integration with Other Features

The Document Management Agent doesn't work in isolation. It connects with several other LedgerBot systems to provide a comprehensive document management experience.

### Connection with Context Files

Behind the scenes, every document you upload through the Document Management Agent is stored as a "context file" in LedgerBot's broader context management system.

**What this means:**
- Documents processed here can potentially be used in general chat conversations (not just in the agent workspace)
- The same storage quotas and file management rules apply
- You can see uploaded documents in your Files settings page (under Settings > Files)

**How it works:**
When you upload a PDF to the Document Management Agent, the system creates a context file record with special metadata indicating it's an accounting document. This allows other parts of LedgerBot to understand and use this document if needed.

Think of it like filing a paper document in your filing cabinet. You used a specialised intake form (the Document Management Agent), but the document ends up in the same filing system (context files) as other documents, making it available throughout your workflow.

### Connection with Xero Integration

If you've connected your Xero account to LedgerBot, the Document Management Agent can provide enhanced insights:

**Combined Context:**
When you ask questions about a document, LedgerBot can cross-reference information with your Xero data. For example:
- "Does this supplier already exist in my Xero contacts?" - LedgerBot checks your Xero contact list
- "What account code should I use for this expense?" - LedgerBot references your Xero chart of accounts
- "Have we already paid this invoice?" - LedgerBot searches your Xero invoice history

**Workflow Suggestions:**
Based on the document content and your Xero setup, LedgerBot might suggest actions like:
- "This looks like a new supplier. Would you like me to draft a Xero contact record?"
- "This invoice matches Xero invoice #INV-1234 dated 10 October. Shall I check the payment status?"

This integration transforms the agent from a simple document reader into a bookkeeping assistant that understands your business context.

### Connection with Other Agents

While most inter-agent communication is in development, here's how the Document Management Agent is designed to interact with others:

**Reconciliation Agent:**
- Documents processed here can be linked to bank transactions
- Example: Upload a receipt, reconciliation agent suggests matching it to a transaction from 3 days ago

**Compliance Agent:**
- Compliance flags from document processing feed into the compliance dashboard
- Example: Document contains a superannuation payment → compliance agent notes it for quarterly SGC reporting

**Analytics Agent:**
- Financial data extracted from documents contributes to reporting and analytics
- Example: Multiple invoices from a supplier → analytics agent tracks spend trends

**Advisory Q&A Agent:**
- Questions about document interpretation can be escalated to the Q&A agent for regulatory guidance
- Example: "Is this expense GST-claimable?" might trigger a search of ATO tax rulings

**Workflow Supervisor:**
- Document upload can trigger multi-agent workflows
- Example: Upload an invoice → summarise → match to PO → check for Xero duplicate → queue for approval → record in ledger

**Implementation Status:**
Currently, some of these connections are architectural concepts with basic implementations. Full integration is planned for future releases.

### Connection with General Chat

While the Document Management Agent has its own dedicated chat interface for document-specific questions, you can also reference processed documents in general LedgerBot conversations:

**Example general chat conversation:**
> **You**: "I just uploaded an invoice from ABC Supplies. Can you remind me what their payment terms are?"
>
> **LedgerBot**: "Based on the invoice you processed in the Document Management Agent, ABC Supplies offers payment within 14 days with a 2% early payment discount if paid within 7 days."

This allows you to ask about documents without having to navigate back to the agent workspace.

### Connection with User Settings

The agent respects your personalisation settings:

- **Default AI Model**: Uses your preferred AI model selection (e.g., Claude Sonnet, GPT-5)
- **System Prompt Customisation**: Applies your custom system prompt for industry-specific language
- **Template Variables**: Incorporates custom variables like your chart of accounts structure

This ensures document summaries and answers use terminology and frameworks familiar to your business.

---

## Context Integration

How do uploaded documents become part of your conversations with LedgerBot? This section explains the integration layer.

### The Context Manager

LedgerBot includes a "context manager" that decides which information to include when you ask the AI a question.

**Think of it like this:**
Imagine you're asking a colleague a question. Before answering, they might pull relevant files from the filing cabinet, check recent emails, and review notes from past conversations. The context manager does the same thing, but automatically.

**What the context manager considers:**
- Current chat message and conversation history
- Uploaded context files (documents, images)
- Xero financial data (if connected)
- User settings and preferences
- Geographic context (your location for timezone and regulatory context)

### How Documents Influence Chat Responses

**In General Chat:**
When you ask a question in the main LedgerBot chat (not in the Document Management Agent), the context manager:
1. Checks if you have any context files uploaded
2. Searches file descriptions and extracted text for relevance to your question
3. Selects the most relevant files (usually top 2-3)
4. Includes excerpts from those files in the AI prompt
5. AI generates a response informed by your documents

**Example:**
> **You**: "What were our total office supply expenses last quarter?"
>
> **Context Manager** thinks:
> - User has uploaded 5 invoices from ABC Office Supplies
> - These were created in the last quarter
> - Extract amounts from those invoices
>
> **LedgerBot**: "Based on the invoices you uploaded, your office supply expenses from ABC Office Supplies last quarter totalled $4,250 including GST."

**In Document Agent Chat:**
When you ask a question within the Document Management Agent, the context is more focused:
1. Only the current document is considered (not your entire file library)
2. Relevant sections of that document are selected based on your question
3. The overall summary provides high-level context
4. Specific section excerpts provide detailed answers

This focused approach prevents the AI from getting confused by information from other documents.

### Pinned vs Unpinned Documents

Future versions will support "pinning" documents:

**Pinned Documents:**
- Always included in context for general chat
- Useful for reference materials (your chart of accounts, company policies)
- Take priority over unpinned documents

**Unpinned Documents:**
- Included only when relevant to the current question
- Ranked by relevance score
- Most recent documents may be prioritised

### Context Window Management

**The Challenge:**
AI models have a maximum "context window" (the total amount of text they can process in one request). For example, Claude Sonnet 4.5 has a 200,000 token limit.

**The Budget:**
A typical chat request might budget tokens like this:
- System prompt: 2,000 tokens
- Conversation history: 5,000 tokens
- Context files: 10,000 tokens
- User question: 500 tokens
- Reserved for AI response: 4,000 tokens
- Total: 21,500 tokens (well within 200,000 limit)

**When documents are large:**
If your uploaded document is 50,000 tokens, it won't fit in the context budget. The context manager:
- Selects only the most relevant sections (maybe 5,000 tokens worth)
- Summarises the rest into a brief overview
- Ensures the AI still has enough information to answer your question

**Implications:**
For very large documents, the AI may not "see" every detail. If you ask about something in a less relevant section, it might not have that information. This is why section-based chat (in the Document Management Agent) is more effective than general chat for detailed document questions.

### Context Freshness

**How context stays current:**
- `lastUsedAt` timestamp is updated each time a file is referenced
- Files used recently may be prioritised for context inclusion
- Outdated documents (e.g., last year's invoices) may be deprioritised

**Manual context control:**
Currently, you don't have fine-grained control over which files are included in context. Future versions will allow you to:
- Explicitly select files for a conversation
- Exclude files temporarily
- Create context collections (e.g., "Q1 2024 Invoices")

---

## Interaction with Other Systems

The Document Management Agent is one piece of a larger LedgerBot ecosystem. Here's how it connects to other parts.

### Chat System Integration

**Shared Infrastructure:**
Both the Document Management Agent's chat and the main LedgerBot chat use the same underlying AI engine and streaming infrastructure.

**Differences:**
- **Document Agent Chat**: Context limited to a single document, responses cite specific sections
- **General Chat**: Context includes conversation history, multiple files, Xero data, broader knowledge

**Data Flow:**
When you ask a question in the Document Agent:
1. Question sent to chat API endpoint (`/api/agents/docmanagement`)
2. Chat service retrieves document summary and sections from database
3. Prompt constructed with focused document context
4. AI response streamed back using Server-Sent Events (SSE)
5. Response displayed word-by-word in the UI

This is the same flow as general chat, just with a different context selection strategy.

### Xero Integration

**Connection Layer:**
When you connect your Xero account (via Settings > Integrations), LedgerBot stores an encrypted OAuth token that allows it to access your Xero data.

**Document + Xero Context:**
When processing a document, if Xero is connected:
- Supplier names are cross-referenced with Xero contacts
- Account codes mentioned are validated against your chart of accounts
- Invoice numbers can be checked for duplicates in Xero
- Payment status can be queried

**Example Workflow:**
1. Upload an invoice from "ABC Office Supplies"
2. LedgerBot checks Xero: "Do we have a contact named ABC Office Supplies?"
3. If yes: "This is a known supplier (Contact ID: 12345)"
4. If no: "This appears to be a new supplier"
5. You ask: "What account code should I use for 'office furniture'?"
6. LedgerBot checks your Xero chart of accounts: "Account 684 - Office Equipment"

**Privacy Note:**
Xero integration is optional. If you don't connect Xero, the agent still works; it just can't provide business-specific suggestions.

### Other Agent Connections

While most inter-agent communication is in development, here's how the Document Management Agent is designed to interact with others:

**Reconciliation Agent:**
- Documents processed here can be linked to bank transactions
- Example: Upload a receipt, reconciliation agent suggests matching it to a transaction from 3 days ago

**Compliance Agent:**
- Compliance flags from document processing feed into the compliance dashboard
- Example: Document contains a superannuation payment → compliance agent notes it for quarterly SGC reporting

**Analytics Agent:**
- Financial data extracted from documents contributes to reporting and analytics
- Example: Multiple invoices from a supplier → analytics agent tracks spend trends

**Workflow Supervisor:**
- Document upload can trigger multi-agent workflows
- Example: New invoice → check for duplicate → match to PO → queue for approval → record in Xero

**Implementation Status:**
Currently, these connections are architectural concepts with basic implementations. Full integration is planned for future releases.

### User Settings Integration

**Personalisation:**
The agent respects your personalisation settings:
- **Default Model**: Summarisation uses your preferred AI model (Claude Sonnet, GPT-5, etc.)
- **System Prompt**: Custom system prompts are applied to document analysis
- **Template Variables**: Custom variables (like `{{CHART_OF_ACCOUNTS}}`) are substituted in prompts

**Example:**
If you've customised your system prompt to use Australian industry-specific terminology (e.g., "rental income" instead of "lease revenue"), the document summaries will use that terminology.

**Entitlements:**
Your account type (regular, pro, enterprise) determines:
- Storage quotas (file count and total size)
- Processing priority (higher tiers may get faster processing)
- Advanced features (future: priority support, larger file sizes)

### Database Integration

**Data Persistence:**
Everything about your documents is stored in the PostgreSQL database:
- File metadata (name, size, type, URL)
- Extracted text and token count
- Processing status and error messages
- Usage timestamps (created, last used, processed)

**Queries:**
The system runs various database queries:
- Get all files for a user (for Files settings page)
- Get file by ID (for loading a specific document)
- Update file status (during processing pipeline)
- Calculate storage usage (for quota enforcement)

**Performance:**
Database queries are optimised with indexes on frequently queried fields (user ID, status, creation date).

---

**Document Version**: 1.0
**Last Updated**: 8 November 2024
**Next**: See [Development Guide](./docmanagement-development-guide.md) for extension points and roadmap
**Feedback**: Please send suggestions for improving this guide to docs@ledgerbot.com

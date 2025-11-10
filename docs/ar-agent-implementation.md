# AR Agent Implementation Summary

## Overview

The Accounts Receivable (AR) Agent has been successfully implemented for LedgerBot. This agent helps bookkeepers, accountants, and small businesses manage receivables, reduce Days Sales Outstanding (DSO), and generate copy-ready payment reminders.

**CRITICAL**: The agent **NEVER** sends communications externally. It only generates copy-ready artefacts for users to manually send.

## Implementation Status: ✅ COMPLETE

All deliverables have been implemented and are ready for testing.

## Files Created

### Database Schema
- `/lib/db/schema/ar.ts` - Complete AR schema with 6 tables:
  - `ArContact` - Customer contact information
  - `ArInvoice` - Invoice records with status tracking
  - `ArPayment` - Payment reconciliation records
  - `ArReminder` - Scheduled reminder tracking
  - `ArCommsArtefact` - Generated communication artefacts (email/SMS)
  - `ArNote` - Internal notes on invoices

### Database Queries
- `/lib/db/queries/ar.ts` - 15 query helpers including:
  - `listInvoicesDue()` - Get due/overdue invoices
  - `getInvoiceWithContact()` - Invoice with contact details
  - `upsertContacts()` - Sync contacts from Xero
  - `upsertInvoices()` - Sync invoices from Xero
  - `insertPayment()` - Record payment and update status
  - `createCommsArtefact()` - Store generated communications
  - `createNote()` - Add internal notes
  - Plus helpers for reminders, artefacts, and contacts

### Utilities
- `/lib/util/redact.ts` - PII redaction utilities:
  - `maskEmail()` - Mask email addresses
  - `maskPhone()` - Mask phone numbers
  - `redactPii()` - Redact PII from objects/strings
  - `redactLog()` - Safe logging with PII protection

- `/lib/util/dates.ts` - Date helpers:
  - `daysBetween()` - Calculate days between dates
  - `asOfOrToday()` - Default to today if no date provided
  - `formatIsoDate()` - ISO date formatting
  - `formatDisplayDate()` - Australian date format (DD/MM/YYYY)
  - `getDaysOverdue()` - Calculate overdue days
  - Plus timezone and business day helpers

### Xero Integration
- `/lib/tools/ar/xero.ts` - Xero integration with deterministic mocks:
  - Real Xero provider when credentials configured
  - Deterministic mock provider for development/testing
  - Mock data includes 4 sample invoices with realistic overdue periods
  - `listInvoices()` - Get invoices with filtering
  - `markPaid()` - Record payment in Xero
  - `listContacts()` - Get customer contacts

### Mastra Tools
- `/lib/tools/ar/messaging.ts` - 6 Mastra tools:
  - `getInvoicesDueTool` - List due/overdue invoices
  - `predictLateRiskTool` - Calculate late payment probability
  - `buildEmailReminderTool` - Generate email artefact
  - `buildSmsReminderTool` - Generate SMS artefact
  - `reconcilePaymentTool` - Record payment
  - `postNoteTool` - Add internal note
  - `syncXeroTool` - Sync from Xero (or mock)

### Agent & Workflow
- `/prompts/ar/system.md` - Comprehensive system prompt with:
  - Role definition and objectives
  - Tone guidelines (polite/firm/final)
  - Workflow states documentation
  - Australian compliance requirements
  - Critical guardrails (NO sending)

- `/lib/agents/ar/agent.ts` - Mastra Agent implementation:
  - All tools registered
  - System prompt loaded from markdown
  - Model configuration with user overrides

- `/lib/agents/ar/workflow.ts` - Mastra workflow with 5 steps:
  - Triage → Fetch → Assess → Propose → Act
  - Streaming progress updates
  - Conditional artefact generation (autoConfirm)

### API Routes
- `/app/api/agents/ar/route.ts` - Chat endpoint:
  - Streaming with Vercel AI SDK
  - User context injection
  - Settings support (model, tone, minDaysOverdue)
  - Max duration: 60 seconds

- `/app/api/agents/ar/run-dunning/route.ts` - Batch dunning:
  - Server-sent events (SSE) for progress
  - Workflow execution with state tracking
  - Error handling and validation

### UI
- `/app/agents/ar/page.tsx` - Agent dashboard:
  - Chat interface with message history
  - Filter panel (asOf, minDaysOverdue, tone)
  - Auto-confirm toggle
  - "Run Dunning Cycle" button
  - Suggested questions
  - "Comms Disabled" badge

### Configuration
- `.env.example` - Environment variables added:
  - `COMMS_ENABLED=false` (hard guard)
  - `AR_DEFAULT_TONE=polite`

- `/lib/mastra/index.ts` - AR agent registered:
  - Added to agents object
  - Type safety with AgentNames union
  - Exported for direct use

### Documentation
- `README.md` - AR agent section added:
  - Features and use cases
  - Guardrails and compliance
  - Workflow states
  - API endpoints
  - Environment variables

## Key Features

### 1. Invoice Management
- List due/overdue invoices with filters
- Sync from Xero (or use mock data)
- Track payment status
- Calculate days overdue

### 2. Risk Assessment
- Predict late payment probability (0-1 score)
- Factors: days overdue, invoice amount, payment history
- Risk-based tone recommendations

### 3. Communication Generation (NO SENDING!)
- Generate email reminders (subject + body)
- Generate SMS text messages
- Three tones: polite, firm, final
- Australian English and consumer law compliance
- All artefacts stored in database for reference

### 4. Payment Reconciliation
- Record payments against invoices
- Automatic status updates (awaiting → partially_paid → paid)
- Track payment methods and references

### 5. Workflow Orchestration
- Multi-step dunning cycle
- Streaming progress updates
- Conditional execution (autoConfirm)
- Error handling and validation

## Guardrails & Compliance

### Critical: Communications DISABLED
- ⚠️ Agent NEVER sends emails or SMS
- ✅ Only generates copy-ready artefacts
- ✅ `COMMS_ENABLED=false` enforced
- ✅ Users must manually copy and send

### Australian Compliance
- Date format: DD/MM/YYYY
- Professional Australian English
- Consumer Law principles:
  - No harassment or coercion
  - Clear creditor identification
  - Accurate debt representation
  - Privacy respect (PII redaction)

### Privacy Protection
- Email addresses masked in logs (show first 2 chars only)
- Phone numbers masked in logs (show last 3 digits only)
- `redactPii()` utility for all logging

## Testing

### Mock Xero Provider
When Xero credentials are not configured, the system uses deterministic mock data:
- 4 sample invoices (15, 5, 30, and -10 days overdue)
- 3 sample contacts (Acme Pty Ltd, Smith & Co, Tech Solutions Ltd)
- Realistic amounts and GST calculations
- Repeatable results for testing

### Unit Test Recommendations
1. `predictLateRisk()` - Verify deterministic scores
2. `listInvoicesDue()` - Test filtering and date ranges
3. `buildEmailReminder()` / `buildSmsReminder()` - Verify artefact creation
4. `reconcilePayment()` - Test status updates
5. `redactPii()` - Verify PII masking

### Integration Test Recommendations
1. Full dunning workflow execution
2. Xero sync with mock provider
3. API route streaming responses
4. UI interaction flows

## Database Migration

Run the following to generate and apply the migration:

```bash
pnpm db:generate  # Generate migration from schema
pnpm db:migrate   # Apply migration to database
```

The migration will create 6 new tables:
- ArContact
- ArInvoice
- ArPayment
- ArReminder
- ArCommsArtefact
- ArNote

## Usage Examples

### Example 1: List Overdue Invoices
**User**: "Show me all invoices overdue by at least 7 days"

**Agent**:
1. Calls `getInvoicesDue({ userId, minDaysOverdue: 7 })`
2. Returns list with contact details and days overdue
3. Suggests risk assessment and reminders

### Example 2: Generate Reminders
**User**: "Generate polite reminders for these invoices"

**Agent**:
1. Calls `predictLateRisk()` for each invoice
2. Proposes dunning plan with recommended actions
3. Waits for confirmation (unless autoConfirm=true)
4. Calls `buildEmailReminder()` for each invoice
5. Returns artefact IDs and copy-ready text
6. Includes `commsEnabled: false` in summary

### Example 3: Record Payment
**User**: "Record $5,500 payment for INV-2025-001, paid today"

**Agent**:
1. Calls `reconcilePayment({ invoiceId, amount: 5500, paidAt: today })`
2. Updates invoice status to "paid"
3. Returns updated invoice details

### Example 4: Batch Dunning Cycle
**UI**: User clicks "Run Dunning Cycle" with:
- minDaysOverdue: 30
- tone: firm
- autoConfirm: true

**System**:
1. Calls `/api/agents/ar/run-dunning`
2. Workflow executes: triage → fetch → assess → propose → act
3. Streams progress updates via SSE
4. Generates artefacts for all invoices
5. Returns summary with artefact IDs

## Next Steps

1. **Install dependencies**: Run `pnpm install` to install required packages
2. **Generate migration**: Run `pnpm db:generate` to create migration files
3. **Apply migration**: Run `pnpm db:migrate` to create AR tables
4. **Configure Xero** (optional): Add Xero credentials to `.env.local` or use mock data
5. **Test locally**: Visit `/agents/ar` to test the UI
6. **Sync invoices**: Use "Sync invoices from Xero" or let it use mock data
7. **Generate reminders**: Test artefact generation with polite/firm/final tones
8. **Verify guardrails**: Confirm no external sending occurs

## Architecture Notes

### Why Deterministic Mocks?
- Enables testing without Xero account
- Repeatable results for CI/CD
- Fast development iteration
- Clear separation of concerns

### Why NO Sending?
- User control over customer communications
- Avoids legal/compliance risks
- Respects email/SMS service rate limits
- Allows review before sending
- Maintains audit trail

### Why Three Tones?
- **Polite (1-30 days)**: Friendly reminder, assumes good faith
- **Firm (31-60 days)**: Professional urgency, emphasises obligation
- **Final (60+ days)**: Serious consequences, escalation warning

### Why Mastra Framework?
- Unified agent architecture
- Built-in tool integration
- Workflow orchestration
- Observability and monitoring
- Type-safe tool definitions

## Support & Troubleshooting

### Issue: Agent not responding
**Solution**: Check that AR agent is registered in `/lib/mastra/index.ts`

### Issue: "Invoice not found" errors
**Solution**: Run sync from Xero or verify mock data is loaded

### Issue: PII visible in logs
**Solution**: Ensure `redactLog()` is used for all logging

### Issue: Workflow fails at "act" step
**Solution**: Check `autoConfirm` is true, or manually confirm in chat

### Issue: Mock data not appearing
**Solution**: Verify `XERO_CLIENT_ID` is not set, triggering mock mode

## License

This AR Agent implementation follows the same MIT license as the main LedgerBot project.

---

**Implementation Date**: 2025-11-10
**Status**: ✅ Complete and ready for testing
**Version**: 1.0.0

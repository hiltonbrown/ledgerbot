# Accounts Receivable (AR) Agent - User Guide

## Overview

The **Accounts Receivable Agent** is your AI-powered assistant for managing customer invoices, reducing Days Sales Outstanding (DSO), and maintaining positive customer relationships. It helps you identify overdue payments, assess late payment risk, and generate professional payment reminders—all while you maintain complete control over customer communications.

**Important**: The AR Agent generates communication drafts only. It does not send emails or SMS messages automatically. You always review and send communications manually.

## Getting Started

### Accessing the AR Agent

1. Navigate to `/agents/ar` in LedgerBot
2. The AR Agent workspace will load with a chat interface
3. No initial setup is required—you can start asking questions immediately

### Key Features

- **Invoice Tracking**: View all due and overdue invoices with detailed aging
- **Risk Assessment**: AI-powered prediction of late payment probability
- **Payment Reminder Generation**: Professional email and SMS drafts ready to copy
- **Payment Reconciliation**: Record payments and automatically update invoice status
- **Xero Integration**: Sync invoices and contacts from your Xero account (optional)
- **Customer Notes**: Track internal notes and communication history

## Core Workflows

### 1. Viewing Overdue Invoices

The most common starting point is to see what's outstanding:

**Example Questions:**
- "Show me all invoices that are overdue"
- "What invoices are due in the next 7 days?"
- "List all overdue invoices for Acme Pty Ltd"
- "Show me invoices that are more than 30 days overdue"

**What the Agent Does:**
1. Fetches invoices using the `getInvoicesDue` tool
2. Calculates days overdue for each invoice
3. Shows customer details (name, email, phone)
4. Displays amount due and payment status

**Example Response:**
```
I found 3 invoices that are overdue:

1. Invoice INV-001 - Acme Pty Ltd
   • Due Date: 15/09/2025
   • Amount Due: $2,450.00
   • Days Overdue: 56 days
   • Contact: john@acme.com.au | 0412 345 678

2. Invoice INV-002 - Smith & Co
   • Due Date: 28/09/2025
   • Amount Due: $890.50
   • Days Overdue: 43 days
   • Contact: sarah@smithco.com.au | 0423 456 789

3. Invoice INV-003 - Tech Solutions Ltd
   • Due Date: 05/10/2025
   • Amount Due: $5,200.00
   • Days Overdue: 36 days
   • Contact: admin@techsolutions.com.au | 0434 567 890
```

### 2. Assessing Late Payment Risk

Understand which invoices are most likely to require escalation:

**Example Questions:**
- "What's the late payment risk for invoice INV-001?"
- "Which overdue invoices have the highest risk?"
- "Assess the risk for all invoices from Acme Pty Ltd"

**Risk Factors Considered:**
- **Days Overdue**: Exponential impact (longer overdue = higher risk)
- **Invoice Amount**: High-value invoices ($10,000+) carry higher risk
- **Payment Status**: Partially paid invoices have lower risk
- **Payment History**: Pattern analysis (if data available)

**Risk Probability Scale:**
- **0.00 - 0.30**: Low risk (likely to be paid soon)
- **0.31 - 0.60**: Medium risk (requires monitoring)
- **0.61 - 0.95**: High risk (urgent follow-up needed)

**Example Response:**
```
Risk Assessment for Invoice INV-001:

• Probability: 0.78 (High Risk)
• Contributing Factors:
  - 56 days overdue (primary driver)
  - Invoice marked as overdue
• Recommendation: Generate firm or final reminder immediately
```

### 3. Generating Payment Reminders

Create professional communication drafts to send to customers:

#### Email Reminders

**Example Questions:**
- "Generate a polite reminder email for invoice INV-001"
- "Create a firm payment reminder for all invoices overdue by 30+ days"
- "Draft a final notice email for invoice INV-002"

**Tone Guidelines:**

| Tone | Days Overdue | Approach |
|------|--------------|----------|
| **Polite** | 1-30 days | Friendly reminder, assumes good faith |
| **Firm** | 31-60 days | Professional but urgent, emphasizes obligation |
| **Final** | 60+ days | Serious notice with escalation warning |

**Example Response (Polite Tone):**
```
EMAIL REMINDER DRAFT

Subject: Friendly Reminder - Invoice INV-001 Due

Dear John,

I hope this email finds you well. This is a friendly reminder that Invoice INV-001, issued on 20/08/2025, is now 56 days past its due date.

Invoice Details:
• Invoice Number: INV-001
• Due Date: 15/09/2025
• Amount Due: $2,450.00 AUD
• Days Overdue: 56

If you have already processed this payment, please disregard this message. If not, we would appreciate payment at your earliest convenience.

If you have any questions or need to discuss payment arrangements, please don't hesitate to contact us.

Kind regards,

[Your Business Name]
[Your Contact Details]
[ABN: Your ABN]

---

This draft has been saved as Artefact ID: art_abc123xyz
Copy this draft and send it manually from your email client.
```

#### SMS Reminders

**Example Questions:**
- "Create a polite SMS reminder for invoice INV-003"
- "Generate SMS reminders for all invoices overdue by 7+ days"

**SMS Format:**
- Concise (ideally under 160 characters)
- Includes contact name, invoice number, amount, days overdue
- Clear call to action

**Example Response:**
```
SMS REMINDER DRAFT (Polite)

Hi Sarah, Invoice INV-002 ($890.50) is 43 days overdue. Please arrange payment or contact us if you need to discuss. Thanks - [Your Business]

Character count: 152

---

This draft has been saved as Artefact ID: art_xyz789abc
Copy this text and send it manually from your SMS platform.
```

### 4. Recording Payments

When customers pay, update the invoice status automatically:

**Example Questions:**
- "Record a payment of $2,450 for invoice INV-001 received today"
- "Mark invoice INV-002 as paid with reference REF123456"
- "Customer paid $450 on invoice INV-003 on October 20th"

**What the Agent Does:**
1. Records payment with amount, date, and reference
2. Updates invoice status:
   - Full payment → Status changes to "paid"
   - Partial payment → Status changes to "partially_paid"
   - Remaining balance calculated automatically
3. Creates audit trail with timestamp

**Example Response:**
```
Payment recorded successfully!

Invoice: INV-001
Payment Amount: $2,450.00
Payment Date: 10/11/2025
Status Updated: awaiting_payment → paid

The invoice is now fully paid. Well done on collecting this payment!
```

### 5. Syncing with Xero

Keep your AR data up-to-date with Xero integration:

**Example Questions:**
- "Sync invoices from Xero"
- "Update all customer contacts from Xero"
- "Pull new invoices from Xero since last week"

**Requirements:**
- Active Xero connection (configure in Settings → Integrations)
- Appropriate Xero scopes (accounting.transactions, accounting.contacts)

**What Gets Synced:**
- **Contacts**: Customer names, emails, phone numbers, Xero IDs
- **Invoices**: Invoice numbers, amounts, due dates, payment status
- **Payments**: Payment history and references

**Example Response (Xero Connected):**
```
Xero Sync Complete!

Synced:
• 47 contacts updated
• 23 invoices synchronized
• Last sync: 10/11/2025 14:32 AEST

All invoice data is now current as of today.
```

**Example Response (Mock Data):**
```
Using mock data (Xero not configured)

Synced:
• 4 sample contacts
• 8 sample invoices

To use real data, connect your Xero account in Settings → Integrations.
```

### 6. Adding Customer Notes

Track internal communication and follow-up actions:

**Example Questions:**
- "Add a note to invoice INV-001: Customer called, promised to pay by Friday"
- "Record a note for Acme Pty Ltd about payment plan discussion"
- "Log that I sent a payment reminder email today"

**Example Response:**
```
Note added successfully!

Customer: Acme Pty Ltd
Invoice: INV-001
Note: "Customer called, promised to pay by Friday"
Created: 10/11/2025 14:45 AEST

This note is visible to all team members with access to this invoice.
```

## Running a Complete Dunning Cycle

A "dunning cycle" is the process of systematically following up on overdue invoices. Here's a complete workflow:

### Step 1: Triage and Planning

**Your Request:**
> "Run a dunning cycle for all invoices overdue by at least 7 days. Use firm tone for anything over 30 days overdue."

**Agent Response:**
```
DUNNING CYCLE - TRIAGE

Parameters:
• As of Date: 10/11/2025
• Minimum Days Overdue: 7 days
• Tone Strategy: Firm for 30+ days, Polite for 7-29 days
• Auto-Confirm: false (manual approval required)

Fetching overdue invoices...
```

### Step 2: Assessment and Proposal

**Agent Response:**
```
DUNNING CYCLE - ASSESSMENT

Found 5 invoices requiring follow-up:

HIGH PRIORITY (Firm Tone):
1. INV-001 - Acme Pty Ltd | $2,450.00 | 56 days | Risk: 0.78
2. INV-002 - Smith & Co | $890.50 | 43 days | Risk: 0.65
3. INV-003 - Tech Solutions | $5,200.00 | 36 days | Risk: 0.72

STANDARD PRIORITY (Polite Tone):
4. INV-004 - Widget Corp | $1,200.00 | 14 days | Risk: 0.35
5. INV-005 - Building Supplies | $650.00 | 9 days | Risk: 0.28

PROPOSED ACTIONS:
• Generate 3 firm email reminders (INV-001, INV-002, INV-003)
• Generate 2 polite email reminders (INV-004, INV-005)
• Total amount to follow up: $10,390.50

Shall I proceed to generate these communication artefacts?
```

### Step 3: Confirmation and Generation

**Your Response:**
> "Yes, proceed"

**Agent Response:**
```
DUNNING CYCLE - GENERATING ARTEFACTS

✓ Created email reminder for INV-001 (Artefact: art_001)
✓ Created email reminder for INV-002 (Artefact: art_002)
✓ Created email reminder for INV-003 (Artefact: art_003)
✓ Created email reminder for INV-004 (Artefact: art_004)
✓ Created email reminder for INV-005 (Artefact: art_005)

All 5 artefacts have been generated and saved.
```

### Step 4: Review and Send

**Agent Response:**
```
DUNNING CYCLE - COMPLETE

Summary:
• 5 payment reminder drafts created
• Total follow-up amount: $10,390.50
• High-priority invoices: 3
• Average days overdue: 32 days

NEXT STEPS:
1. Review each email draft (artefact IDs listed above)
2. Copy drafts into your email client
3. Customize if needed (add specific customer context)
4. Send manually to customers
5. Return here to record payments as they arrive

Metadata:
• commsEnabled: false (manual sending required)
• artefactsCreated: 5
• asOf: 2025-11-10
```

## Understanding Tone Recommendations

The AR Agent automatically suggests appropriate tones based on how overdue an invoice is:

### Polite Tone (1-30 days overdue)

**Characteristics:**
- Friendly and non-confrontational
- Assumes oversight or processing delay
- Emphasizes relationship maintenance
- Offers to discuss if needed

**When to Use:**
- Recently overdue invoices
- Customers with good payment history
- Small amounts or minor delays

**Example Opening:**
> "I hope this finds you well. This is a friendly reminder that Invoice INV-001 is now due. If you've already paid, please disregard this message."

### Firm Tone (31-60 days overdue)

**Characteristics:**
- Professional but urgent
- Emphasizes payment obligation
- Requests immediate action
- Maintains professional boundary

**When to Use:**
- Invoices significantly overdue
- Customers who haven't responded to polite reminders
- Medium to high-value invoices

**Example Opening:**
> "This is to advise that payment for Invoice INV-001 remains outstanding. The invoice was due on 15/09/2025 (43 days ago) and requires immediate attention."

### Final Tone (60+ days overdue)

**Characteristics:**
- Serious and formal
- Includes escalation warning
- Sets clear deadline (typically 7 days)
- Mentions potential consequences

**When to Use:**
- Long-overdue invoices
- Customers who have ignored multiple reminders
- Invoices at risk of being written off

**Example Opening:**
> "FINAL NOTICE: Payment for Invoice INV-001 ($2,450.00) is now 87 days overdue. Immediate action is required to avoid escalation of this matter."

**Important**: Final notices should mention potential consequences (debt collection, legal action, service suspension) but should NOT make specific legal threats. Always include clear contact information for resolution.

## Australian Compliance & Best Practices

### Date Format
- Always use Australian format: DD/MM/YYYY
- Example: 10/11/2025 (not 11/10/2025)

### Currency
- Display amounts as: $1,234.56 AUD
- Include GST details if applicable

### Australian Consumer Law Principles
The AR Agent adheres to Australian Consumer Law standards:

1. **No Harassment**: Communications are professional and measured
2. **Clear Creditor Identification**: All drafts include your business details
3. **Accurate Debt Representation**: Amounts and dates are verified
4. **Privacy Protection**: Customer PII is redacted in logs

### Privacy and Data Protection

**What Gets Logged:**
- Redacted emails: `jo****@acme.com.au`
- Redacted phones: `***456 789`
- Invoice numbers and amounts (not sensitive)

**What Doesn't Get Logged:**
- Full customer email addresses
- Full phone numbers
- Customer payment card details (never stored)

## Integration with Xero

### Setting Up Xero Connection

1. Navigate to **Settings → Integrations**
2. Click **Connect to Xero**
3. Authorize LedgerBot with required scopes:
   - `accounting.transactions`: Invoice access
   - `accounting.contacts`: Customer access
   - `offline_access`: Token refresh
4. Select your Xero organization
5. Return to AR Agent and sync

### What Xero Integration Provides

| Without Xero | With Xero |
|--------------|-----------|
| Mock sample data (4 invoices) | Real invoice data from your Xero organization |
| Manual invoice entry | Automatic synchronization |
| Limited customer details | Full contact information including payment terms |
| No payment history | Complete payment history and references |

### Syncing Best Practices

- **Initial Sync**: Run a full sync when first connecting Xero
- **Regular Syncs**: Sync daily or before running dunning cycles
- **Incremental Syncs**: Use `since` parameter for faster updates
- **Verify After Sync**: Check invoice counts match expectations

## Common Questions

### Can the AR Agent send emails automatically?

**No.** The AR Agent only generates communication drafts (artefacts). You must review and send them manually from your own email client or SMS platform. This ensures you maintain control over customer communications and can add personal touches as needed.

### How accurate is the late payment risk prediction?

The risk model considers multiple factors (days overdue, amount, status, history) and provides a probability score from 0.00 to 0.95. It's a helpful indicator for prioritization, but should not be the only factor in your decision-making. Use it alongside your knowledge of customer relationships.

### Can I customize the email templates?

Yes! The generated drafts are plain text that you can edit before sending. Common customizations include:
- Adding customer-specific context
- Referencing previous conversations
- Adjusting tone based on relationship
- Including payment plan options

### What if a customer says they've already paid?

1. Ask the customer for payment reference/date
2. Use the reconciliation tool: "Record payment of $X for invoice INV-001 received on [date] with reference [ref]"
3. If payment can't be found, investigate with your bank or Xero
4. Always add a note about the customer's claim

### Does the AR Agent support multiple currencies?

Currently, the AR Agent displays all amounts in the currency stored in your database or Xero. Multi-currency invoicing is supported if configured in Xero, but all amounts are shown as provided by Xero without conversion.

### Can I automate the dunning cycle?

The AR Agent requires manual confirmation before generating artefacts (unless `autoConfirm=true` is set, which is not recommended for production use). This ensures you review the proposal and can adjust as needed based on customer relationships or current circumstances.

## Keyboard Shortcuts & Tips

### Chat Interface
- **Enter**: Send message (Shift+Enter for new line)
- **Esc**: Clear input field
- **↑ / ↓**: Navigate message history

### Productivity Tips
1. **Use Batch Commands**: "Generate polite reminders for all invoices overdue by 7+ days"
2. **Filter by Customer**: "Show all invoices for Acme Pty Ltd"
3. **Set Thresholds**: "List invoices with late risk above 0.6"
4. **Track Follow-ups**: Add notes after each communication sent

## Troubleshooting

### "Sync AR Session" Button Required

**Issue**: Chat shows "Sync required" badge
**Solution**: Click "Sync AR Session" button to initialize the agent with your context

### No Invoices Found

**Issue**: Agent reports no invoices
**Possible Causes:**
- Xero not connected (using empty mock data)
- All invoices are paid
- Filters too restrictive (e.g., minDaysOverdue too high)

**Solution**: Connect Xero or adjust filters

### Xero Sync Fails

**Issue**: "Failed to sync from Xero"
**Possible Causes:**
- Xero connection expired (tokens refresh automatically but may need reauthorization)
- Network issue
- Xero API temporarily unavailable

**Solution:**
1. Check Settings → Integrations for connection status
2. Reconnect to Xero if needed
3. Try again after a few minutes
4. Fall back to mock data for testing

### Artefact Not Saving

**Issue**: "Failed to create artefact"
**Possible Causes:**
- Database connection issue
- Invalid invoice ID
- Missing required fields

**Solution:** Try regenerating the artefact or contact support if issue persists

## Support & Feedback

### Getting Help
- In-app: Use the chat to ask "How do I [task]?"
- Documentation: Check `/docs/ar-agent-user-guide.md` (this file)
- GitHub Issues: [Report bugs or suggest features](https://github.com/anthropics/claude-code/issues)

### Feature Requests
The AR Agent is continuously improving. Common feature requests include:
- Bulk SMS sending integration
- Payment plan tracking
- Custom email templates
- Payment gateway integration
- Advanced reporting and analytics

## Best Practices Summary

1. **Regular Monitoring**: Review overdue invoices weekly
2. **Early Intervention**: Follow up on invoices within 7 days of due date
3. **Tone Escalation**: Progress from polite → firm → final over 90 days
4. **Document Everything**: Add notes for every customer interaction
5. **Sync Regularly**: Keep Xero data current with daily syncs
6. **Risk-Based Prioritization**: Focus on high-risk, high-value invoices first
7. **Personal Touch**: Always review and customize drafts before sending
8. **Follow Australian Standards**: Use DD/MM/YYYY dates and professional language
9. **Respect Privacy**: Never share customer payment details publicly
10. **Maintain Relationships**: Balance collection with customer retention

## Quick Reference Card

| Task | Example Command |
|------|----------------|
| View overdue invoices | "Show me all overdue invoices" |
| Check specific customer | "List all invoices for Acme Pty Ltd" |
| Assess risk | "What's the late payment risk for invoice INV-001?" |
| Generate email reminder | "Create a firm reminder email for invoice INV-001" |
| Generate SMS reminder | "Draft a polite SMS for invoice INV-002" |
| Record payment | "Record payment of $1,234.56 for INV-003 received today" |
| Add note | "Add note to INV-001: Customer promised payment Friday" |
| Sync from Xero | "Sync invoices from Xero" |
| Run dunning cycle | "Run dunning cycle for invoices overdue by 14+ days" |

---

**Remember**: The AR Agent is your assistant, not a replacement for your judgment. Always review communications before sending, consider customer relationships, and maintain the professional reputation of your business.

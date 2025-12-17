# Workflow 12: Automated Quote-to-Invoice Conversion

## Overview

LedgerBot's automated quote-to-invoice conversion workflow monitors accepted quotes in Xero, automatically converts them to invoices when project milestones are reached (based on integrated project management data or calendar triggers), applies correct pricing and GST, and sends invoices to customers without manual intervention.

This workflow eliminates the manual step of converting quotes to invoices, ensures timely billing when milestones are achieved, and improves cash flow by reducing delays between work completion and invoice issuance.

## How It Works

1. **Quote Monitoring**: LedgerBot tracks all quotes in Xero marked as "Accepted"
2. **Trigger Detection**: Identifies when invoicing should occur based on:
   - Calendar dates (e.g., first day of month for recurring services)
   - Project milestones (completion triggers)
   - Manual instruction ("convert quote Q-1234 to invoice now")
   - Progress percentage (for milestone billing)
3. **Invoice Generation**: Creates invoice from quote preserving all details
4. **Verification**: Checks pricing, GST treatment, customer details
5. **Delivery**: Sends invoice to customer (or saves as draft for review)

## Prerequisites

- Active Xero connection established
- Quotes created in Xero with appropriate status
- Clear invoicing terms and milestone definitions
- Optional: Project management integration or milestone tracking

## Step-by-Step Guide

### 1. Create Quote in Xero

Start with a properly structured quote including:
- Line items with descriptions and pricing
- Payment terms and milestones (in notes if applicable)
- Total amount and GST

### 2. Mark Quote as Accepted

When customer accepts, update quote status in Xero to "Accepted"

### 3. Define Invoicing Trigger

Tell LedgerBot when to convert the quote:
- Specific date
- Project milestone completion
- Progress percentage
- Immediate conversion

### 4. Automated Conversion

LedgerBot monitors triggers and automatically:
- Creates invoice from quote
- Applies correct date and due date
- Verifies all details
- Saves as draft or approved (based on your preference)

### 5. Invoice Delivery

Review (if draft) and approve for sending, or allow LedgerBot to send automatically if configured.

## Example Prompts

### Prompt 1: Immediate Quote Conversion
```
Convert quote Q-2024-156 to an invoice dated today. The customer has accepted
the quote and wants to start the project immediately. Use 30-day payment terms,
verify the pricing and GST are correct, and create the invoice as approved
ready to send.
```

### Prompt 2: Milestone-Based Invoicing
```
We have quote Q-2024-142 for a $45,000 website development project with three
milestones: (1) Design approval - 30%, (2) Development complete - 50%,
(3) Go-live - 20%. The design has just been approved. Create an invoice for
$13,500 (30% of total) referencing the design milestone. Leave the remaining
milestones as pending invoices.
```

### Prompt 3: Recurring Monthly Service
```
Quote Q-2024-089 is for managed IT services at $2,500/month for 12 months,
starting 1 December 2024. Set up automatic monthly invoice generation on the
1st of each month. Create the first invoice for December today, and schedule
the remaining 11 invoices to generate automatically.
```

### Prompt 4: Progress Billing Based on Percentage
```
Our construction project (quote Q-2024-178, total $280,000) is 35% complete
as of today. Create a progress invoice for 35% of the total ($98,000).
Reference "Progress Invoice #1 - 35% completion as at [date]" and attach our
progress claim documentation. Track that we've invoiced 35%, leaving 65%
remaining to invoice.
```

### Prompt 5: Batch Quote Conversion
```
I have 8 quotes that were accepted last week and all need to be converted to
invoices dated 1 November 2024. The quote numbers are: Q-2024-201 through
Q-2024-208. Convert all of them to invoices, verify pricing and GST on each,
and create them as drafts for my review before sending.
```

## Tips and Best Practices

### Quote Structure for Easy Conversion

**Clear Line Items:**
Structure quotes so each line item is clear and can be invoiced separately if needed

**Milestone Definitions:**
Include milestone schedule in quote notes:
```
Payment Terms:
- Deposit: 30% upon acceptance ($15,000)
- Milestone 1: 30% upon design approval ($15,000)
- Milestone 2: 25% upon development complete ($12,500)
- Final: 15% upon go-live ($7,500)
Total: $50,000
```

**Reference Numbers:**
Use consistent quote numbering that's easy to reference: Q-YYYY-XXX format

**Payment Terms:**
Clearly state payment terms in the quote (30 days, 14 days, COD, etc.)

### Types of Invoicing Scenarios

**1. Full Quote Conversion**
Simple: quote accepted, convert entire quote to invoice immediately

**2. Deposit Invoice**
Create partial invoice for deposit amount, track remaining balance

**3. Milestone Invoicing**
Create series of invoices as milestones are achieved

**4. Progress Billing**
Invoice based on percentage complete (common in construction/consulting)

**5. Recurring Service**
Monthly/quarterly invoicing for ongoing services

**6. Time & Materials**
Quote shows rates, actual invoice based on time tracking data

### Automated Triggers

**Calendar-Based:**
```
"Convert quote Q-2024-145 to invoice automatically on 1st December 2024"
```

**Milestone-Based:**
```
"When I tell you 'Phase 1 complete for Project ABC', automatically convert
the first 40% of quote Q-2024-167 to an invoice"
```

**Conditional:**
```
"If the customer pays the deposit invoice INV-8901, automatically create
the next milestone invoice for 30% of the quote Q-2024-123"
```

### Tracking Quote-to-Invoice Status

Maintain visibility of quote status:
- **Quote sent**: Awaiting customer decision
- **Quote accepted**: Ready for conversion trigger
- **Partially invoiced**: Some milestones billed, others pending
- **Fully invoiced**: All amounts converted to invoices
- **Quote expired**: No longer valid

Ask LedgerBot: "Show me all accepted quotes that haven't been fully invoiced yet"

### Handling Variations

**Quote Amount Changed:**
```
The customer accepted quote Q-2024-134 but wanted to add an extra feature for
$3,500. Update the quote amount to $28,500 and then convert to invoice with
the revised total.
```

**Discount Applied:**
```
We offered Customer ABC a 10% discount for early payment. Apply 10% discount
to quote Q-2024-156 before converting to invoice. Show me the original quote
amount and discounted invoice amount.
```

**Partial Scope:**
```
Customer only wants items 1, 2, and 5 from quote Q-2024-199, not the full
quote. Create an invoice for just those three line items, total $12,400.
Leave the other items on the quote for potential future sale.
```

## Common Questions

**Q: Can LedgerBot send invoices directly to customers?**
A: LedgerBot creates the invoice in Xero. You can then use Xero's email functionality or request LedgerBot to draft an email that you send from your email client.

**Q: What if the quote pricing needs to be updated before invoicing?**
A: Update the quote in Xero first, then convert to invoice. Or specify the changes when requesting conversion.

**Q: Can it handle multiple partial invoices from one quote?**
A: Yes, LedgerBot can track how much of a quote has been invoiced and create multiple progress invoices until the full amount is billed.

**Q: What about quotes with optional items?**
A: Tell LedgerBot which line items to include when converting: "Convert quote Q-1234 to invoice, including only line items 1, 2, and 4"

**Q: Does it work with recurring invoices in Xero?**
A: For truly recurring services, you might use Xero's repeating invoice feature. LedgerBot helps with the initial setup and monitoring.

## Related Workflows

- **Workflow 1**: Automated Invoice Processing (different context - supplier bills)
- **Workflow 14**: Revenue Recognition and Progress Billing (closely related for project accounting)
- **Workflow 3**: Cash Flow Forecasting (forecast includes expected invoice generation)
- **Workflow 4**: Automated Debtor Follow-Up (monitor payment of generated invoices)

## Advanced Usage

### Project-Based Invoicing Automation
```
We have 5 active projects, each with accepted quotes and milestone schedules.
Set up automatic invoice generation for each project based on the milestone
dates in our project plan: Project Alpha - 3 milestones (15 Nov, 15 Dec, 15 Jan),
Project Beta - 2 milestones (30 Nov, 31 Jan), etc. Create a schedule showing
when each invoice will be generated.
```

### Time & Materials Reconciliation
```
Quote Q-2024-188 was for time and materials: "up to 100 hours at $150/hour,
not to exceed $15,000." We tracked 87 hours on the project. Create an invoice
for actual time (87 × $150 = $13,050) and note that we came in under budget.
Mark the quote as fully invoiced.
```

### Retainer Billing Automation
```
We have 12 clients on monthly retainers ranging from $1,500 to $8,000 per month.
Each started with an accepted quote for 12 months of service. Set up automatic
monthly invoicing on the 1st of each month for each client's retainer amount.
Generate the next month's batch of retainer invoices automatically.
```

### Subscription Anniversary Invoicing
```
Customer XYZ signed up for annual software licensing on 15 March 2024 (quote
Q-2024-067 for $12,000/year). Set up automatic annual renewal invoice generation
on 15 March each year. Send me a reminder 30 days before renewal to confirm
pricing hasn't changed.
```

### Multi-Currency Quote Conversion
```
Quote Q-2024-211 was issued in USD for $25,000 to our US customer. They've
accepted it. Convert to invoice using today's exchange rate (or specify the
locked-in rate of 0.6520). Create the invoice in USD but show me the AUD
equivalent for our revenue recognition.
```

### Quote Performance Analysis
```
Analyse all quotes issued in Q3 2024. Show me: (1) total number of quotes sent,
(2) number accepted vs declined, (3) average time from quote to acceptance,
(4) total value of accepted quotes, (5) how much has been invoiced vs still
pending invoicing. Identify any quotes accepted over 30 days ago that haven't
been converted to invoices yet.
```

## Invoice Generation Workflow Diagram

```
Quote Created → Quote Sent → Quote Accepted → [TRIGGER] → Invoice Generated → Invoice Sent → Payment Received
                                              ↓
                                    - Calendar date
                                    - Milestone complete
                                    - Manual instruction
                                    - Progress % reached
```

## Best Practices for Different Business Types

### Consulting/Professional Services
- Use milestone-based invoicing tied to deliverables
- Include progress descriptions on invoices
- Track time but bill fixed milestones (reduces customer surprise)

### Construction/Trades
- Progress billing based on completion percentage
- Include retention amounts (e.g., "10% retention held until practical completion")
- Reference contract and variation approvals

### Software/SaaS
- Monthly/annual subscription invoicing
- Automated renewal invoice generation
- Prorata invoicing for mid-month starts

### Creative Agencies
- Deposit on acceptance (typically 30-50%)
- Milestone billing tied to client approvals
- Final invoice on delivery

### Wholesalers/Distributors
- Immediate conversion of quote to invoice when order placed
- No milestones - full invoice on shipment
- Automated batch processing for high-volume quotes

## Compliance and Audit Trail

LedgerBot maintains clear audit trail:
- Original quote number referenced on invoice
- Date of conversion logged
- Any pricing changes documented
- Milestone/trigger reason recorded

Ask LedgerBot to generate audit reports:
```
Show me all invoices created from quotes in October 2024. For each, show:
(1) quote number and date, (2) invoice number and date, (3) any price
variations, (4) days from quote acceptance to invoice creation. Flag any
invoices created more than 7 days after quote acceptance.
```

## Technical Notes

This workflow uses LedgerBot's Document Processing agent combined with Xero quote and invoice APIs. The system can monitor quote status and create invoices automatically based on triggers.

For technical implementation details, developers can refer to:
- `lib/ai/tools/xero-tools.ts` - Xero quote and invoice management tools
- `app/agents/docmanagement/` - Document processing agent
- Quote conversion logic in AI tool execution layer
- Optional integration with project management tools for milestone triggers

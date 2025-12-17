# Workflow 4: Automated Debtor Follow-Up

## Overview

LedgerBot's automated debtor follow-up workflow identifies overdue invoices, generates personalised follow-up emails based on client relationship history and payment patterns, sends reminders at optimal times, and escalates to the business owner when thresholds are breached.

This workflow improves cash flow, reduces Days Sales Outstanding (DSO), and maintains professional customer relationships without the manual effort of chasing payments.

## How It Works

1. **Overdue Identification**: LedgerBot monitors all outstanding invoices and identifies those past their due date
2. **Risk Assessment**: Analyses customer payment history to calculate risk scores and prioritise follow-up
3. **Personalised Communications**: Generates appropriate reminder emails based on customer relationship and overdue period
4. **Optimal Timing**: Sends reminders at times most likely to prompt payment based on historical patterns
5. **Escalation Management**: Flags high-value or long-overdue accounts for personal attention

## Prerequisites

- Active Xero connection established
- Customer invoices with valid email addresses in Xero
- Historical payment data for risk assessment (optional but improves effectiveness)

## Step-by-Step Guide

### 1. Review Aged Receivables

Start by requesting an overview of your overdue invoices. LedgerBot will categorise them by age and risk level.

### 2. Generate Follow-Up Strategy

LedgerBot suggests a follow-up approach for each overdue account:
- Friendly reminders for first-time late payers
- Firmer language for repeat late payers
- Escalation for significantly overdue or high-value invoices

### 3. Review and Customise Communications

Review the suggested email content. You can:
- Approve standard reminders to send immediately
- Customise specific messages for important customers
- Add personal notes or payment plan offers

### 4. Send Reminders

Approve sending the reminders. LedgerBot can send them immediately or schedule for optimal times (e.g., Tuesday morning, when response rates are highest).

### 5. Track Responses and Payments

LedgerBot monitors which customers pay after reminders and learns which communication styles and timing are most effective for different customer segments.

## Example Prompts

### Prompt 1: Overdue Invoice Summary
```
Show me all overdue customer invoices grouped by age: 1-30 days, 31-60 days,
61-90 days, and 90+ days. For each category, show the total amount
outstanding and which customers need follow-up.
```

### Prompt 2: Generate Reminder Emails
```
Generate friendly reminder emails for all invoices that are 7-14 days overdue.
For invoices over 30 days overdue, create firmer follow-up emails requesting
immediate payment. Show me the drafted emails for review before sending.
```

### Prompt 3: Focus on High-Value Accounts
```
Identify all overdue invoices over $5,000 and show me each customer's payment
history. Draft personalised follow-up emails that I can review and customise
before sending to these important clients.
```

### Prompt 4: Customer-Specific Follow-Up
```
Acme Corporation has three invoices totalling $18,500 that are now 45 days
overdue. They're usually good payers. Draft a professional but firm follow-up
email asking for payment and offering a payment plan if they're experiencing
cash flow difficulties.
```

### Prompt 5: Automated Reminder Schedule
```
Set up an automated reminder schedule for all new invoices: send a friendly
reminder at 7 days overdue, a firmer reminder at 21 days overdue, and flag
for my personal attention at 45 days overdue. Show me the email templates
for each stage.
```

## Tips and Best Practices

### Segment Your Debtors
- **Good customers (low risk)**: Friendly, relationship-focused reminders
- **Occasional late payers**: Professional, matter-of-fact reminders
- **Chronic late payers**: Firm language with payment terms reinforcement
- **New customers**: Balance between friendly and clear expectations

### Timing Matters
- **Best days**: Tuesday, Wednesday, Thursday (avoid Monday and Friday)
- **Best times**: Mid-morning (9-11am) in customer's timezone
- **Avoid**: Public holidays, end of financial year, known customer busy periods

### Communication Tone

**First Reminder (7-14 days overdue)**: Friendly and helpful
```
"Just a gentle reminder that invoice INV-1234 for $1,500 was due on
15 March. Perhaps it was overlooked? Please let us know if you have
any questions about the invoice."
```

**Second Reminder (21-30 days overdue)**: Professional and direct
```
"We notice that invoice INV-1234 for $1,500 remains unpaid, now
25 days overdue. Please arrange payment this week or contact us to
discuss if there are any issues."
```

**Final Reminder (45+ days overdue)**: Firm with consequences
```
"Invoice INV-1234 for $1,500 is now 50 days overdue. We require
immediate payment to avoid suspension of account and potential
referral to collections. Please contact us urgently."
```

### Maintain Relationships
- Always provide easy payment options (bank details, payment link)
- Offer payment plans for customers in genuine difficulty
- Thank customers who pay promptly to reinforce positive behaviour
- Keep records of any payment arrangements made

### Escalation Rules
Set clear thresholds for when you want personal involvement:
- Invoices over $X amount that are Y days overdue
- Customers with total outstanding over $X
- Customers who haven't responded to multiple reminders
- Customers with deteriorating payment patterns

## Common Questions

**Q: Can LedgerBot actually send emails on my behalf?**
A: Currently, LedgerBot drafts the emails for your review and approval. You maintain control over all customer communications.

**Q: What if a customer has a payment plan?**
A: Tell LedgerBot about any payment arrangements: "ABC Corp is on a payment plan - exclude their invoices from automated reminders"

**Q: How does the risk scoring work?**
A: LedgerBot analyses payment history, average days to pay, consistency, total outstanding, and industry benchmarks. See `docs/risk-algorithm.md` for details.

**Q: Can I customise the reminder templates?**
A: Yes, you can provide your preferred email style and LedgerBot will match it, or review and edit each message before sending.

**Q: What about customers with good relationships who are temporarily late?**
A: LedgerBot's risk scoring identifies these customers and suggests gentler reminders that maintain the relationship while requesting payment.

## Related Workflows

- **Workflow 3**: Cash Flow Forecasting (identify impact of late payments)
- **Workflow 2**: Bank Reconciliation (confirm which invoices are paid)
- **Workflow 6**: Variance Analysis (track DSO trends)
- **Workflow 8**: Month-End Procedures (debtor review as part of close)

## Advanced Usage

### Payment Pattern Analysis
```
Analyse payment patterns for all customers over the past 12 months. Show me:
(1) average days to pay by customer, (2) which customers are getting slower,
(3) which customers always pay on time, and (4) seasonal patterns in payment
timing.
```

### Bulk Account Statements
```
Generate account statements for all customers with overdue balances. Include
all outstanding invoices, previous payment history, and a professional note
requesting payment of overdue amounts.
```

### Collections Priority List
```
Create a collections priority list ranking all overdue accounts by:
(1) total amount owed, (2) number of days overdue, (3) payment history risk
score, and (4) relationship value. Show me the top 20 accounts I should
focus on this week.
```

### Customer Credit Review
```
Review all customers with outstanding balances over $10,000. Based on their
payment history and current overdue amounts, recommend whether we should:
(1) continue current credit terms, (2) reduce credit limit, (3) require
payment upfront for new orders, or (4) cease supply.
```

### Performance Tracking
```
Compare our debtor days (DSO) for the current month versus the past 6 months.
Show me the trend and identify whether our collection efforts are improving
or deteriorating. Breakdown by customer segment.
```

## Email Template Examples

LedgerBot can generate emails in various styles. Here are examples you can reference:

### Professional Corporate Style
Formal, direct, suitable for B2B relationships

### Friendly Small Business Style
Conversational, relationship-focused, suitable for long-term clients

### Firm Credit Control Style
Direct, consequence-focused, suitable for chronic late payers

### Payment Plan Offer Style
Supportive, solution-oriented, suitable for customers in temporary difficulty

Ask LedgerBot to match your company's communication style by providing examples or describing your preferred tone.

## Technical Notes

This workflow uses LedgerBot's Accounts Receivable (AR) agent, which is the most fully-developed agent in the system. It features sophisticated risk scoring algorithms and customer communication personalisation.

For technical implementation details, developers can refer to:
- `app/agents/` - AR agent is planned but uses general chat currently
- `lib/db/schema/ar.ts` - AR-specific database schema
- `docs/AR_AGENT.md` - AR agent architecture documentation
- `docs/risk-algorithm.md` - Customer risk scoring methodology
- `lib/ai/tools/xero-tools.ts` - Customer and invoice data retrieval

# Workflow 15: Automated Creditor Payment Scheduling

## Overview

LedgerBot's automated creditor payment scheduling workflow reviews upcoming bills due for payment, checks current cash position and forecast, prioritises payments based on terms and importance, generates optimized payment batches that balance cash preservation with avoiding late fees, and creates payment files ready for bank upload.

This workflow optimizes working capital, ensures critical suppliers are paid on time, maximizes the benefit of payment terms, and reduces the administrative burden of payment processing.

## How It Works

1. **Bill Collection**: LedgerBot retrieves all unpaid bills from Xero with due dates
2. **Cash Assessment**: Checks current bank balances and short-term cash forecast
3. **Payment Prioritization**: Ranks bills by urgency, early payment discounts, and supplier importance
4. **Schedule Optimization**: Creates payment schedule that maximizes working capital while meeting obligations
5. **Payment File Generation**: Produces ABA file or payment batch for bank processing

## Prerequisites

- Active Xero connection established
- Unpaid supplier bills in Xero
- Current bank balance information
- Understanding of supplier payment priorities
- Bank file format requirements (ABA for Australia)

## Step-by-Step Guide

### 1. Review Upcoming Bills

Request summary of bills due for payment in the next 7-30 days.

### 2. Check Cash Position

LedgerBot checks:
- Current bank balance
- Expected receipts (customer payments due)
- Cash flow forecast
- Minimum cash buffer required

### 3. Payment Prioritization

LedgerBot categorizes bills:
- **Critical**: Must pay (statutory, strategic suppliers, discount opportunities)
- **Standard**: Pay on due date
- **Flexible**: Could delay if cash tight

### 4. Generate Payment Schedule

LedgerBot creates optimized payment schedule showing:
- Which bills to pay today
- Which bills to pay on specific future dates
- Which bills could be delayed if necessary
- Cash impact of each payment batch

### 5. Execute Payments

Create payment batch in Xero or generate ABA file for bank upload.

## Example Prompts

### Prompt 1: Weekly Payment Run
```
Generate this week's payment schedule. Show me all bills due for payment in
the next 7 days, current bank balance, and recommend which bills to pay based
on: (1) any with early payment discounts worth taking, (2) critical suppliers
we must pay on time, (3) remaining bills within our cash capacity. Create a
payment batch for bills we should pay today.
```

### Prompt 2: Cash-Constrained Payment Strategy
```
We have $85,000 in bills due this week but only $62,000 in the bank with
$45,000 expected from customers in 3-4 days. Prioritize which bills to pay
immediately (critical suppliers, discount opportunities) and which we can defer
3-5 days until customer payments arrive. Show me the optimized payment schedule
minimizing late payment risk while managing cash.
```

### Prompt 3: Early Payment Discount Optimization
```
Review all unpaid bills and identify any offering early payment discounts in
the next 10 days. For each discount opportunity, calculate the annualized
return and recommend whether to pay early (compare to our 12% cost of capital).
Create a priority payment batch for all beneficial early payment discounts,
showing total discount savings captured.
```

### Prompt 4: Monthly Payment Calendar
```
Create a payment calendar for the next 30 days. For each date, show: (1) bills
due that day, (2) cumulative cash outflow, (3) expected cash inflows from
customers, (4) projected bank balance after payments. Flag any dates where
cash balance falls below our minimum buffer of $50,000 and suggest payment
timing adjustments.
```

### Prompt 5: Supplier-Specific Payment Strategy
```
We have 5 strategic suppliers we never want to pay late: TechCorp, BuildSupply
Co, MachineryPro, OfficeNational, and TransportLogistics. Review all upcoming
bills and ensure these suppliers are always paid on or before due date.
Generate a payment schedule prioritizing these suppliers, then fit other
payments around our cash availability.
```

## Tips and Best Practices

### Payment Prioritization Framework

**Priority 1: Must Pay (Critical)**
- Statutory obligations (ATO, superannuation, payroll tax)
- Suppliers with valuable early payment discounts
- Strategic suppliers crucial to operations
- Suppliers who have extended special terms/credit
- Bills overdue or approaching late fees

**Priority 2: Should Pay (Standard)**
- Bills due within 3 days
- Regular suppliers on normal trade terms
- Reasonable payment amounts
- Suppliers with good relationships

**Priority 3: Can Defer (Flexible)**
- Bills not due for 5+ days
- Suppliers who typically accept slight delays
- Non-critical purchases
- Suppliers with 60+ day terms (still time available)

**Priority 4: Negotiate (Problem Bills)**
- Bills you can't pay without creating cash crisis
- Disputed amounts
- Large unexpected bills
- Bills for poor service/defective goods

### Cash Buffer Management

**Maintain Minimum Buffer:**
Never let bank balance fall below safety threshold
- Small business: $10,000-$50,000 minimum
- Medium business: $50,000-$200,000 minimum
- Set based on: Weekly payroll + 2 weeks average expenses

**Buffer Rationale:**
- Unexpected expenses
- Customer payment delays
- Bank processing timing
- Peace of mind

**If Cash Tight:**
- Defer flexible payments
- Chase overdue customers
- Draw on working capital facility
- Negotiate payment plans with suppliers

### Payment Timing Strategies

**Pay on Due Date:**
Most common and appropriate
- Maintains good supplier relationships
- Maximizes use of payment terms
- Balanced working capital approach

**Pay Early (Selective):**
Only when:
- Early payment discount ROI exceeds cost of capital
- Building relationship with strategic new supplier
- Negotiating better terms (showing good faith)

**Pay Slightly Late (Rare):**
Emergency cash management only
- Communicate proactively with supplier
- Apologize and explain
- Ensure it's genuinely temporary
- Avoid with critical suppliers

**Batch Payments:**
Process payments in batches:
- Weekly payment run (common)
- Bi-weekly payment run
- Daily for high-volume businesses
- Reduces admin burden

### ABA File Generation

For Australian bank processing:

**ABA File Format:**
- Standard format for bulk payments
- Most Australian banks accept ABA files
- Xero can generate ABA files
- Upload to bank's business banking platform

**File Contents:**
- Supplier BSB and account numbers
- Payment amounts
- Payment dates
- Reference information

**Security:**
- Verify all bank details before first payment
- Call supplier to confirm bank details changed (common fraud)
- Store ABA files securely
- Use dual authorization for large payments

### Payment Approval Workflows

**Small Payments (<$1,000):**
Single approver, possibly automated

**Medium Payments ($1,000-$10,000):**
Single approver (owner/manager)

**Large Payments (>$10,000):**
Dual approval required

**Very Large (>$50,000):**
Owner/director approval mandatory

**Setup Changes:**
New suppliers, bank detail changes require verification

## Common Questions

**Q: Can LedgerBot actually make payments from my bank account?**
A: No, LedgerBot creates the payment schedule and can generate payment files (ABA), but you process payments through your bank or Xero.

**Q: What if I disagree with the priority ranking?**
A: You can override rankings. Tell LedgerBot: "Treat Supplier ABC as critical priority" or "Defer payment to XYZ Corp"

**Q: Should I use bank file upload or pay through Xero?**
A: Depends on volume. Xero direct payment is easy for <20 payments. ABA file bulk upload is efficient for >20 payments.

**Q: How do I handle international supplier payments?**
A: International payments (SWIFT/telegraphic transfer) require special handling. LedgerBot can identify these but you'll process separately.

**Q: What about credit card payments?**
A: Some suppliers accept credit cards (improves your cash flow). LedgerBot can identify opportunities to pay by card and defer cash payment 30-55 days.

## Related Workflows

- **Workflow 13**: Supplier Performance Tracking (identify payment priorities)
- **Workflow 3**: Cash Flow Forecasting (determine payment capacity)
- **Workflow 2**: Bank Reconciliation (confirm payments cleared)
- **Workflow 8**: Month-End Procedures (ensure all bills entered)

## Advanced Usage

### Payment vs. Discount Optimization Model
```
I have $200,000 in bills due this month. $85,000 offer early payment discounts
averaging 2% if paid 20 days early. My current cash balance is $120,000 with
$150,000 expected from customers over the month. Model different scenarios:
(1) pay all discounts early and use line of credit for cash shortfall,
(2) pay only highest-ROI discounts early, (3) pay nothing early and preserve
cash. Show me net financial outcome of each scenario including discount savings,
interest costs, and risk factors.
```

### Supplier Payment Behavior Analysis
```
Analyse our payment behavior over the past 6 months. Show me: (1) average
days to pay by supplier, (2) which suppliers we consistently pay early/on-time/late,
(3) whether our payment patterns match our stated terms, (4) any suppliers
where late payment might be damaging the relationship. Generate a supplier
relationship risk report and recommend any changes to payment priority.
```

### Working Capital Optimization
```
Calculate our current working capital cycle: (1) days inventory outstanding
(DIO), (2) days sales outstanding (DSO), (3) days payable outstanding (DPO),
(4) cash conversion cycle (DIO + DSO - DPO). Show me how extending our
payment terms by 5 days would improve working capital, and model the impact
of negotiating extended terms with our top 10 suppliers.
```

### Payment Plan Negotiation Support
```
We're experiencing temporary cash flow constraints. Help me negotiate payment
plans with our top 5 suppliers (total $125,000 due). For each supplier, draft
a professional payment plan proposal: acknowledge the amount owed, explain our
temporary situation, propose a 60-day payment schedule, commit to staying
current on new orders. Show good faith with immediate partial payment of 25%.
```

### Seasonal Payment Forecasting
```
Our business is highly seasonal with 65% of revenue in Q4. Create a payment
forecast for the full year showing: (1) monthly bill payment requirements,
(2) seasonal peaks in supplier payments, (3) periods where cash may be
constrained, (4) recommended payment strategies for each quarter. Help me plan
working capital needs for the seasonal trough.
```

### Duplicate Payment Detection
```
Before processing this week's payment run, check for any potential duplicate
payments. Flag: (1) multiple bills from same supplier for same amount within
30 days, (2) bills that may have already been paid outside Xero, (3) any
unusual payment amounts that warrant verification. Review the payment batch
for any errors before I process.
```

## Payment Batch Checklist

Before processing payments, verify:

- [ ] All supplier bank details confirmed and up-to-date
- [ ] Payment amounts match approved bills
- [ ] GST treatment correct (don't pay GST twice)
- [ ] No duplicate payments in batch
- [ ] Critical supplier payments included
- [ ] Early payment discounts captured where beneficial
- [ ] Total batch amount within cash availability
- [ ] Payment dates appropriate (consider bank holidays)
- [ ] Proper authorization obtained for large payments
- [ ] ABA file (if used) generated correctly

## Cash Management Integration

**Connect Payment Timing to Cash Sources:**

**Customer Receipts:**
"We have $85K in customer payments expected Wed/Thu. Schedule supplier
payments for Friday to ensure cash available."

**Line of Credit:**
"If we draw $30K on our line of credit, we can pay all early payment discounts.
The discount savings (2.5% = $2,125) exceed 2 months interest on LOC ($300 at
12% annual). Recommend drawing on LOC to capture discounts."

**Term Deposits:**
"We have $100K in term deposit maturing next Friday. Include that cash in
payment capacity for next week's payment run."

## Technical Notes

This workflow uses LedgerBot's cash flow management capabilities with optimization algorithms for payment scheduling. The system can generate ABA files compliant with Australian banking standards.

For technical implementation details, developers can refer to:
- `lib/ai/tools/xero-tools.ts` - Bill payment and batch creation tools
- `app/agents/workflow/` - Workflow supervisor agent
- `lib/db/schema/ap.ts` - Accounts payable schema
- ABA file generation uses BECS standards
- Payment optimization uses cash flow modeling algorithms

# Workflow 9: GST/BAS Preparation and Review

## Overview

LedgerBot's GST/BAS preparation workflow reviews all transactions for the BAS period, identifies potential GST coding errors, suggests corrections based on transaction types and vendor classifications, calculates preliminary BAS figures, and generates a review report highlighting unusual items before lodgement.

This workflow ensures GST compliance, reduces the risk of ATO queries or audits, and gives you confidence that your BAS is accurate before lodgement.

## How It Works

1. **Period Review**: LedgerBot retrieves all transactions for the BAS period from Xero
2. **Error Detection**: Identifies potential GST coding errors based on transaction patterns and vendor types
3. **Correction Suggestions**: Recommends fixes for incorrectly coded transactions
4. **BAS Calculation**: Calculates all BAS labels (G1, G2, G3, etc.) with explanations
5. **Unusual Item Flagging**: Highlights transactions requiring review before lodgement
6. **Pre-Lodgement Report**: Generates comprehensive review documentation

## Prerequisites

- Active Xero connection established
- ABN and GST registration details
- Complete transaction data for the BAS period
- All bank reconciliations complete for the period

## Step-by-Step Guide

### 1. Initiate BAS Review

Before starting your BAS in Xero, request LedgerBot to review the period and identify any issues.

### 2. Review Flagged GST Errors

LedgerBot identifies potential issues:
- Transactions coded as GST-free that should be taxable
- Transactions coded as taxable that should be GST-free
- Incorrect GST amounts (calculation errors)
- Missing ABN validation for input tax credits
- Capital purchases not coded to G10/G11

### 3. Make Corrections

For each flagged item, review and correct:
- Update GST treatment in Xero
- Correct transaction coding
- Add missing vendor ABN details
- Reclassify transactions as needed

### 4. Calculate Preliminary BAS

Once corrections made, review preliminary BAS figures:
- G1: Total sales (including GST)
- G2: Export sales
- G3: Other GST-free sales
- G10: Capital purchases
- G11: Non-capital purchases
- 1A: GST on sales
- 1B: GST on purchases
- Net GST position (refund or payment)

### 5. Final Verification

Perform final checks before lodgement:
- Compare to previous quarters
- Verify unusual movements
- Check working capital impact
- Obtain approval from accountant/owner

### 6. Lodge BAS

Once verified, lodge BAS through Xero or your tax agent.

## Example Prompts

### Prompt 1: Comprehensive BAS Review
```
Review all transactions for the BAS quarter ending 31 December 2024. Identify
any potential GST coding errors, verify supplier ABNs for input tax credits
over $82.50, calculate preliminary BAS figures for all labels, and flag any
unusual items I should review before lodging.
```

### Prompt 2: GST Coding Error Check
```
Check all transactions from October to December 2024 for GST coding errors.
Specifically look for: (1) sales incorrectly marked as GST-free, (2) expenses
with GST claimed where supplier has no ABN, (3) imports not coded correctly,
and (4) calculations where GST doesn't equal 1/11th of GST-inclusive amount.
```

### Prompt 3: Capital Purchase Verification
```
We purchased new equipment for $85,000 in November. Verify this is correctly
coded as a capital purchase (G10/G11) on the BAS. Also check if there are any
other capital purchases this quarter that should be reported on those labels.
```

### Prompt 4: BAS Comparison Analysis
```
Calculate the BAS for December quarter 2024 and compare to: (1) December
quarter 2023, (2) September quarter 2024, and (3) our budget/forecast.
Explain any significant variances in GST collected, GST paid, or net position.
```

### Prompt 5: Pre-Lodgement Checklist
```
I'm about to lodge the BAS for September quarter 2024. Run through the
pre-lodgement checklist: (1) all transactions coded correctly, (2) all bank
accounts reconciled, (3) all invoices and bills entered, (4) GST calculations
verified, (5) capital vs non-capital correctly classified, (6) export sales
properly documented. Give me a sign-off report.
```

## Tips and Best Practices

### GST Treatment Quick Reference

**GST on Sales (Output Tax):**
- **10% GST (Taxable)**: Most goods and services sold in Australia
- **GST-free (G3)**: Basic food, some education, some health services, exports
- **Input-taxed**: Financial services, residential rent (no GST charged or claimed)

**GST on Purchases (Input Tax):**
- **Can claim**: Business purchases from GST-registered suppliers with valid ABN
- **Cannot claim**: Private/domestic purchases, input-taxed supplies
- **Tax invoice required**: Purchases over $82.50 (inc GST)

### Common GST Coding Errors

**Error 1: GST on Rent**
```
Incorrect: Office rent coded with GST
Correct: Residential rent is input-taxed (no GST), commercial rent may have GST
Ask: "Is this residential or commercial rent? Residential should be GST-free"
```

**Error 2: Import Goods**
```
Incorrect: Overseas purchase coded as GST-free purchase
Correct: Should be GST-free purchase with import GST (if paid) as separate transaction
Ask: "Did you pay import GST to the ATO? This should be a separate entry"
```

**Error 3: Missing Capital Classification**
```
Incorrect: $50,000 machinery purchase on G11 (non-capital)
Correct: Should be on G10 (capital purchases)
Ask: "Assets over $1,000 with useful life >1 year should be capital purchases (G10)"
```

**Error 4: Wages Coded with GST**
```
Incorrect: Wage expense with GST
Correct: Wages are not subject to GST
Ask: "Wages should never have GST - remove GST coding from payroll transactions"
```

**Error 5: No ABN Verification**
```
Incorrect: Claiming $5,000 GST on supplier invoice, no ABN recorded
Correct: Must verify supplier ABN for GST claims
Ask: "What is the supplier's ABN? I'll validate it against ABR"
```

### BAS Label Explanations

**G1 - Total Sales**
Total of all sales including GST (both taxable and GST-free)

**G2 - Export Sales**
Sales to overseas customers (GST-free)

**G3 - Other GST-Free Sales**
Basic food, some education/health, etc.

**G10 - Capital Purchases**
Purchases of assets with useful life >1 year and cost >threshold

**G11 - Non-Capital Purchases**
All other business purchases including GST

**1A - GST on Sales**
GST collected on sales (G1 minus GST-free sales) × 1/11

**1B - GST on Purchases**
GST paid on purchases (G10 + G11) × 1/11

**Net GST**
1A minus 1B (positive = you pay ATO, negative = ATO refunds you)

### Monthly vs Quarterly BAS

**Quarterly (most common for small business):**
- Lodge by 28 days after quarter end
- Quarters: Jul-Sep, Oct-Dec, Jan-Mar, Apr-Jun

**Monthly (required for businesses >$20M turnover or voluntary):**
- Lodge by 21st of following month
- Better for cash flow if you're usually in refund position

### BAS Verification Checklist

Before lodging, verify:
- [ ] All income recorded (check against bank deposits)
- [ ] All expenses recorded (check against bank payments and credit cards)
- [ ] Bank accounts fully reconciled
- [ ] All supplier ABNs verified for major purchases
- [ ] Capital vs non-capital correctly classified
- [ ] Export sales properly documented (shipping docs, etc.)
- [ ] GST calculations correct (amounts × 1/11)
- [ ] Unusual transactions reviewed and explained
- [ ] Comparison to previous periods reviewed
- [ ] Accountant/owner approval obtained

### Common Questions About Specific Transactions

**Q: Customer paid deposit - when do I report GST?**
A: GST is payable when you receive payment OR issue tax invoice, whichever is earlier. Deposits trigger GST obligation.

**Q: Paid supplier bill from previous quarter - which BAS?**
A: GST on purchases is claimed in the period you receive the invoice, not when you pay it.

**Q: Refund issued to customer - how to handle GST?**
A: Issue credit note. GST will reduce your 1A (GST on sales) in the period you issue the credit note.

**Q: Purchased goods for resale - capital or non-capital?**
A: Inventory/stock for resale is non-capital (G11). Only assets you'll use in the business are capital.

**Q: Meal with client - can I claim GST?**
A: Yes, if you have a valid tax invoice and it's a business expense. Note: only 50% is income tax deductible for FBT purposes, but you can still claim 100% of GST.

## Common Questions

**Q: Can LedgerBot lodge the BAS for me?**
A: No, LedgerBot prepares and reviews the BAS, but you or your tax agent must lodge it through Xero, the ATO portal, or SBR-enabled software.

**Q: What if I find an error after lodging?**
A: You can submit a revised BAS through the ATO. LedgerBot can help you calculate the correction and prepare the revision.

**Q: Do I need my accountant to review the BAS?**
A: If you're confident in your understanding of GST, you can self-lodge. However, many businesses have their accountant review before lodging for peace of mind.

**Q: How far back can the ATO audit?**
A: Generally 4 years, but longer if fraud is suspected. Keep good records and ensure your BAS is accurate.

**Q: What triggers an ATO audit?**
A: Large refunds, significant variances between periods, industry benchmarking anomalies, or random selection. Accurate BAS lodgement reduces audit risk.

## Related Workflows

- **Workflow 1**: Invoice Processing (ensure all income recorded)
- **Workflow 2**: Bank Reconciliation (verify all transactions captured)
- **Workflow 5**: Expense Claims (ensure GST correctly claimed)
- **Workflow 8**: Month-End Procedures (GST reconciliation monthly)

## Advanced Usage

### Historical BAS Review
```
Review the past 4 quarters of BAS lodgements. Identify any patterns that
might indicate systematic GST coding errors. Show me: (1) average GST
collected vs industry benchmarks, (2) any unusual quarter-to-quarter
variations, and (3) categories where we might be under or over-claiming GST.
```

### Industry Benchmarking
```
Our business is in the hospitality industry (cafe/restaurant). Compare our
GST ratios to industry benchmarks: (1) GST on sales as % of revenue,
(2) GST on purchases as % of expenses, (3) typical net GST position.
Flag if our ratios are significantly different from industry norms.
```

### Capital Purchase Register
```
Generate a register of all capital purchases for the financial year to date.
Show: (1) date of purchase, (2) description, (3) amount, (4) GST claimed,
(5) which BAS quarter it was reported in. Verify all items are correctly
classified as capital and appropriately depreciated.
```

### Export Sales Documentation
```
We have $125,000 of export sales in the December quarter coded as GST-free (G2).
For each export sale, verify we have appropriate documentation: (1) customer is
located overseas, (2) goods were shipped internationally, (3) we have shipping
documents or proof of export. Flag any that might not qualify as exports.
```

### GST Audit Preparation
```
Prepare for a potential ATO GST audit. Generate: (1) reconciliation of BAS
figures to accounting system, (2) documentation of GST-free sales and why
they qualify, (3) verification of ABNs for major suppliers, (4) explanation
of any unusual transactions, (5) summary of internal controls for GST coding.
```

### Multi-Entity Consolidation
```
We have 3 GST-registered entities. Prepare BAS for each entity separately,
then show me the consolidated group GST position. Verify any inter-entity
transactions are correctly treated (sales by one entity = purchases by
another).
```

## Technical Notes

This workflow uses LedgerBot's Compliance agent with detailed knowledge of Australian GST law and ATO requirements. The ABN validation uses the ABR integration to verify supplier GST registration status.

For technical implementation details, developers can refer to:
- `app/agents/compliance/` - Compliance assistant agent
- `lib/abr/` - ABN validation and GST status verification
- `lib/ai/tools/xero-tools.ts` - Xero tax and BAS data retrieval
- GST rules and treatment logic in AI system prompt

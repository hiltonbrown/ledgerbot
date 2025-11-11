# Xero P&L Reconciliation Guide

## Summary of Changes

This document describes the investigation and fix for P&L discrepancies between chat-displayed data and actual Xero data.

## Problem Identified

The core issue was a **misunderstanding of what the Xero P&L report includes** versus what invoice/bill lists return. This led to confusion when comparing numbers between different data sources.

### Key Findings

1. **P&L Reports are Comprehensive**: The `xero_get_profit_and_loss` report includes:
   - Sales invoices (ACCREC)
   - Bills/supplier invoices (ACCPAY)
   - **Credit notes** (both sales and purchase)
   - **Bank transactions** (deposits, payments, fees)
   - **Manual journal entries** (depreciation, accruals, adjustments)
   - **Payments and receipts** (if cash accounting is used)
   - Other accounting adjustments

2. **Invoice Lists are Limited**: The `xero_list_invoices` tool returns:
   - ONLY invoice records (ACCREC or ACCPAY)
   - Does NOT include bank transactions, journals, or credit notes
   - Filters by **invoice date**, not payment date

3. **Accounting Basis Matters**:
   - **Accrual** (most common): Revenue/expenses recognized when invoice is created
   - **Cash**: Revenue/expenses recognized when payment is received/made
   - This can cause timing differences between P&L and transaction lists

## Solution Implemented

### 1. Enhanced Tool Descriptions

Updated tool descriptions to clarify what data they return and when discrepancies are expected:

#### `xero_get_profit_and_loss` Tool
**Before**:
```
"Get profit and loss report from Xero for a specified date range.
Use this to analyze revenue, expenses, and profitability over time."
```

**After**:
```
"Get comprehensive profit and loss report from Xero for a specified date range.
IMPORTANT: This report includes ALL financial transactions: sales invoices, bills,
credit notes, bank transactions, manual journal entries, and payments. Uses the
accounting basis configured in Xero (typically ACCRUAL, meaning revenue/expenses
recognized when incurred, not when paid). The report may show different totals
than invoice lists because it includes bank transactions, journal entries, and
other adjustments. For transaction-level analysis, use xero_list_invoices,
xero_list_credit_notes, xero_get_bank_transactions, and xero_list_journal_entries
separately."
```

#### `xero_list_invoices` Tool
**Before**:
```
"Get a list of invoices from Xero. Can retrieve SALES INVOICES (sent TO customers,
Type=ACCREC) or BILLS (received FROM suppliers, Type=ACCPAY). IMPORTANT: When user
asks for invoices in a specific month/year, you MUST provide BOTH dateFrom and dateTo
parameters..."
```

**After**:
```
"Get a list of invoices from Xero. Can retrieve SALES INVOICES (sent TO customers,
Type=ACCREC) or BILLS (received FROM suppliers, Type=ACCPAY). IMPORTANT NOTES:
(1) Filters by INVOICE DATE (the date the invoice was created), NOT payment date.
(2) When user asks for invoices in a specific month/year, you MUST provide BOTH
dateFrom and dateTo parameters to define the complete date range. For example, for
'October 2025' use dateFrom='2025-10-01' and dateTo='2025-10-31'. (3) Use invoiceType
parameter to specify which type: 'ACCREC' for sales invoices (default), 'ACCPAY' for
bills/supplier invoices. (4) This returns only invoice records - P&L reports may
include additional transactions like bank transactions, journal entries, and credit
notes that won't appear in this list."
```

### 2. Diagnostic Script

Created `scripts/test-xero-pl.ts` to help diagnose discrepancies:

**What it does**:
1. Fetches P&L report for a date range
2. Fetches all invoices for the same date range
3. Fetches all bills for the same date range
4. Compares totals and shows breakdown
5. Highlights expected differences

**How to use**:
```bash
# Set your user ID (get from database or Clerk dashboard)
export TEST_USER_ID="your-user-id-here"

# Run the diagnostic
pnpm exec tsx scripts/test-xero-pl.ts
```

**Output includes**:
- P&L report metadata and structure
- Invoice totals (revenue)
- Bill totals (expenses)
- Calculated net profit from transactions
- Comparison showing expected differences

### 3. Documentation

Created comprehensive documentation in:
- `scripts/diagnose-pl-discrepancy.md` - Step-by-step guide for investigating discrepancies
- `docs/xero-pl-reconciliation-guide.md` - This file

## Files Modified

1. **`lib/ai/tools/xero-tools.ts`**:
   - Enhanced `xero_get_profit_and_loss` tool description
   - Enhanced `xero_list_invoices` tool description
   - Added clarifications about invoice date filtering

2. **`lib/ai/xero-mcp-client.ts`**:
   - Enhanced `xero_get_profit_and_loss` MCP tool description
   - Enhanced `xero_list_invoices` MCP tool description
   - Maintained consistency with AI SDK tool descriptions

3. **`scripts/test-xero-pl.ts`** (NEW):
   - Diagnostic script for testing P&L reconciliation
   - Fetches and compares P&L with invoice/bill lists
   - Provides detailed output for troubleshooting

4. **`scripts/diagnose-pl-discrepancy.md`** (NEW):
   - Comprehensive guide for diagnosing P&L discrepancies
   - Lists common causes and solutions
   - Includes technical details and examples

5. **`docs/xero-pl-reconciliation-guide.md`** (NEW):
   - This document

## Understanding P&L Discrepancies

### Common Scenarios

#### Scenario 1: P&L Shows More Revenue Than Invoice List
**Cause**: P&L includes:
- Bank deposits not linked to invoices
- Manual journal entries for revenue
- Foreign currency adjustments

**Example**:
```
P&L Revenue:     $10,500
Invoice Total:   $10,000
Difference:      $500 (bank deposit or journal entry)
```

#### Scenario 2: P&L Shows Less Revenue Than Invoice List
**Cause**: P&L includes:
- Credit notes reducing revenue
- Revenue adjustments
- Voided or deleted invoices

**Example**:
```
P&L Revenue:     $9,500
Invoice Total:   $10,000
Difference:      -$500 (credit note issued)
```

#### Scenario 3: Timing Differences
**Cause**: Invoice date vs payment date

**Accrual Accounting** (default):
```
Invoice: Created Oct 1, Paid Nov 15
October P&L:  Includes this invoice
Invoice List (Oct): Includes this invoice
✅ Match
```

**Cash Accounting**:
```
Invoice: Created Oct 1, Paid Nov 15
October P&L:  Does NOT include (not paid yet)
Invoice List (Oct): Includes this invoice
❌ Mismatch
```

### Reconciliation Formula

To manually reconcile P&L with transaction lists:

```
P&L Revenue =
  Invoice Revenue (ACCREC, type=SALES)
  - Sales Credit Notes (ACCRECCREDIT)
  + Bank Deposits
  + Manual Journal Revenue Entries
  +/- Currency Adjustments

P&L Expenses =
  Bill Expenses (ACCPAY, type=PURCHASE)
  - Purchase Credit Notes (ACCPAYCREDIT)
  + Bank Payments
  + Manual Journal Expense Entries
  +/- Currency Adjustments

P&L Net Profit = P&L Revenue - P&L Expenses
```

## How to Use the Tools Correctly

### For Comprehensive Financial Reporting

Use `xero_get_profit_and_loss`:
```typescript
xero_get_profit_and_loss({
  fromDate: "2025-10-01",
  toDate: "2025-10-31",
  periods: 1,  // Optional: for comparisons
  timeframe: "MONTH"  // Optional: for period breakdown
})
```

This gives you the complete picture including all adjustments.

### For Transaction-Level Analysis

Use the detailed transaction tools:

```typescript
// Get all sales invoices
xero_list_invoices({
  invoiceType: "ACCREC",
  dateFrom: "2025-10-01",
  dateTo: "2025-10-31",
  status: "AUTHORISED"  // or "PAID"
})

// Get all bills
xero_list_invoices({
  invoiceType: "ACCPAY",
  dateFrom: "2025-10-01",
  dateTo: "2025-10-31"
})

// Get credit notes
xero_list_credit_notes({
  creditNoteType: "ACCRECCREDIT",  // Sales credit notes
  dateFrom: "2025-10-01",
  dateTo: "2025-10-31"
})

// Get bank transactions
xero_get_bank_transactions({
  dateFrom: "2025-10-01",
  dateTo: "2025-10-31"
})

// Get manual journals
xero_list_journal_entries({
  dateFrom: "2025-10-01",
  dateTo: "2025-10-31"
})
```

Then manually reconcile the totals.

### For Specific Customer/Supplier Analysis

Use the aged receivables/payables reports:

```typescript
// Customer balances
xero_get_aged_receivables({
  contactId: "contact-id-here",
  date: "2025-10-31"
})

// Supplier balances
xero_get_aged_payables({
  contactId: "contact-id-here",
  date: "2025-10-31"
})
```

## Best Practices

1. **Always clarify the purpose**:
   - Financial reporting? → Use P&L report
   - Transaction analysis? → Use individual transaction tools
   - Reconciliation? → Use both and compare

2. **Understand accounting basis**:
   - Check if using accrual or cash accounting
   - Filter by appropriate date (invoice date vs payment date)

3. **Include all components**:
   - Don't forget credit notes
   - Include bank transactions
   - Check for manual journals

4. **Use date ranges consistently**:
   - Always provide both `dateFrom` and `dateTo`
   - Use ISO format: YYYY-MM-DD
   - Match month boundaries exactly (e.g., 2025-10-01 to 2025-10-31)

5. **Test with diagnostic script**:
   - Run `test-xero-pl.ts` to validate
   - Compare outputs to identify missing components
   - Document any persistent discrepancies

## Troubleshooting

### Problem: P&L shows different numbers than chat conversation

**Solution**:
1. Check which tool was used in the chat (P&L report or invoice list?)
2. If invoice list was used, explain that it doesn't include all transactions
3. Run the diagnostic script to compare both sources
4. Use `xero_get_profit_and_loss` for accurate financial reporting

### Problem: Numbers still don't match after accounting for adjustments

**Solution**:
1. Check the accounting basis (accrual vs cash)
2. Verify date ranges match exactly
3. Check for:
   - Voided or deleted transactions
   - Foreign currency conversions
   - Tracking category filters
   - Multi-currency rounding
4. Contact Xero support if discrepancy persists

### Problem: Need to explain discrepancy to user

**Template Response**:
```
The difference between the P&L report ($X) and invoice list ($Y) is expected because:

1. P&L reports include ALL financial transactions:
   - Sales invoices: $A
   - Bills: $B
   - Credit notes: $C
   - Bank transactions: $D
   - Manual journals: $E
   - Total: $X

2. Invoice lists only include invoice records:
   - Sales invoices: $A
   - Total: $A (missing $D + $E)

The P&L report is the accurate source for financial reporting as it includes
all adjustments and accounting entries.

Would you like me to break down the specific components that make up the difference?
```

## Future Enhancements

### Potential Improvements

1. **P&L Breakdown Tool**: Create a single tool that fetches and reconciles all components automatically

2. **Cash vs Accrual Toggle**: Add parameter to filter transactions by payment date vs invoice date

3. **Transaction Drilldown**: Link P&L line items to underlying transactions for easier reconciliation

4. **Automated Reconciliation**: Create a tool that automatically identifies and explains discrepancies

5. **Export Formats**: Add CSV/Excel export for reconciliation worksheets

### Implementation Considerations

These enhancements would require:
- Additional API calls (rate limiting considerations)
- Complex aggregation logic
- Caching for performance
- Clear user guidance on when to use each tool

## Conclusion

The P&L discrepancy issue was not a bug, but rather a misunderstanding of data sources. By enhancing tool descriptions and providing diagnostic utilities, users can now:

1. Understand what each tool returns
2. Choose the right tool for their needs
3. Reconcile differences when comparing sources
4. Debug discrepancies systematically

The improved documentation and diagnostic script provide a foundation for accurate financial reporting and analysis using Xero data in LedgerBot.

# Workflow 2: Intelligent Bank Reconciliation

## Overview

LedgerBot's intelligent bank reconciliation workflow reviews unreconciled bank transactions, matches them to existing invoices or bills using fuzzy logic, suggests appropriate coding for new transactions based on payee and transaction patterns, and automatically creates bank rules for recurring items.

This workflow dramatically reduces the time spent on bank reconciliation from hours to minutes, ensuring your books are always up-to-date.

## How It Works

1. **Transaction Review**: LedgerBot retrieves unreconciled bank transactions from your Xero bank feeds
2. **Intelligent Matching**: Uses fuzzy matching logic to find corresponding invoices, bills, or previous transactions
3. **Pattern Recognition**: Identifies recurring transactions and suggests coding based on historical patterns
4. **Rule Creation**: Automatically proposes bank rules for regular transactions (subscriptions, utilities, etc.)
5. **Reconciliation**: Creates matches in Xero and marks transactions as reconciled

## Prerequisites

- Active Xero connection established
- Bank feeds connected in Xero
- Some historical transaction data for pattern recognition

## Step-by-Step Guide

### 1. Initiate Reconciliation

Start a conversation with LedgerBot requesting bank reconciliation assistance. You can be specific about which bank account or date range.

### 2. Review Matches

LedgerBot will present matched transactions with confidence scores:
- **High confidence** (>90%): Clear matches to existing invoices/bills
- **Medium confidence** (60-90%): Probable matches requiring verification
- **Low confidence** (<60%): Suggested coding based on patterns

### 3. Approve Matches

Review and approve the matches. You can:
- Approve all high-confidence matches at once
- Review medium-confidence matches individually
- Provide corrections for incorrect matches

### 4. Handle Unmatched Transactions

For transactions without clear matches, LedgerBot will:
- Suggest account codes based on merchant name and amount
- Identify similar historical transactions for reference
- Propose creation of new spend money/receive money transactions

### 5. Create Bank Rules

For recurring transactions (identified by regular amounts and merchants), approve the creation of bank rules to automate future reconciliation.

## Example Prompts

### Prompt 1: General Reconciliation Request
```
Please review all unreconciled bank transactions in my main business account
for the past 30 days. Match them to invoices and bills where possible, and
suggest coding for the remaining transactions.
```

### Prompt 2: Specific Account and Period
```
Reconcile the Commonwealth Bank - Cheque Account for the period 1 to 31
October 2024. Show me any transactions that don't have clear matches and
need my review.
```

### Prompt 3: Focus on Specific Transaction Types
```
I need to reconcile all the incoming payments in my bank feed. Match them
to outstanding customer invoices and flag any payments that don't match
expected amounts.
```

### Prompt 4: Create Bank Rules for Recurring Items
```
Look at my unreconciled bank transactions and identify any recurring
payments (like subscriptions, utilities, or regular suppliers). Suggest
appropriate bank rules so these reconcile automatically in future.
```

### Prompt 5: Quick Daily Reconciliation
```
Show me yesterday's bank transactions and match them to existing
transactions in Xero. I want to keep on top of my reconciliation daily
rather than leaving it to month-end.
```

## Tips and Best Practices

### Maintain Clean Bank Feeds
- Ensure your Xero bank feeds are regularly refreshing
- Don't mix personal and business transactions in connected accounts
- Use clear statement descriptions when making manual transfers

### Improve Matching Accuracy
- Keep vendor names consistent in Xero (avoid abbreviations)
- Record invoices and bills promptly before payments clear
- Use reference numbers in bank transfer descriptions

### Handle Common Scenarios

**Split Transactions**: "This bank payment of $2,450 covers two invoices: INV-1234 for $1,800 and INV-1235 for $650"

**Partial Payments**: "The customer paid $500 against invoice INV-5678 which has a total of $1,200. Record this as a partial payment"

**Bank Fees**: "Code all Commonwealth Bank fees to account 404 (Bank Fees) and create a rule for the monthly account keeping fee"

**Foreign Currency**: "This USD payment needs to match invoice INV-9012. The exchange rate difference should go to our FX Gains/Losses account"

### Bank Rule Strategy
- Create rules for truly recurring transactions (same merchant, similar amount)
- Don't over-automate - some transactions benefit from manual review
- Review bank rules quarterly to remove outdated ones

### Speed Up Month-End
- Reconcile little and often (daily or weekly) rather than monthly
- Clear high-confidence matches first, then focus on exceptions
- Use LedgerBot's pattern recognition to handle new transaction types quickly

## Common Questions

**Q: How does fuzzy matching work?**
A: LedgerBot compares transaction amounts, dates (within tolerance), and merchant names using similarity algorithms. It accounts for common variations in merchant names.

**Q: What if LedgerBot suggests an incorrect match?**
A: Simply tell LedgerBot the correct match or coding. The AI learns from your corrections and improves future suggestions.

**Q: Can I reconcile multiple bank accounts at once?**
A: Yes, you can request reconciliation across all accounts or specify multiple accounts in your prompt.

**Q: Does this work with credit card transactions?**
A: Absolutely. The same intelligent matching works for credit card feeds in Xero.

**Q: What about transfers between my own bank accounts?**
A: LedgerBot identifies inter-account transfers and can create the matching transfer transactions in both accounts.

## Related Workflows

- **Workflow 1**: Automated Invoice Processing (ensures bills exist for matching)
- **Workflow 4**: Automated Debtor Follow-Up (confirms which invoices have been paid)
- **Workflow 8**: Automated Month-End Procedures (bank reconciliation as part of month-end)
- **Workflow 9**: GST/BAS Preparation (reconciled transactions for accurate BAS)

## Advanced Usage

### Reconciliation Reports
```
Generate a reconciliation summary showing: total transactions reconciled,
remaining unreconciled items, and any unusual transactions that need my
attention.
```

### Exception Handling
```
Show me all bank transactions over $5,000 that are still unreconciled.
These need my personal review before matching.
```

### Merchant Analysis
```
Analyse my unreconciled transactions and group them by merchant. Show me
which suppliers I'm paying most frequently so I can create appropriate
bank rules.
```

## Technical Notes

This workflow uses LedgerBot's Reconciliation agent with advanced pattern matching algorithms. The system maintains a learning model of your transaction patterns to improve accuracy over time.

For technical implementation details, developers can refer to:
- `lib/ai/tools/xero-tools.ts` - Xero bank transaction and reconciliation tools
- `app/agents/reconciliations/` - Reconciliation agent architecture
- Fuzzy matching logic in the AI tool execution layer

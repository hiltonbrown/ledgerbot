# Workflow 8: Automated Month-End Procedures

## Overview

LedgerBot's automated month-end procedures workflow runs through a customised month-end checklist, posting standard journals (prepayments, accruals, depreciation), reconciling control accounts, generating preliminary financial statements, and flagging items requiring accountant attention before finalising.

This workflow ensures consistent, complete month-end processes, reduces the time to close, and gives you confidence that your financial statements are accurate and complete.

## How It Works

1. **Checklist Execution**: LedgerBot works through your customised month-end checklist systematically
2. **Automated Journals**: Posts standard recurring journals (depreciation, accruals, prepayments, provisions)
3. **Reconciliations**: Performs control account reconciliations (bank, debtors, creditors, GST)
4. **Exception Identification**: Flags items requiring manual review or adjustment
5. **Preliminary Statements**: Generates draft financial statements for review
6. **Sign-Off Tracking**: Documents completion of each step and outstanding items

## Prerequisites

- Active Xero connection established
- Month-end checklist defined (or use LedgerBot's default template)
- Standard journal templates for recurring entries
- Historical data for comparison and trend analysis

## Step-by-Step Guide

### 1. Initiate Month-End

At the end of the month, request LedgerBot to commence the month-end close process.

### 2. Preliminary Checks

LedgerBot performs initial validation:
- All bank accounts reconciled
- All customer invoices and supplier bills entered
- Payroll processed and reconciled
- No unbalanced transactions or errors

### 3. Standard Journals

Review and approve standard journal entries:
- Depreciation (calculated based on asset register)
- Prepayment amortisation
- Accruals for expenses incurred but not yet invoiced
- Provisions (annual leave, long service leave, warranties)
- Month-end adjustments (stock take, work in progress)

### 4. Control Account Reconciliations

Verify that control accounts balance:
- Debtors control = Sum of customer outstanding invoices
- Creditors control = Sum of supplier outstanding bills
- GST control = Calculated GST position
- Payroll clearing accounts cleared

### 5. Financial Statement Review

Review preliminary financial statements:
- Profit & Loss (with comparisons to budget and prior period)
- Balance Sheet (with key ratio analysis)
- Cash flow statement
- Variance explanations for material movements

### 6. Final Checks and Lock

Complete final verification steps and lock the period in Xero.

## Example Prompts

### Prompt 1: Standard Month-End Process
```
Run the month-end close process for October 2024. Work through the checklist:
verify all bank reconciliations are complete, post depreciation journals,
amortise prepayments, review accruals, reconcile control accounts, and
generate preliminary financial statements. Flag anything that needs my attention.
```

### Prompt 2: Quick Month-End Status
```
I'm about to start the month-end close for November. Give me a status report:
which bank accounts are not yet reconciled, are there any unmatched
transactions, have all supplier bills been entered, is payroll processed,
and what's the current state of the GST control account?
```

### Prompt 3: Standard Journals Only
```
Post the standard month-end journals for December 2024:
(1) Depreciation on all assets in the fixed asset register
(2) Amortise prepaid insurance ($18,000 paid in July for 12 months)
(3) Accrue for utilities based on average of $850/month
(4) Update leave provisions based on current employee leave balances
Show me the draft journals before posting.
```

### Prompt 4: Control Account Reconciliation
```
Reconcile all control accounts as at 31 October 2024:
(1) Verify debtors control matches sum of outstanding customer invoices
(2) Verify creditors control matches sum of outstanding supplier bills
(3) Reconcile GST control to calculated GST position
(4) Check all payroll clearing accounts have nil balance
Explain any discrepancies found.
```

### Prompt 5: Month-End Close Checklist
```
Create a month-end close checklist for our business. Include all standard
tasks (bank recs, journals, reconciliations, statements) and add our specific
requirements: (1) review intercompany transactions, (2) update foreign currency
revaluation, (3) reconcile project work-in-progress, (4) verify contractor
invoices received. Track completion of each task.
```

## Tips and Best Practices

### Month-End Checklist Template

Customize this template for your business:

**Pre-Month-End (Days 1-28/30/31):**
- [ ] Enter all supplier bills received
- [ ] Process all customer invoices
- [ ] Process payroll
- [ ] Reconcile bank accounts to last business day

**Month-End Day (Day 1-3 of following month):**
- [ ] Final bank reconciliation
- [ ] Post depreciation journals
- [ ] Amortise prepayments
- [ ] Accrue expenses (utilities, rent, etc.)
- [ ] Update provisions (leave, warranties)
- [ ] Reconcile debtors control
- [ ] Reconcile creditors control
- [ ] Reconcile GST control
- [ ] Clear payroll clearing accounts
- [ ] Review balance sheet accounts for anomalies
- [ ] Generate preliminary financial statements
- [ ] Review variances vs budget
- [ ] Fix any identified errors

**Final Review (Day 3-5):**
- [ ] Review P&L and balance sheet
- [ ] Document significant variances
- [ ] Accountant/manager sign-off
- [ ] Lock period in Xero

### Standard Journal Templates

Define your recurring journals:

**Depreciation:**
```
Monthly depreciation journal based on fixed asset register:
- Computer Equipment: $850/month (3-year life)
- Office Furniture: $320/month (10-year life)
- Motor Vehicles: $1,240/month (5-year life)
Total monthly depreciation: $2,410
DR Depreciation Expense $2,410
CR Accumulated Depreciation $2,410
```

**Prepayment Amortisation:**
```
Insurance prepayment (paid $18,000 on 1 July for 12 months):
Monthly amortisation: $1,500
DR Insurance Expense $1,500
CR Prepaid Insurance $1,500
```

**Accruals:**
```
Accrue estimated utility expenses:
Average monthly utilities: $850
DR Utilities Expense $850
CR Accrued Utilities $850
```

### Reconciliation Tolerances

Set acceptable tolerance levels:
- **Bank reconciliation**: $0 (must balance exactly)
- **Debtors control**: $10 tolerance (rounding)
- **Creditors control**: $10 tolerance (rounding)
- **GST control**: $1 tolerance (rounding)

For any variances beyond tolerance, investigate before proceeding.

### Common Month-End Adjustments

**Stock Take Adjustment:**
```
Physical stock count: $45,600
System inventory value: $47,200
Adjustment required: -$1,600

DR Cost of Goods Sold $1,600
CR Inventory $1,600
```

**Bad Debt Write-Off:**
```
Customer ABC Ltd invoice $2,450 is unrecoverable (company liquidated):
DR Bad Debts Expense $2,450
CR Accounts Receivable - ABC Ltd $2,450
```

**Accrued Income:**
```
Completed project work invoiced in following month:
DR Accrued Income $12,500
CR Sales Revenue $12,500
```

**Foreign Currency Revaluation:**
```
USD bank account at month-end requires revaluation:
USD balance: $10,000
Month-end rate: 0.65
Value: AUD $15,385
Book value: AUD $15,200
Unrealised gain: $185

DR Foreign Currency Bank Account $185
CR Foreign Exchange Gain $185
```

### Time-Saving Tips

**Daily habits to speed up month-end:**
- Reconcile bank accounts daily or weekly (not just month-end)
- Enter bills and invoices as they arrive
- Resolve queries immediately, don't let them pile up
- Keep a running list of month-end adjustments needed

**Use LedgerBot throughout the month:**
- Quick reconciliation checks
- Variance monitoring against budget
- Cash flow tracking
- Debtor follow-up

**Prepare in advance:**
- Collect information for accruals before month-end
- Prepare journal entries in draft
- Update asset register before depreciation calculation
- Advise suppliers to send invoices promptly

## Common Questions

**Q: How long should month-end close take?**
A: For small businesses with good daily processes, 2-4 hours. LedgerBot can reduce this to under an hour for standard months.

**Q: Should we lock the period immediately after closing?**
A: Best practice is to lock the period once financial statements are approved and filed/distributed. This prevents accidental changes.

**Q: What if we discover an error after locking?**
A: You can unlock in Xero, make corrections, and re-lock. Document why the unlock was necessary.

**Q: Do we need to close every month?**
A: For accurate management reporting and GST compliance, yes. Quarterly might be acceptable for very small businesses.

**Q: Can LedgerBot handle year-end close?**
A: Yes, year-end follows the same process with additional steps (tax provisions, audit adjustments, etc.). LedgerBot can guide you through this.

## Related Workflows

- **Workflow 1**: Invoice Processing (ensure all bills entered)
- **Workflow 2**: Bank Reconciliation (complete before month-end)
- **Workflow 6**: Variance Analysis (review actual vs budget)
- **Workflow 9**: GST/BAS Preparation (reconcile GST as part of month-end)
- **Workflow 7**: Payroll Exception Monitoring (payroll reconciliation)

## Advanced Usage

### Multi-Entity Month-End
```
We have 3 entities: Operating Company, Property Trust, and Service Company.
Run month-end close for all three entities. Additionally, reconcile all
intercompany transactions and verify they balance. Generate consolidated
financial statements eliminating intercompany balances.
```

### Automated Journal Posting
```
I've defined our standard month-end journals in a spreadsheet (uploaded as
context file). Review the journal listing, verify all calculations are correct,
and post them to Xero for October 2024. Confirm when all journals are posted.
```

### Close Timeline Tracking
```
Track our month-end close timeline. Show me: (1) when we started the process,
(2) how long each major step took, (3) what delayed the close, and (4) compare
to our target of completing within 3 business days. Suggest improvements to
speed up next month.
```

### Quality Assurance Checks
```
Before I lock October 2024, run a comprehensive quality check:
(1) All transactions dated October are coded to October period
(2) No draft or unapproved transactions exist
(3) All suspense/clearing accounts are cleared
(4) Balance sheet balances are reasonable (no negative asset balances, etc.)
(5) Key ratios are within expected ranges
Flag anything suspicious.
```

### Month-End Report Package
```
Generate the month-end report package for October 2024:
(1) P&L with budget comparison and variance commentary
(2) Balance sheet with prior month comparison
(3) Cash flow statement
(4) Aged receivables summary
(5) Aged payables summary
(6) Key financial ratios
(7) Executive summary highlighting key points
Format for presentation to the board.
```

## Month-End Close Timeline

### Target Timeline for Small Business:

**Month-End Day +1 (First business day of new month):**
- Complete all data entry (8am-10am)
- Final bank reconciliation (10am-11am)
- Post standard journals (11am-12pm)

**Month-End Day +2:**
- Control account reconciliations (8am-10am)
- Review preliminary statements (10am-12pm)
- Investigate and fix errors (1pm-3pm)

**Month-End Day +3:**
- Final review and sign-off (8am-10am)
- Lock period in Xero (10am)
- Distribute financial reports (11am)

LedgerBot can help you achieve or beat this timeline.

## Technical Notes

This workflow uses LedgerBot's Workflow Supervisor agent to orchestrate multiple sub-tasks. The system maintains state across the month-end process and tracks completion of each step.

For technical implementation details, developers can refer to:
- `app/agents/workflow/` - Workflow supervisor agent
- `lib/ai/tools/xero-tools.ts` - Xero journal posting and data retrieval
- Month-end procedure templates can be stored in user settings
- `lib/db/schema.ts` - Tracking of month-end close status

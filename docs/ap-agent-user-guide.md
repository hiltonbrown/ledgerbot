# Accounts Payable (AP) Agent - User Guide

## Overview

The **Accounts Payable Agent** is your AI-powered assistant for managing supplier bills, vendor relationships, and payment workflows with expertise in Australian GST compliance. It helps you validate suppliers, code bills accurately, manage approval workflows, and generate payment run proposals—all while maintaining complete control over financial decisions.

**Important**: The AP Agent is read-only and advisory. It generates proposals and recommendations but does not modify your financial data, approve bills, or process payments automatically. You always maintain full control.

## Getting Started

### Accessing the AP Agent

1. Navigate to `/agents/ap` in LedgerBot
2. The AP Agent workspace will load with a chat interface
3. No initial setup is required—you can start asking questions immediately

### Key Features

- **Supplier Validation**: Verify Australian Business Numbers (ABNs) and assess supplier risk
- **Bill Coding**: AI-powered GL account and GST code suggestions
- **Duplicate Detection**: Prevent double-payment by identifying duplicate bills
- **Approval Workflow Tracking**: Monitor approval status and identify bottlenecks
- **Payment Run Proposals**: Generate optimized payment batches based on due dates and risk
- **Payment Risk Assessment**: Evaluate each bill for risk factors before payment
- **Email Draft Generation**: Create professional supplier communication drafts
- **Xero Integration**: Access real-time bills, suppliers, and chart of accounts (optional)

## Core Workflows

### 1. Validating New Suppliers

Before adding a new supplier, verify their legitimacy and GST registration:

**Example Questions:**
- "Validate ABN 12 345 678 901"
- "Check if this supplier is GST registered: 98-765-432-109"
- "Verify the ABN for Acme Office Supplies"

**What the Agent Does:**
1. Cleans and formats the ABN (removes spaces/hyphens)
2. Validates the 11-digit format
3. Returns business entity information and GST registration status

**Example Response:**
```
ABN VALIDATION RESULT

ABN: 12345678901 ✓ Valid

Entity Information:
• Business Name: Acme Office Supplies Pty Ltd
• Entity Type: Australian Private Company
• GST Registered: Yes

Recommendation: This supplier is eligible to provide tax invoices. You can claim GST input tax credits on eligible purchases.

Note: This is a stub validation. Production integration with ABR (Australian Business Register) API recommended for real-time verification.
```

**Important**: The current implementation uses a validation stub. For production use, integrate with the [ABR SOAP API](https://abr.business.gov.au/) for real-time ABN lookups.

### 2. Coding Supplier Bills

Get intelligent suggestions for GL account codes and GST treatment:

**Example Questions:**
- "Suggest coding for a $500 office supplies bill from Officeworks"
- "How should I code this $1,200 software subscription from Adobe?"
- "What GL accounts should I use for professional fees from my accountant?"

**What the Agent Does:**
1. Analyzes line item descriptions
2. Considers supplier type and business context
3. References your Xero chart of accounts (if connected)
4. Suggests appropriate GL codes and GST treatments
5. Provides confidence scores and reasoning

**Example Request:**
> "Suggest coding for a bill from Tech Supplies Ltd with these line items:
> - Laptop computer: $1,800
> - Microsoft 365 subscription: $120
> - Office chair: $450"

**Example Response:**
```
CODING SUGGESTIONS

Supplier: Tech Supplies Ltd

Line Item 1: Laptop computer ($1,800.00)
┌────────────────────────────────────────────────
│ Suggested Account: 1-0840 | Computer Equipment
│ GST Treatment: CAPITAL_PURCHASE (10%)
│ Confidence: 95%
│ Reasoning: High-value computer equipment (>$1,000) is treated as a capital purchase for BAS purposes. You can still claim the GST credit, but it's reported differently on your BAS.
└────────────────────────────────────────────────

Line Item 2: Microsoft 365 subscription ($120.00)
┌────────────────────────────────────────────────
│ Suggested Account: 6-0408 | Software & Subscriptions
│ GST Treatment: INPUT_TAX (10%)
│ Confidence: 98%
│ Reasoning: Software subscriptions are standard business expenses. Claim full GST input tax credit.
└────────────────────────────────────────────────

Line Item 3: Office chair ($450.00)
┌────────────────────────────────────────────────
│ Suggested Account: 6-0210 | Office Equipment
│ GST Treatment: INPUT_TAX (10%)
│ Confidence: 92%
│ Reasoning: Office furniture under $1,000 is regular expense. Claim GST input tax credit.
└────────────────────────────────────────────────

SUMMARY
Total GST Claimable: $237.00
Total Amount: $2,370.00 (inc. GST)
Tax Invoice Required: Yes (total ≥ $1,000)
```

### 3. Checking for Duplicate Bills

Prevent accidental double-payment:

**Example Questions:**
- "Check if I've already entered this bill: INV-2024-001 from Acme for $1,500"
- "Is there a duplicate of invoice 12345 from Tech Supplies?"
- "Has this bill been entered already: XYZ Corp invoice dated 15/10/2024"

**What the Agent Does:**
1. Searches existing bills by supplier, number, amount, and date
2. Uses fuzzy matching to catch variations (INV-001 vs INV001)
3. Flags potential duplicates with similarity scores
4. Checks multiple criteria: exact match, near match, same supplier/amount

**Example Response:**
```
DUPLICATE CHECK RESULT

Bill: INV-2024-001 | Acme Pty Ltd | $1,500.00 | Due: 15/11/2024

⚠️ POTENTIAL DUPLICATE FOUND

Existing Bill: INV-2024-001 | Acme Pty Ltd | $1,500.00 | Due: 15/11/2024
• Match Score: 100% (exact match)
• Entered: 02/11/2024
• Status: awaiting_approval
• Matched Criteria: invoice number, supplier, amount, date

Recommendation: This appears to be a duplicate. Review the existing bill before proceeding. If these are different bills, contact the supplier to clarify invoice numbering.
```

### 4. Managing Approval Workflows

Track bill approval status and identify bottlenecks:

**Example Questions:**
- "What bills are awaiting approval?"
- "Show me bills stuck in approval for more than 5 days"
- "Who needs to approve the $5,000 bill from XYZ Corp?"
- "List high-value bills requiring CFO approval"

**Example Response:**
```
BILLS AWAITING APPROVAL

Total: 7 bills | Combined Value: $18,450.00

OVERDUE APPROVALS (>5 days waiting):
1. INV-001 | Tech Solutions Ltd | $5,200.00
   • Days Waiting: 8 days
   • Requires: CFO approval (high-value threshold)
   • Due Date: 12/11/2024 (2 days away)
   • Risk: Payment delay if not approved soon

2. INV-002 | Office Supplies Co | $890.00
   • Days Waiting: 6 days
   • Requires: Manager approval
   • Due Date: 18/11/2024
   • Risk: Low (normal approval timeframe)

STANDARD APPROVALS (<5 days waiting):
3. INV-003 | Building Maintenance | $2,400.00 (3 days)
4. INV-004 | Software Pty Ltd | $1,200.00 (2 days)
5. INV-005 | Consulting Services | $3,800.00 (4 days)
6. INV-006 | Marketing Agency | $2,100.00 (1 day)
7. INV-007 | Utilities | $450.00 (1 day)

RECOMMENDATIONS:
• Escalate INV-001 to CFO immediately (due in 2 days)
• Follow up on INV-002 (normal priority)
• Consider automated approval for bills <$500 to reduce bottlenecks
```

### 5. Generating Payment Run Proposals

Create optimized payment batches for approval:

**Example Questions:**
- "Generate a payment run for bills due this week"
- "Propose a payment batch for all approved bills under $50,000 total"
- "Create a payment run for overdue bills only"
- "Show me which bills I should pay by Friday"

**What the Agent Does:**
1. Filters bills by due date, approval status, and amount constraints
2. Prioritizes: overdue → due soon (within 7 days) → normal
3. Assesses payment risk for each bill
4. Calculates totals and provides batch summary
5. Flags high-risk items for review

**Example Request:**
> "Generate a payment run for all approved bills due in the next 7 days. Maximum total: $25,000."

**Example Response:**
```
PAYMENT RUN PROPOSAL

Generated: 10/11/2025 | Max Amount: $25,000.00

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BATCH SUMMARY
• Total Bills: 8
• Total Amount: $23,450.00
• Within Budget: Yes ($1,550 under limit)
• High-Risk Bills: 1

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

URGENT (Overdue):
┌────────────────────────────────────────────────
│ 1. Tech Supplies Ltd | INV-001 | $5,200.00
│    Due: 05/11/2024 (5 days ago)
│    Risk: HIGH (45 points)
│    Flags: Missing tax invoice, amount 2x normal
│    Action: Request tax invoice before paying
└────────────────────────────────────────────────

DUE SOON (Next 7 days):
┌────────────────────────────────────────────────
│ 2. Office Supplies Co | INV-002 | $890.00
│    Due: 12/11/2024 (2 days)
│    Risk: LOW (10 points)
│    Status: Ready to pay ✓
├────────────────────────────────────────────────
│ 3. Software Pty Ltd | INV-003 | $1,200.00
│    Due: 14/11/2024 (4 days)
│    Risk: LOW (8 points)
│    Status: Ready to pay ✓
├────────────────────────────────────────────────
│ 4. Marketing Agency | INV-004 | $3,800.00
│    Due: 15/11/2024 (5 days)
│    Risk: MEDIUM (25 points)
│    Flags: New supplier (first payment)
│    Action: Verify bank details before paying
├────────────────────────────────────────────────
│ 5. Consulting Services | INV-005 | $2,400.00
│    Due: 16/11/2024 (6 days)
│    Risk: LOW (12 points)
│    Status: Ready to pay ✓
├────────────────────────────────────────────────
│ 6. Building Maintenance | INV-006 | $4,500.00
│    Due: 16/11/2024 (6 days)
│    Risk: LOW (15 points)
│    Status: Ready to pay ✓
├────────────────────────────────────────────────
│ 7. Utilities | INV-007 | $450.00
│    Due: 17/11/2024 (7 days)
│    Risk: LOW (5 points)
│    Status: Ready to pay ✓
├────────────────────────────────────────────────
│ 8. Stationery World | INV-008 | $5,010.00
│    Due: 17/11/2024 (7 days)
│    Risk: LOW (18 points)
│    Status: Ready to pay ✓
└────────────────────────────────────────────────

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RISK DISTRIBUTION
• Critical (≥60 points): 0 bills
• High (40-59 points): 1 bill ($5,200.00)
• Medium (20-39 points): 1 bill ($3,800.00)
• Low (<20 points): 6 bills ($14,450.00)

PRIORITY SUMMARY
• Urgent (overdue): 1 bill | $5,200.00
• Due Soon (≤7 days): 7 bills | $18,250.00
• Normal: 0 bills | $0.00

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RECOMMENDATIONS
1. ⚠️ Request tax invoice from Tech Supplies Ltd before paying INV-001
2. ⚠️ Verify bank account details for new supplier Marketing Agency
3. ✓ Remaining 6 bills are ready for payment
4. Consider processing low-risk bills immediately to maintain supplier relationships
5. Total GST claimable (estimated): $2,131.82

Would you like me to generate payment advice email drafts for these suppliers?
```

### 6. Assessing Payment Risk

Evaluate individual bills for risk factors before payment:

**Example Questions:**
- "Assess the payment risk for bill INV-001"
- "What's risky about this $10,000 bill from New Supplier Co?"
- "Should I be concerned about paying invoice XYZ-456?"

**Risk Factors Considered:**
- **Approval Status**: Unapproved bills = +30 points
- **Supplier Status**: Inactive/blocked supplier = +50 points
- **Missing Documentation**: No tax invoice = +20 points, No ABN = +25 points
- **Duplicate Risk**: Potential duplicate = +35 points
- **Amount Variance**: Amount >2x normal = +15 points
- **New Supplier**: First payment = +10 points

**Risk Level Classification:**
- **Critical (≥60 points)**: Do not pay without review
- **High (40-59 points)**: Requires additional verification
- **Medium (20-39 points)**: Minor concerns, investigate
- **Low (<20 points)**: Ready to pay

**Example Response:**
```
PAYMENT RISK ASSESSMENT

Bill: INV-001 | Tech Supplies Ltd | $5,200.00

┌────────────────────────────────────────────────
│ Risk Level: HIGH (45 points)
│ Recommendation: Additional verification required
└────────────────────────────────────────────────

RISK FACTORS IDENTIFIED:
• Missing tax invoice (+20 points)
  → Cannot claim GST credit without valid tax invoice
  → Action: Request tax invoice from supplier

• Amount unusually high (+15 points)
  → This bill is 2.1x the normal amount from this supplier
  → Action: Verify line items and quantities

• Approaching approval threshold (+10 points)
  → Bill amount requires senior approval
  → Action: Confirm CFO approval documented

POSITIVE FACTORS:
✓ Supplier has valid ABN
✓ No duplicate bills detected
✓ Supplier is active (regular trading)
✓ Bill is approved

RECOMMENDED ACTIONS BEFORE PAYMENT:
1. Contact Tech Supplies Ltd to request tax invoice
2. Review line items to confirm quantities/prices
3. Verify CFO approval is documented
4. Once tax invoice received, safe to proceed with payment

Would you like me to draft an email to Tech Supplies Ltd requesting the tax invoice?
```

### 7. Generating Supplier Email Drafts

Create professional communication for common scenarios:

**Example Questions:**
- "Draft an email to request a tax invoice from Acme Pty Ltd for bill INV-001"
- "Create an email asking XYZ Corp for their ABN details"
- "Generate a payment advice email for invoice 12345"
- "Write an email querying a discrepancy on bill ABC-789"

**Common Email Scenarios:**
1. **Tax Invoice Request**: Request proper tax invoice for GST claim
2. **ABN Request**: Ask for supplier ABN details
3. **Payment Advice**: Notify supplier of scheduled payment
4. **Query/Dispute**: Question invoice amounts or details
5. **Missing Information**: Request additional documentation

**Example Request:**
> "Draft an email to Tech Supplies Ltd requesting a proper tax invoice for bill INV-001 ($5,200.00)"

**Example Response:**
```
EMAIL DRAFT - TAX INVOICE REQUEST

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

To: accounts@techsupplies.com.au
Subject: Tax Invoice Required - INV-001

Dear Tech Supplies Ltd Accounts Team,

We are processing your invoice INV-001 for payment ($5,200.00 including GST) and require a valid tax invoice to claim the GST input tax credit.

Invoice Details:
• Invoice Number: INV-001
• Invoice Date: 15/10/2024
• Amount: $5,200.00 (including GST)

To meet Australian Tax Office requirements, the tax invoice must include:
• The words "Tax Invoice" prominently displayed
• Your ABN (Australian Business Number)
• Issue date and our business details
• Description of goods/services supplied
• GST amount or statement that price includes GST
• Total price payable

Could you please provide a compliant tax invoice at your earliest convenience? Once received, we will proceed with payment immediately.

If you have any questions, please don't hesitate to contact us.

Kind regards,

[Your Business Name]
Accounts Payable
[Your Email]
[Your Phone]
ABN: [Your ABN]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This draft has been saved as Artefact ID: art_email_001
Copy this draft and send it manually from your email client.

IMPORTANT: This is a draft only. The AP Agent does NOT send emails automatically. Please review, customize if needed, and send manually.
```

**Example: Payment Advice Email**

**Request:**
> "Generate a payment advice email for 3 bills being paid on Friday"

**Response:**
```
EMAIL DRAFT - PAYMENT ADVICE

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

To: accounts@officesupplies.com.au
Subject: Payment Advice - Invoices Due 15/11/2024

Dear Office Supplies Co,

This is to advise that we have scheduled payment for the following invoices on Friday, 15th November 2024:

Invoice Details:
┌────────────────────────────────────────────────
│ Invoice Number: INV-002
│ Invoice Date: 18/10/2024
│ Amount: $890.00
├────────────────────────────────────────────────
│ Invoice Number: INV-003
│ Invoice Date: 21/10/2024
│ Amount: $1,200.00
├────────────────────────────────────────────────
│ Invoice Number: INV-004
│ Invoice Date: 25/10/2024
│ Amount: $450.00
└────────────────────────────────────────────────

Total Payment: $2,540.00
Payment Method: Electronic Funds Transfer (EFT)
Payment Date: 15/11/2024
Reference: [To be added]

Funds should arrive in your account within 1-2 business days. If you have any questions about this payment, please contact us.

Thank you for your service.

Kind regards,

[Your Business Name]
Accounts Payable
[Your Email]
[Your Phone]
ABN: [Your ABN]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This draft has been saved as Artefact ID: art_email_002
```

## Understanding Australian GST Rules

### GST Basics for AP

**Standard GST Rate**: 10% on most goods and services
**GST Registration Threshold**: $75,000 turnover ($150,000 for non-profits)
**BAS Reporting**: Monthly or quarterly (depending on turnover)

### Common GST Treatments

| Expense Type | GST Code | Description | Can Claim Credit? |
|--------------|----------|-------------|-------------------|
| **Software & Subscriptions** | INPUT_TAX | Standard business expense | ✓ Yes (10%) |
| **Office Supplies** | INPUT_TAX | Stationery, consumables | ✓ Yes (10%) |
| **Professional Fees** | INPUT_TAX | Legal, accounting, consulting | ✓ Yes (10%) |
| **Advertising** | INPUT_TAX | Marketing, advertising | ✓ Yes (10%) |
| **Vehicle Expenses** | INPUT_TAX | Fuel, maintenance, parts | ✓ Yes (10%) |
| **Commercial Rent** | GST_FREE | Office/warehouse rent | ✗ No GST |
| **Bank Fees** | GST_FREE | Financial services | ✗ No GST |
| **Interest** | GST_FREE | Loan interest, overdraft fees | ✗ No GST |
| **Equipment >$1,000** | CAPITAL_PURCHASE | Assets (different BAS treatment) | ✓ Yes (10%)* |
| **Entertainment** | BAS_EXCLUDED | Client meals, entertainment | ✗ Not claimable |

*Capital purchases are claimable but reported differently on BAS (question 1C instead of 1B).

### Tax Invoice Requirements

To claim GST input tax credits, you need a valid tax invoice:

**Required Elements (All Invoices):**
1. Words "Tax Invoice" prominently displayed
2. Supplier's ABN
3. Issue date
4. Description of goods/services
5. GST amount (or "price includes GST")
6. Total price

**Additional Requirements (≥$1,000 including GST):**
- Buyer's identity/ABN
- Quantity of goods/services supplied

**Without a Tax Invoice:** You cannot claim the GST credit on your BAS.

### Capital Purchases vs Regular Expenses

**Regular Expenses (<$1,000):**
- Coded as `INPUT_TAX`
- Reported on BAS question 1B (GST on purchases)
- Examples: Office supplies, small tools, monthly subscriptions

**Capital Purchases (≥$1,000):**
- Coded as `CAPITAL_PURCHASE`
- Reported on BAS question 1C (GST on capital purchases)
- Examples: Computers, machinery, office furniture (high-value)
- Can still claim GST credit (just different BAS treatment)

**Why This Matters:** The ATO tracks capital asset acquisitions separately for depreciation and tax purposes.

## Integration with Xero

### Setting Up Xero Connection

1. Navigate to **Settings → Integrations**
2. Click **Connect to Xero**
3. Authorize LedgerBot with required scopes:
   - `accounting.transactions`: Bill (ACCPAY invoice) access
   - `accounting.contacts`: Supplier access
   - `accounting.settings`: Chart of accounts access
   - `offline_access`: Token refresh
4. Select your Xero organization
5. Return to AP Agent

### What Xero Integration Provides

| Without Xero | With Xero |
|--------------|-----------|
| Manual bill entry | Real bills (ACCPAY invoices) from Xero |
| Generic chart of accounts | Your actual chart of accounts |
| Mock supplier data | Real supplier master data |
| No GST rate info | Configured GST/tax rates from Xero |
| No payment history | Complete payment history |
| Limited context for coding | Industry-specific account context |

### Xero-Enabled Features

When Xero is connected, the AP Agent can:

1. **Fetch Real Bills**: `xero_list_bills` retrieves actual ACCPAY invoices
2. **Get Bill Details**: `xero_get_bill` shows line items, attachments, approval status
3. **Access Suppliers**: `xero_list_suppliers` provides vendor master data with ABNs
4. **Use Chart of Accounts**: `xero_list_accounts` improves coding accuracy
5. **Get Tax Rates**: `xero_list_tax_rates` ensures correct GST treatment
6. **Track Payments**: `xero_list_payments` shows payment history

**Example with Xero Connected:**

> "Suggest coding for Xero bill INV-001"

**Response:**
```
CODING SUGGESTIONS (Using Xero Data)

Retrieved bill INV-001 from Xero:
• Supplier: Tech Supplies Ltd (ABN: 12 345 678 901)
• Total: $2,640.00 (inc. GST)
• Status: Awaiting approval
• Due Date: 20/11/2024

Line Items (from Xero):
1. Dell Latitude Laptop ($1,800 + $180 GST)
   → Suggested: 1-0840 Computer Equipment | CAPITAL_PURCHASE
   → Matches your Xero account: "1-0840 Computer Equipment (Fixed Asset)"

2. Microsoft 365 Annual ($120 + $12 GST)
   → Suggested: 6-0408 Software & Subscriptions | INPUT_TAX
   → Matches your Xero account: "6-0408 Software Subscriptions (Expense)"

All suggestions aligned with your Xero chart of accounts structure.
```

## Payment Risk Framework

The AP Agent uses a points-based risk assessment system:

### Risk Scoring Matrix

| Risk Factor | Points | Threshold |
|-------------|--------|-----------|
| Supplier blocked/inactive | +50 | Critical |
| Potential duplicate bill | +35 | Critical |
| Missing approval | +30 | High |
| Missing ABN | +25 | High |
| Missing tax invoice | +20 | Medium |
| Amount unusually high (>2x normal) | +15 | Medium |
| New supplier (first payment) | +10 | Low |

### Risk Levels

| Level | Points | Action Required |
|-------|--------|-----------------|
| **Critical** | ≥60 | Do not pay without senior approval |
| **High** | 40-59 | Requires additional verification |
| **Medium** | 20-39 | Review flagged items before paying |
| **Low** | <20 | Safe to pay (documentation complete) |

### Risk Mitigation Actions

**Critical Risk (≥60 points):**
- Escalate to financial controller or CFO
- Investigate all flagged factors before proceeding
- Document resolution of each risk factor
- Obtain senior approval in writing

**High Risk (40-59 points):**
- Request missing documentation (tax invoice, ABN)
- Verify unusual amounts with supplier
- Check approval workflows are complete
- Consider delaying payment until resolved

**Medium Risk (20-39 points):**
- Follow up on missing items (non-blocking)
- Review line items for accuracy
- Confirm approval documented
- Proceed with payment if time-critical

**Low Risk (<20 points):**
- All documentation complete
- Normal amounts and suppliers
- Ready to pay without additional checks

## Best Practices

### Supplier Onboarding

1. **Validate ABN**: Always check ABN before first payment
2. **Request Tax Invoice**: Ensure supplier can provide compliant invoices
3. **Verify Bank Details**: Confirm bank account via phone (not email)
4. **Set Payment Terms**: Agree on payment terms (e.g., 30 days from invoice)
5. **Document Defaults**: Record default GL account and GST treatment

### Bill Processing

1. **Check for Duplicates**: Always run duplicate check before entering
2. **Code Accurately**: Use AP Agent coding suggestions, verify with accountant
3. **Verify Amounts**: Check totals include correct GST (should be 11x base amount)
4. **Request Tax Invoices**: Don't pay without valid tax invoice for GST claims
5. **Document Approvals**: Ensure approval workflow is complete

### Payment Runs

1. **Schedule Regularly**: Weekly or fortnightly payment runs maintain relationships
2. **Prioritize Overdue**: Pay overdue bills first to avoid late fees
3. **Respect Due Dates**: Pay on or before due date when cash flow permits
4. **Batch by Payment Method**: Group EFT, credit card, cheque payments separately
5. **Send Payment Advice**: Notify suppliers of payment with reference numbers

### GST Compliance

1. **Always Request Tax Invoices**: Required to claim GST input tax credits
2. **Capital Purchase Threshold**: Treat purchases ≥$1,000 as capital for BAS
3. **Entertainment is Not Claimable**: Code as BAS_EXCLUDED (cannot claim GST)
4. **Rent is GST-Free**: Commercial rent does not include GST
5. **Keep Records**: ATO requires tax invoices for 5 years

### Risk Management

1. **Assess Before Paying**: Run risk assessment on all bills >$1,000
2. **Verify New Suppliers**: Extra scrutiny for first-time payments
3. **Flag Unusual Amounts**: Investigate bills >2x normal amount
4. **Separate Approvals**: High-value bills require senior approval
5. **Document Exceptions**: Record why you paid despite risk flags

## Keyboard Shortcuts & Tips

### Chat Interface
- **Enter**: Send message (Shift+Enter for new line)
- **Esc**: Clear input field
- **↑ / ↓**: Navigate message history

### Productivity Tips
1. **Batch Process Bills**: "Suggest coding for all bills from this week"
2. **Use Filters**: "Generate payment run for approved bills under $10,000"
3. **Combine Tasks**: "Check for duplicates AND assess risk for bill INV-001"
4. **Reference Xero**: "Use my Xero chart of accounts for coding suggestions"
5. **Save Email Drafts**: Keep artefact IDs for future reference

## Common Questions

### Does the AP Agent process payments automatically?

**No.** The AP Agent is read-only and advisory. It generates payment proposals and recommendations, but you must manually process payments through your bank, Xero, or payment platform. This ensures you maintain full control over financial transactions.

### Can the AP Agent approve bills?

**No.** The AP Agent can track approval status and identify bottlenecks, but it cannot approve bills. Approval authority remains with designated approvers in your organization.

### Why do I need tax invoices?

Under Australian tax law, you can only claim GST input tax credits if you have a valid tax invoice from a GST-registered supplier. Without a tax invoice, you cannot claim the GST component on your BAS, which costs you 10% of the purchase price.

### What's the difference between INPUT_TAX and CAPITAL_PURCHASE?

Both allow you to claim GST credits, but they're reported differently on your BAS:
- **INPUT_TAX**: Regular expenses (question 1B on BAS)
- **CAPITAL_PURCHASE**: Assets ≥$1,000 (question 1C on BAS)

The ATO tracks capital purchases separately for depreciation and tax purposes.

### Can I customize GL account suggestions?

Yes! When Xero is connected, the AP Agent uses your actual chart of accounts. You can also provide additional context in your questions (e.g., "We always code software to account 6-0500") to get more tailored suggestions.

### Does the AP Agent integrate with my bank?

Not directly. The AP Agent generates payment proposals, but you must process payments through your existing systems (bank portal, Xero batch payments, etc.). This maintains security and control over financial transactions.

### Can I automate approval workflows?

You can configure approval thresholds (e.g., "$500 auto-approved, $5,000+ requires CFO") in your business rules, but the AP Agent itself does not automatically approve bills. It only tracks and reports on approval status.

### What if the ABN validation fails?

The current ABN validation is a stub (returns mock data). For production use, integrate with the Australian Business Register (ABR) SOAP API for real-time validation. If a supplier's ABN is invalid, you cannot claim GST credits on purchases from them.

## Troubleshooting

### "Sync AP Session" Button Required

**Issue**: Chat shows "Sync required" badge
**Solution**: Click "Sync AP Session" button to initialize the agent with your context

### No Bills Found from Xero

**Issue**: Xero connected but no bills returned
**Possible Causes:**
- No ACCPAY invoices in Xero (bills are "ACCPAY", not "ACCREC")
- All bills are paid (filter shows only unpaid by default)
- Date range too restrictive

**Solution:** Check filters or query "Show all bills including paid"

### Coding Suggestions Don't Match My Chart

**Issue**: Suggested GL codes don't exist in my accounting system
**Possible Causes:**
- Xero not connected (using generic accounts)
- Chart of accounts not synced recently
- Using custom account structure

**Solution:**
- Connect Xero for your actual chart of accounts
- Provide context: "Use account 6-0400 for software expenses"
- Consult your accountant for custom mappings

### Email Drafts Not Saving

**Issue**: "Failed to create email artefact"
**Possible Causes:**
- Database connection issue
- Invalid bill reference
- Missing required fields (recipient, subject, body)

**Solution:** Try regenerating or report the issue with artefact ID

### Risk Assessment Too Strict

**Issue**: Bills flagged as high-risk seem safe to pay
**Solution:** Risk scores are guidelines, not rules. If you know the supplier well and have verified the details, you can override the risk assessment. Document your reasoning for audit purposes.

## Quick Reference Card

| Task | Example Command |
|------|----------------|
| Validate supplier ABN | "Validate ABN 12 345 678 901" |
| Suggest bill coding | "Code a $500 office supplies bill from Officeworks" |
| Check for duplicates | "Is invoice INV-001 from Acme a duplicate?" |
| View bills awaiting approval | "Show bills awaiting approval" |
| Generate payment run | "Create payment run for bills due this week" |
| Assess payment risk | "Assess risk for bill INV-001" |
| Draft email to supplier | "Draft email requesting tax invoice for INV-001" |
| List overdue bills | "What bills are overdue?" |
| Find high-value bills | "Show bills over $5,000 awaiting approval" |

## Support & Feedback

### Getting Help
- In-app: Use the chat to ask "How do I [task]?"
- Documentation: Check `/docs/ap-agent-user-guide.md` (this file)
- GitHub Issues: [Report bugs or suggest features](https://github.com/anthropics/claude-code/issues)

### Feature Roadmap
The AP Agent is continuously improving. Planned enhancements include:
- Real-time ABN validation via ABR API integration
- Payment gateway integration (direct payment processing)
- Advanced approval workflow automation
- Supplier performance analytics
- Bulk email sending integration
- Custom coding rule engine

## Summary

The Accounts Payable Agent helps you manage supplier bills efficiently while maintaining GST compliance and financial control. Remember:

1. **Validate Suppliers**: Always check ABNs for new suppliers
2. **Code Accurately**: Use AI suggestions, verify with accountant
3. **Request Tax Invoices**: Required for GST credit claims
4. **Assess Risk**: Review high-risk bills before payment
5. **Use Xero Integration**: Real data improves accuracy
6. **Maintain Control**: You always approve and process payments
7. **Document Everything**: Keep records for ATO compliance
8. **Send Payment Advice**: Maintain good supplier relationships

The AP Agent is your assistant, not a replacement for financial oversight. Always review proposals, maintain authorization controls, and consult your accountant for complex scenarios.

---

**Remember**: The AP Agent generates proposals and recommendations but does not modify financial data. You maintain complete control over bill approval, payment processing, and supplier relationships.

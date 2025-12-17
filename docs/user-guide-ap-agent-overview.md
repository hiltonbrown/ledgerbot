# Accounts Payable Agent - Complete User Guide

## Overview

The Accounts Payable (AP) Agent at `/agents/ap` is LedgerBot's intelligent workspace for managing supplier bills, payments, and cash flow. It combines automated data extraction, risk detection, and payment scheduling to help you manage creditors efficiently and avoid fraud.

**Access**: Navigate to **Agents → Accounts Payable** from the main menu

## What the AP Agent Does

### Core Capabilities

1. **Bill Management**
   - Automatically extract data from supplier invoices (PDFs and images)
   - Sync bills from Xero or manage manually
   - Track bill status (draft, awaiting approval, approved, paid, overdue)
   - Detect duplicate bills before payment

2. **Risk Detection**
   - Identify high-risk bills (missing ABN, no approval, unusual amounts)
   - Track supplier bank account changes (fraud prevention)
   - Flag suppliers with unusual payment patterns
   - Risk scoring for every bill and supplier

3. **Payment Scheduling**
   - Generate payment run proposals based on due dates
   - Prioritize urgent payments
   - Review total payment amounts before processing
   - Export payment files for bank upload

4. **Supplier Intelligence**
   - Validate ABNs via Australian Business Register
   - Track payment terms and history
   - Monitor supplier status and risk levels
   - Automated supplier matching with Xero contacts

5. **Cash Flow Visibility**
   - Days Payable Outstanding (DPO) tracking
   - Ageing analysis (current, 1-30 days, 31-60 days, 60+ days)
   - Cash flow forecasting
   - Outstanding obligations summary

6. **Automation & AI**
   - Automatic account code suggestions
   - GST treatment recommendations
   - Generate payment advice emails
   - Intelligent bill coding based on descriptions

---

## Page Layout and Components

### 1. KPI Dashboard (Top Section)

Three key performance indicators displayed prominently:

**Total Outstanding**
- Total amount owed to all suppliers
- Overdue amount highlighted in red
- Updated in real-time as bills are paid

**Active Creditors**
- Number of suppliers you currently owe money to
- Count of overdue bills
- Quick indicator of supplier count

**Days Payable Outstanding (DPO)**
- Average number of days to pay bills
- Industry benchmark comparison
- Cash flow management indicator

**What this tells you**: At a glance, see your payment obligations, supplier count, and how quickly you pay bills.

---

### 2. Ageing Chart (Visual Analysis)

**What it shows**: Bar chart breaking down outstanding amounts by age bracket
- **Current**: Not yet due
- **1-30 Days**: Slightly overdue
- **31-60 Days**: Moderately overdue
- **60+ Days**: Significantly overdue

**How to use it**:
- Identify overdue payment buildup
- Prioritize which aged buckets need attention
- Track improvement month-over-month

---

### 3. Filter Tabs

Four filter views to focus on specific supplier groups:

**All**
- Complete list of all suppliers with outstanding bills
- Default view on page load

**High Risk**
- Suppliers flagged as high or critical risk
- Includes missing information, bank changes, unusual patterns
- Priority review required before payment

**Bank Changes**
- Suppliers who have recently changed bank details
- Critical fraud prevention filter
- Requires verification before payment

**Overdue**
- Suppliers with bills past due date
- Prioritize to maintain supplier relationships
- Avoid late payment fees

**Count badges**: Each tab shows the number of suppliers in that category.

---

### 4. Supplier/Creditor Table

Main data table with sortable columns:

| Column | Description | How to Use |
|--------|-------------|------------|
| **Supplier** | Business name | Click to view full details |
| **ABN** | Australian Business Number | Validates legitimacy |
| **Total Outstanding** | Amount currently owed | Sort to find largest obligations |
| **Overdue** | Amount past due date | Prioritize payments |
| **Bill Count** | Number of unpaid bills | Indicates relationship volume |
| **Risk Level** | Low/Medium/High/Critical | Review high-risk before payment |
| **Actions** | Quick action buttons | View details, schedule payment |

**Interactive features**:
- **Click supplier row**: Opens detailed side panel
- **Sort columns**: Click column header to sort ascending/descending
- **Risk badges**: Color-coded (green=low, yellow=medium, red=high, dark red=critical)

---

### 5. Action Buttons (Top Right)

**Sync from Xero**
- Fetches latest bills and supplier data from Xero
- Updates bill statuses, amounts, and payment information
- Shows sync summary (e.g., "Synced 45 suppliers and 23 bills")
- **When to use**: Daily or before payment runs

**Payment Schedule**
- Opens payment scheduling interface
- Propose payment runs for specific dates
- Review total amounts and risk summary
- Export payment files
- **When to use**: Weekly or monthly payment processing

---

## How the AP Agent Provides Information

### Data Sources

The AP Agent integrates data from multiple sources:

1. **Xero Integration** (if connected)
   - Supplier contact records
   - ACCPAY invoices (bills)
   - Payment history
   - Chart of accounts for coding
   - GST/tax rates

2. **Australian Business Register (ABR)**
   - ABN validation
   - Business entity information
   - GST registration status
   - Entity type verification

3. **LedgerBot Database**
   - Risk assessments
   - Bank account change tracking
   - Notes and commentary
   - Payment schedules
   - Communication history

4. **Document Uploads**
   - PDF invoices
   - Scanned images
   - Email attachments
   - Manual uploads

### Automated Processing

#### Invoice Data Extraction

When you upload an invoice (PDF or image):

1. **Vision AI Analysis**: AI model reads the document
2. **Field Extraction**:
   - Supplier name, ABN, address, contact details
   - Invoice number, date, due date, PO number
   - Subtotal, GST amount, total amount
   - All line items with descriptions, quantities, prices
   - Bank account details
   - Payment terms

3. **Validation**:
   - ABN format check (11 digits)
   - GST calculation verification (10% in Australia)
   - Total amount calculation check
   - Required field detection

4. **Warnings Generated**:
   - Missing ABN → manual verification required
   - Invalid email format → check supplier contact
   - GST mismatch → verify calculation
   - Missing line items → may need manual entry

**Confidence Score**: 0-1 rating of extraction accuracy based on image quality and data completeness.

---

#### Risk Assessment

Every bill undergoes automatic risk scoring:

**Risk Factors Analyzed**:

| Factor | Risk Points | Recommendation |
|--------|-------------|----------------|
| Missing ABN | +20 | Request ABN for GST compliance |
| No tax invoice | +15 | Request valid tax invoice |
| Missing approval | +30 | Obtain approval before payment |
| Inactive supplier | +25 | Verify supplier operational status |
| Blocked supplier | +50 | Investigate before payment |
| Unusual amount | +15 | Verify if >2x average bill |

**Risk Level Calculation**:
- **Low (0-19 points)**: No significant concerns
- **Medium (20-39 points)**: Review recommended
- **High (40-59 points)**: Manual review required
- **Critical (60+ points)**: Do not pay without investigation

**AI Commentary**: Natural language explanation of risk factors and recommended actions.

---

#### Duplicate Bill Detection

Before accepting a new bill, the system checks for potential duplicates:

**Matching Criteria**:
- Same supplier
- Similar amount (within tolerance)
- Similar date (within checking period, default 90 days)
- Same reference/invoice number

**Similarity Scoring**: Confidence level (0-1) that a bill is a duplicate

**Duplicate Handling**:
- Potential duplicates flagged for review
- Side-by-side comparison
- User confirmation required before creating

---

#### Bill Coding Suggestions

The AP Agent automatically suggests GL account codes and GST treatment:

**How It Works**:
1. Analyzes line item descriptions
2. Matches against common expense patterns
3. References your chart of accounts (from Xero)
4. Suggests account code, account name, and GST code

**Pattern Matching Examples**:

| Description Keywords | Suggested Account | GST Treatment | Confidence |
|---------------------|-------------------|---------------|-----------|
| "software", "subscription", "SaaS" | Software & Subscriptions | GST on Expenses | 85% |
| "rent", "lease" | Rent | GST-Free | 90% |
| "advertising", "marketing" | Marketing & Advertising | GST on Expenses | 88% |
| "stationery", "supplies" | Office Supplies | GST on Expenses | 82% |
| "professional fees", "consulting" | Professional Fees | GST on Expenses | 87% |

**Confidence Boosters**:
- Chart of accounts match: +10% confidence
- Historical coding patterns: +5-10% confidence
- Clear description keywords: Higher base confidence

**Review and Override**: All suggestions are presented for user review and can be manually overridden.

---

#### ABN Validation

When processing a bill with an ABN:

1. **Format Validation**: Checks for 11-digit structure
2. **ABR Lookup**: Queries Australian Business Register
3. **Entity Verification**: Confirms business exists and is active
4. **GST Status**: Checks if supplier is GST registered
5. **Name Matching**: Compares ABN entity name to supplier name

**Validation Results**:
```
✓ Valid ABN: 53 004 085 616
  Entity: Example Pty Ltd
  Type: Australian Private Company
  GST Registered: Yes
```

**Invalid Results**:
```
✗ Invalid ABN or not found
  Warning: Cannot verify supplier legitimacy
  Recommendation: Request correct ABN before payment
```

---

#### Payment Run Proposals

Generate optimized payment schedules:

**Proposal Logic**:
1. **Filter eligible bills**:
   - Due by proposed payment date
   - Approved status (if approval required)
   - Not disputed or on hold
   - Within maximum amount threshold (if set)

2. **Prioritize payments**:
   - Critical/urgent: Overdue + high risk of late fees
   - Due soon: Due within 7 days
   - Standard: Due within payment run period

3. **Risk Summary**:
   - Count of bills by risk level
   - Total amount breakdown
   - High-risk items flagged for manual review

4. **Recommendations**:
   - "All bills approved" or approval warnings
   - Risk flags that need attention
   - Total amount vs. normal range comparison

**Export Options**:
- CSV for manual processing
- ABA file for bank upload
- Payment advice emails

---

### Communication Tools

#### Email Draft Generation

Automated email templates for supplier communication:

**Purpose Types**:

1. **Follow-up**: Missing information, awaiting documentation
2. **Reminder**: Gentle nudge for required details
3. **Query**: Questions about invoice details
4. **Payment Advice**: Notification of scheduled payment

**Template Structure**:
```
To: supplier@example.com
Subject: [Purpose-specific subject line]

Dear [Supplier Name],

[Purpose-specific opening]

[Context provided by you]

[Purpose-specific closing]

Best regards,
[Your Name]
Accounts Payable Team
```

**Important**: Emails are **generated as drafts only**. The AP Agent **does not send emails**. You review, edit, and send via your email client.

---

## Working with Xero

### Xero Sync Process

When you click "Sync from Xero":

1. **Fetch Suppliers**: Retrieves all supplier contacts (SUPPLIER type in Xero)
2. **Fetch Bills**: Retrieves ACCPAY invoices (supplier bills)
3. **Fetch Payments**: Retrieves payment records
4. **Sync to Database**: Stores/updates in LedgerBot database
5. **Calculate Metrics**: Updates KPIs, ageing, and risk scores

**Sync Summary Example**:
```
✓ Synced 45 suppliers and 23 bills
  - 3 new suppliers added
  - 12 bills updated
  - 5 payment records synced
```

**Sync Frequency Recommendations**:
- **Daily**: If you process bills daily
- **Weekly**: For smaller volumes or weekly payment runs
- **Before payment runs**: Always sync before generating payment schedules
- **After Xero changes**: If you've made changes directly in Xero

---

### Xero-Specific Features

When connected to Xero, the AP Agent can:

**Read Operations** (data retrieval):
- List all supplier bills with filtering
- Get detailed bill information
- List suppliers with search
- Fetch chart of accounts for coding
- Get GST/tax rates
- List payment history

**Write Operations** (creating data):
- Create new supplier bills in Xero (draft status)
- Create new supplier contacts
- Attach invoices to bills (if supported)

**Workflow Integration**:
1. Upload invoice PDF → Extract data
2. Match supplier → Find or create Xero contact
3. Suggest coding → Reference Xero chart of accounts
4. Create bill → Save to Xero as DRAFT
5. User approves in Xero → Status syncs back to LedgerBot
6. Payment scheduled → Generate payment file
7. Payment processed in bank → Record in Xero → Sync to LedgerBot

---

## Data Models and Structure

### Supplier (ApContact)

**Stored Information**:
- Name, ABN, email, phone
- Status: active, inactive, pending, blocked
- Risk level: low, medium, high, critical
- Payment terms (e.g., "Net 30")
- Default expense account code
- Xero contact ID (if synced)

**Calculated Stats**:
- Total outstanding amount
- Total overdue amount
- Bill count
- Payment history
- Average bill amount
- Days since last payment

---

### Bill (ApBill)

**Core Fields**:
- Bill number, reference (PO number)
- Issue date, due date
- Subtotal, GST/tax amount, total amount
- Amount paid (for partially paid bills)
- Status: draft, awaiting_approval, approved, disputed, paid, overdue, cancelled
- Approval status: pending, approved, rejected, escalated, expired

**Line Items**:
- Description
- Account code and name
- Quantity, unit amount, line amount
- Tax type and amount

**Attachments**:
- Original invoice PDF/image URL
- Extracted data confidence score
- Warnings from extraction

---

### Risk Assessment (ApRiskAssessment)

**Assessment Data**:
- Risk level and score (0-100)
- Risk flags array (missing_abn, duplicate_bill, unusual_amount, etc.)
- Duplicate detection results
- Potential duplicate bills with similarity scores
- Recommendations array
- AI commentary (natural language explanation)

**Assessed At**: Timestamp of risk analysis

---

### Bank Change Tracking (ApBankChange)

**Change Record**:
- Old bank details (account name, BSB, account number)
- New bank details
- Detected at timestamp
- Verification status: verified/unverified
- Verification method: email, phone, written confirmation
- Verified by (user ID)
- Notes

**Fraud Prevention Workflow**:
1. System detects bank account change
2. Supplier flagged in "Bank Changes" filter
3. User verifies change via phone/email/letter
4. Mark as verified with verification method
5. Supplier cleared for payment with new details

---

### Payment Schedule (ApPaymentSchedule)

**Schedule Details**:
- Name (e.g., "Payment Run - 2025-02-15")
- Scheduled date
- Bill IDs included
- Total amount and bill count
- Status: draft, ready, processing, completed, failed
- Risk summary by level

**Bill Selection**:
- Items array with bill ID and amount
- Auto-selected based on due date
- Manual additions/removals supported

---

## Security and Compliance

### Data Protection

**Encrypted Storage**:
- Bank account details encrypted at rest
- Xero access tokens encrypted (AES-256-GCM)
- Secure document storage (Vercel Blob)

**Access Control**:
- User-specific data isolation
- No cross-user data visibility
- Xero connection per-user

**Audit Trail**:
- All actions logged with timestamps
- User attribution for approvals and changes
- Payment history tracking

---

### Australian Compliance

**GST Requirements**:
- Valid tax invoice requirement enforced
- ABN validation via ABR
- GST calculation verification (10%)
- GST-free items flagged (e.g., rent)

**Record Keeping**:
- 5-year document retention
- Original invoice storage
- Payment evidence
- Approval records

**BAS Integration**:
- Track GST paid for claiming on BAS
- GST reconciliation support
- Tax period reporting

---

## Best Practices

### Daily Operations

1. **Morning Review** (5 minutes):
   - Check KPI dashboard for overnight changes
   - Review "High Risk" filter for new flags
   - Verify "Bank Changes" filter for supplier updates

2. **Bill Processing** (as received):
   - Upload invoice immediately
   - Review extraction results and warnings
   - Verify ABN and coding suggestions
   - Obtain approval if required
   - Save/sync to Xero

3. **Weekly Tasks**:
   - Sync from Xero at start of week
   - Review "Overdue" filter
   - Schedule payment run for upcoming week
   - Generate and review payment proposal

4. **Monthly Tasks**:
   - Full sync and reconciliation
   - Review DPO trend
   - Analyze ageing chart changes
   - Update supplier risk levels

---

### Risk Management

**Always Verify**:
- ✓ Bank account changes (call supplier directly)
- ✓ Large or unusual amounts (confirm with supplier)
- ✓ New suppliers (validate ABN and credentials)
- ✓ Invoices without tax invoice format (request proper version)

**Red Flags to Investigate**:
- ✗ Supplier requests urgent payment to new account
- ✗ Email from unusual domain requesting payment
- ✗ Invoice with missing or invalid ABN
- ✗ Duplicate bill numbers for same supplier
- ✗ Round numbers (e.g., exactly $10,000) from unknown supplier

**Approval Thresholds**:
- Set approval limits (e.g., >$5,000 needs manager approval)
- Require dual approval for high-risk bills
- Document approval trail

---

### Payment Scheduling

**Optimal Payment Timing**:
- **Weekly runs**: Better cash flow control
- **Bi-weekly**: Good for smaller businesses
- **Monthly**: Standard for many businesses

**Payment Date Selection**:
- Align with cash inflows (after customer payment dates)
- Consider bank processing times (1-2 business days)
- Account for public holidays
- Batch payments to save bank fees

**Payment Run Checklist**:
1. Sync from Xero
2. Review "Overdue" filter first
3. Check "High Risk" filter for issues
4. Generate payment proposal
5. Review risk summary
6. Verify total amount against cash position
7. Export payment file
8. Process in bank
9. Record payments in Xero
10. Sync back to LedgerBot

---

## Troubleshooting

### Common Issues

**"Invoice extraction failed"**
- **Cause**: Poor image quality, unsupported format, file too large (>10MB)
- **Solution**: Re-scan at higher quality, convert to PDF, compress file

**"ABN validation failed"**
- **Cause**: Invalid ABN, ABR API unavailable, network issue
- **Solution**: Verify ABN manually at abr.business.gov.au, retry later

**"Duplicate bill detected"**
- **Cause**: Similar bill already exists in system
- **Solution**: Review potential duplicates, confirm if genuinely different, update reference number

**"Xero sync error"**
- **Cause**: Expired Xero connection, rate limit exceeded, network issue
- **Solution**: Reconnect Xero (Settings → Integrations), wait if rate limited, retry

**"Coding suggestion low confidence"**
- **Cause**: Vague description, no chart of accounts loaded, uncommon expense
- **Solution**: Review description for clarity, sync Xero chart, manually code and train for future

**"Risk level critical but bill looks valid"**
- **Cause**: Missing information (ABN, approval), unusual amount
- **Solution**: Add missing information, document unusual amount justification, override risk if appropriate

---

## Advanced Features

### Custom Risk Rules

Configure risk assessment thresholds:
- Auto-approval threshold (e.g., <$500)
- Require ABN (yes/no)
- GST validation strict/lenient
- Duplicate check lookback period (default 90 days)
- Default payment terms

### Batch Operations

Perform actions on multiple bills:
- Bulk approve
- Bulk schedule payment
- Bulk export
- Bulk categorization

### Reporting

Generate reports:
- Ageing summary by supplier
- Payment run history
- Risk assessment trends
- DPO over time
- Supplier payment terms compliance

---

## Related Documentation

- [Simple Daily Workflow Guide](./user-guide-ap-agent-simple.md) - Quick reference for daily use
- [CLAUDE.md](../CLAUDE.md) - Technical architecture reference
- [AP Schema Documentation](../lib/db/schema/ap.ts) - Database structure
- [Xero Integration Guide](./user-guide-xero-integration.md) - Xero connection setup

---

**Last Updated**: December 2025
**Version**: 1.0
**Agent Location**: `/agents/ap`

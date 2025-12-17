# Workflow 5: Expense Claim Processing

## Overview

LedgerBot's expense claim processing workflow reviews submitted expense receipts, extracts merchant details and amounts, verifies against company policy, assigns correct GST treatment and account codes, and creates draft expense claims in Xero requiring only final approval.

This workflow eliminates manual expense report compilation, ensures policy compliance, and speeds up employee reimbursement while maintaining accurate expense tracking.

## How It Works

1. **Receipt Upload**: Employees or admins upload expense receipts (photos, PDFs, or scanned images)
2. **Data Extraction**: LedgerBot extracts merchant name, date, amount, GST, and line items from receipts
3. **Policy Verification**: Checks expenses against company policy rules (spending limits, allowed categories, etc.)
4. **Smart Coding**: Assigns appropriate expense account codes based on merchant type and expense category
5. **GST Treatment**: Correctly identifies GST-registered merchants and calculates claimable GST
6. **Claim Creation**: Creates draft expense claims in Xero for review and approval

## Prerequisites

- Active Xero connection established
- Expense receipts uploaded as images or PDFs
- Optional: Company expense policy documented for LedgerBot to reference

## Step-by-Step Guide

### 1. Upload Receipts

Provide expense receipts to LedgerBot:
- Upload individual receipt images during chat
- Batch upload multiple receipts as context files
- Forward receipt emails to LedgerBot (if configured)

### 2. Request Processing

Use one of the example prompts to initiate expense processing. Specify the employee if processing on behalf of team members.

### 3. Review Extracted Data

LedgerBot presents:
- Merchant name and ABN (with validation)
- Date and amount (including GST breakdown)
- Suggested expense category and account code
- Policy compliance check results
- Any issues or anomalies detected

### 4. Handle Exceptions

For receipts that need attention:
- Missing or invalid GST details
- Expenses exceeding policy limits
- Unclear merchant or expense category
- Personal expenses mixed with business expenses

### 5. Approve and Submit

Once reviewed, approve the expense claim for:
- Creation in Xero as draft expense claim
- Submission for manager approval
- Processing for employee reimbursement

## Example Prompts

### Prompt 1: Single Receipt Processing
```
I have a receipt from Officeworks for $127.50 including GST. This was for
office supplies. Can you extract the details, verify the GST, code it to
the appropriate expense account, and create an expense claim in Xero?
```

### Prompt 2: Batch Receipt Processing
```
I've uploaded 8 expense receipts from my business trip to Melbourne last week.
Please process all of them, categorise as either accommodation, meals, travel,
or other expenses, assign correct account codes, and create an expense claim.
Flag any receipts that don't show GST.
```

### Prompt 3: Employee Expense Submission
```
Process these expense receipts for Sarah Chen (employee). They're from her
client meeting trip on 15th March: lunch at $85, taxi fares totalling $47,
and parking at $22. Create the expense claim in her name and check our
entertainment expense policy for the meal.
```

### Prompt 4: Policy Compliance Check
```
I have expense receipts totalling $850. Before creating the expense claim,
verify these against our company policy: (1) single meal limit $50 per person,
(2) accommodation max $200/night, (3) taxi only when no public transport
available. Flag any policy breaches.
```

### Prompt 5: International Expense with Conversion
```
Process this receipt from my US business trip. It's a hotel charge for
USD $285 including taxes. Convert to AUD using the exchange rate on the
transaction date (15 December 2024), code as International Travel -
Accommodation, and create the expense claim.
```

## Tips and Best Practices

### Improve Receipt Quality
- Take clear, well-lit photos of receipts
- Ensure all text is readable, especially ABN and GST details
- Capture the full receipt including header and footer
- For thermal receipts, photograph immediately (they fade over time)

### GST Claims
- Only claim GST on receipts showing valid ABN and "Tax Invoice" notation
- Receipts under $82.50 (inc GST) don't require full tax invoice for GST credit
- For receipts over $82.50, ensure ABN is visible
- LedgerBot can verify ABN validity using ABR lookup

### Expense Categories

**Common Categories and Account Codes:**
- **Meals & Entertainment** (420): Client meals, team functions
- **Motor Vehicle** (445): Fuel, parking, tolls
- **Travel - Accommodation** (485): Hotels, serviced apartments
- **Travel - Airfares** (486): Flights, baggage fees
- **Office Supplies** (461): Stationery, supplies
- **Technology** (491): Software, hardware, subscriptions
- **Professional Development** (476): Training, courses, books

Ask LedgerBot: "What account code should I use for X expense?"

### Policy Compliance
Define your expense policy clearly:
```
Our expense policy is: (1) meals limited to $50 per person unless entertaining
clients, (2) accommodation capped at $180 per night in capital cities,
(3) business class flights only approved for international travel over 5 hours,
(4) alcohol only claimable when entertaining clients. Apply these rules when
processing expenses.
```

### Handle Common Scenarios

**Missing Receipt**: "Create an expense claim for $35 taxi fare on 20 March - receipt was lost. Mark as non-GST claimable due to missing tax invoice"

**Split Personal/Business**: "This hotel bill for $450 includes $320 for business stay and $130 for personal extension. Create expense claim for business portion only"

**Entertainment 50% Rule**: "This restaurant bill for $240 was a client entertainment meal. Code to Meals & Entertainment and note that only 50% is tax deductible for FBT purposes"

**Advance Received**: "I received a $500 travel advance for this trip. Create the expense claim for $687 in actual expenses, showing a net reimbursement due of $187"

## Common Questions

**Q: Can LedgerBot read handwritten receipts?**
A: LedgerBot can attempt to extract data from clear handwriting, but printed receipts are more accurate. For handwritten receipts, verify the extracted amounts.

**Q: What if the merchant ABN isn't showing on the receipt?**
A: LedgerBot can look up the ABN using the business name and location. If not found, you can manually provide it or mark as non-GST claimable.

**Q: How does LedgerBot handle fuel receipts?**
A: Fuel receipts are automatically categorised as Motor Vehicle expenses. LedgerBot can also track whether this is for a company vehicle or personal vehicle used for business.

**Q: Can I create expense claims for contractors or suppliers?**
A: This workflow is designed for employee expenses. For supplier bills, use **Workflow 1: Automated Invoice Processing**.

**Q: What about mileage claims without receipts?**
A: For mileage reimbursements, provide the details: "Create mileage claim for 145km business travel on 18 March at $0.85/km ATO rate"

## Related Workflows

- **Workflow 1**: Automated Invoice Processing (for supplier bills, not employee expenses)
- **Workflow 8**: Month-End Procedures (review expense accruals)
- **Workflow 9**: GST/BAS Preparation (ensure GST correctly claimed on expenses)
- **Workflow 10**: Intelligent Document Filing (attach receipts to expense claims)

## Advanced Usage

### Bulk Employee Expense Processing
```
I have expense receipts from 5 different employees from our company conference.
Sort them by employee, process each person's receipts, and create individual
expense claims for each employee. Total expenses are around $3,200.
```

### Recurring Expense Setup
```
I pay for Adobe Creative Cloud subscription monthly at $76.99. Set this up
as a recurring expense claim coded to Software Subscriptions (account 491).
The receipt arrives via email on the 15th of each month.
```

### Expense Report Generation
```
Generate an expense report for all expense claims submitted in Q1 2024.
Group by expense category, show totals by employee, and calculate total
GST claimed. Compare to Q4 2023 to show any significant increases.
```

### Policy Violation Report
```
Review all expense claims from the past month and identify any that exceeded
policy limits or raised compliance concerns. Show me which employees had
issues and what the violations were.
```

### Mileage Tracking
```
Create a mileage log for the quarter showing all business travel by vehicle.
Calculate total kilometres, total reimbursement at ATO rate, and track trips
by purpose (client visits, site inspections, business meetings, etc.).
```

## Policy Template

Here's a template you can provide to LedgerBot for expense policy enforcement:

```
Expense Policy Rules:
1. Meals: Max $50 per person (business meals), $25 per person (solo meals)
2. Client Entertainment: Max $100 per person, requires manager pre-approval for >$500 total
3. Accommodation: Max $180/night metro, $140/night regional
4. Travel: Economy class domestic, business class international >5 hours
5. Ground Transport: Taxi/rideshare when public transport not practical
6. Alcohol: Only with client entertainment, max 50% of meal cost
7. Receipt Required: All expenses over $82.50 must have valid tax invoice for GST claim
8. Approval: All expenses >$500 require manager pre-approval
9. Timing: Submit within 30 days of expense date
10. Documentation: Require business purpose note for all client entertainment
```

## Technical Notes

This workflow uses LedgerBot's Document Processing agent with OCR capabilities for receipt data extraction. ABN validation uses the ABR integration for accurate GST verification.

For technical implementation details, developers can refer to:
- `app/agents/docmanagement/` - Document processing agent
- `lib/abr/` - ABN lookup and validation
- `lib/ai/tools/xero-tools.ts` - Xero expense claim creation tools
- Receipt OCR uses Vercel AI SDK vision capabilities

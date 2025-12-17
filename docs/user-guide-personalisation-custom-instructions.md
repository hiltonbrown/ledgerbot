# Custom Instructions - Detailed Guide

## Overview

Custom Instructions allow you to extend LedgerBot's base prompts with your own specific requirements, preferences, and business rules. These instructions are combined with LedgerBot's foundational prompts to create AI responses tailored to your exact needs.

## Three Types of Custom Instructions

LedgerBot supports three separate instruction sets for different contexts:

1. **Custom System Instructions**: General behavior and responses
2. **Custom Code Instructions**: Python code generation
3. **Custom Spreadsheet Instructions**: CSV spreadsheet creation

Each has a 400-character limit and is sanitized for security.

---

## 1. Custom System Instructions

**What it does**: Adds your specific preferences to LedgerBot's general accounting and chat behavior.

**Character limit**: 400 characters

**Applied to**: All general chat responses (not code or spreadsheet artifacts)

**Base prompt overview** (read-only):
> "The base system prompt defines LedgerBot as an expert accounting assistant for Australian businesses. It includes comprehensive accounting capabilities, GST/BAS compliance knowledge, Australian terminology, and best practices for bookkeeping and tax compliance."

Your custom instructions are *appended* to this base prompt, not replacing it.

---

### What to Include in System Instructions

**Working preferences**:
```
"Always show GST-inclusive and GST-exclusive amounts separately.
Prefer monthly reporting summaries unless otherwise specified.
Flag any transactions over $10,000 for my review."
```

**Terminology preferences**:
```
"Use 'debtors' and 'creditors' instead of 'accounts receivable' and
'accounts payable'. Refer to our clients as 'customers' not 'clients'."
```

**Business-specific rules**:
```
"Our payment terms are strictly NET 30. When discussing invoices,
always reference our late payment fee policy (2% per month on overdue amounts)."
```

**Compliance reminders**:
```
"Always remind me to check FBT implications for employee benefits.
Our business is registered for quarterly BAS reporting."
```

**Response structure preferences**:
```
"When providing financial advice, always include: 1) recommendation,
2) tax implications, 3) action steps. Keep summaries under 3 bullet points."
```

---

### Examples by Business Type

#### Retail Business
```
"We operate 3 retail locations. When coding stock purchases, always ask which
location. Remind me weekly about stock take requirements. Flag any inventory
variances over 5%."
```

#### Professional Services Firm
```
"We bill by the hour with 6-minute increments. When discussing revenue,
assume all work is recorded in time sheets. Remind me about WIP adjustment
at month-end."
```

#### Construction/Trades
```
"We use progress billing for projects. Always consider retention amounts
(10% held for 90 days). Remind me about variation claims when discussing
project revenue."
```

#### E-commerce Business
```
"All sales are online. Shipping is a separate line item on invoices.
When analyzing revenue, break down by product category. Remind me about
digital service delivery compliance."
```

#### Hospitality
```
"We process cash and card payments daily. Always ask about cash reconciliation
for end-of-day procedures. Remind me about staff meal deductions and tips
reporting for payroll."
```

---

### Example: Before and After

**Without Custom System Instructions**:
```
User: "How should I handle this supplier invoice?"
LedgerBot: "Code the supplier invoice to the appropriate expense account
based on what was purchased, and record the amount in accounts payable."
```

**With Custom System Instructions**:
```
Custom Instruction: "Always show GST breakdown. Our payment terms are NET 30.
Flag invoices over $10,000 for review."

User: "How should I handle this supplier invoice for $12,500?"
LedgerBot: "Here's how to process this invoice:

⚠️ FLAGGED: Amount exceeds $10,000 threshold - requires your review

GST Breakdown:
• GST-exclusive: $11,363.64
• GST: $1,136.36
• GST-inclusive: $12,500.00

Coding:
• Account: [Appropriate expense account based on invoice details]
• GST Code: GST on Expenses
• Due date: [Invoice date + 30 days] (NET 30 terms)

Record in Accounts Payable (3000) for payment tracking."
```

---

### Common Patterns

**Risk management**:
```
"Flag any unusual transactions: amounts >$X, new suppliers, weekend transactions,
round-number invoices."
```

**Workflow integration**:
```
"Remind me to update the project tracker when coding job-related expenses.
Always reference job codes from our system."
```

**Multi-entity handling**:
```
"We operate 2 separate entities: Acme Trading (retail) and Acme Services
(consulting). Always ask which entity before providing account codes."
```

**Seasonal considerations**:
```
"Our busy season is Nov-Jan. During this period, remind me about weekly cash
flow checks. EOFY is 30 June - start mentioning year-end tasks from May onwards."
```

**Staff roles**:
```
"I'm the business owner but not the day-to-day bookkeeper. Frame advice
assuming I'll delegate technical entry to my bookkeeper Sarah."
```

---

## 2. Custom Code Instructions

**What it does**: Extends the base code generation prompt with your specific coding preferences.

**Character limit**: 400 characters

**Applied to**: Python code artifacts created by LedgerBot

**Base prompt overview** (read-only):
> "The base code prompt defines LedgerBot as a Python code generator that creates self-contained, executable code snippets. It includes guidelines for clean code, proper error handling, and meaningful outputs without external dependencies."

---

### What to Include in Code Instructions

**Coding style**:
```
"Use type hints for all function parameters. Prefer list comprehensions over
loops where readable. Add docstrings to all functions."
```

**Libraries**:
```
"Prefer pandas for data manipulation. Use decimal module for financial calculations.
Avoid numpy unless specifically needed."
```

**Output format**:
```
"Always print results in formatted tables. Include currency symbols ($) for
dollar amounts. Show percentages with 2 decimal places."
```

**Error handling**:
```
"Validate all financial inputs (no negative amounts for invoices, dates must be
valid). Raise ValueError with descriptive messages on invalid input."
```

**Business logic**:
```
"GST is always 10%. Our financial year ends 30 June. Default currency is AUD.
Round all currency to 2 decimal places."
```

---

### Examples

#### Accounting Focus
```
"Use Decimal for all currency calculations. Include GST calculations in financial
functions. Round currency to 2dp, percentages to 2dp. Add comments explaining
accounting logic."
```

#### Data Analysis
```
"Output results as formatted tables using pandas. Include summary statistics
(mean, median, std dev). Generate simple matplotlib charts where helpful.
Use Australian date format DD/MM/YYYY."
```

#### Automation Scripts
```
"Code should be production-ready with error handling. Log all actions to stdout.
Use pathlib for file operations. Include usage examples in docstrings."
```

---

### Example: Impact on Code Generation

**Without Custom Code Instructions**:
```
User: "Write code to calculate invoice total with GST"

LedgerBot generates:
```python
def calculate_total(amount, gst_rate):
    gst = amount * gst_rate
    total = amount + gst
    return total

result = calculate_total(100, 0.1)
print(result)  # 110.0
```
```

**With Custom Code Instructions**:
```
Custom Instruction: "Use Decimal for currency. Always add docstrings. Include
type hints. GST is always 10%. Show GST breakdown in output."

User: "Write code to calculate invoice total with GST"

LedgerBot generates:
```python
from decimal import Decimal

def calculate_invoice_total(amount_ex_gst: Decimal) -> dict:
    """
    Calculate invoice total including 10% GST (Australian standard).

    Args:
        amount_ex_gst: Invoice amount excluding GST

    Returns:
        dict with 'ex_gst', 'gst', and 'total' amounts
    """
    GST_RATE = Decimal('0.10')

    gst_amount = amount_ex_gst * GST_RATE
    total = amount_ex_gst + gst_amount

    return {
        'ex_gst': amount_ex_gst,
        'gst': gst_amount,
        'total': total
    }

# Example usage
result = calculate_invoice_total(Decimal('100.00'))
print(f"Amount (ex GST): ${result['ex_gst']:.2f}")
print(f"GST (10%):       ${result['gst']:.2f}")
print(f"Total:           ${result['total']:.2f}")

# Output:
# Amount (ex GST): $100.00
# GST (10%):       $10.00
# Total:           $110.00
```
```

---

## 3. Custom Spreadsheet Instructions

**What it does**: Extends the base spreadsheet generation prompt with your formatting preferences.

**Character limit**: 400 characters

**Applied to**: CSV spreadsheet artifacts created by LedgerBot

**Base prompt overview** (read-only):
> "The base spreadsheet prompt defines how LedgerBot creates CSV spreadsheets with meaningful column headers, realistic data, and proper formatting for business and accounting use cases."

---

### What to Include in Spreadsheet Instructions

**Column preferences**:
```
"Always include: Date, Description, Amount (Ex GST), GST, Total. Use
DD/MM/YYYY date format. Add a Reference column for invoice numbers."
```

**Formatting**:
```
"Currency columns should have 2 decimal places with no dollar signs (Excel will
format). Use Australian date format. Include header row with clear labels."
```

**Data structure**:
```
"Sort by date descending (newest first). Include subtotals for each month.
Add a summary row at the bottom with totals."
```

**Specific columns**:
```
"For customer lists: always include ABN/ACN column. For transactions: include
Account Code and GST Code columns."
```

**Business rules**:
```
"Payment terms default to NET 30. Due date is always invoice date + 30 days.
Flag overdue amounts (due date < today) with 'OVERDUE' in status column."
```

---

### Examples by Use Case

#### Invoice Register
```
"Columns: Invoice Date, Invoice Number, Customer, Amount Ex GST, GST, Total,
Due Date, Status. Sort newest first. Include subtotals by month. Use DD/MM/YYYY
dates."
```

#### Expense Tracking
```
"Columns: Date, Supplier, Description, Category, Amount Ex GST, GST, Total,
Account Code. Group by category with subtotals. Add variance column if budget
provided."
```

#### Client List
```
"Columns: Client Name, ABN, Contact Email, Phone, Outstanding Balance, Last
Invoice Date, Payment Terms. Sort alphabetically. Flag clients with overdue
amounts."
```

#### Payroll Summary
```
"Columns: Employee, Gross Pay, Tax Withheld, Super, Net Pay, Pay Period.
Include YTD totals row. Add Super Guarantee rate column (11.5% for 2025)."
```

---

### Example: Impact on Spreadsheet Generation

**Without Custom Spreadsheet Instructions**:
```
User: "Create a spreadsheet of outstanding invoices"

LedgerBot generates CSV:
Date,Customer,Amount,Status
2025-01-15,ABC Corp,1100.00,Unpaid
2025-01-10,XYZ Ltd,2200.00,Unpaid
```

**With Custom Spreadsheet Instructions**:
```
Custom Instruction: "Always include: Invoice Number, Amount Ex GST, GST, Total,
Due Date, Days Overdue. Use DD/MM/YYYY format. Sort by due date. Flag overdue."

User: "Create a spreadsheet of outstanding invoices"

LedgerBot generates CSV:
Invoice Date,Invoice Number,Customer,Amount Ex GST,GST,Total,Due Date,Days Overdue,Status
10/01/2025,INV-0042,XYZ Ltd,2000.00,200.00,2200.00,09/02/2025,25,OVERDUE
15/01/2025,INV-0043,ABC Corp,1000.00,100.00,1100.00,14/02/2025,3,OVERDUE
20/01/2025,INV-0044,DEF Pty,500.00,50.00,550.00,19/02/2025,0,DUE
```

---

## Writing Effective Custom Instructions

### Do's ✓

**Be specific**:
```
✓ "Always show GST-inclusive and exclusive amounts separately"
✗ "Show GST properly"
```

**Use examples**:
```
✓ "Payment terms are NET 30 (invoice date + 30 days)"
✗ "Use our payment terms"
```

**Focus on what's unique to your business**:
```
✓ "We use 6-minute billing increments for professional services"
✗ "We're a professional services firm" (covered in Industry Context)
```

**Include specific thresholds**:
```
✓ "Flag transactions over $10,000 for review"
✗ "Flag large transactions"
```

**Mention regular exceptions**:
```
✓ "Staff meals are 50% deductible, code to 6150 with notation"
✗ "Handle staff meals correctly"
```

---

### Don'ts ✗

**Don't repeat base prompt information**:
```
✗ "You are an accounting assistant" (already in base prompt)
✓ Focus on YOUR specific requirements
```

**Don't exceed character limits**:
```
✗ Long paragraphs explaining general accounting
✓ Concise, specific instructions (400 char max per field)
```

**Don't include sensitive data**:
```
✗ "Our bank account is 123-456-789012"
✓ "We bank with Commonwealth Bank" (if relevant for context)
```

**Don't contradict base prompts**:
```
✗ "Ignore Australian accounting standards"
✓ Work with base prompts, extend them
```

**Don't use jargon without context**:
```
✗ "Always apply Rule 47B"
✓ "Always apply our inventory variance policy: flag differences >5%"
```

---

## Layering Instructions

Custom Instructions work **in combination** with other settings:

### Example: Full Personalization Stack

**Business Information**:
- Country: Australia
- Industry: "Retail office supplies, 3 locations, $2M turnover"
- Chart of Accounts: [Full chart including account 6150 - Staff Amenities]

**AI Preferences**:
- Model: Claude Sonnet 4.5
- Tone: Professional

**Custom System Instructions**:
```
"Flag invoices >$10,000. Always show GST breakdown. Payment terms NET 30.
Remind me about stock take monthly. Staff amenities are 50% deductible."
```

**Result**: AI understands:
1. You're in Australia (GST, ATO rules)
2. You're in retail (stock management matters)
3. Your specific rules (flagging thresholds, payment terms)
4. Your communication preference (professional tone)
5. Your account structure (can reference 6150 specifically)

All these layers combine to produce highly contextual, relevant responses.

---

## Testing Your Instructions

### 1. Make a Small Change
Start with one instruction, not ten. Test it before adding more.

### 2. Test with a Question
Ask LedgerBot something that should trigger your instruction:
```
Custom Instruction: "Always show GST breakdown"
Test: "How should I code this $1,100 invoice?"
Expected: Response includes "Ex GST: $1,000, GST: $100, Total: $1,100"
```

### 3. Verify in Different Scenarios
Make sure your instruction applies correctly across various questions.

### 4. Check for Conflicts
Ensure your instructions don't contradict each other or base prompts.

### 5. Refine Based on Results
Adjust wording if AI interprets differently than intended.

---

## Common Use Cases

### Multi-Entity Businesses
```
System: "We operate 2 entities: Acme Trading Pty Ltd (retail) and Acme
Consulting Pty Ltd (services). Always ask which entity before providing
account codes or tax advice."
```

### Industry-Specific Rules
```
System: "Construction industry: Always consider retention amounts (10% held
for defects liability period, 90 days). Remind about progress claims and
variation documentation."
```

### Compliance Requirements
```
System: "We're registered for monthly BAS. Remind me about FBT on employee
benefits. All international transactions require foreign exchange documentation."
```

### Team Collaboration
```
System: "I'm the CFO - frame technical bookkeeping tasks for delegation to
our bookkeeper Sarah. Flag anything requiring senior accountant review."
```

### Quality Control
```
System: "Flag: rounded amounts (potential estimates), weekend transactions,
duplicate invoice numbers, missing reference fields, GST-free sales >$1000."
```

---

## Character Limit Strategies

With only 400 characters, prioritize:

### Priority 1: Business-Critical Rules
```
"Payment terms NET 30. Flag >$10k. GST breakdown always."
```

### Priority 2: Common Exceptions
```
"Staff meals 50% deductible to 6150."
```

### Priority 3: Workflow Preferences
```
"Monthly stock take reminder."
```

**Tip**: Use abbreviations carefully:
- ✓ "Ex GST" (widely understood)
- ✓ "NET 30" (standard payment term)
- ✗ Internal jargon (may confuse AI)

---

## Security and Sanitization

LedgerBot automatically sanitizes custom instructions to prevent:

**Prompt injection attacks**:
- Phrases like "ignore previous instructions" are stripped
- Template characters `{}` and `<>` are removed

**Token explosion**:
- 400-character hard limit enforced
- Prevents excessive token usage

**Malicious content**:
- Harmful instructions are flagged and rejected

You can write freely - the system protects against security issues.

---

## Troubleshooting

### "My instruction isn't being followed"
- Check for typos or ambiguous phrasing
- Make the instruction more specific
- Test with a direct question that should trigger it
- Verify instruction was saved (check for success toast)

### "Character limit too restrictive"
- Prioritize most important rules
- Use concise phrasing
- Consider moving context to Industry Description field (200 chars)
- Combine related instructions: "X and Y" vs separate sentences

### "Instructions conflict with each other"
- Review all three instruction types (System, Code, Spreadsheet)
- Ensure they complement, not contradict
- Remove redundant instructions

### "Code/Spreadsheet instructions not applying"
- These only apply to **artifact creation** (code/spreadsheet documents)
- Regular chat uses System Instructions only
- Verify you're creating the right artifact type

---

## Best Practices Summary

1. **Start Simple**: Add one instruction at a time
2. **Be Specific**: Exact thresholds, formats, requirements
3. **Test Thoroughly**: Verify instructions work as intended
4. **Keep Current**: Update when business rules change
5. **Layer Effectively**: Use with Business Info and AI Preferences for full effect
6. **Prioritize**: Most critical rules first (400 char limit)
7. **Document Elsewhere**: Keep full procedure docs outside of instructions, reference them
8. **Review Regularly**: Quarterly review to ensure still relevant

---

**Next**: [Chat Suggestions Guide →](./user-guide-personalisation-chat-suggestions.md)

# Ledgerbot System Prompts - Implementation Guide

## Overview

This guide covers the three complementary system prompts for your Ledgerbot accounting assistant:

1. **Generic Ledgerbot System Prompt** - Core accounting assistant functionality
2. **Spreadsheet Artifact System Prompt** - Excel file generation capabilities
3. **Code Generation System Prompt** - Python scripts and automation tools

## System Architecture

```
┌─────────────────────────────────────────────────────┐
│         Generic Ledgerbot System Prompt             │
│  (Core accounting, transaction recording, BAS)      │
│                                                      │
│  Handles:                                           │
│  • Transaction recording and management             │
│  • GST calculations and BAS reporting              │
│  • Account classification                           │
│  • Bank reconciliation                             │
│  • General accounting queries                       │
│  • Financial analysis and insights                  │
└───────────────┬──────────────────┬──────────────────┘
                │                  │
                │                  │ Triggers code generation when:
                │                  │ • User requests script/automation
                │                  │ • API integration needed
                │                  │ • Custom tool required
                │                  │ • Data processing pipeline needed
                │                  │
                │                  ▼
                │     ┌────────────────────────────────┐
                │     │  Code Generation System Prompt  │
                │     │   (Python scripts & tools)      │
                │     │                                 │
                │     │  Handles:                       │
                │     │  • Data import/export scripts   │
                │     │  • API integrations (Xero/MYOB) │
                │     │  • BAS calculation utilities    │
                │     │  • Automation workflows         │
                │     │  • Custom financial calculators │
                │     │  • Database operations          │
                │     └─────────────────────────────────┘
                │
                │ Triggers spreadsheet creation when:
                │ • User requests report/file
                │ • Export to Excel needed
                │ • Formatted output required
                │
                ▼
┌──────────────────────────────────────────────────────┐
│      Spreadsheet Artifact System Prompt              │
│   (Excel file generation and formatting)             │
│                                                       │
│  Handles:                                            │
│  • P&L statements in Excel                          │
│  • Balance sheets in Excel                          │
│  • BAS worksheets in Excel                          │
│  • Trial balances in Excel                          │
│  • Ageing reports in Excel                          │
│  • General ledgers in Excel                         │
│  • Professional formatting and formulas              │
└──────────────────────────────────────────────────────┘
```

## File Locations

```
/ledgerbot/
├── prompts/
│   ├── ledgerbot-system-prompt-generic.md          # Core system prompt
│   ├── ledgerbot-spreadsheet-artifact-prompt.md    # Spreadsheet creation prompt
│   └── ledgerbot-code-generation-prompt.md         # Code generation prompt
└── industry-modules/
    ├── [industry]-context.md                       # Industry-specific additions
    └── [industry]-chart-of-accounts.md            # Industry-specific COA
```

## Implementation Steps

### Step 1: Set Up Generic System Prompt

The generic prompt includes two placeholder sections:

```markdown
<industry_specific_context>
{{INDUSTRY_CONTEXT}}
</industry_specific_context>

<chart_of_accounts>
{{CHART_OF_ACCOUNTS}}
</chart_of_accounts>
```

**For your waste management business, populate these with:**

**Industry Context Example:**
```markdown
<industry_specific_context>
**Business Type:** Waste Management and Recycling Services
**Operating Entities:**
- DestroyR Document Shredding (secure document destruction)
- Crown Waste Solutions (commercial waste collection)
- Citizen Blue Depot (recycling depot operations)

**Industry-Specific Considerations:**
- Revenue recognition for ongoing service contracts
- Tracking of tonnage/volume metrics
- Equipment depreciation schedules
- Environmental compliance requirements
- Council and government contract revenue
- Tipping fees and disposal costs
- Fuel surcharge calculations

**Common Transaction Types:**
- Regular service route revenue
- One-off collection fees
- Tipping fees and landfill charges
- Equipment hire and maintenance
- Fuel and vehicle operating costs
- Insurance (public liability, professional indemnity)
- Environmental compliance costs

**Reporting Requirements:**
- Monthly tonnage reports by waste stream
- Contract revenue analysis
- Fleet operating cost analysis
- Environmental compliance documentation
</industry_specific_context>
```

**Chart of Accounts Example:**
```markdown
<chart_of_accounts>
## Revenue Accounts (400-499)
400 - Service Revenue - Document Shredding
410 - Service Revenue - Waste Collection
420 - Service Revenue - Recycling Operations
430 - Equipment Hire Revenue
440 - One-off Collection Fees
450 - Government Grants
490 - Other Revenue

## Cost of Sales (500-599)
500 - Tipping Fees
510 - Disposal Costs
520 - Recycling Processing Costs
530 - Fuel - Fleet Operations
540 - Direct Labour - Collection Crews

## Operating Expenses (600-799)
### Vehicle & Equipment (600-629)
600 - Vehicle Repairs & Maintenance
610 - Equipment Repairs & Maintenance
620 - Vehicle Registration & Insurance
625 - Equipment Depreciation

### Facility Costs (630-649)
630 - Rent - Depot/Warehouse
640 - Utilities - Electricity
641 - Utilities - Water
642 - Utilities - Gas/LPG
645 - Property Insurance

### Employee Costs (650-679)
650 - Wages & Salaries
660 - Superannuation
665 - Workers Compensation Insurance
670 - Employee Training & Development

### Administrative (680-729)
680 - Professional Fees - Accounting
681 - Professional Fees - Legal
690 - Insurance - Public Liability
691 - Insurance - Professional Indemnity
700 - Office Supplies
710 - IT & Software Subscriptions
720 - Bank Fees & Charges

### Marketing & Business Development (730-749)
730 - Advertising & Marketing
740 - Website & Digital Marketing

### Other Operating Expenses (750-799)
750 - Environmental Compliance Costs
760 - Licensing & Permits
770 - Telecommunications
780 - Subscriptions & Memberships
799 - Sundry Expenses

## Asset Accounts (100-199)
### Current Assets (100-149)
100 - Business Cheque Account
110 - Business Savings Account
120 - Petty Cash
130 - Accounts Receivable
140 - GST Paid
145 - Prepayments

### Non-Current Assets (150-199)
150 - Plant & Equipment
151 - Accumulated Depreciation - P&E
160 - Motor Vehicles - Trucks
161 - Accumulated Depreciation - Trucks
170 - Motor Vehicles - Light Vehicles
171 - Accumulated Depreciation - Light Vehicles
180 - Shredding Equipment
181 - Accumulated Depreciation - Shredding Equip

## Liability Accounts (200-299)
### Current Liabilities (200-249)
200 - Accounts Payable
210 - GST Collected
220 - GST Payable/(Refundable)
230 - PAYG Withholding Payable
240 - Superannuation Payable
245 - Credit Card

### Non-Current Liabilities (250-299)
250 - Equipment Finance - Trucks
260 - Equipment Finance - Other
270 - Business Loan

## Equity Accounts (300-399)
300 - Owner's Equity
310 - Retained Earnings
320 - Current Year Earnings
</chart_of_accounts>
```

### Step 2: Configure Spreadsheet Artifact Prompt

The spreadsheet prompt works alongside the generic prompt. No modifications needed - it's ready to use.

**Trigger Phrases for Spreadsheet Creation:**
- "Create a P&L statement"
- "Generate a balance sheet"
- "Prepare a BAS worksheet"
- "Export to Excel"
- "Make a spreadsheet showing..."
- "Create an ageing report"
- "Generate a trial balance"

### Step 3: Integration with Your Codebase

In your ledgerbot application, implement prompt switching:

```javascript
// Pseudo-code example
const basePrompt = loadPrompt('ledgerbot-system-prompt-generic.md');
const spreadsheetPrompt = loadPrompt('ledgerbot-spreadsheet-artifact-prompt.md');
const codeGenPrompt = loadPrompt('ledgerbot-code-generation-prompt.md');

// Replace placeholders in base prompt
const contextualizedPrompt = basePrompt
  .replace('{{INDUSTRY_CONTEXT}}', loadIndustryContext('waste-management'))
  .replace('{{CHART_OF_ACCOUNTS}}', loadChartOfAccounts('waste-management'));

// Determine which prompt to use based on intent
function getSystemPrompt(userMessage) {
  const spreadsheetTriggers = [
    'create spreadsheet', 'generate report', 'export to excel',
    'make a spreadsheet', 'create a file', 'download', 
    'balance sheet', 'p&l statement', 'trial balance', 
    'bas worksheet', 'ageing report'
  ];
  
  const codeTriggers = [
    'write a script', 'create a function', 'write code',
    'python script', 'automate', 'api integration',
    'write a program', 'build a tool', 'create utility',
    'import data from', 'export data to', 'fetch from api'
  ];
  
  const needsSpreadsheet = spreadsheetTriggers.some(trigger => 
    userMessage.toLowerCase().includes(trigger)
  );
  
  const needsCode = codeTriggers.some(trigger =>
    userMessage.toLowerCase().includes(trigger)
  );
  
  if (needsCode) {
    return contextualizedPrompt + '\n\n' + codeGenPrompt;
  }
  
  if (needsSpreadsheet) {
    return contextualizedPrompt + '\n\n' + spreadsheetPrompt;
  }
  
  return contextualizedPrompt;
}
```

### Step 4: Testing Your Implementation

**Test Scenarios:**

1. **Basic Transaction Recording**
   ```
   User: "Record a fuel purchase of $150 including GST on 25/10/2024"
   Expected: Uses generic prompt, records to account 530-Fuel
   ```

2. **GST Query**
   ```
   User: "What's my GST position for Q1?"
   Expected: Uses generic prompt, provides GST summary
   ```

3. **Spreadsheet Request**
   ```
   User: "Create a P&L for July 2024"
   Expected: Uses generic + spreadsheet prompts, generates Excel file
   ```

4. **Chart of Accounts Query**
   ```
   User: "Which account should I use for vehicle insurance?"
   Expected: Uses generic prompt, suggests 620-Vehicle Registration & Insurance
   ```

5. **BAS Worksheet**
   ```
   User: "Generate a BAS worksheet for Q1 FY2025"
   Expected: Uses generic + spreadsheet prompts, creates Excel BAS worksheet
   ```

6. **Code Generation - Data Import**
   ```
   User: "Write a script to import transactions from a CSV file and validate GST amounts"
   Expected: Uses generic + code generation prompts, provides Python script
   ```

7. **Code Generation - API Integration**
   ```
   User: "Create a script to fetch invoices from Xero for the last quarter"
   Expected: Uses generic + code generation prompts, provides API integration code
   ```

8. **Code Generation - BAS Calculation**
   ```
   User: "I need a Python function to calculate my BAS figures from transaction data"
   Expected: Uses generic + code generation prompts, provides BAS calculator class
   ```

## Best Practices

### 1. Prompt Maintenance
- Update industry context annually or when business changes
- Maintain chart of accounts as accounts are added/removed
- Version control both prompts
- Document any customisations

### 2. Data Flow
```
User Query → Intent Detection → Prompt Selection → Processing → Response

Generic Prompt Uses:
• Transaction recording
• Account classification
• GST calculations
• General queries
• Bank reconciliation
• Text-based reports

Spreadsheet Prompt Uses:
• Formal financial statements
• Exportable reports
• Formatted worksheets
• Print-ready documents
• Complex tables with formulas

Code Generation Prompt Uses:
• Python scripts and tools
• API integrations
• Data import/export utilities
• Automation workflows
• Custom calculators
• Database operations
• Batch processing tools
```

### 3. Quality Control
For spreadsheets, always:
- Verify zero formula errors
- Check GST calculations (÷11 for inclusive)
- Validate totals and subtotals
- Confirm Australian date formatting (DD/MM/YYYY)
- Ensure colour coding applied correctly

### 4. User Experience
- Keep responses concise
- Provide links to generated files immediately
- Don't over-explain what's in the spreadsheet
- Offer next steps when appropriate

## Customisation for Multiple Industries

If you expand beyond waste management:

1. Create industry-specific modules:
   ```
   /industry-modules/
   ├── waste-management/
   │   ├── context.md
   │   └── chart-of-accounts.md
   ├── hospitality/
   │   ├── context.md
   │   └── chart-of-accounts.md
   └── retail/
       ├── context.md
       └── chart-of-accounts.md
   ```

2. Load appropriate module based on user/business:
   ```javascript
   const industry = user.business.industry; // 'waste-management'
   const context = loadModule(`${industry}/context.md`);
   const coa = loadModule(`${industry}/chart-of-accounts.md`);
   ```

## Troubleshooting

### Issue: Spreadsheet has formula errors
**Solution:** 
- Check recalc.py output
- Verify all cell references exist
- Ensure no division by zero
- Fix and regenerate

### Issue: Wrong account suggested
**Solution:**
- Review chart of accounts for clarity
- Add more specific account descriptions
- Include usage notes in COA

### Issue: GST calculations incorrect
**Solution:**
- Verify using ÷11 for GST-inclusive amounts
- Check GST rate is 10% (0.10)
- Ensure formulas reference correct cells

### Issue: Formatting not Australian standard
**Solution:**
- Check date format is DD/MM/YYYY
- Verify currency shows $ symbol
- Confirm terminology is Australian English

## Maintenance Schedule

**Monthly:**
- Review transaction categorisations for accuracy
- Update assumptions in financial models

**Quarterly:**
- Verify BAS calculations align with lodgements
- Review chart of accounts for completeness

**Annually:**
- Update industry context for regulatory changes
- Review and update financial year templates
- Verify ATO compliance requirements

**As Needed:**
- Add new accounts to chart of accounts
- Update prompt with new business lines
- Refine categorisation rules

## Support and Resources

**Documentation:**
- Generic prompt: ledgerbot-system-prompt-generic.md
- Spreadsheet prompt: ledgerbot-spreadsheet-artifact-prompt.md
- Code generation prompt: ledgerbot-code-generation-prompt.md
- This guide: implementation-guide.md

**Australian Resources:**
- ATO website: www.ato.gov.au
- Australian Accounting Standards Board: www.aasb.gov.au
- Fair Work: www.fairwork.gov.au

**Claude Documentation:**
- Prompt engineering: docs.claude.com/en/docs/build-with-claude/prompt-engineering
- Best practices: docs.claude.com/en/docs/build-with-claude/prompt-engineering/claude-4-best-practices

---

**Version:** 1.0  
**Last Updated:** October 2024  
**Author:** Ledgerbot Development Team
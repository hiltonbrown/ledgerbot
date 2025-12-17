# Business Information Settings - Detailed Guide

## Overview

Business Information settings provide LedgerBot with essential context about your organization, location, and financial structure. This ensures that AI responses are relevant to your jurisdiction, industry, and accounting setup.

## Fields Reference

### 1. Country

**What it does**: Sets your primary business location for tax and regulatory context.

**Available options**:
- Australia
- Canada
- United Kingdom
- New Zealand
- South Africa
- United States

**Impact on responses**:
- Determines applicable tax regulations (GST, VAT, Sales Tax)
- Influences date formats and terminology
- Affects compliance advice and regulatory references
- Controls which state/province options are available

**Example use cases**:
- **Australia**: AI will reference ATO guidance, GST rules, BAS lodgement requirements
- **United States**: AI will reference IRS guidance, state-specific sales tax rules
- **United Kingdom**: AI will reference HMRC guidance, VAT regulations

**Template variable**: Not directly exposed, but influences other variables

---

### 2. State / Province

**What it does**: Refines location context for state-level tax and regulatory requirements.

**Available options**: Dynamically populated based on country selection
- **Australia**: NSW, VIC, QLD, SA, WA, TAS, NT, ACT
- **United States**: All 50 states
- **Canada**: Provinces and territories
- And more...

**Impact on responses**:
- State-specific payroll tax thresholds
- Workers compensation requirements
- State-based tax credits and incentives
- Regional compliance obligations

**Example**:
- **NSW, Australia**: Payroll tax threshold $1.2M, land tax considerations
- **California, US**: Sales tax rate, employment law nuances

---

### 3. Timezone

**What it does**: Ensures date/time references in AI responses match your local time.

**Available options**: 20+ timezone options including:
- **Australian**: Sydney, Melbourne, Brisbane, Perth, Adelaide, etc.
- **International**: New York, London, Singapore, Tokyo, etc.
- **UTC**: For global operations

**Impact on responses**:
- `{{TODAY_DATE}}` variable shows correct local date
- Deadline calculations (BAS due dates, payment terms)
- Timestamp interpretation in reports

**Example**:
```
Setting: Australia/Sydney (AEDT)
Effect: "Your BAS for Q2 is due on 28 July 2025" (correct Australian date)

Setting: America/Los_Angeles (PDT)
Effect: Dates and deadlines referenced in PST/PDT
```

**Template variable**: `{{TIMEZONE}}`

---

### 4. Company Name

**What it does**: Identifies your organization in AI responses and generated documents.

**Character limit**: 255 characters

**Xero integration**:
- If Xero is connected, this field auto-syncs from your Xero organization name
- Manual entry is disabled when Xero is active
- To use manual entry, disconnect Xero or switch organizations

**Impact on responses**:
- Personalized greetings and document headers
- Invoice and report generation
- Professional communication in client-facing content

**Examples**:
```
✓ Good examples:
  - "Acme Consulting Pty Ltd"
  - "Smith & Associates"
  - "TechStart Solutions Inc."

✗ Avoid:
  - Very long names (use legal abbreviations)
  - Special characters that don't render well
  - Internal codes or abbreviations unfamiliar to AI
```

**Template variable**: `{{COMPANY_NAME}}`

**Best practice**: Use your registered business name or trading name as it appears on official documents.

---

### 5. Industry / Business Information

**What it does**: Provides AI with context about your business type, size, and operations for more relevant advice.

**Character limit**: 200 characters

**Supports**: Template variables (click the variable browser button to insert)

**Impact on responses**:
- Industry-specific terminology and examples
- Relevant compliance requirements (retail vs. professional services)
- Account coding suggestions appropriate to your sector
- Benchmarking and KPI recommendations

**What to include**:
1. **Industry/sector**: What you do (retail, professional services, manufacturing, etc.)
2. **Size indicators**: Revenue, employee count, locations
3. **Unique characteristics**: Key customers, products, business model
4. **Operational details**: Physical vs. online, B2B vs. B2C

**Examples**:

```
✓ Excellent:
"Retail office supplies business with 3 locations across NSW. 15 staff members, $2M annual turnover. Primary customers are small businesses and schools."

✓ Good:
"Professional accounting firm in Sydney. 5 partners, 20 staff. Specialize in SME clients across various industries."

✓ Acceptable:
"Online e-commerce business selling handmade jewelry. Sole trader, growing revenue."

✗ Too vague:
"Small business"

✗ Too detailed (exceeds character limit):
"We are a comprehensive retail operation specializing in office supplies including pens, paper, printers, and technology accessories across three locations in Sydney, Newcastle, and Wollongong with plans to expand to Queensland..."
```

**Using template variables**:
```
"{{COMPANY_NAME}} is a {{INDUSTRY_TYPE}} business with {{EMPLOYEE_COUNT}} employees operating in {{STATE}}."
```
(Note: `{{INDUSTRY_TYPE}}` and `{{EMPLOYEE_COUNT}}` would be custom variables you define)

**Template variable**: `{{INDUSTRY_CONTEXT}}`

---

### 6. Chart of Accounts

**What it does**: Provides your account structure for accurate coding suggestions and financial analysis.

**Character limit**: 1000 characters

**Xero integration**:
- If Xero is connected, this field auto-syncs from your Xero chart of accounts
- Shows account count and last sync time
- Manual editing is disabled when Xero is active
- View/manage via Settings → Chart of Accounts

**Supports**: Template variables (when manual entry is enabled)

**Impact on responses**:
- Account code suggestions when coding transactions
- Understanding of your account structure and groupings
- Financial statement generation
- Account reconciliation workflows

**Format suggestions** (for manual entry):

```
✓ Simple format:
1000 - Cash at Bank
1100 - Accounts Receivable
2000 - Accounts Payable
4000 - Sales Revenue
5000 - Cost of Goods Sold
6000 - Operating Expenses

✓ Detailed format:
Assets
  1000-1999: Current Assets
    1000: Cash at Bank - Operating Account
    1010: Cash at Bank - Payroll Account
    1100: Accounts Receivable - Trade
    1200: Inventory - Finished Goods
  2000-2999: Non-Current Assets
    2000: Property, Plant & Equipment
    2100: Accumulated Depreciation

Liabilities
  3000-3999: Current Liabilities
    3000: Accounts Payable - Trade
    3100: GST Collected
    3200: GST Paid
    3300: PAYG Withholding

Revenue
  4000-4999: Operating Revenue
    4000: Sales - Products
    4100: Sales - Services
    4200: Other Income

Expenses
  5000-5999: Cost of Sales
    5000: Cost of Goods Sold
    5100: Direct Labor
  6000-6999: Operating Expenses
    6000: Rent & Occupancy
    6100: Salaries & Wages
    6200: Marketing & Advertising
```

**Best practices**:
- Include both account codes and names
- Organize by category (Assets, Liabilities, Revenue, Expenses)
- Highlight GST/tax-related accounts
- Keep descriptions clear and consistent
- If space is limited, prioritize your most-used accounts

**Template variable**: `{{CHART_OF_ACCOUNTS}}`

**Tip**: Even with Xero sync, you can view the full chart at Settings → Chart of Accounts

---

### 7. Custom Variables

**What it does**: Define your own template variables for information you frequently reference.

**How it works**:
1. Click "Add Variable"
2. Enter variable name (e.g., `ABN`, `REPORTING_PERIOD`)
3. Enter variable value
4. Use `{{YOUR_VARIABLE_NAME}}` in Industry Context, Chart of Accounts, or Custom Instructions

**Common use cases**:

| Variable Name | Example Value | Usage |
|--------------|---------------|--------|
| `ABN` | "53 004 085 616" | Reference in correspondence templates |
| `ACN` | "004 085 616" | Company documents |
| `REPORTING_PERIOD` | "Monthly" | Frequency references |
| `PRIMARY_CONTACT` | "Sarah Johnson" | Key contact person |
| `FINANCIAL_YEAR_END` | "30 June" | Year-end references |
| `INDUSTRY_TYPE` | "Retail - Office Supplies" | Categorization |
| `EMPLOYEE_COUNT` | "15" | Size references |
| `MAIN_BANK` | "Commonwealth Bank" | Banking details |

**Example usage in Industry Context**:
```
"{{COMPANY_NAME}} (ABN: {{ABN}}) operates in the {{INDUSTRY_TYPE}} sector with {{EMPLOYEE_COUNT}} employees. Financial year ends {{FINANCIAL_YEAR_END}}."
```

**Benefits**:
- Consistency across all settings
- Easy updates (change once, affects all references)
- Cleaner, more maintainable configurations
- Reusable across different instruction fields

---

## Template Preview

At the bottom of the Business Information form, you'll find the **Template Preview** feature.

**What it shows**: How your settings will be rendered in the actual system prompt sent to the AI.

**Use it to**:
- Verify template variables are rendering correctly
- Check for undefined variables (highlighted in warnings)
- Ensure your information appears as intended
- Debug issues with variable substitution

**Validation warnings**: If you reference undefined variables, you'll see a warning listing them. Either:
1. Define the variable in Custom Variables section, or
2. Remove the reference from your text

---

## Xero Sync Behavior

When you have an active Xero connection:

### Auto-synced fields:
- **Company Name**: Synced from Xero organization name
- **Chart of Accounts**: Synced from Xero chart (with account count and last sync date)

### Manual fields remain editable:
- Country, State, Timezone
- Industry Context
- Custom Variables

### To switch from Xero to manual:
1. Go to Settings → Integrations
2. Disconnect Xero or switch to a different organization
3. Return to Personalisation and enter manual values

### Sync indicators:
- "From Xero" badge on auto-synced fields
- Account count and last sync timestamp
- "View/Manage Chart" link for full chart of accounts

---

## Best Practices

### Start Simple
Begin with:
1. Country and timezone (essential for date/regulatory context)
2. Company name (if no Xero connection)
3. Brief industry description (1-2 sentences)

### Expand As Needed
Add more detail when:
- You need more specific coding suggestions → Add chart of accounts
- Responses lack industry context → Expand industry description
- You frequently repeat information → Create custom variables

### Keep It Current
Update settings when:
- Business structure changes (new locations, different industry focus)
- You connect/disconnect Xero
- Chart of accounts is revised
- Regulatory jurisdiction changes

### Use Template Variables Strategically
- Define variables for information used in multiple places
- Avoid creating variables for one-time use
- Keep variable names clear and descriptive (e.g., `ABN` not `NUM1`)

### Character Limits
- **Industry Context**: 200 chars - be concise but specific
- **Chart of Accounts**: 1000 chars - prioritize most-used accounts if space is limited

---

## Impact on AI Responses

### Without Business Information:
```
User: "How should I code this supplier payment?"
LedgerBot: "Typically, supplier payments are coded to Accounts Payable.
You may also need to consider GST if you're in a jurisdiction that uses GST."
```

### With Business Information:
```
User: "How should I code this supplier payment?"
LedgerBot: "For Acme Consulting Pty Ltd, code this to:
  • Account 3000 - Accounts Payable - Trade
  • If GST applies, also record to Account 3200 - GST Paid

Based on your NSW location, ensure you're claiming the GST credit in your
next BAS lodgement."
```

The difference: specificity, relevance, and actionable advice.

---

## Troubleshooting

### "Company name won't save"
- Check if Xero is connected (auto-sync overrides manual entry)
- Ensure you clicked "Save Business Information"
- Verify settings aren't locked

### "Variables showing as {{UNDEFINED}}"
- Variable name misspelled in reference
- Variable not defined in Custom Variables section
- Use the Variable Browser to insert correctly

### "Chart of accounts not syncing from Xero"
- Check Xero connection status in Settings → Integrations
- Try reconnecting Xero
- View sync status and last sync time in the field header

### "Changes don't affect AI responses"
- Allow a few moments for settings to propagate
- Start a new chat (existing chats may use cached settings)
- Verify settings saved successfully (check for success toast)

---

**Next**: [AI Preferences Guide →](./user-guide-personalisation-ai-preferences.md)

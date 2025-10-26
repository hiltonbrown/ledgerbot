# System Prompts

This directory contains system prompt templates used by LedgerBot.

## Files

### default-system-prompt.md

The default system prompt for LedgerBot when users haven't customized their own prompt.

**Purpose:**
- Defines LedgerBot's role as an expert accounting assistant for Australian businesses
- Establishes Australian business context (GST, BAS, ATO compliance, etc.)
- Provides comprehensive accounting capabilities and guidelines
- Sets Australian English spelling and terminology standards
- Defines transaction recording, reporting, and compliance requirements

**Usage:**
This file is automatically loaded by `/app/(settings)/api/user/data.ts` and used as the default system prompt for new users or users who haven't set a custom prompt.

**Customization:**
Users can override this default prompt in their personalisation settings at `/settings/personalisation`.

**Template Variables:**
The prompt includes template placeholders that can be populated with business-specific information:
- `{{INDUSTRY_CONTEXT}}` - Industry-specific requirements and terminology
- `{{CHART_OF_ACCOUNTS}}` - Business-specific chart of accounts

**Maintenance:**
To update the default system prompt:
1. Edit `default-system-prompt.md` in this directory
2. No code changes required - the file is read at runtime
3. Changes take effect immediately for users without custom prompts
4. Test by viewing `/settings/personalisation` page (should show new default for new users)

**Fallback:**
If the file cannot be read for any reason, a simple fallback prompt is used:
> "You are Ledgerbot, an expert accounting assistant for Australian businesses. Keep your responses concise and helpful."

### default-spreadsheet-prompt.md

The default spreadsheet creation prompt for LedgerBot's Excel/spreadsheet artifact generation.

**Purpose:**
- Defines comprehensive standards for creating Excel spreadsheets for Australian businesses
- Establishes mandatory requirements: zero formula errors, use formulas not hardcoded values
- Provides Australian accounting report formats (P&L, Balance Sheet, Trial Balance, BAS, etc.)
- Sets professional formatting standards with colour coding conventions
- Defines GST calculation formulas and BAS label references
- Includes formula construction best practices and error prevention
- Specifies Australian financial year and terminology standards

**Key Requirements:**
- **Zero Formula Errors**: Every spreadsheet must have zero #REF!, #DIV/0!, #VALUE!, #N/A, #NAME? errors
- **Formula-Based**: Always use Excel formulas instead of hardcoded calculations
- **Australian Standards**: DD/MM/YYYY dates, AUD currency, GST compliance, Australian terminology
- **Professional Formatting**: Industry-standard colour coding (blue inputs, black calculations, green cross-refs)
- **Validation**: Must run recalc.py script and fix any errors before delivery

**Usage:**
This file is automatically loaded by `/app/(settings)/api/user/data.ts` and used as the default spreadsheet prompt for artifact generation.

**Customization:**
Users can override this default prompt in their personalisation settings at `/settings/personalisation`.

**Maintenance:**
To update the default spreadsheet prompt:
1. Edit `default-spreadsheet-prompt.md` in this directory
2. No code changes required - the file is read at runtime
3. Changes take effect immediately for users without custom prompts
4. Test by creating a spreadsheet artifact

**Fallback:**
If the file cannot be read for any reason, a simple fallback prompt is used:
> "You are a spreadsheet creation assistant. Create a spreadsheet in csv format based on the given prompt. The spreadsheet should contain meaningful column headers and data."

## Adding New Prompts

To add new prompt templates:
1. Create a new `.md` file in this directory
2. Update the relevant code to load the new prompt
3. Document the new prompt in this README

## File Format

Prompts should be written in Markdown format for:
- Easy readability and editing
- Version control friendly (git diff works well)
- Supports formatting and structure
- Can be displayed directly in settings UI

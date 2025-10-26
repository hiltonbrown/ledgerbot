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

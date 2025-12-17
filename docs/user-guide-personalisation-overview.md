# Personalisation Settings - User Guide

## Overview

The Personalisation page (`/settings/personalisation`) is your control center for customizing how LedgerBot interacts with you and your business. These settings allow you to tailor AI responses to your specific context, industry, and preferences.

**Location**: Settings → Personalisation

## Why Personalisation Matters

When you personalize LedgerBot:
- **Contextual Responses**: AI understands your business type, location, and industry-specific requirements
- **Accurate Coding**: Account coding suggestions match your actual chart of accounts
- **Regulatory Compliance**: Responses reflect your jurisdiction's tax and accounting rules
- **Consistent Communication**: AI maintains your preferred tone and style across all interactions
- **Efficient Workflows**: Custom suggestions and instructions reduce repetitive explanations

## What Gets Personalized

The personalization settings feed into LedgerBot's **system prompt** - the foundational instructions that guide every AI response. This includes:

1. **Business Identity**: Your company name, industry, and location
2. **Financial Context**: Chart of accounts, base currency, organization type
3. **Communication Style**: Tone, formality, and response length preferences
4. **Custom Instructions**: Your specific working preferences and requirements
5. **Model Selection**: Which AI model to use and how it should reason

## Sections Overview

The Personalisation page contains five main sections:

### 1. Profile & Account
- **Read-only display** of your name and email
- Managed through Clerk authentication
- Update these details via the "Manage Account" button

### 2. Business Information
- Location settings (country, state, timezone)
- Company name and industry context
- Chart of accounts (manual entry or Xero sync)
- Custom template variables
- **Use case**: Provides business context for all AI responses

### 3. AI Preferences
- Default chat model selection
- Reasoning mode preference
- Tone and style settings
- **Use case**: Controls how the AI thinks and communicates

### 4. Custom Instructions
- System-level custom instructions (general behavior)
- Code-specific instructions
- Spreadsheet-specific instructions
- **Use case**: Add your unique business rules and preferences

### 5. Chat Suggestions
- Customize the 4 quick-start prompts on the main chat page
- **Use case**: Set up your most common questions for one-click access

## Template Variable System

Many fields support **template variables** - placeholders that get replaced with actual values in prompts. This allows you to reference dynamic data in your instructions.

### Standard Variables
- `{{FIRST_NAME}}` - Your first name
- `{{LAST_NAME}}` - Your last name
- `{{COMPANY_NAME}}` - Your company/organization name
- `{{TODAY_DATE}}` - Current date in your timezone
- `{{TIMEZONE}}` - Your configured timezone
- `{{USER_EMAIL}}` - Your email address
- `{{BASE_CURRENCY}}` - Base currency (e.g., AUD)
- `{{ORGANISATION_TYPE}}` - Organization type from Xero
- `{{INDUSTRY_CONTEXT}}` - Your industry description
- `{{CHART_OF_ACCOUNTS}}` - Your chart of accounts

### Custom Variables
You can create your own variables for frequently-used information:
- Business registration numbers (ABN, ACN)
- Key contact details
- Reporting periods
- Department names
- Product categories

**Example**: Define `{{ABN}}` as "53 004 085 616" and reference it in instructions.

## Lock Settings

When **Lock Settings** is enabled (via the banner at the top):
- All personalization fields become read-only
- Prevents accidental changes to production configurations
- Useful for multi-user environments or after finalizing setup
- Can be unlocked anytime by the account owner

## Security and Privacy

- **Personal data** (name, email) is managed by Clerk, not stored in personalization settings
- **Custom instructions** are sanitized to prevent prompt injection attacks
- **Template variables** are validated and character-limited to prevent token explosion
- **Xero data** (when synced) is encrypted and refreshed automatically

## Next Steps

Explore the detailed guides for each section:
- [Business Information Guide](./user-guide-personalisation-business-info.md) - Location, company, industry, chart of accounts
- [AI Preferences Guide](./user-guide-personalisation-ai-preferences.md) - Models, reasoning, tone settings
- [Custom Instructions Guide](./user-guide-personalisation-custom-instructions.md) - System, code, and spreadsheet instructions
- [Chat Suggestions Guide](./user-guide-personalisation-chat-suggestions.md) - Quick-start prompts

## Quick Start

If you're new to LedgerBot personalization:

1. **Start with Business Information**: Set your country, timezone, and company name
2. **Add Industry Context**: Briefly describe your business type and size
3. **Choose Your AI Model**: Start with Claude Haiku 4.5 for fast, cost-efficient responses
4. **Try a Custom Instruction**: Add one simple preference (e.g., "Always use Australian terminology")
5. **Test with a Chat**: Start a conversation and see how personalization affects responses
6. **Refine Over Time**: Adjust settings based on what works best for your workflow

## Common Questions

**Q: Do I need to fill out every field?**
A: No. Start with the basics (country, timezone) and add more as needed.

**Q: How often should I update these settings?**
A: Update when your business context changes (new location, different industry focus, new chart of accounts).

**Q: Can I see the full system prompt?**
A: Use the "Template Preview" feature in Business Information to see how your settings are applied.

**Q: What happens if I have Xero connected?**
A: Company name and chart of accounts will auto-sync from Xero and override manual entries.

**Q: Which model should I use?**
A: See the [AI Preferences Guide](./user-guide-personalisation-ai-preferences.md) for detailed model comparison.

---

**Last Updated**: December 2025
**Related Documentation**:
- [CLAUDE.md](../CLAUDE.md) - Technical architecture reference
- [System Prompt Architecture](./system-prompt-refactor-notes.md) - How templates work
- [AI Preferences Audit](./ai-preferences-audit.md) - Settings validation

# System Prompts

This directory contains system prompt templates used by LedgerBot.

## Files

### ledgerbot-system-prompt.md

The main system prompt template for LedgerBot with variable substitution support.

**Purpose:**
- Defines LedgerBot's role as an expert accounting assistant for Australian businesses
- Establishes Australian business context (GST, BAS, ATO compliance, etc.)
- Provides comprehensive accounting capabilities and guidelines
- Sets Australian English spelling and terminology standards
- Defines transaction recording, reporting, and compliance requirements
- Includes email correspondence guidelines to avoid AI-sounding language

**Usage:**
This file is automatically loaded by `lib/ai/prompts.ts` (via `LEDGERBOT_SYSTEM_TEMPLATE`) and rendered with user-specific variables by the `buildLedgerbotSystemPrompt()` function.

**Architecture:**
This is a template-based system that renders variables at request time rather than relying on user customization. See `lib/ai/prompts.ts` for the builder function.

**Template Variables:**
The prompt includes template placeholders that are automatically substituted with user-specific information at request time:

**Standard Variables** (populated from user settings and Xero connection):
- `{{FIRST_NAME}}`, `{{LAST_NAME}}` - User identity from personalisation settings
- `{{COMPANY_NAME}}` - Organization name from Xero or user settings
- `{{USER_EMAIL}}` - User email address
- `{{TODAY_DATE}}` - Current date in Australian format
- `{{TIMEZONE}}` - User timezone or location
- `{{BASE_CURRENCY}}` - Organization base currency (default: AUD)
- `{{ORGANISATION_TYPE}}` - Type of business organization
- `{{IS_DEMO_COMPANY}}` - Whether this is a Xero demo company
- `{{XERO_SHORT_CODE}}` - Xero organization short code for deep linking
- `{{INDUSTRY_CONTEXT}}` - Industry-specific requirements and terminology
- `{{CHART_OF_ACCOUNTS}}` - Business-specific chart of accounts structure
- `{{CUSTOM_SYSTEM_INSTRUCTIONS}}` - User-defined custom instructions
- `{{TONE_AND_GRAMMAR}}` - Communication style preset or guidelines

**How Template Substitution Works:**
1. Each chat request triggers `buildLedgerbotSystemPrompt()` in `lib/ai/prompts.ts`
2. Function fetches user settings and Xero connection metadata
3. Template renderer (`renderTemplate()`) replaces all `{{VARIABLE}}` placeholders with actual values
4. Unknown placeholders are preserved and logged as warnings
5. Values are sanitized using `sanitisePromptFragment()` to prevent injection attacks
6. The rendered prompt is passed to the AI model

**Example Usage:**
```markdown
You are assisting {{FIRST_NAME}} {{LAST_NAME}} with {{COMPANY_NAME}}.

Industry Context:
{{INDUSTRY_CONTEXT}}

Chart of Accounts:
{{CHART_OF_ACCOUNTS}}
```

When variables are populated, this becomes:
```markdown
You are assisting John Smith with Acme Pty Ltd.

Industry Context:
Retail business selling office supplies with 3 locations across NSW.

Chart of Accounts:
1000 - Cash at Bank
1100 - Accounts Receivable
...
```

**Maintenance:**
To update the system prompt template:
1. Edit `ledgerbot-system-prompt.md` in this directory
2. No code changes required - the file is read at runtime
3. Changes take effect immediately on next request
4. Test by starting a new chat and verifying the AI behavior
5. Use CLAUDE.md variables documentation as reference

**Important Security Notes:**
- All user-provided values are sanitized via `sanitisePromptFragment()` before injection
- Template injection patterns are stripped (e.g., "ignore previous instructions")
- Values are truncated to prevent token explosion
- Unknown placeholders generate warnings but don't break the prompt

**Fallback:**
If the file cannot be read for any reason, a simple fallback prompt is used:
> "Error: System prompt template could not be loaded."

---

## Artifact Prompts

The following prompts are used for AI-generated artifacts (text, code, spreadsheets). Each prompt is loaded from a file and supports variable substitution for user customization.

### default-text-prompt.md

The default prompt for text document artifact generation.

**Purpose:**
- Defines standards for creating professional business documents for Australian businesses
- Covers various document types: reports, correspondence, summaries, documentation
- Establishes Australian business writing conventions and formatting requirements
- Provides markdown formatting guidelines and examples
- Emphasizes data accuracy when specific data is provided in prompts

**Template Variables:**
- `{{CUSTOM_TEXT_INSTRUCTIONS}}` - User-defined custom text generation instructions

**Usage:**
Automatically loaded by `buildTextPrompt()` in `lib/ai/prompts.ts` when creating text artifacts.

**Key Requirements:**
- Use Australian English spelling and terminology
- Apply proper markdown formatting (headings, lists, tables)
- Preserve exact data when provided in prompts
- Maintain professional business tone
- Use DD/MM/YYYY date format

### default-code-prompt.md

The default prompt for code artifact generation.

**Purpose:**
- Defines comprehensive standards for generating production-ready code for Australian businesses
- Establishes code quality principles: clarity, robustness, security, data integrity, maintainability
- Provides Australian compliance patterns for financial data handling
- Includes security best practices and error handling standards

**Template Variables:**
- `{{CUSTOM_CODE_INSTRUCTIONS}}` - User-defined custom code generation instructions
- `{{INDUSTRY_CONTEXT}}` - Industry-specific requirements and terminology

**Usage:**
Automatically loaded by `buildCodePrompt()` in `lib/ai/prompts.ts` when creating code artifacts.

**Key Requirements:**
- Write self-documenting code with clear naming
- Use Decimal for currency (never float)
- Handle errors gracefully with specific exceptions
- Implement proper input validation and sanitization
- Follow Australian date format (DD/MM/YYYY) and currency standards
- Include type hints and comprehensive docstrings

### default-spreadsheet-prompt.md

The default prompt for spreadsheet/CSV artifact generation.

**Purpose:**
- Defines comprehensive standards for creating CSV files for Australian businesses
- Establishes mandatory CSV formatting requirements (newline separation between rows)
- Provides Australian accounting report formats and standards
- Ensures data accuracy and proper calculations
- Specifies GST calculations and Australian financial year handling

**Template Variables:**
- `{{CUSTOM_SHEET_INSTRUCTIONS}}` - User-defined custom spreadsheet generation instructions

**Usage:**
Automatically loaded by `buildSheetPrompt()` in `lib/ai/prompts.ts` when creating sheet artifacts.

**Key Requirements:**
- **Newline Separation**: Every row must be separated by `\n` character
- **CSV Format**: Proper comma separation, quote escaping for values with commas
- **Data Accuracy**: All calculations must be pre-computed and accurate
- **Australian Standards**: DD/MM/YYYY dates, AUD currency, GST compliance
- **No Formulas**: CSV files contain values only (formulas are for Excel artifacts)

**Maintenance:**
To update artifact prompts:
1. Edit the corresponding `default-*-prompt.md` file in this directory
2. No code changes required - files are loaded at runtime
3. Changes take effect immediately on next artifact creation
4. Test by creating an artifact of that type

**Fallback:**
If a prompt file cannot be read, a minimal fallback prompt is used to ensure the system continues functioning.

### ap-system-prompt.md

The Accounts Payable (AP) agent system prompt for supplier bill management and payment automation.

**Purpose:**
- Defines the AP agent's role in managing vendor bills, payment workflows, and GST compliance
- Provides comprehensive bill processing capabilities (extraction, coding, approval, payment)
- Establishes Australian supplier validation and ABN checking requirements
- Includes payment risk assessment and duplicate detection
- Defines email draft generation for supplier communication (no direct sending)

**Key Features:**
- Invoice data extraction from PDFs and images
- Vendor matching and creation
- GST-aware bill coding suggestions
- Payment run proposals with risk assessment
- Approval workflow tracking
- Xero integration for real-time financial data

**Usage:**
This file is automatically loaded by `lib/agents/ap/agent.ts` at runtime.

**Location:** `/prompts/ap-system-prompt.md`

### ar-system-prompt.md

The Accounts Receivable (AR) agent system prompt for customer invoice management and payment reminders.

**Purpose:**
- Defines the AR agent's role in managing receivables, reducing DSO, and maintaining customer relationships
- Provides invoice tracking, late payment risk prediction, and reminder generation
- Establishes communication tone guidelines (polite, firm, final) based on overdue periods
- Includes payment reconciliation and customer note management
- Defines artifact creation for payment reminders (no direct sending)

**Key Features:**
- Overdue invoice tracking with risk scores
- Payment reminder generation (email/SMS) with tone customization
- Late payment probability prediction
- Payment reconciliation and status updates
- Customer communication history tracking
- Xero synchronization for real-time invoice data

**Usage:**
This file is automatically loaded by `lib/agents/ar/agent.ts` at runtime.

**Location:** `/prompts/ar-system-prompt.md`

## Prompt File Naming Convention

All system prompts follow a consistent naming convention:
- **Main system prompt**: `ledgerbot-system-prompt.md` (template-based with variable substitution)
- **Artifact prompts**: `default-{purpose}-prompt.md` (e.g., `default-code-prompt.md`, `default-spreadsheet-prompt.md`)
- **Agent prompts**: `{agent-code}-system-prompt.md` (e.g., `ap-system-prompt.md`, `ar-system-prompt.md`)

This ensures:
- Easy identification of prompt purpose
- Consistent maintenance and updates
- Clear alphabetical sorting in directory listings

## Adding New Prompts

To add new prompt templates:
1. Create a new `.md` file in this directory following the naming convention
2. Update the relevant code to load the new prompt (typically in `lib/agents/{agent-name}/agent.ts`)
3. Document the new prompt in this README with purpose, features, usage, and location

## File Format

Prompts should be written in Markdown format for:
- Easy readability and editing
- Version control friendly (git diff works well)
- Supports formatting and structure
- Can be displayed directly in settings UI

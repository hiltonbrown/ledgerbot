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
The prompt includes template placeholders that are automatically substituted with user-specific information:

**Standard Variables** (automatically populated):
- `{{FIRST_NAME}}` - User's first name from Clerk authentication
- `{{LAST_NAME}}` - User's last name from Clerk authentication
- `{{COMPANY_NAME}}` - Company name from user settings
- `{{INDUSTRY_CONTEXT}}` - Industry-specific requirements and terminology
- `{{CHART_OF_ACCOUNTS}}` - Business-specific chart of accounts

**Custom Variables:**
Users can define their own custom template variables in `/settings/personalisation`. Custom variable names must be uppercase (e.g., `{{MY_VARIABLE}}`).

**How Template Substitution Works:**
1. Users define template variables in the personalisation settings
2. When a user starts a chat, `getUserSettings()` fetches their settings
3. The template engine (`lib/ai/template-engine.ts`) replaces all `{{VARIABLE}}` placeholders with actual values
4. The substituted prompt is passed to the AI model
5. If a variable has no value, the placeholder is removed (replaced with empty string)

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

### default-code-prompt.md

The default code generation prompt for LedgerBot's code artifact creation.

**Purpose:**
- Defines comprehensive standards for generating production-ready code for Australian businesses
- Establishes code quality principles: clarity, robustness, security, data integrity, maintainability, performance
- Provides Australian compliance patterns for financial data handling
- Includes security best practices and error handling standards
- Defines common code patterns for business applications

**Key Requirements:**
- **Code Quality**: Self-documenting code with clear naming, type hints, comprehensive docstrings
- **Financial Accuracy**: Use Decimal for currency (never float), Australian date format (DD/MM/YYYY)
- **Security**: No hardcoded credentials, input sanitisation, parameterised queries, environment variables
- **Error Handling**: Comprehensive validation, meaningful errors, custom exception classes
- **Australian Compliance**: GST calculations (10%), ABN validation, financial year handling (July-June)
- **Testing**: Unit tests, integration tests, data validation functions

**Code Patterns Included:**
- Data import and validation (CSV/Excel with Australian formats)
- Financial report generation (P&L, Balance Sheet)
- API integration (Xero/MYOB examples)
- Data export and formatting
- Automated BAS preparation
- Performance optimisation (chunking, caching, bulk operations)

**Usage:**
This file is automatically loaded by `/app/(settings)/api/user/data.ts` and used as the default code generation prompt for artifact creation.

**Customization:**
Users can override this default prompt in their personalisation settings at `/settings/personalisation`.

**Maintenance:**
To update the default code prompt:
1. Edit `default-code-prompt.md` in this directory
2. No code changes required - the file is read at runtime
3. Changes take effect immediately for users without custom prompts
4. Test by creating a code artifact

**Fallback:**
If the file cannot be read for any reason, a simple fallback prompt is used:
> "You are a Python code generator that creates self-contained, executable code snippets..."

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
- **Default prompts**: `default-{purpose}-prompt.md` (e.g., `default-system-prompt.md`, `default-code-prompt.md`)
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

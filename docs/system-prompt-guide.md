# LedgerBot System Prompt Settings Guide

**Last Updated:** 8 November 2025
**Version:** 1.0
**Applies to:** LedgerBot AI Accounting Assistant

---

## Table of Contents

1. [Introduction](#introduction)
2. [Understanding System Prompts](#understanding-system-prompts)
3. [The Three Prompt Types](#the-three-prompt-types)
4. [Accessing Prompt Settings](#accessing-prompt-settings)
5. [Template Variables Explained](#template-variables-explained)
6. [Customising Your System Prompt](#customising-your-system-prompt)
7. [How Prompts Work in Conversations](#how-prompts-work-in-conversations)
8. [Best Practices for Customisation](#best-practices-for-customisation)
9. [System Architecture (Technical)](#system-architecture-technical)
10. [The Prompt Hierarchy](#the-prompt-hierarchy)
11. [Conversation Flow](#conversation-flow)
12. [Artifact Generation Process](#artifact-generation-process)
13. [Template Variable Processing](#template-variable-processing)
14. [Integration Points](#integration-points)
15. [Maintenance and Updates](#maintenance-and-updates)
16. [Troubleshooting and FAQ](#troubleshooting-and-faq)
17. [Glossary](#glossary)

---

## Introduction

Welcome to the LedgerBot System Prompt Settings Guide. This documentation explains how LedgerBot uses instructions called "system prompts" to understand your business and provide tailored accounting assistance. Whether you're a business owner wanting to personalise your AI assistant or a developer maintaining the system, this guide provides comprehensive information about how prompts work and how to customise them effectively.

### What You'll Learn

**For End Users:**
- What system prompts are and why they matter
- How to customise prompts for your specific business needs
- Using template variables to automate personalisation
- Best practices for getting the most from LedgerBot

**For Technical Users:**
- How prompts flow through the system architecture
- The relationship between prompts, conversations, and artifacts
- Integration with Xero and other data sources
- Template substitution mechanics and debugging

---

## Understanding System Prompts

### What Are System Prompts?

Think of system prompts as a detailed instruction manual you give to LedgerBot before every conversation. Just like briefing a new team member on your business operations, system prompts tell the AI assistant:

- What role it should play (accounting assistant, not general chatbot)
- What kind of business you run (retail, hospitality, professional services)
- How you want it to communicate (formal, friendly, technical)
- What specific knowledge it needs (your chart of accounts, industry regulations)
- What standards to follow (Australian GST rules, date formats, terminology)

### Why System Prompts Matter

Without customised system prompts, LedgerBot would give generic accounting advice that might not fit your business. With well-crafted prompts, LedgerBot becomes an assistant that:

- **Understands your business context**: Knows your industry, company structure, and specific needs
- **Uses your terminology**: References your actual chart of accounts and business processes
- **Follows your preferences**: Communicates in the style and detail level you prefer
- **Provides relevant advice**: Considers your business type when suggesting solutions
- **Maintains consistency**: Always applies the same business rules and standards

Think of it like the difference between hiring a generic bookkeeper versus one who's already been trained on your specific business operations.

### How Prompts Shape AI Behaviour

The AI model reads your system prompt before processing every message you send. This means:

- **Every response is influenced**: The prompt sets the foundation for all AI behaviour
- **Consistency across conversations**: All chats use the same underlying instructions
- **Context is preserved**: Your business information is always available to the AI
- **Specialised knowledge**: Industry-specific guidance is automatically applied
- **Quality control**: Standards and validation rules are enforced consistently

---

## The Three Prompt Types

LedgerBot uses three different types of prompts for different situations. Think of these as three different hats the AI wears depending on what you're asking it to do.

### 1. System Prompt (Main Instructions)

**Purpose:** The primary set of instructions that defines LedgerBot's overall personality, knowledge, and behaviour.

**When It Activates:** Every single conversation, from the very first message to the last.

**What It Controls:**
- How LedgerBot introduces itself and responds to you
- Australian accounting standards and GST compliance knowledge
- Transaction recording and financial reporting capabilities
- Communication style (professional yet approachable)
- Business context awareness (your industry and company information)
- Chart of accounts integration for accurate coding
- Validation rules and error checking

**Customisation Benefits:**
- Add industry-specific terminology and regulations
- Include your actual chart of accounts for precise suggestions
- Set communication preferences (detail level, formality)
- Define business-specific policies and procedures
- Integrate company information automatically

**Example Without Customisation:**
> "LedgerBot here. I can help you record a transaction. What would you like to do?"

**Example With Customisation:**
> "Hi Sarah, I can help record this transaction for Acme Retail. Based on your office supplies inventory, should this be coded to 5100 - Cost of Goods Sold or 6200 - Operating Supplies?"

### 2. Code Prompt (Python Generation)

**Purpose:** Specialised instructions specifically for generating Python code artifacts.

**When It Activates:** Only when you ask LedgerBot to create Python code snippets or scripts.

**What It Controls:**
- Code quality standards (clear variable names, proper comments)
- Financial calculation accuracy (using Decimal for currency, never float)
- Australian compliance patterns (GST calculations, date formats)
- Security practices (no hardcoded credentials, input sanitisation)
- Error handling approaches (validation, meaningful error messages)
- Code structure preferences (functions, classes, organisation)

**Customisation Benefits:**
- Add company-specific code patterns or libraries
- Define preferred coding styles or conventions
- Include common calculation formulas you use
- Set up integration patterns for your systems

**Example Code Generation:**

*User asks:* "Create Python code to calculate GST on these invoice amounts"

*Without customisation:* Generic Python code with basic GST formula

*With customisation:* Python code that matches your coding standards, uses your preferred libraries, includes Australian-compliant date handling, and follows your error handling patterns

### 3. Spreadsheet Prompt (Excel/CSV Generation)

**Purpose:** Specialised instructions specifically for creating spreadsheet artifacts.

**When It Activates:** Only when you ask LedgerBot to create spreadsheets, CSV files, or Excel-compatible formats.

**What It Controls:**
- Spreadsheet formatting standards (headers, currency format, date format)
- Formula construction rules (must use formulas, not hardcoded calculations)
- Australian accounting report layouts (Profit & Loss, Balance Sheet, BAS)
- GST calculation formulas and BAS label references
- Professional colour coding (blue for inputs, black for calculations)
- Zero-error requirement (no formula errors allowed)
- Data validation rules

**Customisation Benefits:**
- Define preferred report templates and layouts
- Set company-specific formatting standards
- Include chart of account codes in reports
- Add custom report types you frequently need

**Example Spreadsheet Generation:**

*User asks:* "Create a spreadsheet showing August invoices"

*Without customisation:* Generic spreadsheet with basic columns

*With customisation:* Professional spreadsheet with your company header, proper Australian date format (DD/MM/YYYY), GST shown separately, accounts coded to your chart, formatted with industry-standard colours, and formulas for all calculations

---

## Accessing Prompt Settings

### Navigation Path

1. **Log in to LedgerBot** using your credentials
2. **Click your profile icon** in the top right corner
3. **Select "Settings"** from the dropdown menu
4. **Navigate to "Personalisation"** in the left sidebar

You'll arrive at the Personalisation Settings page where you can manage all prompt-related settings.

### Settings Page Layout

The Personalisation page is organised into several sections:

**Profile Section** (Top)
- Displays your name and email from Clerk authentication
- This information is automatically used in prompts
- Profile details cannot be edited here, managed through your account settings

**Template Variables Section** (Middle)
- Company Name field with placeholder example
- Industry / Business Information textarea for detailed context
- Chart of Accounts textarea for your accounting structure
- Variable browser button to insert template placeholders
- Validation warnings for undefined variables
- Preview pane showing how variables will appear

**Custom Variables Section** (Below Template Variables)
- List of your existing custom variables
- Add new variable button and form
- Variable name and value input fields
- Validation for proper variable naming
- Remove variable buttons

**Xero Integration Section** (If Connected)
- Shows active Xero organisation
- Displays synced chart of accounts count
- Last sync timestamp
- Link to view full chart of accounts
- Company selector for multiple Xero organisations

**System Prompts Section** (Bottom)
- Three expandable sections for each prompt type
- Large text areas for viewing and editing prompts
- Reset to defaults buttons for each prompt
- Save buttons to apply changes

---

## Template Variables Explained

### What Are Template Variables?

Template variables are placeholders that automatically get replaced with actual information when LedgerBot processes your prompts. They work like mail merge fields in a document template.

**The Concept:**
- You write: "You are assisting {​{FIRST_NAME}​} at {​{COMPANY_NAME}​}"
- LedgerBot sees: "You are assisting Sarah at Acme Retail Pty Ltd"

**Benefits:**
- Write prompts once, use everywhere with current information
- Automatically include data from multiple sources (user profile, Xero, custom fields)
- Keep prompts clean and maintainable
- Update information in one place, applies everywhere
- No need to manually update prompts when details change

### Standard Variables (Always Available)

These variables are automatically available and populated from your user profile and integrations:

**{​{FIRST_NAME}​}**
- Your first name from Clerk authentication
- Example value: "Sarah"
- Used for: Personalising greetings and instructions

**{​{LAST_NAME}​}**
- Your last name from Clerk authentication
- Example value: "Johnson"
- Used for: Formal identification, full name references

**{​{COMPANY_NAME}​}**
- Company name you enter in settings
- Example value: "Acme Retail Pty Ltd"
- Used for: Business identification, report headers

**{​{INDUSTRY_CONTEXT}​}**
- Industry and business information textarea content
- Example value: "Retail business selling office supplies with 3 locations across NSW"
- Used for: Providing business context to AI responses

**{​{CHART_OF_ACCOUNTS}​}**
- Your chart of accounts (manual entry or Xero sync)
- Example value: "1000 - Cash at Bank, 1100 - Accounts Receivable, 2000 - Accounts Payable..."
- Used for: Account coding suggestions, transaction categorisation

**{​{CUSTOM_SYSTEM_INSTRUCTIONS}​}**
- Additional instructions for system behaviour
- User-editable section within locked base prompt
- Used for: Adding specific preferences without rewriting entire prompt

### Creating Custom Variables

You can create your own template variables for frequently referenced information.

**Use Cases:**
- Business addresses and contact details
- Key customer or supplier names
- Common reporting periods or financial years
- Special business policies or procedures
- Frequently referenced information

**How to Create:**

1. **Navigate to Custom Variables section** on the Personalisation page
2. **Click "Add New Variable"** button
3. **Enter Variable Name** (uppercase letters, numbers, and underscores only)
   - Good: BUSINESS_ADDRESS, REPORTING_PERIOD, KEY_CONTACTS
   - Bad: business address, Address1, my-variable
4. **Enter Variable Value** (the actual text to insert)
5. **Click "Add Variable"** or press Ctrl+Enter
6. **Use in templates** with the "Insert Variable" button

**Variable Naming Rules:**
- Must start with a letter or underscore
- Can only contain uppercase letters, numbers, and underscores
- Cannot contain spaces or special characters
- Must be unique (no duplicates)
- Descriptive names help maintain clarity

**Example Custom Variables:**

```
Variable: BUSINESS_ADDRESS
Value: Level 3, 123 Main Street, Sydney NSW 2000

Variable: REPORTING_PERIOD
Value: July 2024 to June 2025 (FY2025)

Variable: KEY_CONTACTS
Value: Primary accountant: John Smith (john@acme.com.au), Tax agent: Jane Doe (jane@taxagents.com.au)

Variable: PAYMENT_TERMS
Value: Standard payment terms are Net 30 days. Major customers have Net 45 days.
```

### Using Variables in Templates

**Inserting Variables:**

1. **Place cursor** where you want the variable inserted
2. **Click "Insert Variable"** button (looks like a dropdown with placeholder icon)
3. **Select the variable** from the browser
4. **Variable placeholder** is inserted at cursor position: {​{VARIABLE_NAME}​}

**Variable Browser Features:**
- Lists all available variables (standard and custom)
- Shows variable names and descriptions
- Quick insertion at cursor position
- Organised by type (standard vs custom)

**Validation Warnings:**

The system automatically checks for problems:

- **Undefined Variables**: Yellow warning if you reference a variable that doesn't exist
- **Empty Values**: Alert if a variable is defined but has no value
- **Typos**: Highlights when variable name doesn't match any definition

**Preview Pane:**

Below the template fields, you'll see a preview showing:
- How variables will be substituted
- Actual text that will be sent to the AI
- Any undefined variables highlighted
- Final prompt length

---

## Customising Your System Prompt

### When to Customise

**Good Reasons to Customise:**
- Your industry has specific terminology or regulations (hospitality, construction, healthcare)
- You want the AI to reference your actual chart of accounts
- Your business has unique processes or policies
- You need specific detail levels or communication styles
- You want to emphasise particular compliance requirements

**When to Stick with Defaults:**
- You're just starting out and learning the system
- You run a general business without special requirements
- You're not sure what to change yet
- The default prompts are working well for you

**Safe Approach:**
Start with defaults, note what doesn't work for you over a few weeks, then make targeted customisations based on actual needs.

### Editing the System Prompt

**Step-by-Step Process:**

1. **Scroll to "System Prompts" section** on the Personalisation page
2. **Expand the "System Prompt"** accordion
3. **Review the default prompt** to understand the structure
4. **Identify sections to customise**:
   - Role and Purpose (opening paragraph)
   - Custom Instructions (middle section with placeholder)
   - Australian Business Context
   - Industry-Specific Context (uses {​{INDUSTRY_CONTEXT}​})
   - Chart of Accounts (uses {​{CHART_OF_ACCOUNTS}​})
5. **Make your changes** in the textarea
6. **Use template variables** to keep it dynamic
7. **Check for validation warnings** (undefined variables)
8. **Preview the substituted prompt** in the preview pane
9. **Click "Save System Prompts"** to apply changes

**What to Customise:**

**Role Description:** Adjust the opening paragraph to emphasise aspects important to your business.
- Default: "expert accounting assistant for Australian businesses"
- Healthcare: "expert accounting assistant specialising in healthcare practice management for Australian medical businesses"
- Construction: "expert accounting assistant specialising in construction project accounting for Australian building businesses"

**Custom Instructions Section:** The {​{CUSTOM_SYSTEM_INSTRUCTIONS}​} placeholder is specifically for your additions without rewriting the entire prompt.

**Industry Context:** Use the {​{INDUSTRY_CONTEXT}​} variable to inject business-specific information that the AI should always consider.

**Chart of Accounts:** Use the {​{CHART_OF_ACCOUNTS}​} variable so the AI can suggest accurate account codes.

**Communication Style:** Adjust the "Communication Style" section to set preferred tone and detail level.

### Resetting to Defaults

If your customisations aren't working as expected:

1. **Click "Reset to Default"** button below the prompt
2. **Confirm the reset** in the dialog
3. **Review the default prompt** that's been restored
4. **Save to apply** the default prompt

**What Happens:**
- Your custom prompt is discarded
- The system loads the latest default prompt from the installation
- Template variable placeholders remain in place
- Your template variable values are preserved (company name, industry context, etc.)
- You get any improvements made to the default prompt since you customised

---

## How Prompts Work in Conversations

### Prompt Loading and Application

**Every Message You Send:**

1. **You type a message** in the chat interface: "Help me record this supplier invoice"
2. **System loads your settings** including all prompt customisations and template variables
3. **Variables are substituted** with actual values (your name, company name, chart of accounts, etc.)
4. **System prompt is attached** to your message as invisible context
5. **AI model receives** the system prompt + your entire conversation history + your new message
6. **AI generates response** following the instructions in the system prompt
7. **Response appears** in the chat interface

**Important Concept:**
The AI doesn't "remember" your system prompt permanently. It needs to be provided fresh with every single message. This is why template variables are so powerful - they ensure current information is always included.

### When System Prompt Is Applied

**Always Applied:**
- Every single message in every conversation
- Opening message when you start a new chat
- Follow-up messages in ongoing conversations
- When you switch between different chats
- After you make changes to settings (applied to next message)

**Consistency Guarantee:**
Because the prompt is included with every message, the AI will consistently follow your instructions throughout the entire conversation. Changes you make to settings only apply to messages sent after you save.

### When Specialised Prompts Activate

**Code Prompt Activation:**

The code prompt is added when:
- You explicitly ask for Python code: "Write Python code to calculate GST"
- You request a code artifact: "Create a script for this task"
- LedgerBot determines code is the best response format

**What Gets Combined:**
- System prompt (main instructions)
- Code prompt (Python-specific standards)
- Your message (the specific request)

**Result:** Code generated follows both your general business preferences (from system prompt) and coding standards (from code prompt).

**Spreadsheet Prompt Activation:**

The spreadsheet prompt is added when:
- You explicitly ask for a spreadsheet: "Create a CSV of August invoices"
- You request a report in tabular format: "Show me a comparison table"
- LedgerBot determines a spreadsheet is the best format

**What Gets Combined:**
- System prompt (main instructions including chart of accounts)
- Spreadsheet prompt (Excel-specific formatting rules)
- Your message (the specific data and structure you want)

**Result:** Spreadsheet generated follows your business standards (account codes, formatting) and professional Excel conventions (formulas, formatting, validation).

### How Prompts Combine with User Messages

**The Combination Process:**

Think of it like making a sandwich with layers:

1. **Bottom Layer (Foundation):** System prompt with all your business context
2. **Middle Layer (History):** Your previous messages and LedgerBot's responses
3. **Top Layer (Request):** Your new message
4. **Special Sauce (Optional):** Specialised prompt if creating an artifact

**Example Combination:**

*Your System Prompt Extract:*
"You are assisting Sarah Johnson at Acme Retail Pty Ltd. The business operates 3 retail locations in NSW selling office supplies..."

*Your Conversation History:*
You: "Show me the supplier invoices from last month"
LedgerBot: "I found 12 supplier invoices from August 2024..."

*Your New Message:*
"Create a spreadsheet showing these invoices"

*Spreadsheet Prompt Added:*
"Create professional Excel spreadsheets with formulas, Australian date format, zero formula errors..."

*What the AI Model Receives:*
All of the above combined, so it knows:
- Who you are and what business you run
- What you were just discussing (August supplier invoices)
- What you want now (spreadsheet of those invoices)
- How to format it (Australian standards, professional layout)

### Context from Xero and Files

**Xero Integration:**

When you have an active Xero connection:

1. **Chart of accounts** automatically synced and included in prompts via {​{CHART_OF_ACCOUNTS}​}
2. **Xero tools available** for AI to query your live data (invoices, contacts, transactions)
3. **Organisation context** included (business name, address, registration details)

**The AI Can:**
- Reference your actual account codes when suggesting transactions
- Query your Xero data in real-time during conversation
- Generate reports using live Xero information
- Verify coding against your actual chart structure

**Context Files:**

When you upload context files:

1. **Files are processed** (text extraction, token counting)
2. **Relevant files selected** based on conversation topic
3. **File content added** to message context automatically
4. **AI references** uploaded documents when responding

**Use Cases:**
- Upload supplier contracts for reference during transaction coding
- Include policy documents for compliance checking
- Add previous reports for format consistency
- Reference regulatory documents for accurate advice

---

## Best Practices for Customisation

### Tips for Effective System Prompt Customisation

**Start Simple:**
- Begin with just company name and industry context
- Don't try to customise everything at once
- Add more detail as you learn what's helpful
- Test changes with a few conversations before expanding

**Be Specific:**
- Vague: "I run a business"
- Better: "I run a retail business"
- Best: "I run a retail office supplies business with 3 locations in NSW, 15 staff, and $2M annual turnover, serving small businesses and schools"

**Use Template Variables Effectively:**
- Create variables for information you'll update regularly
- Don't hardcode dates or periods that will become outdated
- Use variables to separate concerns (business info vs personal preferences)

**Keep It Maintainable:**
- Organise custom instructions into clear sections
- Add comments to explain why you included something
- Use consistent formatting and structure
- Document any special requirements or unusual instructions

**Test Your Changes:**
- Start a new conversation after saving changes
- Try typical requests to see how AI responds
- Check that variables are substituted correctly
- Verify AI follows your new instructions

### Common Mistakes to Avoid

**Over-Customisation:**
- Don't delete critical sections from default prompts
- Don't rewrite everything when small additions would work
- Avoid making prompts too long (slow processing, higher costs)
- Don't include information the AI doesn't need for every task

**Unclear Instructions:**
- Avoid conflicting instructions (be formal AND casual)
- Don't use ambiguous language (maybe, sometimes, try to)
- Prevent contradictions between different sections
- Be explicit about priorities when requirements conflict

**Hardcoded Information:**
- Don't put dates or periods directly in prompts
- Avoid specific transaction references that will become outdated
- Don't include temporary information that changes frequently
- Use template variables for anything that might need updating

**Variable Misuse:**
- Don't create variables for one-time information
- Avoid too many variables (makes prompts hard to read)
- Don't use confusing or similar variable names
- Prevent undefined variable references

### Industry-Specific Prompt Strategies

**Retail Businesses:**

Focus on:
- Inventory and cost of goods sold accounting
- Multiple location management and consolidation
- Seasonal variations and trends
- GST treatment for different product types
- Point-of-sale system integration

Example addition:
"When coding transactions, prioritise clarity between inventory purchases (5000 - COGS) and operating expenses (6000 range). Consider our three locations separately for reporting."

**Professional Services:**

Focus on:
- Time-based billing and work-in-progress
- Client trust account management
- Professional indemnity and compliance
- Expense allocation to clients or matters
- Revenue recognition for staged work

Example addition:
"Track expenses by client matter code. Distinguish between billable disbursements and internal operating expenses. Revenue is recognised on invoice, not on work-in-progress."

**Hospitality:**

Focus on:
- High transaction volume and cash handling
- Wage cost management and award compliance
- Inventory turnover and waste
- Liquor licensing compliance and reporting
- GST treatment for different service types

Example addition:
"Wages are our highest expense - code all payroll accurately. Distinguish between GST-free food sales and GST-inclusive alcohol and dining. Track daily cash reconciliations."

**Construction and Trades:**

Focus on:
- Job costing and project profitability tracking
- Progress claims and retention accounting
- Subcontractor payment management
- Equipment depreciation and maintenance
- Security of payment legislation compliance

Example addition:
"Track costs and revenue by project code. Monitor retention amounts held and owing. Distinguish between materials (COGS) and labour (operating). Apply progress-based revenue recognition."

### Testing Your Custom Prompts

**Systematic Testing Approach:**

1. **Define Test Scenarios:**
   - List 5-10 typical tasks you perform regularly
   - Include edge cases or complex scenarios
   - Cover different prompt types (general, code, spreadsheet)

2. **Start New Conversations:**
   - Changes only apply to new messages
   - Start fresh chat to test updated prompts
   - Don't rely on existing conversation history

3. **Check Variable Substitution:**
   - Verify placeholders are replaced correctly
   - Ensure no undefined variables remain
   - Check Xero data is included if connected

4. **Evaluate Responses:**
   - Does AI follow new instructions?
   - Are account codes suggested correctly?
   - Is communication style appropriate?
   - Are industry-specific considerations applied?

5. **Iterate and Refine:**
   - Note what works and what doesn't
   - Make small adjustments based on results
   - Test again after changes
   - Keep refining until satisfied

### Balancing Specificity and Flexibility

**The Challenge:**
Too specific = AI can't adapt to different situations
Too vague = AI doesn't have enough guidance

**The Balance:**

**Be Specific About:**
- Business structure and operations (unchanging facts)
- Chart of accounts structure and coding rules
- Compliance requirements and regulations
- Communication preferences and tone
- Data formats and standards (dates, currency, terminology)

**Stay Flexible About:**
- How AI should respond to different request types
- Problem-solving approaches and methods
- Level of detail (let AI gauge from user's question)
- Technical implementation details
- Response format (unless specifically required)

**Example of Good Balance:**

Specific: "Our chart of accounts uses a 4-digit numbering system. Always suggest account codes when recording transactions."

Flexible: "Adapt response detail to the user's question. If they ask for a quick summary, be concise. If they ask for detailed analysis, provide comprehensive information with calculations shown."

---

## System Architecture (Technical)

This section is intended for developers, system administrators, and technically-minded users who want to understand how prompts flow through the LedgerBot system.

### How Prompts Flow from Settings to Conversations

**The Complete Journey:**

**Step 1: User Sends Message**
- User types message in chat interface
- Frontend sends POST request to chat API route
- Request includes user ID, chat ID, message content

**Step 2: Authentication and Settings Load**
- Chat API route authenticates the request using Clerk
- System calls `getUserSettings()` function
- Function queries database for user's settings record

**Step 3: Template Variable Assembly**
- System builds `templateVars` object with standard variables
- Includes firstName and lastName from Clerk profile
- Adds companyName, industryContext from database settings
- Adds customVariables from database (user-created variables)
- Fetches Xero chart of accounts if connection exists

**Step 4: Chart of Accounts Enrichment**
- If Xero connected: `getDecryptedConnection()` retrieves active connection
- System calls `getChartOfAccounts()` to fetch live data
- Chart formatted with `formatChartOfAccountsForPrompt()` for AI consumption
- If no Xero: Falls back to manual `chartOfAccounts` from database

**Step 5: Prompt Loading and Substitution**
- System loads base prompt from filesystem (not database)
- `default-system-prompt.md` read from prompts directory
- `substituteTemplateVariables()` replaces all placeholders
- Returns complete prompt with all variables substituted

**Step 6: Context Building**
- Geolocation hints added from Vercel Functions
- User context assembled (location, Xero status)
- Active documents list compiled (for artifact awareness)
- Tool availability determined (Xero tools if connected)

**Step 7: Prompt Combination**
- `systemPrompt()` function combines all elements
- Base prompt + request hints + user context
- Adds artifacts prompt if artifact tools active
- Includes specialised prompt if creating code/spreadsheet

**Step 8: AI Model Invocation**
- Combined prompt sent to AI model via AI Gateway
- Model processes with conversation history
- Streaming response generated
- Response sent back to user

**Step 9: Persistence**
- Message and response saved to database
- Token usage tracked via TokenLens
- Conversation context updated
- Stream closed

### Prompt Storage in the Database

**UserSettings Table Structure:**

The database stores user-specific prompt customisations in the `UserSettings` table:

**Legacy Fields (Deprecated, Kept for Migration):**
- `systemPrompt` (text): Old full system prompt storage
- `codePrompt` (text): Old full code prompt storage
- `sheetPrompt` (text): Old full spreadsheet prompt storage

**Current Fields (Active):**
- `customSystemInstructions` (text): User additions to base prompt
- `customCodeInstructions` (text): User additions to code prompt
- `customSheetInstructions` (text): User additions to spreadsheet prompt
- `companyName` (varchar): Company name variable value
- `industryContext` (text): Industry information variable value
- `chartOfAccounts` (text): Manual chart of accounts (if no Xero)
- `customVariables` (jsonb): User-defined variable name-value pairs

**Why This Structure:**

**Separation of Concerns:**
- Base prompts stored as files, managed by developers
- User customisations stored in database, managed by users
- Clear distinction between "system defaults" and "user preferences"

**Version Control:**
- Base prompts tracked in git repository
- Can be updated with bug fixes or improvements
- Users automatically get updated base prompts
- Custom additions preserved during updates

**Flexibility:**
- Users can add instructions without rewriting everything
- System can change base prompt structure without breaking user customisations
- Easier to migrate or reset if needed

### Default Prompt Loading Mechanism

**File System Loading:**

**Location:** `/prompts/` directory in project root

**Files:**
- `default-system-prompt.md`: Main accounting assistant prompt
- `default-code-prompt.md`: Python code generation standards
- `default-spreadsheet-prompt.md`: Excel generation requirements
- `README.md`: Documentation for maintaining prompts

**Loading Process:**

**Function:** `loadDefaultSystemPrompt()` in `/app/(settings)/api/user/data.ts`

**Steps:**
1. Constructs file path to prompts directory
2. Reads markdown file using `readFileSync()`
3. Returns file content as string
4. Falls back to basic prompt if file read fails

**Fallback Strategy:**

If file cannot be read (permissions, missing file, corrupted):
- Returns hardcoded minimal prompt
- Logs error to console
- System continues functioning with basic capability
- User can still send messages and receive responses

**Benefits of File System Storage:**

- Easy to edit with text editors or IDE
- Version control friendly (git diff shows changes clearly)
- Can be updated by deploying new code
- No database migration needed for prompt improvements
- All users get updates simultaneously when deployed

### User-Specific Prompt Overrides

**Override Mechanism:**

**Database Priority:**
If user has custom additions in database:
- `customSystemInstructions` appended to base system prompt
- `customCodeInstructions` appended to base code prompt
- `customSheetInstructions` appended to base spreadsheet prompt

**Template Variable Priority:**
- User values override defaults
- Xero data overrides manual entry (for chart of accounts)
- Empty values replaced with empty string (placeholder removed)

**No Override:**
- Base prompt structure cannot be modified by users
- Core instructions always included
- Safety features and constraints always enforced

**Example Override Flow:**

**Base System Prompt (from file):**
"You are Ledgerbot, an expert accounting assistant. You help with transaction recording, GST compliance, and financial reporting..."

**User's Custom Instructions (from database):**
"Always use job cost codes when recording expenses. Our job format is XXX-YYYY where XXX is project number."

**Final Combined Prompt:**
Base prompt + "... Additional custom instructions: Always use job cost codes when recording expenses. Our job format is XXX-YYYY where XXX is project number."

---

## The Prompt Hierarchy

### Default Prompts (Shipped with LedgerBot)

**What They Are:**
The foundational prompts included with every LedgerBot installation, carefully crafted by the development team to provide comprehensive accounting capabilities.

**System Prompt Includes:**
- Role definition as Australian accounting assistant
- Core accounting capabilities (transactions, reports, reconciliation)
- Australian business context (GST, BAS, ATO, financial year)
- Chart of accounts structure understanding
- Communication style guidelines
- Australian English terminology and spelling
- Validation rules and error handling
- Privacy and confidentiality standards

**Code Prompt Includes:**
- Python code quality standards
- Financial calculation accuracy requirements (Decimal, not float)
- Australian compliance patterns (GST formula, date format)
- Security best practices (no credentials, parameterised queries)
- Error handling approaches
- Common code patterns (data import, report generation, API integration)

**Spreadsheet Prompt Includes:**
- Zero formula errors requirement
- Professional formatting standards
- Australian accounting report formats (P&L, Balance Sheet, BAS)
- GST calculation formulas
- Colour coding conventions
- Formula construction rules

**Update Policy:**
- Updated by development team as needed
- Improvements deployed with new releases
- Bug fixes applied to production
- Users automatically receive updates
- Custom user additions preserved during updates

### User Customisations (Stored in Database)

**What They Are:**
Individual user's additions and preferences that personalise their experience without changing the core system behaviour.

**Customisation Types:**

**Template Variables:**
- Company name
- Industry and business context
- Manual chart of accounts entry
- Custom user-created variables

**Custom Instructions:**
- Additional system behaviour preferences
- Code generation preferences
- Spreadsheet formatting preferences

**Settings:**
- Default AI model selection
- Reasoning mode preference
- Communication preferences

**Persistence:**
- Stored in PostgreSQL database
- Linked to user ID (one settings record per user)
- Survives application restarts
- Backed up with database backups
- Can be exported/imported if needed

### Priority and Fallback Logic

**The Priority Order (Highest to Lowest):**

**1. Live Xero Data** (if connected and available)
- Chart of accounts from active Xero connection
- Real-time account codes and structure
- Organisation details and settings
- Overrides manual chart of accounts entry

**2. User Template Variables** (if defined in database)
- Company name from settings
- Industry context from settings
- Manual chart of accounts (if no Xero)
- Custom variables from settings

**3. Clerk Profile Data** (always available)
- First name from authentication
- Last name from authentication
- Email address

**4. Database Custom Instructions** (if user added)
- Custom system instructions
- Custom code instructions
- Custom spreadsheet instructions

**5. Default Base Prompts** (always applied)
- Default system prompt from file
- Default code prompt from file
- Default spreadsheet prompt from file

**6. Hardcoded Fallbacks** (emergency only)
- Used only if files cannot be read
- Minimal functionality
- Ensures system remains operational

**Fallback Scenarios:**

**Xero Connection Fails:**
- Falls back to manual chart of accounts from database
- If manual also empty, chart section remains empty
- System continues functioning without chart reference

**Template Variable Undefined:**
- Placeholder replaced with empty string
- No error thrown
- Prompt structure preserved
- Validation warning shown in UI

**File Read Error:**
- Falls back to hardcoded minimal prompt
- Error logged to console
- System remains operational
- User should contact support

**Database Query Fails:**
- Uses default values for all settings
- No custom variables available
- System continues with basic functionality
- Error logged for debugging

---

## Conversation Flow

### Request Arrives with User Message

**User Interface Actions:**

**1. User Types Message:**
- User enters text in multimodal input field
- May include file attachments (images, PDFs, documents)
- May select artifacts to reference
- Clicks send button or presses Enter

**2. Frontend Validation:**
- Checks message is not empty
- Validates any file attachments
- Ensures chat ID exists or creates new
- Prepares request payload

**3. HTTP Request Sent:**
- POST request to `/api/chat` endpoint
- Includes user message content
- Contains chat ID (existing or new)
- Passes file references if attached
- Includes visibility setting for new chats

### System Loads User Settings

**Authentication Check:**

**1. Token Validation:**
- Clerk middleware verifies authentication token
- Extracts user ID from session
- Ensures user has valid active session
- Rejects unauthenticated requests

**2. Rate Limiting:**
- Checks message count for user today
- Compares against entitlement limit
- Allows request if under limit
- Rejects with error if over limit

**Settings Retrieval:**

**1. Database Query:**
- Calls `getUserSettings()` function
- Queries UserSettings table by user ID
- Retrieves all customisation fields
- Gets Clerk profile for firstName/lastName

**2. Xero Connection Check:**
- Calls `getActiveXeroConnection()` function
- Retrieves active connection if exists
- Decrypts OAuth tokens
- Fetches chart of accounts from Xero or database

**3. Default Merging:**
- Combines database values with defaults
- Fills in missing fields with default values
- Ensures all expected fields present
- Constructs complete settings object

### System Prompt Is Retrieved

**Prompt Loading:**

**1. Base Prompt Load:**
- Reads `default-system-prompt.md` from filesystem
- Reads code and spreadsheet prompts if needed
- Falls back to hardcoded prompt if file read fails
- Stores prompt text in memory

**2. Template Variable Assembly:**
- Creates `templateVars` object
- Populates standard variables (FIRST_NAME, LAST_NAME, etc.)
- Adds custom variables from database
- Includes Xero chart if available

**3. Variable Substitution:**
- Calls `substituteTemplateVariables()` function
- Finds all {​{VARIABLE}​} placeholders in prompt
- Replaces with actual values from templateVars
- Removes placeholders with no value (replaced with empty string)
- Returns fully substituted prompt text

### Prompt Combined with Conversation History

**History Retrieval:**

**1. Load Chat Messages:**
- Queries Message_v2 table by chat ID
- Retrieves all previous messages in conversation
- Orders by creation timestamp (oldest first)
- Limits to recent history for context window management

**2. Convert to UI Format:**
- Transforms database messages to AI SDK format
- Separates user and assistant messages
- Includes tool calls and results
- Preserves message parts (text, attachments, reasoning)

**Context Assembly:**

**1. Build Request Hints:**
- Extracts geolocation from Vercel Functions
- Includes latitude, longitude, city, country
- Adds user context (file references, Xero status)
- Lists active documents in conversation

**2. System Prompt Combination:**
- Calls `systemPrompt()` function
- Combines base prompt + request hints + user context
- Adds artifacts prompt if creating documents
- Adds active documents context for awareness

**3. Message Array Construction:**
- System message (first): Combined prompt
- Conversation history (middle): Previous user and assistant messages
- New user message (last): Current request

### AI Generates Response Using Combined Context

**Model Selection:**

**1. Determine Model:**
- Uses user's `defaultModel` from settings
- Falls back to default if not specified
- Checks if reasoning model based on configuration
- Selects appropriate model from AI Gateway

**2. Reasoning Mode:**
- Applies if model supports reasoning (Claude, Gemini)
- Uses `extractReasoningMiddleware` for reasoning models
- Excludes artifacts and tools for reasoning models
- Pure text response with thinking tags

**Tool Selection:**

**1. Base Tools Always Available:**
- `createDocument`: Create new artifacts
- `updateDocument`: Modify existing artifacts
- `getWeather`: Location-based weather data
- `requestSuggestions`: Document improvement suggestions

**2. Conditional Xero Tools:**
- Checks for active Xero connection
- If connected, adds Xero tools to available tools list
- Tools: list_invoices, get_invoice, list_contacts, get_contact, list_accounts, get_organisation, get_bank_transactions, list_journal_entries

**3. Tool Names Array:**
- Constructs array of active tool names
- Passed to `experimental_activeTools` in streamText call
- Tells AI which tools it can use in response

**AI SDK Call:**

**1. Stream Configuration:**
- `streamText()` from Vercel AI SDK
- Max duration: 60 seconds
- Smooth streaming with word-level chunking
- Step limit: 5 turns
- Temperature and other parameters from model config

**2. Request Execution:**
- Model receives: system prompt + history + new message
- Model generates: text response and/or tool calls
- Streaming response sent back in real-time
- Reasoning extracted if reasoning model

**3. Tool Execution:**
- If model calls a tool, tool function executes
- Tool result returned to model
- Model continues generating with tool result
- May call multiple tools in sequence

### Streaming Response Processing

**Real-time Updates:**

**1. UI Message Stream:**
- `createUIMessageStream()` establishes stream
- Events sent to frontend as they arrive
- Message parts rendered incrementally
- Tool calls shown in UI

**2. Data Stream Chunks:**
- Text chunks: Display in real-time
- Tool calls: Show tool name and parameters
- Tool results: Show execution result
- Reasoning: Display extracted thinking

**3. Frontend Rendering:**
- React components subscribe to stream
- Message content updates as chunks arrive
- Artifacts render in side panel
- Smooth user experience with live updates

**Completion Handling:**

**1. OnFinish Callback:**
- Triggered when stream completes
- Receives full message content and metadata
- Includes token usage information

**2. Token Usage Tracking:**
- TokenLens integration calculates costs
- Model catalog cached for 24 hours
- Prompt tokens, completion tokens, total tracked
- Cost calculated based on model pricing

**3. Database Persistence:**
- Full message content saved to Message_v2 table
- Token usage saved to Chat table
- Documents saved to Document table if created
- Conversation context updated

---

## Artifact Generation Process

Artifacts are special UI components that render AI-generated content (documents, code, spreadsheets) in a side panel while maintaining the conversation in the main area. Understanding how prompts influence artifact generation helps you get better results.

### User Requests Code or Spreadsheet

**Request Detection:**

**Code Request Indicators:**
- Explicit: "Write Python code to...", "Create a script for...", "Generate code that..."
- Implicit: "Calculate GST from these amounts", "Import this CSV file", "Process these transactions"
- Action-oriented: "Help me automate...", "Build a function to..."

**Spreadsheet Request Indicators:**
- Explicit: "Create a spreadsheet showing...", "Make a CSV of...", "Generate an Excel file with..."
- Implicit: "Show me a table of...", "List all...", "Compare these amounts..."
- Report-oriented: "Monthly summary", "Invoice listing", "Transaction report"

**Artifact Awareness:**
- AI knows which documents already exist in conversation
- References active documents when user says "update it", "change the spreadsheet"
- Decides between `createDocument` (new) vs `updateDocument` (modify existing)

### AI Recognises Artifact Request

**Decision Process:**

**Content Analysis:**
- Parses user message for artifact indicators
- Considers conversation context
- Evaluates if response better as artifact vs inline text
- Checks if existing artifact should be updated

**Tool Selection:**
- Chooses `createDocument` for brand new content
- Chooses `updateDocument` for modifications to existing
- Sets `kind` parameter: 'text', 'code', or 'sheet'
- Constructs title parameter with instructions

**Critical Title Construction:**

The title parameter serves two purposes:
1. **User-visible title** (before pipe): Brief 2-5 word description shown in UI
2. **Generation instructions** (after pipe): Complete detailed instructions with all data

**Format:** "Brief Title | Detailed generation instructions with all necessary data"

**Example:**
```
title: "August Invoices | Create a CSV file with the following Xero invoice data: [complete JSON array with all invoice records]. Format with columns: Invoice Number, Customer Name, Date, Total (inc GST), Amount Due, Status"
```

**Why This Matters:**
Artifact generators are isolated - they cannot see conversation history, tool results, or previous messages. All data must be embedded in the title parameter.

### Specialised Prompt Activates

**Prompt Selection:**

**For Code Artifacts:**
- System loads `default-code-prompt.md` (or user's custom code prompt)
- Substitutes template variables if any used
- Prompt emphasises Python standards and financial accuracy
- Includes security and error handling requirements

**For Spreadsheet Artifacts:**
- System loads `default-spreadsheet-prompt.md` (or user's custom sheet prompt)
- Substitutes template variables if any used
- Prompt emphasises zero formula errors and professional formatting
- Includes Australian report formats and GST calculation formulas

**For Text Artifacts:**
- No specialised prompt (uses system prompt only)
- Benefits from system prompt's business context and chart of accounts
- Applies communication style preferences

### System Prompt + Specialised Prompt Combine

**Combination Strategy:**

**1. Base Layer (System Prompt):**
- Full system prompt with all business context
- Chart of accounts for accurate coding
- Communication preferences
- Australian standards and terminology

**2. Specialised Layer (Code or Spreadsheet Prompt):**
- Technical requirements specific to artifact type
- Format and structure rules
- Quality standards and validation
- Tool-specific best practices

**3. User Request Layer:**
- The title parameter with complete instructions
- All data embedded in title (JSON, numbers, text)
- Specific formatting or structure requests
- Expected output described

**Combined Effect:**

The AI model receives comprehensive instructions:
- **Who:** It's assisting you at your company (from system prompt)
- **What business:** Your industry and operations (from system prompt)
- **What accounts:** Your chart of accounts structure (from system prompt)
- **What to create:** Specific artifact type with detailed requirements (from specialised prompt)
- **What data:** Actual data to use (from title parameter)
- **How to format:** Professional standards and preferences (from specialised prompt)

**Example Combined Context for Spreadsheet:**

*System Prompt Extract:*
"You are assisting Sarah Johnson at Acme Retail Pty Ltd. Your chart of accounts uses 4-digit codes: 4000-Sales Revenue, 5000-COGS, 6000-Operating Expenses..."

*Spreadsheet Prompt Extract:*
"Create professional spreadsheets with zero formula errors. Use Australian date format DD/MM/YYYY. Always use formulas not hardcoded calculations. GST rate is 10%..."

*Title Parameter:*
"August Invoices | Create CSV with invoice data: [complete JSON with 15 invoices]. Include columns: Date, Invoice #, Customer, Amount inc GST, Amount ex GST, GST, Status"

*Result:*
Spreadsheet generated with proper account codes, Australian formatting, GST calculations using formulas, and all 15 invoices from the data.

### AI Generates Artifact with Both Contexts

**Generation Process:**

**1. Model Processes Combined Prompt:**
- Reads system prompt for business rules
- Reads specialised prompt for technical standards
- Reads title for specific data and instructions
- Synthesises all requirements

**2. Content Generation:**
- Creates artifact content following all rules
- Uses actual data from title parameter
- Applies formatting from specialised prompt
- References business context from system prompt

**3. Validation Check:**
- Verifies against requirements
- Checks for formula errors (spreadsheets)
- Ensures Australian standards applied
- Confirms data completeness

**4. Artifact Delivery:**
- Returns generated content
- Includes metadata (title, kind, user ID)
- Triggers artifact renderer in UI
- Saves to database

**Quality Factors from Combined Prompts:**

**From System Prompt:**
- Australian date format (DD/MM/YYYY)
- Currency shown as AUD $
- Account codes match your chart
- Business terminology used correctly
- GST treatment appropriate for your business type

**From Specialised Prompt:**
- Professional formatting and structure
- Formula-based calculations (not hardcoded)
- Industry-standard colour coding
- Zero errors in formulas
- Proper validation and error handling

**From Title Instructions:**
- Exact data used (no placeholder or example data)
- Specific columns or structure requested
- Filtering or sorting applied as asked
- Format preferences honoured

### Artifact Rendered in UI

**Display Process:**

**1. Artifact Component Selection:**
- Based on `kind`: text, code, or sheet
- Loads appropriate renderer
- Prepares display area in side panel

**2. Content Rendering:**
- Text: Markdown rendering with formatting
- Code: Syntax highlighting with CodeMirror
- Sheet: CSV parsed and rendered as table

**3. Interactive Features:**
- Copy to clipboard button
- Download button (code as .py, sheet as .csv)
- Update button (triggers updateDocument)
- Version history (for document revisions)

**4. Real-time Updates:**
- Streaming updates as AI generates
- Smooth transitions between versions
- Loading states for processing

---

## Template Variable Processing

Understanding how template variables are processed helps you use them effectively and debug issues when they arise.

### Variables Defined in Settings

**Definition Interface:**

**Standard Variables:**
- Defined by LedgerBot system
- Fields in UI: Company Name, Industry Context, Chart of Accounts
- Automatically named: COMPANY_NAME, INDUSTRY_CONTEXT, CHART_OF_ACCOUNTS
- Always available, no configuration needed

**Custom Variables:**
- User creates in Custom Variables section
- User defines both name and value
- Name must follow rules: uppercase, letters/numbers/underscores, no spaces
- Value can be any text content

**Storage:**
- Standard variable values: Separate database columns (companyName, industryContext, etc.)
- Custom variables: Stored as JSON object in customVariables column
- Clerk variables: Retrieved from authentication system (firstName, lastName)
- Xero variables: Fetched from Xero API (chartOfAccounts when connected)

### Placeholders in Prompt Text

**Placeholder Syntax:**

**Format:** Two curly braces surrounding variable name in uppercase
- Correct: {​{VARIABLE_NAME}​}
- Incorrect: {VARIABLE_NAME}, {{variable_name}}, {{Variable Name}}

**Usage in Prompts:**
```
You are assisting {{FIRST_NAME}} {{LAST_NAME}} at {{COMPANY_NAME}}.

Industry Context:
{{INDUSTRY_CONTEXT}}

Chart of Accounts:
{{CHART_OF_ACCOUNTS}}

Custom instructions:
{{CUSTOM_SYSTEM_INSTRUCTIONS}}
```

**Whitespace Handling:**
- Leading/trailing spaces inside braces ignored: {​{ VARIABLE }​} same as {​{VARIABLE}​}
- Placeholder can span multiple lines if needed
- Empty value results in empty string (placeholder completely removed)

### Variable Substitution Before Sending to AI

**Substitution Process:**

**1. Template Variables Object Assembled:**
```
templateVars = {
  FIRST_NAME: "Sarah",
  LAST_NAME: "Johnson",
  COMPANY_NAME: "Acme Retail Pty Ltd",
  INDUSTRY_CONTEXT: "Retail business selling office supplies...",
  CHART_OF_ACCOUNTS: "1000 - Cash at Bank, 1100 - Accounts Receivable...",
  CUSTOM_SYSTEM_INSTRUCTIONS: "Always use job cost codes...",
  // Plus any custom variables user created
  BUSINESS_ADDRESS: "Level 3, 123 Main St, Sydney NSW 2000",
  REPORTING_PERIOD: "FY2025 (July 2024 - June 2025)"
}
```

**2. Regex Pattern Matching:**
- Function scans prompt text for all {​{VARIABLE}​} patterns
- Case-sensitive matching (must be uppercase)
- Matches variable name inside braces

**3. Value Replacement:**
- For each placeholder found, looks up value in templateVars
- If value exists: Replaces placeholder with actual value
- If value is undefined or null: Replaces with empty string
- If value is object/array: Converts to string representation

**4. Final Prompt:**
```
Before substitution:
"You are assisting {{FIRST_NAME}} {{LAST_NAME}} at {{COMPANY_NAME}}."

After substitution:
"You are assisting Sarah Johnson at Acme Retail Pty Ltd."
```

**5. Sent to AI:**
- Fully substituted prompt sent to AI Gateway
- AI model never sees placeholder syntax
- AI receives only the actual values

### Dynamic Values from Xero Integration

**Xero Data Fetching:**

**1. Connection Check:**
- System queries XeroConnection table for active connection
- Filters by user ID and isActive flag
- Returns connection details if found

**2. Token Validation:**
- Checks token expiry timestamp
- If expiring within 5 minutes, refreshes token
- Decrypts access token for API calls
- Updates database with new token if refreshed

**3. Chart of Accounts Fetch:**
- Calls Xero API: GET /api.xro/2.0/Accounts
- Retrieves all accounts for connected organisation
- Includes account code, name, type, tax type, status
- Caches result in database for performance

**4. Data Formatting:**
- `formatChartOfAccountsForPrompt()` structures data for AI
- Groups accounts by type (Assets, Liabilities, Equity, Revenue, Expenses)
- Filters to active accounts only (excludes archived)
- Formats as: "Code - Name (Type)"
- Example: "4000 - Sales Revenue (Revenue)"

**5. Variable Population:**
- Formatted chart assigned to {​{CHART_OF_ACCOUNTS}​}
- Organisation name assigned to {​{COMPANY_NAME}​} (if user hasn't set manually)
- Xero data takes priority over manual entries

**Live Data Benefits:**
- Always current account codes
- New accounts appear immediately after sync
- Archived accounts automatically removed
- Consistent with Xero setup
- No manual maintenance needed

### Chart of Accounts Injection

**Manual Entry Process:**

**User Interface:**
1. Navigate to Template Variables section
2. Find "Chart of Accounts" textarea
3. Enter account codes and names
4. Format as desired (plain list, codes separated by commas, structured format)
5. Save settings

**Example Formats:**

**Simple List:**
```
1000 - Cash at Bank
1100 - Accounts Receivable
2000 - Accounts Payable
4000 - Sales Revenue
5000 - Cost of Goods Sold
6000 - Operating Expenses
```

**Grouped by Type:**
```
ASSETS
1000 - Cash at Bank
1100 - Accounts Receivable
1200 - Inventory

LIABILITIES
2000 - Accounts Payable
2100 - GST Payable

INCOME
4000 - Sales Revenue
4100 - Other Income

EXPENSES
5000 - Cost of Goods Sold
6000 - Operating Expenses
```

**With Descriptions:**
```
1000 - Cash at Bank (Operating account for daily transactions)
1100 - Accounts Receivable (Customer invoices outstanding)
4000 - Sales Revenue (Primary business income)
```

**Automatic Xero Injection:**

**When Xero Connected:**
1. Manual chart of accounts field becomes disabled
2. Badge shows "Synced from Xero"
3. Field auto-populated with formatted Xero data
4. Updates automatically when chart changes in Xero
5. Sync timestamp shown

**Fallback Logic:**
- Xero data used if connection active and chart synced
- Falls back to manual entry if Xero unavailable
- Falls back to empty if neither available
- System continues functioning without chart (less accurate suggestions)

**Usage in Prompts:**

Once injected, chart is available via {​{CHART_OF_ACCOUNTS}​}:

```
When suggesting account codes, use the following chart of accounts:
{{CHART_OF_ACCOUNTS}}

Always reference the exact account codes and names from this chart.
```

After substitution:
```
When suggesting account codes, use the following chart of accounts:
1000 - Cash at Bank
1100 - Accounts Receivable
2000 - Accounts Payable
4000 - Sales Revenue
5000 - Cost of Goods Sold
6000 - Operating Expenses

Always reference the exact account codes and names from this chart.
```

AI can then suggest: "Code this to 5000 - Cost of Goods Sold" instead of generic "cost of goods sold account".

---

## Integration Points

### How Xero Data Connects to Prompts

**Integration Architecture:**

**1. OAuth2 Connection:**
- User initiates connection from Settings > Integrations
- OAuth2 Authorization Code Flow with client secret
- Permissions requested: accounting.transactions, accounting.contacts, accounting.settings, etc.
- Tokens encrypted (AES-256-GCM) and stored in database
- Automatic token refresh when expiring

**2. Organisation Selection:**
- User may have multiple Xero organisations
- Selects one as "active" for prompt integration
- Active connection flag set in database
- Only one active connection per user

**3. Data Synchronisation:**
- Chart of accounts synced on connection
- Re-synced daily via cron job
- Can manually trigger sync from settings
- Sync timestamp recorded for display

**4. Prompt Integration:**
- Chart included in system prompt via {​{CHART_OF_ACCOUNTS}​}
- Organisation name optionally used for {​{COMPANY_NAME}​}
- Account codes available for AI suggestions
- Real-time tool access for querying live data

**Xero Tools in Conversations:**

**Available Tools:**
- list_invoices: Query invoices with filters (date range, status, contact)
- get_invoice: Retrieve detailed invoice by ID
- list_contacts: Search customers and suppliers
- get_contact: Get detailed contact information
- list_accounts: Get chart of accounts with type filtering
- get_organisation: Retrieve organisation details
- get_bank_transactions: Query bank transactions by account and date
- list_journal_entries: Retrieve manual journal entries

**Tool Activation:**
- System checks for active Xero connection before chat
- If connected, Xero tools added to available tools list
- AI can call these tools during conversation
- Results integrated into AI's response

**Example Integration Flow:**

*User asks:* "Show me unpaid invoices from August 2024"

1. AI recognises request relates to Xero data
2. Calls `list_invoices` tool with parameters:
   - dateFrom: "2024-08-01"
   - dateTo: "2024-08-31"
   - status: "AUTHORISED" (unpaid status)
3. Tool executes Xero API call
4. Returns JSON array of invoice records
5. AI processes result and responds:
   "You have 8 unpaid invoices from August 2024 totaling $23,450.00..."
6. If user then asks "create a spreadsheet", AI:
   - Calls `createDocument` with kind: 'sheet'
   - Embeds complete invoice data in title parameter
   - Spreadsheet generated with actual Xero data

### Context Files and RAG Integration

**Context File Processing:**

**1. File Upload:**
- User uploads via Context Files interface
- Supported: PDF, DOCX, XLSX, JPEG, PNG, GIF, WebP
- Maximum 10MB per file
- Files stored in Vercel Blob storage
- Database record created with status "processing"

**2. Text Extraction:**
- OCR for images and scanned PDFs
- Native text extraction for text PDFs
- Document parsing for DOCX and XLSX
- Extracted text stored in database
- Token count calculated for context management

**3. Status Tracking:**
- Processing: File uploaded, extraction in progress
- Ready: Text extracted, available for use
- Failed: Extraction error, details in errorMessage field

**Retrieval Augmented Generation (RAG):**

**1. Context Selection:**
- System identifies relevant files based on:
  - Pinned status (always included)
  - File tags matching conversation topic
  - Recent usage (lastUsedAt timestamp)
  - File description relevance

**2. Context Manager:**
- `buildUserContext()` function assembles context
- Limits total tokens to avoid context window overflow
- Prioritises pinned and recently used files
- Formats extracted text for AI consumption

**3. Integration with Prompts:**
- Context added to request hints
- Included in `userContext` parameter
- Appended after system prompt
- Available to AI for reference during response

**Example RAG Flow:**

*Setup:*
User uploads "Supplier Contract - ABC Supplies.pdf"
File processed, text extracted
Tagged with "suppliers", "contracts", "ABC"

*Conversation:*
User: "Record this invoice from ABC Supplies"
System: Identifies "ABC" in message
Retrieves contract file as relevant context
Adds contract terms to AI context
AI: "According to your contract with ABC Supplies (Net 30 payment terms, 5% early payment discount), should I apply the discount?"

### User Location and Geolocation Hints

**Location Data Collection:**

**Source:** Vercel Functions geolocation API
- Automatically detects user location from IP address
- Available in serverless function context
- No user input or permission required

**Data Points:**
- Latitude (decimal degrees)
- Longitude (decimal degrees)
- City name
- Country code (2-letter ISO code)
- Region/state (where available)

**Privacy Considerations:**
- Approximate location only (IP-based, not GPS)
- Not stored permanently
- Used only for current request
- Can be incorrect if using VPN or proxy

**Integration with Prompts:**

**Request Hints Format:**
```
About the origin of user's request:
- lat: -33.8688
- lon: 151.2093
- city: Sydney
- country: AU
```

**Usage by AI:**
- Contextual awareness of user location
- Time zone appropriate responses
- Local terminology and references
- Regional regulation awareness

**Examples:**

*Weather Tool:*
User: "What's the weather like?"
AI: Uses geolocation (Sydney) automatically
Responds: "In Sydney, it's currently 22°C with partly cloudy skies..."

*Compliance Queries:*
User: "What's the payroll tax threshold?"
AI: Recognises location (NSW based on Sydney)
Responds: "In NSW, the payroll tax threshold is $1.2 million per annum..."

*Date/Time References:*
User: "When is the BAS due?"
AI: Knows user is in Australia (country: AU)
Uses Australian date format: "28/10/2024"
References AEST/AEDT timezone appropriately

---

## Maintenance and Updates

### How Default Prompts Are Updated

**Update Process:**

**1. Development Team Changes:**
- Identifies improvements needed (bug fixes, new features, clarifications)
- Edits markdown files in `/prompts/` directory
- Tests changes with various scenarios
- Reviews prompt quality and completeness

**2. Version Control:**
- Changes committed to git repository
- Pull request created with description of updates
- Reviewed by team members
- Merged to main branch

**3. Deployment:**
- New code deployed to production
- Markdown files included in deployment
- All users receive updated files simultaneously
- No database migration needed

**4. User Impact:**
- Users with no customisations: Get update immediately on next message
- Users with custom additions: Base prompt updated, custom additions preserved
- No action required by users
- Changes apply transparently

**When Updates Occur:**
- Bug fixes: As soon as issues identified and resolved
- Improvements: Regularly based on user feedback
- New features: When capabilities added to LedgerBot
- Compliance changes: When Australian regulations updated

### User Prompts Persist Across Updates

**Persistence Guarantee:**

**Custom Additions Always Preserved:**
- Your custom system instructions
- Your custom code instructions
- Your custom spreadsheet instructions
- Your template variable values
- Your custom variables

**How It Works:**

**Base Prompt Updated:**
```
Old base: "...Core instructions version 1.0..."
Updated to: "...Core instructions version 1.1 with improvements..."
```

**Your Custom Additions Unchanged:**
```
Your additions: "Always use job cost codes. Our job format is XXX-YYYY..."
```

**Combined Result:**
```
Updated base prompt + Your unchanged custom additions
```

**Why This Matters:**
- You don't lose work when system updates
- Benefits from improvements without configuration
- Custom business rules persist indefinitely
- Manual migration not required

**Database Design:**
- Custom instructions stored in separate database fields
- Base prompts loaded from files at runtime
- Combination happens dynamically on each request
- Clear separation of system vs user data

### Migration Strategy for Prompt Changes

**Backward Compatibility:**

**Old Prompt Fields (Deprecated):**
- `systemPrompt`, `codePrompt`, `sheetPrompt` in database
- Kept for existing users with old customisations
- New users don't use these fields
- Will eventually be retired

**New Prompt Fields (Current):**
- `customSystemInstructions`, `customCodeInstructions`, `customSheetInstructions`
- Designed for additions, not full replacements
- Allows base prompts to be updated independently

**Migration Path for Existing Users:**

**Phase 1: Detection**
- System checks if old fields contain custom prompts
- Compares with default prompts to identify customisations
- Extracts user-specific additions from full custom prompts

**Phase 2: Extraction (Planned)**
- Automatic tool to extract custom portions
- Separate base prompt from user additions
- Migrate to new instruction fields
- Preserve all custom content

**Phase 3: Deprecation (Future)**
- Once all users migrated, old fields removed
- Database schema cleaned up
- All users on new system

**Manual Migration Option:**

If you have old-style full custom prompts:

1. Review your current systemPrompt field
2. Identify what you added beyond defaults
3. Copy your custom additions only
4. Paste into customSystemInstructions field
5. Save settings
6. Old field can be cleared

### Versioning Considerations

**Prompt Versioning:**

**Current Approach: No Explicit Versions**
- Prompts updated in place
- No version numbers in files
- Git commit history tracks changes
- Users always on "latest" version

**Future Versioning (Possible):**
- Semantic versioning for major changes
- Users opt-in to major updates
- Warnings for breaking changes
- Documentation of version differences

**Template Variable Versioning:**

**Standard Variable Stability:**
- Standard variables (FIRST_NAME, COMPANY_NAME, etc.) won't be removed
- New variables may be added over time
- Existing variables maintain same behaviour
- Documentation updated when variables added

**Custom Variable Independence:**
- User-created variables not affected by system updates
- Completely independent from system changes
- Controlled entirely by user

**API Compatibility:**

**Prompt Structure Changes:**
- Major structural changes flagged in release notes
- Migration guides provided if needed
- Testing period for significant changes
- User feedback incorporated before finalisation

**Xero Integration Updates:**
- OAuth flow upgrades handled transparently
- API version changes managed in code
- Chart of accounts format maintained
- Token refresh automatic

**Best Practices for Users:**

**Stay Informed:**
- Review release notes when deploying updates
- Check documentation for prompt changes
- Test after major updates

**Backup Custom Work:**
- Export settings periodically (if feature available)
- Document custom additions externally
- Screenshot important customisations

**Test Updates:**
- Try new features in test conversation
- Verify custom prompts still work
- Check variable substitution
- Review artifact generation quality

---

## Troubleshooting and FAQ

### Common Issues

#### AI Not Following Custom Instructions

**Symptoms:**
- You added custom instructions but AI ignores them
- Responses don't reflect your business context
- Account code suggestions don't match your chart

**Diagnosis:**

**1. Check Variable Substitution:**
- Open preview pane in settings
- Verify placeholders are replaced with actual values
- Look for {​{VARIABLE}​} syntax remaining (indicates undefined variable)
- Check for typos in variable names

**2. Verify Settings Saved:**
- Confirm you clicked "Save" button after editing
- Look for success notification toast
- Refresh settings page to confirm changes persisted

**3. Check Prompt Placement:**
- Custom instructions must be in the right section
- {​{CUSTOM_SYSTEM_INSTRUCTIONS}​} placeholder must exist in base prompt
- If placeholder missing, custom instructions won't be included

**4. Test in New Conversation:**
- Changes only apply to new messages
- Start fresh chat to test updated prompts
- Existing conversations use prompt from first message

**Solutions:**

**Immediate:**
- Save settings again
- Start new conversation to test
- Check for validation warnings
- Verify no undefined variables

**Long-term:**
- Make instructions more explicit and specific
- Use clear directive language ("Always...", "Never...", "When... then...")
- Put most important instructions at the beginning
- Test incrementally (add one instruction, test, repeat)

#### Template Variables Not Working

**Symptoms:**
- Variables appear as placeholders: {​{COMPANY_NAME}​}
- Values not substituted in AI responses
- Preview shows placeholders instead of values

**Diagnosis:**

**1. Variable Definition:**
- Check variable is defined in settings
- Verify spelling matches exactly (case-sensitive)
- Ensure value field is not empty
- Custom variables must follow naming rules

**2. Variable Reference:**
- Confirm placeholder syntax: {​{VARIABLE}​}
- Check for typos in placeholder
- Verify uppercase usage
- No extra spaces or characters

**3. System Check:**
- Validation warnings in UI point to problems
- Undefined variables highlighted in yellow
- Error messages indicate specific issues

**Solutions:**

**Fix Definition:**
- Go to Template Variables section
- Fill in value for undefined variables
- Check spelling of variable names
- Follow naming rules for custom variables

**Fix Reference:**
- Correct typos in placeholders
- Ensure exact match with variable name
- Use Insert Variable button to avoid errors
- Check preview pane to confirm substitution

**Verify Behaviour:**
- Save settings after changes
- Start new conversation
- Check AI uses actual values
- Review preview pane shows substitution

#### Prompts Too Long or Complex

**Symptoms:**
- Slow response times
- Increased token costs
- AI seems confused or gives inconsistent responses
- Context window limits reached

**Diagnosis:**

**Length Check:**
- Open settings, view full prompts
- Count approximate words/characters
- System prompt should be under 4000 words typically
- Check for excessive repetition

**Complexity Indicators:**
- Contradictory instructions
- Overly detailed procedures
- Too many conditional rules
- Nested logic and exceptions

**Solutions:**

**Simplify Content:**
- Remove redundant instructions
- Consolidate similar rules
- Use template variables instead of repeating text
- Focus on most important 20% of instructions

**Structure Improvements:**
- Break complex rules into clear steps
- Use bullet points instead of paragraphs
- Prioritise most critical instructions first
- Remove "nice to have" additions

**Use External Resources:**
- Put detailed procedures in context files
- Reference uploaded documents instead of inline
- Link to external documentation
- Use Xero integration instead of listing all accounts

**Measure Impact:**
- Check token usage in chat settings
- Compare response speed before/after changes
- Test AI adherence to simplified prompts
- Iterate based on results

#### Resetting After Problems

**When to Reset:**
- Prompts not working as expected
- Too many customisations to debug
- Want to start fresh
- Testing baseline behaviour

**How to Reset:**

**Individual Prompt:**
1. Scroll to specific prompt section
2. Click "Reset to Default" button
3. Confirm in dialog
4. Review default prompt loaded
5. Save to apply

**All Settings:**
1. Go to personalisation settings
2. Reset each prompt individually
3. Clear template variable values
4. Delete custom variables
5. Save all changes

**Partial Reset:**
- Keep template variables (company name, industry)
- Reset only system prompt
- Preserve custom variables
- Maintain Xero connection

**After Reset:**
- Start new conversation to test
- Verify default behaviour restored
- Gradually re-add customisations
- Test after each addition

---

### Frequently Asked Questions

#### Do My Custom Prompts Apply to All Conversations?

**Answer:** Yes, with clarification.

**How It Works:**
- Your custom prompts and template variables stored in your user settings
- Every new message you send includes your current prompt settings
- All conversations (new and existing) use your settings
- Changes you make affect all future messages

**Important Distinction:**
- **New conversations:** Use your current settings from the first message
- **Existing conversations:** Each message uses settings at the time it was sent
- **After updating settings:** Only new messages use new settings

**Example:**
1. You customise prompts on Monday
2. Start conversation A on Monday (uses Monday settings)
3. Update prompts on Tuesday
4. Continue conversation A (Tuesday messages use Tuesday settings)
5. Start conversation B on Tuesday (uses Tuesday settings)

**Best Practice:**
- To fully test new prompt changes, start a new conversation
- Existing conversations will gradually adopt new settings as you send messages
- No need to delete old conversations

#### Can I Have Different Prompts for Different Chats?

**Answer:** No, currently not supported.

**Current Limitation:**
- One set of prompts per user account
- All chats use the same system prompt
- Cannot create chat-specific or client-specific prompts
- Same template variables apply everywhere

**Workaround Options:**

**Option 1: Context Files**
- Upload client-specific documents
- Reference in conversations
- AI uses file content for context
- More flexible than prompts

**Option 2: Inline Instructions**
- Give instructions in first message of chat
- "For this conversation, focus on..."
- Less permanent than prompt changes
- Specific to that chat

**Option 3: Custom Variables**
- Create variables for different contexts
- Manually reference in messages
- "Use context from {​{CLIENT_A_INFO}​}"
- Requires manual trigger

**Future Possibility:**
- Feature under consideration
- Would allow prompt templates or profiles
- Switch between different configurations
- Feedback welcome on use cases

#### How Do I Know Which Prompt Is Being Used?

**Answer:** Check settings and preview pane.

**Current Prompt:**

**View in Settings:**
1. Navigate to Settings > Personalisation
2. Scroll to System Prompts section
3. Expand prompt accordion
4. Current prompt displayed in textarea

**Preview Pane:**
- Shows substituted version
- All variables replaced with actual values
- Displays what AI actually receives
- Located below template variable fields

**Verification:**
- Preview pane shows final prompt sent to AI
- Check for variable substitution
- Verify custom instructions included
- Confirm Xero chart present if connected

**In Conversation:**
- AI behaviour reflects prompt content
- Account codes match your chart (if included)
- Communication style matches your preferences
- Industry terminology used correctly

**Not Currently Available:**
- Cannot view prompt used for past messages
- No per-message prompt inspection
- No prompt history or audit log
- Future feature consideration

#### What Happens If I Delete My Custom Prompt?

**Answer:** Revert to system defaults.

**Immediate Effect:**
- Custom instructions removed
- Base prompt still applies
- Template variables preserved (unless also deleted)
- Custom variables remain defined

**Next Message:**
- Uses default base prompt
- Includes template variables (if defined)
- No custom instructions
- Standard LedgerBot behaviour

**Recovery:**

**Undo (Immediate):**
- If just cleared, press Ctrl+Z in textarea
- Revert will restore previous content
- Must do before saving

**Restore (After Save):**
- No automatic backup or history
- Must manually re-enter custom instructions
- Consider keeping external copy
- Future: backup/restore feature possible

**Best Practice:**
- Keep backup copy of custom prompts in external document
- Test changes incrementally
- Document why you added each customisation
- Makes recovery easier if needed

#### Do Prompts Affect Xero Integration?

**Answer:** Yes, in specific ways.

**How Prompts Influence Xero:**

**Chart of Accounts:**
- {​{CHART_OF_ACCOUNTS}​} variable populated from Xero
- AI uses chart when suggesting account codes
- Codes match your actual Xero setup
- Improves accuracy of coding suggestions

**Tool Usage:**
- System prompt sets context for Xero tool calls
- AI understands your business when querying Xero
- Results interpreted with your context
- More relevant filtering and analysis

**Data Interpretation:**
- Industry context affects how AI interprets Xero data
- Custom instructions guide analysis approach
- Chart structure informs coding decisions

**What Prompts Don't Affect:**

**Xero API Calls:**
- Prompts don't change what data is fetched
- OAuth permissions control data access
- API results are raw Xero data
- Prompts only affect interpretation and response

**Data Sync:**
- Chart of accounts sync independent of prompts
- Sync schedule unaffected
- Token refresh automatic
- Connection status separate

**Example:**

*Without Custom Prompt:*
User: "Show me unpaid invoices"
AI: Calls Xero tool, lists invoices generically
Response: "You have 8 unpaid invoices totaling $23,450"

*With Custom Prompt (Industry: Construction):*
User: "Show me unpaid invoices"
AI: Calls Xero tool, interprets with construction context
Response: "You have 8 unpaid invoices totaling $23,450. 5 are progress claims for active projects, 3 are retention releases. The oldest is 45 days overdue from Project Alpha."

#### How Long Can Prompts Be?

**Technical Limits:**

**Database Storage:**
- Text fields: No practical limit (PostgreSQL TEXT type)
- JSONB fields: 1GB theoretical limit
- Realistically: Tens of thousands of characters

**AI Model Context Window:**
- Claude Sonnet 4.5: 200,000 token context (approximately 150,000 words)
- Entire prompt + conversation history must fit
- Longer prompt = less room for conversation

**Practical Limits:**

**Recommended Sizes:**
- System prompt: 2,000 - 4,000 words (optimal)
- Code prompt: 1,000 - 2,000 words
- Spreadsheet prompt: 1,000 - 2,000 words
- Custom instructions: 500 - 1,000 words
- Template variable values: Vary by content

**Cost Considerations:**
- Longer prompts = more input tokens per message
- Every message includes full prompt
- Increases costs proportionally
- Monitor usage in settings

**Performance Impact:**
- Very long prompts slow processing
- Model takes longer to read and process
- Marginal returns beyond optimal length
- Quality matters more than quantity

**Best Practices:**
- Keep prompts concise and focused
- Use template variables for variable content
- Reference context files for detailed info
- Remove redundant instructions
- Prioritise most important guidance

**Warning Signs:**
- Response times increasing
- Token costs climbing
- AI seems overwhelmed or confused
- Hitting context window limits

**When to Split Content:**
- Move detailed procedures to context files
- Use reference documentation links
- Create multiple focused prompts (when feature available)
- Leverage Xero integration for account data

---

### Advanced Tips

#### Prompt Engineering Best Practices

**Clarity and Specificity:**

**Be Direct:**
- Use clear imperative language: "Always show GST separately"
- Avoid hedging: Not "you might want to", instead "You must"
- Be explicit about priorities
- State requirements unambiguously

**Use Examples:**
- Show ideal output format
- Demonstrate proper coding
- Illustrate expected behaviour
- Provide counter-examples (what not to do)

**Structure Effectively:**

**Hierarchy:**
- Most important instructions first
- Group related instructions
- Use clear headings and sections
- Progressive detail (overview → specifics)

**Formatting:**
- Bullet points for lists
- Numbered steps for procedures
- Bold for critical requirements
- Code blocks for format examples

**Test Iteratively:**

**Scientific Approach:**
1. Start with defaults
2. Add one change at a time
3. Test after each change
4. Keep what works, discard what doesn't
5. Document learnings

**Version Control:**
- Keep backup of working versions
- Note what changed and why
- Track improvements over time
- Easy rollback if needed

#### Using Prompts to Enforce Terminology

**Terminology Definitions:**

**Industry-Specific Terms:**
```
In our industry (hospitality), always use these terms:
- "Food cost" not "cost of goods sold" for food inventory
- "Labour cost" not "wages" for front-of-house staff
- "Covers" not "customers" for number of guests served
- "Till reconciliation" not "cash counting" for daily cash handling
```

**Company-Specific Terms:**
```
Our company uses these specific terms:
- "Job codes" not "project codes" (format: ABC-1234)
- "Supplier accounts" not "accounts payable"
- "Sales ledger" not "accounts receivable"
- "Monthly management pack" for internal financial reports
```

**Accounting Standards:**
```
Always use Australian terminology:
- "Superannuation" not "pension" or "401k"
- "GST" not "VAT" or "sales tax"
- "BAS" for Business Activity Statement
- "Debtors" and "Creditors" acceptable alongside AR/AP
```

**Consistent Application:**

**In AI Responses:**
- AI will use your terminology in explanations
- Suggested coding follows your language
- Reports use your term preferences
- Questions phrased with your terms

**In Artifacts:**
- Spreadsheet column headers use your terms
- Code comments adopt your language
- Documentation consistent with preferences

#### Industry-Specific Language Customisation

**Retail Example:**

```
Industry Context:
{{INDUSTRY_CONTEXT}}

Specific terminology for our retail business:
- "Stock-on-hand" for inventory
- "Shrinkage" for inventory loss
- "Gross margin" = (Sales - COGS) / Sales
- "Same-store sales" for comparable location performance
- Use location codes in transaction descriptions: SYD01, SYD02, SYD03
```

**Professional Services Example:**

```
Industry Context:
{{INDUSTRY_CONTEXT}}

Legal practice terminology:
- "Matters" not "projects" for client work
- "Billable hours" tracked per matter
- "Disbursements" for out-of-pocket expenses recharged
- "Trust account" for client funds held
- "Write-off" vs "write-down" for fee reductions
```

**Healthcare Example:**

```
Industry Context:
{{INDUSTRY_CONTEXT}}

Medical practice specific terms:
- "Consult fee" for patient appointment revenue
- "Bulk-billing" for Medicare direct claim
- "Gap payment" for patient portion after Medicare
- "PBS" for Pharmaceutical Benefits Scheme
- "Provider number" always included in revenue analysis
```

**Benefits:**
- Staff and AI speak same language
- Reports match internal terminology
- Reduced confusion and misunderstandings
- Consistent documentation
- Professional and credible communication

#### Compliance and Regulatory Language

**Australian Taxation Office (ATO) Compliance:**

```
Compliance Requirements:
- All GST calculations must use 10% rate (1/11 for inclusive)
- BAS lodgement deadlines must be referenced accurately
- PAYG withholding must be distinguished from income tax
- Fringe Benefits Tax (FBT) year is April 1 - March 31
- Always reference ATO ruling numbers when discussing interpretations
- Superannuation Guarantee currently 11% (verify current rate)
```

**Fair Work Compliance:**

```
Employment Compliance:
- Reference specific Modern Award by name when discussing entitlements
- Minimum wage rates change annually July 1
- Casual loading percentages depend on award
- Leave accrual calculations must be accurate
- Penalty rates apply for specific hours/days per award
- Always recommend confirming with Fair Work before finalising
```

**State-Specific Requirements:**

```
NSW Payroll Tax:
- Threshold: $1.2 million per annum
- Rate: 5.45% on wages above threshold
- Grouping provisions apply for related companies
- Monthly reporting required above threshold
- Annual reconciliation due July 28
```

**Professional Standards:**

```
Our accounting practice must:
- Maintain independence per APES 110 Code of Ethics
- Document all significant judgements and decisions
- Retain working papers for 7 years
- Obtain client engagement letters for all services
- Professional indemnity insurance covers $X million
```

**Disclaimer Requirements:**

```
When providing advice, always include:
"This information is general in nature. For advice specific to your circumstances, consult with a registered tax agent or accountant."

When unsure about interpretation:
"This interpretation may vary. Recommend confirming with your tax advisor or the ATO directly."
```

**Benefits:**
- Reduces compliance risk
- Ensures accurate regulatory references
- Promotes professional standards
- Protects against liability
- Builds trust and credibility

---

## Glossary

**Artifact**
A special UI component in LedgerBot that renders AI-generated content (documents, code, spreadsheets) in a side panel while maintaining the conversation in the main area. Artifacts allow for real-time updates and interactive editing.

**AI Gateway**
The Vercel AI Gateway that routes AI model requests through a unified API, handling provider authentication, model selection, and request management.

**Base Prompt**
The foundational system prompt provided by LedgerBot, stored as a markdown file in the `/prompts/` directory. Contains core accounting capabilities, Australian business context, and standard instructions.

**Chart of Accounts**
A structured list of account codes and names used in accounting to categorise transactions. In LedgerBot, can be manually entered or automatically synced from Xero.

**Clerk**
The authentication service used by LedgerBot for user management, providing secure login, profile management, and session handling.

**Context File**
A document uploaded by users to provide additional context to AI conversations, supporting RAG (Retrieval Augmented Generation) for more informed responses.

**Context Window**
The maximum amount of text (measured in tokens) that an AI model can process in a single request, including the system prompt, conversation history, and new message.

**Custom Instructions**
User-added text that supplements the base system prompt with personalised preferences, business-specific rules, or additional guidance.

**Custom Variables**
User-created template variables with names and values defined by the user for frequently referenced information.

**GST (Goods and Services Tax)**
Australia's 10% value-added tax applied to most goods and services. LedgerBot includes comprehensive GST calculation and compliance features.

**MCP (Model Context Protocol)**
A standard protocol for integrating third-party services and tools with AI assistants, used in LedgerBot for Xero integration.

**Placeholder**
The syntax used for template variables in prompts: {​{VARIABLE_NAME}​}. Placeholders are replaced with actual values before sending to the AI model.

**Prompt Engineering**
The practice of crafting effective instructions for AI models to achieve desired behaviour and output quality.

**RAG (Retrieval Augmented Generation)**
A technique where relevant documents are retrieved and provided to the AI model to inform its responses, improving accuracy and relevance.

**Reasoning Model**
An AI model that includes intermediate thinking steps in its response process, showing how it arrived at conclusions (e.g., Claude Sonnet with reasoning).

**Standard Variables**
Template variables automatically provided by LedgerBot, such as {​{FIRST_NAME}​}, {​{COMPANY_NAME}​}, and {​{CHART_OF_ACCOUNTS}​}.

**System Prompt**
The primary set of instructions that defines an AI assistant's role, knowledge, and behaviour. In LedgerBot, this establishes the accounting assistant personality and capabilities.

**Template Variable**
A placeholder in prompts that gets automatically replaced with actual values, allowing dynamic content insertion without manual editing.

**Token**
The basic unit of text that AI models process, roughly equivalent to 3/4 of a word. Both input (prompts) and output (responses) are measured in tokens.

**Tool**
A function that the AI model can call during a conversation to perform actions or retrieve data, such as creating documents or querying Xero.

**Xero**
Cloud-based accounting software that integrates with LedgerBot, providing real-time access to financial data, chart of accounts, and transactions.

**Xero Connection**
An authenticated OAuth2 connection between LedgerBot and a user's Xero organisation, enabling data synchronisation and tool access.

---

## Conclusion and Next Steps

You now have comprehensive knowledge of how system prompts work in LedgerBot, from end-user customisation through to technical implementation details.

### Key Takeaways

**For End Users:**
- System prompts personalise LedgerBot to your business
- Template variables automate information insertion
- Xero integration enriches prompts with live data
- Customisation is optional but powerful
- Start simple, iterate based on experience

**For Technical Users:**
- Prompts flow from files and database through substitution
- Clear separation between base prompts and user customisations
- Xero integration provides dynamic chart of accounts
- Template engine handles variable replacement
- Architecture supports updates without breaking customisations

### Next Steps

**Getting Started:**
1. Review your current prompt settings
2. Add company name and basic industry context
3. Connect Xero if you use it (automatic chart sync)
4. Test with a few conversations
5. Gradually add customisations as needed

**Optimisation:**
1. Monitor which account codes AI suggests
2. Note terminology mismatches
3. Identify repetitive clarifications needed
4. Add custom instructions to address patterns
5. Create custom variables for frequent references

**Advanced Usage:**
1. Craft industry-specific instructions
2. Define compliance requirements
3. Set up context files for reference documents
4. Fine-tune communication preferences
5. Leverage Xero tools in conversations

### Getting Help

**Documentation:**
- CLAUDE.md: Technical codebase documentation
- README files in `/prompts/` directory
- API documentation for developers

**Support Channels:**
- Settings > Help: In-app help and FAQs
- User community forums
- Support tickets for technical issues
- GitHub issues for bug reports

**Further Learning:**
- Experiment with different prompt strategies
- Review release notes for new features
- Share learnings with other users
- Provide feedback for improvements

---

**Version History:**

- **1.0** (8 November 2025): Initial comprehensive guide covering end-user and technical aspects of system prompts, template variables, and integration points.

---

*This guide is maintained as part of the LedgerBot documentation suite. For updates, corrections, or suggestions, please contact the development team or submit feedback through the appropriate channels.*

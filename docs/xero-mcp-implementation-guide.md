# Xero MCP Implementation Guide for Junior Developers

**Last Updated:** October 25, 2025
**Target Audience:** Junior developers using AI coding assistants
**Estimated Implementation Time:** 2-4 weeks (phased approach)

---

## Table of Contents

1. [Introduction](#introduction)
2. [Prerequisites](#prerequisites)
3. [Understanding the Current Implementation](#understanding-the-current-implementation)
4. [Implementation Phases Overview](#implementation-phases-overview)
5. [Phase 1: Financial Reports (PRIORITY)](#phase-1-financial-reports)
6. [Phase 2: Transactional Data](#phase-2-transactional-data)
7. [Phase 3: Write Operations](#phase-3-write-operations)
8. [Phase 4: Payroll Integration (OPTIONAL)](#phase-4-payroll-integration)
9. [Testing Guide](#testing-guide)
10. [Troubleshooting](#troubleshooting)
11. [AI Prompts Library](#ai-prompts-library)
12. [Best Practices](#best-practices)

---

## Introduction

### What You're Building

You're expanding LedgerBot's Xero integration from **8 MCP commands to 45 commands** (18% → 100% coverage). This transforms the integration from read-only data access to full accounting automation with CRUD capabilities.

### Current Status

**Implemented (8 commands):**
- ✓ List invoices, contacts, accounts, bank transactions, journal entries
- ✓ Get invoice/contact details
- ✓ Get organisation info

**To Implement (37 commands):**
- 11 Financial reports & analytics
- 8 Transactional data (items, quotes, etc.)
- 18 Write operations (create/update/delete)

### Architecture Overview

```
User Chat Input
     ↓
AI SDK (Vercel AI SDK)
     ↓
Xero Tools (lib/ai/tools/xero-tools.ts)
     ↓
Xero MCP Client (lib/ai/xero-mcp-client.ts)
     ↓
Xero API (via xero-node SDK)
     ↓
Xero Organisation Data
```

---

## Prerequisites

### ✅ Checklist Before Starting

- [ ] Node.js v18+ installed (`node --version`)
- [ ] pnpm installed (`pnpm --version`)
- [ ] Project cloned and dependencies installed (`pnpm install`)
- [ ] Xero Developer account created at https://developer.xero.com
- [ ] Xero Demo Company set up (comes with sample data)
- [ ] Environment variables configured (`.env.local`)
- [ ] Understanding of TypeScript, async/await, and REST APIs
- [ ] Familiar with AI coding assistants (Claude Code, Copilot, Cursor, etc.)
- [ ] Read CLAUDE.md for project context

### Required Environment Variables

```bash
# Xero OAuth Credentials
XERO_CLIENT_ID=your_xero_client_id
XERO_CLIENT_SECRET=your_xero_client_secret
XERO_REDIRECT_URI=http://localhost:3000/api/xero/callback
XERO_ENCRYPTION_KEY=your_32_byte_hex_key

# Database (already configured)
POSTGRES_URL=your_postgres_connection_string

# Other existing vars...
```

### Getting Xero Developer Credentials

1. Go to https://developer.xero.com/app/manage
2. Create a new app (select "Web App" type)
3. Set redirect URI to `http://localhost:3000/api/xero/callback`
4. Copy Client ID and Client Secret
5. Add to `.env.local`

### Testing Environment Setup

You'll be using a **Xero Demo Company** which provides:
- Pre-loaded sample data (invoices, contacts, accounts)
- Safe environment (no real financial impact)
- Ability to reset data anytime

**How to Switch to Demo Company:**
1. Log in to Xero at https://my.xero.com
2. Click organisation dropdown (top left)
3. Select "Demo Company (AU)" or create new demo company
4. Region options: AU, NZ, UK, US (choose based on features needed)

---

## Understanding the Current Implementation

### File Structure

```
lib/
├── ai/
│   ├── xero-mcp-client.ts      # MCP tool definitions & execution logic
│   └── tools/
│       └── xero-tools.ts        # AI SDK wrappers (Zod schemas)
├── xero/
│   ├── connection-manager.ts   # OAuth & token management
│   ├── encryption.ts            # Token encryption (AES-256-GCM)
│   └── types.ts                 # TypeScript type definitions
└── db/
    ├── schema.ts                # XeroConnection table
    └── queries.ts               # Database queries

app/
└── (chat)/
    └── api/
        └── chat/
            └── route.ts         # Chat endpoint (adds Xero tools dynamically)
```

### 🤖 AI PROMPT: Understanding Current Code

```
I'm working on expanding the Xero MCP integration in LedgerBot. Please help me understand:

1. Read and explain the architecture in lib/ai/xero-mcp-client.ts
2. Show me how xero_list_invoices is implemented from tool definition to execution
3. Explain how the AI SDK wrapper in lib/ai/tools/xero-tools.ts connects to the MCP client
4. Point out the pattern I should follow for adding new tools

Focus on the connection between:
- Tool definition in xeroMCPTools array
- Execution logic in executeXeroMCPTool switch statement
- AI SDK wrapper using tool() and Zod schemas
- How authentication and token refresh works

Please provide a step-by-step breakdown with code references.
```

### Key Concepts to Understand

#### 1. MCP Tool Definition Pattern

Every tool has two parts:

**Part A: Tool Metadata** (in `xeroMCPTools` array)
```typescript
{
  name: "xero_list_invoices",
  description: "Get a list of invoices from Xero...",
  inputSchema: {
    type: "object",
    properties: {
      status: {
        type: "string",
        description: "Invoice status filter",
        enum: ["DRAFT", "SUBMITTED", "AUTHORISED", "PAID", "VOIDED"]
      },
      // ... more parameters
    },
    required: [] // Optional: required parameter names
  }
}
```

**Part B: Execution Logic** (in `executeXeroMCPTool` switch)
```typescript
case "xero_list_invoices": {
  const { status, dateFrom, dateTo } = args;

  // Build query parameters
  const where = status ? `Status=="${status}"` : undefined;

  // Call Xero API via xero-node SDK
  const response = await client.accountingApi.getInvoices(
    connection.tenantId,
    undefined, // ifModifiedSince
    where,
    // ... other parameters
  );

  // Return formatted response
  return {
    content: [{
      type: "text",
      text: JSON.stringify(response.body.invoices, null, 2)
    }]
  };
}
```

#### 2. AI SDK Wrapper Pattern

Maps MCP tool to Vercel AI SDK:

```typescript
xero_list_invoices: tool({
  description: "Get a list of invoices...",
  inputSchema: z.object({
    status: z.enum(["DRAFT", "SUBMITTED", "AUTHORISED", "PAID", "VOIDED"])
      .optional()
      .describe("Invoice status filter"),
    // ... more Zod schemas
  }),
  execute: async (args) => {
    const result = await executeXeroMCPTool(
      userId,
      "xero_list_invoices",
      args
    );
    return result.content[0].text;
  },
}),
```

#### 3. Authentication Flow

```typescript
async function getXeroClient(userId: string) {
  // 1. Get encrypted connection from database
  const connection = await getDecryptedConnection(userId);

  // 2. Create Xero client with OAuth credentials
  const client = new XeroClient({
    clientId: process.env.XERO_CLIENT_ID,
    clientSecret: process.env.XERO_CLIENT_SECRET,
    // ...
  });

  // 3. Set access tokens
  await client.setTokenSet({
    access_token: connection.accessToken,
    refresh_token: connection.refreshToken,
    // ...
  });

  return { client, connection };
}

// After API call, save refreshed tokens if changed
await persistTokenSet(client, connection);
```

---

## Implementation Phases Overview

### Phase Comparison Table

| Phase | Commands | Priority | Effort | Value | Dependencies |
|-------|----------|----------|--------|-------|--------------|
| Phase 1 | 6 | HIGH | 4-6h | HIGH | None |
| Phase 2 | 5 | MEDIUM | 3-4h | MEDIUM | None |
| Phase 3 | 8 | VERY HIGH | 8-10h | VERY HIGH | Phase 1 |
| Phase 4 | 10 | LOW | 10-12h | MEDIUM | Phase 1 |

### Recommended Execution Order

1. **Start:** Phase 1 (Financial Reports) - Immediate value for analytics
2. **Next:** Phase 3 (Write Operations) - Enables automation
3. **Then:** Phase 2 (Additional Read) - Completes data access
4. **Optional:** Phase 4 (Payroll) - Only if targeting NZ/UK

---

## Phase 1: Financial Reports

### Overview

**Goal:** Add 6 critical financial reporting commands
**Time:** 4-6 hours
**Difficulty:** ⭐⭐☆☆☆ (Beginner-friendly)

### Commands to Implement

1. `xero_get_profit_and_loss` - P&L statement
2. `xero_get_balance_sheet` - Balance sheet
3. `xero_get_trial_balance` - Trial balance
4. `xero_list_payments` - Payment records
5. `xero_list_tax_rates` - Tax rate configuration
6. `xero_list_credit_notes` - Credit notes

### Step-by-Step Implementation

#### STEP 1: Implement `xero_get_profit_and_loss`

##### 1.1 - Research the Xero API

🤖 **AI PROMPT:**
```
I need to implement xero_get_profit_and_loss command using the xero-node SDK.

Please help me:
1. Find the correct method in xero-node SDK for getting P&L report
2. Show me the method signature and required parameters
3. Explain what data the API returns
4. Give me example API call code

Reference: https://xeroapi.github.io/xero-node/accounting/index.html
Look for report-related methods in AccountingApi class.
```

##### 1.2 - Add Tool Definition

**File:** `lib/ai/xero-mcp-client.ts`

**Location:** Add to `xeroMCPTools` array (around line 261, after existing tools)

🤖 **AI PROMPT:**
```
Add a new MCP tool definition for xero_get_profit_and_loss to the xeroMCPTools array in lib/ai/xero-mcp-client.ts

Requirements:
- Tool name: "xero_get_profit_and_loss"
- Description: "Get profit and loss report from Xero for a specified date range. Shows revenue, expenses, and net profit."
- Input parameters:
  - fromDate (string, required): Start date in YYYY-MM-DD format
  - toDate (string, required): End date in YYYY-MM-DD format
  - periods (number, optional): Number of periods to compare
  - timeframe (string, optional): Reporting period (MONTH, QUARTER, YEAR)

Follow the exact pattern used by existing tools in the array.
Place it after xero_get_organisation tool.
```

**Expected Code:**
```typescript
{
  name: "xero_get_profit_and_loss",
  description:
    "Get profit and loss report from Xero for a specified date range. Shows revenue, expenses, and net profit.",
  inputSchema: {
    type: "object",
    properties: {
      fromDate: {
        type: "string",
        description: "Start date for the report (YYYY-MM-DD format)",
      },
      toDate: {
        type: "string",
        description: "End date for the report (YYYY-MM-DD format)",
      },
      periods: {
        type: "number",
        description: "Number of periods to compare (optional)",
      },
      timeframe: {
        type: "string",
        description: "Reporting period: MONTH, QUARTER, or YEAR (optional)",
        enum: ["MONTH", "QUARTER", "YEAR"],
      },
    },
    required: ["fromDate", "toDate"],
  },
},
```

##### 1.3 - Add Execution Logic

**File:** `lib/ai/xero-mcp-client.ts`

**Location:** Add new case to `executeXeroMCPTool` switch statement (around line 485, before default case)

🤖 **AI PROMPT:**
```
Add execution logic for xero_get_profit_and_loss in the executeXeroMCPTool function's switch statement.

Requirements:
- Extract fromDate, toDate, periods, timeframe from args
- Call client.accountingApi.getReportProfitAndLoss()
- Pass connection.tenantId as first parameter
- Handle optional parameters (periods, timeframe)
- Return response in the standard format: { content: [{ type: "text", text: JSON.stringify(...) }] }
- Add case before the default case

Follow the exact pattern used by xero_list_invoices case.
```

**Expected Code:**
```typescript
case "xero_get_profit_and_loss": {
  const { fromDate, toDate, periods, timeframe } = args;

  if (!fromDate || !toDate) {
    throw new Error("fromDate and toDate are required");
  }

  const response = await client.accountingApi.getReportProfitAndLoss(
    connection.tenantId,
    fromDate as string,
    toDate as string,
    periods as number | undefined,
    timeframe as "MONTH" | "QUARTER" | "YEAR" | undefined
  );

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(response.body, null, 2),
      },
    ],
  };
}
```

##### 1.4 - Add AI SDK Wrapper

**File:** `lib/ai/tools/xero-tools.ts`

**Location:** Add to the object returned by `createXeroTools()` function (around line 210, before closing brace)

🤖 **AI PROMPT:**
```
Add AI SDK tool wrapper for xero_get_profit_and_loss in lib/ai/tools/xero-tools.ts

Requirements:
- Add to the return object of createXeroTools(userId) function
- Use tool() from 'ai' package
- Define Zod schema using z.object() matching the MCP tool parameters:
  - fromDate: z.string() with description
  - toDate: z.string() with description
  - periods: z.number().optional() with description
  - timeframe: z.enum(["MONTH", "QUARTER", "YEAR"]).optional() with description
- Execute by calling executeXeroMCPTool(userId, "xero_get_profit_and_loss", args)
- Return result.content[0].text

Follow the exact pattern of xero_list_invoices wrapper.
Add comma after xero_get_organisation tool.
```

**Expected Code:**
```typescript
xero_get_profit_and_loss: tool({
  description:
    "Get profit and loss report from Xero for a specified date range. Use this to analyze revenue, expenses, and profitability over time.",
  inputSchema: z.object({
    fromDate: z
      .string()
      .describe("Start date for the report (YYYY-MM-DD format)"),
    toDate: z
      .string()
      .describe("End date for the report (YYYY-MM-DD format)"),
    periods: z
      .number()
      .optional()
      .describe("Number of periods to compare (e.g., 12 for monthly comparison)"),
    timeframe: z
      .enum(["MONTH", "QUARTER", "YEAR"])
      .optional()
      .describe("Reporting period frequency"),
  }),
  execute: async (args) => {
    const result = await executeXeroMCPTool(
      userId,
      "xero_get_profit_and_loss",
      args
    );
    return result.content[0].text;
  },
}),
```

##### 1.5 - Test the Implementation

🤖 **AI PROMPT:**
```
Help me test the xero_get_profit_and_loss implementation:

1. Start the development server: pnpm dev
2. Navigate to http://localhost:3000 and connect to Xero
3. In chat, test with: "Show me the profit and loss for the last quarter"
4. Check if the tool is called correctly
5. Verify the response contains financial data

If there are TypeScript errors, help me fix them.
If the API call fails, help me debug the parameters.
```

**Manual Testing Steps:**

1. **Start Development Server:**
   ```bash
   pnpm dev
   ```

2. **Connect to Xero:**
   - Navigate to `http://localhost:3000`
   - Go to Settings > Integrations
   - Click "Connect Xero" and complete OAuth flow

3. **Test in Chat:**
   ```
   Test queries to try:
   - "Show me the P&L for Q3 2024"
   - "Get profit and loss from January 1 to March 31, 2024"
   - "What was our profit last month?"
   ```

4. **Verify Response:**
   - Should see `xero_get_profit_and_loss` tool called
   - Response should contain rows with Account names and amounts
   - Should show Revenue, Expenses, and Net Profit sections

##### 1.6 - Commit Your Changes

```bash
git add lib/ai/xero-mcp-client.ts lib/ai/tools/xero-tools.ts
git commit -m "feat: add xero_get_profit_and_loss report tool"
```

---

#### STEP 2: Implement Remaining Phase 1 Commands

Now that you've completed one full implementation, repeat the pattern for the remaining 5 commands.

##### 2.1 - `xero_get_balance_sheet`

🤖 **AI PROMPT:**
```
Implement xero_get_balance_sheet following the exact pattern I used for xero_get_profit_and_loss:

1. Add tool definition to xeroMCPTools array
   - Tool name: "xero_get_balance_sheet"
   - Description: "Get balance sheet report showing assets, liabilities, and equity"
   - Parameters: fromDate (required), toDate (required), periods (optional), timeframe (optional)

2. Add case to executeXeroMCPTool switch
   - Call client.accountingApi.getReportBalanceSheet()
   - Pass tenantId, fromDate, toDate, periods, timeframe

3. Add AI SDK wrapper in createXeroTools()
   - Use Zod schemas matching the MCP tool
   - Call executeXeroMCPTool with "xero_get_balance_sheet"

Show me the complete code for all three sections.
```

##### 2.2 - `xero_get_trial_balance`

🤖 **AI PROMPT:**
```
Implement xero_get_trial_balance following the same pattern:

1. Add tool definition to xeroMCPTools array
   - Tool name: "xero_get_trial_balance"
   - Description: "Get trial balance report showing all account balances"
   - Parameters: date (required) - single date parameter

2. Add case to executeXeroMCPTool switch
   - Call client.accountingApi.getReportTrialBalance()
   - Pass tenantId, date

3. Add AI SDK wrapper in createXeroTools()
   - Single parameter: date (string, required)
   - Call executeXeroMCPTool with "xero_get_trial_balance"

Show me the complete code for all three sections.
```

##### 2.3 - `xero_list_payments`

🤖 **AI PROMPT:**
```
Implement xero_list_payments for retrieving payment records:

1. Add tool definition to xeroMCPTools array
   - Tool name: "xero_list_payments"
   - Description: "Get a list of payments from Xero"
   - Parameters:
     - dateFrom (optional): Filter from date (YYYY-MM-DD)
     - dateTo (optional): Filter to date (YYYY-MM-DD)
     - limit (optional, default 100): Max results

2. Add case to executeXeroMCPTool switch
   - Build where clause for date filtering if provided
   - Call client.accountingApi.getPayments()
   - Pass tenantId, undefined (ifModifiedSince), where clause

3. Add AI SDK wrapper in createXeroTools()
   - Zod schemas for dateFrom, dateTo, limit
   - Call executeXeroMCPTool with "xero_list_payments"

Show me the complete code for all three sections.
```

##### 2.4 - `xero_list_tax_rates`

🤖 **AI PROMPT:**
```
Implement xero_list_tax_rates for getting tax configuration:

1. Add tool definition to xeroMCPTools array
   - Tool name: "xero_list_tax_rates"
   - Description: "Get a list of tax rates configured in Xero"
   - Parameters: (no parameters needed)

2. Add case to executeXeroMCPTool switch
   - Call client.accountingApi.getTaxRates()
   - Pass only tenantId

3. Add AI SDK wrapper in createXeroTools()
   - Empty Zod object: z.object({})
   - Call executeXeroMCPTool with "xero_list_tax_rates"

Show me the complete code for all three sections.
```

##### 2.5 - `xero_list_credit_notes`

🤖 **AI PROMPT:**
```
Implement xero_list_credit_notes similar to invoices:

1. Add tool definition to xeroMCPTools array
   - Tool name: "xero_list_credit_notes"
   - Description: "Get a list of credit notes from Xero"
   - Parameters:
     - status (optional): DRAFT, SUBMITTED, AUTHORISED, PAID, VOIDED
     - dateFrom (optional): Filter from date
     - dateTo (optional): Filter to date
     - limit (optional, default 100): Max results

2. Add case to executeXeroMCPTool switch
   - Build where clause for status and dates
   - Call client.accountingApi.getCreditNotes()
   - Pass tenantId, undefined, where clause

3. Add AI SDK wrapper in createXeroTools()
   - Zod schemas for status (enum), dates, limit
   - Call executeXeroMCPTool with "xero_list_credit_notes"

Show me the complete code for all three sections.
```

---

### Phase 1 Testing Checklist

After implementing all 6 commands, test each one:

- [ ] `xero_get_profit_and_loss` - "Show me P&L for last quarter"
- [ ] `xero_get_balance_sheet` - "Get balance sheet as of today"
- [ ] `xero_get_trial_balance` - "Show trial balance for March 31, 2024"
- [ ] `xero_list_payments` - "List all payments from last month"
- [ ] `xero_list_tax_rates` - "What tax rates are configured?"
- [ ] `xero_list_credit_notes` - "Show me all credit notes"

### Phase 1 Completion Checklist

- [ ] All 6 tools added to `xeroMCPTools` array
- [ ] All 6 cases added to `executeXeroMCPTool` switch
- [ ] All 6 wrappers added to `createXeroTools()` return object
- [ ] No TypeScript errors (`pnpm lint`)
- [ ] All 6 tools tested in chat interface
- [ ] All 6 tools return valid data
- [ ] Code formatted (`pnpm format`)
- [ ] Changes committed to git

### Phase 1 Commit

```bash
git add lib/ai/xero-mcp-client.ts lib/ai/tools/xero-tools.ts
git commit -m "feat(xero): add Phase 1 financial reporting tools

- xero_get_profit_and_loss
- xero_get_balance_sheet
- xero_get_trial_balance
- xero_list_payments
- xero_list_tax_rates
- xero_list_credit_notes

Coverage increased from 8 to 14 commands (31%)"
```

---

## Phase 2: Transactional Data

### Overview

**Goal:** Add 5 transactional data access commands
**Time:** 3-4 hours
**Difficulty:** ⭐⭐☆☆☆ (Beginner)

### Commands to Implement

1. `xero_list_items` - Product/service catalog
2. `xero_list_quotes` - Sales quotes
3. `xero_list_contact_groups` - Contact groupings
4. `xero_get_aged_receivables` - AR aging by contact
5. `xero_get_aged_payables` - AP aging by contact

### Bulk Implementation Approach

Since these follow the same pattern, you can implement them in batches.

🤖 **AI PROMPT - Batch Implementation:**
```
I need to implement 5 transactional data commands in Phase 2. Generate the complete code for all three sections for each command:

1. xero_list_items
   - Description: "Get a list of inventory items and services from Xero"
   - Parameters: code (optional), limit (optional, default 100)
   - API method: client.accountingApi.getItems()

2. xero_list_quotes
   - Description: "Get a list of sales quotes from Xero"
   - Parameters: status (optional: DRAFT, SENT, ACCEPTED, DECLINED), dateFrom, dateTo, limit
   - API method: client.accountingApi.getQuotes()
   - Build where clause for status and dates

3. xero_list_contact_groups
   - Description: "Get a list of contact groups from Xero"
   - Parameters: (no parameters)
   - API method: client.accountingApi.getContactGroups()

4. xero_get_aged_receivables
   - Description: "Get aged receivables report showing outstanding invoices by age"
   - Parameters: contactId (required), date (optional), fromDate (optional), toDate (optional)
   - API method: client.accountingApi.getReportAgedReceivablesByContact()

5. xero_get_aged_payables
   - Description: "Get aged payables report showing outstanding bills by age"
   - Parameters: contactId (required), date (optional), fromDate (optional), toDate (optional)
   - API method: client.accountingApi.getReportAgedPayablesByContact()

For each command, provide:
A) Tool definition for xeroMCPTools array
B) Case for executeXeroMCPTool switch statement
C) AI SDK wrapper for createXeroTools() function

Format the output with clear section markers so I can copy-paste into the correct files.
```

### Phase 2 Implementation Steps

1. **Copy AI-generated code sections** into respective files
2. **Run linter:** `pnpm lint` and fix any issues
3. **Test each command** with sample queries:
   - "Show me all inventory items"
   - "List quotes from last month"
   - "What contact groups exist?"
   - "Show aged receivables for Contact XYZ"
   - "Get aged payables for Contact ABC"

4. **Commit changes:**
   ```bash
   git add lib/ai/xero-mcp-client.ts lib/ai/tools/xero-tools.ts
   git commit -m "feat(xero): add Phase 2 transactional data tools

   - xero_list_items
   - xero_list_quotes
   - xero_list_contact_groups
   - xero_get_aged_receivables
   - xero_get_aged_payables

   Coverage increased from 14 to 19 commands (42%)"
   ```

---

## Phase 3: Write Operations

### Overview

**Goal:** Add 8 write operation commands (CRUD)
**Time:** 8-10 hours
**Difficulty:** ⭐⭐⭐⭐☆ (Advanced)

⚠️ **IMPORTANT:** Write operations modify data in Xero. Take extra care with validation and error handling.

### Commands to Implement

1. `xero_create_invoice` - Create new invoice
2. `xero_update_invoice` - Update draft invoice
3. `xero_create_contact` - Create new contact
4. `xero_update_contact` - Update contact details
5. `xero_create_payment` - Record payment
6. `xero_create_quote` - Create sales quote
7. `xero_create_credit_note` - Issue credit note
8. `xero_update_credit_note` - Update draft credit note

### Security Considerations

Before implementing write operations, understand these security requirements:

1. **OAuth Scopes:** Ensure Xero connection has write permissions
2. **Validation:** Validate all input data before API calls
3. **Error Handling:** Provide clear error messages
4. **Audit Logging:** Consider logging write operations (optional Phase 3B)
5. **User Confirmation:** Consider adding confirmation prompts (optional)

### Write Operations Pattern

Write operations follow a different pattern than read operations:

**Read Pattern:**
```typescript
// Simple: fetch and return data
const response = await client.accountingApi.getInvoices(...);
return { content: [{ type: "text", text: JSON.stringify(response.body.invoices) }] };
```

**Write Pattern:**
```typescript
// Complex: construct request object, validate, create, return confirmation
const invoice: Invoice = {
  type: Invoice.TypeEnum.ACCREC,
  contact: { contactID: args.contactId },
  date: args.date,
  dueDate: args.dueDate,
  lineItems: args.lineItems.map(item => ({
    description: item.description,
    quantity: item.quantity,
    unitAmount: item.unitAmount,
    accountCode: item.accountCode,
  })),
  status: Invoice.StatusEnum.DRAFT,
};

const response = await client.accountingApi.createInvoices(
  connection.tenantId,
  { invoices: [invoice] }
);

return { content: [{ type: "text", text: JSON.stringify(response.body.invoices[0]) }] };
```

---

### STEP 1: Implement `xero_create_invoice`

This is the most complex write operation. Once you understand this, others will be easier.

#### 1.1 - Understand Invoice Creation

🤖 **AI PROMPT:**
```
I need to implement xero_create_invoice. Help me understand:

1. What is the structure of an Invoice object in xero-node SDK?
2. What are the required fields for creating an invoice?
3. What are the optional fields I should support?
4. How do I handle line items array?
5. Show me an example Invoice object

Reference the Invoice type from xero-node SDK.
```

#### 1.2 - Add Tool Definition (Complex Schema)

🤖 **AI PROMPT:**
```
Add tool definition for xero_create_invoice to xeroMCPTools array.

Parameters needed:
- contactId (string, required): Contact ID for the invoice
- date (string, required): Invoice date (YYYY-MM-DD)
- dueDate (string, required): Due date (YYYY-MM-DD)
- lineItems (array, required): Array of line items with:
  - description (string, required)
  - quantity (number, required)
  - unitAmount (number, required)
  - accountCode (string, required)
  - taxType (string, optional)
- reference (string, optional): Invoice reference/number
- status (string, optional): DRAFT or AUTHORISED (default: DRAFT)

Create the inputSchema following MCP tool pattern.
```

**Expected Tool Definition:**
```typescript
{
  name: "xero_create_invoice",
  description:
    "Create a new invoice in Xero. Creates a draft invoice by default.",
  inputSchema: {
    type: "object",
    properties: {
      contactId: {
        type: "string",
        description: "The Xero contact ID for the customer",
      },
      date: {
        type: "string",
        description: "Invoice date (YYYY-MM-DD format)",
      },
      dueDate: {
        type: "string",
        description: "Payment due date (YYYY-MM-DD format)",
      },
      lineItems: {
        type: "array",
        description: "Array of invoice line items",
        items: {
          type: "object",
          properties: {
            description: {
              type: "string",
              description: "Line item description",
            },
            quantity: {
              type: "number",
              description: "Quantity",
            },
            unitAmount: {
              type: "number",
              description: "Unit price",
            },
            accountCode: {
              type: "string",
              description: "Account code",
            },
            taxType: {
              type: "string",
              description: "Tax type (optional)",
            },
          },
          required: ["description", "quantity", "unitAmount", "accountCode"],
        },
      },
      reference: {
        type: "string",
        description: "Invoice reference number (optional)",
      },
      status: {
        type: "string",
        description: "Invoice status (DRAFT or AUTHORISED, default: DRAFT)",
        enum: ["DRAFT", "AUTHORISED"],
      },
    },
    required: ["contactId", "date", "dueDate", "lineItems"],
  },
},
```

#### 1.3 - Add Execution Logic (Complex Construction)

🤖 **AI PROMPT:**
```
Add execution logic for xero_create_invoice in executeXeroMCPTool switch.

Steps needed:
1. Extract and validate parameters from args
2. Construct Invoice object following xero-node SDK structure
3. Handle lineItems array transformation
4. Set default status to DRAFT if not provided
5. Call client.accountingApi.createInvoices()
6. Return created invoice details

Use Invoice type from xero-node SDK.
Handle errors with clear messages.
```

**Expected Execution Logic:**
```typescript
case "xero_create_invoice": {
  const { contactId, date, dueDate, lineItems, reference, status } = args;

  // Validate required fields
  if (!contactId || !date || !dueDate || !lineItems) {
    throw new Error(
      "contactId, date, dueDate, and lineItems are required"
    );
  }

  // Import Invoice type from xero-node
  const { Invoice, LineItem } = await import("xero-node");

  // Construct invoice object
  const invoice: Invoice = {
    type: Invoice.TypeEnum.ACCREC, // Accounts Receivable
    contact: {
      contactID: contactId as string,
    },
    date: date as string,
    dueDate: dueDate as string,
    lineItems: (lineItems as any[]).map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitAmount: item.unitAmount,
      accountCode: item.accountCode,
      taxType: item.taxType,
    })),
    status: (status as string) || Invoice.StatusEnum.DRAFT,
    reference: reference as string | undefined,
  };

  const response = await client.accountingApi.createInvoices(
    connection.tenantId,
    {
      invoices: [invoice],
    }
  );

  // Check for validation errors
  if (response.body.invoices?.[0]?.hasErrors) {
    const errors = response.body.invoices[0].validationErrors;
    throw new Error(
      `Invoice validation failed: ${JSON.stringify(errors)}`
    );
  }

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(response.body.invoices?.[0], null, 2),
      },
    ],
  };
}
```

#### 1.4 - Add AI SDK Wrapper (Complex Schema)

🤖 **AI PROMPT:**
```
Add AI SDK wrapper for xero_create_invoice in createXeroTools().

Use Zod schemas to match the MCP tool definition:
- contactId: z.string()
- date: z.string()
- dueDate: z.string()
- lineItems: z.array() with nested object schema
- reference: z.string().optional()
- status: z.enum(["DRAFT", "AUTHORISED"]).optional()

The lineItems array should have this structure:
z.array(z.object({
  description: z.string(),
  quantity: z.number(),
  unitAmount: z.number(),
  accountCode: z.string(),
  taxType: z.string().optional(),
}))
```

**Expected Wrapper:**
```typescript
xero_create_invoice: tool({
  description:
    "Create a new invoice in Xero. Use this to bill customers for products or services. Creates a draft invoice by default.",
  inputSchema: z.object({
    contactId: z
      .string()
      .describe("The Xero contact ID for the customer"),
    date: z
      .string()
      .describe("Invoice date (YYYY-MM-DD format)"),
    dueDate: z
      .string()
      .describe("Payment due date (YYYY-MM-DD format)"),
    lineItems: z
      .array(
        z.object({
          description: z.string().describe("Line item description"),
          quantity: z.number().describe("Quantity"),
          unitAmount: z.number().describe("Unit price"),
          accountCode: z.string().describe("Account code from chart of accounts"),
          taxType: z.string().optional().describe("Tax type code (optional)"),
        })
      )
      .describe("Array of invoice line items"),
    reference: z
      .string()
      .optional()
      .describe("Invoice reference number (optional)"),
    status: z
      .enum(["DRAFT", "AUTHORISED"])
      .optional()
      .describe("Invoice status (default: DRAFT)"),
  }),
  execute: async (args) => {
    const result = await executeXeroMCPTool(
      userId,
      "xero_create_invoice",
      args
    );
    return result.content[0].text;
  },
}),
```

#### 1.5 - Test Invoice Creation

**Testing Steps:**

1. **Get a Contact ID:**
   - Chat: "List my contacts"
   - Copy a contactID from the response

2. **Get an Account Code:**
   - Chat: "List accounts"
   - Find a revenue account code (usually 200 or 400 series)

3. **Create Test Invoice:**
   ```
   Chat: "Create an invoice for contact [CONTACT_ID] dated today, due in 30 days, with one line item: 'Consulting Services' quantity 10 hours at $150/hour using account code 200"
   ```

4. **Verify in Xero:**
   - Log in to Xero Demo Company
   - Go to Business > Invoices
   - Check that the draft invoice was created

5. **Test Error Handling:**
   ```
   Chat: "Create an invoice with invalid contact ID 'INVALID'"
   ```
   - Should see error message about invalid contact

---

### STEP 2: Implement Remaining Write Operations

🤖 **AI PROMPT - Batch Write Operations:**
```
Implement the remaining 7 write operations following the xero_create_invoice pattern.

For each command, provide complete code for:
A) Tool definition in xeroMCPTools
B) Execution logic in executeXeroMCPTool
C) AI SDK wrapper in createXeroTools

Commands:

1. xero_update_invoice
   - Parameters: invoiceId (required), same fields as create but all optional except invoiceId
   - API: client.accountingApi.updateInvoice(tenantId, invoiceId, invoices)
   - Note: Can only update DRAFT invoices

2. xero_create_contact
   - Parameters: name (required), email, phone, addresses array
   - API: client.accountingApi.createContacts(tenantId, { contacts: [contact] })

3. xero_update_contact
   - Parameters: contactId (required), name, email, phone, addresses (all optional except contactId)
   - API: client.accountingApi.updateContact(tenantId, contactId, { contacts: [contact] })

4. xero_create_payment
   - Parameters: invoiceId (required), accountId (required), amount (required), date (required)
   - API: client.accountingApi.createPayments(tenantId, { payments: [payment] })

5. xero_create_quote
   - Parameters: Same as invoice (contactId, date, expiryDate, lineItems, reference, status)
   - API: client.accountingApi.createQuotes(tenantId, { quotes: [quote] })

6. xero_create_credit_note
   - Parameters: contactId, date, lineItems, reference, status
   - API: client.accountingApi.createCreditNotes(tenantId, { creditNotes: [creditNote] })

7. xero_update_credit_note
   - Parameters: creditNoteId (required), other fields optional
   - API: client.accountingApi.updateCreditNote(tenantId, creditNoteId, { creditNotes: [creditNote] })
   - Note: Can only update DRAFT credit notes

For each, include:
- Input validation
- Error handling
- Type imports from xero-node
- Clear descriptions
```

### Phase 3 Testing Strategy

**Test Each Write Operation:**

1. **Create Operations:**
   - Create invoice → Verify in Xero
   - Create contact → List contacts to confirm
   - Create payment → Check payment records
   - Create quote → Verify in Xero quotes
   - Create credit note → Verify in Xero

2. **Update Operations:**
   - Create draft invoice → Update it → Verify changes
   - Create contact → Update details → Verify changes
   - Create draft credit note → Update it → Verify changes

3. **Error Cases:**
   - Try to update non-existent ID → Should error
   - Try to update AUTHORISED invoice → Should error
   - Missing required fields → Should error with clear message
   - Invalid data types → Should error with validation message

### Phase 3 Completion Checklist

- [ ] All 8 write operations implemented
- [ ] Input validation on all write operations
- [ ] Error handling with clear messages
- [ ] Tested creation operations in Xero Demo Company
- [ ] Tested update operations on draft records
- [ ] Tested error cases (invalid IDs, missing fields)
- [ ] No TypeScript errors
- [ ] Code formatted and linted
- [ ] Committed to git

### Phase 3 Commit

```bash
git add lib/ai/xero-mcp-client.ts lib/ai/tools/xero-tools.ts
git commit -m "feat(xero): add Phase 3 write operation tools

CRUD operations added:
- xero_create_invoice, xero_update_invoice
- xero_create_contact, xero_update_contact
- xero_create_payment
- xero_create_quote
- xero_create_credit_note, xero_update_credit_note

Coverage increased from 19 to 27 commands (60%)
Enables full accounting automation capabilities"
```

---

## Phase 4: Payroll Integration (OPTIONAL)

### Overview

**Goal:** Add 10 payroll-specific commands
**Time:** 10-12 hours
**Difficulty:** ⭐⭐⭐⭐⭐ (Expert)

⚠️ **REGION-SPECIFIC:** Payroll API only available in NZ and UK regions.

### Prerequisites

- [ ] Xero Demo Company set to NZ or UK region
- [ ] OAuth connection includes payroll scopes
- [ ] Understanding of payroll concepts (timesheets, leave, etc.)

### Commands to Implement

**Read Operations (5):**
1. `xero_list_payroll_employees`
2. `xero_list_payroll_employee_leave`
3. `xero_list_payroll_employee_leave_balances`
4. `xero_list_payroll_leave_types`
5. `xero_get_payroll_timesheet`

**Write Operations (5):**
6. `xero_create_payroll_timesheet`
7. `xero_update_payroll_timesheet_line`
8. `xero_approve_payroll_timesheet`
9. `xero_revert_payroll_timesheet`
10. `xero_delete_payroll_timesheet`

### Implementation Approach

Since payroll is region-specific and uses different API endpoints:

🤖 **AI PROMPT - Payroll Implementation:**
```
I need to implement Xero Payroll UK API integration for 10 commands.

Important notes:
- Use client.payrollUkApi instead of accountingApi
- Import types from xero-node UK Payroll package
- Payroll requires additional OAuth scopes
- Test with UK Demo Company

For each command, generate:
A) Tool definition
B) Execution logic
C) AI SDK wrapper

Commands:
1. xero_list_payroll_employees - client.payrollUkApi.getEmployees()
2. xero_list_payroll_employee_leave - client.payrollUkApi.getEmployeeLeaves()
3. xero_list_payroll_employee_leave_balances - client.payrollUkApi.getEmployeeLeaveBalances()
4. xero_list_payroll_leave_types - client.payrollUkApi.getLeaveTypes()
5. xero_get_payroll_timesheet - client.payrollUkApi.getTimesheet(timesheetId)
6. xero_create_payroll_timesheet - client.payrollUkApi.createTimesheet()
7. xero_update_payroll_timesheet_line - client.payrollUkApi.updateTimesheetLine()
8. xero_approve_payroll_timesheet - client.payrollUkApi.approveTimesheet()
9. xero_revert_payroll_timesheet - client.payrollUkApi.revertTimesheet()
10. xero_delete_payroll_timesheet - client.payrollUkApi.deleteTimesheet()

Provide complete implementation for all sections.
```

### Testing Payroll Implementation

**Setup UK Demo Company:**
1. Create new Xero Demo Company with UK region
2. Go to Payroll setup in Xero
3. Add test employees with leave and timesheet data

**Test Scenarios:**
- List employees → Should show UK demo employees
- Get leave balances → Should show employee leave data
- Create timesheet → Should create draft timesheet
- Approve timesheet → Should change status to approved
- Delete timesheet → Should remove timesheet

---

## Testing Guide

### Unit Testing

#### Setting Up Tests

Create test file: `tests/xero-mcp-tools.test.ts`

🤖 **AI PROMPT:**
```
Help me create unit tests for Xero MCP tools.

Create tests for:
1. Tool definition validation
2. Execution logic with mocked Xero client
3. Error handling scenarios
4. Parameter validation

Use the existing test patterns in tests/ directory.
Mock the XeroClient to avoid real API calls.
```

**Example Test Structure:**
```typescript
import { describe, it, expect, vi } from 'vitest';
import { executeXeroMCPTool } from '@/lib/ai/xero-mcp-client';
import { XeroClient } from 'xero-node';

// Mock XeroClient
vi.mock('xero-node');

describe('Xero MCP Tools', () => {
  describe('xero_get_profit_and_loss', () => {
    it('should fetch P&L report with valid dates', async () => {
      const mockResponse = {
        body: {
          reportID: 'ProfitAndLoss',
          reportName: 'Profit and Loss',
          rows: [/* ... */]
        }
      };

      const mockClient = {
        accountingApi: {
          getReportProfitAndLoss: vi.fn().mockResolvedValue(mockResponse)
        }
      };

      // Test execution
      const result = await executeXeroMCPTool('user-123', 'xero_get_profit_and_loss', {
        fromDate: '2024-01-01',
        toDate: '2024-03-31'
      });

      expect(result.content[0].text).toContain('ProfitAndLoss');
    });

    it('should error when dates are missing', async () => {
      await expect(
        executeXeroMCPTool('user-123', 'xero_get_profit_and_loss', {})
      ).rejects.toThrow('fromDate and toDate are required');
    });
  });
});
```

### Integration Testing

#### Testing with Xero Demo Company

**Manual Test Script:**

```typescript
// tests/manual/test-xero-tools.ts
// Run with: npx tsx tests/manual/test-xero-tools.ts

import { executeXeroMCPTool } from '@/lib/ai/xero-mcp-client';

async function testTools() {
  const userId = 'your-test-user-id'; // Replace with actual user ID

  console.log('Testing Xero MCP Tools...\n');

  // Test 1: Get Organisation
  console.log('1. Testing xero_get_organisation...');
  const org = await executeXeroMCPTool(userId, 'xero_get_organisation', {});
  console.log('✓ Organisation:', JSON.parse(org.content[0].text).name);

  // Test 2: List Invoices
  console.log('\n2. Testing xero_list_invoices...');
  const invoices = await executeXeroMCPTool(userId, 'xero_list_invoices', { limit: 5 });
  console.log('✓ Found', JSON.parse(invoices.content[0].text).length, 'invoices');

  // Test 3: Get P&L
  console.log('\n3. Testing xero_get_profit_and_loss...');
  const pnl = await executeXeroMCPTool(userId, 'xero_get_profit_and_loss', {
    fromDate: '2024-01-01',
    toDate: '2024-03-31'
  });
  console.log('✓ P&L report retrieved');

  // Add more tests...

  console.log('\n✅ All tests passed!');
}

testTools().catch(console.error);
```

### E2E Testing with Chat Interface

**Test Scenarios:**

1. **Financial Reports:**
   - "Show me the profit and loss for Q1 2024"
   - "Get balance sheet as of March 31, 2024"
   - "What's the trial balance for today?"

2. **Transactional Queries:**
   - "List all inventory items"
   - "Show me quotes from last month with SENT status"
   - "What contact groups do we have?"

3. **Write Operations:**
   - "Create an invoice for [contact] for consulting services"
   - "Add a new customer named ABC Corp with email abc@example.com"
   - "Record a payment of $500 for invoice INV-001"

4. **Error Handling:**
   - "Create an invoice with invalid contact ID"
   - "Update a non-existent invoice"
   - "Get P&L without specifying dates"

---

## Troubleshooting

### Common Issues & Solutions

#### Issue 1: TypeScript Errors

**Error:** `Property 'getReportProfitAndLoss' does not exist on type 'AccountingApi'`

**Solution:**
```bash
# Update xero-node SDK to latest version
pnpm update xero-node

# Check SDK version
pnpm list xero-node
```

🤖 **AI PROMPT:**
```
I'm getting TypeScript error about missing method on AccountingApi. Help me:
1. Check if xero-node SDK is up to date
2. Verify the correct method signature
3. Fix the import statements
```

---

#### Issue 2: OAuth Token Expired

**Error:** `Xero API error: token_expired`

**Solution:**
- The token refresh should happen automatically via `persistTokenSet()`
- If it's not working, check connection-manager.ts

🤖 **AI PROMPT:**
```
Token refresh isn't working. Help me debug:
1. Check persistTokenSet() function in xero-mcp-client.ts
2. Verify token refresh logic in connection-manager.ts
3. Test token refresh with expired connection
```

---

#### Issue 3: Xero API Validation Errors

**Error:** `Invoice validation failed: Contact is required`

**Solution:**
- Check that required fields are being passed correctly
- Validate data structure matches Xero API expectations

🤖 **AI PROMPT:**
```
I'm getting Xero validation error when creating invoice. Help me:
1. Show me the correct Invoice object structure
2. Check my parameters are being mapped correctly
3. Add better validation before the API call
```

---

#### Issue 4: Rate Limiting

**Error:** `Too many requests`

**Solution:**
- Xero has API rate limits (5000 requests per day)
- Implement exponential backoff retry logic

🤖 **AI PROMPT:**
```
Add retry logic with exponential backoff for Xero API calls:
1. Detect rate limit errors (HTTP 429)
2. Implement exponential backoff (1s, 2s, 4s, 8s)
3. Maximum 3 retries
4. Apply to executeXeroMCPTool function
```

---

#### Issue 5: Missing OAuth Scopes

**Error:** `The user does not have permission to access this resource`

**Solution:**
- Check OAuth scopes in connection
- Reconnect to Xero with additional scopes

**Required Scopes for Write Operations:**
```typescript
const requiredScopes = [
  'accounting.transactions',      // Required for invoices, payments
  'accounting.contacts',           // Required for contacts
  'accounting.settings',           // Required for accounts, tax rates
  'accounting.reports.read',       // Required for reports
  'accounting.journals.read',      // Required for journals
  'accounting.attachments',        // Optional: for attachments
];
```

---

### Debugging Tools

#### Enable Detailed Logging

🤖 **AI PROMPT:**
```
Add debug logging to Xero MCP client:
1. Log API method calls with parameters
2. Log API responses (truncated to 500 chars)
3. Log token refresh events
4. Use DEBUG environment variable to enable/disable

Don't log in production mode.
```

#### Xero API Explorer

Use Xero's API Explorer to test API calls:
https://api-explorer.xero.com/

- Test API methods before implementing
- See exact request/response formats
- Validate your understanding of parameters

---

## AI Prompts Library

### Understanding Existing Code

```
Explain the architecture of lib/ai/xero-mcp-client.ts:
- How are MCP tools defined?
- How is authentication handled?
- How does token refresh work?
- What's the pattern for adding new tools?

Provide a step-by-step breakdown with code references.
```

```
Show me how xero_list_invoices works from end to end:
1. Tool definition in xeroMCPTools
2. Execution in executeXeroMCPTool
3. AI SDK wrapper in createXeroTools
4. How it's called from chat interface

Trace the full execution path with code snippets.
```

### Implementing New Features

```
Implement [TOOL_NAME] following the existing pattern:
1. Add tool definition to xeroMCPTools array
2. Add execution logic to executeXeroMCPTool switch
3. Add AI SDK wrapper to createXeroTools function

Parameters: [LIST_PARAMETERS]
API Method: [XERO_API_METHOD]
Description: [DESCRIPTION]

Show me the complete code for all three sections.
```

```
Add input validation for [TOOL_NAME]:
- Validate required fields are present
- Check data types match expected types
- Validate date formats (YYYY-MM-DD)
- Validate enum values
- Return clear error messages

Show me the validation code to add.
```

### Debugging Issues

```
I'm getting error "[ERROR_MESSAGE]" when calling [TOOL_NAME].
Help me debug:
1. Check if parameters are being passed correctly
2. Verify the Xero API method signature
3. Check token/auth status
4. Suggest fixes

Show me the debugging steps and code fixes.
```

```
The [TOOL_NAME] tool isn't being recognized by the AI.
Help me verify:
1. Tool is added to xeroMCPTools array
2. Tool has execution case in switch statement
3. Tool is exported in createXeroTools
4. Tool name is added to xeroToolNames export
5. No TypeScript errors

Walk me through the checklist.
```

### Writing Tests

```
Create unit tests for [TOOL_NAME]:
1. Test with valid parameters
2. Test with missing required parameters
3. Test with invalid data types
4. Test error handling

Use vitest and mock the XeroClient.
Show me the complete test file.
```

```
Create integration test that:
1. Connects to Xero Demo Company
2. Calls [TOOL_NAME] with test data
3. Verifies response structure
4. Checks data is created in Xero (for write operations)

Show me the test code.
```

### Code Review

```
Review my implementation of [TOOL_NAME] for:
1. TypeScript best practices
2. Error handling completeness
3. Input validation
4. Code consistency with existing tools
5. Security considerations (for write operations)

Suggest improvements.
```

```
Check if my Zod schemas in [TOOL_NAME] wrapper match the MCP tool definition:
- All parameters included
- Types match (string, number, array, enum)
- Required vs optional correct
- Descriptions are clear

Point out any mismatches.
```

---

## Best Practices

### Code Quality Standards

#### 1. TypeScript Typing

**Always use proper types:**

```typescript
// ❌ Bad: Using any
case "xero_create_invoice": {
  const invoice: any = { ... };
}

// ✅ Good: Using xero-node types
case "xero_create_invoice": {
  const { Invoice } = await import("xero-node");
  const invoice: Invoice = { ... };
}
```

#### 2. Error Handling

**Provide clear error messages:**

```typescript
// ❌ Bad: Generic error
if (!invoiceId) throw new Error("Missing parameter");

// ✅ Good: Specific error with context
if (!invoiceId) {
  throw new Error(
    "xero_update_invoice requires invoiceId parameter. " +
    "Provide the Xero invoice ID to update."
  );
}
```

#### 3. Parameter Validation

**Validate before API calls:**

```typescript
// ✅ Validate required fields
if (!contactId || !date || !dueDate || !lineItems) {
  throw new Error(
    "Required fields missing: contactId, date, dueDate, lineItems"
  );
}

// ✅ Validate data formats
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
  throw new Error(
    "Invalid date format. Use YYYY-MM-DD format (e.g., 2024-03-15)"
  );
}

// ✅ Validate business logic
if (lineItems.length === 0) {
  throw new Error("Invoice must have at least one line item");
}
```

#### 4. Consistent Naming

**Follow naming conventions:**

```typescript
// MCP tool names: xero_snake_case
"xero_list_invoices"
"xero_get_profit_and_loss"

// Function names: camelCase
executeXeroMCPTool()
getXeroClient()

// Type names: PascalCase
XeroMCPTool
XeroMCPToolResult
```

#### 5. Documentation

**Add clear descriptions:**

```typescript
{
  name: "xero_create_invoice",
  description:
    "Create a new invoice in Xero. " +
    "Creates a draft invoice by default. " +
    "Requires contact ID, date, due date, and at least one line item.",
  // ...
}
```

### Security Best Practices

#### 1. Input Sanitization

```typescript
// Sanitize string inputs
const sanitizedName = (args.name as string).trim().slice(0, 255);

// Validate numeric ranges
if (args.amount && (args.amount < 0 || args.amount > 999999999)) {
  throw new Error("Amount must be between 0 and 999,999,999");
}
```

#### 2. Sensitive Data Handling

```typescript
// ❌ Bad: Logging sensitive data
console.log("Access token:", connection.accessToken);

// ✅ Good: Log only non-sensitive info
console.log("Token expires at:", connection.expiresAt);
```

#### 3. Rate Limiting

```typescript
// Consider adding rate limiting for write operations
// Track operations per user per time period
// Prevent accidental mass operations
```

### Performance Optimization

#### 1. Minimize API Calls

```typescript
// ❌ Bad: Multiple API calls
const contact = await getContact(contactId);
const invoice = await createInvoice(contact.contactID);

// ✅ Good: Use contactId directly
const invoice = await createInvoice(contactId);
```

#### 2. Efficient Data Transformation

```typescript
// ✅ Use map instead of forEach + push
const lineItems = (args.lineItems as any[]).map(item => ({
  description: item.description,
  quantity: item.quantity,
  unitAmount: item.unitAmount,
}));
```

### Testing Standards

#### 1. Test Coverage

Ensure tests for:
- [ ] Valid input scenarios
- [ ] Missing required parameters
- [ ] Invalid data types
- [ ] Edge cases (empty arrays, zero amounts, etc.)
- [ ] Error conditions
- [ ] Business logic validation

#### 2. Test Data

Use realistic test data:

```typescript
const testInvoice = {
  contactId: "DEMO-CONTACT-123",
  date: "2024-03-15",
  dueDate: "2024-04-15",
  lineItems: [
    {
      description: "Consulting Services - March 2024",
      quantity: 40,
      unitAmount: 150.00,
      accountCode: "200",
    }
  ],
};
```

---

## Completion Checklist

### Phase 1: Financial Reports ✅
- [ ] `xero_get_profit_and_loss`
- [ ] `xero_get_balance_sheet`
- [ ] `xero_get_trial_balance`
- [ ] `xero_list_payments`
- [ ] `xero_list_tax_rates`
- [ ] `xero_list_credit_notes`
- [ ] All tools tested in chat
- [ ] No TypeScript errors
- [ ] Code committed to git

### Phase 2: Transactional Data ✅
- [ ] `xero_list_items`
- [ ] `xero_list_quotes`
- [ ] `xero_list_contact_groups`
- [ ] `xero_get_aged_receivables`
- [ ] `xero_get_aged_payables`
- [ ] All tools tested in chat
- [ ] No TypeScript errors
- [ ] Code committed to git

### Phase 3: Write Operations ✅
- [ ] `xero_create_invoice`
- [ ] `xero_update_invoice`
- [ ] `xero_create_contact`
- [ ] `xero_update_contact`
- [ ] `xero_create_payment`
- [ ] `xero_create_quote`
- [ ] `xero_create_credit_note`
- [ ] `xero_update_credit_note`
- [ ] Input validation on all write ops
- [ ] Error handling tested
- [ ] Write operations tested in Xero
- [ ] No TypeScript errors
- [ ] Code committed to git

### Phase 4: Payroll (Optional) ✅
- [ ] `xero_list_payroll_employees`
- [ ] `xero_list_payroll_employee_leave`
- [ ] `xero_list_payroll_employee_leave_balances`
- [ ] `xero_list_payroll_leave_types`
- [ ] `xero_get_payroll_timesheet`
- [ ] `xero_create_payroll_timesheet`
- [ ] `xero_update_payroll_timesheet_line`
- [ ] `xero_approve_payroll_timesheet`
- [ ] `xero_revert_payroll_timesheet`
- [ ] `xero_delete_payroll_timesheet`
- [ ] All tools tested with UK Demo Company
- [ ] No TypeScript errors
- [ ] Code committed to git

### Final Steps
- [ ] Update CLAUDE.md with new tools
- [ ] Run full test suite
- [ ] Verify linting passes
- [ ] Create pull request
- [ ] Code review completed
- [ ] Merge to main branch

---

## Additional Resources

### Official Documentation

- **Xero API Documentation:** https://developer.xero.com/documentation/api/
- **Xero API Explorer:** https://api-explorer.xero.com/
- **xero-node SDK Docs:** https://xeroapi.github.io/xero-node/accounting/
- **MCP Protocol Spec:** https://modelcontextprotocol.io/
- **Vercel AI SDK Docs:** https://sdk.vercel.ai/docs

### Learning Resources

- **TypeScript Handbook:** https://www.typescriptlang.org/docs/
- **Zod Documentation:** https://zod.dev/
- **Xero Developer Center:** https://developer.xero.com/

### Support Channels

- **LedgerBot Issues:** Create issue in project repository
- **Xero Developer Forum:** https://central.xero.com/s/topic/0TO1N000000MeJkWAK/xero-api
- **Xero Support:** https://developer.xero.com/contact-us/

---

## Glossary

**MCP (Model Context Protocol):** Standard protocol for AI tool integrations
**AI SDK:** Vercel AI SDK for building AI applications
**Zod:** TypeScript-first schema validation library
**OAuth2:** Authorization framework for secure API access
**Tenant ID:** Xero organisation identifier
**Account Code:** Chart of accounts identifier
**Line Item:** Individual item on an invoice/quote
**Draft:** Editable state before approval
**Authorised:** Approved and locked state

---

**Document Version:** 1.0
**Last Updated:** October 25, 2025
**Maintained By:** LedgerBot Development Team

---

## Quick Reference

### Command Summary

| Phase | Category | Commands | Status |
|-------|----------|----------|--------|
| Current | - | 8 | ✅ Implemented |
| Phase 1 | Financial Reports | 6 | 📋 To Implement |
| Phase 2 | Transactional Data | 5 | 📋 To Implement |
| Phase 3 | Write Operations | 8 | 📋 To Implement |
| Phase 4 | Payroll (Optional) | 10 | 📋 To Implement |
| **Total** | - | **37** | **To Add** |

### File Modification Summary

**Files to Modify:**
- `lib/ai/xero-mcp-client.ts` - Add 37 tool definitions + execution cases
- `lib/ai/tools/xero-tools.ts` - Add 37 AI SDK wrappers
- `CLAUDE.md` - Document new tools

**Estimated Lines of Code:**
- Phase 1: ~600 lines
- Phase 2: ~500 lines
- Phase 3: ~1000 lines
- Phase 4: ~1200 lines
- **Total:** ~3300 lines

### Time Estimates

- **Phase 1:** 4-6 hours (beginner-friendly)
- **Phase 2:** 3-4 hours (straightforward)
- **Phase 3:** 8-10 hours (complex, requires care)
- **Phase 4:** 10-12 hours (optional, region-specific)
- **Total:** 25-32 hours (phased over 2-4 weeks)

---

**Good luck with your implementation! 🚀**

Use the AI prompts liberally, test thoroughly, and don't hesitate to ask for help when needed.

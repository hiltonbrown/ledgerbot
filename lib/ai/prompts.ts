import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Geo } from "@vercel/functions";
import type { UserSettings } from "@/app/(settings)/api/user/data";
import type { ArtifactKind } from "@/components/artifact";
import type { LedgerbotPromptVars } from "./prompt-types";

interface SystemPromptOptions {
  requestHints: RequestHints;
  activeTools: string[];
  /** @deprecated No longer used. All user-defined settings come from userSettings.personalisation */
  userSystemPrompt?: string | null;
  userId: string;
  userSettings: UserSettings;
  xeroOrgSnapshot?: {
    organisationName?: string | null;
    organisationType?: string | null;
    isDemoCompany?: boolean | null;
    baseCurrency?: string | null;
    xeroShortCode?: string | null;
    industryContext?: string | null;
    chartOfAccountsSummary?: string | null;
  };
}

export const artifactsPrompt = `
Artifacts is a special user interface mode that helps users with writing, editing, and other content creation tasks. When artifact is open, it is on the right side of the screen, while the conversation is on the left side. When creating or updating documents, changes are reflected in real-time on the artifacts and visible to the user.

When asked to write code, always use artifacts. When writing code, specify the language in the backticks, e.g. \`\`\`python\`code here\`\`\`. The default language is Python. Other languages are not yet supported, so let the user know if they request a different language.

DO NOT UPDATE DOCUMENTS IMMEDIATELY AFTER CREATING THEM. WAIT FOR USER FEEDBACK OR REQUEST TO UPDATE IT.

**CRITICAL - Document Title Format:**
The title parameter is displayed in the UI to the user as a label for the artifact.

- **ALWAYS use a brief, descriptive title (2-5 words maximum)**
- The title should clearly describe what the artifact contains
- Examples: "August Invoice Report", "Customer Revenue Analysis", "GST Calculator", "Unpaid Invoices"

**Title Format Rules:**
✅ GOOD: "August Invoices", "Top Customers", "Payment Reminder"
❌ BAD: "Create a CSV file with invoice data...", "Generate a report showing..."
❌ BAD: Any title longer than 5 words

**How to Use createDocument:**
When creating an artifact, you must provide TWO separate pieces of information:
1. **title**: Short (2-5 words) for UI display
2. **prompt**: Detailed instructions and data for content generation

**Examples:**

\`\`\`
User: "Get August 2025 invoices and create a CSV"
Step 1: xero_list_invoices(dateFrom: '2025-08-01', dateTo: '2025-08-31')
Result: [{"invoiceID": "abc", "invoiceNumber": "INV-001", ...}, ...]
Step 2: createDocument(
  kind: 'sheet',
  title: 'August Invoices',
  prompt: 'Create a CSV file with the following Xero invoice data: [{"invoiceID": "abc", "invoiceNumber": "INV-001", "contact": {"name": "ABC Co"}, "date": "2025-08-15", "total": 1100.00, "amountDue": 0, "status": "PAID"}]. Format as columns: Invoice Number, Customer Name, Date, Total (inc GST), Amount Due, Status'
)
\`\`\`

\`\`\`
User: "Write a summary report of my top 5 customers"
Step 1: xero_list_invoices() and aggregate data
Result: Top customers data...
Step 2: createDocument(
  kind: 'text',
  title: 'Top Customers Report',
  prompt: 'Write a professional summary report of the top 5 customers by revenue. Data: 1. ABC Co - $50,000 total revenue, 2. XYZ Ltd - $45,000, 3. DEF Pty - $40,000, 4. GHI Corp - $35,000, 5. JKL Inc - $30,000. Include analysis of customer concentration.'
)
\`\`\`

\`\`\`
User: "Create Python code to calculate GST"
Step 1: createDocument(
  kind: 'code',
  title: 'GST Calculator',
  prompt: 'Create Python code to calculate GST (10%) from invoice totals. Show the GST amount and ex-GST amount for each value.'
)
\`\`\`

This is a guide for using artifacts tools: \`createDocument\` and \`updateDocument\`, which render content on a artifacts beside the conversation.

**When to use \`createDocument\`:**
- User says: "Write me an essay about X", "Create a code snippet for Y", "Make a spreadsheet showing Z"
- Starting fresh content unrelated to existing documents
- User explicitly requests "new", "fresh", or "separate" content
- Content is substantial (>10 lines) and likely to be saved/reused
- For substantial content (>10 lines) or code
- For content users will likely save/reuse (emails, code, essays, etc.)
- When explicitly requested to create a NEW document
- When the user wants to create something DIFFERENT from existing documents
- For when content contains a single code snippet
- ONLY when starting fresh content, not modifying existing content

**When NOT to use \`createDocument\`:**
- For informational/explanatory content
- For conversational responses
- When asked to keep it in chat
- When a document on the same or similar topic already exists in this conversation
- When the user asks to modify, change, improve, or revise existing content
- When the user says "make it", "change it", "update it", "fix it", or similar phrases
- When you just created a document and user provides feedback

**When to use \`updateDocument\`:**
- User says: "Make it better", "Change this to...", "Add more details", "Fix the formatting"
- User refers to "the document", "it", "this", or "that" (referring to most recent artifact)
- Providing feedback: "That's good, but can you...", "I want to modify..."
- Making specific changes: "Update the title", "Change the code to use...", "Add a new column"
- When user asks to modify, change, improve, fix, or revise existing content
- When user provides feedback on a document you created
- When user says "make it about X", "change it to Y", "add Z", "remove W", etc.
- When user refers to "the document", "it", or "this" (meaning the most recent document)
- As the default choice when user wants changes to existing content
- Default to full document rewrites for major changes
- Use targeted updates only for specific, isolated changes
- Follow user instructions for which parts to modify

**When NOT to use \`updateDocument\`:**
- Immediately after creating a document (wait for user feedback first)
- When no document exists to update

**Conversation Context Awareness:**
- Remember all documents created in this conversation
- Track document IDs and their purposes
- When user asks for changes without specifying which document, assume they mean the most recently created one
- If user creates multiple documents, ask for clarification when references are ambiguous
- Maintain document relationships (e.g., "update the code based on the spreadsheet")

**Recovery from Common Mistakes:**
- If you accidentally create a duplicate document, immediately suggest using updateDocument instead
- When user says "start over" or "new version", create a new document with a clear title distinction
- If uncertain about document relationships, ask the user to clarify which document they want to modify
- For complex multi-step tasks, create documents with descriptive titles to avoid confusion

**Decision Confidence:**
- If you're 85%+ confident the user wants to update an existing document, use updateDocument
- If confidence is 50-84%, ask for clarification before proceeding
- If confidence is <50%, default to createDocument to avoid breaking existing content
- When in doubt, create a new document rather than risk overwriting user work

**Document ID Management:**
- Track which documents you've created in this conversation
- When user refers to "the document", "it", or "this", they mean the most recently created document
- ALWAYS use \`updateDocument\` for follow-up requests about the same content
- ONLY create a new document if the user explicitly wants something separate and different

Do not update document right after creating it. Wait for user feedback or request to update it. When user asks for changes to existing content, use \`updateDocument\` instead of creating a duplicate document.
`;

export const regularPrompt =
  "You are a friendly assistant! Keep your responses concise and helpful.";

export type RequestHints = {
  latitude?: Geo["latitude"];
  longitude?: Geo["longitude"];
  city?: Geo["city"];
  country?: Geo["country"];
  userContext?: string;
  activeDocuments?: Array<{
    id: string;
    title: string;
    kind: ArtifactKind;
    createdAt: Date;
  }>;
};

export const getRequestPromptFromHints = (requestHints: RequestHints) => `\
About the origin of user's request:
- lat: ${requestHints.latitude ?? "unknown"}
- lon: ${requestHints.longitude ?? "unknown"}
- city: ${requestHints.city ?? "unknown"}
- country: ${requestHints.country ?? "unknown"}
`;

export const buildActiveDocumentsContext = (
  activeDocuments?: RequestHints["activeDocuments"]
) => {
  if (!activeDocuments || activeDocuments.length === 0) {
    return "";
  }

  const documentList = activeDocuments
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()) // Most recent first
    .map((doc, index) => {
      const isMostRecent = index === 0;
      return `${isMostRecent ? "**Most Recent:** " : ""}${doc.title} (${doc.kind}) - ID: ${doc.id}`;
    })
    .join("\n- ");

  return `

**Active Documents in This Conversation:**
- ${documentList}

When users refer to "the document", "it", or "this", they most likely mean the most recent document above.`;
};

/**
 * @deprecated This function is deprecated and should not be used for new features.
 * Use `buildLedgerbotSystemPrompt()` instead for the template-based system prompt architecture.
 *
 * This legacy function provided simple prompt concatenation without variable substitution.
 * It will be removed in a future version once all callsites are migrated.
 *
 * Migration guide:
 * - Replace calls to `systemPrompt()` with `buildLedgerbotSystemPrompt()`
 * - Pass `SystemPromptOptions` object with userSettings and xeroOrgSnapshot
 * - The new function automatically handles variable substitution and sanitization
 */
export const systemPrompt = ({
  requestHints,
  activeTools = [],
  userSystemPrompt,
}: {
  requestHints: RequestHints;
  activeTools?: readonly string[];
  userSystemPrompt?: string;
}) => {
  const requestPrompt = getRequestPromptFromHints(requestHints);
  const contextPrompt = requestHints.userContext
    ? `\n\n${requestHints.userContext}`
    : "";

  // Use user's custom prompt if provided, otherwise use default regularPrompt
  const basePrompt = userSystemPrompt || regularPrompt;

  const promptSections = [`${basePrompt}\n\n${requestPrompt}${contextPrompt}`];

  const hasArtifactTools = activeTools.some((tool) =>
    ["createDocument", "updateDocument"].includes(tool)
  );

  if (hasArtifactTools) {
    const activeDocumentsContext = buildActiveDocumentsContext(
      requestHints.activeDocuments
    );
    promptSections.push(artifactsPrompt + activeDocumentsContext);
  }

  return promptSections.join("\n\n");
};

// ==================================================================================
// ARTIFACT PROMPT TEMPLATES
// ==================================================================================
//
// Text, Code, and Spreadsheet artifacts use template-based prompts loaded from files.
// Similar to the main system prompt, these support variable substitution for
// user-specific customization.
//
// Template Files:
// - prompts/default-text-prompt.md
// - prompts/default-code-prompt.md
// - prompts/default-spreadsheet-prompt.md
//
// Each template can include:
// - {{CUSTOM_TEXT_INSTRUCTIONS}} / {{CUSTOM_CODE_INSTRUCTIONS}} / {{CUSTOM_SHEET_INSTRUCTIONS}}
// - {{INDUSTRY_CONTEXT}} - Industry-specific requirements
//
// ==================================================================================

/**
 * Default text document prompt template.
 * Loaded once at module initialization from prompts/default-text-prompt.md
 */
export const TEXT_PROMPT_TEMPLATE = (() => {
  try {
    const promptPath = join(
      process.cwd(),
      "prompts",
      "default-text-prompt.md"
    );
    return readFileSync(promptPath, "utf-8");
  } catch (error) {
    console.error("Failed to load text prompt template:", error);
    return "Write about the given topic. Markdown is supported. Use headings wherever appropriate.";
  }
})();

/**
 * Default code generation prompt template.
 * Loaded once at module initialization from prompts/default-code-prompt.md
 */
export const CODE_PROMPT_TEMPLATE = (() => {
  try {
    const promptPath = join(
      process.cwd(),
      "prompts",
      "default-code-prompt.md"
    );
    return readFileSync(promptPath, "utf-8");
  } catch (error) {
    console.error("Failed to load code prompt template:", error);
    return "You are a Python code generator that creates self-contained, executable code snippets.";
  }
})();

/**
 * Default spreadsheet creation prompt template.
 * Loaded once at module initialization from prompts/default-spreadsheet-prompt.md
 */
export const SHEET_PROMPT_TEMPLATE = (() => {
  try {
    const promptPath = join(
      process.cwd(),
      "prompts",
      "default-spreadsheet-prompt.md"
    );
    return readFileSync(promptPath, "utf-8");
  } catch (error) {
    console.error("Failed to load spreadsheet prompt template:", error);
    return "You are a spreadsheet creation assistant. Create CSV data with proper formatting.";
  }
})();

/**
 * Renders the text document prompt with user customization.
 *
 * @param customInstructions - Optional user-defined custom text instructions
 * @returns Rendered text prompt
 */
export function buildTextPrompt(customInstructions?: string): string {
  return renderTemplate(TEXT_PROMPT_TEMPLATE, {
    CUSTOM_TEXT_INSTRUCTIONS: sanitisePromptFragment(
      customInstructions,
      1000
    ),
  });
}

/**
 * Renders the code generation prompt with user customization.
 *
 * @param customInstructions - Optional user-defined custom code instructions
 * @param industryContext - Optional industry-specific requirements
 * @returns Rendered code prompt
 */
export function buildCodePrompt(
  customInstructions?: string,
  industryContext?: string
): string {
  return renderTemplate(CODE_PROMPT_TEMPLATE, {
    CUSTOM_CODE_INSTRUCTIONS: sanitisePromptFragment(
      customInstructions,
      1000
    ),
    INDUSTRY_CONTEXT: sanitisePromptFragment(industryContext, 2000),
  });
}

/**
 * Renders the spreadsheet creation prompt with user customization.
 *
 * @param customInstructions - Optional user-defined custom spreadsheet instructions
 * @returns Rendered spreadsheet prompt
 */
export function buildSheetPrompt(customInstructions?: string): string {
  return renderTemplate(SHEET_PROMPT_TEMPLATE, {
    CUSTOM_SHEET_INSTRUCTIONS: sanitisePromptFragment(
      customInstructions,
      1000
    ),
  });
}

/**
 * @deprecated Legacy hardcoded code prompt. Use buildCodePrompt() instead.
 * Kept for backward compatibility during migration.
 */
export const codePrompt = buildCodePrompt();

/**
 * @deprecated Legacy hardcoded sheet prompt. Use buildSheetPrompt() instead.
 * Kept for backward compatibility during migration.
 */
export const sheetPrompt = buildSheetPrompt();

export const updateDocumentPrompt = (
  currentContent: string | null,
  type: ArtifactKind
) => {
  let mediaType = "document";

  if (type === "code") {
    mediaType = "code snippet";
  } else if (type === "sheet") {
    mediaType = "spreadsheet";
  }

  return `Improve the following contents of the ${mediaType} based on the given prompt.

${currentContent}`;
};

// ==================================================================================
// SYSTEM PROMPT TEMPLATE ARCHITECTURE
// ==================================================================================
//
// LedgerBot uses a template-based system prompt architecture with variable substitution.
//
// Architecture Overview:
// 1. Template File: prompts/ledgerbot-system-prompt.md
//    - Contains the master template with {{VARIABLE}} placeholders
//    - Single source of truth for prompt content
//    - Edited directly without code changes
//
// 2. Variable Sources:
//    - User personalisation settings (UserSettings.personalisation table)
//    - Xero connection metadata (XeroConnection table)
//    - Request context (location, timezone, date)
//
// 3. Rendering Pipeline:
//    - buildLedgerbotSystemPrompt() fetches data sources
//    - sanitisePromptFragment() cleans user-provided values
//    - renderTemplate() substitutes {{VARIABLES}} with sanitized values
//    - Artifacts and request hints are appended
//
// 4. Security:
//    - All user-provided values are sanitized to prevent injection attacks
//    - Template characters ({{, }}, <, >) are stripped from user input
//    - Injection phrases ("ignore previous instructions") are removed
//    - Values are truncated to prevent token explosion
//
// Key Functions:
// - LEDGERBOT_SYSTEM_TEMPLATE: Loads the template file at module initialization
// - renderTemplate(): Core template engine (replaces {{KEY}} with values)
// - sanitisePromptFragment(): Security layer for user-provided content
// - buildLedgerbotSystemPrompt(): Main entry point (orchestrates the pipeline)
//
// See CLAUDE.md for detailed documentation on available template variables.
// ==================================================================================

/**
 * The LedgerBot system prompt template loaded from prompts/ledgerbot-system-prompt.md.
 * This is the single source of truth for the main system prompt.
 * Loaded once at module initialization for performance.
 */
export const LEDGERBOT_SYSTEM_TEMPLATE = (() => {
  try {
    const promptPath = join(
      process.cwd(),
      "prompts",
      "ledgerbot-system-prompt.md"
    );
    return readFileSync(promptPath, "utf-8");
  } catch (error) {
    console.error("Failed to load Ledgerbot system prompt template:", error);
    return "Error: System prompt template could not be loaded.";
  }
})();

/**
 * Renders a template by substituting {{VARIABLE}} placeholders with actual values.
 *
 * Features:
 * - Replaces all occurrences of {{KEY}} with the corresponding value from vars
 * - Preserves unknown placeholders and logs warnings
 * - Empty/null values result in placeholder removal (replaced with empty string)
 *
 * @param template - Template string with {{VARIABLE}} placeholders
 * @param vars - Key-value pairs for variable substitution
 * @returns Rendered template with variables substituted
 *
 * @example
 * ```typescript
 * const template = "Hello {{NAME}}, welcome to {{COMPANY}}!";
 * const result = renderTemplate(template, { NAME: "John", COMPANY: "Acme" });
 * // Returns: "Hello John, welcome to Acme!"
 * ```
 */
export function renderTemplate(
  template: string,
  vars: Record<string, string>
): string {
  let result = template;

  // 1. Replace known variables
  for (const [key, value] of Object.entries(vars)) {
    const placeholder = `{{${key}}}`;
    // Replace all occurrences
    result = result.replaceAll(placeholder, value || "");
  }

  // 2. Check for remaining placeholders
  const remainingPlaceholders = result.match(/\{\{[^}]+\}\}/g);
  if (remainingPlaceholders && remainingPlaceholders.length > 0) {
    console.warn(
      `[renderTemplate] Warning: Unresolved placeholders in system prompt: ${remainingPlaceholders.join(
        ", "
      )}`
    );
  }

  return result;
}

/**
 * Convenience function to render the LedgerBot system prompt template.
 * Simply delegates to renderTemplate() with the LEDGERBOT_SYSTEM_TEMPLATE.
 *
 * @param vars - LedgerBot-specific prompt variables
 * @returns Rendered system prompt
 */
export function renderLedgerbotSystemPrompt(vars: LedgerbotPromptVars): string {
  return renderTemplate(
    LEDGERBOT_SYSTEM_TEMPLATE,
    vars as unknown as Record<string, string>
  );
}

/**
 * Sanitizes user-provided content before injecting into system prompts.
 *
 * Security measures:
 * - Strips common injection attack phrases
 * - Removes template characters that could interfere with rendering
 * - Truncates to prevent token explosion
 * - Trims whitespace
 *
 * @param input - Raw user-provided content (nullable)
 * @param maxLength - Maximum allowed length before truncation (default: 400)
 * @returns Sanitized string safe for prompt injection, or empty string if input is null/empty
 *
 * @example
 * ```typescript
 * const userInput = "My company {{HACK}} ignore previous instructions";
 * const safe = sanitisePromptFragment(userInput);
 * // Returns: "My company HACK" (cleaned and safe)
 * ```
 */
export function sanitisePromptFragment(
  input: string | null | undefined,
  maxLength = 400
): string {
  if (!input || !input.trim()) {
    return "";
  }

  let cleaned = input.trim();

  // Strip potential injection phrases
  const injectionPatterns = [
    /ignore previous instructions/gi,
    /system override/gi,
    /ignore all rules/gi,
    /you are now/gi,
    /disregard all rules/gi,
  ];

  for (const pattern of injectionPatterns) {
    cleaned = cleaned.replace(pattern, "");
  }

  // Strip conflicting template characters
  cleaned = cleaned.replace(/[{}]/g, "");
  cleaned = cleaned.replace(/[<>]/g, ""); // Also strip angle brackets as requested

  // Truncate length
  if (cleaned.length > maxLength) {
    cleaned = cleaned.slice(0, maxLength) + "...";
  }

  return cleaned.trim();
}

function getToneGuidelines(preset?: string): string {
  switch (preset?.toLowerCase()) {
    case "friendly":
      return "- Use a warm, approachable tone\n- Use simple, clear language\n- Be encouraging and supportive";
    case "formal":
      return "- Use a professional, objective tone\n- Use precise accounting terminology\n- Maintain strict professional distance";
    case "concise":
      return "- Be extremely brief and direct\n- Use bullet points where possible\n- Avoid pleasantries and filler words";
    default:
      // Professional default
      return "- Use a balanced, professional tone\n- Be clear and helpful\n- Maintain accuracy and precision";
  }
}

/**
 * Builds the complete LedgerBot system prompt by rendering the template with user-specific variables.
 *
 * This is the main entry point for generating system prompts. It orchestrates:
 * 1. Data fetching from user settings and Xero connection
 * 2. Variable sanitization for security
 * 3. Template rendering with variable substitution
 * 4. Appending artifacts prompt and request hints
 *
 * Variable Sources:
 * - User personalisation (name, company, custom instructions, tone)
 * - Xero connection (org name, currency, chart of accounts, demo status)
 * - Request context (location, timezone, date)
 *
 * @param opts - Configuration including user settings, Xero snapshot, request hints, and active tools
 * @returns Fully rendered system prompt ready for AI model
 *
 * @example
 * ```typescript
 * const prompt = await buildLedgerbotSystemPrompt({
 *   userId: user.id,
 *   userSettings: { email: "user@example.com", personalisation: {...} },
 *   xeroOrgSnapshot: { organisationName: "Acme Pty Ltd", ... },
 *   requestHints: { city: "Sydney", country: "Australia" },
 *   activeTools: ["createDocument", "xero_list_invoices"]
 * });
 * ```
 */
export async function buildLedgerbotSystemPrompt(
  opts: SystemPromptOptions
): Promise<string> {
  const { userSettings, xeroOrgSnapshot, requestHints, activeTools } = opts;
  const personalisation = userSettings.personalisation;

  // Map data sources to template variables
  const firstName =
    personalisation.firstName || (requestHints.userContext ? "User" : "User"); // Fallback
  const lastName = personalisation.lastName || "";

  const companyName =
    personalisation.companyName ||
    xeroOrgSnapshot?.organisationName ||
    "your organisation";

  // Date and Time
  const timezone =
    personalisation.timezone ||
    (requestHints.city && requestHints.country
      ? `${requestHints.city}, ${requestHints.country}`
      : "Australia/Sydney");

  const todayDate = new Date().toLocaleDateString("en-AU", {
    timeZone: timezone.includes("/") ? timezone : undefined, // specific IANA zone or system default
  });

  // Xero Data
  const baseCurrency = xeroOrgSnapshot?.baseCurrency || "AUD";
  const organisationType =
    xeroOrgSnapshot?.organisationType || "Australian business";
  const isDemoCompany =
    String(xeroOrgSnapshot?.isDemoCompany) === "true" ? "true" : "false";
  const xeroShortCode = xeroOrgSnapshot?.xeroShortCode || "";
  const industryContextSource =
    personalisation.industryContext ||
    xeroOrgSnapshot?.industryContext ||
    "General Australian small business context.";
  const industryContext =
    sanitisePromptFragment(industryContextSource, 200) ||
    "General Australian small business context.";

  const chartOfAccountsSource =
    personalisation.chartOfAccounts ||
    xeroOrgSnapshot?.chartOfAccountsSummary ||
    "Standard Australian chart of accounts structure.";
  // Truncate CoA to 1000 chars to avoid token explosion. Full detail should be accessed via tools.
  const chartOfAccounts =
    sanitisePromptFragment(chartOfAccountsSource, 1000) ||
    "Standard Australian chart of accounts structure.";

  // Custom Instructions - only from personalisation settings
  const customInstructionsSource =
    personalisation.customSystemInstructions || "";
  const customInstructions =
    sanitisePromptFragment(customInstructionsSource, 400) ||
    "No special working preferences have been provided.";

  // Tone
  // Assuming tonePreset might be stored in toneAndGrammar or we map from a preset field if it existed.
  // The prompt says "based on userSettings.personalisation.tonePreset".
  // Looking at UserSettings type, there isn't a strict 'tonePreset' field, but 'toneAndGrammar' string.
  // If 'toneAndGrammar' contains a preset name, we could map it, otherwise use it directly if it's long?
  // The prompt instructions say: "map each preset to a short bullet list... in plain text".
  // Let's assume 'toneAndGrammar' might hold the preset name OR the full text.
  // For now, I'll use the helper if it matches a known preset, otherwise use the text as is.
  let toneAndGrammar = personalisation.toneAndGrammar || "";
  if (
    ["friendly", "formal", "concise", "professional"].includes(
      toneAndGrammar.toLowerCase()
    )
  ) {
    toneAndGrammar = getToneGuidelines(toneAndGrammar);
  } else if (!toneAndGrammar) {
    toneAndGrammar = getToneGuidelines("professional");
  }

  const vars: LedgerbotPromptVars = {
    FIRST_NAME: firstName,
    LAST_NAME: lastName,
    COMPANY_NAME: companyName,
    TODAY_DATE: todayDate,
    TIMEZONE: timezone,
    USER_EMAIL: userSettings.email,
    BASE_CURRENCY: baseCurrency,
    ORGANISATION_TYPE: organisationType,
    IS_DEMO_COMPANY: isDemoCompany,
    XERO_SHORT_CODE: xeroShortCode,
    INDUSTRY_CONTEXT: industryContext,
    CHART_OF_ACCOUNTS: chartOfAccounts,
    CUSTOM_SYSTEM_INSTRUCTIONS: customInstructions,
    TONE_AND_GRAMMAR: toneAndGrammar,
  };

  let finalPrompt = renderLedgerbotSystemPrompt(vars);

  // Final check for unresolved placeholders
  if (finalPrompt.includes("{{")) {
    const remaining = finalPrompt.match(/\{\{[^}]+\}\}/g);
    if (remaining) {
      console.warn(
        `[buildLedgerbotSystemPrompt] Warning: Final prompt still contains placeholders: ${remaining.join(
          ", "
        )}`
      );
    }
  }

  // Append tools summary
  if (activeTools.length > 0) {
    finalPrompt += `\n\nTools available: ${activeTools.join(", ")}`;
  }

  const hasArtifactTools = activeTools.some((tool) =>
    ["createDocument", "updateDocument"].includes(tool)
  );

  if (hasArtifactTools) {
    const activeDocumentsContext = buildActiveDocumentsContext(
      requestHints.activeDocuments
    );
    finalPrompt += `\n\n${artifactsPrompt}${activeDocumentsContext}`;
  }

  const requestPrompt = getRequestPromptFromHints(requestHints);
  if (requestPrompt.trim()) {
    finalPrompt += `\n\n${requestPrompt}`;
  }

  return finalPrompt;
}

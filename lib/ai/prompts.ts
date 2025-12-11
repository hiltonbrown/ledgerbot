import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Geo } from "@vercel/functions";
import type { UserSettings } from "@/app/(settings)/api/user/data";
import type { ArtifactKind } from "@/components/artifact";
import type { LedgerbotPromptVars } from "./prompt-types";

export type SystemPromptOptions = {
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
};

// Load artifacts prompt from file
export const artifactsPrompt = (() => {
  try {
    const promptPath = join(process.cwd(), "prompts", "artifacts-prompt.md");
    return readFileSync(promptPath, "utf-8");
  } catch (error) {
    console.error("Failed to load artifacts prompt template:", error);
    return "Error: Artifacts prompt template could not be loaded.";
  }
})();

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

// Load Code Prompt Template
export const CODE_PROMPT_TEMPLATE = (() => {
  try {
    const promptPath = join(process.cwd(), "prompts", "default-code-prompt.md");
    return readFileSync(promptPath, "utf-8");
  } catch (error) {
    console.error("Failed to load Code prompt template:", error);
    return "Error: Code prompt template could not be loaded.";
  }
})();

// Load Sheet Prompt Template
export const SHEET_PROMPT_TEMPLATE = (() => {
  try {
    const promptPath = join(
      process.cwd(),
      "prompts",
      "default-spreadsheet-prompt.md"
    );
    return readFileSync(promptPath, "utf-8");
  } catch (error) {
    console.error("Failed to load Sheet prompt template:", error);
    return "Error: Sheet prompt template could not be loaded.";
  }
})();

// Load Default Tone Guide
export const DEFAULT_TONE_GUIDE = (() => {
  try {
    const promptPath = join(
      process.cwd(),
      "prompts",
      "default-tone-grammar.md"
    );
    return readFileSync(promptPath, "utf-8");
  } catch (error) {
    console.error("Failed to load Default Tone prompt template:", error);
    return "";
  }
})();

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

/**
 * Builds the Code System Prompt by substituting variables from user settings.
 */
export async function buildCodeSystemPrompt(): Promise<string> {
  // Dynamic import to avoid circular dependency if any (though currently data.ts doesn't import prompts.ts)
  const { getUserSettings } = await import("@/app/(settings)/api/user/data");
  const settings = await getUserSettings();

  const vars = {
    CUSTOM_CODE_INSTRUCTIONS:
      settings.personalisation.customCodeInstructions || "",
    INDUSTRY_CONTEXT:
      settings.personalisation.industryContext ||
      "General Australian small business context",
    BASE_CURRENCY: "AUD", // Defaults to AUD for now as it's hard to get Xero context here without userId
  };

  return renderTemplate(CODE_PROMPT_TEMPLATE, vars);
}

/**
 * Builds the Sheet System Prompt by substituting variables from user settings.
 */
export async function buildSheetSystemPrompt(): Promise<string> {
  const { getUserSettings } = await import("@/app/(settings)/api/user/data");
  const settings = await getUserSettings();

  const vars = {
    CUSTOM_SHEET_INSTRUCTIONS:
      settings.personalisation.customSheetInstructions || "",
    BASE_CURRENCY: "AUD",
  };

  return renderTemplate(SHEET_PROMPT_TEMPLATE, vars);
}

// --- System Prompt Template Architecture ---

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
 * Renders a template by substituting variables.
 * Preserves unknown placeholders ({{KEY}}) and logs a warning.
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

export function renderLedgerbotSystemPrompt(vars: LedgerbotPromptVars): string {
  return renderTemplate(
    LEDGERBOT_SYSTEM_TEMPLATE,
    vars as unknown as Record<string, string>
  );
}

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
    cleaned = `${cleaned.slice(0, maxLength)}...`;
  }

  return cleaned.trim();
}

export function buildLedgerbotSystemPrompt(
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
  /* Tone and Grammar */
  const toneAndGrammarSource =
    personalisation.toneAndGrammar || DEFAULT_TONE_GUIDE;
  const toneAndGrammar =
    sanitisePromptFragment(toneAndGrammarSource, 2000) || DEFAULT_TONE_GUIDE;

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

  return Promise.resolve(finalPrompt);
}

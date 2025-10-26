import { readFileSync } from "node:fs";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/clerk-helpers";
import { db } from "@/lib/db/queries";
import { userSettings } from "@/lib/db/schema";

// Load default system prompt from markdown file
const loadDefaultSystemPrompt = () => {
  try {
    const promptPath = join(process.cwd(), "prompts", "default-system-prompt.md");
    return readFileSync(promptPath, "utf-8");
  } catch (error) {
    console.error("Failed to load default system prompt:", error);
    // Fallback to basic prompt if file can't be read
    return "You are Ledgerbot, an expert accounting assistant for Australian businesses. Keep your responses concise and helpful.";
  }
};

// Load default spreadsheet prompt from markdown file
const loadDefaultSpreadsheetPrompt = () => {
  try {
    const promptPath = join(process.cwd(), "prompts", "default-spreadsheet-prompt.md");
    return readFileSync(promptPath, "utf-8");
  } catch (error) {
    console.error("Failed to load default spreadsheet prompt:", error);
    // Fallback to basic prompt if file can't be read
    return "You are a spreadsheet creation assistant. Create a spreadsheet in csv format based on the given prompt. The spreadsheet should contain meaningful column headers and data.";
  }
};

// Load default code generation prompt from markdown file
const loadDefaultCodePrompt = () => {
  try {
    const promptPath = join(process.cwd(), "prompts", "default-code-prompt.md");
    return readFileSync(promptPath, "utf-8");
  } catch (error) {
    console.error("Failed to load default code prompt:", error);
    // Fallback to basic prompt if file can't be read
    return "You are a Python code generator that creates self-contained, executable code snippets. When writing code:\n\n1. Each snippet should be complete and runnable on its own\n2. Prefer using print() statements to display outputs\n3. Include helpful comments explaining the code\n4. Keep snippets concise (generally under 15 lines)\n5. Avoid external dependencies - use Python standard library\n6. Handle potential errors gracefully\n7. Return meaningful output that demonstrates the code's functionality\n8. Don't use input() or other interactive functions\n9. Don't access files or network resources\n10. Don't use infinite loops\n\nExamples of good snippets:\n\n# Calculate factorial iteratively\ndef factorial(n):\n    result = 1\n    for i in range(1, n + 1):\n        result *= i\n    return result\n\nprint(f\"Factorial of 5 is: {factorial(5)}\")";
  }
};

export type UserSettings = {
  name: string;
  email: string;
  jobTitle: string;
  language: string;
  timezone: string;
  about: string;
  personalisation: {
    isLocked: boolean;
    firstName: string;
    lastName: string;
    country: string;
    state: string;
    defaultModel: string;
    defaultReasoning: boolean;
  };
  notifications: {
    productUpdates: boolean;
    securityAlerts: boolean;
    weeklySummary: boolean;
  };
  prompts: {
    systemPrompt: string;
    codePrompt: string;
    sheetPrompt: string;
  };
  suggestions: {
    id: string;
    text: string;
    enabled: boolean;
    order: number;
  }[];
};

const USER_SETTINGS: UserSettings = {
  name: "Alex Rivers",
  email: "alex.rivers@example.com",
  jobTitle: "Operations Lead",
  language: "en",
  timezone: "America/Los_Angeles",
  about:
    "Alex oversees customer accounts and ensures the team has the right visibility into project performance.",
  personalisation: {
    isLocked: false,
    firstName: "Alex",
    lastName: "Rivers",
    country: "us",
    state: "ca",
    defaultModel: "anthropic-claude-sonnet-4-5",
    defaultReasoning: false,
  },
  notifications: {
    productUpdates: true,
    securityAlerts: true,
    weeklySummary: false,
  },
  prompts: {
    systemPrompt: loadDefaultSystemPrompt(),
    codePrompt: loadDefaultCodePrompt(),
    sheetPrompt: loadDefaultSpreadsheetPrompt(),
  },
  suggestions: [
    {
      id: "1",
      text: "How do I resolve duplicate credit card transactions in Xero?",
      enabled: true,
      order: 0,
    },
    {
      id: "2",
      text: "How do I properly record GST on imported supplier invoices?",
      enabled: true,
      order: 1,
    },
    {
      id: "3",
      text: "Help me plan a healthy meal preparation for the week.",
      enabled: true,
      order: 2,
    },
    {
      id: "4",
      text: "Draft a professional email to clients about overdue invoices.",
      enabled: true,
      order: 3,
    },
  ],
};

export async function getUserSettings(): Promise<UserSettings> {
  const user = await requireAuth();

  const [dbSettings] = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, user.id));

  // Merge database settings with defaults
  return {
    name: `${dbSettings?.firstName || USER_SETTINGS.personalisation.firstName} ${dbSettings?.lastName || USER_SETTINGS.personalisation.lastName}`,
    email: user.email,
    jobTitle: USER_SETTINGS.jobTitle,
    language: USER_SETTINGS.language,
    timezone: USER_SETTINGS.timezone,
    about: USER_SETTINGS.about,
    personalisation: {
      isLocked: dbSettings?.isLocked ?? USER_SETTINGS.personalisation.isLocked,
      firstName:
        dbSettings?.firstName || USER_SETTINGS.personalisation.firstName,
      lastName: dbSettings?.lastName || USER_SETTINGS.personalisation.lastName,
      country: dbSettings?.country || USER_SETTINGS.personalisation.country,
      state: dbSettings?.state || USER_SETTINGS.personalisation.state,
      defaultModel:
        dbSettings?.defaultModel || USER_SETTINGS.personalisation.defaultModel,
      defaultReasoning:
        dbSettings?.defaultReasoning ??
        USER_SETTINGS.personalisation.defaultReasoning,
    },
    notifications: USER_SETTINGS.notifications,
    prompts: {
      systemPrompt:
        dbSettings?.systemPrompt || USER_SETTINGS.prompts.systemPrompt,
      codePrompt: dbSettings?.codePrompt || USER_SETTINGS.prompts.codePrompt,
      sheetPrompt: dbSettings?.sheetPrompt || USER_SETTINGS.prompts.sheetPrompt,
    },
    suggestions: dbSettings?.suggestions || USER_SETTINGS.suggestions,
  };
}

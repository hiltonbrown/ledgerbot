import { readFileSync } from "node:fs";
import { join } from "node:path";
import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/clerk-helpers";
import { db } from "@/lib/db/queries";
import { userSettings } from "@/lib/db/schema";
import {
  formatChartOfAccountsForPrompt,
  getChartOfAccounts,
} from "@/lib/xero/chart-of-accounts-sync";
import { getDecryptedConnection } from "@/lib/xero/connection-manager";

// Helper functions for default prompts have been removed as they are no longer used.
// The system prompt is now dynamically generated via buildLedgerbotSystemPrompt.

// Load default tone and grammar guide from markdown file
const loadDefaultToneGrammar = () => {
  try {
    const promptPath = join(
      process.cwd(),
      "prompts",
      "default-tone-grammar.md"
    );
    return readFileSync(promptPath, "utf-8");
  } catch (error) {
    console.error("Failed to load default tone and grammar guide:", error);
    // Fallback to basic guide if file can't be read
    return "When writing business communications, use professional Australian English with clear, concise language. Adapt tone based on audience and context.";
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
    timezone: string;
    defaultModel: string;
    defaultReasoning: boolean;
    // Template variables
    companyName?: string;
    industryContext?: string;
    chartOfAccounts?: string;
    toneAndGrammar?: string;
    customVariables?: Record<string, string>;
    // Custom instructions
    customSystemInstructions?: string;
    customCodeInstructions?: string;
    customSheetInstructions?: string;
  };
  notifications: {
    productUpdates: boolean;
    securityAlerts: boolean;
    weeklySummary: boolean;
  };

  suggestions: {
    id: string;
    text: string;
    enabled: boolean;
    order: number;
  }[];
};

const USER_SETTINGS: UserSettings = {
  name: "",
  email: "",
  jobTitle: "",
  language: "en",
  timezone: "Australia/Sydney",
  about: "",
  personalisation: {
    isLocked: false,
    firstName: "",
    lastName: "",
    country: "au",
    state: "qld",
    timezone: "Australia/Sydney",
    defaultModel: "anthropic-claude-haiku-4-5",
    defaultReasoning: false,
  },
  notifications: {
    productUpdates: true,
    securityAlerts: true,
    weeklySummary: false,
  },

  suggestions: [
    {
      id: "1",
      text: "",
      enabled: true,
      order: 0,
    },
    {
      id: "2",
      text: "",
      enabled: true,
      order: 1,
    },
    {
      id: "3",
      text: "",
      enabled: true,
      order: 2,
    },
    {
      id: "4",
      text: "",
      enabled: true,
      order: 3,
    },
  ],
};

export async function getUserSettings(): Promise<UserSettings> {
  const user = await requireAuth();

  // Get Clerk user data for firstName and lastName
  const clerkUser = await currentUser();

  const [dbSettings] = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, user.id));

  // Use Clerk's firstName/lastName if available, otherwise fall back to defaults
  const firstName =
    clerkUser?.firstName || USER_SETTINGS.personalisation.firstName;
  const lastName =
    clerkUser?.lastName || USER_SETTINGS.personalisation.lastName;

  // Fetch chart of accounts and organisation metadata from active Xero connection
  let chartOfAccountsText = "";
  let companyName = "";
  let baseCurrency = "";
  let organisationType = "";
  let isDemoCompany = false;
  let shortCode = "";
  try {
    const xeroConnection = await getDecryptedConnection(user.id);
    if (xeroConnection) {
      // Use Xero organization name as company name (with validation)
      companyName = xeroConnection.tenantName?.trim() || "";

      // Xero organisation metadata (best practice fields) with defensive null checks
      // Normalize currency code to uppercase for consistency
      baseCurrency = xeroConnection.baseCurrency?.trim().toUpperCase() || "";
      organisationType = xeroConnection.organisationType?.trim() || "";
      isDemoCompany = Boolean(xeroConnection.isDemoCompany); // Ensure boolean type
      shortCode = xeroConnection.shortCode?.trim() || "";

      // Fetch and format chart of accounts
      try {
        const chartData = await getChartOfAccounts(xeroConnection.id);
        if (
          chartData?.accounts &&
          Array.isArray(chartData.accounts) &&
          chartData.accounts.length > 0
        ) {
          // Format chart for AI prompt (grouped by type, active accounts only)
          chartOfAccountsText = formatChartOfAccountsForPrompt(
            chartData.accounts,
            {
              includeArchived: false,
              groupByType: true,
              includeDescriptions: false,
            }
          );
        }
      } catch (chartError) {
        // Log chart fetch error separately but don't fail the entire request
        console.error(
          `[getUserSettings] Failed to fetch chart of accounts for connection ${xeroConnection.id}:`,
          chartError instanceof Error ? chartError.message : String(chartError)
        );
      }
    }
  } catch (error) {
    // Enhanced error logging with context
    console.error(
      `[getUserSettings] Error fetching data from Xero connection for user ${user.id}:`,
      {
        error: error instanceof Error ? error.message : String(error),
        userId: user.id,
        timestamp: new Date().toISOString(),
      }
    );
    // Continue execution - Xero connection failures should not prevent user settings from loading
  }

  // Fallback to manual entries if no Xero data available
  if (!chartOfAccountsText && dbSettings?.chartOfAccounts) {
    chartOfAccountsText = dbSettings.chartOfAccounts;
  }
  if (!companyName && dbSettings?.companyName) {
    companyName = dbSettings.companyName;
  }

  // Get user's timezone and current date in that timezone
  const userTimezone = dbSettings?.timezone || "Australia/Sydney";
  const todayDate = new Date().toLocaleString("en-AU", {
    timeZone: userTimezone,
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  // Merge database settings with defaults
  return {
    name: `${firstName} ${lastName}`,
    email: user.email,
    jobTitle: USER_SETTINGS.jobTitle,
    language: USER_SETTINGS.language,
    timezone: dbSettings?.timezone || USER_SETTINGS.timezone,
    about: USER_SETTINGS.about,
    personalisation: {
      isLocked: dbSettings?.isLocked ?? USER_SETTINGS.personalisation.isLocked,
      firstName,
      lastName,
      country: dbSettings?.country || USER_SETTINGS.personalisation.country,
      state: dbSettings?.state || USER_SETTINGS.personalisation.state,
      timezone: dbSettings?.timezone || USER_SETTINGS.timezone,
      defaultModel:
        dbSettings?.defaultModel || USER_SETTINGS.personalisation.defaultModel,
      defaultReasoning:
        dbSettings?.defaultReasoning ??
        USER_SETTINGS.personalisation.defaultReasoning,
      // Template variables
      companyName: dbSettings?.companyName || undefined,
      industryContext: dbSettings?.industryContext || undefined,
      chartOfAccounts: dbSettings?.chartOfAccounts || undefined,
      toneAndGrammar: dbSettings?.toneAndGrammar || undefined,
      customVariables: dbSettings?.customVariables || undefined,
      // Custom instructions
      customSystemInstructions:
        dbSettings?.customSystemInstructions || undefined,
      customCodeInstructions: dbSettings?.customCodeInstructions || undefined,
      customSheetInstructions: dbSettings?.customSheetInstructions || undefined,
    },
    notifications: USER_SETTINGS.notifications,

    suggestions: dbSettings?.suggestions || USER_SETTINGS.suggestions,
  };
}

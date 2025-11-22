import "server-only";

import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { executeXeroMCPTool } from "@/lib/ai/xero-mcp-client";
import { db } from "@/lib/db/queries";
import type { XeroAccount } from "@/lib/db/schema";
import { xeroConnection } from "@/lib/db/schema";
import { getDecryptedConnection } from "./connection-manager";

/**
 * Sync chart of accounts from Xero API to database
 * @param connectionId - UUID of the XeroConnection to sync
 * @returns Object with success status, account count, and any errors
 */
export async function syncChartOfAccounts(connectionId: string): Promise<{
  success: boolean;
  accountCount?: number;
  error?: string;
  correlationId?: string;
}> {
  try {
    // Get the connection to ensure it exists and is valid
    const [connection] = await db
      .select()
      .from(xeroConnection)
      .where(eq(xeroConnection.id, connectionId));

    if (!connection) {
      return {
        success: false,
        error: "Connection not found",
      };
    }

    // Fetch chart of accounts from Xero using MCP client
    console.log(
      `[Chart Sync] Syncing chart of accounts for connection ${connectionId} (${connection.tenantName})`
    );
    console.log(
      `[Chart Sync] User ID: ${connection.userId}, Tenant ID: ${connection.tenantId}`
    );

    const result = await executeXeroMCPTool(
      connection.userId,
      "xero_list_accounts",
      {} // No filter - get all accounts
    );

    console.log("[Chart Sync] Xero API response received:", {
      hasContent: !!result.content,
      contentLength: result.content?.length,
      firstContentType: result.content?.[0]?.type,
      isError: result.isError,
    });

    // Check if Xero API returned an error
    if (result.isError) {
      const errorMessage =
        result.content?.[0]?.text || "Unknown Xero API error";
      console.error("[Chart Sync] Xero API error:", errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }

    // Parse the response
    const responseText =
      result.content?.[0]?.type === "text" ? result.content[0].text : null;
    if (!responseText) {
      console.error("[Chart Sync] Empty or invalid response from Xero API");
      return {
        success: false,
        error: "Empty response from Xero API",
      };
    }

    console.log(
      `[Chart Sync] Response text length: ${responseText.length} characters`
    );

    const accounts: XeroAccount[] = JSON.parse(responseText);

    console.log(
      `[Chart Sync] Received ${accounts.length} accounts from Xero API`
    );
    if (accounts.length > 0) {
      console.log("[Chart Sync] Sample account:", accounts[0]);
    }

    if (!Array.isArray(accounts)) {
      return {
        success: false,
        error: "Invalid response format from Xero API",
      };
    }

    // Filter out deleted accounts and accounts with missing required fields
    const validAccounts = accounts.filter((account) => {
      // Must have required fields
      if (!account.accountID || !account.code || !account.name) {
        console.warn(
          "Skipping account with missing required fields:",
          JSON.stringify(account)
        );
        return false;
      }
      // Skip deleted accounts
      if (account.status === "DELETED") {
        console.log(
          `Skipping deleted account: ${account.code} - ${account.name}`
        );
        return false;
      }
      return true;
    });

    console.log(
      `[Chart Sync] After filtering: ${validAccounts.length} valid accounts (filtered out ${accounts.length - validAccounts.length})`
    );

    // Generate hash for change detection
    const hash = generateChartOfAccountsHash(validAccounts);

    // Store in database
    await db
      .update(xeroConnection)
      .set({
        chartOfAccounts: validAccounts,
        chartOfAccountsSyncedAt: new Date(),
        chartOfAccountsVersion: "2.0", // Xero Accounting API version
        chartOfAccountsHash: hash,
        updatedAt: new Date(),
      })
      .where(eq(xeroConnection.id, connectionId));

    console.log(
      `✅ Successfully synced ${validAccounts.length} accounts for ${connection.tenantName}`
    );

    return {
      success: true,
      accountCount: validAccounts.length,
    };
  } catch (error) {
    console.error("Error syncing chart of accounts:", error);

    // Extract correlation ID if available from Xero error
    let correlationId: string | undefined;
    if (error && typeof error === "object" && "response" in error) {
      const response = (error as { response?: { headers?: unknown } }).response;
      if (
        response &&
        typeof response === "object" &&
        "headers" in response &&
        response.headers &&
        typeof response.headers === "object" &&
        "x-correlation-id" in response.headers
      ) {
        correlationId = String(response.headers["x-correlation-id"]);
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      correlationId,
    };
  }
}

/**
 * Generate SHA-256 hash of chart of accounts for change detection
 * @param accounts - Array of Xero accounts
 * @returns Hex string of SHA-256 hash
 */
export function generateChartOfAccountsHash(accounts: XeroAccount[]): string {
  // Filter and sort by accountID to ensure consistent hash
  const sorted = [...accounts]
    .filter((acc) => acc.accountID && acc.code && acc.name)
    .sort((a, b) => (a.accountID || "").localeCompare(b.accountID || ""));

  // Create hash from essential fields (code, name, type, status)
  const hashInput = sorted
    .map(
      (acc) =>
        `${acc.code || ""}|${acc.name || ""}|${acc.type || ""}|${acc.status || ""}`
    )
    .join("\n");

  return crypto.createHash("sha256").update(hashInput).digest("hex");
}

/**
 * Format chart of accounts as readable text for AI system prompt
 * @param accounts - Array of Xero accounts
 * @param options - Formatting options
 * @returns Formatted string for AI prompt
 */
export function formatChartOfAccountsForPrompt(
  accounts: XeroAccount[],
  options: {
    includeArchived?: boolean;
    groupByType?: boolean;
    includeDescriptions?: boolean;
    maxAccounts?: number;
  } = {}
): string {
  const {
    includeArchived = false,
    groupByType = true,
    includeDescriptions = false,
    maxAccounts,
  } = options;

  // Filter accounts
  let filtered = accounts.filter((acc) => {
    if (!includeArchived && acc.status === "ARCHIVED") {
      return false;
    }
    if (acc.status === "DELETED") {
      return false;
    }
    return true;
  });

  // Limit if specified
  if (maxAccounts && filtered.length > maxAccounts) {
    filtered = filtered.slice(0, maxAccounts);
  }

  if (groupByType) {
    return formatGroupedByType(filtered, includeDescriptions);
  }

  return formatFlatList(filtered, includeDescriptions);
}

/**
 * Format accounts grouped by type (Assets, Liabilities, Equity, Revenue, Expense)
 */
function formatGroupedByType(
  accounts: XeroAccount[],
  includeDescriptions: boolean
): string {
  // Group by _class (ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE)
  const grouped = accounts.reduce(
    (acc, account) => {
      const accountClass = account._class || "OTHER";
      if (!acc[accountClass]) {
        acc[accountClass] = [];
      }
      acc[accountClass].push(account);
      return acc;
    },
    {} as Record<string, XeroAccount[]>
  );

  // Sort each group by code (with null safety)
  for (const key of Object.keys(grouped)) {
    grouped[key].sort((a, b) => (a.code || "").localeCompare(b.code || ""));
  }

  // Format output
  const sections: string[] = [];

  // Order: ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
  const classOrder = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"];

  for (const accountClass of classOrder) {
    const classAccounts = grouped[accountClass];
    if (!classAccounts || classAccounts.length === 0) {
      continue;
    }

    sections.push(`\n${accountClass}S:`);

    for (const account of classAccounts) {
      let line = `  ${account.code} - ${account.name}`;

      if (account.type) {
        line += ` (${account.type})`;
      }

      if (includeDescriptions && account.description) {
        line += ` - ${account.description}`;
      }

      sections.push(line);
    }
  }

  // Add any "OTHER" accounts
  if (grouped.OTHER && grouped.OTHER.length > 0) {
    sections.push("\nOTHER:");
    for (const account of grouped.OTHER) {
      let line = `  ${account.code} - ${account.name}`;
      if (account.type) {
        line += ` (${account.type})`;
      }
      sections.push(line);
    }
  }

  return sections.join("\n");
}

/**
 * Format accounts as flat list
 */
function formatFlatList(
  accounts: XeroAccount[],
  includeDescriptions: boolean
): string {
  // Sort by code (with null safety)
  const sorted = [...accounts].sort((a, b) =>
    (a.code || "").localeCompare(b.code || "")
  );

  const lines = sorted.map((account) => {
    let line = `${account.code} - ${account.name}`;

    if (account.type) {
      line += ` (${account.type})`;
    }

    if (includeDescriptions && account.description) {
      line += ` - ${account.description}`;
    }

    return line;
  });

  return lines.join("\n");
}

/**
 * Get chart of accounts for a specific connection from database
 * @param connectionId - UUID of the XeroConnection
 * @returns Chart of accounts data or null if not found
 */
export async function getChartOfAccounts(connectionId: string): Promise<{
  accounts: XeroAccount[];
  syncedAt: Date | null;
  accountCount: number;
} | null> {
  const [connection] = await db
    .select({
      chartOfAccounts: xeroConnection.chartOfAccounts,
      chartOfAccountsSyncedAt: xeroConnection.chartOfAccountsSyncedAt,
    })
    .from(xeroConnection)
    .where(eq(xeroConnection.id, connectionId));

  if (!connection || !connection.chartOfAccounts) {
    return null;
  }

  return {
    accounts: connection.chartOfAccounts as XeroAccount[],
    syncedAt: connection.chartOfAccountsSyncedAt,
    accountCount: (connection.chartOfAccounts as XeroAccount[]).length,
  };
}

/**
 * Sync chart of accounts for active connection of a user
 * @param userId - User ID
 * @returns Sync result
 */
export async function syncActiveConnectionChartOfAccounts(
  userId: string
): Promise<{
  success: boolean;
  accountCount?: number;
  error?: string;
  correlationId?: string;
}> {
  const connection = await getDecryptedConnection(userId);

  if (!connection) {
    return {
      success: false,
      error: "No active Xero connection found",
    };
  }

  return syncChartOfAccounts(connection.id);
}

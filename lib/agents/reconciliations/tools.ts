import "server-only";

import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { executeXeroMCPTool } from "@/lib/ai/xero-mcp-client";
import { generateUUID } from "@/lib/utils";
import type {
  ReconciliationMatch,
  ReconciliationException,
  AdjustmentProposal,
} from "./types";

/**
 * Calculate fuzzy match score between two strings
 */
function calculateMatchScore(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1.0;

  // Simple Levenshtein distance-based scoring
  const maxLength = Math.max(s1.length, s2.length);
  const distance = levenshteinDistance(s1, s2);
  return Math.max(0, 1 - distance / maxLength);
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Xero tools for reconciliation agent
 */
export function createReconciliationXeroTools(userId: string) {
  return {
    xero_get_bank_transactions: createTool({
      id: "xero_get_bank_transactions",
      description:
        "Get bank transactions from Xero for a specific account and date range. Use this to retrieve unreconciled transactions.",
      inputSchema: z.object({
        accountId: z.string().optional().describe("Bank account ID"),
        dateFrom: z
          .string()
          .optional()
          .describe("Start date (ISO 8601 format YYYY-MM-DD)"),
        dateTo: z
          .string()
          .optional()
          .describe("End date (ISO 8601 format YYYY-MM-DD)"),
        status: z
          .enum(["AUTHORISED", "DELETED", "VOIDED"])
          .optional()
          .describe("Transaction status"),
      }),
      outputSchema: z.string(),
      execute: async ({ inputData }) => {
        const result = await executeXeroMCPTool(
          userId,
          "xero_get_bank_transactions",
          inputData
        );
        return result.content[0].text;
      },
    }),

    xero_list_journal_entries: createTool({
      id: "xero_list_journal_entries",
      description:
        "Get manual journal entries from Xero. Use this to check existing journal adjustments.",
      inputSchema: z.object({
        dateFrom: z
          .string()
          .optional()
          .describe("Start date (ISO 8601 format YYYY-MM-DD)"),
        dateTo: z
          .string()
          .optional()
          .describe("End date (ISO 8601 format YYYY-MM-DD)"),
      }),
      outputSchema: z.string(),
      execute: async ({ inputData }) => {
        const result = await executeXeroMCPTool(
          userId,
          "xero_list_journal_entries",
          inputData
        );
        return result.content[0].text;
      },
    }),

    xero_list_accounts: createTool({
      id: "xero_list_accounts",
      description:
        "Get the chart of accounts from Xero. Use this to validate account codes for proposed adjustments.",
      inputSchema: z.object({
        accountType: z
          .enum([
            "BANK",
            "CURRENT",
            "CURRLIAB",
            "DEPRECIATN",
            "DIRECTCOSTS",
            "EQUITY",
            "EXPENSE",
            "FIXED",
            "INVENTORY",
            "LIABILITY",
            "NONCURRENT",
            "OTHERINCOME",
            "OVERHEADS",
            "PREPAYMENT",
            "REVENUE",
            "SALES",
            "TERMLIAB",
          ])
          .optional()
          .describe("Filter by account type"),
      }),
      outputSchema: z.string(),
      execute: async ({ inputData }) => {
        const result = await executeXeroMCPTool(
          userId,
          "xero_list_accounts",
          inputData
        );
        return result.content[0].text;
      },
    }),
  };
}

/**
 * Reconciliation logic tools
 */
export const matchTransactionsTool = createTool({
  id: "matchTransactions",
  description:
    "Match bank transactions with ledger entries using fuzzy matching. Returns matches with confidence scores.",
  inputSchema: z.object({
    bankTransactions: z.array(
      z.object({
        id: z.string(),
        date: z.string(),
        amount: z.number(),
        description: z.string(),
      })
    ),
    ledgerEntries: z.array(
      z.object({
        id: z.string(),
        date: z.string(),
        amount: z.number(),
        description: z.string(),
      })
    ),
    matchThreshold: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .default(0.8)
      .describe("Minimum match score to consider a match"),
  }),
  outputSchema: z.object({
    matches: z.array(
      z.object({
        id: z.string(),
        bankTransactionId: z.string(),
        ledgerEntryId: z.string().nullable(),
        matchScore: z.number(),
        status: z.enum(["matched", "pending", "exception", "resolved"]),
        amount: z.number(),
        date: z.string(),
        description: z.string(),
        confidence: z.number(),
      })
    ),
    unmatchedCount: z.number(),
  }),
  execute: async ({ inputData }) => {
    const { bankTransactions, ledgerEntries, matchThreshold } = inputData;
    const matches: ReconciliationMatch[] = [];
    const matchedLedgerIds = new Set<string>();

    for (const bankTx of bankTransactions) {
      let bestMatch: ReconciliationMatch | null = null;
      let highestScore = 0;

      for (const ledgerEntry of ledgerEntries) {
        if (matchedLedgerIds.has(ledgerEntry.id)) continue;

        // Calculate match score based on amount, date, and description
        const amountMatch = Math.abs(bankTx.amount - ledgerEntry.amount) < 0.01;
        const dateMatch = bankTx.date === ledgerEntry.date;
        const descScore = calculateMatchScore(
          bankTx.description,
          ledgerEntry.description
        );

        let score = descScore * 0.5; // Description weight: 50%
        if (amountMatch) score += 0.4; // Amount weight: 40%
        if (dateMatch) score += 0.1; // Date weight: 10%

        if (score > highestScore) {
          highestScore = score;
          bestMatch = {
            id: generateUUID(),
            bankTransactionId: bankTx.id,
            ledgerEntryId: ledgerEntry.id,
            matchScore: score,
            status:
              score >= matchThreshold
                ? "matched"
                : score >= 0.6
                  ? "pending"
                  : "exception",
            amount: bankTx.amount,
            date: bankTx.date,
            description: bankTx.description,
            confidence: score,
          };
        }
      }

      if (bestMatch && bestMatch.matchScore >= 0.6) {
        matches.push(bestMatch);
        if (bestMatch.ledgerEntryId) {
          matchedLedgerIds.add(bestMatch.ledgerEntryId);
        }
      } else {
        // No good match found - create exception
        matches.push({
          id: generateUUID(),
          bankTransactionId: bankTx.id,
          ledgerEntryId: null,
          matchScore: bestMatch?.matchScore || 0,
          status: "exception",
          amount: bankTx.amount,
          date: bankTx.date,
          description: bankTx.description,
          confidence: 0,
        });
      }
    }

    return {
      matches,
      unmatchedCount: bankTransactions.length - matchedLedgerIds.size,
    };
  },
});

export const proposeAdjustmentTool = createTool({
  id: "proposeAdjustment",
  description:
    "Propose a journal adjustment for an unmatched or mismatched transaction. Returns adjustment details for review.",
  inputSchema: z.object({
    transactionId: z.string().describe("Bank transaction ID"),
    amount: z.number().describe("Transaction amount"),
    date: z.string().describe("Transaction date"),
    description: z.string().describe("Transaction description"),
    suggestedDebitAccount: z
      .string()
      .describe("Suggested debit account code"),
    suggestedCreditAccount: z
      .string()
      .describe("Suggested credit account code"),
    rationale: z.string().describe("Explanation for the adjustment"),
  }),
  outputSchema: z.object({
    proposal: z.object({
      id: z.string(),
      type: z.enum(["journal_entry", "correction"]),
      description: z.string(),
      debitAccount: z.string(),
      creditAccount: z.string(),
      amount: z.number(),
      date: z.string(),
      rationale: z.string(),
      confidence: z.number(),
    }),
  }),
  execute: async ({ inputData }) => {
    const {
      transactionId,
      amount,
      date,
      description,
      suggestedDebitAccount,
      suggestedCreditAccount,
      rationale,
    } = inputData;

    const proposal: AdjustmentProposal = {
      id: generateUUID(),
      type: "journal_entry",
      description: `Adjustment for ${description}`,
      debitAccount: suggestedDebitAccount,
      creditAccount: suggestedCreditAccount,
      amount: Math.abs(amount),
      date,
      rationale,
      confidence: 0.7, // Default confidence for manual adjustments
    };

    return { proposal };
  },
});

export const identifyExceptionsTool = createTool({
  id: "identifyExceptions",
  description:
    "Identify reconciliation exceptions and classify by severity. Returns list of exceptions requiring human review.",
  inputSchema: z.object({
    matches: z.array(
      z.object({
        id: z.string(),
        bankTransactionId: z.string(),
        matchScore: z.number(),
        status: z.enum(["matched", "pending", "exception", "resolved"]),
        amount: z.number(),
        description: z.string(),
      })
    ),
  }),
  outputSchema: z.object({
    exceptions: z.array(
      z.object({
        id: z.string(),
        transactionId: z.string(),
        severity: z.enum(["high", "medium", "low"]),
        reason: z.string(),
        suggestedResolution: z.string(),
      })
    ),
  }),
  execute: async ({ inputData }) => {
    const { matches } = inputData;
    const exceptions: ReconciliationException[] = [];

    for (const match of matches) {
      if (match.status !== "exception") continue;

      let severity: "high" | "medium" | "low" = "low";
      let reason = "No matching ledger entry found";
      let suggestedResolution = "Review and create manual journal entry";

      // Determine severity based on amount and age
      const amount = Math.abs(match.amount);
      if (amount > 10000) {
        severity = "high";
        reason = "Large unmatched transaction";
        suggestedResolution =
          "Urgent review required - verify bank statement and ledger";
      } else if (amount > 1000) {
        severity = "medium";
        reason = "Medium-value unmatched transaction";
      }

      exceptions.push({
        id: generateUUID(),
        transactionId: match.bankTransactionId,
        severity,
        reason,
        suggestedResolution,
        createdAt: new Date(),
      });
    }

    return { exceptions };
  },
});

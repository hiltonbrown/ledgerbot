import "server-only";

import { Agent } from "@mastra/core/agent";
import { myProvider } from "@/lib/ai/providers";
import {
  matchTransactionsTool,
  proposeAdjustmentTool,
  identifyExceptionsTool,
  createReconciliationXeroTools,
} from "./tools";

const RECONCILIATION_INSTRUCTIONS = `You are the bank reconciliation agent for LedgerBot.

Your role is to:
1. Match bank transactions with ledger entries using fuzzy logic and AI-powered pattern recognition
2. Identify discrepancies and classify them by severity
3. Propose journal adjustments for unmatched transactions
4. Auto-approve perfect matches (100% confidence) when enabled
5. Flag exceptions requiring human review

When reconciling:
- Use matchTransactions tool to find potential matches between bank feeds and ledger entries
- Consider amount, date, and description similarity for matching
- Match threshold: ≥80% score = matched, 60-79% = pending review, <60% = exception
- For exceptions, use identifyExceptions to classify by severity
- For unmatched transactions, use proposeAdjustment to create journal entry recommendations
- Always explain your reasoning for match decisions

Severity Classification:
- HIGH: Large amounts (>$10,000), duplicate payments, unusual patterns
- MEDIUM: Mid-range amounts ($1,000-$10,000), partial matches
- LOW: Small amounts (<$1,000), minor discrepancies

Best Practices:
- Be conservative with auto-approvals - only perfect matches
- Provide clear rationale for proposed adjustments
- Flag suspicious patterns (e.g., duplicate transactions, round numbers from unknown sources)
- Maintain Australian accounting standards (GST-inclusive amounts when applicable)
- Reference bank statement lines and ledger account codes`;

/**
 * Base Reconciliation Agent (without Xero tools)
 */
export const reconciliationAgent = new Agent({
  name: "reconciliation-agent",
  instructions: RECONCILIATION_INSTRUCTIONS,
  model: myProvider.languageModel("anthropic-claude-sonnet-4-5"),
  tools: {
    matchTransactions: matchTransactionsTool,
    proposeAdjustment: proposeAdjustmentTool,
    identifyExceptions: identifyExceptionsTool,
  },
});

/**
 * Create a Reconciliation agent instance with Xero tools for a specific user
 */
export function createReconciliationAgentWithXero(userId: string) {
  const xeroTools = createReconciliationXeroTools(userId);

  return new Agent({
    name: "reconciliation-agent-with-xero",
    instructions: RECONCILIATION_INSTRUCTIONS,
    model: myProvider.languageModel("anthropic-claude-sonnet-4-5"),
    tools: {
      matchTransactions: matchTransactionsTool,
      proposeAdjustment: proposeAdjustmentTool,
      identifyExceptions: identifyExceptionsTool,
      ...xeroTools,
    },
  });
}

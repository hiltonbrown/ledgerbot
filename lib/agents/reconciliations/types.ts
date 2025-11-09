/**
 * Reconciliations Agent Types
 */

export type ReconciliationStatus =
  | "matched"
  | "pending"
  | "exception"
  | "resolved";

export type ExceptionSeverity = "high" | "medium" | "low";

export type ReconciliationMatch = {
  id: string;
  bankTransactionId: string;
  ledgerEntryId: string | null;
  matchScore: number; // 0-1, 1 being perfect match
  status: ReconciliationStatus;
  amount: number;
  date: string;
  description: string;
  suggestedAction?: string;
  confidence: number;
};

export type ReconciliationException = {
  id: string;
  transactionId: string;
  severity: ExceptionSeverity;
  reason: string;
  suggestedResolution: string;
  createdAt: Date;
  resolvedAt?: Date;
};

export type ReconciliationSummary = {
  totalProcessed: number;
  matchedCount: number;
  exceptionsCount: number;
  autoApprovedCount: number;
  matchRate: number;
  autoApprovalRate: number;
};

export type AdjustmentProposal = {
  id: string;
  type: "journal_entry" | "correction";
  description: string;
  debitAccount: string;
  creditAccount: string;
  amount: number;
  date: string;
  rationale: string;
  confidence: number;
};

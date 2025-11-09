/**
 * Q&A Agent Types
 */

export type QandaSettings = {
  model?: string;
  confidenceThreshold?: number;
  categories?: string[];
  refreshSources?: boolean;
  refreshLimit?: number;
};

export type QandaMetadata = {
  confidence: number;
  citations: Array<{
    title: string;
    url: string;
    category: string;
  }>;
  needsReview: boolean;
};

export type RegulatoryCategory = "award" | "tax_ruling" | "payroll_tax" | "all";

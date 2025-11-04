export type PdfSectionSummary = {
  id: string;
  title: string;
  summary: string;
  keyFacts: string[];
  monetaryAmounts: string[];
  complianceSignals: string[];
  sourcePreview: string;
};

export type PdfSummaryResult = {
  summary: string;
  highlights: string[];
  sections: PdfSectionSummary[];
  usage?: {
    totalBilledTokens?: number;
    totalInputTokens?: number;
    totalOutputTokens?: number;
  };
  warnings: string[];
};

export type PdfGuidedQuestion = {
  id: string;
  question: string;
  rationale: string;
  category: "cashflow" | "compliance" | "tax" | "operations" | "risk" | "follow-up" | "general";
  whenToAsk: string;
};

export type PdfGuidedQuestionResult = {
  questions: PdfGuidedQuestion[];
  warnings: string[];
};

export type PdfChatMessage = {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
};

export type PdfAnswerResult = {
  answer: string;
  sources: string[];
  warnings: string[];
};

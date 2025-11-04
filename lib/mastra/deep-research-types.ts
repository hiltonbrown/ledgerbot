export type DeepResearchReliability = "high" | "medium" | "low";

export type DeepResearchSource = {
  index: number;
  title: string;
  url: string;
  snippet: string;
  summary: string;
  reliability: DeepResearchReliability;
  confidence: number;
  publishedAt?: string | null;
  notes?: string;
};

export type DeepResearchHistoryEntry = {
  timestamp: string;
  note: string;
};

export type DeepResearchSummaryAttachment = {
  type: "deep-research-summary";
  sessionId: string;
  question: string;
  createdAt: string;
  confidence: number;
  plan: string[];
  sources: DeepResearchSource[];
  history: DeepResearchHistoryEntry[];
  findings: string[];
  recommendations: string[];
  followUpQuestions: string[];
  approvalMessage: string;
  parentSessionId?: string;
};

export type DeepResearchReportAttachment = {
  type: "deep-research-report";
  sessionId: string;
  question: string;
  createdAt: string;
  confidence: number;
  plan: string[];
  reportMarkdown: string;
  sources: DeepResearchSource[];
  history: DeepResearchHistoryEntry[];
  parentSessionId?: string;
};

export type DeepResearchSessionStatus = "needs-details" | "error";

export type DeepResearchSessionAttachment = {
  type: "deep-research-session";
  sessionId: string;
  status: DeepResearchSessionStatus;
  createdAt: string;
  question?: string;
  parentSessionId?: string;
};

export type DeepResearchAttachment =
  | DeepResearchSummaryAttachment
  | DeepResearchReportAttachment
  | DeepResearchSessionAttachment;

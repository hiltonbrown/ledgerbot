import type { InferUITool, UIMessage } from "ai";
import { z } from "zod";
import type { ArtifactKind } from "@/components/artifact";
import type { createDocument } from "./ai/tools/create-document";
import type { getWeather } from "./ai/tools/get-weather";
import type { requestSuggestions } from "./ai/tools/request-suggestions";
import type { updateDocument } from "./ai/tools/update-document";
import type { Suggestion } from "./db/schema";
import type { AppUsage } from "./usage";

export type DataPart = { type: "append-message"; message: string };

const deepResearchSourceMetadataSchema = z.object({
  index: z.number(),
  title: z.string(),
  url: z.string().url().optional(),
  reliability: z.enum(["high", "medium", "low"]),
  confidence: z.number().min(0).max(1).optional(),
});

const deepResearchMetadataSchema = z.object({
  sessionId: z.string(),
  status: z.enum([
    "needs-details",
    "awaiting-approval",
    "report-generated",
    "error",
  ]),
  question: z.string().optional(),
  plan: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(1).optional(),
  sources: z.array(deepResearchSourceMetadataSchema).optional(),
  parentSessionId: z.string().optional(),
});

export const messageMetadataSchema = z.object({
  createdAt: z.string(),
  showReasoningPreference: z.boolean().optional(),
  deepResearch: deepResearchMetadataSchema.optional(),
});

export type DeepResearchSourceMetadata = z.infer<
  typeof deepResearchSourceMetadataSchema
>;
export type DeepResearchMessageMetadata = z.infer<
  typeof deepResearchMetadataSchema
>;
export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

// Deep Research Attachment Types
export type DeepResearchSource = {
  index: number;
  title: string;
  url: string;
  snippet: string;
  summary: string;
  reliability: "high" | "medium" | "low";
  confidence: number;
  publishedAt?: string;
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

export type DeepResearchSessionAttachment = {
  type: "deep-research-session";
  sessionId: string;
  status: "needs-details" | "awaiting-approval" | "report-generated" | "error";
  createdAt: string;
  question?: string;
  parentSessionId?: string;
};

export type DeepResearchAttachment =
  | DeepResearchSummaryAttachment
  | DeepResearchReportAttachment
  | DeepResearchSessionAttachment;

type weatherTool = InferUITool<typeof getWeather>;
type createDocumentTool = InferUITool<ReturnType<typeof createDocument>>;
type updateDocumentTool = InferUITool<ReturnType<typeof updateDocument>>;
type requestSuggestionsTool = InferUITool<
  ReturnType<typeof requestSuggestions>
>;

export type ChatTools = {
  getWeather: weatherTool;
  createDocument: createDocumentTool;
  updateDocument: updateDocumentTool;
  requestSuggestions: requestSuggestionsTool;
};

export type CustomUIDataTypes = {
  textDelta: string;
  imageDelta: string;
  sheetDelta: string;
  codeDelta: string;
  suggestion: Suggestion;
  appendMessage: string;
  id: string;
  title: string;
  kind: ArtifactKind;
  clear: null;
  finish: null;
  usage: AppUsage;
};

export type ChatMessage = UIMessage<
  MessageMetadata,
  CustomUIDataTypes,
  ChatTools
>;

export type Attachment = {
  name: string;
  url: string;
  contentType: string;
  fileSize?: number;
  extractedText?: string;
  processingError?: string;
  documentId?: string;
};

export const FILE_TYPE_LABELS: Record<string, string> = {
  "image/jpeg": "Image (JPEG)",
  "image/png": "Image (PNG)",
  "image/gif": "Image (GIF)",
  "image/webp": "Image (WebP)",
  "application/pdf": "PDF Document",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "Word Document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
    "Excel Spreadsheet",
  "text/csv": "CSV Spreadsheet",
};

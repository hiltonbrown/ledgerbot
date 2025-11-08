import "server-only";

import { Agent } from "@mastra/core/agent";
import { RuntimeContext } from "@mastra/core/runtime-context";
import { createTool } from "@mastra/core/tools";
import type { CoreMessage } from "ai";
import { z } from "zod";
import type {
  PdfChatMessage,
  PdfSectionSummary,
} from "@/lib/agents/docmanagement/types";
import { summarizePdfContent } from "@/lib/agents/docmanagement/workflow";
import { myProvider } from "@/lib/ai/providers";
import { executeXeroMCPTool, xeroMCPTools } from "@/lib/ai/xero-mcp-client";
import {
  getContextFileById,
  touchContextFile,
  updateContextFileContent,
} from "@/lib/db/queries";
import { extractPdfText } from "@/lib/files/parsers";
import { extractPdfTextWithOCR } from "@/lib/files/pdf-ocr";
import { generateUUID } from "@/lib/utils";

const SYSTEM_INSTRUCTIONS = `You are DocManagement, a document analysis agent for Australian bookkeeping, accounting, and legal-compliance use cases.
You ingest PDFs, build a searchable index, answer questions with citations, and when asked you join answers to Xero data via MCP.
Rules:
1) Cite every factual claim from the PDF with page and a short clause.
2) If a claim requires accounting context, use xero_query first, then merge results.
3) Be conservative with legal language. Flag uncertainty and show the exact clause.
4) When the user asks for tasks, produce a checklist with due dates.
5) Never fabricate citations. If not found, say so and suggest a follow-up query.`;

const DOC_STATE_KEY = "docmanagement:activeDoc";
const DOCUMENT_CACHE_TTL_MS = 1000 * 60 * 5; // 5 minutes
const AVERAGE_CHARS_PER_PAGE = 1800;
const CHARS_PER_TOKEN = 4;
const MAX_CONTEXT_HIGHLIGHTS = 4;
const allowedXeroResources = new Set(xeroMCPTools.map((tool) => tool.name));

export type PdfLoadOutput = {
  docId: string;
  pageCount: number;
  meta?: Record<string, unknown>;
};

export type RagSearchOutput = Array<{
  chunkId: string;
  page: number;
  score: number;
  text: string;
}>;

export type PdfCiteOutput = {
  clause: string;
  page: number;
};

type RagChunk = {
  id: string;
  start: number;
  text: string;
};

type LoadedDocument = {
  docId: string;
  contextFileId?: string;
  fileUrl?: string;
  fileName?: string;
  text: string;
  summary: string;
  highlights: string[];
  sections: PdfSectionSummary[];
  warnings: string[];
  tokenEstimate: number;
  pageCount: number;
  chunks: RagChunk[];
  loadedAt: number;
};

const docCache = new Map<string, { expiresAt: number; doc: LoadedDocument }>();

type AgentRunSetup = {
  agent: Agent;
  runtimeContext: RuntimeContext;
  activeDoc: LoadedDocument | null;
  messages: CoreMessage[];
};

const PdfLoadSchema = z
  .object({
    contextFileId: z.string().min(1).optional(),
    docId: z.string().min(1).optional(),
    fileUrl: z.string().url().optional(),
  })
  .refine(
    (value) => Boolean(value.contextFileId || value.fileUrl || value.docId),
    {
      message: "Provide a contextFileId, docId, or fileUrl to load a PDF.",
    }
  );

const RagSearchSchema = z.object({
  query: z.string().min(2),
  k: z.number().int().min(1).max(32).default(8),
  docId: z.string().optional(),
  contextFileId: z.string().optional(),
});

const PdfCiteSchema = z.object({
  docId: z.string().optional(),
  contextFileId: z.string().optional(),
  answerSpan: z.string().min(2),
});

const XeroQuerySchema = z.object({
  resource: z.string(),
  params: z.record(z.any()).optional(),
});

function estimateTokens(text: string) {
  if (!text) {
    return 0;
  }
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

function estimatePageCount(text: string) {
  if (!text) {
    return 1;
  }
  return Math.max(1, Math.round(text.length / AVERAGE_CHARS_PER_PAGE));
}

function approximatePage(offset: number) {
  if (!Number.isFinite(offset) || offset < 0) {
    return 1;
  }
  return Math.max(1, Math.floor(offset / AVERAGE_CHARS_PER_PAGE) + 1);
}

function tokenize(input: string) {
  return input
    .toLowerCase()
    .split(/[^a-z0-9%]+/)
    .filter((token) => token.length > 2 && token.length < 40);
}

function buildRagChunks(text: string): RagChunk[] {
  const normalized = text.replace(/\r\n/g, "\n");
  const paragraphs = normalized.split(/\n{2,}/);
  const chunks: RagChunk[] = [];
  let cursor = 0;

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) {
      cursor += paragraph.length + 2;
      continue;
    }

    const relativeIndex = text.indexOf(trimmed, cursor);
    const start = relativeIndex === -1 ? cursor : relativeIndex;
    cursor = start + trimmed.length;

    chunks.push({
      id: generateUUID(),
      start,
      text: trimmed.slice(0, 600),
    });

    if (chunks.length >= 500) {
      break;
    }
  }

  if (chunks.length === 0) {
    chunks.push({ id: generateUUID(), start: 0, text: text.slice(0, 600) });
  }

  return chunks;
}

function getCachedDocument(key?: string | null) {
  if (!key) {
    return null;
  }
  const cached = docCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.doc;
  }
  if (cached) {
    docCache.delete(key);
  }
  return null;
}

function cacheDocument(key: string | null | undefined, doc: LoadedDocument) {
  if (!key) {
    return;
  }
  docCache.set(key, {
    doc,
    expiresAt: Date.now() + DOCUMENT_CACHE_TTL_MS,
  });
}

function setRuntimeDoc(
  runtimeContext: RuntimeContext | undefined,
  doc: LoadedDocument
) {
  runtimeContext?.set(DOC_STATE_KEY, doc);
}

function getRuntimeDoc(runtimeContext?: RuntimeContext) {
  return runtimeContext?.get(DOC_STATE_KEY) as LoadedDocument | undefined;
}

function buildHistoryMessages(history?: PdfChatMessage[]): CoreMessage[] {
  if (!history || history.length === 0) {
    return [];
  }

  return history.map((entry) => ({
    role: entry.role,
    content: entry.content,
  }));
}

export async function prepareDocAgentRun({
  userId,
  message,
  docId,
  contextFileId,
  history,
}: {
  userId: string;
  message: string;
  docId?: string;
  contextFileId?: string;
  history?: PdfChatMessage[];
}): Promise<AgentRunSetup> {
  const agent = getDocManagementAgent();
  const runtimeContext = new RuntimeContext();
  runtimeContext.set("userId", userId);

  let activeDoc: LoadedDocument | null = null;
  const targetId = contextFileId ?? docId;

  if (targetId) {
    activeDoc = await ensureDocumentLoaded({
      userId,
      runtimeContext,
      contextFileId: targetId,
      docId: targetId,
    });
  }

  const contextMessages = activeDoc
    ? buildDocumentContextMessages(activeDoc)
    : [];
  const conversation = buildHistoryMessages(history);

  const messages: CoreMessage[] = [...contextMessages, ...conversation];
  messages.push({ role: "user", content: message });

  return {
    agent,
    runtimeContext,
    activeDoc,
    messages,
  };
}

export async function loadDocumentForAgent({
  userId,
  contextFileId,
  docId,
  fileUrl,
}: {
  userId: string;
  contextFileId?: string;
  docId?: string;
  fileUrl?: string;
}): Promise<PdfLoadOutput> {
  if (!contextFileId && !docId && !fileUrl) {
    throw new Error(
      "Provide a contextFileId, docId, or fileUrl to load a PDF."
    );
  }

  const runtimeContext = new RuntimeContext();
  runtimeContext.set("userId", userId);

  const doc = await ensureDocumentLoaded({
    userId,
    runtimeContext,
    contextFileId,
    docId,
    fileUrl,
  });

  return {
    docId: doc.docId,
    pageCount: doc.pageCount,
    meta: {
      contextFileId: doc.contextFileId,
      tokenEstimate: doc.tokenEstimate,
      fileName: doc.fileName,
      warnings: doc.warnings,
    },
  } satisfies PdfLoadOutput;
}

async function fetchPdfBlob(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch PDF from ${url}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return new Blob([arrayBuffer], { type: "application/pdf" });
}

async function ensureDocumentLoaded({
  userId,
  runtimeContext,
  contextFileId,
  docId,
  fileUrl,
}: {
  userId: string;
  runtimeContext?: RuntimeContext;
  contextFileId?: string;
  docId?: string;
  fileUrl?: string;
}): Promise<LoadedDocument> {
  const cacheKey = contextFileId ?? docId ?? fileUrl;
  const cached = getCachedDocument(cacheKey ?? null);
  if (cached) {
    setRuntimeDoc(runtimeContext, cached);
    return cached;
  }

  let targetFileUrl = fileUrl;
  let targetFileName: string | undefined;
  const resolvedContextId = contextFileId ?? docId;
  let contextRecord = null;

  if (resolvedContextId) {
    contextRecord = await getContextFileById({
      id: resolvedContextId,
      userId,
    });

    if (!contextRecord) {
      throw new Error("Context file not found for this user.");
    }

    targetFileUrl = contextRecord.blobUrl || targetFileUrl;
    targetFileName = contextRecord.originalName ?? contextRecord.name;
  }

  if (!targetFileUrl) {
    throw new Error("A fileUrl or contextFileId is required to load a PDF.");
  }

  let text = contextRecord?.extractedText ?? "";
  const warnings: string[] = [];

  if (!text || text.trim().length < 20) {
    const blob = await fetchPdfBlob(targetFileUrl);

    try {
      text = await extractPdfText(blob);
    } catch (error) {
      warnings.push(
        error instanceof Error
          ? error.message
          : "Failed to extract searchable text from the PDF"
      );
    }

    if (!text || text.trim().length < 20) {
      try {
        const { text: ocrText } = await extractPdfTextWithOCR(targetFileUrl);
        text = ocrText;
      } catch (ocrError) {
        throw new Error(
          ocrError instanceof Error
            ? ocrError.message
            : "OCR extraction failed for this PDF"
        );
      }
    }

    if (contextRecord) {
      const tokenEstimate = estimateTokens(text);
      await updateContextFileContent({
        id: contextRecord.id,
        extractedText: text,
        tokenCount: tokenEstimate,
        status: "ready",
      }).catch((error) => {
        console.warn("[docmanagement] Failed to persist extracted text", error);
      });
    }
  }

  if (!text.trim()) {
    throw new Error("No searchable text detected in this PDF.");
  }

  const summaryResult = await summarizePdfContent({
    text,
    fileName: targetFileName ?? "Uploaded PDF",
  });

  if (contextRecord) {
    void touchContextFile(contextRecord.id).catch(() => {
      /* non-blocking */
    });
  }

  const doc: LoadedDocument = {
    docId: resolvedContextId ?? generateUUID(),
    contextFileId: resolvedContextId ?? undefined,
    fileUrl: targetFileUrl,
    fileName: targetFileName,
    text,
    summary: summaryResult.summary,
    highlights: summaryResult.highlights,
    sections: summaryResult.sections as PdfSectionSummary[],
    warnings: summaryResult.warnings.concat(warnings),
    tokenEstimate: estimateTokens(text),
    pageCount: estimatePageCount(text),
    chunks: buildRagChunks(text),
    loadedAt: Date.now(),
  };

  cacheDocument(cacheKey ?? doc.docId, doc);
  setRuntimeDoc(runtimeContext, doc);

  return doc;
}

function requireUserId(runtimeContext?: RuntimeContext) {
  const userId = runtimeContext?.get("userId");
  if (!userId || typeof userId !== "string") {
    throw new Error("User context is required for this operation.");
  }
  return userId;
}

async function ensureDocForTool({
  runtimeContext,
  userId,
  docId,
  contextFileId,
}: {
  runtimeContext?: RuntimeContext;
  userId: string;
  docId?: string;
  contextFileId?: string;
}): Promise<LoadedDocument> {
  const current = getRuntimeDoc(runtimeContext);
  if (current) {
    const matchesDocId = docId && current.docId === docId;
    const matchesContextId =
      contextFileId && current.contextFileId === contextFileId;
    if (!docId && !contextFileId) {
      return current;
    }
    if (matchesDocId || matchesContextId) {
      return current;
    }
  }

  const targetId = contextFileId ?? docId;
  if (!targetId) {
    throw new Error("No document is loaded. Call pdf_load first.");
  }

  return ensureDocumentLoaded({
    userId,
    runtimeContext,
    contextFileId: targetId,
    docId: targetId,
  });
}

function scoreChunkText(text: string, tokens: string[]) {
  if (tokens.length === 0) {
    return 0;
  }
  const haystack = text.toLowerCase();
  let hits = 0;
  for (const token of tokens) {
    if (haystack.includes(token)) {
      hits += 1;
    }
  }
  return hits / tokens.length;
}

function searchDocumentChunks(
  doc: LoadedDocument,
  query: string,
  limit: number
) {
  const tokens = tokenize(query);

  const scored = doc.chunks.map((chunk, index) => {
    const score = scoreChunkText(chunk.text, tokens);
    const recencyBoost = Math.max(
      0,
      (0.05 * (doc.chunks.length - index)) / doc.chunks.length
    );
    return { chunk, score: score + recencyBoost };
  });

  const filtered = scored
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ chunk, score }) => ({
      chunkId: chunk.id,
      page: approximatePage(chunk.start),
      score: Number(score.toFixed(3)),
      text: chunk.text,
    }));

  if (filtered.length > 0) {
    return filtered;
  }

  return doc.chunks.slice(0, limit).map((chunk) => ({
    chunkId: chunk.id,
    page: approximatePage(chunk.start),
    score: 0,
    text: chunk.text,
  }));
}

function locateCitationClause(
  doc: LoadedDocument,
  span: string
): PdfCiteOutput {
  const tokens = tokenize(span);
  if (!tokens.length) {
    const clause = doc.summary.slice(0, 200);
    return { clause, page: 1 };
  }

  type Candidate = { text: string; offset: number; score: number };
  const candidates: Candidate[] = [];

  doc.sections.forEach((section, index) => {
    candidates.push({
      text: section.summary,
      offset: index * AVERAGE_CHARS_PER_PAGE,
      score: scoreChunkText(section.summary, tokens),
    });
    section.keyFacts.forEach((fact) =>
      candidates.push({
        text: fact,
        offset: index * AVERAGE_CHARS_PER_PAGE,
        score: scoreChunkText(fact, tokens),
      })
    );
    section.complianceSignals.forEach((signal) =>
      candidates.push({
        text: signal,
        offset: index * AVERAGE_CHARS_PER_PAGE,
        score: scoreChunkText(signal, tokens),
      })
    );
  });

  // Sentence-level scan for finer citations
  const sentences = doc.text.split(/(?<=[.!?])\s+/).slice(0, 800);
  let searchStart = 0;
  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) {
      continue;
    }
    const offset = doc.text.indexOf(trimmed, searchStart);
    if (offset !== -1) {
      searchStart = offset + trimmed.length;
    }
    candidates.push({
      text: trimmed,
      offset: offset === -1 ? searchStart : offset,
      score: scoreChunkText(trimmed, tokens),
    });
  }

  const best = candidates.reduce<Candidate | null>((acc, candidate) => {
    if (!acc || candidate.score > acc.score) {
      return candidate;
    }
    return acc;
  }, null);

  if (!best || best.score === 0) {
    const fallback = doc.highlights[0] ?? doc.summary.slice(0, 200);
    return { clause: fallback, page: 1 };
  }

  return {
    clause: best.text.slice(0, 220).trim(),
    page: approximatePage(best.offset),
  };
}

function attachCitations(answer: string, doc: LoadedDocument) {
  const lines = answer.split(/\n/);
  return lines
    .map((line) => {
      if (!line.trim()) {
        return line;
      }
      const citation = locateCitationClause(doc, line);
      return `${line} [p.${citation.page}: ${citation.clause}]`;
    })
    .join("\n");
}

export function formatAnswerWithCitations(
  answer: string,
  doc?: LoadedDocument | null
) {
  if (!doc) {
    return answer;
  }
  return attachCitations(answer, doc);
}

const pdfLoadTool = createTool({
  id: "pdf_load",
  description: "Load and index a PDF from a stored context file or public URL",
  inputSchema: PdfLoadSchema,
  execute: async ({ context, runtimeContext }) => {
    const userId = requireUserId(runtimeContext);
    const doc = await ensureDocumentLoaded({
      userId,
      runtimeContext,
      contextFileId: context.contextFileId ?? context.docId,
      docId: context.docId,
      fileUrl: context.fileUrl,
    });

    return {
      docId: doc.docId,
      pageCount: doc.pageCount,
      meta: {
        contextFileId: doc.contextFileId,
        fileName: doc.fileName,
        highlights: doc.highlights,
        warnings: doc.warnings,
        tokenEstimate: doc.tokenEstimate,
      },
    } satisfies PdfLoadOutput;
  },
});

const ragSearchTool = createTool({
  id: "rag_search",
  description: "Search indexed PDF chunks to retrieve relevant clauses",
  inputSchema: RagSearchSchema,
  execute: async ({ context, runtimeContext }) => {
    const userId = requireUserId(runtimeContext);
    const doc = await ensureDocForTool({
      runtimeContext,
      userId,
      docId: context.docId,
      contextFileId: context.contextFileId,
    });
    return searchDocumentChunks(doc, context.query, context.k ?? 8);
  },
});

const pdfCiteTool = createTool({
  id: "pdf_cite",
  description:
    "Find the closest clause and page reference for a given answer span",
  inputSchema: PdfCiteSchema,
  execute: async ({ context, runtimeContext }) => {
    const userId = requireUserId(runtimeContext);
    const doc = await ensureDocForTool({
      runtimeContext,
      userId,
      docId: context.docId,
      contextFileId: context.contextFileId,
    });
    return locateCitationClause(doc, context.answerSpan);
  },
});

const xeroQueryTool = createTool({
  id: "xero_query",
  description: "Call an allow-listed Xero MCP resource for accounting context",
  inputSchema: XeroQuerySchema,
  execute: async ({ context, runtimeContext }) => {
    const userId = requireUserId(runtimeContext);
    if (!allowedXeroResources.has(context.resource)) {
      throw new Error(
        `The resource ${context.resource} is not available to this agent.`
      );
    }
    const result = await executeXeroMCPTool(
      userId,
      context.resource,
      context.params ?? {}
    );
    return result.content?.map((entry) => entry.text).join("\n") ?? "";
  },
});

let cachedAgent: Agent | null = null;

export function getDocManagementAgent() {
  if (cachedAgent) {
    return cachedAgent;
  }

  cachedAgent = new Agent({
    name: "docmanagement",
    instructions: SYSTEM_INSTRUCTIONS,
    model: () => myProvider.languageModel("anthropic-claude-sonnet-4-5"),
    tools: {
      pdf_load: pdfLoadTool,
      rag_search: ragSearchTool,
      pdf_cite: pdfCiteTool,
      xero_query: xeroQueryTool,
    },
    middleware: [
      async (next, ctx) => {
        return next(ctx);
      },
    ],
  });

  return cachedAgent;
}

function buildDocumentContextMessages(doc: LoadedDocument): CoreMessage[] {
  const highlights = doc.highlights.slice(0, MAX_CONTEXT_HIGHLIGHTS);
  const highlightText = highlights.length
    ? highlights.map((item) => `• ${item}`).join("\n")
    : "• No highlights extracted";

  return [
    {
      role: "system",
      content: `Active document: ${doc.fileName ?? doc.docId}\nSummary: ${doc.summary}\nHighlights:\n${highlightText}`,
    },
  ];
}

export async function respondWithCitations({
  message,
  userId,
  docId,
  contextFileId,
  history,
}: {
  message: string;
  userId: string;
  docId?: string;
  contextFileId?: string;
  history?: PdfChatMessage[];
}) {
  if (!message.trim()) {
    throw new Error("A user message is required.");
  }

  const { agent, runtimeContext, activeDoc, messages } =
    await prepareDocAgentRun({
      userId,
      message,
      docId,
      contextFileId,
      history,
    });

  const response = await agent.generate(messages, {
    runtimeContext,
    toolChoice: "auto",
    maxSteps: 6,
  });

  const rawText =
    typeof response?.text === "string"
      ? response.text
      : String(response?.response?.messages?.[0]?.content ?? "");

  return formatAnswerWithCitations(rawText, activeDoc);
}

import { generateText } from "ai";
import { myProvider } from "@/lib/ai/providers";
import { generateUUID } from "@/lib/utils";
import type {
  PdfAnswerResult,
  PdfChatMessage,
  PdfGuidedQuestion,
  PdfGuidedQuestionResult,
  PdfSectionSummary,
  PdfSummaryResult,
} from "./types";

const SUMMARY_MODEL = "openai-gpt-5-mini";
const QA_MODEL = "google-gemini-2-5-flash";

const CHUNK_SIZE = 3200;
const CHUNK_OVERLAP = 320;
const MAX_EXCERPT_LENGTH = 900;

const CHUNK_SYSTEM_PROMPT = `You are LedgerBot's document intake summariser. The user is an Australian small business operator.

You will receive a snippet extracted from a PDF such as an invoice, statement, payroll run, or compliance notice.

Identify the important accounting attributes: ABN/ACN, supplier details, invoice numbers, monetary amounts, GST/BAS references, payment instructions, due dates, line items, and any compliance or risk callouts.

Always respond with valid JSON using this shape:
{
  "sectionTitle": string,
  "sectionSummary": string, // <= 90 words, sentence case
  "keyFacts": string[], // bullet-ready statements focused on ledger actions
  "monetaryAmounts": string[], // literal amounts with currency symbols if present
  "complianceSignals": string[] // obligations, due dates, policy references
}

Keep arrays short (<= 5 items). If an item is missing, return an empty array.`;

const FINAL_SYSTEM_PROMPT = `You are LedgerBot's document management orchestrator. Using structured section summaries, produce an overall synopsis for a small business operator preparing their ledger.

Focus on: supplier/biller identity, document purpose, totals (including GST), due dates, ABN/ACN, payment instructions, and compliance obligations.

Return strict JSON:
{
  "overallSummary": string, // <= 220 words, highlight actionable bookkeeping steps
  "highlights": string[] // 3-6 bullet points with ledger-ready facts
}`;

const QUESTION_SYSTEM_PROMPT = `You are LedgerBot's guide for interpreting uploaded financial documents.
Given the summary and section breakdown, craft 5-10 clarifying questions that help a bookkeeper or accountant reconcile the document.

Allowed categories: "cashflow", "compliance", "tax", "operations", "risk", "follow-up", "general".

Return JSON:
{
  "questions": [
    {
      "id": string, // stable slug or uuid provided in prompt
      "question": string,
      "rationale": string, // why this matters for ledger updates
      "category": "cashflow" | "compliance" | "tax" | "operations" | "risk" | "follow-up" | "general",
      "whenToAsk": string // scenario describing when the operator should ask
    }
  ]
}`;

const QA_SYSTEM_PROMPT = `You are LedgerBot's "Chat with PDF" assistant. Answer questions using the provided summary and context excerpts only.

Guidelines:
- Cite figures exactly as they appear (currency, dates, invoice numbers).
- If information is unavailable, respond with a short apology and suggest the next best step (e.g. request a clearer copy).
- Keep answers under 180 words and structured with short paragraphs or bullet points.
- Mention ABN/ACN, totals, tax treatments, or due dates when relevant.
- Never speculate beyond the supplied context.`;

type TextChunk = {
  id: string;
  text: string;
  start: number;
  end: number;
};

type ChunkSummary = {
  sectionTitle: string;
  sectionSummary: string;
  keyFacts: string[];
  monetaryAmounts: string[];
  complianceSignals: string[];
};

type UsageTracker = {
  totalInputTokens?: number;
  totalOutputTokens?: number;
  totalBilledTokens?: number;
};

function accumulateUsage(target: UsageTracker, usage?: UsageTracker | null) {
  if (!usage) {
    return;
  }

  target.totalInputTokens = (target.totalInputTokens ?? 0) + (usage.totalInputTokens ?? 0);
  target.totalOutputTokens = (target.totalOutputTokens ?? 0) + (usage.totalOutputTokens ?? 0);
  target.totalBilledTokens = (target.totalBilledTokens ?? 0) + (usage.totalBilledTokens ?? 0);
}

function cleanJsonResponse(raw: string) {
  return raw.replace(/```(?:json)?/g, "").trim();
}

function safeJsonParse<T>(raw: string): T | null {
  try {
    return JSON.parse(cleanJsonResponse(raw)) as T;
  } catch (_) {
    return null;
  }
}

function chunkText(text: string): TextChunk[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  const chunks: TextChunk[] = [];

  if (!normalized) {
    return chunks;
  }

  let cursor = 0;
  while (cursor < normalized.length) {
    let end = Math.min(normalized.length, cursor + CHUNK_SIZE);
    let chunkText = normalized.slice(cursor, end);

    if (end < normalized.length) {
      const lastBreak = chunkText.lastIndexOf("\n\n");
      if (lastBreak > CHUNK_SIZE * 0.4) {
        end = cursor + lastBreak;
        chunkText = normalized.slice(cursor, end);
      }
    }

    const trimmed = chunkText.trim();
    if (trimmed.length > 0) {
      chunks.push({
        id: generateUUID(),
        text: trimmed,
        start: cursor,
        end,
      });
    }

    if (end >= normalized.length) {
      break;
    }

    const nextStart = Math.max(end - CHUNK_OVERLAP, cursor + 1);
    cursor = nextStart;
  }

  return chunks;
}

function deriveFallbackSummary(text: string): ChunkSummary {
  const sentences = text.split(/(?<=[.!?])\s+/).slice(0, 2);
  const fallbackSummary = sentences.join(" ").slice(0, 500);

  const monetaryMatches = Array.from(
    text.matchAll(/\$\s?[0-9][0-9,]*(?:\.[0-9]{2})?/g)
  ).map((match) => match[0]?.trim() ?? "");

  const complianceMatches = Array.from(
    text.matchAll(/(?:due|payment|lodgement|ATO|ABN|ACN)[^\n]{0,80}/gi)
  ).map((match) => match[0]?.trim() ?? "");

  return {
    sectionTitle: sentences[0]?.slice(0, 80) || "Document section",
    sectionSummary: fallbackSummary,
    keyFacts: [],
    monetaryAmounts: monetaryMatches.slice(0, 5),
    complianceSignals: complianceMatches.slice(0, 5),
  };
}

function buildSectionPreview(text: string): string {
  return text.replace(/\s+/g, " ").slice(0, MAX_EXCERPT_LENGTH).trim();
}

export async function summarizePdfContent({
  text,
  fileName,
}: {
  text: string;
  fileName?: string;
}): Promise<PdfSummaryResult> {
  const warnings: string[] = [];

  if (!text || text.trim().length < 20) {
    warnings.push(
      "No searchable text was extracted. The PDF might be scanned or password-protected."
    );
    return {
      summary:
        "LedgerBot could not detect searchable text in this PDF. Please re-scan with OCR or request a digital copy.",
      highlights: [],
      sections: [],
      warnings,
    };
  }

  const usage: UsageTracker = {};
  const chunks = chunkText(text);

  if (chunks.length === 0) {
    warnings.push("Unable to derive sections from the PDF text content.");
    return {
      summary:
        "LedgerBot could not extract structured content from this PDF. The text may be highly formatted or encrypted.",
      highlights: [],
      sections: [],
      warnings,
    };
  }

  const sectionSummaries: PdfSectionSummary[] = [];

  for (const [index, chunk] of chunks.entries()) {
    const prompt = `Document: ${fileName ?? "uploaded PDF"}\nSection ${
      index + 1
    } of ${chunks.length}.\n\nSnippet:\n"""${chunk.text.slice(0, CHUNK_SIZE)}"""`;

    let parsed = null as ChunkSummary | null;
    try {
      const { text: responseText, usage: callUsage } = await generateText({
        model: myProvider.languageModel(SUMMARY_MODEL),
        system: CHUNK_SYSTEM_PROMPT,
        prompt,
        temperature: 0.2,
      });

      accumulateUsage(usage, callUsage as UsageTracker);
      parsed = safeJsonParse<ChunkSummary>(responseText);
    } catch (error) {
      warnings.push(
        `Failed to summarise section ${index + 1}: ${
          error instanceof Error ? error.message : "unknown error"
        }`
      );
    }

    if (!parsed) {
      warnings.push(
        `Falling back to heuristic summary for section ${index + 1}.`
      );
      parsed = deriveFallbackSummary(chunk.text);
    }

    sectionSummaries.push({
      id: chunk.id,
      title: parsed.sectionTitle || `Section ${index + 1}`,
      summary: parsed.sectionSummary,
      keyFacts: parsed.keyFacts?.slice(0, 5) ?? [],
      monetaryAmounts: parsed.monetaryAmounts?.slice(0, 5) ?? [],
      complianceSignals: parsed.complianceSignals?.slice(0, 5) ?? [],
      sourcePreview: buildSectionPreview(chunk.text),
    });
  }

  const structuredSections = sectionSummaries.map((section) => ({
    id: section.id,
    title: section.title,
    summary: section.summary,
    keyFacts: section.keyFacts,
    monetaryAmounts: section.monetaryAmounts,
    complianceSignals: section.complianceSignals,
  }));

  let overallSummary = "";
  let highlights: string[] = [];

  try {
    const { text: responseText, usage: callUsage } = await generateText({
      model: myProvider.languageModel(SUMMARY_MODEL),
      system: FINAL_SYSTEM_PROMPT,
      prompt: `Document: ${fileName ?? "uploaded PDF"}\n\nStructured sections:\n${JSON.stringify(
        structuredSections
      ).slice(0, 12_000)}\n`,
      temperature: 0.15,
    });

    accumulateUsage(usage, callUsage as UsageTracker);

    const parsed = safeJsonParse<{
      overallSummary: string;
      highlights: string[];
    }>(responseText);

    if (parsed) {
      overallSummary = parsed.overallSummary?.trim() ?? "";
      highlights = parsed.highlights?.slice(0, 6) ?? [];
    }
  } catch (error) {
    warnings.push(
      `Failed to build consolidated summary: ${
        error instanceof Error ? error.message : "unknown error"
      }`
    );
  }

  if (!overallSummary) {
    overallSummary = sectionSummaries
      .map((section) => section.summary)
      .join("\n\n");
  }

  if (highlights.length === 0) {
    highlights = sectionSummaries
      .flatMap((section) => section.keyFacts)
      .slice(0, 5);
  }

  return {
    summary: overallSummary.trim(),
    highlights,
    sections: sectionSummaries,
    usage,
    warnings,
  };
}

export async function generatePdfQuestions({
  summary,
  highlights,
  sections,
}: {
  summary: string;
  highlights: string[];
  sections: PdfSectionSummary[];
}): Promise<PdfGuidedQuestionResult> {
  const warnings: string[] = [];

  if (!summary.trim()) {
    return {
      questions: [],
      warnings: ["Cannot generate questions without a summary."],
    };
  }

  const condensedSections = sections.map((section) => ({
    title: section.title,
    keyFacts: section.keyFacts,
    monetaryAmounts: section.monetaryAmounts,
    complianceSignals: section.complianceSignals,
  }));

  try {
    const { text } = await generateText({
      model: myProvider.languageModel(SUMMARY_MODEL),
      system: QUESTION_SYSTEM_PROMPT,
      prompt: `Summary:\n${summary.slice(0, 4000)}\n\nHighlights:\n${highlights
        .slice(0, 8)
        .join("\n")}\n\nSections:\n${JSON.stringify(condensedSections).slice(0, 8000)}`,
      temperature: 0.25,
    });

    const parsed = safeJsonParse<{ questions: PdfGuidedQuestion[] }>(text);

    if (parsed?.questions && Array.isArray(parsed.questions)) {
      const normalised = parsed.questions
        .filter((question) => question.question?.trim())
        .slice(0, 10)
        .map((question) => ({
          id: question.id || generateUUID(),
          question: question.question.trim(),
          rationale: question.rationale?.trim() || "Clarify this detail for the ledger.",
          category:
            question.category ??
            (question.question.toLowerCase().includes("gst")
              ? "tax"
              : "general"),
          whenToAsk:
            question.whenToAsk?.trim() ||
            "When confirming the document details with a client or supplier.",
        }));

      if (normalised.length > 0) {
        return {
          questions: normalised,
          warnings,
        };
      }
    }

    warnings.push("Model returned an empty or malformed question set.");
  } catch (error) {
    warnings.push(
      `Failed to generate guided questions: ${
        error instanceof Error ? error.message : "unknown error"
      }`
    );
  }

  const fallback: PdfGuidedQuestion[] = [
    {
      id: generateUUID(),
      question: "Has this document already been reconciled in the ledger?",
      rationale: "Avoids duplicate ledger entries and keeps workflows clean.",
      category: "operations",
      whenToAsk: "Before posting the extracted data into Xero or MYOB.",
    },
    {
      id: generateUUID(),
      question: "Do the invoice totals (incl. GST) align with purchase orders?",
      rationale: "Ensures totals are accurate before paying or recognising expense.",
      category: "cashflow",
      whenToAsk: "When approving the payment run or matching to a bank feed.",
    },
  ];

  return {
    questions: fallback,
    warnings,
  };
}

function selectRelevantSections(
  sections: PdfSectionSummary[],
  question: string
): PdfSectionSummary[] {
  const query = question.toLowerCase();
  const keywords = query
    .split(/[^a-z0-9%]+/)
    .filter((token) => token.length > 2);

  const scored = sections.map((section) => {
    const haystack = [
      section.title,
      section.summary,
      section.keyFacts.join(" "),
      section.monetaryAmounts.join(" "),
      section.complianceSignals.join(" "),
    ]
      .join(" \n ")
      .toLowerCase();

    const score = keywords.reduce((acc, keyword) => {
      return acc + (haystack.includes(keyword) ? 1 : 0);
    }, 0);

    return { section, score };
  });

  return scored
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ section }) => section);
}

function extractRelevantExcerpts(text: string, question: string): string[] {
  const normalized = text.replace(/\r\n/g, "\n");
  const paragraphs = normalized.split(/\n{2,}/);
  const keywords = question
    .toLowerCase()
    .split(/[^a-z0-9%]+/)
    .filter((token) => token.length > 2);

  const scored = paragraphs.map((paragraph) => {
    const haystack = paragraph.toLowerCase();
    const score = keywords.reduce((acc, keyword) => {
      return acc + haystack.split(keyword).length - 1;
    }, 0);

    return { paragraph: paragraph.trim(), score };
  });

  return scored
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ paragraph }) => paragraph.replace(/\s+/g, " ").slice(0, 600));
}

export async function answerPdfQuestion({
  summary,
  sections,
  rawText,
  question,
  history = [],
}: {
  summary: string;
  sections: PdfSectionSummary[];
  rawText: string;
  question: string;
  history?: PdfChatMessage[];
}): Promise<PdfAnswerResult> {
  const warnings: string[] = [];

  if (!summary.trim()) {
    return {
      answer:
        "I could not locate a summary for this PDF. Please generate a summary before asking follow-up questions.",
      sources: [],
      warnings: ["Missing summary context."],
    };
  }

  const relevantSections = selectRelevantSections(sections, question);
  const relevantExcerpts = extractRelevantExcerpts(rawText, question);

  const historyContext = history
    .slice(-6)
    .map((entry) => `${entry.role === "user" ? "User" : "LedgerBot"}: ${entry.content}`)
    .join("\n");

  const promptParts = [
    `Summary:\n${summary.slice(0, 4000)}`,
    relevantSections.length
      ? `Section highlights:\n${relevantSections
          .map(
            (section, index) =>
              `${index + 1}. ${section.title}: ${section.summary} (${section.keyFacts
                .slice(0, 3)
                .join("; ")})`
          )
          .join("\n")}`
      : undefined,
    relevantExcerpts.length
      ? `Source excerpts:\n${relevantExcerpts
          .map((excerpt, index) => `[${index + 1}] ${excerpt}`)
          .join("\n")}`
      : undefined,
    historyContext ? `Recent chat history:\n${historyContext}` : undefined,
    `Question: ${question}`,
  ];

  const prompt = promptParts.filter(Boolean).join("\n\n");

  try {
    const { text: responseText } = await generateText({
      model: myProvider.languageModel(QA_MODEL),
      system: QA_SYSTEM_PROMPT,
      prompt,
      temperature: 0.2,
    });

    const cleaned = responseText.trim();

    return {
      answer: cleaned,
      sources: relevantSections.map((section) => section.id),
      warnings,
    };
  } catch (error) {
    warnings.push(
      `Failed to answer question: ${
        error instanceof Error ? error.message : "unknown error"
      }`
    );

    return {
      answer:
        "I wasn't able to retrieve an answer from the PDF excerpts. Please try rephrasing the question or confirm the document includes that detail.",
      sources: [],
      warnings,
    };
  }
}

export function buildSummaryDocument({
  fileName,
  summary,
  highlights,
  sections,
  questions,
}: {
  fileName: string;
  summary: string;
  highlights: string[];
  sections: PdfSectionSummary[];
  questions?: PdfGuidedQuestion[];
}): string {
  const lines: string[] = [];

  lines.push(`# PDF summary: ${fileName}`);
  lines.push(summary.trim());

  if (highlights.length > 0) {
    lines.push("\n## Key highlights");
    highlights.forEach((highlight) => {
      lines.push(`- ${highlight}`);
    });
  }

  if (sections.length > 0) {
    lines.push("\n## Section breakdown");
    sections.forEach((section) => {
      lines.push(`\n### ${section.title}`);
      lines.push(section.summary);

      if (section.keyFacts.length > 0) {
        lines.push("- **Key facts:**");
        section.keyFacts.forEach((fact) => lines.push(`  - ${fact}`));
      }
      if (section.monetaryAmounts.length > 0) {
        lines.push("- **Amounts referenced:**");
        section.monetaryAmounts.forEach((amount) =>
          lines.push(`  - ${amount}`)
        );
      }
      if (section.complianceSignals.length > 0) {
        lines.push("- **Compliance notes:**");
        section.complianceSignals.forEach((note) =>
          lines.push(`  - ${note}`)
        );
      }
    });
  }

  if (questions && questions.length > 0) {
    lines.push("\n## Suggested follow-up questions");
    questions.forEach((question) => {
      lines.push(`- **${question.question}** (_${question.category}_): ${question.rationale}`);
      lines.push(`  - When to ask: ${question.whenToAsk}`);
    });
  }

  lines.push(
    "\n_Generated by LedgerBot's document management agent. Re-run summarisation after re-uploading or annotating the PDF for updated insights._"
  );

  return lines.join("\n");
}

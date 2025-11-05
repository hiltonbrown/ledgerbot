import { generateText } from "ai";
import type { RequestHints } from "@/lib/ai/prompts";
import { myProvider } from "@/lib/ai/providers";
import type {
  DeepResearchMessageMetadata,
  DeepResearchSourceMetadata,
  MessageMetadata,
} from "@/lib/types";
import { generateUUID } from "@/lib/utils";
import type {
  DeepResearchHistoryEntry,
  DeepResearchReportAttachment,
  DeepResearchSource,
  DeepResearchSummaryAttachment,
} from "./deep-research-types";

const DEFAULT_SUMMARY_MODEL = "anthropic-claude-sonnet-4-5";
const TAVILY_SEARCH_URL =
  process.env.TAVILY_API_URL ?? "https://api.tavily.com/search";

type ResearchPlan = {
  plan: string[];
  searchQueries: string[];
  focusPoints: string[];
};

type RawSearchHit = {
  title: string;
  url: string;
  content: string;
  snippet: string;
  publishedDate?: string | null;
  score?: number;
};

type SourceEvaluation = {
  index: number;
  summary: string;
  reliability: "high" | "medium" | "low";
  confidence: number;
  notes?: string;
};

type SummarySynthesis = {
  findings: string[];
  recommendations: string[];
  followUpQuestions: string[];
  narrative: string;
  confidence: number;
  approvalMessage: string;
};

type PlanResponse = {
  plan: string[];
  searchQueries: string[];
  focusPoints: string[];
};

const PLAN_SYSTEM_PROMPT = `You are the Mastra Deep Research planner for LedgerBot. Create a focused, multi-step plan to investigate the user's accounting or finance question. The plan must:
- Identify 3-5 concrete research steps in plain language.
- Recommend 3-5 high quality web or API search queries tailored to current events (last 12-18 months) and authoritative sources.
- Note any key focus points such as regions, time periods, regulatory bodies, or stakeholder types.

Return ONLY valid JSON with the following shape:
{
  "plan": string[],
  "searchQueries": string[],
  "focusPoints": string[]
}`;

const EVALUATION_SYSTEM_PROMPT = `You are the Mastra source evaluator. Given the research question and raw search hits, provide structured assessments for each source. Rate reliability and confidence based on recency, authority, and direct relevance.
Return ONLY JSON:
{
  "sources": Array<{
    "index": number,
    "summary": string,
    "reliability": "high" | "medium" | "low",
    "confidence": number,
    "notes"?: string
  }>
}`;

const SUMMARY_SYSTEM_PROMPT = `You are the Mastra Deep Research synthesizer. Using the question, plan, and evaluated sources, produce a concise summary for the user with rigorous citations. All findings and recommendations must reference sources using [index] notation.
Return ONLY JSON with this shape:
{
  "narrative": string,
  "findings": string[],
  "recommendations": string[],
  "followUpQuestions": string[],
  "confidence": number,
  "approvalMessage": string
}
The narrative should be at most 4 sentences and include at least one citation. Citations refer to the source indices (1-indexed).`;

const REPORT_SYSTEM_PROMPT = `You are the Mastra Deep Research report writer for LedgerBot. Produce an executive-ready markdown report that:
- Summarises the research question and context.
- Highlights key findings with supporting details and citations ([index](url)).
- Evaluates source quality briefly.
- Provides actionable recommendations and next steps with cited evidence.
- Includes an appendix table of all sources (Title | Reliability | Confidence | Notes | Link).
Ensure the tone is professional and analytical. Make the document valid markdown.`;

function safeJsonParse<T>(input: string): T | null {
  try {
    return JSON.parse(input) as T;
  } catch (error) {
    console.warn("[deep-research] Failed to parse JSON", error, input);
    return null;
  }
}

function nowIso() {
  return new Date().toISOString();
}

function logHistory(
  history: DeepResearchHistoryEntry[],
  note: string
): DeepResearchHistoryEntry[] {
  const entry = {
    timestamp: nowIso(),
    note,
  } satisfies DeepResearchHistoryEntry;
  history.push(entry);
  return history;
}

async function createResearchPlan({
  question,
  modelId,
  hints,
}: {
  question: string;
  modelId: string;
  hints?: RequestHints;
}): Promise<ResearchPlan> {
  const contextHints: string[] = [];

  if (hints?.city || hints?.country) {
    contextHints.push(
      `User location: ${[hints.city, hints.country].filter(Boolean).join(", ")}`
    );
  }

  if (hints?.userContext) {
    contextHints.push(`User context: ${hints.userContext}`);
  }

  const prompt = `Question: ${question}\n\nContext: ${
    contextHints.length > 0 ? contextHints.join(" | ") : "Not specified"
  }`;

  const { text } = await generateText({
    model: myProvider.languageModel(modelId ?? DEFAULT_SUMMARY_MODEL),
    system: PLAN_SYSTEM_PROMPT,
    prompt,
  });

  const parsed = safeJsonParse<PlanResponse>(text.trim());

  if (!parsed) {
    const fallbackPlan = [
      "Clarify financial scope and recent regulatory context",
      "Collect the latest guidance and market data from authoritative sources",
      "Synthesize findings with risk and opportunity analysis",
    ];

    return {
      plan: fallbackPlan,
      searchQueries: [question].concat(contextHints).slice(0, 3),
      focusPoints: contextHints,
    } satisfies ResearchPlan;
  }

  return {
    plan: parsed.plan?.filter(Boolean) ?? [],
    searchQueries: parsed.searchQueries?.filter(Boolean) ?? [question],
    focusPoints: parsed.focusPoints?.filter(Boolean) ?? [],
  } satisfies ResearchPlan;
}

async function performSearch(
  query: string,
  history: DeepResearchHistoryEntry[]
): Promise<RawSearchHit[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    logHistory(
      history,
      `Skipped automated search for "${query}" (missing TAVILY_API_KEY)`
    );
    return [];
  }

  try {
    const response = await fetch(TAVILY_SEARCH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: "advanced",
        max_results: 6,
        include_answer: false,
        include_images: false,
      }),
    });

    if (!response.ok) {
      logHistory(
        history,
        `Search API error for "${query}" (${response.statusText})`
      );
      return [];
    }

    const json = (await response.json()) as {
      results?: Array<{
        title: string;
        url: string;
        content: string;
        snippet?: string;
        published_date?: string | null;
        score?: number;
      }>;
    };

    const results = json.results ?? [];

    logHistory(
      history,
      `Retrieved ${results.length} search hits for "${query}"`
    );

    return results.map((result) => ({
      title: result.title,
      url: result.url,
      content: result.content,
      snippet: result.snippet ?? result.content.slice(0, 260),
      publishedDate: result.published_date ?? null,
      score: result.score,
    }));
  } catch (error) {
    console.error("[deep-research] Search error", error);
    logHistory(
      history,
      `Search failed for "${query}" (${(error as Error).message})`
    );
    return [];
  }
}

async function evaluateSources({
  question,
  plan,
  hits,
  modelId,
}: {
  question: string;
  plan: ResearchPlan;
  hits: RawSearchHit[];
  modelId: string;
}): Promise<SourceEvaluation[]> {
  if (hits.length === 0) {
    return [];
  }

  const condensed = hits
    .map((hit, index) => {
      const content = `${hit.title}\nURL: ${hit.url}\nExcerpt: ${hit.snippet}\nPublished: ${hit.publishedDate ?? "Unknown"}`;
      return `Source ${index + 1}:\n${content}`;
    })
    .join("\n\n");

  const prompt = `Question: ${question}\nPlan Steps: ${plan.plan.join(
    " | "
  )}\n\n${condensed}`;

  const { text } = await generateText({
    model: myProvider.languageModel(modelId ?? DEFAULT_SUMMARY_MODEL),
    system: EVALUATION_SYSTEM_PROMPT,
    prompt,
  });

  const parsed = safeJsonParse<{ sources: SourceEvaluation[] }>(text.trim());
  return parsed?.sources?.filter(Boolean) ?? [];
}

async function buildSummary({
  question,
  plan,
  evaluations,
  hits,
  modelId,
  followUp,
}: {
  question: string;
  plan: ResearchPlan;
  evaluations: SourceEvaluation[];
  hits: RawSearchHit[];
  modelId: string;
  followUp?: string;
}): Promise<SummarySynthesis> {
  const combined = evaluations.map((evaluation) => {
    const reference = hits[evaluation.index - 1] ??
      hits[evaluation.index] ?? { title: "Unknown Source", url: "" };

    return {
      index: evaluation.index,
      title: reference?.title ?? "Unknown Source",
      url: reference?.url ?? "",
      summary: evaluation.summary,
      reliability: evaluation.reliability,
      confidence: evaluation.confidence,
      notes: evaluation.notes,
    };
  });

  const prompt = JSON.stringify(
    {
      question,
      plan: plan.plan,
      focusPoints: plan.focusPoints,
      followUp,
      sources: combined,
    },
    null,
    2
  );

  const { text } = await generateText({
    model: myProvider.languageModel(modelId ?? DEFAULT_SUMMARY_MODEL),
    system: SUMMARY_SYSTEM_PROMPT,
    prompt,
  });

  const parsed = safeJsonParse<SummarySynthesis>(text.trim());

  if (!parsed) {
    return {
      narrative:
        "Unable to synthesise the findings due to formatting issues. Please review the raw source summaries above.",
      findings: evaluations.map((evaluation) => evaluation.summary),
      recommendations: [],
      followUpQuestions: [],
      confidence:
        evaluations.reduce((acc, curr) => acc + (curr.confidence ?? 0), 0) /
        Math.max(evaluations.length, 1),
      approvalMessage:
        "Respond with 'approve' to generate a formal report or ask for a deeper investigation.",
    } satisfies SummarySynthesis;
  }

  return parsed;
}

function buildMetadata({
  createdAt,
  summaryAttachment,
  status,
}: {
  createdAt: string;
  summaryAttachment: DeepResearchSummaryAttachment;
  status: DeepResearchMessageMetadata["status"];
}): MessageMetadata {
  const sourceMetadata: DeepResearchSourceMetadata[] =
    summaryAttachment.sources.map((source) => ({
      index: source.index,
      title: source.title,
      url: source.url,
      reliability: source.reliability,
      confidence: source.confidence,
    }));

  const deepResearchMetadata: DeepResearchMessageMetadata = {
    sessionId: summaryAttachment.sessionId,
    status,
    confidence: summaryAttachment.confidence,
    question: summaryAttachment.question,
    plan: summaryAttachment.plan,
    sources: sourceMetadata,
    parentSessionId: summaryAttachment.parentSessionId,
  };

  return {
    createdAt,
    deepResearch: deepResearchMetadata,
  } satisfies MessageMetadata;
}

function formatHistory(history: DeepResearchHistoryEntry[]): string {
  if (history.length === 0) {
    return "- No automated steps executed.";
  }

  return history
    .map((entry) => {
      const timestamp = new Date(entry.timestamp);
      const formatted = timestamp.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      return `- ${formatted} — ${entry.note}`;
    })
    .join("\n");
}

function mergeSearchResults(results: RawSearchHit[][]): RawSearchHit[] {
  const byUrl = new Map<string, RawSearchHit>();

  results.flat().forEach((hit) => {
    if (!hit.url) {
      return;
    }

    if (!byUrl.has(hit.url)) {
      byUrl.set(hit.url, hit);
    }
  });

  return Array.from(byUrl.values());
}

export async function runMastraDeepResearchSummary({
  question,
  followUp,
  parentSessionId,
  modelId,
  requestHints,
}: {
  question: string;
  followUp?: string;
  parentSessionId?: string;
  modelId: string;
  requestHints?: RequestHints;
}): Promise<{
  message: string;
  attachment: DeepResearchSummaryAttachment;
  metadata: MessageMetadata;
}> {
  const sessionId = generateUUID();
  const createdAt = nowIso();
  const history: DeepResearchHistoryEntry[] = [];

  logHistory(history, "Initialising Mastra deep research workflow");

  const plan = await createResearchPlan({
    question,
    modelId,
    hints: requestHints,
  });

  logHistory(history, `Generated research plan with ${plan.plan.length} steps`);

  const searchResults = await Promise.all(
    plan.searchQueries.slice(0, 4).map((query) => performSearch(query, history))
  );

  const mergedResults = mergeSearchResults(searchResults).slice(0, 8);

  logHistory(history, `Consolidated ${mergedResults.length} unique sources`);

  const evaluated = await evaluateSources({
    question,
    plan,
    hits: mergedResults,
    modelId,
  });

  logHistory(history, `Evaluated ${evaluated.length} sources`);

  const summary = await buildSummary({
    question,
    plan,
    evaluations: evaluated,
    hits: mergedResults,
    modelId,
    followUp,
  });

  logHistory(history, "Synthesised findings and recommendations");

  const sources: DeepResearchSource[] = evaluated.map((evaluation) => {
    const hit = mergedResults[evaluation.index - 1];
    return {
      index: evaluation.index,
      title: hit?.title ?? `Source ${evaluation.index}`,
      url: hit?.url ?? "",
      snippet: hit?.snippet ?? hit?.content?.slice(0, 160) ?? "",
      summary: evaluation.summary,
      reliability: evaluation.reliability,
      confidence: evaluation.confidence,
      publishedAt: hit?.publishedDate,
      notes: evaluation.notes,
    } satisfies DeepResearchSource;
  });

  const attachment: DeepResearchSummaryAttachment = {
    type: "deep-research-summary",
    sessionId,
    question,
    createdAt,
    confidence: summary.confidence,
    plan: plan.plan,
    sources,
    history,
    findings: summary.findings,
    recommendations: summary.recommendations,
    followUpQuestions: summary.followUpQuestions,
    approvalMessage: summary.approvalMessage,
    parentSessionId,
  };

  const metadata = buildMetadata({
    createdAt,
    summaryAttachment: attachment,
    status: "awaiting-approval",
  });

  const planSection = attachment.plan
    .map((step, index) => `${index + 1}. ${step}`)
    .join("\n");

  const historySection = formatHistory(history);

  const findingsSection =
    attachment.findings.length > 0
      ? attachment.findings.map((item) => `- ${item}`).join("\n")
      : "- No findings were produced. Consider requesting a deeper investigation.";

  const recommendationsSection =
    attachment.recommendations.length > 0
      ? attachment.recommendations.map((item) => `- ${item}`).join("\n")
      : "- No actionable recommendations available yet.";

  const sourceSection =
    attachment.sources.length > 0
      ? attachment.sources
          .map((source) => {
            const confidence = Math.round(source.confidence * 100);
            const reliability = source.reliability.toUpperCase();
            const link = source.url ? ` [Link](${source.url})` : "";
            const notes = source.notes ? `\n   Notes: ${source.notes}` : "";
            return `${source.index}. ${source.title}${link} — Reliability: ${reliability} | Confidence: ${confidence}%\n   Summary: ${source.summary}${notes}`;
          })
          .join("\n\n")
      : "No authoritative sources could be gathered automatically. Provide more context or configure a search API key.";

  const confidencePct = Math.round(summary.confidence * 100);

  const message = `### Deep Research Summary\n**Research Question:** ${question}\n${
    parentSessionId ? `\n**Follow-up to Session:** ${parentSessionId}` : ""
  }\n**Session ID:** ${sessionId}\n**Status:** awaiting-approval\n**Overall Confidence:** ${confidencePct}%\n\n**Investigation Plan**\n${planSection}\n\n**Progress Log**\n${historySection}\n\n**Key Findings**\n${findingsSection}\n\n**Recommendations**\n${recommendationsSection}\n\n**Source Assessments**\n${sourceSection}\n\n${summary.approvalMessage}\n\nReply "approve ${sessionId}" or say "generate the report" to receive the full markdown deliverable. To continue researching, describe the areas that need deeper investigation.`;

  return { message, attachment, metadata };
}

export async function runMastraDeepResearchReport({
  summaryAttachment,
  modelId,
}: {
  summaryAttachment: DeepResearchSummaryAttachment;
  modelId: string;
}): Promise<{
  message: string;
  attachment: DeepResearchReportAttachment;
  metadata: MessageMetadata;
}> {
  const createdAt = nowIso();
  const history: DeepResearchHistoryEntry[] = [...summaryAttachment.history];

  logHistory(history, "Generating final markdown report");

  const prompt = JSON.stringify(
    {
      question: summaryAttachment.question,
      plan: summaryAttachment.plan,
      findings: summaryAttachment.findings,
      recommendations: summaryAttachment.recommendations,
      followUpQuestions: summaryAttachment.followUpQuestions,
      sources: summaryAttachment.sources,
      previousHistory: summaryAttachment.history,
    },
    null,
    2
  );

  const { text: reportMarkdown } = await generateText({
    model: myProvider.languageModel(modelId ?? DEFAULT_SUMMARY_MODEL),
    system: REPORT_SYSTEM_PROMPT,
    prompt,
  });

  const cleanedReport = reportMarkdown.trim();

  const attachment: DeepResearchReportAttachment = {
    type: "deep-research-report",
    sessionId: summaryAttachment.sessionId,
    question: summaryAttachment.question,
    createdAt,
    confidence: summaryAttachment.confidence,
    plan: summaryAttachment.plan,
    reportMarkdown: cleanedReport,
    sources: summaryAttachment.sources,
    history,
    parentSessionId: summaryAttachment.parentSessionId,
  };

  const metadata = buildMetadata({
    createdAt,
    summaryAttachment: {
      ...summaryAttachment,
      history,
    },
    status: "report-generated",
  });

  const message = `### Deep Research Report Ready\n**Session ID:** ${summaryAttachment.sessionId}\n**Overall Confidence:** ${Math.round(
    summaryAttachment.confidence * 100
  )}%\n\n${cleanedReport}`;

  return { message, attachment, metadata };
}

export function isLikelyDetailedQuestion(input: string): boolean {
  const text = input.replace(/\s+/g, " ").trim();
  if (!text) {
    return false;
  }

  const wordCount = text.split(" ").filter(Boolean).length;
  if (wordCount < 6) {
    return false;
  }

  const hasQuestionMark = text.includes("?");
  const hasAnalyticalVerb =
    /\b(impact|analyse|analyze|assess|risk|forecast|trend|regulation|compliance|cost|benefit|scenario|compare|evaluate)\b/i.test(
      text
    );
  const containsContext =
    /\b(202[0-9]|202[0-9]-202[0-9]|Q[1-4]|FY|financial|ledger|tax|ATO|IRS|SME|enterprise|startup)\b/i.test(
      text
    );

  return (
    hasQuestionMark || (wordCount >= 12 && hasAnalyticalVerb && containsContext)
  );
}

export function detectApprovalCommand(
  input: string,
  sessionId?: string
): boolean {
  const text = input.toLowerCase();
  if (!text) {
    return false;
  }

  const approvalKeywords = [
    "approve",
    "looks good",
    "generate report",
    "ship it",
    "final report",
    "confirmed",
    "proceed",
    "ready",
  ];

  if (approvalKeywords.some((keyword) => text.includes(keyword))) {
    return true;
  }

  if (
    sessionId &&
    text.includes("approve") &&
    text.includes(sessionId.toLowerCase())
  ) {
    return true;
  }

  return false;
}

export function detectDeeperRequest(input: string): boolean {
  const text = input.toLowerCase();
  if (!text) {
    return false;
  }

  return /deeper|more detail|expand|explore|investigate|drill down|dig deeper|focus on|look into|analyse further|analyze further/.test(
    text
  );
}

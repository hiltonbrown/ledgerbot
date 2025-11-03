import { generateText } from "ai";
import { parse } from "papaparse";
import { myProvider } from "@/lib/ai/providers";

export type MastraCsvAnalysis = {
  answer: string;
  reasoning?: string;
  highlights?: string[];
  followUpQuestions?: string[];
  sampledRows: Array<Record<string, unknown>>;
  numericSummary: Record<
    string,
    { count: number; sum: number; average: number; min: number; max: number }
  >;
};

type RunMastraCsvToQuestionsProps = {
  csv: string;
  question: string;
};

const MASRA_SYSTEM_PROMPT = `You are the Mastra CSV-to-Questions analyst. Given structured CSV data and a business question you:
1. Inspect the available columns and row counts.
2. Leverage provided numeric summaries to compute accurate aggregates (sums, averages, min, max).
3. Highlight key insights that directly answer the question.
4. Suggest optional follow-up questions that would deepen the analysis.

Always reply with valid JSON using the following shape:
{
  "answer": string,
  "reasoning": string,
  "highlights": string[],
  "followUpQuestions": string[]
}
`;

function buildNumericSummary(
  rows: Array<Record<string, any>>,
  headers: string[]
) {
  const summary: Record<
    string,
    { count: number; sum: number; min: number; max: number }
  > = {};

  for (const header of headers) {
    summary[header] = { count: 0, sum: 0, min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY };
  }

  for (const row of rows) {
    for (const header of headers) {
      const value = row[header];
      if (value === undefined || value === null || value === "") {
        continue;
      }

      const numericValue =
        typeof value === "number" ? value : Number.parseFloat(String(value).replace(/[^0-9.\-]/g, ""));

      if (!Number.isFinite(numericValue)) {
        continue;
      }

      const stats = summary[header];
      stats.count += 1;
      stats.sum += numericValue;
      stats.min = Math.min(stats.min, numericValue);
      stats.max = Math.max(stats.max, numericValue);
    }
  }

  const result: Record<
    string,
    { count: number; sum: number; average: number; min: number; max: number }
  > = {};

  for (const [header, stats] of Object.entries(summary)) {
    if (stats.count === 0) {
      continue;
    }

    result[header] = {
      count: stats.count,
      sum: Number(stats.sum.toFixed(4)),
      average: Number((stats.sum / stats.count).toFixed(4)),
      min: Number(stats.min.toFixed(4)),
      max: Number(stats.max.toFixed(4)),
    };
  }

  return result;
}

export async function runMastraCsvToQuestions({
  csv,
  question,
}: RunMastraCsvToQuestionsProps): Promise<MastraCsvAnalysis> {
  const trimmedCsv = csv.trim();

  if (!trimmedCsv) {
    return {
      answer: "The spreadsheet is empty.",
      reasoning: "No data rows were provided in the CSV attachment.",
      highlights: [],
      followUpQuestions: [],
      sampledRows: [],
      numericSummary: {},
    };
  }

  const parsed = parse<Record<string, any>>(trimmedCsv, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  });

  const rows = Array.isArray(parsed.data)
    ? (parsed.data as Array<Record<string, any>>).filter(
        (row) => Object.keys(row ?? {}).length > 0
      )
    : [];

  const headers = (parsed.meta.fields ?? []).filter(Boolean) as string[];

  const sampledRows = rows.slice(0, 15);
  const numericSummary = buildNumericSummary(rows, headers);

  const datasetDescription = [
    `Rows: ${rows.length}`,
    `Columns: ${headers.length > 0 ? headers.join(", ") : "none"}`,
  ].join("\n");

  const summaryForModel = JSON.stringify(numericSummary).slice(0, 4_000);
  const sampleForModel = JSON.stringify(sampledRows).slice(0, 4_000);

  const prompt = `# Dataset Overview\n${datasetDescription}\n\n# Numeric Summary (partial)\n${summaryForModel}\n\n# Sample Rows\n${sampleForModel}\n\n# Question\n${question}\n\nReturn a JSON object with keys answer, reasoning, highlights, followUpQuestions.`;

  const { text } = await generateText({
    model: myProvider.languageModel("artifact-model"),
    system: MASTRA_SYSTEM_PROMPT,
    prompt,
  });

  let structured: Partial<MastraCsvAnalysis> = {};

  try {
    structured = JSON.parse(text) as Partial<MastraCsvAnalysis>;
  } catch (error) {
    structured = {
      answer: text.trim(),
      reasoning:
        "The response could not be parsed as JSON. Presenting the raw answer from the Mastra analysis.",
    };
  }

  const fallbackAnswer = structured.answer ?? text.trim();

  return {
    answer: fallbackAnswer,
    reasoning: structured.reasoning,
    highlights: structured.highlights ?? [],
    followUpQuestions: structured.followUpQuestions ?? [],
    sampledRows,
    numericSummary,
  };
}

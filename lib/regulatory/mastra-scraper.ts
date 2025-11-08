import "server-only";

import { Agent } from "@mastra/core/agent";
import { RuntimeContext } from "@mastra/core/runtime-context";
import { z } from "zod";

import { myProvider } from "@/lib/ai/providers";
import type { RegulatorySource } from "@/lib/regulatory/config-parser";
import { truncateForPrompt } from "@/lib/regulatory/text-utils";

const SCRAPER_OUTPUT_SCHEMA = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  obligations: z.array(z.string()).min(1).max(10),
  effectiveDate: z.string().nullable().optional(),
  citations: z
    .array(
      z.object({
        label: z.string().min(1),
        url: z.string().url().optional().nullable(),
      })
    )
    .max(10)
    .optional(),
});

export type MastraScrapeSummary = z.infer<typeof SCRAPER_OUTPUT_SCHEMA>;

const regulatoryScraperAgent = new Agent({
  name: "regulatory-scraper",
  instructions: `You are LedgerBot's regulatory ingestion agent. Given unstructured Australian regulatory text you must:
1. Produce a concise summary (<= 200 words) in Australian English.
2. List 2-5 bullet-ready obligations or rules that accountants must be aware of.
3. Detect the effective date if it is mentioned. Return null if uncertain.
4. Provide citations with descriptive labels and canonical URLs when available.
Always respond with strict JSON matching the output schema. Do not add commentary.`,
  model: () => myProvider.languageModel("anthropic-claude-haiku-4-5"),
});

export async function runMastraRegulatorySummary({
  source,
  extractedText,
}: {
  source: RegulatorySource;
  extractedText: string;
}): Promise<MastraScrapeSummary | null> {
  const runtimeContext = new RuntimeContext();
  runtimeContext.set("sourceUrl", source.url);

  const prompt = `Source URL: ${source.url}
Country: ${source.country}
Category: ${source.category}
Section: ${source.section}
Subsection: ${source.subsection}

Content:
"""
${truncateForPrompt(extractedText)}
"""`;

  try {
    const response = await regulatoryScraperAgent.generate(prompt, {
      runtimeContext,
      output: SCRAPER_OUTPUT_SCHEMA,
      maxSteps: 1,
    });

    if (response.object) {
      return response.object;
    }

    if (typeof response.text === "string") {
      const cleaned = response.text.replace(/```json|```/g, "").trim();
      const parsed = SCRAPER_OUTPUT_SCHEMA.safeParse(JSON.parse(cleaned));
      if (parsed.success) {
        return parsed.data;
      }
    }
  } catch (error) {
    console.error("[regulatory] Mastra summary failed", error);
  }

  return null;
}

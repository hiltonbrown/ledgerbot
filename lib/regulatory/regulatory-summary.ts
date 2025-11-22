import "server-only";

import { generateObject } from "ai";
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

export type RegulatoryScrapeSummary = z.infer<typeof SCRAPER_OUTPUT_SCHEMA>;

export async function runRegulatorySummary({
  source,
  extractedText,
}: {
  source: RegulatorySource;
  extractedText: string;
}): Promise<RegulatoryScrapeSummary | null> {
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
    const { object } = await generateObject({
      model: myProvider.languageModel("anthropic-claude-haiku-4-5"),
      schema: SCRAPER_OUTPUT_SCHEMA,
      system: `You are LedgerBot's regulatory ingestion agent. Given unstructured Australian regulatory text you must:
1. Produce a concise summary (<= 200 words) in Australian English.
2. List 2-5 bullet-ready obligations or rules that accountants must be aware of.
3. Detect the effective date if it is mentioned. Return null if uncertain.
4. Provide citations with descriptive labels and canonical URLs when available.
Always respond with strict JSON matching the output schema. Do not add commentary.`,
      prompt,
    });

    return object;
  } catch (error) {
    console.error("[regulatory] Summary generation failed", error);
  }

  return null;
}

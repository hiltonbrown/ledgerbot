import { streamObject } from "ai";
import { z } from "zod";
import { buildSheetPrompt, updateDocumentPrompt } from "@/lib/ai/prompts";
import { myProvider } from "@/lib/ai/providers";
import { getCustomInstructionsForArtifacts } from "@/lib/db/queries";
import { createDocumentHandler } from "../registry";

export const sheetDocumentHandler = createDocumentHandler<"sheet">({
  kind: "sheet",
  onCreateDocument: async ({ prompt, dataStream, modelId, user }) => {
    let draftContent = "";

    // Fetch user's custom instructions for sheet artifacts
    const customInstructions = await getCustomInstructionsForArtifacts(user.id);

    const { fullStream } = streamObject({
      model: myProvider.languageModel(modelId),
      system: buildSheetPrompt(customInstructions?.customSheetInstructions),
      prompt,
      schema: z.object({
        csv: z
          .string()
          .describe(
            "CSV data with newline characters (\\n) separating each row. Each row must be on a new line."
          ),
      }),
    });

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === "object") {
        const { object } = delta;
        const { csv } = object;

        if (csv) {
          dataStream.write({
            type: "data-sheetDelta",
            data: csv,
            transient: true,
          });

          draftContent = csv;
        }
      }
    }

    dataStream.write({
      type: "data-sheetDelta",
      data: draftContent,
      transient: true,
    });

    // Use the title provided by the AI tool call - no need to generate another one
    return draftContent;
  },
  onUpdateDocument: async ({ document, description, dataStream, modelId, user }) => {
    let draftContent = "";

    const { fullStream } = streamObject({
      model: myProvider.languageModel(modelId),
      system: updateDocumentPrompt(document.content, "sheet"),
      prompt: description,
      schema: z.object({
        csv: z
          .string()
          .describe(
            "CSV data with newline characters (\\n) separating each row. Each row must be on a new line."
          ),
      }),
    });

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === "object") {
        const { object } = delta;
        const { csv } = object;

        if (csv) {
          dataStream.write({
            type: "data-sheetDelta",
            data: csv,
            transient: true,
          });

          draftContent = csv;
        }
      }
    }

    return draftContent;
  },
});

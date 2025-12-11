import { streamObject } from "ai";
import { z } from "zod";
import { buildCodePrompt, updateDocumentPrompt } from "@/lib/ai/prompts";
import { myProvider } from "@/lib/ai/providers";
import { getCustomInstructionsForArtifacts } from "@/lib/db/queries";
import { createDocumentHandler } from "../registry";

export const codeDocumentHandler = createDocumentHandler<"code">({
  kind: "code",
  onCreateDocument: async ({ prompt, dataStream, modelId, user }) => {
    let draftContent = "";

    // Fetch user's custom instructions for code artifacts
    const customInstructions = await getCustomInstructionsForArtifacts(user.id);

    const { fullStream } = streamObject({
      model: myProvider.languageModel(modelId),
      system: buildCodePrompt(
        customInstructions?.customCodeInstructions,
        customInstructions?.industryContext
      ),
      prompt,
      schema: z.object({
        code: z.string(),
      }),
    });

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === "object") {
        const { object } = delta;
        const { code } = object;

        if (code) {
          dataStream.write({
            type: "data-codeDelta",
            data: code ?? "",
            transient: true,
          });

          draftContent = code;
        }
      }
    }

    // Use the title provided by the AI tool call - no need to generate another one
    return draftContent;
  },
  onUpdateDocument: async ({ document, description, dataStream, modelId, user }) => {
    let draftContent = "";

    const { fullStream } = streamObject({
      model: myProvider.languageModel(modelId),
      system: updateDocumentPrompt(document.content, "code"),
      prompt: description,
      schema: z.object({
        code: z.string(),
      }),
    });

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === "object") {
        const { object } = delta;
        const { code } = object;

        if (code) {
          dataStream.write({
            type: "data-codeDelta",
            data: code ?? "",
            transient: true,
          });

          draftContent = code;
        }
      }
    }

    return draftContent;
  },
});

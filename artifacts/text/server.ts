import { smoothStream, streamText } from "ai";
import { buildTextPrompt, updateDocumentPrompt } from "@/lib/ai/prompts";
import { myProvider } from "@/lib/ai/providers";
import { getCustomInstructionsForArtifacts } from "@/lib/db/queries";
import { createDocumentHandler } from "../registry";

export const textDocumentHandler = createDocumentHandler<"text">({
  kind: "text",
  onCreateDocument: async ({ prompt, dataStream, modelId, user }) => {
    let draftContent = "";

    // Fetch user's custom instructions for text artifacts
    // Using customSystemInstructions since there's no dedicated text instructions field
    const customInstructions = await getCustomInstructionsForArtifacts(user.id);

    const { fullStream } = streamText({
      model: myProvider.languageModel(modelId),
      system: buildTextPrompt(customInstructions?.customSystemInstructions),
      experimental_transform: smoothStream({
        chunking: "word",
      }),
      prompt,
    });

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === "text-delta") {
        const { text } = delta;

        draftContent += text;

        dataStream.write({
          type: "data-textDelta",
          data: text,
          transient: true,
        });
      }
    }

    // Use the title provided by the AI tool call - no need to generate another one
    return draftContent;
  },
  onUpdateDocument: async ({ document, description, dataStream, modelId, user }) => {
    let draftContent = "";

    const { fullStream } = streamText({
      model: myProvider.languageModel(modelId),
      system: updateDocumentPrompt(document.content, "text"),
      experimental_transform: smoothStream({ chunking: "word" }),
      prompt: description,
      providerOptions: {
        openai: {
          prediction: {
            type: "content",
            content: document.content,
          },
        },
      },
    });

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === "text-delta") {
        const { text } = delta;

        draftContent += text;

        dataStream.write({
          type: "data-textDelta",
          data: text,
          transient: true,
        });
      }
    }

    return draftContent;
  },
});

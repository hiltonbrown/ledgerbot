import { smoothStream, streamText } from "ai";
import { generateTitleFromContent } from "@/app/(chat)/actions";
import { updateDocumentPrompt } from "@/lib/ai/prompts";
import { myProvider } from "@/lib/ai/providers";
import { createDocumentHandler } from "@/lib/artifacts/server";

export const textDocumentHandler = createDocumentHandler<"text">({
  kind: "text",
  onCreateDocument: async ({ title, dataStream, modelId }) => {
    let draftContent = "";

    const { fullStream } = streamText({
      model: myProvider.languageModel(modelId),
      system:
        "Write about the given topic. Markdown is supported. Use headings wherever appropriate. If the prompt includes specific data (such as JSON data, numbers, names, or other factual information), use that EXACT data in your response. Do not make up or invent data if specific data is provided in the prompt.",
      experimental_transform: smoothStream({ chunking: "word" }),
      prompt: title,
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

    // Generate a short, descriptive title from the content
    const generatedTitle = await generateTitleFromContent({
      content: draftContent,
      kind: "text",
      modelId,
    });

    // Update the title in the stream
    dataStream.write({
      type: "data-title",
      data: generatedTitle,
      transient: true,
    });

    return { content: draftContent, generatedTitle };
  },
  onUpdateDocument: async ({ document, description, dataStream, modelId }) => {
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

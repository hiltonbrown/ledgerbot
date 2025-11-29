import { smoothStream, streamText } from "ai";
import { updateDocumentPrompt } from "@/lib/ai/prompts";
import { myProvider } from "@/lib/ai/providers";
import { createDocumentHandler } from "@/lib/artifacts/server";

export const textDocumentHandler = createDocumentHandler<"text">({
  kind: "text",
  onCreateDocument: async ({ prompt, dataStream, modelId }) => {
    let draftContent = "";

    const { fullStream } = streamText({
      model: myProvider.languageModel(modelId),
      system:
        "Write about the given topic. Markdown is supported. Use headings wherever appropriate. If the prompt includes specific data (such as JSON data, numbers, names, or other factual information), use that EXACT data in your response. Do not make up or invent data if specific data is provided in the prompt.\n\nFormatting requirements:\n- When presenting structured information (like invoice details, contact information, or lists), use clear line breaks between each item\n- Use proper spacing between labels and values (e.g., 'Invoice Number: 945-ORC' not 'Invoice Number945-ORC')\n- Use markdown tables or lists for tabular data\n- Ensure markdown tables have newlines between the header and the rows\n- Use bullet points or numbered lists for multiple items\n- Preserve all line breaks and spacing for readability",
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

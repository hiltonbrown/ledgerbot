"use server";

import { generateText, type UIMessage } from "ai";
import { cookies } from "next/headers";
import { myProvider } from "@/lib/ai/providers";
import { sanitizeVisibility, type VisibilityType } from "@/lib/chat/visibility";
import {
  deleteMessagesByChatIdAfterTimestamp,
  getMessageById,
  updateChatVisiblityById,
} from "@/lib/db/queries";

const HEADING_REGEX = /^#\s+(.+)$/m;

export async function saveChatModelAsCookie(model: string) {
  const cookieStore = await cookies();
  cookieStore.set("chat-model", model);
}

export async function generateTitleFromUserMessage({
  message,
  modelId,
}: {
  message: UIMessage;
  modelId: string;
}) {
  const { text: title } = await generateText({
    model: myProvider.languageModel(modelId),
    system: `\n
    - you will generate a short title based on the first message a user begins a conversation with
    - ensure it is not more than 80 characters long
    - the title should be a summary of the user's message
    - do not use quotes or colons`,
    prompt: JSON.stringify(message),
  });

  return title;
}

export async function generateTitleFromContent({
  content,
  kind,
  modelId,
}: {
  content: string;
  kind: "text" | "code" | "sheet";
  modelId: string;
}) {
  // For text documents, try to extract the first heading
  if (kind === "text") {
    const headingMatch = content.match(HEADING_REGEX);
    if (headingMatch?.[1]) {
      return headingMatch[1].trim();
    }
  }

  const contentTypeMap = {
    text: "document",
    code: "code snippet",
    sheet: "spreadsheet",
  };

  const contentType = contentTypeMap[kind];
  const contentPreview =
    content.length > 1000 ? `${content.substring(0, 1000)}...` : content;

  const { text: title } = await generateText({
    model: myProvider.languageModel(modelId),
    system: `You will generate a short, descriptive title for a ${contentType} based on its content.

Rules:
- Keep the title between 2-5 words (max 50 characters)
- Make it descriptive and specific to the content
- Do not use quotes, colons, pipes (|), or any special characters
- Return ONLY the title text, nothing else
- Focus on the main topic or purpose
- For spreadsheets: mention the data type (e.g., "Customer Invoices", "Sales Report")
- For code: mention what it does (e.g., "GST Calculator", "Data Parser")
- For documents: capture the main subject (e.g., "Revenue Summary", "Tax Guide")`,
    prompt: `Generate a title for this ${contentType}:\n\n${contentPreview}`,
  });

  // Extract short title if pipe character is present (safety fallback)
  const cleanTitle = title.includes("|")
    ? title.split("|")[0].trim()
    : title.trim();

  return cleanTitle;
}

export async function deleteTrailingMessages({ id }: { id: string }) {
  const messages = await getMessageById({ id });

  if (!messages || messages.length === 0) {
    throw new Error(`Message with id ${id} not found`);
  }

  const message = messages[0];

  await deleteMessagesByChatIdAfterTimestamp({
    chatId: message.chatId,
    timestamp: message.createdAt,
  });
}

export async function updateChatVisibility({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: VisibilityType;
}) {
  const sanitizedVisibility = sanitizeVisibility(visibility);

  await updateChatVisiblityById({
    chatId,
    visibility: sanitizedVisibility,
  });
}

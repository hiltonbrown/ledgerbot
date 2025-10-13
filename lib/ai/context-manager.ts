import { getContextFilesByUserId, touchContextFile } from "@/lib/db/queries";
import type { ContextFile } from "@/lib/db/schema";

const DEFAULT_TOKEN_BUDGET = 10_000;

function formatFileContext(
  file: ContextFile,
  text: string,
  truncated: boolean
) {
  const header = [`## ${file.originalName}`];
  if (file.description) {
    header.push(`*Description: ${file.description}*`);
  }

  let body = text.trim();
  if (truncated) {
    body = `${body}\n\n[...content truncated due to token limit...]`;
  }

  return `${header.join("\n")}\n\n${body}`.trim();
}

function estimateTokenCount(text: string): number {
  if (!text) {
    return 0;
  }
  return Math.ceil(text.length / 4);
}

export async function buildUserContext(userId: string): Promise<string> {
  const files = await getContextFilesByUserId({ userId, status: "ready" });
  if (files.length === 0) {
    return "";
  }

  const sorted = [...files].sort((a, b) => {
    if (a.isPinned && !b.isPinned) {
      return -1;
    }
    if (!a.isPinned && b.isPinned) {
      return 1;
    }

    const aDate = a.lastUsedAt ?? a.createdAt;
    const bDate = b.lastUsedAt ?? b.createdAt;
    return bDate.getTime() - aDate.getTime();
  });

  const included: string[] = [];
  const touched: string[] = [];
  let usedTokens = 0;

  for (const file of sorted) {
    if (!file.extractedText) {
      continue;
    }

    const tokenCount =
      file.tokenCount ?? estimateTokenCount(file.extractedText);
    if (usedTokens + tokenCount > DEFAULT_TOKEN_BUDGET) {
      const remaining = DEFAULT_TOKEN_BUDGET - usedTokens;
      if (remaining > 100) {
        const truncatedText = file.extractedText.slice(0, remaining * 4);
        included.push(formatFileContext(file, truncatedText, true));
        touched.push(file.id);
      }
      break;
    }

    included.push(formatFileContext(file, file.extractedText, false));
    usedTokens += tokenCount;
    touched.push(file.id);
  }

  if (touched.length > 0) {
    void Promise.all(touched.map((id) => touchContextFile(id))).catch(() => {});
  }

  if (included.length === 0) {
    return "";
  }

  return `# User's Context Files\n\nThe following documents were uploaded by the user and should be considered when responding.\n\n${included.join("\n\n---\n\n")}\n\n# End of Context Files`;
}

export function getContextTokenLimit(): number {
  return DEFAULT_TOKEN_BUDGET;
}

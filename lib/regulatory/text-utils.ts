import * as cheerio from "cheerio";
import he from "he";

const DEFAULT_MAX_TEXT_LENGTH = 50_000;

export function extractTextFromHtml(
  html: string,
  maxLength = DEFAULT_MAX_TEXT_LENGTH
) {
  try {
    const $ = cheerio.load(html);
    $("script, style, noscript").remove();
    const text = $("body").text();
    const decodedText = he.decode(text);
    const collapsed = decodedText.replace(/\s+/g, " ").trim();
    if (collapsed.length <= maxLength) {
      return collapsed;
    }
    return `${collapsed.slice(0, maxLength)}…`;
  } catch (error) {
    console.error("[regulatory] Failed to extract text from HTML", error);
    return html.slice(0, maxLength);
  }
}

export function countTokens(text: string) {
  if (!text) {
    return 0;
  }
  return Math.ceil(text.length / 4);
}

export function truncateForPrompt(text: string, limit = 18_000) {
  if (!text) {
    return "";
  }
  return text.length <= limit ? text : `${text.slice(0, limit)}…`;
}

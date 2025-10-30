/**
 * Confidence scoring for AI responses based on regulatory citations
 */

// Definition for ToolCall and nested result structure
interface RegulatorySearchResult {
  title: string;
  url: string;
  category: string;
}

interface ToolCall {
  toolName: string;
  result?: {
    results?: RegulatorySearchResult[];
  };
}
/**
 * Citation extracted from regulatory search results
 */
export type Citation = {
  title: string;
  url: string;
  category: string;
};

/**
 * Calculates average relevance score from regulatory search tool calls
 * @param toolCalls - Array of tool calls from AI response
 * @returns Average relevance score, or 0 if no results
 */
function getAverageRelevance(toolCalls: ToolCall[]): number {
  const regulatorySearchCalls = toolCalls.filter(
    (call) => call.toolName === "regulatorySearch"
  );

  if (regulatorySearchCalls.length === 0) {
    return 0;
  }

  let totalRelevance = 0;
  let resultCount = 0;

  for (const call of regulatorySearchCalls) {
    const results = call.result?.results || [];
    for (const result of results) {
      if (typeof result.relevanceScore === "number") {
        totalRelevance += result.relevanceScore;
        resultCount++;
      }
    }
  }

  return resultCount > 0 ? totalRelevance / resultCount : 0;
}

/**
 * Detects hedging language in response text
 * @param text - The response text to analyze
 * @returns Penalty score between 0 and 0.3
 */
export function detectHedging(text: string): number {
  const lowerText = text.toLowerCase();

  const hedgingPhrases = [
    "i'm not sure",
    "i don't know",
    "might be",
    "could be",
    "possibly",
    "perhaps",
    "uncertain",
    "unclear",
    "i think",
    "i believe",
    "probably",
    "may",
  ];

  let count = 0;
  for (const phrase of hedgingPhrases) {
    const regex = new RegExp(phrase, "gi");
    const matches = lowerText.match(regex);
    if (matches) {
      count += matches.length;
    }
  }

  // Return penalty: 0.05 per occurrence, max 0.3
  return Math.min(count * 0.05, 0.3);
}

/**
 * Calculates confidence score for an AI response
 * @param toolCalls - Array of tool calls made during response generation
 * @param responseText - The generated response text
 * @returns Confidence score between 0 and 1
 */
export function calculateConfidence(
  toolCalls: ToolCall[],
  responseText: string
): number {
  // Start with base score
  let score = 0.5;

  // Factor 1: Number of regulatory citations (max +0.3)
  const regulatoryCitations = toolCalls.filter(
    (call) => call.toolName === "regulatorySearch"
  ).length;
  const citationBonus = Math.min(regulatoryCitations * 0.1, 0.3);
  score += citationBonus;

  // Factor 2: Average relevance scores (max +0.2)
  const avgRelevance = getAverageRelevance(toolCalls);
  const relevanceBonus = avgRelevance * 0.2;
  score += relevanceBonus;

  // Factor 3: Xero data integration (+0.15)
  const hasXeroData = toolCalls.some((call) =>
    call.toolName?.startsWith("xero_")
  );
  if (hasXeroData) {
    score += 0.15;
  }

  // Factor 4: Hedging language penalty (-0.1 to -0.3)
  const hedgingPenalty = detectHedging(responseText);
  score -= hedgingPenalty;

  // Factor 5: Response length penalty (-0.1 if < 100 chars)
  if (responseText.length < 100) {
    score -= 0.1;
  }

  // Clamp score between 0 and 1
  return Math.max(0, Math.min(1, score));
}

/**
 * Determines if a response requires human review based on confidence
 * @param confidence - Confidence score (0-1)
 * @param threshold - Minimum confidence threshold (default: 0.6)
 * @returns True if confidence is below threshold
 */
export function requiresHumanReview(
  confidence: number,
  threshold = 0.6
): boolean {
  return confidence < threshold;
}

/**
 * Extracts citations from regulatory search tool calls
 * @param toolCalls - Array of tool calls from AI response
 * @returns Array of unique citations with title, url, and category
 */
export function extractCitations(toolCalls: ToolCall[]): Citation[] {
  const citations: Citation[] = [];
  const seenUrls = new Set<string>();

  // Filter for regulatorySearch tool calls
  const regulatorySearchCalls = toolCalls.filter(
    (call) => call.toolName === "regulatorySearch"
  );

  for (const call of regulatorySearchCalls) {
    const results = call.result?.results || [];

    for (const result of results) {
      // Skip if we've already seen this URL
      if (seenUrls.has(result.url)) {
        continue;
      }

      citations.push({
        title: result.title,
        url: result.url,
        category: result.category,
      });

      seenUrls.add(result.url);
    }
  }

  return citations;
}

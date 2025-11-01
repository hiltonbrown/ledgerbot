// Awaiting a more specific type from the AI SDK, using `any` for now.
export type ToolCall = any;

/**
 * Extracts relevance scores from regulatorySearch tool calls and calculates the average.
 * @param toolCalls An array of tool calls made during an AI turn.
 * @returns The average relevance score, or 0 if no scores are found.
 */
function getAverageRelevance(toolCalls: ToolCall[]): number {
  const relevanceScores: number[] = [];

  const searchTools = toolCalls.filter(tc => tc.toolName === 'regulatorySearch' && tc.result?.success);

  for (const tool of searchTools) {
    if (tool.result.results) {
      for (const res of tool.result.results) {
        if (typeof res.relevanceScore === 'number') {
          relevanceScores.push(res.relevanceScore);
        }
      }
    }
  }

  if (relevanceScores.length === 0) return 0;

  const sum = relevanceScores.reduce((acc, score) => acc + score, 0);
  return sum / relevanceScores.length;
}

/**
 * Detects hedging language in a text and returns a penalty score.
 * @param text The text to analyze.
 * @returns A penalty score between 0 and 0.3.
 */
export function detectHedging(text: string): number {
  const hedges = [
    "i'm not sure", "i don't know", "might be", "could be",
    "possibly", "perhaps", "uncertain", "unclear", "i think",
    "i believe", "probably", "may"
  ];

  const lowerText = text.toLowerCase();
  let count = 0;

  for (const hedge of hedges) {
    count += (lowerText.match(new RegExp(`\b${hedge}\b`, 'g')) || []).length;
  }

  return Math.min(count * 0.05, 0.3);
}

/**
 * Calculates a confidence score for an AI response based on several factors.
 * @param toolCalls The tool calls made to generate the response.
 * @param responseText The final text of the AI response.
 * @returns A confidence score between 0 and 1.
 */
export function calculateConfidence(toolCalls: ToolCall[], responseText: string): number {
  let score = 0.5; // Base score

  // Factor 1: Number of regulatory citations
  const citationCount = toolCalls.filter(tc => tc.toolName === 'regulatorySearch' && tc.result?.success).length;
  score += Math.min(citationCount * 0.1, 0.3);

  // Factor 2: Average relevance scores
  const avgRelevance = getAverageRelevance(toolCalls);
  score += avgRelevance * 0.2;

  // Factor 3: Xero data integration
  const hasXeroCall = toolCalls.some(tc => tc.toolName.startsWith('xero_'));
  if (hasXeroCall) {
    score += 0.15;
  }

  // Factor 4: Hedging language penalty
  const hedgingPenalty = detectHedging(responseText);
  score -= hedgingPenalty;

  // Factor 5: Response length penalty
  if (responseText.length < 100) {
    score -= 0.1;
  }

  // Clamp final score between 0 and 1
  return Math.max(0, Math.min(1, score));
}

/**
 * Determines if a response requires human review based on a confidence threshold.
 * @param confidence The confidence score of the response.
 * @param threshold The threshold below which review is required.
 * @returns True if the confidence is below the threshold, false otherwise.
 */
export function requiresHumanReview(confidence: number, threshold = 0.6): boolean {
  return confidence < threshold;
}

/**
 * Extracts a deduplicated list of citations from regulatorySearch tool calls.
 * @param toolCalls The tool calls made to generate the response.
 * @returns An array of unique citation objects.
 */
export function extractCitations(toolCalls: ToolCall[]): Array<{ title: string; url: string; category: string }> {
  const citations: { title: string; url: string; category: string }[] = [];
  const seenUrls = new Set<string>();

  const searchTools = toolCalls.filter(tc => tc.toolName === 'regulatorySearch' && tc.result?.success);

  for (const tool of searchTools) {
    if (tool.result.results) {
      for (const res of tool.result.results) {
        if (res.url && !seenUrls.has(res.url)) {
          citations.push({
            title: res.title,
            url: res.url,
            category: res.category,
          });
          seenUrls.add(res.url);
        }
      }
    }
  }

  return citations;
}
import {
  calculateConfidence,
  detectHedging,
  extractCitations,
  requiresHumanReview,
} from "./confidence";

function test() {
  console.log("=== Testing Confidence Scoring ===\n");

  // Test 1: Hedging detection
  console.log("Test 1: Hedging detection");
  const hedgingText1 = "I'm not sure, but it might be around $23 per hour.";
  const hedgingText2 = "The minimum wage is $23.23 per hour as of July 2024.";
  console.log(`Text 1: "${hedgingText1}"`);
  console.log(`Hedging penalty: ${detectHedging(hedgingText1)}`);
  console.log(`Text 2: "${hedgingText2}"`);
  console.log(`Hedging penalty: ${detectHedging(hedgingText2)}`);

  // Test 2: Confidence calculation with regulatory citations
  console.log("\n\nTest 2: High confidence (with citations)");
  const mockToolCalls1 = [
    {
      toolName: "regulatorySearch",
      result: {
        results: [
          {
            title: "Minimum Wages",
            url: "https://fairwork.gov.au/...",
            category: "award",
            relevanceScore: 0.95,
          },
          {
            title: "Modern Awards",
            url: "https://fairwork.gov.au/awards",
            category: "award",
            relevanceScore: 0.87,
          },
        ],
      },
    },
  ];
  const responseText1 =
    "According to Fair Work, the national minimum wage is $23.23 per hour as of July 2024. This applies to all employees covered by the national workplace relations system.";
  const confidence1 = calculateConfidence(mockToolCalls1, responseText1);
  console.log(`Response: "${responseText1.substring(0, 80)}..."`);
  console.log(`Confidence: ${confidence1.toFixed(3)}`);
  console.log(`Requires review: ${requiresHumanReview(confidence1)}`);

  // Test 3: Low confidence (no citations, hedging)
  console.log("\n\nTest 3: Low confidence (no citations, hedging)");
  const mockToolCalls2: any[] = [];
  const responseText2 = "I think it might be around $23, but I'm not sure.";
  const confidence2 = calculateConfidence(mockToolCalls2, responseText2);
  console.log(`Response: "${responseText2}"`);
  console.log(`Confidence: ${confidence2.toFixed(3)}`);
  console.log(`Requires review: ${requiresHumanReview(confidence2)}`);

  // Test 4: Extract citations
  console.log("\n\nTest 4: Extract citations");
  const citations = extractCitations(mockToolCalls1);
  console.log(`Found ${citations.length} citations:`);
  for (const citation of citations) {
    console.log(`  - ${citation.title} (${citation.category})`);
    console.log(`    ${citation.url}`);
  }

  // Test 5: With Xero integration
  console.log("\n\nTest 5: High confidence (regulatory + Xero)");
  const mockToolCalls3 = [
    {
      toolName: "regulatorySearch",
      result: {
        results: [
          {
            title: "Superannuation Guarantee",
            url: "https://ato.gov.au/...",
            category: "tax_ruling",
            relevanceScore: 0.92,
          },
        ],
      },
    },
    {
      toolName: "xero_list_invoices",
      result: {},
    },
  ];
  const responseText3 =
    "Based on ATO guidance, the superannuation guarantee rate is 11.5% for 2024-25. I've checked your Xero invoices and calculated the required super contributions.";
  const confidence3 = calculateConfidence(mockToolCalls3, responseText3);
  console.log(`Response: "${responseText3.substring(0, 80)}..."`);
  console.log(`Confidence: ${confidence3.toFixed(3)}`);
  console.log(`Requires review: ${requiresHumanReview(confidence3)}`);

  console.log("\n=== All confidence tests complete ===");
}

test();

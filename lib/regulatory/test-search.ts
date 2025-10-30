import { getDocumentsByCategory, searchRegulatoryDocuments } from "./search";

async function test() {
  console.log("Test 1: Search 'minimum wage'");
  const results1 = await searchRegulatoryDocuments("minimum wage", {
    country: "AU",
    limit: 3,
  });
  console.log(`Found ${results1.length} results`);
  for (const r of results1) {
    console.log(`  - ${r.title} (score: ${r.relevanceScore.toFixed(3)})`);
  }

  console.log("\nTest 2: Get awards");
  const results2 = await getDocumentsByCategory("award", 3);
  console.log(`Found ${results2.length} awards`);
  for (const r of results2) {
    console.log(`  - ${r.title}`);
  }
}

test().catch(console.error);

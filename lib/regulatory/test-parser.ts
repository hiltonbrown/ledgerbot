import { parseRegulatoryConfig, getSourcesByCountry } from "./config-parser";

async function test() {
  const all = await parseRegulatoryConfig();
  console.log(`✅ Parsed ${all.length} sources`);

  const au = await getSourcesByCountry("AU");
  console.log(`✅ Found ${au.length} Australian sources`);

  if (au.length > 0) {
    console.log("\nSample source:");
    console.log(JSON.stringify(au[0], null, 2));
  }
}

test().catch(console.error);
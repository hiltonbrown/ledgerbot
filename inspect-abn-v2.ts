import "dotenv/config"; // Load env vars
import { AbnLookupClient } from "./lib/abr/abnLookupClient";
import { mapAbrEntity } from "./lib/abr/helpers";

async function main() {
  const abn = "35672804143"; // ABN from user request

  if (!process.env.ABN_LOOKUP_GUID) {
    console.error("Error: ABN_LOOKUP_GUID not found in environment.");
    // Try to proceed anyway if it's already in process.env from other means, but likely need .env
  }

  // Force enable for this script if not set
  if (!process.env.ABN_LOOKUP_ENABLED) {
    process.env.ABN_LOOKUP_ENABLED = "true";
  }

  console.log("Config loaded. GUID present:", !!process.env.ABN_LOOKUP_GUID);

  const client = new AbnLookupClient();
  try {
    console.log(`Fetching details for ABN: ${abn}`);
    const rawResult = await client.getByAbn(abn);
    console.log("\n--- Raw JSON Response ---");
    console.log(JSON.stringify(rawResult, null, 2));

    console.log("\n--- Mapped Result ---");
    const mapped = mapAbrEntity(rawResult);
    console.log(JSON.stringify(mapped, null, 2));
  } catch (error) {
    console.error("Error fetching ABN details:", error);
  }
}

main();

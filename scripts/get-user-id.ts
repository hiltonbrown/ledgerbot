#!/usr/bin/env tsx
/**
 * Get user ID for testing
 * Usage: pnpm exec tsx scripts/get-user-id.ts
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/lib/db/schema";

async function getUserIds() {
  const client = postgres(process.env.POSTGRES_URL!);
  const db = drizzle(client, { schema });

  try {
    console.log("🔍 Fetching users from database...\n");

    const users = await db.select().from(schema.user).limit(10);

    if (users.length === 0) {
      console.log("❌ No users found in database");
      process.exit(1);
    }

    console.log(`✅ Found ${users.length} user(s):\n`);

    for (const u of users) {
      console.log("─────────────────────────────────────");
      console.log(`User ID: ${u.id}`);
      console.log(`Email:   ${u.email || "N/A"}`);
      console.log(`Clerk:   ${u.clerkId || "N/A"}`);
      console.log(`Type:    ${u.type || "regular"}`);
      console.log(`Created: ${u.createdAt?.toISOString() || "N/A"}`);
    }

    console.log("─────────────────────────────────────");
    console.log("\n💡 To run the P&L diagnostic:");
    console.log(`   export TEST_USER_ID="${users[0].id}"`);
    console.log("   pnpm exec tsx scripts/test-xero-pl.ts");
  } catch (error) {
    console.error("❌ Error fetching users:");
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
    } else {
      console.error(error);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

getUserIds().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

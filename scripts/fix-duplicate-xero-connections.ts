import { config } from "dotenv";
import postgres from "postgres";

config({
  path: ".env.local",
});

const fixDuplicates = async () => {
  if (!process.env.POSTGRES_URL) {
    throw new Error("POSTGRES_URL is not defined");
  }

  const sql = postgres(process.env.POSTGRES_URL, { max: 1 });

  try {
    console.log("🔍 Checking for duplicate XeroConnection entries...");

    // Check for duplicates
    const duplicates = await sql`
      SELECT "userId", "tenantId", COUNT(*) as count
      FROM "XeroConnection"
      GROUP BY "userId", "tenantId"
      HAVING COUNT(*) > 1
    `;

    if (duplicates.length === 0) {
      console.log("✅ No duplicates found!");
      await sql.end();
      return;
    }

    console.log(`⚠️  Found ${duplicates.length} duplicate user-tenant pairs`);
    console.log(duplicates);

    console.log("\n🗑️  Dropping existing unique index...");
    await sql`DROP INDEX IF EXISTS "xero_connection_user_tenant_idx"`;

    console.log("🧹 Removing duplicate entries (keeping most recent)...");
    const result = await sql`
      DELETE FROM "XeroConnection"
      WHERE "id" IN (
        SELECT "id"
        FROM (
          SELECT 
            "id",
            ROW_NUMBER() OVER (
              PARTITION BY "userId", "tenantId" 
              ORDER BY "updatedAt" DESC, "createdAt" DESC
            ) as rn
          FROM "XeroConnection"
        ) t
        WHERE t.rn > 1
      )
    `;

    console.log(`✅ Deleted ${result.count} duplicate entries`);

    console.log("🔨 Recreating unique index...");
    await sql`
      CREATE UNIQUE INDEX "xero_connection_user_tenant_idx" 
      ON "XeroConnection" USING btree ("userId","tenantId")
    `;

    console.log("✅ Successfully fixed duplicate XeroConnection entries!");
  } catch (error) {
    console.error("❌ Error fixing duplicates:");
    console.error(error);
    throw error;
  } finally {
    await sql.end();
  }
};

fixDuplicates()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

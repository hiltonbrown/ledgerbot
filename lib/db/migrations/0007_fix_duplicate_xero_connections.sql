-- Fix duplicate XeroConnection entries before applying unique constraint
-- This migration removes duplicate entries, keeping only the most recent one per user-tenant pair

-- First, drop the existing unique index if it exists (it may have been partially created)
DROP INDEX IF EXISTS "xero_connection_user_tenant_idx";

-- Delete duplicate entries, keeping only the most recent one for each userId-tenantId pair
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
);

-- Now recreate the unique index
CREATE UNIQUE INDEX "xero_connection_user_tenant_idx" ON "XeroConnection" USING btree ("userId","tenantId");
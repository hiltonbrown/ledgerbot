-- Manual migration to fix ALL AR tables userId column types
-- This script drops and recreates AR tables with correct userId type (text instead of uuid)
-- WARNING: This will delete all data in AR tables - only run in development!

-- Drop all AR tables in correct order (respecting foreign keys)
DROP TABLE IF EXISTS "ArCommsArtefact" CASCADE;
DROP TABLE IF EXISTS "ArNote" CASCADE;
DROP TABLE IF EXISTS "ArReminder" CASCADE;
DROP TABLE IF EXISTS "ArPayment" CASCADE;
DROP TABLE IF EXISTS "ArInvoice" CASCADE;
DROP TABLE IF EXISTS "ArContact" CASCADE;
DROP TABLE IF EXISTS "ArCustomerHistory" CASCADE;
DROP TABLE IF EXISTS "ArJobRun" CASCADE;

-- Now run the standard Drizzle migration
-- This will recreate all tables with the correct schema from lib/db/schema/ar.ts

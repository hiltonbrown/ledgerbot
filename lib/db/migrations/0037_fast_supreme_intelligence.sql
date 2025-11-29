-- Fix ArNote.userId column type and add ON UPDATE CASCADE to all AR foreign keys

-- Step 1: Fix ArNote.userId type mismatch (UUID -> TEXT)
-- First drop any existing foreign key if it exists
ALTER TABLE "ArNote" DROP CONSTRAINT IF EXISTS "ArNote_userId_User_clerkId_fk";
ALTER TABLE "ArNote" DROP CONSTRAINT IF EXISTS "ArNote_userId_User_id_fk";

-- Change column type from UUID to TEXT
-- This assumes ArNote.userId values are actually Clerk IDs (varchar) stored as UUID
-- If there's data, this migration might fail - in that case, we need to migrate the data
ALTER TABLE "ArNote" ALTER COLUMN "userId" TYPE text USING "userId"::text;

-- Step 2: Drop all existing foreign key constraints that reference User.clerkId
ALTER TABLE "ArCommsArtefact" DROP CONSTRAINT IF EXISTS "ArCommsArtefact_userId_User_clerkId_fk";
ALTER TABLE "ArContact" DROP CONSTRAINT IF EXISTS "ArContact_userId_User_clerkId_fk";
ALTER TABLE "ArCustomerHistory" DROP CONSTRAINT IF EXISTS "ArCustomerHistory_userId_User_clerkId_fk";
ALTER TABLE "ArFollowUpContext" DROP CONSTRAINT IF EXISTS "ArFollowUpContext_userId_User_clerkId_fk";
ALTER TABLE "ArInvoice" DROP CONSTRAINT IF EXISTS "ArInvoice_userId_User_clerkId_fk";
ALTER TABLE "ArJobRun" DROP CONSTRAINT IF EXISTS "ArJobRun_userId_User_clerkId_fk";

-- Step 3: Recreate all foreign keys with ON DELETE CASCADE and ON UPDATE CASCADE
ALTER TABLE "ArCommsArtefact" ADD CONSTRAINT "ArCommsArtefact_userId_User_clerkId_fk"
  FOREIGN KEY ("userId") REFERENCES "public"."User"("clerkId")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ArContact" ADD CONSTRAINT "ArContact_userId_User_clerkId_fk"
  FOREIGN KEY ("userId") REFERENCES "public"."User"("clerkId")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ArCustomerHistory" ADD CONSTRAINT "ArCustomerHistory_userId_User_clerkId_fk"
  FOREIGN KEY ("userId") REFERENCES "public"."User"("clerkId")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ArFollowUpContext" ADD CONSTRAINT "ArFollowUpContext_userId_User_clerkId_fk"
  FOREIGN KEY ("userId") REFERENCES "public"."User"("clerkId")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ArInvoice" ADD CONSTRAINT "ArInvoice_userId_User_clerkId_fk"
  FOREIGN KEY ("userId") REFERENCES "public"."User"("clerkId")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ArJobRun" ADD CONSTRAINT "ArJobRun_userId_User_clerkId_fk"
  FOREIGN KEY ("userId") REFERENCES "public"."User"("clerkId")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ArNote" ADD CONSTRAINT "ArNote_userId_User_clerkId_fk"
  FOREIGN KEY ("userId") REFERENCES "public"."User"("clerkId")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Fix userId type inconsistency in ArNote and ArCommsArtefact tables
-- Change from uuid referencing User.id to text referencing User.clerkId
-- This aligns with other AR tables (ArContact, ArInvoice, ArCustomerHistory, ArJobRun)

-- Drop existing foreign key constraints
ALTER TABLE "ArNote" DROP CONSTRAINT IF EXISTS "ArNote_userId_User_id_fk";
--> statement-breakpoint
ALTER TABLE "ArCommsArtefact" DROP CONSTRAINT IF EXISTS "ArCommsArtefact_userId_User_id_fk";
--> statement-breakpoint

-- Add a temporary column to hold the clerkId
ALTER TABLE "ArNote" ADD COLUMN "userId_new" text;
--> statement-breakpoint
ALTER TABLE "ArCommsArtefact" ADD COLUMN "userId_new" text;
--> statement-breakpoint

-- Update the new column with clerkId values by joining with User table
UPDATE "ArNote" SET "userId_new" = u."clerkId" FROM "User" u WHERE "ArNote"."userId" = u."id";
--> statement-breakpoint
UPDATE "ArCommsArtefact" SET "userId_new" = u."clerkId" FROM "User" u WHERE "ArCommsArtefact"."userId" = u."id";
--> statement-breakpoint

-- Delete any orphaned records (rows with NULL userId_new have no matching user)
DELETE FROM "ArNote" WHERE "userId_new" IS NULL;
--> statement-breakpoint
DELETE FROM "ArCommsArtefact" WHERE "userId_new" IS NULL;
--> statement-breakpoint

-- Drop the old userId column
ALTER TABLE "ArNote" DROP COLUMN "userId";
--> statement-breakpoint
ALTER TABLE "ArCommsArtefact" DROP COLUMN "userId";
--> statement-breakpoint

-- Rename the new column to userId
ALTER TABLE "ArNote" RENAME COLUMN "userId_new" TO "userId";
--> statement-breakpoint
ALTER TABLE "ArCommsArtefact" RENAME COLUMN "userId_new" TO "userId";
--> statement-breakpoint

-- Set NOT NULL constraint on the new userId column
ALTER TABLE "ArNote" ALTER COLUMN "userId" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "ArCommsArtefact" ALTER COLUMN "userId" SET NOT NULL;
--> statement-breakpoint

-- Add new foreign key constraints referencing User.clerkId
ALTER TABLE "ArNote" ADD CONSTRAINT "ArNote_userId_User_clerkId_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("clerkId") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ArCommsArtefact" ADD CONSTRAINT "ArCommsArtefact_userId_User_clerkId_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("clerkId") ON DELETE cascade ON UPDATE no action;


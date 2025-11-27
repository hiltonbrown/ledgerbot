-- Fix userId type inconsistency in ArNote and ArCommsArtefact tables
-- Change from uuid referencing User.id to text referencing User.clerkId
-- This aligns with other AR tables (ArContact, ArInvoice, ArCustomerHistory, ArJobRun)

-- Drop existing foreign key constraints
ALTER TABLE "ArNote" DROP CONSTRAINT IF EXISTS "ArNote_userId_User_id_fk";
--> statement-breakpoint
ALTER TABLE "ArCommsArtefact" DROP CONSTRAINT IF EXISTS "ArCommsArtefact_userId_User_id_fk";
--> statement-breakpoint

-- Modify the userId column type from uuid to text
-- Note: This requires data migration if there is existing data
ALTER TABLE "ArNote" ALTER COLUMN "userId" TYPE text USING "userId"::text;
--> statement-breakpoint
ALTER TABLE "ArCommsArtefact" ALTER COLUMN "userId" TYPE text USING "userId"::text;
--> statement-breakpoint

-- Add new foreign key constraints referencing User.clerkId
ALTER TABLE "ArNote" ADD CONSTRAINT "ArNote_userId_User_clerkId_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("clerkId") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ArCommsArtefact" ADD CONSTRAINT "ArCommsArtefact_userId_User_clerkId_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("clerkId") ON DELETE cascade ON UPDATE no action;

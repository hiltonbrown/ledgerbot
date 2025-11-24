-- Add chatId column if it doesn't exist
DO $$ BEGIN
 ALTER TABLE "ContextFile" ADD COLUMN "chatId" uuid;
EXCEPTION
 WHEN duplicate_column THEN null;
END $$;--> statement-breakpoint

-- Add kind column if it doesn't exist
DO $$ BEGIN
 ALTER TABLE "Document" ADD COLUMN "kind" varchar DEFAULT 'text' NOT NULL;
EXCEPTION
 WHEN duplicate_column THEN null;
END $$;--> statement-breakpoint

-- Add foreign key constraint if it doesn't exist
DO $$ BEGIN
 ALTER TABLE "ContextFile" ADD CONSTRAINT "ContextFile_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

-- Drop columns only if they exist
ALTER TABLE "Document" DROP COLUMN IF EXISTS "text";--> statement-breakpoint
ALTER TABLE "UserSettings" DROP COLUMN IF EXISTS "systemPrompt";--> statement-breakpoint
ALTER TABLE "UserSettings" DROP COLUMN IF EXISTS "codePrompt";--> statement-breakpoint
ALTER TABLE "UserSettings" DROP COLUMN IF EXISTS "sheetPrompt";
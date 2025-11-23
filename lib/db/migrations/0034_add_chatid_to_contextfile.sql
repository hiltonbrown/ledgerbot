-- Add chatId column to ContextFile table to track which chat the file originated from
ALTER TABLE "ContextFile" ADD COLUMN "chatId" uuid;
--> statement-breakpoint
-- Add foreign key constraint with SET NULL on delete
DO $$ BEGIN
 ALTER TABLE "ContextFile" ADD CONSTRAINT "ContextFile_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

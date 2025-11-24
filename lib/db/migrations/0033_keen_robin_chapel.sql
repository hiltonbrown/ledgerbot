ALTER TABLE "ContextFile" ADD COLUMN "chatId" uuid;--> statement-breakpoint
ALTER TABLE "Document" ADD COLUMN "kind" varchar DEFAULT 'text' NOT NULL;--> statement-breakpoint
ALTER TABLE "ContextFile" ADD CONSTRAINT "ContextFile_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Document" DROP COLUMN "text";--> statement-breakpoint
ALTER TABLE "UserSettings" DROP COLUMN "systemPrompt";--> statement-breakpoint
ALTER TABLE "UserSettings" DROP COLUMN "codePrompt";--> statement-breakpoint
ALTER TABLE "UserSettings" DROP COLUMN "sheetPrompt";
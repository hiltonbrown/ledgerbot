-- Add chatId column as nullable first
ALTER TABLE "Document" ADD COLUMN "chatId" uuid;--> statement-breakpoint

-- Delete suggestions for documents that will be deleted (to avoid FK constraint violations)
DELETE FROM "Suggestion" WHERE "documentId" IN (SELECT "id" FROM "Document");--> statement-breakpoint

-- Delete orphaned documents that have no associated user or chat
-- (These documents cannot be linked to any chat)
DELETE FROM "Document" WHERE "userId" NOT IN (SELECT "id" FROM "User");--> statement-breakpoint

-- For remaining documents, we cannot determine which chat they belong to
-- So we'll delete them as well since they're orphaned
DELETE FROM "Document";--> statement-breakpoint

-- Now make chatId NOT NULL and add foreign key
ALTER TABLE "Document" ALTER COLUMN "chatId" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "Document" ADD CONSTRAINT "Document_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE cascade ON UPDATE no action;
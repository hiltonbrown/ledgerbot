-- Make Document.chatId nullable to allow documents to be created before being linked to a chat
-- First drop the foreign key constraint
ALTER TABLE "Document" DROP CONSTRAINT IF EXISTS "Document_chatId_Chat_id_fk";

-- Then make chatId nullable
ALTER TABLE "Document" ALTER COLUMN "chatId" DROP NOT NULL;

-- Re-add the foreign key constraint (without NOT NULL, it will allow null values)
ALTER TABLE "Document" ADD CONSTRAINT "Document_chatId_Chat_id_fk"
  FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE cascade ON UPDATE no action;

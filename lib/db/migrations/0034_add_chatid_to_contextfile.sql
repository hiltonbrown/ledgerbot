-- Add chatId column to ContextFile table to track which chat the file originated from
ALTER TABLE "ContextFile" ADD COLUMN "chatId" uuid;

-- Add foreign key constraint with SET NULL on delete
ALTER TABLE "ContextFile" ADD CONSTRAINT "ContextFile_chatId_Chat_id_fk"
  FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE set null ON UPDATE no action;

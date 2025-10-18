ALTER TABLE "XeroWebhookEvent" ADD COLUMN "retryCount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "XeroWebhookEvent" ADD COLUMN "nextAttemptAt" timestamp;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "chat_xero_context_chat_unique" ON "ChatXeroContext" USING btree ("chatId");
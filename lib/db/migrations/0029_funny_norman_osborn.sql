CREATE TABLE "AgentTrace" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chatId" uuid NOT NULL,
	"messageId" uuid NOT NULL,
	"toolName" text,
	"toolArgs" jsonb,
	"toolResult" jsonb,
	"durationMs" integer,
	"status" varchar(20) NOT NULL,
	"errorDetails" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "AgentTrace" ADD CONSTRAINT "AgentTrace_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_trace_chat_id_idx" ON "AgentTrace" USING btree ("chatId");--> statement-breakpoint
CREATE INDEX "agent_trace_message_id_idx" ON "AgentTrace" USING btree ("messageId");--> statement-breakpoint
CREATE INDEX "agent_trace_tool_name_idx" ON "AgentTrace" USING btree ("toolName");--> statement-breakpoint
CREATE INDEX "agent_trace_status_idx" ON "AgentTrace" USING btree ("status");--> statement-breakpoint
CREATE INDEX "agent_trace_created_at_idx" ON "AgentTrace" USING btree ("createdAt");
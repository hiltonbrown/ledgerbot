CREATE TABLE "ArFollowUpContext" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"contactId" uuid NOT NULL,
	"contextData" jsonb NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ArFollowUpContext" ADD CONSTRAINT "ArFollowUpContext_userId_User_clerkId_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("clerkId") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ArFollowUpContext" ADD CONSTRAINT "ArFollowUpContext_contactId_ArContact_id_fk" FOREIGN KEY ("contactId") REFERENCES "public"."ArContact"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ar_followup_context_user_contact_idx" ON "ArFollowUpContext" USING btree ("userId","contactId");--> statement-breakpoint
CREATE INDEX "ar_followup_context_expires_at_idx" ON "ArFollowUpContext" USING btree ("expiresAt");
CREATE TABLE "ApReviewContext" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"contactId" uuid NOT NULL,
	"contextData" jsonb NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ApReviewContext" ADD CONSTRAINT "ApReviewContext_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ApReviewContext" ADD CONSTRAINT "ApReviewContext_contactId_ApContact_id_fk" FOREIGN KEY ("contactId") REFERENCES "public"."ApContact"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ap_review_context_user_contact_idx" ON "ApReviewContext" USING btree ("userId","contactId");--> statement-breakpoint
CREATE INDEX "ap_review_context_expires_at_idx" ON "ApReviewContext" USING btree ("expiresAt");
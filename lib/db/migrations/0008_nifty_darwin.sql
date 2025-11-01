CREATE TABLE "QaReviewRequest" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"messageId" text NOT NULL,
	"query" text NOT NULL,
	"response" text NOT NULL,
	"confidence" integer NOT NULL,
	"citations" jsonb,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"assignedTo" uuid,
	"resolutionNotes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"resolvedAt" timestamp
);
--> statement-breakpoint
ALTER TABLE "QaReviewRequest" ADD CONSTRAINT "QaReviewRequest_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "QaReviewRequest" ADD CONSTRAINT "QaReviewRequest_assignedTo_User_id_fk" FOREIGN KEY ("assignedTo") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "qa_review_request_user_id_idx" ON "QaReviewRequest" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "qa_review_request_status_idx" ON "QaReviewRequest" USING btree ("status");
CREATE TABLE "ArCreditNote" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"contactId" uuid NOT NULL,
	"number" varchar(50) NOT NULL,
	"issueDate" timestamp NOT NULL,
	"currency" varchar(3) DEFAULT 'AUD' NOT NULL,
	"subtotal" numeric(10, 2) NOT NULL,
	"tax" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total" numeric(10, 2) NOT NULL,
	"amountAllocated" numeric(10, 2) DEFAULT '0' NOT NULL,
	"amountRemaining" numeric(10, 2) DEFAULT '0' NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"externalRef" varchar(255) NOT NULL,
	"metadata" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ArCreditNote" ADD CONSTRAINT "ArCreditNote_userId_User_clerkId_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("clerkId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ArCreditNote" ADD CONSTRAINT "ArCreditNote_contactId_ArContact_id_fk" FOREIGN KEY ("contactId") REFERENCES "public"."ArContact"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ar_credit_note_user_id_idx" ON "ArCreditNote" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "ar_credit_note_contact_id_idx" ON "ArCreditNote" USING btree ("contactId");--> statement-breakpoint
CREATE INDEX "ar_credit_note_status_idx" ON "ArCreditNote" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ar_credit_note_issue_date_idx" ON "ArCreditNote" USING btree ("issueDate");--> statement-breakpoint
CREATE INDEX "ar_credit_note_external_ref_idx" ON "ArCreditNote" USING btree ("externalRef");--> statement-breakpoint
CREATE UNIQUE INDEX "ar_credit_note_external_ref_user_id_unique" ON "ArCreditNote" USING btree ("externalRef","userId");
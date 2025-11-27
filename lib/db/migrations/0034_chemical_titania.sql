CREATE TABLE "ArCustomerHistory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"customerId" uuid NOT NULL,
	"startDate" timestamp NOT NULL,
	"endDate" timestamp NOT NULL,
	"numInvoices" integer DEFAULT 0 NOT NULL,
	"numLatePayments" integer DEFAULT 0 NOT NULL,
	"avgDaysLate" real DEFAULT 0 NOT NULL,
	"maxDaysLate" integer DEFAULT 0 NOT NULL,
	"percentInvoices90Plus" real DEFAULT 0 NOT NULL,
	"totalOutstanding" numeric(10, 2) DEFAULT '0' NOT NULL,
	"maxInvoiceOutstanding" numeric(10, 2) DEFAULT '0' NOT NULL,
	"totalBilledLast12Months" numeric(10, 2) DEFAULT '0' NOT NULL,
	"lastPaymentDate" timestamp,
	"creditTermsDays" integer DEFAULT 0,
	"riskScore" real DEFAULT 0,
	"computedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ArJobRun" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"startedAt" timestamp DEFAULT now() NOT NULL,
	"completedAt" timestamp,
	"status" varchar(20) DEFAULT 'running' NOT NULL,
	"customersProcessed" integer DEFAULT 0,
	"highRiskFlagged" integer DEFAULT 0,
	"errors" jsonb,
	"stats" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ArInvoice" ADD COLUMN "amountOutstanding" numeric(10, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "ArInvoice" ADD COLUMN "creditNoteAmount" numeric(10, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "ArInvoice" ADD COLUMN "ageingBucket" varchar(20);--> statement-breakpoint
ALTER TABLE "ArPayment" ADD COLUMN "contactId" uuid;--> statement-breakpoint
ALTER TABLE "ArPayment" ADD COLUMN "externalRef" varchar(255);--> statement-breakpoint
ALTER TABLE "ArCustomerHistory" ADD CONSTRAINT "ArCustomerHistory_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ArCustomerHistory" ADD CONSTRAINT "ArCustomerHistory_customerId_ArContact_id_fk" FOREIGN KEY ("customerId") REFERENCES "public"."ArContact"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ArJobRun" ADD CONSTRAINT "ArJobRun_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ar_customer_history_user_id_idx" ON "ArCustomerHistory" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "ar_customer_history_customer_id_idx" ON "ArCustomerHistory" USING btree ("customerId");--> statement-breakpoint
CREATE INDEX "ar_customer_history_computed_at_idx" ON "ArCustomerHistory" USING btree ("computedAt");--> statement-breakpoint
CREATE INDEX "ar_job_run_user_id_idx" ON "ArJobRun" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "ar_job_run_status_idx" ON "ArJobRun" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ar_job_run_started_at_idx" ON "ArJobRun" USING btree ("startedAt");--> statement-breakpoint
ALTER TABLE "ArPayment" ADD CONSTRAINT "ArPayment_contactId_ArContact_id_fk" FOREIGN KEY ("contactId") REFERENCES "public"."ArContact"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ar_payment_contact_id_idx" ON "ArPayment" USING btree ("contactId");--> statement-breakpoint
CREATE INDEX "ar_payment_external_ref_idx" ON "ArPayment" USING btree ("externalRef");
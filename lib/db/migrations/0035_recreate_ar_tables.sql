-- Recreate AR tables with correct userId type (text instead of uuid)
-- Note: ArNote still uses uuid for userId due to schema definition
CREATE TABLE "ArCommsArtefact" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"invoiceId" uuid NOT NULL,
	"channel" varchar(20) NOT NULL,
	"subject" text,
	"body" text NOT NULL,
	"tone" varchar(20) NOT NULL,
	"metadata" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ArContact" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255),
	"phone" varchar(50),
	"externalRef" varchar(255),
	"metadata" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ArInvoice" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"contactId" uuid NOT NULL,
	"number" varchar(50) NOT NULL,
	"issueDate" timestamp NOT NULL,
	"dueDate" timestamp NOT NULL,
	"currency" varchar(3) DEFAULT 'AUD' NOT NULL,
	"subtotal" numeric(10, 2) NOT NULL,
	"tax" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total" numeric(10, 2) NOT NULL,
	"amountPaid" numeric(10, 2) DEFAULT '0' NOT NULL,
	"amountOutstanding" numeric(10, 2) DEFAULT '0' NOT NULL,
	"creditNoteAmount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"status" varchar(20) DEFAULT 'awaiting_payment' NOT NULL,
	"ageingBucket" varchar(20),
	"externalRef" varchar(255) NOT NULL,
	"metadata" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ArNote" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"invoiceId" uuid NOT NULL,
	"body" text NOT NULL,
	"visibility" varchar(20) DEFAULT 'private' NOT NULL,
	"metadata" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ArPayment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoiceId" uuid NOT NULL,
	"contactId" uuid,
	"amount" numeric(10, 2) NOT NULL,
	"paidAt" timestamp NOT NULL,
	"method" varchar(50),
	"reference" varchar(255),
	"externalRef" varchar(255),
	"metadata" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ArReminder" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoiceId" uuid NOT NULL,
	"templateId" varchar(50) NOT NULL,
	"tone" varchar(20) NOT NULL,
	"plannedAt" timestamp NOT NULL,
	"sent" boolean DEFAULT false NOT NULL,
	"sentAt" timestamp,
	"metadata" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ArCustomerHistory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
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
	"userId" text NOT NULL,
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
ALTER TABLE "ArCommsArtefact" ADD CONSTRAINT "ArCommsArtefact_userId_User_clerkId_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("clerkId") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ArCommsArtefact" ADD CONSTRAINT "ArCommsArtefact_invoiceId_ArInvoice_id_fk" FOREIGN KEY ("invoiceId") REFERENCES "public"."ArInvoice"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ArContact" ADD CONSTRAINT "ArContact_userId_User_clerkId_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("clerkId") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ArInvoice" ADD CONSTRAINT "ArInvoice_userId_User_clerkId_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("clerkId") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ArInvoice" ADD CONSTRAINT "ArInvoice_contactId_ArContact_id_fk" FOREIGN KEY ("contactId") REFERENCES "public"."ArContact"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ArNote" ADD CONSTRAINT "ArNote_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ArNote" ADD CONSTRAINT "ArNote_invoiceId_ArInvoice_id_fk" FOREIGN KEY ("invoiceId") REFERENCES "public"."ArInvoice"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ArPayment" ADD CONSTRAINT "ArPayment_invoiceId_ArInvoice_id_fk" FOREIGN KEY ("invoiceId") REFERENCES "public"."ArInvoice"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ArPayment" ADD CONSTRAINT "ArPayment_contactId_ArContact_id_fk" FOREIGN KEY ("contactId") REFERENCES "public"."ArContact"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ArReminder" ADD CONSTRAINT "ArReminder_invoiceId_ArInvoice_id_fk" FOREIGN KEY ("invoiceId") REFERENCES "public"."ArInvoice"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ArCustomerHistory" ADD CONSTRAINT "ArCustomerHistory_userId_User_clerkId_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("clerkId") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ArCustomerHistory" ADD CONSTRAINT "ArCustomerHistory_customerId_ArContact_id_fk" FOREIGN KEY ("customerId") REFERENCES "public"."ArContact"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ArJobRun" ADD CONSTRAINT "ArJobRun_userId_User_clerkId_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("clerkId") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ar_comms_artefact_user_id_idx" ON "ArCommsArtefact" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "ar_comms_artefact_invoice_id_idx" ON "ArCommsArtefact" USING btree ("invoiceId");--> statement-breakpoint
CREATE INDEX "ar_comms_artefact_channel_idx" ON "ArCommsArtefact" USING btree ("channel");--> statement-breakpoint
CREATE INDEX "ar_comms_artefact_created_at_idx" ON "ArCommsArtefact" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "ar_contact_user_id_idx" ON "ArContact" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "ar_contact_external_ref_idx" ON "ArContact" USING btree ("externalRef");--> statement-breakpoint
CREATE INDEX "ar_invoice_user_id_idx" ON "ArInvoice" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "ar_invoice_contact_id_idx" ON "ArInvoice" USING btree ("contactId");--> statement-breakpoint
CREATE INDEX "ar_invoice_status_idx" ON "ArInvoice" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ar_invoice_due_date_idx" ON "ArInvoice" USING btree ("dueDate");--> statement-breakpoint
CREATE INDEX "ar_invoice_external_ref_idx" ON "ArInvoice" USING btree ("externalRef");--> statement-breakpoint
CREATE UNIQUE INDEX "ar_invoice_external_ref_user_id_unique" ON "ArInvoice" USING btree ("externalRef","userId");--> statement-breakpoint
CREATE INDEX "ar_note_invoice_id_idx" ON "ArNote" USING btree ("invoiceId");--> statement-breakpoint
CREATE INDEX "ar_note_user_id_idx" ON "ArNote" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "ar_payment_invoice_id_idx" ON "ArPayment" USING btree ("invoiceId");--> statement-breakpoint
CREATE INDEX "ar_payment_contact_id_idx" ON "ArPayment" USING btree ("contactId");--> statement-breakpoint
CREATE INDEX "ar_payment_paid_at_idx" ON "ArPayment" USING btree ("paidAt");--> statement-breakpoint
CREATE INDEX "ar_payment_external_ref_idx" ON "ArPayment" USING btree ("externalRef");--> statement-breakpoint
CREATE INDEX "ar_reminder_invoice_id_idx" ON "ArReminder" USING btree ("invoiceId");--> statement-breakpoint
CREATE INDEX "ar_reminder_planned_at_idx" ON "ArReminder" USING btree ("plannedAt");--> statement-breakpoint
CREATE INDEX "ar_reminder_sent_idx" ON "ArReminder" USING btree ("sent");--> statement-breakpoint
CREATE INDEX "ar_customer_history_user_id_idx" ON "ArCustomerHistory" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "ar_customer_history_customer_id_idx" ON "ArCustomerHistory" USING btree ("customerId");--> statement-breakpoint
CREATE INDEX "ar_customer_history_computed_at_idx" ON "ArCustomerHistory" USING btree ("computedAt");--> statement-breakpoint
CREATE INDEX "ar_job_run_user_id_idx" ON "ArJobRun" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "ar_job_run_status_idx" ON "ArJobRun" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ar_job_run_started_at_idx" ON "ArJobRun" USING btree ("startedAt");

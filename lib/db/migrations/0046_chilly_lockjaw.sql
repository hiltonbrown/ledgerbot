DROP INDEX IF EXISTS "ap_bill_external_ref_user_id_unique";--> statement-breakpoint
DROP INDEX IF EXISTS "ar_credit_note_external_ref_user_id_unique";--> statement-breakpoint
DROP INDEX IF EXISTS "ar_customer_history_user_id_customer_id_unique";--> statement-breakpoint
DROP INDEX IF EXISTS "ar_invoice_external_ref_user_id_unique";--> statement-breakpoint
DROP INDEX IF EXISTS "ar_overpayment_external_ref_user_id_unique";--> statement-breakpoint
DROP INDEX IF EXISTS "ar_prepayment_external_ref_user_id_unique";--> statement-breakpoint
ALTER TABLE "XeroConnection" ADD COLUMN "lastSyncedAt" timestamp;--> statement-breakpoint
ALTER TABLE "XeroConnection" ADD COLUMN "lastSyncAt" timestamp;--> statement-breakpoint
ALTER TABLE "ApBill" ADD COLUMN "tenantId" varchar(255) DEFAULT 'legacy' NOT NULL;--> statement-breakpoint
ALTER TABLE "ApBill" ADD COLUMN "xeroUpdatedDateUtc" timestamp;--> statement-breakpoint
ALTER TABLE "ApBill" ADD COLUMN "xeroModifiedDateUtc" timestamp;--> statement-breakpoint
ALTER TABLE "ApContact" ADD COLUMN "tenantId" varchar(255) DEFAULT 'legacy' NOT NULL;--> statement-breakpoint
ALTER TABLE "ApContact" ADD COLUMN "xeroUpdatedDateUtc" timestamp;--> statement-breakpoint
ALTER TABLE "ApContact" ADD COLUMN "xeroModifiedDateUtc" timestamp;--> statement-breakpoint
ALTER TABLE "ApPayment" ADD COLUMN "tenantId" varchar(255) DEFAULT 'legacy' NOT NULL;--> statement-breakpoint
ALTER TABLE "ApPayment" ADD COLUMN "xeroUpdatedDateUtc" timestamp;--> statement-breakpoint
ALTER TABLE "ApPayment" ADD COLUMN "xeroModifiedDateUtc" timestamp;--> statement-breakpoint
ALTER TABLE "ArCommsArtefact" ADD COLUMN "tenantId" varchar(255) DEFAULT 'legacy' NOT NULL;--> statement-breakpoint
ALTER TABLE "ArContact" ADD COLUMN "tenantId" varchar(255) DEFAULT 'legacy' NOT NULL;--> statement-breakpoint
ALTER TABLE "ArContact" ADD COLUMN "xeroUpdatedDateUtc" timestamp;--> statement-breakpoint
ALTER TABLE "ArCreditNote" ADD COLUMN "tenantId" varchar(255) DEFAULT 'legacy' NOT NULL;--> statement-breakpoint
ALTER TABLE "ArCustomerHistory" ADD COLUMN "tenantId" varchar(255) DEFAULT 'legacy' NOT NULL;--> statement-breakpoint
ALTER TABLE "ArFollowUpContext" ADD COLUMN "tenantId" varchar(255) DEFAULT 'legacy' NOT NULL;--> statement-breakpoint
ALTER TABLE "ArInvoice" ADD COLUMN "tenantId" varchar(255) DEFAULT 'legacy' NOT NULL;--> statement-breakpoint
ALTER TABLE "ArInvoice" ADD COLUMN "xeroUpdatedDateUtc" timestamp;--> statement-breakpoint
ALTER TABLE "ArJobRun" ADD COLUMN "tenantId" varchar(255) DEFAULT 'legacy' NOT NULL;--> statement-breakpoint
ALTER TABLE "ArNote" ADD COLUMN "tenantId" varchar(255) DEFAULT 'legacy' NOT NULL;--> statement-breakpoint
ALTER TABLE "ArOverpayment" ADD COLUMN "tenantId" varchar(255) DEFAULT 'legacy' NOT NULL;--> statement-breakpoint
ALTER TABLE "ArPayment" ADD COLUMN "tenantId" varchar(255) DEFAULT 'legacy' NOT NULL;--> statement-breakpoint
ALTER TABLE "ArPrepayment" ADD COLUMN "tenantId" varchar(255) DEFAULT 'legacy' NOT NULL;--> statement-breakpoint
ALTER TABLE "ArReminder" ADD COLUMN "tenantId" varchar(255) DEFAULT 'legacy' NOT NULL;--> statement-breakpoint
CREATE INDEX "ap_bill_tenant_id_idx" ON "ApBill" USING btree ("tenantId");--> statement-breakpoint
CREATE UNIQUE INDEX "ap_bill_tenant_external_ref_unique" ON "ApBill" USING btree ("tenantId","externalRef");--> statement-breakpoint
CREATE INDEX "ap_contact_tenant_id_idx" ON "ApContact" USING btree ("tenantId");--> statement-breakpoint
CREATE UNIQUE INDEX "ap_contact_tenant_external_ref_unique" ON "ApContact" USING btree ("tenantId","externalRef");--> statement-breakpoint
CREATE INDEX "ap_payment_tenant_id_idx" ON "ApPayment" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "ar_comms_artefact_tenant_id_idx" ON "ArCommsArtefact" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "ar_contact_tenant_id_idx" ON "ArContact" USING btree ("tenantId");--> statement-breakpoint
CREATE UNIQUE INDEX "ar_contact_tenant_external_ref_unique" ON "ArContact" USING btree ("tenantId","externalRef");--> statement-breakpoint
CREATE INDEX "ar_credit_note_tenant_id_idx" ON "ArCreditNote" USING btree ("tenantId");--> statement-breakpoint
CREATE UNIQUE INDEX "ar_credit_note_tenant_external_ref_unique" ON "ArCreditNote" USING btree ("tenantId","externalRef");--> statement-breakpoint
CREATE INDEX "ar_customer_history_tenant_id_idx" ON "ArCustomerHistory" USING btree ("tenantId");--> statement-breakpoint
CREATE UNIQUE INDEX "ar_customer_history_tenant_customer_id_unique" ON "ArCustomerHistory" USING btree ("tenantId","customerId");--> statement-breakpoint
CREATE INDEX "ar_followup_context_tenant_id_idx" ON "ArFollowUpContext" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "ar_invoice_tenant_id_idx" ON "ArInvoice" USING btree ("tenantId");--> statement-breakpoint
CREATE UNIQUE INDEX "ar_invoice_tenant_external_ref_unique" ON "ArInvoice" USING btree ("tenantId","externalRef");--> statement-breakpoint
CREATE INDEX "ar_job_run_tenant_id_idx" ON "ArJobRun" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "ar_note_tenant_id_idx" ON "ArNote" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "ar_overpayment_tenant_id_idx" ON "ArOverpayment" USING btree ("tenantId");--> statement-breakpoint
CREATE UNIQUE INDEX "ar_overpayment_tenant_external_ref_unique" ON "ArOverpayment" USING btree ("tenantId","externalRef");--> statement-breakpoint
CREATE INDEX "ar_payment_tenant_id_idx" ON "ArPayment" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "ar_prepayment_tenant_id_idx" ON "ArPrepayment" USING btree ("tenantId");--> statement-breakpoint
CREATE UNIQUE INDEX "ar_prepayment_tenant_external_ref_unique" ON "ArPrepayment" USING btree ("tenantId","externalRef");--> statement-breakpoint
CREATE INDEX "ar_reminder_tenant_id_idx" ON "ArReminder" USING btree ("tenantId");
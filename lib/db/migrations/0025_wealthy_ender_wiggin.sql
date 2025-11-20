DROP INDEX "ar_invoice_external_ref_user_id_unique";--> statement-breakpoint
ALTER TABLE "ArInvoice" ALTER COLUMN "externalRef" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "ar_invoice_external_ref_user_id_unique" ON "ArInvoice" USING btree ("externalRef","userId");
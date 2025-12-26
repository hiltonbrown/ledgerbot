DROP INDEX "dv_contacts_user_xero_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "dv_contacts_tenant_xero_idx" ON "dv_contacts" USING btree ("xero_tenant_id","xero_contact_id");
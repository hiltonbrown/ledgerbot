CREATE TABLE "dv_asic_business_names" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"abn" text NOT NULL,
	"business_name" text NOT NULL,
	"status" text NOT NULL,
	"registration_date" date,
	"cancellation_date" date,
	"dataset_date" date NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dv_asic_companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"acn" text NOT NULL,
	"abn" text,
	"company_name" text NOT NULL,
	"type" text,
	"class" text,
	"sub_class" text,
	"status" text NOT NULL,
	"registration_date" date,
	"deregistration_date" date,
	"dataset_date" date NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dv_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"xero_contact_id" text NOT NULL,
	"xero_tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"tax_number" text,
	"company_number" text,
	"is_customer" boolean DEFAULT false,
	"is_supplier" boolean DEFAULT false,
	"email_address" text,
	"phone" text,
	"raw_data" jsonb,
	"last_synced_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dv_verification_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" uuid NOT NULL,
	"verification_status" text NOT NULL,
	"asic_company_data" jsonb,
	"asic_business_name_data" jsonb,
	"abr_data" jsonb,
	"issues" jsonb DEFAULT '[]'::jsonb,
	"verified_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dv_webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"event_type" text NOT NULL,
	"xero_contact_id" text NOT NULL,
	"xero_tenant_id" text NOT NULL,
	"payload" jsonb,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "dv_contacts" ADD CONSTRAINT "dv_contacts_user_id_User_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dv_verification_results" ADD CONSTRAINT "dv_verification_results_contact_id_dv_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."dv_contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dv_webhook_events" ADD CONSTRAINT "dv_webhook_events_user_id_User_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dv_asic_business_names_abn_idx" ON "dv_asic_business_names" USING btree ("abn");--> statement-breakpoint
CREATE INDEX "dv_asic_business_names_status_idx" ON "dv_asic_business_names" USING btree ("status");--> statement-breakpoint
CREATE INDEX "dv_asic_companies_acn_idx" ON "dv_asic_companies" USING btree ("acn");--> statement-breakpoint
CREATE INDEX "dv_asic_companies_abn_idx" ON "dv_asic_companies" USING btree ("abn");--> statement-breakpoint
CREATE INDEX "dv_asic_companies_status_idx" ON "dv_asic_companies" USING btree ("status");--> statement-breakpoint
CREATE INDEX "dv_contacts_user_xero_idx" ON "dv_contacts" USING btree ("user_id","xero_contact_id");--> statement-breakpoint
CREATE INDEX "dv_contacts_tax_number_idx" ON "dv_contacts" USING btree ("tax_number");--> statement-breakpoint
CREATE INDEX "dv_contacts_company_number_idx" ON "dv_contacts" USING btree ("company_number");
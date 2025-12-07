CREATE TABLE "XeroContact" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" varchar(255) NOT NULL,
	"xeroId" varchar(255) NOT NULL,
	"name" varchar(255),
	"email" varchar(255),
	"isCustomer" boolean DEFAULT false,
	"isSupplier" boolean DEFAULT false,
	"data" jsonb NOT NULL,
	"xeroUpdatedDateUtc" timestamp,
	"search_vector" text,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "xero_contact_tenant_xero_id_unique" UNIQUE("tenantId","xeroId")
);
--> statement-breakpoint
CREATE TABLE "XeroCreditNote" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" varchar(255) NOT NULL,
	"xeroId" varchar(255) NOT NULL,
	"creditNoteNumber" varchar(255),
	"type" varchar(50),
	"status" varchar(50),
	"contactId" varchar(255),
	"date" timestamp,
	"total" real,
	"remainingCredit" real,
	"currencyCode" varchar(3),
	"data" jsonb NOT NULL,
	"xeroUpdatedDateUtc" timestamp,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "xero_credit_note_tenant_xero_id_unique" UNIQUE("tenantId","xeroId")
);
--> statement-breakpoint
CREATE TABLE "XeroInvoice" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" varchar(255) NOT NULL,
	"xeroId" varchar(255) NOT NULL,
	"invoiceNumber" varchar(255),
	"type" varchar(50),
	"status" varchar(50),
	"contactId" varchar(255),
	"contactName" varchar(255),
	"date" timestamp,
	"dueDate" timestamp,
	"amountDue" real,
	"amountPaid" real,
	"total" real,
	"currencyCode" varchar(3),
	"data" jsonb NOT NULL,
	"xeroUpdatedDateUtc" timestamp,
	"search_vector" text,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "xero_invoice_tenant_xero_id_unique" UNIQUE("tenantId","xeroId")
);
--> statement-breakpoint
CREATE TABLE "XeroPayment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" varchar(255) NOT NULL,
	"xeroId" varchar(255) NOT NULL,
	"invoiceId" varchar(255),
	"date" timestamp,
	"amount" real,
	"reference" varchar(255),
	"paymentType" varchar(50),
	"status" varchar(50),
	"data" jsonb NOT NULL,
	"xeroUpdatedDateUtc" timestamp,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "xero_payment_tenant_xero_id_unique" UNIQUE("tenantId","xeroId")
);
--> statement-breakpoint
ALTER TABLE "XeroConnection" ADD COLUMN "invoicesSyncedAt" timestamp;--> statement-breakpoint
ALTER TABLE "XeroConnection" ADD COLUMN "contactsSyncedAt" timestamp;--> statement-breakpoint
ALTER TABLE "XeroConnection" ADD COLUMN "paymentsSyncedAt" timestamp;--> statement-breakpoint
ALTER TABLE "XeroConnection" ADD COLUMN "creditNotesSyncedAt" timestamp;--> statement-breakpoint
ALTER TABLE "XeroConnection" ADD COLUMN "itemsSyncedAt" timestamp;--> statement-breakpoint
CREATE INDEX "xero_contact_tenant_idx" ON "XeroContact" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "xero_contact_name_idx" ON "XeroContact" USING btree ("name");--> statement-breakpoint
CREATE INDEX "xero_credit_note_tenant_idx" ON "XeroCreditNote" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "xero_credit_note_contact_idx" ON "XeroCreditNote" USING btree ("contactId");--> statement-breakpoint
CREATE INDEX "xero_credit_note_date_idx" ON "XeroCreditNote" USING btree ("date");--> statement-breakpoint
CREATE INDEX "xero_invoice_tenant_idx" ON "XeroInvoice" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "xero_invoice_contact_idx" ON "XeroInvoice" USING btree ("contactId");--> statement-breakpoint
CREATE INDEX "xero_invoice_date_idx" ON "XeroInvoice" USING btree ("date");--> statement-breakpoint
CREATE INDEX "xero_payment_tenant_idx" ON "XeroPayment" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "xero_payment_invoice_idx" ON "XeroPayment" USING btree ("invoiceId");--> statement-breakpoint
CREATE INDEX "xero_payment_date_idx" ON "XeroPayment" USING btree ("date");
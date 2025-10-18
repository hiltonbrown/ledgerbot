CREATE TABLE IF NOT EXISTS "ChatXeroContext" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chatId" uuid NOT NULL,
	"activeTenantIds" jsonb,
	"multiOrgEnabled" boolean DEFAULT false,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "XeroAccountCache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" varchar(255) NOT NULL,
	"accountId" varchar(255) NOT NULL,
	"data" jsonb NOT NULL,
	"cachedAt" timestamp DEFAULT now() NOT NULL,
	"lastModifiedAt" timestamp NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"isStale" boolean DEFAULT false NOT NULL,
	"code" varchar(50),
	"name" varchar(500),
	"type" varchar(50),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "XeroBankTransactionCache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" varchar(255) NOT NULL,
	"bankTransactionId" varchar(255) NOT NULL,
	"data" jsonb NOT NULL,
	"cachedAt" timestamp DEFAULT now() NOT NULL,
	"lastModifiedAt" timestamp NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"isStale" boolean DEFAULT false NOT NULL,
	"bankAccountId" varchar(255),
	"date" timestamp,
	"status" varchar(50),
	"total" numeric(19, 4),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "XeroCacheSyncStatus" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" varchar(255) NOT NULL,
	"entityType" varchar(50) NOT NULL,
	"lastSyncAt" timestamp,
	"lastSuccessAt" timestamp,
	"lastFailureAt" timestamp,
	"syncStatus" varchar(50) DEFAULT 'pending' NOT NULL,
	"errorMessage" text,
	"recordCount" integer DEFAULT 0,
	"apiCallsUsed" integer DEFAULT 0,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "XeroContactCache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" varchar(255) NOT NULL,
	"contactId" varchar(255) NOT NULL,
	"data" jsonb NOT NULL,
	"cachedAt" timestamp DEFAULT now() NOT NULL,
	"lastModifiedAt" timestamp NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"isStale" boolean DEFAULT false NOT NULL,
	"name" varchar(500),
	"emailAddress" varchar(500),
	"contactStatus" varchar(50),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "XeroInvoiceCache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" varchar(255) NOT NULL,
	"invoiceId" varchar(255) NOT NULL,
	"invoiceNumber" varchar(255),
	"data" jsonb NOT NULL,
	"cachedAt" timestamp DEFAULT now() NOT NULL,
	"lastModifiedAt" timestamp NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"isStale" boolean DEFAULT false NOT NULL,
	"status" varchar(50),
	"contactId" varchar(255),
	"date" timestamp,
	"dueDate" timestamp,
	"total" numeric(19, 4),
	"amountDue" numeric(19, 4),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "XeroWebhookEvent" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"eventId" varchar(255) NOT NULL,
	"tenantId" varchar(255) NOT NULL,
	"tenantType" varchar(50) NOT NULL,
	"eventCategory" varchar(50) NOT NULL,
	"eventType" varchar(50) NOT NULL,
	"eventDateUtc" timestamp NOT NULL,
	"resourceId" varchar(255) NOT NULL,
	"resourceUrl" text NOT NULL,
	"processed" boolean DEFAULT false NOT NULL,
	"processedAt" timestamp,
	"processingError" text,
	"payload" jsonb NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "UserSettings" ADD COLUMN "xeroMultiOrgMode" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "UserSettings" ADD COLUMN "xeroDefaultTenantId" varchar(255);--> statement-breakpoint
ALTER TABLE "XeroConnection" ADD COLUMN "tenantType" varchar(50);--> statement-breakpoint
ALTER TABLE "XeroConnection" ADD COLUMN "isPrimary" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "XeroConnection" ADD COLUMN "displayOrder" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "XeroConnection" ADD COLUMN "connectionId" varchar(255);--> statement-breakpoint
ALTER TABLE "XeroConnection" ADD COLUMN "authEventId" varchar(255);--> statement-breakpoint
ALTER TABLE "XeroConnection" ADD COLUMN "createdDateUtc" timestamp;--> statement-breakpoint
ALTER TABLE "XeroConnection" ADD COLUMN "updatedDateUtc" timestamp;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ChatXeroContext" ADD CONSTRAINT "ChatXeroContext_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "xero_account_cache_unique" ON "XeroAccountCache" USING btree ("tenantId","accountId");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "xero_bank_transaction_cache_unique" ON "XeroBankTransactionCache" USING btree ("tenantId","bankTransactionId");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "xero_contact_cache_unique" ON "XeroContactCache" USING btree ("tenantId","contactId");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "xero_invoice_cache_unique" ON "XeroInvoiceCache" USING btree ("tenantId","invoiceId");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "xero_connection_user_tenant_idx" ON "XeroConnection" USING btree ("userId","tenantId");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "xero_connection_id_idx" ON "XeroConnection" USING btree ("connectionId") WHERE "connectionId" IS NOT NULL;
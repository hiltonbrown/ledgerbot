ALTER TABLE "XeroConnection" ADD COLUMN IF NOT EXISTS "xeroConnectionId" varchar(255);--> statement-breakpoint
ALTER TABLE "XeroConnection" ADD COLUMN IF NOT EXISTS "tenantType" varchar(50);--> statement-breakpoint
ALTER TABLE "XeroConnection" ADD COLUMN IF NOT EXISTS "xeroCreatedDateUtc" timestamp;--> statement-breakpoint
ALTER TABLE "XeroConnection" ADD COLUMN IF NOT EXISTS "xeroUpdatedDateUtc" timestamp;--> statement-breakpoint
ALTER TABLE "XeroConnection" ADD COLUMN IF NOT EXISTS "connectionStatus" varchar(50) DEFAULT 'connected';--> statement-breakpoint
ALTER TABLE "XeroConnection" ADD COLUMN IF NOT EXISTS "lastError" text;--> statement-breakpoint
ALTER TABLE "XeroConnection" ADD COLUMN IF NOT EXISTS "lastApiCallAt" timestamp;
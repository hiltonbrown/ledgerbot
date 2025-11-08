ALTER TABLE "XeroConnection" ADD COLUMN "chartOfAccounts" jsonb;--> statement-breakpoint
ALTER TABLE "XeroConnection" ADD COLUMN "chartOfAccountsSyncedAt" timestamp;--> statement-breakpoint
ALTER TABLE "XeroConnection" ADD COLUMN "chartOfAccountsVersion" varchar(50);--> statement-breakpoint
ALTER TABLE "XeroConnection" ADD COLUMN "chartOfAccountsHash" varchar(64);
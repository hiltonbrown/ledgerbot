ALTER TABLE "XeroConnection" ADD COLUMN "organisationId" varchar(255);--> statement-breakpoint
ALTER TABLE "XeroConnection" ADD COLUMN "shortCode" varchar(10);--> statement-breakpoint
ALTER TABLE "XeroConnection" ADD COLUMN "baseCurrency" varchar(3);--> statement-breakpoint
ALTER TABLE "XeroConnection" ADD COLUMN "organisationType" varchar(50);--> statement-breakpoint
ALTER TABLE "XeroConnection" ADD COLUMN "isDemoCompany" boolean DEFAULT false;
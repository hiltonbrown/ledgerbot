ALTER TABLE "UserSettings" ADD COLUMN "companyName" varchar(255);--> statement-breakpoint
ALTER TABLE "UserSettings" ADD COLUMN "industryContext" text;--> statement-breakpoint
ALTER TABLE "UserSettings" ADD COLUMN "chartOfAccounts" text;--> statement-breakpoint
ALTER TABLE "UserSettings" ADD COLUMN "customVariables" jsonb;
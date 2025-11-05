ALTER TABLE "XeroConnection" ADD COLUMN "rateLimitMinuteRemaining" integer;--> statement-breakpoint
ALTER TABLE "XeroConnection" ADD COLUMN "rateLimitDayRemaining" integer;--> statement-breakpoint
ALTER TABLE "XeroConnection" ADD COLUMN "rateLimitResetAt" timestamp;--> statement-breakpoint
ALTER TABLE "XeroConnection" ADD COLUMN "rateLimitProblem" varchar(50);
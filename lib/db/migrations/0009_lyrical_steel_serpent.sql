ALTER TABLE "QaReviewRequest" ALTER COLUMN "confidence" SET DATA TYPE real;--> statement-breakpoint
ALTER TABLE "RegulatoryScrapeJob" ALTER COLUMN "sourceUrl" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "Message_v2" ADD COLUMN "confidence" real;--> statement-breakpoint
ALTER TABLE "Message_v2" ADD COLUMN "citations" jsonb;--> statement-breakpoint
ALTER TABLE "Message_v2" ADD COLUMN "needsReview" boolean;
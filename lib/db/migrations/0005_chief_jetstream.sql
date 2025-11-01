CREATE TABLE "RegulatoryDocument" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"country" varchar(2) NOT NULL,
	"category" varchar(50) NOT NULL,
	"title" text NOT NULL,
	"sourceUrl" text NOT NULL,
	"content" text,
	"extractedText" text,
	"tokenCount" integer DEFAULT 0,
	"effectiveDate" timestamp,
	"expiryDate" timestamp,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"scrapedAt" timestamp NOT NULL,
	"lastCheckedAt" timestamp NOT NULL,
	"metadata" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "RegulatoryDocument_sourceUrl_unique" UNIQUE("sourceUrl")
);
--> statement-breakpoint
CREATE TABLE "RegulatoryScrapeJob" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sourceUrl" text NOT NULL,
	"country" varchar(2),
	"category" varchar(50),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"startedAt" timestamp,
	"completedAt" timestamp,
	"documentsScraped" integer DEFAULT 0,
	"documentsUpdated" integer DEFAULT 0,
	"documentsArchived" integer DEFAULT 0,
	"errorMessage" text,
	"metadata" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL
);

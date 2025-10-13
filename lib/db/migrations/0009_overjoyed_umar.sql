CREATE TABLE IF NOT EXISTS "ContextFile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"originalName" varchar(255) NOT NULL,
	"blobUrl" text NOT NULL,
	"fileType" varchar(128) NOT NULL,
	"fileSize" integer NOT NULL,
	"extractedText" text,
	"tokenCount" integer,
	"status" varchar(32) DEFAULT 'processing' NOT NULL,
	"errorMessage" text,
	"description" text,
	"tags" json,
	"isPinned" boolean DEFAULT false,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"lastUsedAt" timestamp,
	"processedAt" timestamp
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ContextFile" ADD CONSTRAINT "ContextFile_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

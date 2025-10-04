ALTER TABLE "User" ADD COLUMN "clerkId" varchar(255);--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "clerkSynced" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "createdAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "User" ADD CONSTRAINT "User_clerkId_unique" UNIQUE("clerkId");
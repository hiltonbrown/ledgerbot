-- Manual migration to fix ArCustomerHistory userId column type
-- This script drops and recreates the ArCustomerHistory table with correct userId type

-- Drop the table (WARNING: This will delete all data in ArCustomerHistory)
DROP TABLE IF EXISTS "ArCustomerHistory" CASCADE;

-- Recreate the table with correct schema
CREATE TABLE "ArCustomerHistory" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "userId" text NOT NULL,
  "customerId" uuid NOT NULL,
  "startDate" timestamp NOT NULL,
  "endDate" timestamp NOT NULL,
  "numInvoices" integer DEFAULT 0 NOT NULL,
  "numLatePayments" integer DEFAULT 0 NOT NULL,
  "avgDaysLate" real DEFAULT 0 NOT NULL,
  "maxDaysLate" integer DEFAULT 0 NOT NULL,
  "percentInvoices90Plus" real DEFAULT 0 NOT NULL,
  "totalOutstanding" numeric(10, 2) DEFAULT '0' NOT NULL,
  "maxInvoiceOutstanding" numeric(10, 2) DEFAULT '0' NOT NULL,
  "totalBilledLast12Months" numeric(10, 2) DEFAULT '0' NOT NULL,
  "lastPaymentDate" timestamp,
  "creditTermsDays" integer DEFAULT 0,
  "riskScore" real DEFAULT 0,
  "computedAt" timestamp DEFAULT now() NOT NULL
);

-- Add foreign key constraints
ALTER TABLE "ArCustomerHistory" ADD CONSTRAINT "ArCustomerHistory_userId_User_clerkId_fk" 
  FOREIGN KEY ("userId") REFERENCES "User"("clerkId") ON DELETE CASCADE;

ALTER TABLE "ArCustomerHistory" ADD CONSTRAINT "ArCustomerHistory_customerId_ArContact_id_fk" 
  FOREIGN KEY ("customerId") REFERENCES "ArContact"("id") ON DELETE CASCADE;

-- Create indexes
CREATE INDEX "ar_customer_history_user_id_idx" ON "ArCustomerHistory"("userId");
CREATE INDEX "ar_customer_history_customer_id_idx" ON "ArCustomerHistory"("customerId");
CREATE INDEX "ar_customer_history_computed_at_idx" ON "ArCustomerHistory"("computedAt");
